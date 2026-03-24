/**
 * GET /api/user/assets/:id/valuation/history
 * Returns historical AVM valuations for a single asset.
 * Used for sparkline charts and valuation trend analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  // Verify asset ownership
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Fetch all valuations for this asset, ordered by date
  const valuations = await prisma.assetValuation.findMany({
    where: { assetId },
    orderBy: { valuedAt: "asc" },
    select: {
      id: true,
      avmValue: true,
      avmLow: true,
      avmHigh: true,
      confidenceScore: true,
      method: true,
      valuedAt: true,
      incomeCapValue: true,
      sqftValue: true,
      capRateUsed: true,
      compsUsed: true,
    },
  });

  return NextResponse.json({
    assetId,
    history: valuations.map((v) => ({
      date: v.valuedAt.toISOString().split("T")[0],
      value: v.avmValue,
      low: v.avmLow,
      high: v.avmHigh,
      confidence: v.confidenceScore,
      method: v.method,
      incomeCapValue: v.incomeCapValue,
      psfValue: v.sqftValue,
      capRate: v.capRateUsed,
      compsCount: v.compsUsed,
    })),
    count: valuations.length,
  });
}
