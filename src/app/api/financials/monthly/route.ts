/**
 * GET /api/financials/monthly?assetId=X&year=Y
 * Returns monthly financial data for a specific asset and year (YTD)
 *
 * Response: { months[], totals }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");
  const year = searchParams.get("year");

  if (!assetId) {
    return NextResponse.json(
      { error: "assetId is required" },
      { status: 400 }
    );
  }

  const currentYear = year ? parseInt(year) : new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  try {
    // Verify asset belongs to user
    const asset = await prisma.userAsset.findFirst({
      where: { id: assetId, userId: session.user.id },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found or unauthorized" },
        { status: 404 }
      );
    }

    // Fetch monthly financials for the year (YTD)
    const rows = await prisma.monthlyFinancial.findMany({
      where: {
        userId: session.user.id,
        assetId,
        year: currentYear,
        month: { lte: currentMonth },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const months = rows.map((r) => ({
      month: r.month,
      year: r.year,
      label: `${MONTH_LABELS[r.month - 1]} ${r.year}`,
      grossRevenue: r.grossRevenue,
      operatingCosts: r.operatingCosts,
      noi: r.noi,
      insuranceCost: r.insuranceCost,
      energyCost: r.energyCost,
      maintenanceCost: r.maintenanceCost,
      source: r.source,
    }));

    // Calculate YTD totals
    const totals = months.reduce(
      (acc, m) => ({
        grossRevenue: acc.grossRevenue + m.grossRevenue,
        operatingCosts: acc.operatingCosts + m.operatingCosts,
        noi: acc.noi + m.noi,
        insuranceCost: acc.insuranceCost + m.insuranceCost,
        energyCost: acc.energyCost + m.energyCost,
        maintenanceCost: acc.maintenanceCost + m.maintenanceCost,
      }),
      {
        grossRevenue: 0,
        operatingCosts: 0,
        noi: 0,
        insuranceCost: 0,
        energyCost: 0,
        maintenanceCost: 0,
      }
    );

    return NextResponse.json({
      months,
      totals,
      hasData: months.length > 0,
      year: currentYear,
      monthsYTD: currentMonth,
    });
  } catch (error) {
    console.error("Error fetching monthly financials:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly financials" },
      { status: 500 }
    );
  }
}
