/**
 * GET /api/user/assets/:id/valuation
 * Returns AVM (Automated Valuation Model) for a single asset.
 * Caches results for 7 days unless ?refresh=true is passed.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateIncomeCap,
  calculatePsfValue,
  blendValuation,
  getFallbackCapRate,
  type IncomeCapInputs,
  type PsfInputs,
} from "@/lib/avm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "true";

  // Verify asset ownership
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Check for cached valuation (< 7 days old) unless refresh=true
  if (!refresh) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const cachedValuation = await prisma.assetValuation.findFirst({
      where: {
        assetId,
        valuedAt: { gte: sevenDaysAgo },
      },
      orderBy: { valuedAt: "desc" },
    });

    if (cachedValuation) {
      return NextResponse.json({
        assetId,
        avmValue: cachedValuation.avmValue,
        avmLow: cachedValuation.avmLow,
        avmHigh: cachedValuation.avmHigh,
        avmDate: cachedValuation.valuedAt.toISOString().split("T")[0],
        confidence: cachedValuation.confidenceScore,
        method: cachedValuation.method,
        incomeCapValue: cachedValuation.incomeCapValue,
        psfValue: cachedValuation.sqftValue,
        capRateUsed: cachedValuation.capRateUsed,
        ervPsf: asset.marketRentSqft,
        currency: asset.country === "UK" ? "GBP" : "USD",
        compsCount: cachedValuation.compsUsed,
        cached: true,
      });
    }
  }

  // Run fresh AVM calculation
  const comps = await prisma.propertyComparable.findMany({
    where: { assetId },
  });

  const compsCount = comps.length;

  // Calculate median price per sqft from comparables
  let medianPricePsf: number | null = null;
  let p25PricePsf: number | null = null;
  let p75PricePsf: number | null = null;

  if (compsCount >= 3) {
    const prices = comps
      .map((c) => c.pricePerSqft)
      .filter((p) => p != null) as number[];
    
    if (prices.length >= 3) {
      prices.sort((a, b) => a - b);
      medianPricePsf = prices[Math.floor(prices.length / 2)];
      p25PricePsf = prices[Math.floor(prices.length * 0.25)];
      p75PricePsf = prices[Math.floor(prices.length * 0.75)];
    }
  }

  // Calculate income cap valuation
  const incomeCapInputs: IncomeCapInputs = {
    netIncome: asset.netIncome,
    grossIncome: asset.grossIncome,
    passingRent: asset.passingRent,
    opexRatio: 0.30, // Default for gross lease
    marketCapRate: asset.marketCapRate,
    fallbackCapRate: getFallbackCapRate(asset.country, asset.assetType),
    sqft: asset.sqft,
    epcRating: asset.epcRating,
    wault: asset.wault,
  };

  const incomeCapResult = calculateIncomeCap(incomeCapInputs);

  // Calculate PSF valuation if sqft and median price available
  let psfResult: { mid: number; low: number; high: number } | null = null;

  if (asset.sqft && medianPricePsf) {
    const psfInputs: PsfInputs = {
      sqft: asset.sqft,
      pricePerSqft: medianPricePsf,
      p25PricePsf,
      p75PricePsf,
    };
    psfResult = calculatePsfValue(psfInputs);
  }

  // Blend valuations
  const blendedResult = blendValuation(incomeCapResult, psfResult, compsCount);

  // Store new valuation record
  const newValuation = await prisma.assetValuation.create({
    data: {
      userId: session.user.id,
      assetId,
      noiEstimate: incomeCapResult?.noiUsed ?? null,
      capRateUsed: incomeCapResult?.capRateUsed ?? null,
      capRateSource: incomeCapResult?.capRateSource ?? "market_benchmark",
      incomeCapValue: incomeCapResult?.value ?? null,
      pricePerSqft: medianPricePsf,
      sqftValue: psfResult?.mid ?? null,
      compsUsed: compsCount,
      avmValue: blendedResult.avmValue,
      avmLow: blendedResult.avmLow,
      avmHigh: blendedResult.avmHigh,
      confidenceScore: blendedResult.confidenceScore,
      method: blendedResult.method,
      dataSource: blendedResult.dataSource,
    },
  });

  // Update UserAsset with latest AVM values
  await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      avmValue: blendedResult.avmValue,
      avmLow: blendedResult.avmLow,
      avmHigh: blendedResult.avmHigh,
      avmDate: new Date(),
      avmConfidence: blendedResult.confidenceScore,
    },
  });

  return NextResponse.json({
    assetId,
    avmValue: blendedResult.avmValue,
    avmLow: blendedResult.avmLow,
    avmHigh: blendedResult.avmHigh,
    avmDate: newValuation.valuedAt.toISOString().split("T")[0],
    confidence: blendedResult.confidenceScore,
    method: blendedResult.method,
    incomeCapValue: incomeCapResult?.value ?? null,
    psfValue: psfResult?.mid ?? null,
    capRateUsed: incomeCapResult?.capRateUsed ?? null,
    ervPsf: asset.marketRentSqft,
    currency: asset.country === "UK" ? "GBP" : "USD",
    compsCount,
    cached: false,
  });
}
