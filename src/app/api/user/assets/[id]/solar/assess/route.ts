import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface GoogleSolarResponse {
  solarPotential?: {
    maxArrayPanelsCount?: number;
    roofSegmentSummaries?: Array<{ areaMeters2?: number }>;
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const assetId = (await params).id;
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: user.id },
    select: { id: true, address: true, latitude: true, longitude: true, country: true },
  });

  if (!asset || !asset.latitude || !asset.longitude) {
    return NextResponse.json({ error: "Asset not found or missing coordinates" }, { status: 404 });
  }

  const isUK = asset.country === "UK";

  const apiKey = process.env.GOOGLE_SOLAR_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Solar API key not configured" }, { status: 500 });
  }

  // Call Google Solar API buildingInsights endpoint
  const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${asset.latitude}&location.longitude=${asset.longitude}&requiredQuality=HIGH&key=${apiKey}`;

  let solarData: GoogleSolarResponse;
  try {
    const res = await fetch(solarUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Solar API returned ${res.status}`);
    }
    solarData = await res.json();
  } catch {
    return NextResponse.json({ error: "Google Solar API call failed" }, { status: 500 });
  }

  // Extract data from Google Solar response
  const solarPotential = solarData.solarPotential || {};
  const maxPanels = solarPotential.maxArrayPanelsCount || 0;
  const yearlyEnergyDcKwh = maxPanels * 350 * 0.85; // 350W panels, 85% efficiency
  const installationSizeKw = (maxPanels * 350) / 1000;

  // Market rates: UK £1,300/kWp, US $3,000/kWp
  const installCostPerKw = isUK ? 1300 : 3000;
  const estimatedInstallCost = installationSizeKw * installCostPerKw;

  // UK REGO export rate: £0.245/kWh (2026 avg)
  const exportRate = isUK ? 0.245 : 0.10;
  const annualIncomeGbp = yearlyEnergyDcKwh * exportRate;

  const paybackYears = annualIncomeGbp > 0 ? estimatedInstallCost / annualIncomeGbp : 999;

  const roofAreaSqm = solarPotential.roofSegmentSummaries?.[0]?.areaMeters2 ?? null;
  const panelCountEstimate = maxPanels > 0 ? maxPanels : null;

  // Store assessment
  const assessment = await prisma.solarAssessment.upsert({
    where: { assetId: asset.id },
    create: {
      userId: user.id,
      assetId: asset.id,
      roofAreaSqm,
      panelCountEstimate,
      annualGenKwh: yearlyEnergyDcKwh,
      googleSolarRaw: solarData as never,
      currentUnitRateP: exportRate * 100,
      segExportRateP: exportRate * 100,
      selfConsumptionSavingGbp: annualIncomeGbp * 0.5,
      exportIncomeGbp: annualIncomeGbp * 0.5,
      installCostGbp: estimatedInstallCost,
      paybackYears: Math.round(paybackYears * 10) / 10,
      status: paybackYears < 10 ? "viable" : "not_viable",
      notViableReason: paybackYears >= 10 ? "Payback period exceeds 10 years" : null,
    },
    update: {
      assessedAt: new Date(),
      annualGenKwh: yearlyEnergyDcKwh,
      googleSolarRaw: solarData as never,
      installCostGbp: estimatedInstallCost,
      paybackYears: Math.round(paybackYears * 10) / 10,
      status: paybackYears < 10 ? "viable" : "not_viable",
    },
  });

  return NextResponse.json({ assessment });
}
