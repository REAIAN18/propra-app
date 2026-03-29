import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await req.json();
  const { periodStart, periodEnd, kwh, cost, meterType, invoiceRef } = body;

  if (!periodStart || !periodEnd || kwh == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create energy reading
  const reading = await prisma.energyRead.create({
    data: {
      userId: user.id,
      assetId: asset.id,
      meterId: invoiceRef || `meter-${asset.id}`,
      readAt: new Date(periodEnd),
      kwh: parseFloat(kwh),
      source: "manual",
    },
  });

  // Anomaly detection: get last 3 readings for rolling average
  const recentReadings = await prisma.energyRead.findMany({
    where: { assetId: asset.id, readAt: { lt: new Date(periodEnd) } },
    orderBy: { readAt: "desc" },
    take: 3,
  });

  if (recentReadings.length >= 3) {
    const avgKwh = recentReadings.reduce((sum: number, r) => sum + r.kwh, 0) / recentReadings.length;
    const spikeThreshold = avgKwh * 1.25;
    const hhDriftThreshold = avgKwh * 1.15;
    const tariff = 0.28; // £/kWh default UK commercial tariff

    if (kwh > spikeThreshold) {
      await prisma.energyAnomaly.create({
        data: {
          userId: user.id,
          assetId: asset.id,
          anomalyType: "consumption_spike",
          detectionBasis: `Current period kwh (${kwh}) exceeds 3-period rolling average (${avgKwh.toFixed(0)}) by >25%`,
          annualSavingGbp: (kwh - avgKwh) * tariff * 52,
          calculationDetail: { kwh, avgKwh, tariff, periods: 52 },
          probableCause: "HVAC inefficiency or equipment fault",
          status: "open",
        },
      });
    } else if (kwh > hhDriftThreshold && meterType === "hh") {
      await prisma.energyAnomaly.create({
        data: {
          userId: user.id,
          assetId: asset.id,
          anomalyType: "hh_drift",
          detectionBasis: `Half-hourly consumption (${kwh}) exceeds rolling average (${avgKwh.toFixed(0)}) by >15%`,
          annualSavingGbp: (kwh - avgKwh) * tariff * 52,
          calculationDetail: { kwh, avgKwh, tariff, periods: 52 },
          probableCause: "Demand charge opportunity or out-of-hours usage",
          status: "open",
        },
      });
    }
  }

  return NextResponse.json({ reading });
}
