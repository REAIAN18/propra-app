/**
 * POST /api/scout/deals/:dealId/underwrite
 * Calculates or recalculates underwriting metrics for a Scout deal.
 *
 * Accepts optional user overrides for rent, vacancy, opex, and capex.
 * Stores result in ScoutUnderwriting (upsert on dealId).
 *
 * Calculation uses:
 *   - getFallbackCapRate / calculateIRR from avm.ts
 *   - getMarketCapRate / getMarketERV / calculateAnnualDebtService from scout-benchmarks.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateIRR } from "@/lib/avm";
import {
  getMarketCapRate,
  getMarketERV,
  calculateAnnualDebtService,
} from "@/lib/data/scout-benchmarks";

// ---------------------------------------------------------------------------
// POST — underwrite a deal
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await params;

  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
    include: { underwriting: true },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // ── Body parsing ────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({})) as {
    passedRentPa?:  number;
    vacancyRate?:   number;
    opexPct?:       number;
    capexEstimate?: number;
    dataSource?:    "user_entered" | "brochure" | "estimated";
  };

  const askingPrice = deal.askingPrice ?? deal.guidePrice;
  if (!askingPrice || askingPrice <= 0) {
    return NextResponse.json(
      { error: "Deal has no asking price — cannot underwrite" },
      { status: 422 }
    );
  }

  // ── Defaults ────────────────────────────────────────────────────────────
  const vacancyRate   = body.vacancyRate   ?? 0.10;
  const opexPct       = body.opexPct       ?? 0.15;
  const capexEstimate = body.capexEstimate ?? 0;

  // ── Estimate rent if not provided ───────────────────────────────────────
  const marketERV = getMarketERV(deal.assetType, deal.region ?? null);
  const estRent   = body.passedRentPa
    ?? (deal.sqft && marketERV > 0 ? deal.sqft * marketERV : null);

  if (!estRent || estRent <= 0) {
    // Insufficient data — store partial result
    const partial = await prisma.scoutUnderwriting.upsert({
      where:  { dealId },
      create: { dealId, userId: session.user.id, dataSource: "estimated" },
      update: { dataSource: "estimated", updatedAt: new Date() },
    });
    return NextResponse.json({ underwriting: partial, warning: "Insufficient rent data — provide passedRentPa or sqft" });
  }

  // ── Core metrics ────────────────────────────────────────────────────────
  const noiGross = estRent * (1 - vacancyRate);
  const noinet   = noiGross * (1 - opexPct);
  const capRate  = noinet / askingPrice;
  const marketCapRate = getMarketCapRate(deal.assetType, deal.region ?? null);
  const capRateGap    = capRate - marketCapRate;
  const yieldOnCost   = noinet / (askingPrice + capexEstimate);
  const grossYield    = estRent / askingPrice;

  // ── DSCR ────────────────────────────────────────────────────────────────
  const annualDebtService = calculateAnnualDebtService(askingPrice);
  const dscr = annualDebtService > 0 ? noinet / annualDebtService : null;

  // ── 5-Year IRR ──────────────────────────────────────────────────────────
  // Levered cash flows: NOI minus debt service + terminal value at exit cap rate
  const RENT_GROWTH = 0.025;
  const cashFlows = [-askingPrice];

  for (let y = 1; y <= 5; y++) {
    const rentY = estRent * Math.pow(1 + RENT_GROWTH, y);
    const noiY  = rentY * (1 - vacancyRate) * (1 - opexPct);
    const cf = y < 5
      ? noiY - annualDebtService
      : noiY - annualDebtService + noiY / marketCapRate; // terminal value at market cap rate
    cashFlows.push(cf);
  }

  const irr5yr = calculateIRR(cashFlows);

  // ── Determine data source ────────────────────────────────────────────────
  const dataSource = body.dataSource ??
    (body.passedRentPa ? "user_entered" : "estimated");

  // ── Upsert ScoutUnderwriting ─────────────────────────────────────────────
  const underwriting = await prisma.scoutUnderwriting.upsert({
    where: { dealId },
    create: {
      dealId,
      userId:        session.user.id,
      passedRentPa:  estRent,
      vacancyRate,
      opexPct,
      capexEstimate,
      noiGross,
      noinet,
      capRate,
      marketCapRate,
      capRateGap,
      yieldOnCost,
      grossYield,
      dscr,
      irr5yr:        isNaN(irr5yr) ? null : irr5yr,
      dataSource,
    },
    update: {
      passedRentPa:  estRent,
      vacancyRate,
      opexPct,
      capexEstimate,
      noiGross,
      noinet,
      capRate,
      marketCapRate,
      capRateGap,
      yieldOnCost,
      grossYield,
      dscr,
      irr5yr:        isNaN(irr5yr) ? null : irr5yr,
      dataSource,
      updatedAt:     new Date(),
    },
  });

  // Derive recommendation from DSCR + IRR
  const irr = isNaN(irr5yr) ? null : irr5yr;
  let recommendation: "strong_buy" | "buy" | "pass" | "needs_review";
  if (dscr !== null && dscr < 1.0) {
    recommendation = "pass";
  } else if (dscr !== null && dscr > 1.3 && irr !== null && irr > 0.15) {
    recommendation = "strong_buy";
  } else if (dscr !== null && dscr > 1.15 && irr !== null && irr > 0.10) {
    recommendation = "buy";
  } else {
    recommendation = "needs_review";
  }

  return NextResponse.json({ underwriting, recommendation });
}
