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

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ hasPolicies: false, totalPremium: 0, policies: [], assets: [], benchmarkMin: null, benchmarkMax: null });
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
