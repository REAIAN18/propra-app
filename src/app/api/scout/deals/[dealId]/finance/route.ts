/**
 * GET /api/scout/deals/:dealId/finance
 * Returns deal finance analysis: capital stack, indicative debt terms,
 * active lenders, and equity requirement scenarios.
 *
 * Used by: /scout/[dealId]/finance page
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// LENDER DATABASE (simplified static for now - future: integrate with live APIs)
// ---------------------------------------------------------------------------

interface Lender {
  name: string;
  description: string;
  minRate: number; // bps over SOFR
  maxRate: number;
  typicalLTV: number;
  active: boolean;
}

const LENDERS: Record<string, Lender[]> = {
  "US": [
    { name: "Chase Commercial Real Estate", description: "Active in US industrial · Competitive on sub-$3M", minRate: 175, maxRate: 225, typicalLTV: 0.65, active: true },
    { name: "Wells Fargo CRE", description: "Strong in US · Longer terms available", minRate: 200, maxRate: 250, typicalLTV: 0.60, active: true },
    { name: "Centennial Bank", description: "Regional lender · Fast execution", minRate: 225, maxRate: 275, typicalLTV: 0.70, active: true },
    { name: "Ready Capital (CDFI)", description: "SBA 504 eligible · Lower down payment", minRate: 0, maxRate: 0, typicalLTV: 0.80, active: true }, // Fixed rate
  ],
  "UK": [
    { name: "Barclays Commercial", description: "UK national lender · Strong on commercial", minRate: 200, maxRate: 275, typicalLTV: 0.65, active: true },
    { name: "NatWest Business", description: "Competitive rates · Fast decisioning", minRate: 225, maxRate: 300, typicalLTV: 0.70, active: true },
    { name: "Shawbrook Bank", description: "Specialist lender · Flexible terms", minRate: 250, maxRate: 350, typicalLTV: 0.75, active: true },
  ],
};

function getActiveLenders(currency: string | null): Lender[] {
  // Determine country from currency and region
  const countryCode = currency === "GBP" ? "UK" : "US";
  return LENDERS[countryCode] || LENDERS["US"];
}

// ---------------------------------------------------------------------------
// GET — finance analysis
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

  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
    include: { underwriting: true },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const askingPrice = deal.askingPrice ?? deal.guidePrice;
  if (!askingPrice || askingPrice <= 0) {
    return NextResponse.json(
      { error: "Deal has no asking price — cannot calculate finance" },
      { status: 422 }
    );
  }

  // Get latest SOFR rate (or fallback)
  const latestSOFR = await prisma.macroRate.findFirst({
    where: { series: "SOFR" },
    orderBy: { date: "desc" },
  });
  const sofrRate = latestSOFR ? latestSOFR.value / 100 : 0.0532; // Fallback: 5.32%

  // Default LTV and assumptions
  const ltv = 0.65; // 65% LTV default
  const debtAmount = askingPrice * ltv;
  const equityNeeded = askingPrice * (1 - ltv);

  // Indicative debt terms
  const spreadBps = 200; // 200 bps over SOFR
  const allInRate = sofrRate + spreadBps / 10000;
  const termYears = 5;
  const interestOnlyYears = 2;
  const loanTermYears = 25; // Amortization schedule

  // Calculate annual debt service (interest-only for first 2 years, then amortizing)
  const monthlyRate = allInRate / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPaymentAmortizing = debtAmount > 0
    ? (debtAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;
  const annualDebtServiceAmortizing = monthlyPaymentAmortizing * 12;
  const annualDebtServiceInterestOnly = debtAmount * allInRate;

  // Average annual debt service (blended)
  const annualDebtService =
    (annualDebtServiceInterestOnly * interestOnlyYears +
     annualDebtServiceAmortizing * (termYears - interestOnlyYears)) / termYears;

  // DSCR calculation (requires NOI from underwriting)
  const noi = deal.underwriting?.noinet ?? askingPrice * 0.07 * 0.85; // Fallback: 7% gross yield, 85% after opex
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const cashAfterDebt = noi - annualDebtService;

  // Capital stack scenarios
  const capitalStack = {
    debt: {
      amount: debtAmount,
      percentage: ltv,
      label: "Senior Debt",
    },
    equity: {
      amount: equityNeeded,
      percentage: 1 - ltv,
      label: "Equity",
    },
    total: askingPrice,
  };

  // Indicative debt terms
  const debtTerms = {
    loanAmount: debtAmount,
    ltv: ltv * 100,
    sofrRate: sofrRate * 100,
    spreadBps,
    allInRate: allInRate * 100,
    termYears,
    structure: `${interestOnlyYears} year interest-only, then amortising`,
    annualDebtService,
    dscr,
    dscr_status: dscr >= 1.25 ? "good" : dscr >= 1.15 ? "acceptable" : "weak",
    cashAfterDebt,
  };

  // Active lenders for this deal type
  const lenders = getActiveLenders(deal.currency).map(lender => ({
    name: lender.name,
    description: lender.description,
    rateRange: lender.minRate > 0
      ? `SOFR+${lender.minRate}–${lender.maxRate}`
      : "Fixed 6.5–7%",
    ltv: `${(lender.typicalLTV * 100).toFixed(0)}% LTV`,
  }));

  // Equity scenarios (100% own, 50/50 JV, 80/20 LP/GP)
  // For now, use simplified IRR calculations based on underwriting
  const baseIRR = deal.underwriting?.irr5yr ?? 0.12; // Fallback 12%

  const equityScenarios = [
    {
      structure: "100% Own Equity",
      equityRequired: equityNeeded,
      irr: baseIRR * 100,
      description: `${(baseIRR * 100).toFixed(1)}% IRR to you`,
      color: "green",
    },
    {
      structure: "50/50 JV",
      equityRequired: equityNeeded / 2,
      irr: (baseIRR * 0.80) * 100, // After promote
      description: `${(baseIRR * 0.80 * 100).toFixed(1)}% IRR (after promote)`,
      color: "accent",
    },
    {
      structure: "80/20 LP/GP",
      equityRequired: equityNeeded * 0.20,
      irr: (baseIRR * 1.50) * 100, // GP IRR with promote
      description: `${(baseIRR * 1.50 * 100).toFixed(1)}% GP IRR (with promote)`,
      color: "green",
    },
  ];

  return NextResponse.json({
    deal: {
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      askingPrice,
      currency: deal.currency,
      region: deal.region,
    },
    capitalStack,
    debtTerms,
    lenders,
    equityScenarios,
  });
}
