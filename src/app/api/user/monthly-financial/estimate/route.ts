/**
 * POST /api/user/monthly-financial/estimate
 * Creates 12 estimated MonthlyFinancial records (trailing 12 months) for a given asset.
 * Idempotent — skips months that already have a record.
 *
 * Body: { assetId: string }
 * Response: { created: number, skipped: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface MFRow {
  id: string; assetId: string; month: number; year: number;
  grossRevenue: number; operatingCosts: number; noi: number;
  maintenanceCost: number; insuranceCost: number; energyCost: number;
  source: string; createdAt: Date; updatedAt: Date;
}

type PrismaWithMF = {
  monthlyFinancial: {
    findFirst: (q: object) => Promise<MFRow | null>;
    create:    (q: object) => Promise<MFRow>;
  };
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { assetId?: string };
  if (!body.assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 422 });
  }

  const asset = await prisma.userAsset.findFirst({
    where:  { id: body.assetId, userId: session.user.id },
    select: { id: true, grossIncome: true, netIncome: true, insurancePremium: true, energyCost: true, sqft: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const sqft         = asset.sqft ?? 10000;
  const grossIncome  = asset.grossIncome ?? sqft * 25;
  const netIncome    = asset.netIncome   ?? Math.round(grossIncome * 0.72);
  const insPremium   = asset.insurancePremium ?? Math.round(grossIncome * 0.04);
  const energyCost   = asset.energyCost ?? Math.round(grossIncome * 0.06);

  const monthlyGross = grossIncome / 12;
  const monthlyNOI   = netIncome / 12;
  const monthlyIns   = insPremium / 12;
  const monthlyEnergy= energyCost / 12;
  const monthlyOpex  = monthlyIns + monthlyEnergy;

  const db = prisma as unknown as PrismaWithMF;

  let created = 0;
  let skipped = 0;
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1; // 1–12
    const year  = d.getFullYear();

    const existing = await db.monthlyFinancial.findFirst({
      where: { assetId: body.assetId, month, year },
    } as object).catch(() => null);

    if (existing) { skipped++; continue; }

    await db.monthlyFinancial.create({
      data: {
        userId:         session.user.id,
        assetId:        body.assetId,
        month,
        year,
        grossRevenue:   Math.round(monthlyGross),
        operatingCosts: Math.round(monthlyOpex),
        noi:            Math.round(monthlyNOI),
        insuranceCost:  Math.round(monthlyIns),
        energyCost:     Math.round(monthlyEnergy),
        maintenanceCost: 0,
        source:         "estimated",
      },
    } as object);
    created++;
  }

  return NextResponse.json({ created, skipped });
}
