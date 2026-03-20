import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AssetInput = {
  name: string;
  address: string;
  type: string;
  sqft: number;
  valuation: number;
  occupancy: number;
  annualRent: number;
  insurancePremium: number;
  energyCost: number;
};

const TENANT_NAMES = [
  "Apex Consulting Group", "Meridian Legal LLP", "Blue Ridge Capital",
  "Summit Technologies", "Horizon Retail Co", "Cascade Partners",
  "Vantage Group", "Sterling Logistics", "Pinnacle Advisors", "Crestview Holdings",
];

function futureDateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function leaseStatus(daysToExpiry: number): "current" | "expiring_soon" | "expired" {
  if (daysToExpiry < 0) return "expired";
  if (daysToExpiry < 365) return "expiring_soon";
  return "current";
}

function generateLeases(assetId: string, annualRent: number, sqft: number, seed: number) {
  if (annualRent <= 0) return [];
  const leases = [];
  const rentPerSqft = sqft > 0 ? Math.round((annualRent / sqft) * 10) / 10 : 15;
  const numLeases = sqft > 15000 ? 2 : 1;
  const splits = numLeases === 2 ? [0.6, 0.4] : [1];
  const tenantOffset = seed % TENANT_NAMES.length;

  for (let i = 0; i < numLeases; i++) {
    const leaseSqft = Math.round(sqft * splits[i]);
    const expiryDays = 300 + ((seed * 7 + i * 3) % 900); // 300–1200 days, deterministic
    leases.push({
      id: `${assetId}-l${i + 1}`,
      tenant: TENANT_NAMES[(tenantOffset + i) % TENANT_NAMES.length],
      sqft: leaseSqft,
      rentPerSqft,
      startDate: futureDateStr(-(365 * 3 + i * 180)),
      expiryDate: futureDateStr(expiryDays),
      reviewDate: futureDateStr(Math.round(expiryDays / 2)),
      daysToExpiry: expiryDays,
      status: leaseStatus(expiryDays),
    });
  }
  return leases;
}

function generateIncomeOpps(assetId: string, type: string, sqft: number, currency: "USD" | "GBP") {
  const fx = currency === "GBP" ? 0.78 : 1;
  const opps = [];

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

function generateCompliance(assetId: string, type: string, seed: number) {
  const items = [];
  const isUK = true; // always generate realistic certs regardless

  // Fire Safety — expires 30–120 days (urgent)
  const fireDays = 30 + (seed % 90);
  items.push({
    id: `${assetId}-c1`,
    type: "Fire Safety",
    certificate: "Fire Safety Certificate",
    expiryDate: futureDateStr(fireDays),
    daysToExpiry: fireDays,
    status: fireDays < 90 ? "expiring_soon" : "valid",
    fineExposure: 25000,
  });

  // Electrical — expires 400–700 days (valid)
  const elecDays = 400 + (seed % 300);
  items.push({
    id: `${assetId}-c2`,
    type: "Electrical",
    certificate: "EICR",
    expiryDate: futureDateStr(elecDays),
    daysToExpiry: elecDays,
    status: "valid",
    fineExposure: 0,
  });

  // EPC — expires 100–200 days (expiring soon)
  const epcDays = 100 + (seed % 100);
  items.push({
    id: `${assetId}-c3`,
    type: type === "industrial" || type === "warehouse" ? "MEES / EPC" : "EPC",
    certificate: "Energy Performance Certificate",
    expiryDate: futureDateStr(epcDays),
    daysToExpiry: epcDays,
    status: "expiring_soon",
    fineExposure: type === "industrial" || type === "warehouse" ? 150000 : 50000,
  });

  return items;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { companyName, currency, assets, email } = body as {
    companyName: string;
    currency: "USD" | "GBP";
    assets: AssetInput[];
    email?: string;
  };

  if (!companyName?.trim() || !assets?.length) {
    return NextResponse.json({ error: "Company name and at least one asset required" }, { status: 400 });
  }

  // Generate a URL key from company name
  const baseKey = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  // Ensure uniqueness by appending timestamp if needed
  const urlKey = `${baseKey}-${Date.now().toString(36)}`;

  const sym = currency === "GBP" ? "£" : "$";
  const benchmarkInsuranceRate = currency === "GBP" ? 0.80 : 0.82; // market is ~80% of typical premium

  // Build portfolio JSON from form inputs
  const portfolioAssets = assets.map((a, i) => {
    const grossIncome = a.annualRent;
    const netIncome = Math.round(grossIncome * 0.72); // assume 72% G2N
    const marketInsurance = Math.round(a.insurancePremium * benchmarkInsuranceRate);
    const marketEnergyCost = Math.round(a.energyCost * 0.88); // assume 12% saving achievable
    const assetId = `${baseKey}-${String(i + 1).padStart(3, "0")}`;
    const assetType = a.type || "office";
    const seed = i * 37 + (a.sqft % 100); // deterministic per-asset seed

    return {
      id: assetId,
      name: a.name || `Asset ${i + 1}`,
      type: assetType,
      location: a.address,
      sqft: a.sqft || 5000,
      ...(currency === "GBP"
        ? { valuationGBP: a.valuation }
        : { valuationUSD: a.valuation }),
      grossIncome,
      netIncome,
      occupancy: a.occupancy ?? 95,
      passingRent: a.sqft > 0 ? Math.round((grossIncome / a.sqft) * 10) / 10 : 15,
      marketERV: a.sqft > 0 ? Math.round((grossIncome / a.sqft) * 1.08 * 10) / 10 : 16,
      insurancePremium: a.insurancePremium,
      marketInsurance,
      energyCost: a.energyCost,
      marketEnergyCost,
      currency,
      leases: generateLeases(assetId, grossIncome, a.sqft || 5000, seed),
      additionalIncomeOpportunities: generateIncomeOpps(assetId, assetType, a.sqft || 5000, currency),
      compliance: generateCompliance(assetId, assetType, seed),
    };
  });

  const portfolioData = {
    id: urlKey,
    name: companyName,
    shortName: companyName.split(" ").slice(0, 2).join(" "),
    currency,
    benchmarkG2N: 72,
    assets: portfolioAssets,
  };

  // Check if portfolio with this urlKey already exists (race condition safety)
  const existing = await prisma.clientPortfolio.findUnique({ where: { urlKey } });
  if (existing) {
    return NextResponse.json({ urlKey: existing.urlKey }, { status: 200 });
  }

  await prisma.clientPortfolio.create({
    data: {
      name: companyName,
      urlKey,
      data: portfolioData,
      createdBy: email ?? "self-service",
    },
  });

  return NextResponse.json({ urlKey }, { status: 201 });
}
