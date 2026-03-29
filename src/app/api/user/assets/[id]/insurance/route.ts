/**
 * GET /api/user/assets/[id]/insurance
 * Returns insurance data for property-level insurance tab
 *
 * Used by: /properties/[id] Insurance tab
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
  const userId = session.user.id;

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Fetch insurance quote for this asset (if any)
  const quote = await prisma.insuranceQuote.findFirst({
    where: { assetId, userId },
    orderBy: { createdAt: "desc" },
  });

  const currency = asset.country === "UK" ? "GBP" : "USD";
  const sym = currency === "GBP" ? "£" : "$";

  // Calculate basic metrics
  const rebuildEstimate = asset.valuationGBP ?? asset.valuationUSD ?? 0;
  const hasInsurance = !!quote;
  const currentPremium = quote?.premium ?? 0;
  const coverAmount = quote?.coverAmount ?? rebuildEstimate;
  const isUnderinsured = coverAmount < rebuildEstimate * 0.9; // Less than 90% of rebuild

  // Mock market rate (in production, would come from CoverForce benchmarks)
  const marketRate = currentPremium > 0 ? currentPremium * 0.85 : rebuildEstimate * 0.0015;
  const overpaying = currentPremium > marketRate ? currentPremium - marketRate : 0;

  return NextResponse.json({
    asset: {
      id: asset.id,
      name: asset.name ?? "Property",
      address: asset.address ?? asset.location,
      currency,
    },
    overview: {
      hasInsurance,
      currentPremium,
      marketRate: Math.round(marketRate),
      overpaying: Math.round(overpaying),
      coverAmount,
      rebuildEstimate,
      isUnderinsured,
    },
    currentPolicy: quote ? {
      id: quote.id,
      carrier: quote.carrier,
      premium: quote.premium,
      coverAmount: quote.coverAmount,
      deductible: quote.deductible,
      renewalDate: quote.renewalDate,
      policyType: quote.policyType || "Property All-Risk",
      status: quote.status,
    } : null,
  });
}
