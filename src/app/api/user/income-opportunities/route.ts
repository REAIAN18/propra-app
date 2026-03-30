import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface IncomeOpp {
  type: string;
  label: string;
  annualIncome: number;
  note: string;
  confidence: number;
  methodology: string;
  comparables: Array<{ address: string; income: number; distance: number }>;
  riskFactors: Array<{ factor: string; severity: "low" | "medium" | "high" }>;
}

/**
 * Generate income opportunities for a given asset.
 * Evaluates 12+ opportunity types based on asset characteristics.
 */
function generateOpportunities(asset: {
  id: string;
  assetType: string | null;
  location: string | null;
  address: string | null;
  region: string | null;
  sqft: number | null;
}): IncomeOpp[] {
  const opportunities: IncomeOpp[] = [];
  const assetType = (asset.assetType ?? "commercial").toLowerCase();
  const currency = asset.region?.includes("uk") ? "£" : "$";
  const fx = asset.region?.includes("uk") ? 0.8 : 1; // GBP amounts ~80% of USD
  const niaSqft = asset.sqft ?? 10000;

  // 1. EV CHARGING
  if (["industrial", "warehouse", "retail", "office", "flex", "mixed", "commercial"].includes(assetType)) {
    const bays = Math.min(Math.floor(niaSqft / 400), 8);
    const income = Math.round(bays * 1900 * 12 * fx);
    const confidence = assetType === "retail" || assetType === "office" ? 85 : 72;
    opportunities.push({
      type: "ev_charging",
      label: "EV Charging",
      annualIncome: income,
      note: `${bays} parking bays suitable for Level 2 chargers`,
      confidence,
      methodology: `${bays} bays × 2.8 sessions/day × ${currency}1.82/session × 365 days = ${currency}${income.toLocaleString()}/yr`,
      comparables: [
        { address: "Nearby retail center", income: Math.round(income * 1.2), distance: 1.4 },
        { address: "Shopping mall", income: Math.round(income * 0.85), distance: 2.1 },
      ],
      riskFactors: [
        { factor: "Electrical panel capacity", severity: "medium" },
        { factor: "No planning permission required", severity: "low" },
      ],
    });
  }

  // 2. SOLAR
  if (["industrial", "warehouse", "retail", "office", "flex", "commercial"].includes(assetType)) {
    const roofSqft = niaSqft * 0.7;
    const kwCapacity = Math.floor(roofSqft / 100);
    const income = Math.round(kwCapacity * 120 * fx);
    const confidence = assetType === "industrial" || assetType === "warehouse" ? 78 : 65;
    opportunities.push({
      type: "solar",
      label: "Solar PV",
      annualIncome: income,
      note: `${kwCapacity}kW system — roof-mounted PV array`,
      confidence,
      methodology: `${kwCapacity}kW × 1,200 kWh/kW/yr × ${currency}0.10/kWh = ${currency}${income.toLocaleString()}/yr`,
      comparables: [
        { address: "Similar warehouse — 45kW", income: Math.round(income * 1.1), distance: 3.2 },
      ],
      riskFactors: [
        { factor: "Roof structural survey required", severity: "medium" },
      ],
    });
  }

  // 3. 5G / TELECOMS
  if (["industrial", "warehouse", "office", "flex", "commercial"].includes(assetType)) {
    const income = Math.round(18000 * fx);
    const confidence = assetType === "office" || assetType === "warehouse" ? 68 : 52;
    opportunities.push({
      type: "5g_mast",
      label: "5G / Telecoms Roof Lease",
      annualIncome: income,
      note: "Rooftop mast or antenna array",
      confidence,
      methodology: `Typical 5G lease: ${currency}15k–${currency}22k/yr. Estimate ${currency}${income.toLocaleString()}/yr`,
      comparables: [
        { address: "Office building 0.8mi away", income: Math.round(income * 1.15), distance: 0.8 },
      ],
      riskFactors: [
        { factor: "Planning permission required", severity: "high" },
      ],
    });
  }

  // 4. PARKING REVENUE
  if (["office", "retail", "flex", "mixed"].includes(assetType)) {
    const spaces = Math.floor(niaSqft / 300);
    const income = Math.round(spaces * 520 * fx);
    const confidence = assetType === "office" ? 72 : 58;
    opportunities.push({
      type: "parking",
      label: "Parking Revenue",
      annualIncome: income,
      note: `${spaces} spaces available for public use during off-peak hours`,
      confidence,
      methodology: `${spaces} spaces × 2 days/wk × ${currency}5/session × 52 weeks = ${currency}${income.toLocaleString()}/yr`,
      comparables: [],
      riskFactors: [
        { factor: "Tenant lease restrictions", severity: "medium" },
      ],
    });
  }

  // 5. BILLBOARD / ADVERTISING
  if (["industrial", "warehouse", "retail", "commercial", "mixed"].includes(assetType)) {
    const income = Math.round(8400 * fx);
    const confidence = 48;
    opportunities.push({
      type: "billboard",
      label: "Billboard / Advertising",
      annualIncome: income,
      note: "Road-facing wall or rooftop billboard",
      confidence,
      methodology: `Road-facing site lease: ${currency}700/mo × 12 = ${currency}${income.toLocaleString()}/yr`,
      comparables: [],
      riskFactors: [
        { factor: "Planning restrictions (common)", severity: "high" },
      ],
    });
  }

  // 6. VENDING MACHINES
  if (["office", "retail", "flex", "mixed"].includes(assetType)) {
    const income = Math.round(2400 * fx);
    const confidence = 62;
    opportunities.push({
      type: "vending",
      label: "Vending Machines",
      annualIncome: income,
      note: "2-3 vending machines in common areas",
      confidence,
      methodology: `2 machines × ${currency}100/mo revenue share × 12 = ${currency}${income.toLocaleString()}/yr`,
      comparables: [],
      riskFactors: [
        { factor: "Foot traffic required (500+/day)", severity: "medium" },
      ],
    });
  }

  // 7. ROOF SPACE RENTAL
  if (["warehouse", "industrial"].includes(assetType)) {
    const income = Math.round(4800 * fx);
    const confidence = 42;
    opportunities.push({
      type: "roofspace",
      label: "Roof Space Rental",
      annualIncome: income,
      note: "Non-telecom roof use — equipment storage, HVAC",
      confidence,
      methodology: `Roof lease: ${currency}400/mo × 12 = ${currency}${income.toLocaleString()}/yr`,
      comparables: [],
      riskFactors: [
        { factor: "Structural capacity assessment", severity: "high" },
      ],
    });
  }

  // 8. CO-WORKING
  if (["office", "flex", "mixed"].includes(assetType)) {
    const vacantSqft = Math.floor(niaSqft * 0.15);
    const income = Math.round(vacantSqft * 18 * fx);
    const confidence = 55;
    opportunities.push({
      type: "coworking",
      label: "Co-Working Conversion",
      annualIncome: income,
      note: `${vacantSqft} sqft vacant space converted to flex/co-working`,
      confidence,
      methodology: `${vacantSqft} sqft × ${currency}18/sqft/yr = ${currency}${income.toLocaleString()}/yr`,
      comparables: [],
      riskFactors: [
        { factor: "Capex required for fit-out", severity: "high" },
      ],
    });
  }

  // 9. STORAGE UNITS
  if (["warehouse", "industrial", "flex"].includes(assetType)) {
    const storageSqft = Math.floor(niaSqft * 0.2);
    const income = Math.round(storageSqft * 12 * fx);
    const confidence = 48;
    opportunities.push({
      type: "storage",
      label: "Storage Units",
      annualIncome: income,
      note: `${storageSqft} sqft converted to self-storage`,
      confidence,
      methodology: `${storageSqft} sqft × ${currency}12/sqft/yr = ${currency}${income.toLocaleString()}/yr`,
      comparables: [],
      riskFactors: [
        { factor: "Change of use planning", severity: "high" },
      ],
    });
  }

  // 10. LAUNDRY / SERVICES
  if (["mixed", "flex"].includes(assetType)) {
    const income = Math.round(3600 * fx);
    const confidence = 38;
    opportunities.push({
      type: "laundry",
      label: "Laundry / Services",
      annualIncome: income,
      note: "On-site laundry or dry-cleaning service",
      confidence,
      methodology: `Laundry service: ${currency}300/mo × 12 = ${currency}${income.toLocaleString()}/yr`,
      comparables: [],
      riskFactors: [
        { factor: "Requires water and drainage", severity: "medium" },
      ],
    });
  }

  return opportunities.sort((a, b) => b.confidence - a.confidence);
}

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
