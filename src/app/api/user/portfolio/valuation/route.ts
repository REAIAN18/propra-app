/**
 * GET /api/user/portfolio/valuation
 * Returns aggregate AVM across all user assets.
 * Calls per-asset valuation for each asset in parallel.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all user assets
  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (assets.length === 0) {
    return NextResponse.json({
      totalValue: 0,
      totalDebt: 0,
      equity: 0,
      avgYield: 0,
      assetCount: 0,
      asOf: new Date().toISOString(),
    });
  }

  // Fetch valuation for each asset (using cached values when available)
  const baseUrl = req.nextUrl.origin;
  const valuationPromises = assets.map(async (asset) => {
    try {
      const response = await fetch(
        `${baseUrl}/api/user/assets/${asset.id}/valuation`,
        {
          headers: {
            cookie: req.headers.get("cookie") || "",
          },
        }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch valuation for asset ${asset.id}:`, error);
      return null;
    }
  });

  const valuations = (await Promise.all(valuationPromises)).filter(
    (v) => v !== null
  );

  // Aggregate metrics
  const totalValue = valuations.reduce(
    (sum, v) => sum + (v.avmValue || 0),
    0
  );

  // Calculate total debt (if loan data exists)
  const _loans = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  // For now, totalDebt is 0 (loans are tracked separately in Wave 2)
  const totalDebt = 0;
  const equity = totalValue - totalDebt;

  // Calculate average yield (NOI / Value)
  const assetsWithIncome = await prisma.userAsset.findMany({
    where: {
      userId: session.user.id,
      netIncome: { not: null },
      avmValue: { not: null },
    },
    select: { netIncome: true, avmValue: true },
  });

  let avgYield = 0;
  if (assetsWithIncome.length > 0) {
    const totalNOI = assetsWithIncome.reduce(
      (sum, a) => sum + (a.netIncome || 0),
      0
    );
    const totalVal = assetsWithIncome.reduce(
      (sum, a) => sum + (a.avmValue || 0),
      0
    );
    avgYield = totalVal > 0 ? totalNOI / totalVal : 0;
  }

  return NextResponse.json({
    totalValue,
    totalDebt,
    equity,
    avgYield,
    assetCount: assets.length,
    asOf: new Date().toISOString(),
  });
}
