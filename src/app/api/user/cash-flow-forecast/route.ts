import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const assetId = req.nextUrl.searchParams.get("assetId");
    const currentDate = new Date();
    const startMonth = currentDate.getMonth() + 1;
    const startYear = currentDate.getFullYear();

    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }

    // Unauthenticated: return demo data (12 months)
    if (!session?.user?.id) {
      const demoMonths = [
        { month: "Apr 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "May 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "Jun 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 15000, netCash: -7600 },
        { month: "Jul 26", revenue: 30500, opex: 12300, noi: 18200, debt: 18800, capex: 0, netCash: -600 },
        { month: "Aug 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "Sep 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "Oct 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "Nov 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 35000, netCash: -27600 },
        { month: "Dec 26", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "Jan 27", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "Feb 27", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
        { month: "Mar 27", revenue: 38500, opex: 12300, noi: 26200, debt: 18800, capex: 0, netCash: 7400 },
      ];
      return NextResponse.json({ months: demoMonths });
    }

    // Authenticated: fetch from database
    const budget = await prisma.financialBudget.findUnique({
      where: { assetId_year: { assetId, year: startYear } },
    });

    const loans = await prisma.loan.findMany({
      where: { assetId },
    });

    const capexPlans = await prisma.capexPlan.findMany({
      where: { assetId },
    });

    // Get annual revenue from leases
    const leases = await prisma.lease.findMany({
      where: { assetId, isActive: true },
    });

    const monthlyRevenue = leases.reduce((sum, lease) => sum + (lease.monthlyRent || 0), 0);
    const monthlyDebtService = loans.reduce((sum, loan) => sum + (loan.monthlyPayment || 0), 0);

    // Build 12-month forecast
    const months = [];
    for (let i = 0; i < 12; i++) {
      const forecastMonth = (startMonth + i) % 12 || 12;
      const forecastYear = startYear + Math.floor((startMonth + i - 1) / 12);
      const monthDate = new Date(forecastYear, forecastMonth - 1, 1);
      const monthLabel = monthDate
        .toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        .replace(" ", " ");

      // Budget OpEx for the month
      const monthlyOpex = budget ? budget.budgetedOpEx / 12 : 0;

      // Capex for the month
      const monthCapex = capexPlans
        .filter((cp) => {
          const cpMonth = cp.scheduledDate.getMonth() + 1;
          const cpYear = cp.scheduledDate.getFullYear();
          return cpMonth === forecastMonth && cpYear === forecastYear;
        })
        .reduce((sum, cp) => sum + cp.estimatedCost, 0);

      const noi = monthlyRevenue - monthlyOpex;
      const netCash = noi - monthlyDebtService - monthCapex;

      months.push({
        month: monthLabel,
        revenue: Math.round(monthlyRevenue * 100) / 100,
        opex: Math.round(monthlyOpex * 100) / 100,
        noi: Math.round(noi * 100) / 100,
        debt: Math.round(monthlyDebtService * 100) / 100,
        capex: Math.round(monthCapex * 100) / 100,
        netCash: Math.round(netCash * 100) / 100,
      });
    }

    return NextResponse.json({ months });
  } catch (error) {
    console.error("Error in GET /api/user/cash-flow-forecast:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
