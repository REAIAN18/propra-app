/**
 * src/lib/tenant-materialise.ts
 * Convert extracted lease PDF data into structured Tenant + Lease records.
 *
 * Called lazily at the start of GET /api/user/tenants.
 * Also callable on demand via POST /api/user/leases/materialise.
 *
 * Flow:
 *   Document (status="done", type="rent_roll" or "lease_agreement")
 *     → extractedData JSON
 *     → upsert Tenant (by userId + name)
 *     → upsert Lease (by userId + assetId + documentId)
 *     → run checkCovenantUK for UK tenants (fire and forget)
 *
 * Wave 1 data shape in extractedData (from document-parser.ts):
 *   rent_roll:       { properties: [{ address, tenant, sqft, passingRent, leaseExpiry, breakDate, currency }] }
 *   lease_agreement: { tenantName, propertyAddress, sqft, annualRent, startDate, expiryDate, breakDate, currency }
 */

import { prisma } from "@/lib/prisma";
import { deriveLeaseStatus, inferSector } from "@/lib/tenant-health";
import { checkCovenantUK } from "@/lib/covenant-check";

// ---------------------------------------------------------------------------
// ASSET MATCHING
// ---------------------------------------------------------------------------

/**
 * Finds the user's asset that best matches a property address string.
 * Fuzzy match: normalise to lower-case, strip punctuation, check containment.
 * Returns null if no match (lease still gets created with empty assetId placeholder).
 */
export async function findAssetByAddress(
  userId: string,
  address: string
): Promise<{ id: string; country: string | null; name: string } | null> {
  if (!address) return null;

  const assets = await prisma.userAsset.findMany({
    where: { userId },
    select: { id: true, name: true, location: true, address: true, country: true },
  });

  const normalise = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

  const target = normalise(address);

  // Priority 1: exact normalised match on address field
  const exact = assets.find(a => a.address && normalise(a.address) === target);
  if (exact) return { id: exact.id, country: exact.country, name: exact.name };

  // Priority 2: target contains asset name or asset location
  const partial = assets.find(a =>
    (a.name && target.includes(normalise(a.name))) ||
    (a.location && target.includes(normalise(a.location)))
  );
  return partial ? { id: partial.id, country: partial.country, name: partial.name } : null;
}

// ---------------------------------------------------------------------------
// CORE MATERIALISATION
// ---------------------------------------------------------------------------

/**
 * Materialises a single Document's extractedData into Tenant + Lease records.
 * Idempotent: skipped if Lease records already exist for this documentId.
 */
async function materialiseSingleDocument(
  doc: {
    id: string;
    userId: string;
    documentType: string | null;
    extractedData: unknown;
  }
): Promise<{ tenantsCreated: number; leasesCreated: number }> {
  let tenantsCreated = 0;
  let leasesCreated  = 0;

  const data = (doc.extractedData ?? {}) as Record<string, unknown>;

  // ── Rent roll: N leases per document ─────────────────────────────────────
  if (doc.documentType === "rent_roll") {
    const properties = (data.properties as Record<string, unknown>[]) ?? [];

    for (const p of properties) {
      const tenantName = (p.tenant as string | null) ?? "";
      if (!tenantName || tenantName.toLowerCase() === "vacant") continue;

      const asset = await findAssetByAddress(doc.userId, p.address as string ?? "");

      // Upsert Tenant by (userId, name) — avoid duplicates
      const tenant = await prisma.tenant.upsert({
        where: { userId_name: { userId: doc.userId, name: tenantName } },
        create: {
          userId: doc.userId,
          assetId: asset?.id ?? null,
          name: tenantName,
          sector: inferSector(tenantName),
        },
        update: {
          // Enrich assetId if we found one now but didn't before
          ...(asset?.id ? { assetId: asset.id } : {}),
        },
      });

      if (tenant && !tenant.covenantGrade && asset?.country === "UK") {
        // Fire-and-forget covenant check (does not block materialisation)
        checkCovenantUK(tenantName, "UK")
          .then(result =>
            prisma.tenant.update({
              where: { id: tenant.id },
              data: {
                covenantGrade: result.grade,
                covenantScore: result.score,
                covenantCheckedAt: new Date(),
              },
            })
          )
          .catch(err => console.warn(`[materialise] Covenant check failed for ${tenantName}:`, err));
      }

      // Upsert Lease by (userId + tenantId + documentId + address)
      const expiryDate = parseDate(p.leaseExpiry as string | null);
      const startDate  = parseDate(p.startDate  as string | null);
      const breakDate  = parseDate(p.breakDate  as string | null);
      const sqft       = Number(p.sqft) || 0;
      const passingRent = Number(p.passingRent) || 0;
      const currency   = (p.currency as string | null) ?? (asset?.country === "UK" ? "GBP" : "USD");

      const existing = await prisma.lease.findFirst({
        where: { userId: doc.userId, documentId: doc.id, tenantId: tenant.id },
      });

      if (!existing) {
        await prisma.lease.create({
          data: {
            userId: doc.userId,
            tenantId: tenant.id,
            assetId: asset?.id ?? "",
            documentId: doc.id,
            sqft,
            passingRent,
            rentPerSqft: sqft > 0 ? passingRent / sqft : null,
            startDate,
            expiryDate,
            breakDate,
            currency,
            status: deriveLeaseStatus(expiryDate),
          },
        });
        leasesCreated++;
      }

      tenantsCreated++;
    }
  }

  // ── Single lease agreement ────────────────────────────────────────────────
  if (doc.documentType === "lease_agreement") {
    const tenantName = (data.tenantName as string | null) ?? "";
    if (!tenantName) return { tenantsCreated, leasesCreated };

    const asset = await findAssetByAddress(doc.userId, data.propertyAddress as string ?? "");

    const tenant = await prisma.tenant.upsert({
      where: { userId_name: { userId: doc.userId, name: tenantName } },
      create: {
        userId: doc.userId,
        assetId: asset?.id ?? null,
        name: tenantName,
        sector: inferSector(tenantName),
      },
      update: {
        ...(asset?.id ? { assetId: asset.id } : {}),
      },
    });

    if (tenant && !tenant.covenantGrade && asset?.country === "UK") {
      checkCovenantUK(tenantName, "UK")
        .then(result =>
          prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              covenantGrade: result.grade,
              covenantScore: result.score,
              covenantCheckedAt: new Date(),
            },
          })
        )
        .catch(err => console.warn(`[materialise] Covenant check failed for ${tenantName}:`, err));
    }

    const existing = await prisma.lease.findFirst({
      where: { userId: doc.userId, documentId: doc.id },
    });

    if (!existing) {
      const expiryDate  = parseDate(data.expiryDate  as string | null);
      const startDate   = parseDate(data.startDate   as string | null);
      const breakDate   = parseDate(data.breakDate   as string | null);
      const sqft        = Number(data.sqft) || 0;
      const passingRent = Number(data.annualRent) || 0;
      const currency    = (data.currency as string | null) ?? (asset?.country === "UK" ? "GBP" : "USD");

      await prisma.lease.create({
        data: {
          userId: doc.userId,
          tenantId: tenant.id,
          assetId: asset?.id ?? "",
          documentId: doc.id,
          sqft,
          passingRent,
          rentPerSqft: sqft > 0 ? passingRent / sqft : null,
          startDate,
          expiryDate,
          breakDate,
          currency,
          status: deriveLeaseStatus(expiryDate),
        },
      });
      leasesCreated++;
    }

    tenantsCreated++;
  }

  return { tenantsCreated, leasesCreated };
}

// ---------------------------------------------------------------------------
// LAZY MATERIALISATION — called at GET /api/user/tenants
// ---------------------------------------------------------------------------

/**
 * Finds all lease/rent_roll Documents for the user that have been processed
 * (status="done") but don't yet have a corresponding Lease record, and
 * materialises them.
 *
 * Designed to be called at the start of GET /api/user/tenants — fast if
 * nothing to do (most calls will skip because Leases are already created).
 */
export async function materialisePendingLeases(userId: string): Promise<void> {
  // Find done Documents of lease types
  const docs = await prisma.document.findMany({
    where: {
      userId,
      status: "done",
      documentType: { in: ["rent_roll", "lease_agreement"] },
    },
    select: { id: true, documentType: true, extractedData: true, userId: true },
  });

  if (docs.length === 0) return;

  // Check which documentIds already have Lease records
  const existingDocIds = await prisma.lease
    .findMany({ where: { userId, documentId: { in: docs.map(d => d.id) } }, select: { documentId: true } })
    .then((rows: Array<{ documentId: string | null }>) => new Set(rows.map((r) => r.documentId)));

  const pending = docs.filter(d => !existingDocIds.has(d.id) && d.userId !== null) as Array<{ id: string; userId: string; documentType: string | null; extractedData: unknown }>;
  if (pending.length === 0) return;

  for (const doc of pending) {
    try {
      await materialiseSingleDocument(doc);
    } catch (err) {
      console.error(`[materialise] Failed for document ${doc.id}:`, err);
      // Non-fatal: continue with remaining documents
    }
  }
}

// ---------------------------------------------------------------------------
// ON-DEMAND ENDPOINT HELPER — POST /api/user/leases/materialise
// ---------------------------------------------------------------------------

/**
 * Materialises a specific document (if documentId provided) or all pending
 * documents for the user. Returns counts for the API response.
 */
export async function materialiseOnDemand(
  userId: string,
  documentId?: string
): Promise<{ tenantsCreated: number; leasesCreated: number; docsProcessed: number }> {
  let tenantsCreated = 0;
  let leasesCreated  = 0;
  let docsProcessed  = 0;

  if (documentId) {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId, status: "done" },
      select: { id: true, documentType: true, extractedData: true, userId: true },
    });
    if (!doc) return { tenantsCreated: 0, leasesCreated: 0, docsProcessed: 0 };

    const result = await materialiseSingleDocument(doc as typeof doc & { userId: string });
    tenantsCreated += result.tenantsCreated;
    leasesCreated  += result.leasesCreated;
    docsProcessed   = 1;
  } else {
    // Process all pending
    const docs = await prisma.document.findMany({
      where: { userId, status: "done", documentType: { in: ["rent_roll", "lease_agreement"] } },
      select: { id: true, documentType: true, extractedData: true, userId: true },
    });
    const existingDocIds = await prisma.lease
      .findMany({ where: { userId, documentId: { in: docs.map(d => d.id) } }, select: { documentId: true } })
      .then((rows: Array<{ documentId: string | null }>) => new Set(rows.map((r) => r.documentId)));

    const pending = docs.filter(d => !existingDocIds.has(d.id) && d.userId !== null) as Array<{ id: string; userId: string; documentType: string | null; extractedData: unknown }>;
    for (const doc of pending) {
      const result = await materialiseSingleDocument(doc);
      tenantsCreated += result.tenantsCreated;
      leasesCreated  += result.leasesCreated;
      docsProcessed++;
    }
  }

  return { tenantsCreated, leasesCreated, docsProcessed };
}

// ---------------------------------------------------------------------------
// UTILITY
// ---------------------------------------------------------------------------

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
