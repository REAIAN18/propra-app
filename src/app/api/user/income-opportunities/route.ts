import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface IncomeOpp {
  type: "5g_mast" | "ev_charging" | "solar";
  label: string;
  annualIncome: number;
  note: string;
}

const OPP_BY_TYPE: Record<string, IncomeOpp[]> = {
  industrial: [
    { type: "ev_charging", label: "EV Charging", annualIncome: 18000, note: "Typical for industrial with parking/loading bay" },
    { type: "solar", label: "Solar Roof", annualIncome: 12000, note: "South-facing roof, 500+ sqm" },
  ],
  warehouse: [
    { type: "5g_mast", label: "5G Mast", annualIncome: 22000, note: "Rooftop access, good sightlines" },
    { type: "ev_charging", label: "EV Charging", annualIncome: 15000, note: "HGV charging for loading areas" },
  ],
  retail: [
    { type: "ev_charging", label: "EV Charging", annualIncome: 14000, note: "Car park activation" },
    { type: "solar", label: "Solar Canopy", annualIncome: 9000, note: "Car park solar canopy" },
  ],
  office: [
    { type: "ev_charging", label: "EV Charging", annualIncome: 11000, note: "Occupier perk, car park" },
    { type: "5g_mast", label: "5G Mast", annualIncome: 20000, note: "Rooftop or plant room" },
  ],
  flex: [
    { type: "ev_charging", label: "EV Charging", annualIncome: 13000, note: "Mixed occupier demand" },
    { type: "solar", label: "Solar", annualIncome: 10000, note: "Roof installation" },
  ],
  mixed: [
    { type: "ev_charging", label: "EV Charging", annualIncome: 12000, note: "Ground floor car park" },
  ],
  commercial: [
    { type: "ev_charging", label: "EV Charging", annualIncome: 12000, note: "Car park or yard activation" },
    { type: "solar", label: "Solar", annualIncome: 10000, note: "Roof installation" },
  ],
};

export interface AssetIncomeOpportunities {
  assetId: string;
  assetName: string;
  assetType: string;
  location: string;
  opportunities: (IncomeOpp & { id: string })[];
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ assets: [] });
  }

  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, assetType: true, location: true, address: true },
    orderBy: { createdAt: "desc" },
  });

  const assets: AssetIncomeOpportunities[] = userAssets.map((a) => {
    const typeKey = (a.assetType ?? "commercial").toLowerCase();
    const opps = OPP_BY_TYPE[typeKey] ?? OPP_BY_TYPE["commercial"];
    return {
      assetId: a.id,
      assetName: a.name,
      assetType: a.assetType,
      location: a.location ?? a.address ?? "",
      opportunities: opps.map((o, i) => ({ ...o, id: `${a.id}-opp-${i}` })),
    };
  });

  return NextResponse.json({ assets });
}
