import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * ATTOM-driven market benchmarks for the dashboard Market Benchmarking panel.
 *
 * Aggregates comparable sale prices stored in PropertyComparable (populated by
 * src/lib/attom.ts on asset creation) to compute live FL commercial market medians.
 *
 * Derivation method:
 *   1. Median pricePerSqft from ATTOM comparable sales (live ATTOM data)
 *   2. marketRentPsf = medianPricePsf × capRate ÷ noiMargin
 *      (stabilised asset: value = NOI / capRate → rent = NOI / noiMargin)
 *   3. marketOpExPsf = marketRentPsf × (1 − noiMargin)
 *   4. marketInsurancePsf = FL commercial ~7 % of OpEx
 *
 * Returns { attomDriven: false } when no ATTOM comparables exist yet.
 */

export interface AttomMarketBenchmarks {
  market: string;
  currency: "USD" | "GBP";
  source: string;
  asOf: string;
  compsCount: number;
  attomDriven: boolean;

  // Core metrics
  marketPricePerSqft: number;
  marketRentPsf: number;
  marketCapRate: number;
  marketNOIMargin: number;
  marketOccupancy: number;
  marketOpExPsf: number;
  marketInsurancePsf: number;
  marketInitialYield: number;

  // ERV range (derived from comparable price spread)
  ervMin: number;
  ervMax: number;
  ervMid: number;
  ervUnit: string;
}

// FL commercial market standards — used as inputs to derive rent from ATTOM price
const FL_CAP_RATE = 6.5;       // %
const FL_NOI_MARGIN = 0.58;    // 58 %
const FL_OCCUPANCY = 94;       // %
const FL_INS_PCT_OF_OPEX = 0.07;

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get all assets for this user
  const assets = await prisma.userAsset.findMany({
    where: { userId },
    select: { id: true },
  });
  const assetIds = assets.map((a) => a.id);

  if (!assetIds.length) {
    return NextResponse.json({ attomDriven: false, compsCount: 0 });
  }

  // Aggregate comparable sales from ATTOM
  const comps = await prisma.propertyComparable.findMany({
    where: { assetId: { in: assetIds }, source: "attom" },
    select: { pricePerSqft: true, saleDate: true },
    orderBy: { saleDate: "desc" },
    take: 50,
  });

  const prices = comps
    .map((c) => c.pricePerSqft)
    .filter((v): v is number => v !== null && v > 0);

  if (!prices.length) {
    return NextResponse.json({ attomDriven: false, compsCount: comps.length });
  }

  const medianPricePsf = median(prices);
  const p25PricePsf = percentile(prices, 25);
  const p75PricePsf = percentile(prices, 75);

  // Derive rent/sqft from comparable sale prices
  // NOI/sqft = value/sqft × capRate ; rent/sqft = NOI/sqft ÷ noiMargin
  const capRateDecimal = FL_CAP_RATE / 100;
  const marketRentPsf = medianPricePsf * capRateDecimal / FL_NOI_MARGIN;
  const ervMin = p25PricePsf * capRateDecimal / FL_NOI_MARGIN;
  const ervMax = p75PricePsf * capRateDecimal / FL_NOI_MARGIN;

  const marketOpExPsf = marketRentPsf * (1 - FL_NOI_MARGIN);
  const marketInsurancePsf = marketOpExPsf * FL_INS_PCT_OF_OPEX;

  // Most recent comp date for "as of" attribution
  const latestDate = comps
    .map((c) => c.saleDate)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? new Date().toISOString().slice(0, 10);

  const result: AttomMarketBenchmarks = {
    market: "FL Commercial (ATTOM comparables)",
    currency: "USD",
    source: `ATTOM Data Solutions (${prices.length} comparable sales)`,
    asOf: latestDate,
    compsCount: prices.length,
    attomDriven: true,

    marketPricePerSqft: Math.round(medianPricePsf * 100) / 100,
    marketRentPsf: Math.round(marketRentPsf * 100) / 100,
    marketCapRate: FL_CAP_RATE,
    marketNOIMargin: FL_NOI_MARGIN * 100,
    marketOccupancy: FL_OCCUPANCY,
    marketOpExPsf: Math.round(marketOpExPsf * 100) / 100,
    marketInsurancePsf: Math.round(marketInsurancePsf * 100) / 100,
    marketInitialYield: FL_CAP_RATE,

    ervMin: Math.round(ervMin * 100) / 100,
    ervMax: Math.round(ervMax * 100) / 100,
    ervMid: Math.round(marketRentPsf * 100) / 100,
    ervUnit: "psf",
  };

  return NextResponse.json(result, {
    headers: {
      // Cache for 1 hour — comps are fetched on asset creation, not real-time
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=300",
    },
  });
}
