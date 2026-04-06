/**
 * GET /api/scout/deals/:dealId/underwrite
 * Returns full 10-year DCF analysis with adjustable assumptions + sensitivity matrix.
 *
 * POST /api/scout/deals/:dealId/underwrite
 * Calculates or recalculates underwriting metrics for a Scout deal.
 *
 * Calculation uses:
 *   - getFallbackCapRate / calculateIRR from avm.ts
 *   - getMarketCapRate / getMarketERV / calculateAnnualDebtService from scout-benchmarks.ts
 *   - calculateHoldScenario from hold-sell-model.ts (GET only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateIRR, getFallbackCapRate } from "@/lib/avm";
import {
  getMarketCapRate,
  getMarketERV,
  calculateAnnualDebtService,
} from "@/lib/data/scout-benchmarks";
import { calculateHoldScenario, type HoldInputs } from "@/lib/hold-sell-model";

// ---------------------------------------------------------------------------
// Helper — compute IRR for a given cap rate and rent growth assumption
// ---------------------------------------------------------------------------

function computeSensitivityIRR(
  equityNeeded: number,
  passingRent: number,
  vacancy: number,
  opexPct: number,
  capexAnnual: number,
  capRate: number,
  rentGrowth: number,
  holdPeriodYears: number
): number {
  const inputs: HoldInputs = {
    currentValue: equityNeeded,
    passingRent,
    marketERV: passingRent * 1.05,
    vacancyAllowance: vacancy,
    opexPct,
    rentGrowthPct: rentGrowth,
    capexAnnual,
    exitYield: capRate,
    holdPeriodYears,
    discountRate: 0.08,
  };
  try {
    const result = calculateHoldScenario(inputs);
    const irr = result.irr * 100;
    return isFinite(irr) ? irr : 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// GET — full 10-year DCF analysis
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await params;
  const { searchParams } = new URL(req.url);

  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const askingPrice = deal.askingPrice ?? deal.guidePrice;
  if (!askingPrice || askingPrice <= 0) {
    return NextResponse.json(
      { error: "Deal has no asking price — cannot underwrite" },
      { status: 422 }
    );
  }

  // Parse assumptions from query params or use defaults
  const purchasePrice = parseFloat(searchParams.get("purchasePrice") || String(askingPrice));
  const marketERV = getMarketERV(deal.assetType, deal.region ?? null);
  const passingRent = parseFloat(searchParams.get("passingRent") || String(deal.sqft && marketERV > 0 ? deal.sqft * marketERV : askingPrice * 0.07));
  const rentGrowthPct = parseFloat(searchParams.get("rentGrowthPct") || "2.5") / 100;
  const exitCapRate = parseFloat(searchParams.get("exitCapRate") || String(getFallbackCapRate(deal.region ?? null, deal.assetType) * 100)) / 100;
  const vacancy = parseFloat(searchParams.get("vacancy") || "5") / 100;
  const opexPct = parseFloat(searchParams.get("opexPct") || "15") / 100;
  const capexAnnual = parseFloat(searchParams.get("capexAnnual") || String(purchasePrice * 0.005));
  const ltv = parseFloat(searchParams.get("ltv") || "65") / 100;
  const holdPeriodYears = parseInt(searchParams.get("holdPeriodYears") || "10", 10);

  // Calculate equity needed and debt
  const equityNeeded = purchasePrice * (1 - ltv);
  const debtAmount = purchasePrice * ltv;

  // Build hold scenario inputs for leveraged returns
  const holdInputs: HoldInputs = {
    currentValue: equityNeeded,
    passingRent,
    marketERV: passingRent * 1.05,
    vacancyAllowance: vacancy,
    opexPct,
    rentGrowthPct,
    capexAnnual,
    exitYield: exitCapRate,
    holdPeriodYears,
    discountRate: 0.08,
  };

  const holdResult = calculateHoldScenario(holdInputs);

  // Calculate annual debt service (5% interest, 25-year amortization)
  const interestRate = 0.05;
  const loanTermYears = 25;
  const monthlyRate = interestRate / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = debtAmount > 0
    ? (debtAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;
  const annualDebtService = monthlyPayment * 12;

  // Build detailed year-by-year cash flows
  const cashFlowDetails = [];

  // Year 0: Initial equity investment
  cashFlowDetails.push({
    year: 0,
    grossRent: 0,
    vacancy: 0,
    opex: 0,
    noi: 0,
    debtService: 0,
    cashFlow: -equityNeeded,
  });

  // Years 1 to N
  for (let y = 1; y <= holdPeriodYears; y++) {
    const rentY = Math.max(passingRent, holdInputs.marketERV * 0.95) * Math.pow(1 + rentGrowthPct, y - 1);
    const vacancyY = rentY * vacancy;
    const effectiveRent = rentY - vacancyY;
    const opexY = effectiveRent * opexPct;
    const noiY = effectiveRent - opexY;

    let cashFlowY = noiY - annualDebtService - capexAnnual;

    // Terminal year: add exit value minus remaining loan balance
    if (y === holdPeriodYears) {
      const finalNOI = rentY * (1 - vacancy) * (1 - opexPct);
      const terminalValue = finalNOI / exitCapRate;
      const remainingBalance = debtAmount * 0.7; // Simplified — approximate after 10 years
      cashFlowY += terminalValue - remainingBalance;
    }

    cashFlowDetails.push({
      year: y,
      grossRent: rentY,
      vacancy: vacancyY,
      opex: opexY,
      noi: noiY,
      debtService: annualDebtService,
      cashFlow: cashFlowY,
    });
  }

  // ── Sensitivity matrix (cap rate × rent growth) ────────────────────────
  // 3 cap rate scenarios: low (−1%), mid (current), high (+1%)
  // 3 growth scenarios: low (1%), mid (current), high (4%)
  const capRateLow  = Math.max(exitCapRate - 0.01, 0.02);
  const capRateMid  = exitCapRate;
  const capRateHigh = exitCapRate + 0.01;
  const growthLow   = 0.01;
  const growthMid   = rentGrowthPct;
  const growthHigh  = 0.04;

  const capRates = [capRateLow, capRateMid, capRateHigh];
  const growthRates = [growthLow, growthMid, growthHigh];

  const sensitivityMatrix = capRates.map((cr) =>
    growthRates.map((gr) =>
      computeSensitivityIRR(
        equityNeeded,
        passingRent,
        vacancy,
        opexPct,
        capexAnnual,
        cr,
        gr,
        holdPeriodYears
      )
    )
  );

  // ── Save computed results to DealFinanceModel ──────────────────────────
  const leveragedIRR = holdResult.irr * 100;
  const equityMultiple = holdResult.equityMultiple;
  const cashOnCash = holdResult.cashYield;

  prisma.dealFinanceModel.upsert({
    where: { dealId },
    create: {
      dealId,
      userId: session.user.id,
      loanAmount: debtAmount,
      loanRate: interestRate * 100,
      loanTerm: loanTermYears,
      ltvPct: ltv * 100,
      equityRequired: equityNeeded,
      totalCapital: purchasePrice,
      leveragedIRR: isFinite(leveragedIRR) ? leveragedIRR : null,
      cashOnCash: isFinite(cashOnCash) ? cashOnCash : null,
      equityMultiple: isFinite(equityMultiple) ? equityMultiple : null,
    },
    update: {
      loanAmount: debtAmount,
      loanRate: interestRate * 100,
      loanTerm: loanTermYears,
      ltvPct: ltv * 100,
      equityRequired: equityNeeded,
      totalCapital: purchasePrice,
      leveragedIRR: isFinite(leveragedIRR) ? leveragedIRR : null,
      cashOnCash: isFinite(cashOnCash) ? cashOnCash : null,
      equityMultiple: isFinite(equityMultiple) ? equityMultiple : null,
      updatedAt: new Date(),
    },
  }).catch(() => {
    // Non-blocking — don't fail the request if caching fails
  });

  return NextResponse.json({
    deal: {
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      askingPrice,
      currency: deal.currency,
    },
    assumptions: {
      purchasePrice,
      passingRent,
      rentGrowthPct: rentGrowthPct * 100,
      exitCapRate: exitCapRate * 100,
      vacancy: vacancy * 100,
      opexPct: opexPct * 100,
      capexAnnual,
      ltv: ltv * 100,
      holdPeriodYears,
    },
    returns: {
      leveragedIRR,
      equityMultiple,
      cashOnCash,
      npv: holdResult.npv,
    },
    financing: {
      purchasePrice,
      debtAmount,
      equityNeeded,
      ltv: ltv * 100,
      interestRate: interestRate * 100,
      annualDebtService,
    },
    cashFlows: cashFlowDetails,
    sensitivity: {
      capRates: [
        { label: "Low", value: capRateLow * 100 },
        { label: "Mid", value: capRateMid * 100 },
        { label: "High", value: capRateHigh * 100 },
      ],
      growthRates: [
        { label: "1%", value: growthLow * 100 },
        { label: `${(growthMid * 100).toFixed(1)}%`, value: growthMid * 100 },
        { label: "4%", value: growthHigh * 100 },
      ],
      // matrix[capRateIdx][growthIdx] = IRR %
      matrix: sensitivityMatrix,
      currentCapRateIdx: 1,
      currentGrowthIdx: 1,
    },
  });
}

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
  const RENT_GROWTH = 0.025;
  const cashFlows = [-askingPrice];

  for (let y = 1; y <= 5; y++) {
    const rentY = estRent * Math.pow(1 + RENT_GROWTH, y);
    const noiY  = rentY * (1 - vacancyRate) * (1 - opexPct);
    const cf = y < 5
      ? noiY - annualDebtService
      : noiY - annualDebtService + noiY / marketCapRate;
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
