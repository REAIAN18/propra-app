import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

const INCOME_OPP_BY_TYPE: Record<string, number> = {
  industrial: 30000,
  warehouse: 37000,
  retail: 23000,
  office: 31000,
  flex: 23000,
  mixed: 22000,
  commercial: 22000,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      assetType: true,
      location: true,
      sqft: true,
      grossIncome: true,
      netIncome: true,
      insurancePremium: true,
      marketInsurance: true,
      energyCost: true,
      marketEnergyCost: true,
      occupancy: true,
      epcRating: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (rows.length === 0) {
    return NextResponse.json({ assets: [], summary: null, opportunities: null });
  }

  const sym = "£";

  const assets = rows.map((r) => {
    const sqft = r.sqft ?? 10000;
    const grossIncome = r.grossIncome ?? sqft * 25;
    const netIncome = r.netIncome ?? Math.round(grossIncome * 0.72);
    const insurancePremium = r.insurancePremium ?? Math.round(grossIncome * 0.04);
    const marketInsurance = r.marketInsurance ?? Math.round(insurancePremium * 0.75);
    const energyCost = r.energyCost ?? Math.round(grossIncome * 0.06);
    const marketEnergyCost = r.marketEnergyCost ?? Math.round(energyCost * 0.75);
    const occupancy = r.occupancy ?? 90;

    return {
      name: r.name,
      assetType: r.assetType,
      location: r.location,
      sqft,
      grossIncome,
      netIncome,
      insurancePremium,
      marketInsurance,
      energyCost,
      marketEnergyCost,
      occupancy,
      epcRating: r.epcRating ?? null,
      estimatedInsuranceSaving: Math.max(0, insurancePremium - marketInsurance),
      estimatedEnergySaving: Math.max(0, energyCost - marketEnergyCost),
      estimatedIncomePotential:
        INCOME_OPP_BY_TYPE[(r.assetType ?? "commercial").toLowerCase()] ??
        INCOME_OPP_BY_TYPE["commercial"],
    };
  });

  const totalGrossIncome = assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNetIncome = assets.reduce((s, a) => s + a.netIncome, 0);
  const totalInsurancePremium = assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalEnergyCost = assets.reduce((s, a) => s + a.energyCost, 0);
  const estimatedInsuranceSaving = assets.reduce((s, a) => s + a.estimatedInsuranceSaving, 0);
  const estimatedEnergySaving = assets.reduce((s, a) => s + a.estimatedEnergySaving, 0);
  const estimatedIncomePotential = assets.reduce((s, a) => s + a.estimatedIncomePotential, 0);

  const markets = [...new Set(assets.map((a) => a.location).filter(Boolean))];

  return NextResponse.json({
    assets,
    summary: {
      assetCount: rows.length,
      totalGrossIncome,
      totalNetIncome,
      totalInsurancePremium,
      totalEnergyCost,
      markets,
      sym,
    },
    opportunities: {
      estimatedInsuranceSaving,
      estimatedEnergySaving,
      estimatedIncomePotential,
      totalOpportunity: estimatedInsuranceSaving + estimatedEnergySaving + estimatedIncomePotential,
      formatted: {
        insuranceSaving: fmt(estimatedInsuranceSaving, sym),
        energySaving: fmt(estimatedEnergySaving, sym),
        incomePotential: fmt(estimatedIncomePotential, sym),
        totalOpportunity: fmt(
          estimatedInsuranceSaving + estimatedEnergySaving + estimatedIncomePotential,
          sym
        ),
      },
    },
  });
}
