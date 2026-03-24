/**
 * GET /api/user/assets/:id/valuation
 * Computes (or returns cached) Automated Valuation for a single asset.
 *
 * Cache: returns existing AssetValuation if < 7 days old.
 * Refresh: add ?refresh=true to force recalculation.
 *
 * Writes result to:
 *   - AssetValuation model (full record)
 *   - UserAsset.avmValue / avmDate / avmConfidence (quick-lookup fields)
 *
 * UK assets: income capitalisation only (Land Registry PPD has no sqft).
 * US assets: blended if ≥ 2 ATTOM comparables exist with pricePerSqft.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateIncomeCap,
  calculatePsfValue,
  blendValuation,
  getFallbackCapRate,
  deriveOpExRatio,
  median,
  percentile,
} from "@/lib/avm";
import { computeWAULT } from "@/lib/tenant-health";
import { fetchLandRegistryComps } from "@/lib/land-registry";

// ---------------------------------------------------------------------------
// GET — single asset valuation
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "true";

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    include: {
      comparables: {
        orderBy: { saleDate: "desc" },
        take: 15,
      },
      valuations: {
        orderBy: { valuedAt: "desc" },
        take: 2,
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Check cache ────────────────────────────────────────────────────────
  const latest = asset.valuations[0] ?? null;
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
  const isFresh = latest && !forceRefresh &&
    (Date.now() - latest.valuedAt.getTime() < SEVEN_DAYS);

  if (isFresh && latest) {
    return NextResponse.json(mapValuationToResponse(asset, latest));
  }

  // ── Fetch UK comps from Land Registry (if not already done) ────────────
  const isUK = (asset.country ?? "").toUpperCase() === "UK";
  if (isUK && asset.postcode) {
    await fetchLandRegistryComps(assetId, asset.postcode, asset.sqft ?? null);
    // Re-fetch comparables after potential LR fetch
    const refreshed = await prisma.userAsset.findUnique({
      where: { id: assetId },
      include: { comparables: { orderBy: { saleDate: "desc" }, take: 15 } },
    });
    if (refreshed) Object.assign(asset, { comparables: refreshed.comparables });
  }

  // ── Compute WAULT from Lease records (if Wave 2 Lease model exists) ────
  let wault: number | null = null;
  try {
    const leases = await prisma.lease.findMany({
      where: { assetId, userId: session.user.id },
      select: { sqft: true, expiryDate: true },
    });
    if (leases.length > 0) {
      const leasesWithDays = leases
        .filter((l): l is { sqft: number; expiryDate: Date | null } => l.sqft !== null)
        .map((l) => ({
          sqft: l.sqft,
          daysToExpiry: l.expiryDate
            ? Math.floor((l.expiryDate.getTime() - Date.now()) / 86_400_000)
            : null,
        }));
      wault = computeWAULT(leasesWithDays);
    }
  } catch {
    // Lease model may not exist yet (pre-migration) — silently continue
  }

  // ── Income capitalisation ──────────────────────────────────────────────
  const fallbackCapRate = getFallbackCapRate(asset.country, asset.assetType);
  const incomeCap = calculateIncomeCap({
    netIncome:    asset.netIncome,
    grossIncome:  asset.grossIncome,
    passingRent:  asset.passingRent,
    opexRatio:    deriveOpExRatio(asset.assetType),
    marketCapRate: asset.marketCapRate,
    fallbackCapRate,
    sqft:         asset.sqft,
    epcRating:    asset.epcRating,
    wault,
  });

  // ── PSF method (US only — LR data has no sqft for UK commercial) ───────
  const compPrices = (asset.comparables as Array<{ pricePerSqft: number | null }>)
    .map((c: { pricePerSqft: number | null }) => c.pricePerSqft)
    .filter((v): v is number => v !== null && v > 0);

  const psf = (!isUK && asset.sqft && compPrices.length >= 2)
    ? calculatePsfValue({
        sqft:         asset.sqft,
        pricePerSqft: median(compPrices) ?? null,
        p25PricePsf:  percentile(compPrices, 25),
        p75PricePsf:  percentile(compPrices, 75),
      })
    : null;

  // ── Blend ──────────────────────────────────────────────────────────────
  const blend = blendValuation(incomeCap, psf, compPrices.length);

  // ── Store result ───────────────────────────────────────────────────────
  const prev = asset.valuations[0] ?? null;
  const saved = await prisma.assetValuation.create({
    data: {
      userId:         session.user.id,
      assetId,
      noiEstimate:    incomeCap?.noiUsed      ?? null,
      capRateUsed:    incomeCap?.capRateUsed  ?? null,
      capRateSource:  incomeCap?.capRateSource ?? null,
      incomeCapValue: incomeCap?.value        ?? null,
      pricePerSqft:   compPrices.length ? (median(compPrices) ?? null) : null,
      sqftValue:      psf?.mid               ?? null,
      compsUsed:      compPrices.length,
      avmValue:       blend.avmValue,
      avmLow:         blend.avmLow,
      avmHigh:        blend.avmHigh,
      confidenceScore: blend.confidenceScore,
      method:         blend.method,
      dataSource:     blend.dataSource,
      notes:          incomeCap?.adjustments.length
        ? incomeCap.adjustments.map(a => `${a.label} (+${a.bps}bps)`).join("; ")
        : null,
      previousValue:  prev?.avmValue         ?? null,
      changeAbsolute: blend.avmValue && prev?.avmValue
        ? blend.avmValue - prev.avmValue : null,
      changePct:      blend.avmValue && prev?.avmValue
        ? (blend.avmValue - prev.avmValue) / prev.avmValue : null,
    },
  });

  // ── Update quick-lookup on UserAsset ────────────────────────────────────
  await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      avmValue:     blend.avmValue,
      avmDate:      new Date(),
      avmConfidence: blend.confidenceScore,
    },
  });

  return NextResponse.json(mapValuationToResponse(asset, saved));
}

// ---------------------------------------------------------------------------
// RESPONSE MAPPER
// ---------------------------------------------------------------------------

function mapValuationToResponse(
  asset: {
    id: string;
    name: string;
    country: string | null;
    sqft: number | null;
  },
  v: {
    avmValue: number | null;
    avmLow: number | null;
    avmHigh: number | null;
    confidenceScore: number | null;
    method: string;
    dataSource: string;
    capRateUsed: number | null;
    capRateSource: string | null;
    noiEstimate: number | null;
    compsUsed: number;
    pricePerSqft: number | null;
    notes: string | null;
    previousValue: number | null;
    changePct: number | null;
    valuedAt: Date;
  }
) {
  const currency = (asset.country ?? "").toUpperCase() === "UK" ? "GBP" : "USD";
  return {
    assetId:        asset.id,
    assetName:      asset.name,
    avmValue:       v.avmValue,
    avmLow:         v.avmLow,
    avmHigh:        v.avmHigh,
    confidenceScore: v.confidenceScore ?? 0,
    method:         v.method,
    dataSource:     v.dataSource,
    capRateUsed:    v.capRateUsed,
    capRateSource:  v.capRateSource,
    noiUsed:        v.noiEstimate,
    adjustments:    v.notes ?? null,
    compsUsed:      v.compsUsed,
    pricePerSqft:   v.pricePerSqft,
    previousValue:  v.previousValue,
    changePct:      v.changePct,
    valuedAt:       v.valuedAt.toISOString(),
    currency,
  };
}
