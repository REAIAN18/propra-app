import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const assetId = params.id;
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: user.id },
    select: { id: true, address: true, lat: true, lng: true, isUK: true },
  });

  if (!asset || !asset.lat || !asset.lng) {
    return NextResponse.json({ error: "Asset not found or missing coordinates" }, { status: 404 });
  }

  const apiKey = process.env.GOOGLE_SOLAR_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Solar API key not configured" }, { status: 500 });
  }

  // Call Google Solar API buildingInsights endpoint
  const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${asset.lat}&location.longitude=${asset.lng}&requiredQuality=HIGH&key=${apiKey}`;

  let solarData: any;
  try {
    const res = await fetch(solarUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Solar API returned ${res.status}`);
    }
    solarData = await res.json();
  } catch (err) {
    return NextResponse.json({ error: "Google Solar API call failed" }, { status: 500 });
  }

  // Extract data from Google Solar response
  const solarPotential = solarData.solarPotential || {};
  const yearlyEnergyDcKwh = solarPotential.maxArrayPanelsCount
    ? solarPotential.maxArrayPanelsCount * 350 * 0.85
    : 0; // 350W panels, 85% efficiency

  const roofSegmentCount = solarPotential.roofSegmentStats?.length || 0;
  const carbonOffsetKg = solarPotential.carbonOffsetFactorKgPerMwh
    ? (yearlyEnergyDcKwh / 1000) * solarPotential.carbonOffsetFactorKgPerMwh
    : yearlyEnergyDcKwh * 0.233; // UK grid carbon intensity fallback

  const installationSizeKw = solarPotential.maxArrayPanelsCount
    ? (solarPotential.maxArrayPanelsCount * 350) / 1000
    : 0;

  // Market rates: UK £1,300/kWp, US $3,000/kWp
  const installCostPerKw = asset.isUK ? 1300 : 3000;
  const estimatedInstallCost = installationSizeKw * installCostPerKw;

  // UK REGO export rate: £0.245/kWh (2026 avg)
  const exportRate = asset.isUK ? 0.245 : 0.10;
  const annualIncomeGbp = yearlyEnergyDcKwh * exportRate;

  const paybackYears = annualIncomeGbp > 0 ? estimatedInstallCost / annualIncomeGbp : 999;

  // Calculate 10-year IRR
  const cashFlows = [-estimatedInstallCost];
  for (let y = 1; y <= 10; y++) {
    cashFlows.push(annualIncomeGbp);
  }
  const irr10yr = calculateIRR(cashFlows);

  // Store assessment
  const assessment = await prisma.solarAssessment.upsert({
    where: { assetId: asset.id },
    create: {
      userId: user.id,
      assetId: asset.id,
      roofAreaSqm: solarPotential.roofSegmentSummaries?.[0]?.areaMeters2 || null,
      panelCountEstimate: solarPotential.maxArrayPanelsCount || null,
      annualGenKwh: yearlyEnergyDcKwh,
      googleSolarRaw: solarData,
      currentUnitRateP: exportRate * 100,
      segExportRateP: exportRate * 100,
      selfConsumptionSavingGbp: annualIncomeGbp * 0.5,
      exportIncomeGbp: annualIncomeGbp * 0.5,
      totalAnnualBenefitGbp: annualIncomeGbp,
      paybackYears: Math.round(paybackYears * 10) / 10,
      irr10yr: Math.round(irr10yr * 100) / 100,
      status: paybackYears < 10 ? "viable" : "not_viable",
      notViableReason: paybackYears >= 10 ? "Payback period exceeds 10 years" : null,
    },
    update: {
      assessedAt: new Date(),
      annualGenKwh: yearlyEnergyDcKwh,
      googleSolarRaw: solarData,
      paybackYears: Math.round(paybackYears * 10) / 10,
      irr10yr: Math.round(irr10yr * 100) / 100,
      status: paybackYears < 10 ? "viable" : "not_viable",
    },
  });

  return NextResponse.json({ assessment });
}

// IRR calculation using Newton-Raphson method
function calculateIRR(cashFlows: number[], guess = 0.1): number {
  const maxIterations = 100;
  const tolerance = 0.00001;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    rate = newRate;
  }

  return rate;
}
