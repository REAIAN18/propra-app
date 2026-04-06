import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateOpportunities } from "@/lib/income-opportunities";

export interface AssetIncomeOpportunities {
  assetId: string;
  assetName: string;
  assetType: string;
  location: string;
  opportunities: Array<{
    id: string;
    type: string;
    label: string;
    annualIncome: number;
    note: string;
    confidence: number;
    methodology: string;
    comparables: Array<{ address: string; income: number; distance: number }>;
    riskFactors: Array<{ factor: string; severity: "low" | "medium" | "high" }>;
  }>;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      assets: [
        {
          assetId: "demo-1",
          assetName: "FL Mixed Portfolio",
          assetType: "Mixed-Use",
          location: "Miami, FL",
          opportunities: [
            {
              id: "demo-1-opp-0",
              type: "ev_charging",
              label: "EV Charging",
              annualIncome: 54720,
              note: "8 parking bays suitable for Level 2 chargers",
              confidence: 85,
              methodology: "8 bays × 2.8 sessions/day × $1.82/session × 365 days = $54,720/yr",
              comparables: [
                { address: "Nearby retail center", income: 65664, distance: 1.4 },
                { address: "Shopping mall", income: 46512, distance: 2.1 },
              ],
              riskFactors: [
                { factor: "Electrical panel capacity", severity: "medium" as const },
                { factor: "No planning permission required", severity: "low" as const },
              ],
            },
            {
              id: "demo-1-opp-1",
              type: "5g_mast",
              label: "5G / Telecoms Roof Lease",
              annualIncome: 18000,
              note: "Rooftop mast or antenna array",
              confidence: 68,
              methodology: "Typical 5G lease: $15k–$22k/yr. Estimate $18,000/yr",
              comparables: [
                { address: "Office building 0.8mi away", income: 20700, distance: 0.8 },
              ],
              riskFactors: [
                { factor: "Planning permission required", severity: "high" as const },
              ],
            },
            {
              id: "demo-1-opp-2",
              type: "solar",
              label: "Solar PV",
              annualIncome: 42000,
              note: "70kW system — roof-mounted PV array",
              confidence: 65,
              methodology: "70kW × 1,200 kWh/kW/yr × $0.10/kWh = $42,000/yr",
              comparables: [
                { address: "Similar warehouse — 45kW", income: 46200, distance: 3.2 },
              ],
              riskFactors: [
                { factor: "Roof structural survey required", severity: "medium" as const },
              ],
            },
            {
              id: "demo-1-opp-3",
              type: "parking",
              label: "Parking Revenue",
              annualIncome: 15600,
              note: "20 spaces available for public use during off-peak hours",
              confidence: 72,
              methodology: "20 spaces × 2 days/wk × $5/session × 52 weeks = $15,600/yr",
              comparables: [],
              riskFactors: [
                { factor: "Tenant lease restrictions", severity: "medium" as const },
              ],
            },
            {
              id: "demo-1-opp-4",
              type: "billboard",
              label: "Billboard / Advertising",
              annualIncome: 8400,
              note: "Road-facing wall or rooftop billboard",
              confidence: 48,
              methodology: "Road-facing site lease: $700/mo × 12 = $8,400/yr",
              comparables: [],
              riskFactors: [
                { factor: "Planning restrictions (common)", severity: "high" as const },
              ],
            },
          ],
        },
      ],
    });
  }

  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      assetType: true,
      location: true,
      address: true,
      region: true,
      sqft: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const assets: AssetIncomeOpportunities[] = userAssets.map((a) => {
    const opps = generateOpportunities(a);
    return {
      assetId: a.id,
      assetName: a.name,
      assetType: a.assetType ?? "commercial",
      location: a.location ?? a.address ?? "",
      opportunities: opps.map((o, i) => ({ ...o, id: `${a.id}-opp-${i}` })),
    };
  });

  return NextResponse.json({ assets });
}
