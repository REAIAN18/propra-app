import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Industry-standard FL commercial insurance rate ranges ($ per sqft per year)
// Source: ISO, AIR, and major carrier rate filings for FL CRE
const RATE_TABLE: Record<string, { low: number; high: number }> = {
  office:      { low: 0.30, high: 0.55 },
  retail:      { low: 0.35, high: 0.60 },
  industrial:  { low: 0.20, high: 0.35 },
  warehouse:   { low: 0.20, high: 0.35 },
  multifamily: { low: 0.40, high: 0.60 },
  commercial:  { low: 0.30, high: 0.50 },
  mixed:       { low: 0.35, high: 0.55 },
};

// FL county/city location risk multipliers
const LOCATION_MULTIPLIER = (location: string): number => {
  const l = location.toLowerCase();
  if (l.includes("miami") || l.includes("miami-dade")) return 1.5;
  if (l.includes("fort lauderdale") || l.includes("broward")) return 1.4;
  if (l.includes("west palm") || l.includes("palm beach")) return 1.3;
  if (l.includes("tampa") || l.includes("hillsborough") || l.includes("st. pete")) return 1.2;
  if (l.includes("orlando") || l.includes("orange county")) return 1.1;
  return 1.0;
};

// FEMA flood zone premium modifier
const FLOOD_ZONE_MULTIPLIER = (zone: string | null): number => {
  if (!zone) return 1.0;
  const z = zone.toUpperCase();
  if (z.startsWith("VE") || z === "V") return 1.5;
  if (z === "AE" || z === "A" || z.startsWith("AH") || z.startsWith("AO")) return 1.3;
  return 1.0;
};

function computeBenchmarkRange(
  sqft: number,
  assetType: string,
  location: string,
  floodZone: string | null
): { min: number; max: number } | null {
  const rates = RATE_TABLE[assetType.toLowerCase()] ?? RATE_TABLE.commercial;
  const locMult = LOCATION_MULTIPLIER(location);
  const floodMult = FLOOD_ZONE_MULTIPLIER(floodZone);
  return {
    min: Math.round(sqft * rates.low * locMult * floodMult),
    max: Math.round(sqft * rates.high * locMult * floodMult),
  };
}

// Demo insurance data for unauthenticated users (FL Mixed Portfolio)
const DEMO_INSURANCE_DATA = {
  hasPolicies: true,
  totalPremium: 78000,
  earliestRenewal: "2026-08-15",
  policies: [
    {
      id: "demo-1",
      insurer: "Zurich",
      premium: 18400,
      renewalDate: "2026-12-01",
      propertyAddress: "Coral Gables Office Park, Miami, FL",
      coverageType: "Property All-Risk",
      sumInsured: 16000000,
      excess: 25000,
      currency: "USD",
      filename: "coral-gables-policy.pdf",
    },
    {
      id: "demo-2",
      insurer: "AIG",
      premium: 24800,
      renewalDate: "2026-08-15",
      propertyAddress: "Brickell Retail Center, Miami, FL",
      coverageType: "Property All-Risk",
      sumInsured: 11000000,
      excess: 10000,
      currency: "USD",
      filename: "brickell-retail-policy.pdf",
    },
    {
      id: "demo-3",
      insurer: "Nationwide",
      premium: 16200,
      renewalDate: "2026-09-10",
      propertyAddress: "Orlando Medical Office, Orlando, FL",
      coverageType: "Medical Office Package",
      sumInsured: 8000000,
      excess: 10000,
      currency: "USD",
      filename: "orlando-medical-policy.pdf",
    },
    {
      id: "demo-4",
      insurer: "Hartford",
      premium: 13300,
      renewalDate: "2027-03-01",
      propertyAddress: "Tampa Industrial Park, Tampa, FL",
      coverageType: "Industrial Property",
      sumInsured: 9000000,
      excess: 25000,
      currency: "USD",
      filename: "tampa-industrial-policy.pdf",
    },
    {
      id: "demo-5",
      insurer: "Uninsured",
      premium: 0,
      renewalDate: null,
      propertyAddress: "Ft Lauderdale Flex Space, Fort Lauderdale, FL",
      coverageType: "Flex Space",
      sumInsured: 0,
      excess: 0,
      currency: "USD",
      filename: null,
    },
  ],
  assets: [
    {
      id: "asset-1",
      name: "Coral Gables Office Park",
      location: "Miami, FL",
      floodZone: "AE",
      country: "USA",
    },
    {
      id: "asset-2",
      name: "Brickell Retail Center",
      location: "Miami, FL",
      floodZone: "VE",
      country: "USA",
    },
    {
      id: "asset-3",
      name: "Orlando Medical Office",
      location: "Orlando, FL",
      floodZone: "X",
      country: "USA",
    },
    {
      id: "asset-4",
      name: "Tampa Industrial Park",
      location: "Tampa, FL",
      floodZone: "AO",
      country: "USA",
    },
    {
      id: "asset-5",
      name: "Ft Lauderdale Flex Space",
      location: "Fort Lauderdale, FL",
      floodZone: "VE",
      country: "USA",
    },
  ],
  benchmarkMin: 54000,
  benchmarkMax: 92000,
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(DEMO_INSURANCE_DATA);
  }

  // Fetch uploaded policy documents
  const docs = await prisma.document.findMany({
    where: { userId: session.user.id, documentType: "insurance_policy", status: "done" },
    orderBy: { createdAt: "desc" },
  });

  // Fetch user assets for flood zone data and benchmark computation
  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, location: true, assetType: true, sqft: true, floodZone: true, country: true },
  });

  const assetFloodData = userAssets.map((a) => ({
    id: a.id,
    name: a.name,
    location: a.location,
    floodZone: a.floodZone ?? null,
    country: a.country ?? null,
  }));

  // Compute portfolio benchmark range from asset data
  let benchmarkMin: number | null = null;
  let benchmarkMax: number | null = null;
  const assetsWithSqft = userAssets.filter((a) => a.sqft && a.sqft > 0);
  if (assetsWithSqft.length > 0) {
    let totalMin = 0;
    let totalMax = 0;
    for (const a of assetsWithSqft) {
      const range = computeBenchmarkRange(a.sqft!, a.assetType, a.location, a.floodZone ?? null);
      if (range) {
        totalMin += range.min;
        totalMax += range.max;
      }
    }
    if (totalMin > 0) {
      benchmarkMin = totalMin;
      benchmarkMax = totalMax;
    }
  }

  if (!docs.length) {
    return NextResponse.json({
      hasPolicies: false,
      totalPremium: 0,
      policies: [],
      assets: assetFloodData,
      benchmarkMin,
      benchmarkMax,
    });
  }

  const policies = docs.map((d) => {
    const data = (d.extractedData as Record<string, unknown>) ?? {};
    return {
      id: d.id,
      insurer: (data.insurer as string) ?? "Unknown",
      premium: Number(data.premium) || 0,
      renewalDate: (data.renewalDate as string) ?? null,
      propertyAddress: (data.propertyAddress as string) ?? null,
      coverageType: (data.coverageType as string) ?? null,
      sumInsured: Number(data.sumInsured) || 0,
      excess: Number(data.excess) || 0,
      currency: (data.currency as string) ?? null,
      filename: d.filename,
    };
  });

  const totalPremium = policies.reduce((s, p) => s + p.premium, 0);
  const earliestRenewal =
    policies
      .filter((p) => p.renewalDate)
      .sort(
        (a, b) =>
          new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime()
      )[0]?.renewalDate ?? null;

  return NextResponse.json({
    hasPolicies: true,
    totalPremium,
    earliestRenewal,
    policies,
    assets: assetFloodData,
    benchmarkMin,
    benchmarkMax,
  });
}
