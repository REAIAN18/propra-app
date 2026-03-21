import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Portfolio, Asset } from "@/lib/data/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  const isUK = userAssets.some((a) => a.country === "UK");
  const currency: "USD" | "GBP" = isUK ? "GBP" : "USD";

  const assets: Asset[] = userAssets.map((a) => ({
    id: a.id,
    name: a.name,
    type: "mixed",
    location: a.location,
    sqft: a.sqft ?? 0,
    ...(isUK ? { valuationGBP: undefined } : { valuationUSD: undefined }),
    grossIncome: a.grossIncome ?? 0,
    netIncome: a.netIncome ?? 0,
    occupancy: a.occupancy ?? 95,
    passingRent: a.passingRent ?? 0,
    marketERV: a.marketERV ?? 0,
    insurancePremium: a.insurancePremium ?? 0,
    marketInsurance: a.marketInsurance ?? 0,
    energyCost: a.energyCost ?? 0,
    marketEnergyCost: a.marketEnergyCost ?? 0,
    leases: [],
    additionalIncomeOpportunities: [],
    compliance: [],
    currency,
  }));

  const portfolio: Portfolio = {
    id: "user",
    name: session.user.name ?? "My Portfolio",
    shortName: "Mine",
    currency,
    assets,
    benchmarkG2N: 0.72,
  };

  return NextResponse.json(portfolio);
}
