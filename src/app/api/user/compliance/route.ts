/**
 * GET /api/user/compliance
 * Returns all ComplianceCertificate records for the user's assets, grouped by asset.
 * Falls back to the UserAsset.complianceItems JSON blob for assets with no cert records yet.
 *
 * Response:
 * {
 *   assets: { assetId, assetName, certificates: [...], urgentCount, missingCount }[]
 *   totalUrgent: number
 *   nextExpiry: string | null
 * }
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Expected certificate types by asset class
const CERT_TYPES_ALL = ["epc", "fire_risk", "gas_safe", "eicr", "legionella", "insurance"] as const;
const CERT_TYPES_INDUSTRIAL = ["asbestos"] satisfies string[];
const INDUSTRIAL_TYPES = new Set(["industrial", "warehouse", "logistics", "distribution"]);

function expectedCertTypes(assetType: string | null): string[] {
  const base: string[] = [...CERT_TYPES_ALL];
  if (INDUSTRIAL_TYPES.has((assetType ?? "").toLowerCase())) {
    base.push(...CERT_TYPES_INDUSTRIAL);
  }
  return base;
}

function daysUntil(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface CertRow {
  id: string; type: string; status: string;
  expiryDate: Date | null; documentId: string | null;
  renewalRequestedAt: Date | null;
}

type PrismaWithCerts = {
  complianceCertificate: {
    findMany: (q: object) => Promise<(CertRow & { assetId: string })[]>;
  };
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.userAsset.findMany({
    where:   { userId: session.user.id },
    select:  { id: true, name: true, assetType: true },
    orderBy: { createdAt: "asc" },
  });

  if (assets.length === 0) {
    return NextResponse.json({ assets: [], totalUrgent: 0, nextExpiry: null });
  }

  const assetIds = assets.map((a) => a.id);

  // Load all certs for this user's assets
  const allCerts = await (prisma as unknown as PrismaWithCerts)
    .complianceCertificate
    .findMany({
      where: { assetId: { in: assetIds } },
      select: {
        id: true, assetId: true, type: true, status: true,
        expiryDate: true, documentId: true, renewalRequestedAt: true,
      },
    } as object)
    .catch(() => [] as (CertRow & { assetId: string })[]);

  // Group certs by assetId
  const certsByAsset = new Map<string, (CertRow & { assetId: string })[]>();
  for (const c of allCerts) {
    const arr = certsByAsset.get(c.assetId) ?? [];
    arr.push(c);
    certsByAsset.set(c.assetId, arr);
  }

  const now = Date.now();
  let totalUrgent = 0;
  let nextExpiryMs = Infinity;

  const assetResults = assets.map((asset) => {
    const certs = certsByAsset.get(asset.id) ?? [];
    const expected = expectedCertTypes(asset.assetType);
    const certMap = new Map(certs.map((c) => [c.type, c]));

    const certificates = expected.map((type) => {
      const cert = certMap.get(type);
      if (!cert) {
        return {
          id:                  null,
          type,
          status:              "missing" as const,
          expiryDate:          null,
          daysToExpiry:        null,
          documentId:          null,
          renewalRequestedAt:  null,
        };
      }
      const daysToExpiry = cert.expiryDate ? daysUntil(cert.expiryDate) : null;
      // Auto-update status based on days
      let status = cert.status;
      if (cert.expiryDate) {
        const d = daysUntil(cert.expiryDate);
        if (d < 0) status = "expired";
        else if (d <= 90) status = "expiring";
      }
      return {
        id:                 cert.id,
        type,
        status,
        expiryDate:         cert.expiryDate?.toISOString() ?? null,
        daysToExpiry,
        documentId:         cert.documentId,
        renewalRequestedAt: cert.renewalRequestedAt?.toISOString() ?? null,
      };
    });

    const urgentCount = certificates.filter(
      (c) => c.status === "expired" || (c.status === "expiring" && (c.daysToExpiry ?? 999) <= 30)
    ).length;
    const missingCount = certificates.filter((c) => c.status === "missing").length;
    totalUrgent += urgentCount;

    for (const c of certificates) {
      if (c.expiryDate) {
        const ms = new Date(c.expiryDate).getTime();
        if (ms > now && ms < nextExpiryMs) nextExpiryMs = ms;
      }
    }

    return { assetId: asset.id, assetName: asset.name, certificates, urgentCount, missingCount };
  });

  const nextExpiry = nextExpiryMs < Infinity ? new Date(nextExpiryMs).toISOString() : null;

  return NextResponse.json({ assets: assetResults, totalUrgent, nextExpiry });
}
