/**
 * GET /api/user/portfolio/valuation
 * Returns summed portfolio valuation across all user assets with per-asset breakdown.
 *
 * Uses UserAsset.avmValue (quick-lookup) if fresh (< 7 days).
 * Falls back to inline calculation for assets that have never been valued.
 *
 * Powers the Dashboard KPI strip "Portfolio Value" tile.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ totalValue: null, assetsValued: 0, assetsTotal: 0, breakdown: [] });
  }

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      country: true,
      avmValue:      true,
      avmLow:        true,
      avmHigh:       true,
      avmDate:       true,
      avmConfidence: true,
      // Inline fallback: used when avmValue is null
      netIncome:     true,
      marketCapRate: true,
    },
  });

  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

  // Latest AssetValuation records for method + changePct
  const latestValuations = await prisma.assetValuation.findMany({
    where: {
      assetId: { in: assets.map(a => a.id) },
      userId:  session.user.id,
    },
    orderBy: { valuedAt: "desc" },
    distinct: ["assetId"],
    select: {
      assetId:   true,
      method:    true,
      changePct: true,
      valuedAt:  true,
    },
  }).catch(() => []); // pre-migration fallback

  const valuationByAsset = new Map(
    (latestValuations as Array<{ assetId: string; method: string | null; changePct: number | null; valuedAt: Date }>)
      .map((v) => [v.assetId, v] as const)
  );

  let totalValue = 0;
  let totalLow   = 0;
  let totalHigh  = 0;
  let assetsValued = 0;
  let weightedConfidenceSum = 0;

  const breakdown = assets.map(a => {
    const isFresh = a.avmDate && (Date.now() - a.avmDate.getTime() < SEVEN_DAYS);
    const latest  = valuationByAsset.get(a.id);

    let avmValue      = a.avmValue ?? null;
    let avmLow        = (a as { avmLow?: number | null }).avmLow ?? null;
    let avmHigh       = (a as { avmHigh?: number | null }).avmHigh ?? null;
    let confidenceScore = a.avmConfidence ?? null;
    let method        = latest?.method ?? null;

    // Inline fallback for unvalued assets: simple income cap
    if (!avmValue && a.netIncome && a.marketCapRate) {
      avmValue      = a.netIncome / a.marketCapRate;
      avmLow        = avmValue * 0.90;
      avmHigh       = avmValue * 1.10;
      confidenceScore = 0.40; // market benchmark only
      method        = "income_cap";
    }

    if (avmValue) {
      totalValue += avmValue;
      if (avmLow)  totalLow  += avmLow;
      if (avmHigh) totalHigh += avmHigh;
      assetsValued++;
      if (confidenceScore) weightedConfidenceSum += confidenceScore * avmValue;
    }

    return {
      assetId:         a.id,
      assetName:       a.name,
      avmValue,
      avmLow,
      avmHigh,
      confidenceScore,
      method,
      changePct:       latest?.changePct ?? null,
      isFresh:         !!isFresh,
      currency:        (a.country ?? "").toUpperCase() === "UK" ? "GBP" : "USD",
    };
  });

  const avgConfidenceScore = totalValue > 0
    ? weightedConfidenceSum / totalValue
    : null;

  return NextResponse.json({
    totalValue:       assetsValued > 0 ? totalValue : null,
    totalValueLow:    assetsValued > 0 ? totalLow   : null,
    totalValueHigh:   assetsValued > 0 ? totalHigh  : null,
    currency:         "GBP", // mixed-currency portfolios not yet supported
    confidenceScore:  avgConfidenceScore,
    assetsValued,
    assetsTotal:      assets.length,
    breakdown,
  });
}
