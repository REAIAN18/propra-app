import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Portfolio, Asset, AdditionalIncomeOpp } from "@/lib/data/types";
import { getFallbackCapRate, calculateIncomeCap } from "@/lib/avm";

/** Generate indicative income opportunities from real asset characteristics. */
function generateIncomeOpps(
  assetId: string,
  type: string,
  sqft: number,
  currency: "USD" | "GBP"
): AdditionalIncomeOpp[] {
  const fx = currency === "GBP" ? 0.78 : 1;
  const opps: AdditionalIncomeOpp[] = [];

  if (type === "industrial" || type === "warehouse" || type === "logistics") {
    opps.push({ id: `${assetId}-a1`, type: "ev_charging", label: "EV Charging (8 bays)", annualIncome: Math.round(18000 * fx), status: "identified", probability: 75 });
    opps.push({ id: `${assetId}-a2`, type: "solar", label: "Rooftop Solar (120kWp)", annualIncome: Math.round(21600 * fx), status: "identified", probability: 70 });
  } else if (type === "office") {
    opps.push({ id: `${assetId}-a1`, type: "ev_charging", label: "EV Charging (6 bays)", annualIncome: Math.round(14400 * fx), status: "identified", probability: 75 });
    if (sqft > 10000) {
      opps.push({ id: `${assetId}-a2`, type: "5g_mast", label: "5G Rooftop Mast", annualIncome: Math.round(9600 * fx), status: "identified", probability: 60 });
    }
  } else if (type === "retail") {
    opps.push({ id: `${assetId}-a1`, type: "ev_charging", label: "EV Charging (10 bays)", annualIncome: Math.round(24000 * fx), status: "identified", probability: 80 });
    if (sqft > 10000) {
      opps.push({ id: `${assetId}-a2`, type: "billboard", label: "External Billboard", annualIncome: Math.round(7200 * fx), status: "identified", probability: 65 });
    }
  } else {
    opps.push({ id: `${assetId}-a1`, type: "ev_charging", label: "EV Charging (4 bays)", annualIncome: Math.round(9600 * fx), status: "identified", probability: 70 });
  }

  if (sqft > 10000) {
    opps.push({ id: `${assetId}-a${opps.length + 1}`, type: "parking", label: "Parking Optimisation", annualIncome: Math.round(6000 * fx), status: "identified", probability: 80 });
  }

  return opps;
}

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

  const assets: Asset[] = userAssets.map((a) => {
    const assetType = (a.assetType ?? "mixed") as Asset["type"];
    const sqft = a.sqft ?? 0;

    // Derive indicative valuation via income capitalisation
    // Priority: stored avmValue (Wave 2 field) → income cap inline → undefined
    const storedAvm = (a as unknown as { avmValue?: number | null }).avmValue;
    let derivedValue: number | undefined;
    if (storedAvm && storedAvm > 0) {
      derivedValue = storedAvm;
    } else if (a.netIncome || a.grossIncome || a.passingRent) {
      const capResult = calculateIncomeCap({
        netIncome:     a.netIncome ?? null,
        grossIncome:   a.grossIncome ?? null,
        passingRent:   a.passingRent ?? null,
        opexRatio:     0.25,
        marketCapRate: null,
        fallbackCapRate: getFallbackCapRate(a.country, a.assetType),
        sqft:          sqft || null,
        epcRating:     a.epcRating ?? null,
        wault:         null,
      });
      derivedValue = capResult?.value ?? undefined;
    }

    return {
      id: a.id,
      name: a.name,
      type: assetType,
      location: a.location,
      sqft,
      ...(isUK ? { valuationGBP: derivedValue } : { valuationUSD: derivedValue }),
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
      additionalIncomeOpportunities: generateIncomeOpps(a.id, assetType, sqft, currency),
      compliance: [],
      currency,
      planningImpactSignal: ((a as unknown as { planningImpactSignal?: string | null }).planningImpactSignal ?? null) as "positive" | "neutral" | "negative" | null,
    };
  });

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
