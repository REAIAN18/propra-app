import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreInsuranceRisk, buildPremiumReductionRoadmap, computeCompositeRiskScore } from "@/lib/insurance-risk";
import type { InsuranceRiskFactor, InsuranceRoadmapAction } from "@/types/insurance";

export async function GET() {
  let session = null;
  try { session = await auth(); } catch {}

  if (!session?.user?.id) {
    return NextResponse.json({ riskFactors: [], premiumReductionActions: [], compositeScore: 0, coverageGaps: [] });
  }

  // Fetch user assets with relevant fields for risk scoring
  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      location: true,
      epcRating: true,
      floodRisk: true,
      floodZone: true,
      assetType: true,
      country: true,
      insurancePremium: true,
      marketInsurance: true,
      sqft: true,
    },
  });

  if (!assets.length) {
    return NextResponse.json({
      riskFactors: [],
      premiumReductionActions: [],
      compositeScore: 0,
      coverageGaps: [],
    });
  }

  // Aggregate risk factors and premium reduction actions across all assets
  const allRiskFactors: InsuranceRiskFactor[] = [];
  const allPremiumActions: InsuranceRoadmapAction[] = [];
  const coverageGaps: Array<{
    id: string;
    severity: "red" | "amber" | "green";
    icon: string;
    title: string;
    detail: string;
    action: string;
  }> = [];

  for (const asset of assets) {
    const riskFactors = scoreInsuranceRisk(asset);
    allRiskFactors.push(...riskFactors);

    const premiumActions = buildPremiumReductionRoadmap(asset, riskFactors);
    allPremiumActions.push(...premiumActions);

    // Identify coverage gaps from risk factors
    for (const factor of riskFactors) {
      if (factor.status === "red" || factor.status === "amber") {
        coverageGaps.push({
          id: `${asset.id}-${factor.factor}`,
          severity: factor.status,
          icon: factor.status === "red" ? "⚠" : "⚠",
          title: `${asset.name}: ${factor.factor}`,
          detail: factor.impact,
          action: "Review and address →",
        });
      }
    }
  }

  // Check for uninsured assets (no insurance premium data)
  const uninsuredAssets = assets.filter(
    (a) => !a.insurancePremium || a.insurancePremium === 0
  );
  for (const asset of uninsuredAssets) {
    coverageGaps.push({
      id: `uninsured-${asset.id}`,
      severity: "red",
      icon: "⚠",
      title: `${asset.name} has no insurance on record`,
      detail: `${asset.sqft ? `${asset.sqft.toLocaleString()} sqft ${asset.assetType}` : "Property"} with no policy uploaded. If uninsured, this is a significant exposure. Lenders require proof of cover.`,
      action: "Upload policy schedule →",
    });
  }

  // Compute composite risk score from all factors
  const compositeScore = computeCompositeRiskScore(allRiskFactors);

  // Deduplicate premium reduction actions by ID (keep highest saving)
  const actionMap = new Map<string, InsuranceRoadmapAction>();
  for (const action of allPremiumActions) {
    const existing = actionMap.get(action.id);
    if (!existing || action.annualSaving > existing.annualSaving) {
      actionMap.set(action.id, action);
    }
  }
  const deduplicatedActions = Array.from(actionMap.values()).sort(
    (a, b) => b.annualSaving - a.annualSaving
  );

  return NextResponse.json({
    riskFactors: allRiskFactors,
    premiumReductionActions: deduplicatedActions,
    compositeScore,
    coverageGaps,
  });
}
