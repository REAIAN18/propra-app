/**
 * GET /api/user/hold-sell-scenarios
 * Wave 2 upgrade: proper 10-year DCF model replacing the Wave 1 simplified
 * netYield + 2.5% approximation.
 *
 * Uses cached HoldSellScenario record if < 7 days old.
 * Recalculates and upserts when stale or missing.
 *
 * Response shape is backward-compatible with Wave 1 (adds Wave 2 fields).
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateHoldScenario,
  calculateSellScenario,
  deriveRecommendation,
  defaultHoldInputs,
  defaultSellInputs,
} from "@/lib/hold-sell-model";

const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    include: {
      holdSellScenario: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const scenarios = await Promise.all(
    assets.map(async (asset) => {
      const assetType = asset.assetType ?? "mixed";
      const location  = asset.location ?? asset.address ?? "";

      // ── Determine current market value ──────────────────────────────────
      // Priority: AVM value (fresh) → stored scenario estimatedSalePrice → inline calc
      const avmFresh =
        asset.avmValue &&
        asset.avmDate &&
        Date.now() - asset.avmDate.getTime() < SEVEN_DAYS;

      const currentValue =
        (avmFresh && asset.avmValue)
        ?? asset.holdSellScenario?.estimatedSalePrice
        ?? (asset.netIncome && asset.marketCapRate
            ? asset.netIncome / asset.marketCapRate
            : null);

      const passingRent = asset.passingRent ?? asset.grossIncome ?? null;
      const marketERV   =
        asset.marketRentSqft && asset.sqft
          ? asset.marketRentSqft * asset.sqft
          : passingRent;

      // ── Insufficient data ────────────────────────────────────────────────
      if (!currentValue || !passingRent) {
        return {
          assetId:       asset.id,
          assetName:     asset.name,
          assetType,
          location,
          dataNeeded:    true,
          holdIRR:       null,
          sellPrice:     null,
          sellIRR:       null,
          recommendation: null,
          rationale:     null,
          estimatedValue: currentValue,
          holdNPV:       null,
          sellNPV:       null,
          holdEquityMultiple: null,
          sellEquityMultiple: null,
          confidenceScore:    null,
          lastCalculatedAt:   null,
        };
      }

      // ── Check cache ──────────────────────────────────────────────────────
      const scenario = asset.holdSellScenario;
      const isFresh  = scenario?.lastCalculatedAt &&
        (Date.now() - scenario.lastCalculatedAt.getTime() < SEVEN_DAYS);

      if (isFresh && scenario) {
        return {
          assetId:           asset.id,
          assetName:         asset.name,
          assetType,
          location,
          dataNeeded:        false,
          holdIRR:           scenario.holdIRR ? scenario.holdIRR * 100 : null,
          sellPrice:         scenario.estimatedSalePrice,
          sellIRR:           scenario.sellIRR ? scenario.sellIRR * 100 : null,
          recommendation:    scenario.recommendation,
          rationale:         scenario.rationale,
          estimatedValue:    currentValue,
          holdNPV:           scenario.holdNPV,
          sellNPV:           scenario.sellRedeployedNPV,
          holdEquityMultiple: scenario.holdEquityMultiple,
          sellEquityMultiple: scenario.sellEquityMultiple,
          confidenceScore:    scenario.confidenceScore,
          lastCalculatedAt:   scenario.lastCalculatedAt?.toISOString() ?? null,
        };
      }

      // ── Recalculate ──────────────────────────────────────────────────────
      const holdInputs = defaultHoldInputs(
        currentValue,
        passingRent,
        marketERV ?? passingRent,
        asset.assetType,
        asset.country
      );

      // Apply stored user assumptions (if any)
      if (scenario) {
        if (scenario.holdPeriodYears) holdInputs.holdPeriodYears = scenario.holdPeriodYears;
        if (scenario.rentGrowthPct)   holdInputs.rentGrowthPct   = scenario.rentGrowthPct;
        if (scenario.exitYield)       holdInputs.exitYield        = scenario.exitYield;
        if (scenario.vacancyAllowance) holdInputs.vacancyAllowance = scenario.vacancyAllowance;
        if (scenario.capexSchedule)   holdInputs.capexAnnual = currentValue * scenario.capexSchedule;
      }

      const sellInputs = defaultSellInputs(currentValue, holdInputs.holdPeriodYears);
      if (scenario?.sellingCostsPct)    sellInputs.sellingCostsPct    = scenario.sellingCostsPct;
      if (scenario?.redeploymentYield)  sellInputs.redeploymentYield  = scenario.redeploymentYield;
      if (scenario?.estimatedSalePrice) sellInputs.estimatedSalePrice = scenario.estimatedSalePrice;

      const holdResult = calculateHoldScenario(holdInputs);
      const sellResult = calculateSellScenario(sellInputs);
      const { recommendation, rationale, confidenceScore } = deriveRecommendation(
        holdResult,
        sellResult,
        { marketCapRate: asset.marketCapRate, passingRent, netIncome: asset.netIncome }
      );

      // ── Upsert HoldSellScenario ──────────────────────────────────────────
      try {
        await prisma.holdSellScenario.upsert({
          where:  { assetId: asset.id },
          create: {
            userId:              session.user.id,
            assetId:             asset.id,
            holdNPV:             holdResult.npv,
            holdIRR:             holdResult.irr,
            holdEquityMultiple:  holdResult.equityMultiple,
            holdCashYield:       holdResult.cashYield,
            estimatedSalePrice:  sellInputs.estimatedSalePrice,
            sellNetProceeds:     sellResult.netProceeds,
            sellRedeployedNPV:   sellResult.redeployedNPV,
            sellIRR:             sellResult.irr,
            sellEquityMultiple:  sellResult.equityMultiple,
            recommendation,
            rationale,
            confidenceScore,
            lastCalculatedAt:    new Date(),
            dataSource:          avmFresh ? "avm" : "estimated",
          },
          update: {
            holdNPV:             holdResult.npv,
            holdIRR:             holdResult.irr,
            holdEquityMultiple:  holdResult.equityMultiple,
            holdCashYield:       holdResult.cashYield,
            estimatedSalePrice:  sellInputs.estimatedSalePrice,
            sellNetProceeds:     sellResult.netProceeds,
            sellRedeployedNPV:   sellResult.redeployedNPV,
            sellIRR:             sellResult.irr,
            sellEquityMultiple:  sellResult.equityMultiple,
            recommendation,
            rationale,
            confidenceScore,
            lastCalculatedAt:    new Date(),
          },
        });
      } catch {
        // HoldSellScenario model may not exist pre-migration — non-fatal
      }

      return {
        assetId:            asset.id,
        assetName:          asset.name,
        assetType,
        location,
        dataNeeded:         false,
        holdIRR:            isNaN(holdResult.irr) ? null : holdResult.irr * 100,
        sellPrice:          sellInputs.estimatedSalePrice,
        sellIRR:            isNaN(sellResult.irr) ? null : sellResult.irr * 100,
        recommendation,
        rationale,
        estimatedValue:     currentValue,
        holdNPV:            holdResult.npv,
        sellNPV:            sellResult.redeployedNPV,
        holdEquityMultiple: holdResult.equityMultiple,
        sellEquityMultiple: sellResult.equityMultiple,
        confidenceScore,
        lastCalculatedAt:   new Date().toISOString(),
      };
    })
  );

  return NextResponse.json({ scenarios });
}
