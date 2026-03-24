/**
 * POST /api/cron/tenant-engagement-triggers
 * Daily cron: scans all Lease records approaching expiry and creates
 * TenantEngagement records + sends alert emails to asset owners.
 *
 * Trigger horizons (relative to lease expiry):
 *   18 months — early strategic review (rent review or break exercise)
 *   12 months — formal re-gear discussion window opens
 *    6 months — urgent action required
 *    3 months — critical (risk of void)
 *
 * Idempotent: will not create duplicate engagements for the same
 * lease × horizon combination (unique on leaseId + horizonMonths).
 *
 * Secured by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTenantEngagementAlert } from "@/lib/email";

const HORIZONS_MONTHS = [18, 12, 6, 3];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch all active leases with expiry dates (pre-migration: table may not exist)
  const leases = await (prisma as unknown as {
    lease: {
      findMany: (q: object) => Promise<Array<{
        id: string;
        expiryDate: Date | null;
        passingRentPa: number | null;
        tenant: {
          id: string;
          name: string;
          userId: string;
          asset: { id: string; name: string; country: string | null } | null;
          user: { email: string | null } | null;
        };
      }>>;
    }
  }).lease.findMany({
    where: {
      expiryDate: { not: null },
      status:     { in: ["active", "expiring_soon"] },
    },
    select: {
      id:            true,
      expiryDate:    true,
      passingRentPa: true,
      tenant: {
        select: {
          id:     true,
          name:   true,
          userId: true,
          asset: {
            select: { id: true, name: true, country: true },
          },
          user: {
            select: { email: true },
          },
        },
      },
    },
  }).catch(() => []);

  let triggersCreated = 0;
  let emailsSent = 0;
  const errors: string[] = [];

  for (const lease of leases) {
    if (!lease.expiryDate) continue;

    const daysToExpiry = Math.floor(
      (lease.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const horizonMonths of HORIZONS_MONTHS) {
      const horizonDays = horizonMonths * 30;

      // Only trigger if we're inside this horizon window
      // Use a 7-day window to avoid duplicate triggers on re-runs
      if (daysToExpiry > horizonDays || daysToExpiry < horizonDays - 7) continue;

      // Idempotency: check if engagement already exists for this lease × horizon
      const existing = await (prisma as unknown as {
        tenantEngagement: {
          findFirst: (q: object) => Promise<{ id: string } | null>;
          create: (q: object) => Promise<{ id: string }>;
        }
      }).tenantEngagement.findFirst({
        where: {
          leaseId:       lease.id,
          horizonMonths,
        },
        select: { id: true },
      }).catch(() => null);

      if (existing) continue;

      // Create engagement record
      const engagement = await (prisma as unknown as {
        tenantEngagement: {
          create: (q: object) => Promise<{ id: string }>;
        }
      }).tenantEngagement.create({
        data: {
          leaseId:       lease.id,
          tenantId:      lease.tenant.id,
          userId:        lease.tenant.userId,
          assetId:       lease.tenant.asset?.id ?? null,
          horizonMonths,
          daysToExpiry,
          status:        "pending",
          triggeredAt:   now,
        },
      }).catch((err: unknown) => {
        errors.push(`create engagement lease ${lease.id} horizon ${horizonMonths}: ${err}`);
        return null;
      });

      if (!engagement) continue;
      triggersCreated++;

      // Send email alert to asset owner
      const email = lease.tenant.user?.email;
      if (email) {
        try {
          await sendTenantEngagementAlert(
            email,
            lease.tenant.name,
            lease.tenant.asset?.name ?? "your property",
            `${horizonMonths} months`,
            engagement.id
          );
          emailsSent++;
        } catch (err) {
          errors.push(`email lease ${lease.id}: ${err}`);
        }
      }
    }
  }

  return NextResponse.json({
    leasesScanned:  leases.length,
    triggersCreated,
    emailsSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
