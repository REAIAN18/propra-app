/**
 * POST /api/user/hold-sell-scenarios/:id/assumptions
 *
 * Updates user-adjustable DCF assumptions on a HoldSellScenario, then
 * recalculates and returns the updated scenario. The `:id` is the
 * HoldSellScenario.id or the UserAsset.id (both accepted).
 *
 * Body (all optional):
 *   { rentGrowthPct, exitYieldPct, annualCapexPct, holdPeriodYears,
 *     vacancyAllowancePct, sellingCostsPct, redeploymentYield }
 *
 * All percentage inputs are sent as whole numbers (e.g. 2.5 for 2.5%)
 * and stored as decimals (0.025).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateHoldScenario,
  calculateSellScenario,
  deriveRecommendation,
  defaultHoldInputs,
  defaultSellInputs,
} from "@/lib/hold-sell-model";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Accept either HoldSellScenario.id or UserAsset.id
  const scenario = await prisma.holdSellScenario.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ id }, { assetId: id }],
    },
    include: {
      asset: {
        select: {
          id: true, name: true, assetType: true, location: true,
          passingRent: true, grossIncome: true, netIncome: true,
          marketCapRate: true, marketRentSqft: true, sqft: true,
          avmValue: true, avmDate: true, country: true,
        },
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as {
    rentGrowthPct?: number;
    exitYieldPct?: number;
    annualCapexPct?: number;
    holdPeriodYears?: number;
    vacancyAllowancePct?: number;
    sellingCostsPct?: number;
    redeploymentYield?: number;
  };

  const asset = scenario.asset;
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
  const avmFresh = asset.avmValue && asset.avmDate &&
    Date.now() - new Date(asset.avmDate).getTime() < SEVEN_DAYS;

  const currentValue =
    (avmFresh ? asset.avmValue : null) ??
    scenario.estimatedSalePrice ??
    (asset.netIncome && asset.marketCapRate
      ? asset.netIncome / asset.marketCapRate
      : null);

  const passingRent = asset.passingRent ?? asset.grossIncome ?? null;
  const marketERV = asset.marketRentSqft && asset.sqft
    ? asset.marketRentSqft * asset.sqft
    : passingRent;

  if (!currentValue || !passingRent) {
    return NextResponse.json({ error: "Insufficient asset data for DCF" }, { status: 422 });
  }

  // Merge incoming assumptions over stored scenario assumptions
  const holdInputs = defaultHoldInputs(
    currentValue,
    passingRent,
    marketERV ?? passingRent,
    asset.assetType,
    asset.country
  );

  // Apply stored assumptions first
  if (scenario.holdPeriodYears) holdInputs.holdPeriodYears = scenario.holdPeriodYears;
  if (scenario.rentGrowthPct)   holdInputs.rentGrowthPct   = scenario.rentGrowthPct;
  if (scenario.exitYield)       holdInputs.exitYield        = scenario.exitYield;
  if (scenario.vacancyAllowance) holdInputs.vacancyAllowance = scenario.vacancyAllowance;
  if (scenario.capexSchedule)   holdInputs.capexAnnual      = currentValue * scenario.capexSchedule;

  // Override with incoming body assumptions
  if (body.rentGrowthPct      !== undefined) holdInputs.rentGrowthPct      = body.rentGrowthPct / 100;
  if (body.exitYieldPct       !== undefined) holdInputs.exitYield           = body.exitYieldPct / 100;
  if (body.annualCapexPct     !== undefined) holdInputs.capexAnnual         = currentValue * (body.annualCapexPct / 100);
  if (body.holdPeriodYears    !== undefined) holdInputs.holdPeriodYears     = body.holdPeriodYears;
  if (body.vacancyAllowancePct !== undefined) holdInputs.vacancyAllowance   = body.vacancyAllowancePct / 100;

  const sellInputs = defaultSellInputs(currentValue, holdInputs.holdPeriodYears);
  if (scenario.sellingCostsPct)   sellInputs.sellingCostsPct   = scenario.sellingCostsPct;
  if (scenario.redeploymentYield) sellInputs.redeploymentYield = scenario.redeploymentYield;
  if (scenario.estimatedSalePrice) sellInputs.estimatedSalePrice = scenario.estimatedSalePrice;
  if (body.sellingCostsPct    !== undefined) sellInputs.sellingCostsPct   = body.sellingCostsPct / 100;
  if (body.redeploymentYield  !== undefined) sellInputs.redeploymentYield = body.redeploymentYield / 100;

  const holdResult = calculateHoldScenario(holdInputs);
  const sellResult = calculateSellScenario(sellInputs);
  const { recommendation, rationale, confidenceScore } = deriveRecommendation(
    holdResult,
    sellResult,
    { marketCapRate: asset.marketCapRate, passingRent, netIncome: asset.netIncome }
  );

  // Persist updated assumptions + recalculated outputs
  const updated = await prisma.holdSellScenario.update({
    where: { id: scenario.id },
    data: {
      // Store assumptions as decimals
      rentGrowthPct:    body.rentGrowthPct      !== undefined ? body.rentGrowthPct / 100 : scenario.rentGrowthPct,
      exitYield:        body.exitYieldPct        !== undefined ? body.exitYieldPct / 100 : scenario.exitYield,
      capexSchedule:    body.annualCapexPct      !== undefined ? body.annualCapexPct / 100 : scenario.capexSchedule,
      holdPeriodYears:  body.holdPeriodYears     !== undefined ? body.holdPeriodYears : scenario.holdPeriodYears,
      vacancyAllowance: body.vacancyAllowancePct !== undefined ? body.vacancyAllowancePct / 100 : scenario.vacancyAllowance,
      sellingCostsPct:  body.sellingCostsPct     !== undefined ? body.sellingCostsPct / 100 : scenario.sellingCostsPct,
      redeploymentYield: body.redeploymentYield  !== undefined ? body.redeploymentYield / 100 : scenario.redeploymentYield,
      // Recalculated outputs
      holdNPV:          holdResult.npv,
      holdIRR:          holdResult.irr,
      holdEquityMultiple: holdResult.equityMultiple,
      holdCashYield:    holdResult.cashYield,
      sellNetProceeds:  sellResult.netProceeds,
      sellRedeployedNPV: sellResult.redeployedNPV,
      sellIRR:          sellResult.irr,
      sellEquityMultiple: sellResult.equityMultiple,
      recommendation,
      rationale,
      confidenceScore,
      lastCalculatedAt: new Date(),
    },
  });

  return NextResponse.json({
    scenarioId:         updated.id,
    assetId:            updated.assetId,
    holdIRR:            isNaN(holdResult.irr)  ? null : holdResult.irr * 100,
    sellIRR:            isNaN(sellResult.irr)  ? null : sellResult.irr * 100,
    holdNPV:            holdResult.npv,
    sellNPV:            sellResult.redeployedNPV,
    holdEquityMultiple: holdResult.equityMultiple,
    sellEquityMultiple: sellResult.equityMultiple,
    recommendation,
    rationale,
    confidenceScore,
    assumptions: {
      rentGrowthPct:     holdInputs.rentGrowthPct * 100,
      exitYieldPct:      holdInputs.exitYield * 100,
      holdPeriodYears:   holdInputs.holdPeriodYears,
      vacancyAllowancePct: holdInputs.vacancyAllowance * 100,
    },
  });
}
