import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  scoreInsuranceRisk,
  buildPremiumReductionRoadmap,
  computeCompositeRiskScore,
} from "@/lib/insurance-risk";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await params;

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      assetType: true,
      country: true,
      epcRating: true,
      floodRisk: true,
      floodZone: true,
      insurancePremium: true,
      marketInsurance: true,
      sqft: true,
      insuranceRiskScore: true,
      insuranceRiskFactors: true,
      insuranceRoadmap: true,
      insuranceRiskAssessedAt: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return cached if assessed within 30 days
  if (
    asset.insuranceRiskAssessedAt &&
    Date.now() - new Date(asset.insuranceRiskAssessedAt).getTime() < CACHE_TTL_MS &&
    asset.insuranceRiskFactors
  ) {
    return NextResponse.json({ asset, cached: true });
  }

  const factors = scoreInsuranceRisk(asset);
  const roadmap = buildPremiumReductionRoadmap(asset, factors);
  const compositeScore = computeCompositeRiskScore(factors);

  const updated = await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      insuranceRiskScore: compositeScore,
      insuranceRiskFactors: factors as object[],
      insuranceRoadmap: roadmap as object[],
      insuranceRiskAssessedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      insuranceRiskScore: true,
      insuranceRiskFactors: true,
      insuranceRoadmap: true,
      insuranceRiskAssessedAt: true,
    },
  });

  return NextResponse.json({ asset: updated, cached: false });
}
