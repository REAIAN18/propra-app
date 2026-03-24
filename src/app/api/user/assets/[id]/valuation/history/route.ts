/**
 * GET /api/user/assets/:id/valuation/history
 * Returns the full time-series of AVM valuations for a single asset.
 *
 * Powers the "Valuation History" chart on the Asset Detail page.
 * Returns up to 24 records ordered chronologically (oldest first).
 *
 * Response shape:
 * {
 *   assetId: string,
 *   assetName: string,
 *   history: Array<{
 *     valuedAt: string (ISO),
 *     value: number,
 *     valueLow: number | null,
 *     valueHigh: number | null,
 *     confidenceScore: number | null,
 *     method: string | null,
 *     changePct: number | null,
 *   }>
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  // Verify the asset belongs to this user
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch valuation history — newest first, cap at 24 records
  // Pre-migration: AssetValuation model may not exist — return empty history
  const valuations = await (prisma as unknown as {
    assetValuation: {
      findMany: (q: object) => Promise<Array<{
        valuedAt: Date;
        value: number;
        valueLow: number | null;
        valueHigh: number | null;
        confidenceScore: number | null;
        method: string | null;
        changePct: number | null;
      }>>;
    }
  }).assetValuation.findMany({
    where: { assetId, userId: session.user.id },
    orderBy: { valuedAt: "desc" },
    take: 24,
    select: {
      valuedAt: true,
      value: true,
      valueLow: true,
      valueHigh: true,
      confidenceScore: true,
      method: true,
      changePct: true,
    },
  }).catch(() => []);

  // Reverse to chronological order for charting
  const history = valuations.reverse().map(v => ({
    valuedAt:        v.valuedAt.toISOString(),
    value:           v.value,
    valueLow:        v.valueLow,
    valueHigh:       v.valueHigh,
    confidenceScore: v.confidenceScore,
    method:          v.method,
    changePct:       v.changePct,
  }));

  return NextResponse.json({
    assetId:   asset.id,
    assetName: asset.name,
    history,
  });
}
