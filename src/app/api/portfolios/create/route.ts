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

    return {
      id: `${baseKey}-${String(i + 1).padStart(3, "0")}`,
      name: a.name || `Asset ${i + 1}`,
      type: a.type || "office",
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
      leases: [],
      additionalIncomeOpportunities: [],
      compliance: [],
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
