/**
 * POST /api/cron/rent-review-triggers
 * Daily cron (08:00 UTC): scans all active Lease records and creates
 * RentReviewEvent records at correct horizons.
 *
 * Horizons:  18m | 12m | 6m | 3m  (relative to lease expiryDate)
 * Idempotent: @@unique([userId, leaseId, horizon]) prevents duplicates.
 *
 * ERV: uses asset.marketERV (per sqft) if available; falls back to null.
 * Leverage score: calculated inline from ERV gap + expiry proximity.
 *
 * Secured by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const HORIZONS: { label: string; months: number }[] = [
  { label: "18m", months: 18 },
  { label: "12m", months: 12 },
  { label: "6m",  months: 6  },
  { label: "3m",  months: 3  },
];

// Window (in days) around each horizon to trigger — avoids missing daily runs
const TRIGGER_WINDOW_DAYS = 7;

type LeaseLike = {
  id: string;
  userId: string;
  expiryDate: Date | null;
  breakDate: Date | null;
  passingRent: number;
  sqft: number;
  asset: {
    id: string;
    name: string;
    address: string | null;
    marketERV: number | null;
    marketRentSqft: number | null;
    country: string | null;
  } | null;
  tenant: { id: string; name: string } | null;
};

type PrismaWithWave2 = {
  lease: {
    findMany(q: object): Promise<LeaseLike[]>;
  };
  rentReviewEvent: {
    findFirst(q: object): Promise<{ id: string } | null>;
    create(q: object): Promise<{ id: string }>;
  };
};

function deriveLeverageScore(
  daysToExpiry: number,
  ervGapPct: number | null
): { score: number; explanation: string } {
  let score = 5;

  // Expiry proximity
  if (daysToExpiry < 90)       score += 3;
  else if (daysToExpiry < 180) score += 2;
  else if (daysToExpiry < 365) score += 1;

  // ERV gap
  if (ervGapPct !== null) {
    if (ervGapPct > 20)       score += 2;
    else if (ervGapPct > 10)  score += 1;
    else if (ervGapPct < -5)  score -= 1;
  }

  score = Math.max(1, Math.min(10, score));

  const parts: string[] = [];
  if (daysToExpiry < 90)        parts.push(`Lease expires in ${daysToExpiry} days — limited time for tenant to find alternative`);
  else if (daysToExpiry < 365)  parts.push(`Lease expires in ${Math.round(daysToExpiry / 30)} months — tenant has limited alternatives`);
  if (ervGapPct !== null && ervGapPct > 5) parts.push(`Passing rent is ${ervGapPct.toFixed(0)}% below market ERV — strong reversion case`);
  if (parts.length === 0)       parts.push("Review triggered by upcoming lease expiry");

  return { score, explanation: parts.slice(0, 2).join(". ") };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = prisma as unknown as PrismaWithWave2;
  const now = new Date();

  // Fetch active leases with expiry dates
  const leases = await db.lease.findMany({
    where: {
      expiryDate: { not: null },
      status: { in: ["active", "expiring_soon"] },
    },
    select: {
      id:          true,
      userId:      true,
      expiryDate:  true,
      breakDate:   true,
      passingRent: true,
      sqft:        true,
      asset: {
        select: {
          id:           true,
          name:         true,
          address:      true,
          marketERV:    true,
          marketRentSqft: true,
          country:      true,
        },
      },
      tenant: {
        select: { id: true, name: true },
      },
    },
  } as object).catch(() => [] as LeaseLike[]);

  let eventsCreated = 0;
  const errors: string[] = [];

  for (const lease of leases) {
    if (!lease.expiryDate) continue;

    const daysToExpiry = Math.floor(
      (lease.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only process leases within 18 months of expiry
    if (daysToExpiry > 18 * 30 + TRIGGER_WINDOW_DAYS || daysToExpiry < 0) continue;

    for (const { label, months } of HORIZONS) {
      const horizonDays = months * 30;

      // Skip if we're not near this horizon window yet
      if (daysToExpiry > horizonDays + TRIGGER_WINDOW_DAYS) continue;

      // Idempotency check
      const existing = await db.rentReviewEvent.findFirst({
        where: {
          userId:  lease.userId,
          leaseId: lease.id,
          horizon: label,
        },
        select: { id: true },
      } as object).catch(() => null as { id: string } | null);

      if (existing) continue;

      // Calculate ERV and gap
      const ervLive = lease.asset?.marketERV
        ? lease.asset.marketERV * (lease.sqft || 1)
        : (lease.asset?.marketRentSqft ? lease.asset.marketRentSqft * (lease.sqft || 1) : null);

      const gap = ervLive !== null
        ? ervLive - lease.passingRent
        : null;

      const ervGapPct = (ervLive !== null && lease.passingRent > 0)
        ? ((ervLive - lease.passingRent) / lease.passingRent) * 100
        : null;

      const { score, explanation } = deriveLeverageScore(daysToExpiry, ervGapPct);

      await db.rentReviewEvent.create({
        data: {
          userId:              lease.userId,
          assetId:             lease.asset?.id ?? null,
          leaseId:             lease.id,
          tenantName:          lease.tenant?.name ?? "Unknown",
          propertyAddress:     lease.asset?.address ?? null,
          expiryDate:          lease.expiryDate,
          breakDate:           lease.breakDate ?? null,
          passingRent:         lease.passingRent,
          sqft:                lease.sqft || null,
          ervLive,
          ervSource:           ervLive !== null ? "asset_erv" : null,
          ervFetchedAt:        ervLive !== null ? now : null,
          gap,
          leverageScore:       score,
          leverageExplanation: explanation,
          horizon:             label,
          status:              "pending",
          id:                  `rre_${Math.random().toString(36).slice(2, 12)}`,
        },
      } as object).catch((err: unknown) => {
        errors.push(`lease ${lease.id} horizon ${label}: ${String(err)}`);
        return null;
      });

      eventsCreated++;
    }
  }

  return NextResponse.json({
    leasesScanned: leases.length,
    eventsCreated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
