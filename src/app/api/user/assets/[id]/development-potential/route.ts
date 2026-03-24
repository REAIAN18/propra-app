/**
 * GET /api/user/assets/:id/development-potential
 *
 * Returns dev potential classification for a single asset.
 * Caches result for 30 days — re-classifies if stale or never assessed.
 *
 * Classification: rule-based (PDR / change of use / air rights) + Claude Haiku
 * narrative for detail fields. Falls back to generic text if Claude unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyDevPotential } from "@/lib/dev-potential";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.userAsset.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      assetType: true,
      location: true,
      sqft: true,
      country: true,
      siteCoveragePct: true,
      pdRights: true,
      pdRightsDetail: true,
      changeOfUsePotential: true,
      changeOfUseDetail: true,
      airRightsPotential: true,
      airRightsDetail: true,
      devPotentialAssessedAt: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return cached result if assessed within TTL
  if (
    asset.devPotentialAssessedAt &&
    Date.now() - new Date(asset.devPotentialAssessedAt).getTime() < CACHE_TTL_MS &&
    asset.pdRights !== null
  ) {
    return NextResponse.json({ asset, cached: true });
  }

  // Classify and persist
  const result = await classifyDevPotential(asset);

  const updated = await prisma.userAsset.update({
    where: { id },
    data: {
      siteCoveragePct:       result.siteCoveragePct,
      pdRights:              result.pdRights,
      pdRightsDetail:        result.pdRightsDetail,
      changeOfUsePotential:  result.changeOfUsePotential,
      changeOfUseDetail:     result.changeOfUseDetail,
      airRightsPotential:    result.airRightsPotential,
      airRightsDetail:       result.airRightsDetail,
      devPotentialAssessedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      assetType: true,
      siteCoveragePct: true,
      pdRights: true,
      pdRightsDetail: true,
      changeOfUsePotential: true,
      changeOfUseDetail: true,
      airRightsPotential: true,
      airRightsDetail: true,
      devPotentialAssessedAt: true,
    },
  });

  return NextResponse.json({ asset: updated, cached: false });
}
