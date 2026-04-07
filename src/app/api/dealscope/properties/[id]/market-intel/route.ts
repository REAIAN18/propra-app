// Market intelligence for a property dossier — design 06 tab-market.
// Returns real benchmarks from scout-benchmarks + MacroRate, scoped to the
// subject property's region + asset type. Anything we cannot compute is
// returned as null so the UI can show "—" rather than fabricate numbers.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MARKET_CAP_RATES,
  MARKET_ERV,
  detectRegionFromAddress,
  normaliseAssetType,
  getMarketCapRate,
  getMarketERV,
} from "@/lib/data/scout-benchmarks";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const property = await prisma.scoutDeal.findUnique({
    where: { id },
    select: {
      id: true,
      address: true,
      assetType: true,
      buildingSizeSqft: true,
      askingPrice: true,
      dataSources: true,
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const region = detectRegionFromAddress(property.address ?? "");
  const asset = normaliseAssetType(property.assetType ?? "");

  const capRate = getMarketCapRate(region, asset);
  const erv = getMarketERV(region, asset);

  // Subject ERV / yield calculations from real fields only
  const sqft = property.buildingSizeSqft ?? null;
  const ask = property.askingPrice ? Number(property.askingPrice) : null;
  const subjectERV = sqft && erv ? sqft * erv : null;
  const subjectYield = subjectERV && ask ? subjectERV / ask : null;

  // Latest SOFR (only macro series we currently track)
  const sofr = await prisma.macroRate.findFirst({
    where: { series: "SOFR" },
    orderBy: { date: "desc" },
    select: { value: true, date: true },
  });

  return NextResponse.json({
    property: {
      id: property.id,
      address: property.address,
      assetType: asset,
      sqft,
      askingPrice: ask,
    },
    market: {
      region,
      capRate,
      ervPerSqft: erv,
      subjectERV,
      subjectYield,
      capRateMin: Math.min(...Object.values(MARKET_CAP_RATES[region] ?? {}).filter((v) => typeof v === "number")) || null,
      capRateMax: Math.max(...Object.values(MARKET_CAP_RATES[region] ?? {}).filter((v) => typeof v === "number")) || null,
      ervMin: Math.min(...Object.values(MARKET_ERV[region] ?? {}).filter((v) => typeof v === "number")) || null,
      ervMax: Math.max(...Object.values(MARKET_ERV[region] ?? {}).filter((v) => typeof v === "number")) || null,
    },
    macro: {
      sofr: sofr?.value ?? null,
      sofrDate: sofr?.date ?? null,
      basRate: null,
      cpi: null,
      gdp: null,
    },
  });
}
