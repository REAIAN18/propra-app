import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/work-orders
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      orders: [
        {
          id: "demo-1",
          userId: "demo-user",
          assetId: "demo-1",
          asset: { name: "FL Mixed Portfolio", location: "Miami, FL" },
          jobType: "HVAC Replacement",
          description: "Full HVAC system replacement for Suite 4A",
          tenderType: "competitive",
          status: "tender",
          scopeOfWorks: "Remove existing units, install new high-efficiency system",
          accessNotes: "Access available weekdays 9am-5pm",
          timing: "March 2026",
          targetStart: "2026-03-15",
          budgetEstimate: 85000,
          benchmarkLow: 75000,
          benchmarkHigh: 95000,
          benchmarkSource: "RSMeans 2026",
          capRateValueAdd: 120000,
          currency: "USD",
          quotes: [
            { id: "q1", contractorName: "Climate Systems Inc", price: 84500, quotedAt: "2026-03-01T10:30:00Z", status: "active" },
            { id: "q2", contractorName: "Precision HVAC", price: 79000, quotedAt: "2026-02-28T14:15:00Z", status: "active" },
          ],
          completion: null,
          createdAt: "2026-02-28T08:00:00Z",
        },
        {
          id: "demo-2",
          userId: "demo-user",
          assetId: "demo-1",
          asset: { name: "FL Mixed Portfolio", location: "Miami, FL" },
          jobType: "Electrical Panel Upgrade",
          description: "Main electrical panel upgrade to 400A service",
          tenderType: "single",
          status: "quotes",
          scopeOfWorks: "Upgrade panel capacity, new breakers, disconnect old service",
          accessNotes: "Tenant coordination required",
          timing: "April 2026",
          targetStart: "2026-04-01",
          budgetEstimate: 32000,
          benchmarkLow: 28000,
          benchmarkHigh: 36000,
          benchmarkSource: "Local contractors",
          capRateValueAdd: 45000,
          currency: "USD",
          quotes: [
            { id: "q3", contractorName: "ElectroSource LLC", price: 32500, quotedAt: "2026-03-10T09:45:00Z", status: "active" },
          ],
          completion: null,
          createdAt: "2026-03-05T14:20:00Z",
        },
        {
          id: "demo-3",
          userId: "demo-user",
          assetId: "demo-1",
          asset: { name: "FL Mixed Portfolio", location: "Miami, FL" },
          jobType: "Parking Lot Reseal",
          description: "Reseal and repair parking lot surface",
          tenderType: "competitive",
          status: "draft",
          scopeOfWorks: "Fill cracks, seal asphalt, repaint markings",
          accessNotes: "After hours work preferred",
          timing: "May 2026",
          targetStart: "2026-05-15",
          budgetEstimate: 18000,
          benchmarkLow: 15000,
          benchmarkHigh: 22000,
          benchmarkSource: "Parking lot specialists",
          capRateValueAdd: 8000,
          currency: "USD",
          quotes: [],
          completion: null,
          createdAt: "2026-03-12T11:00:00Z",
        },
      ],
    });
  }

  const orders = await prisma.workOrder.findMany({
    where: { userId: session.user.id },
    include: {
      asset: { select: { name: true, location: true } },
      quotes: { orderBy: { price: "asc" } },
      completion: { select: { contractorRatingGiven: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

// POST /api/user/work-orders — create a draft work order
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    jobType,
    tenderType,
    assetId,
    description,
    scopeOfWorks,
    accessNotes,
    timing,
    targetStart,
    budgetEstimate,
    benchmarkLow,
    benchmarkHigh,
    benchmarkSource,
    capRateValueAdd,
    autoTriggerFrom,
    autoTriggerRef,
  } = body;

  if (!jobType || !description) {
    return NextResponse.json({ error: "jobType and description are required" }, { status: 400 });
  }

  // Determine currency from the user's asset (or default GBP)
  let currency = "GBP";
  if (assetId) {
    const asset = await prisma.userAsset.findFirst({
      where: { id: assetId, userId: session.user.id },
      select: { country: true },
    });
    if (asset?.country === "US") currency = "USD";
  }

  const order = await prisma.workOrder.create({
    data: {
      userId: session.user.id,
      assetId: assetId || null,
      tenderType: tenderType || null,
      jobType,
      description,
      scopeOfWorks: scopeOfWorks || null,
      accessNotes: accessNotes || null,
      timing: timing || null,
      targetStart: targetStart || null,
      budgetEstimate: budgetEstimate ? Number(budgetEstimate) : null,
      benchmarkLow: benchmarkLow ? Number(benchmarkLow) : null,
      benchmarkHigh: benchmarkHigh ? Number(benchmarkHigh) : null,
      benchmarkSource: benchmarkSource || null,
      capRateValueAdd: capRateValueAdd ? Number(capRateValueAdd) : null,
      autoTriggerFrom: autoTriggerFrom || null,
      autoTriggerRef: autoTriggerRef || null,
      currency,
      status: "draft",
    },
    include: {
      asset: { select: { name: true, location: true } },
      quotes: true,
    },
  });

  return NextResponse.json({ order }, { status: 201 });
}
