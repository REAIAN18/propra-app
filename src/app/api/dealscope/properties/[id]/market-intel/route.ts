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

  // ── Sales evidence (real comps from enrichment) ──
  // ds.comps shape: { address, postcode, price, date, propertyType, sqft?, pricePerSqft?, isNew? }
  // Implied yield is computed at the regional ERV rate (labelled as such).
  const ds = (property.dataSources ?? {}) as Record<string, unknown>;
  const rawSalesComps = (ds.comps as Record<string, unknown>[] | undefined)
    ?? (ds.comparables as Record<string, unknown>[] | undefined)
    ?? [];
  const salesComps = (Array.isArray(rawSalesComps) ? rawSalesComps : []).map((c) => {
    const price = (c.price ?? c.salePrice) as number | null;
    const compSqft = (c.sqft ?? c.size) as number | null;
    const psf = compSqft && price ? Math.round(price / compSqft) : null;
    const compErv = compSqft && erv ? compSqft * erv : null;
    const impliedYield = compErv && price ? compErv / price : null;
    return {
      address: (c.address ?? c.name ?? "—") as string,
      type: (c.propertyType ?? c.type ?? c.assetType ?? asset) as string,
      sqft: compSqft,
      price: price,
      pricePerSqft: psf,
      impliedYield, // computed at regional ERV — labelled in UI
      date: (c.date ?? c.saleDate ?? c.transferDate ?? null) as string | null,
      source: (c.source ?? "Land Registry PPD") as string,
      // Wave Q: pass through score + provenance stamped at enrich time
      score: (c.score as number | undefined) ?? null,
      provenance: (c.provenance as { source: string; dataset: string; retrievedAt: string } | undefined) ?? null,
    };
  });

  // Sales summary stats
  const validPsf = salesComps.map((c) => c.pricePerSqft).filter((v): v is number => v != null);
  const validYields = salesComps.map((c) => c.impliedYield).filter((v): v is number => v != null);
  const salesStats = {
    avgPsf: validPsf.length > 0 ? Math.round(validPsf.reduce((a, b) => a + b, 0) / validPsf.length) : null,
    minPsf: validPsf.length > 0 ? Math.min(...validPsf) : null,
    maxPsf: validPsf.length > 0 ? Math.max(...validPsf) : null,
    avgYield: validYields.length > 0 ? validYields.reduce((a, b) => a + b, 0) / validYields.length : null,
    count: salesComps.length,
  };

  // ── Rental evidence (only if enrichment populated it) ──
  const rawRentalComps = (ds.rentalComps as Record<string, unknown>[] | undefined)
    ?? (ds.lettings as Record<string, unknown>[] | undefined)
    ?? [];
  const rentalComps = (Array.isArray(rawRentalComps) ? rawRentalComps : []).map((c) => {
    const rentPa = (c.rentPa ?? c.annualRent ?? c.rent) as number | null;
    const compSqft = (c.sqft ?? c.size) as number | null;
    const rentPsf = (c.rentPsf as number | null) ?? (rentPa && compSqft ? rentPa / compSqft : null);
    return {
      address: (c.address ?? "—") as string,
      type: (c.propertyType ?? c.type ?? asset) as string,
      sqft: compSqft,
      rentPa,
      rentPsf,
      lease: (c.lease ?? c.term ?? null) as string | null,
      date: (c.date ?? null) as string | null,
    };
  });
  const validRentPsf = rentalComps.map((c) => c.rentPsf).filter((v): v is number => v != null);
  const rentalStats = {
    avgRentPsf: validRentPsf.length > 0 ? validRentPsf.reduce((a, b) => a + b, 0) / validRentPsf.length : null,
    minRentPsf: validRentPsf.length > 0 ? Math.min(...validRentPsf) : null,
    maxRentPsf: validRentPsf.length > 0 ? Math.max(...validRentPsf) : null,
    count: rentalComps.length,
  };

  // Wave J5: latest snapshot for each macro series we track.
  const [sofr, boe, cpi, gdp] = await Promise.all([
    prisma.macroRate.findFirst({ where: { series: "SOFR" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
    prisma.macroRate.findFirst({ where: { series: "BOE_BASE" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
    prisma.macroRate.findFirst({ where: { series: "CPI" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
    prisma.macroRate.findFirst({ where: { series: "GDP_QOQ" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
  ]);

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
      basRate: boe?.value ?? null,
      basRateDate: boe?.date ?? null,
      cpi: cpi?.value ?? null,
      cpiDate: cpi?.date ?? null,
      gdp: gdp?.value ?? null,
      gdpDate: gdp?.date ?? null,
    },
    salesComps,
    salesStats,
    rentalComps,
    rentalStats,
  });
}
