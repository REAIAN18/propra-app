import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const assetId = req.nextUrl.searchParams.get("assetId");
    const currentYear = new Date().getFullYear();

    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }

    // Unauthenticated: return demo data
    if (!session?.user?.id) {
      return NextResponse.json({
        budgets: [
          { category: "Gross Revenue", budgeted: 115500, actual: 115500, variance: 0, pct: 0, status: "on_target" },
          { category: "Insurance", budgeted: 9500, actual: 9900, variance: 400, pct: 4.2, status: "over" },
          { category: "Energy", budgeted: 12000, actual: 14800, variance: 2800, pct: 23.3, status: "over" },
          { category: "Maintenance", budgeted: 8000, actual: 6800, variance: -1200, pct: -15, status: "under" },
        ],
      });
    }

    // Authenticated: fetch from database
    const budget = await prisma.financialBudget.findUnique({
      where: { assetId_year: { assetId, year: currentYear } },
    });

    // If no budget yet, return empty
    if (!budget) {
      return NextResponse.json({ budgets: [] });
    }

    // Get YTD actuals from MonthlyFinancial
    const currentMonth = new Date().getMonth() + 1;
    const actuals = await prisma.monthlyFinancial.findMany({
      where: {
        assetId,
        year: currentYear,
        month: { lte: currentMonth },
      },
    });

    // Aggregate YTD actuals
    const ytdActuals = actuals.reduce(
      (sum, m) => ({
        revenue: sum.revenue + m.grossRevenue,
        opex: sum.opex + m.operatingCosts,
        insurance: sum.insurance + m.insuranceCost,
        energy: sum.energy + m.energyCost,
        maintenance: sum.maintenance + m.maintenanceCost,
      }),
      { revenue: 0, opex: 0, insurance: 0, energy: 0, maintenance: 0 }
    );

    // Calculate month-to-date proportion of annual budget
    const monthPct = currentMonth / 12;
    const budgetedRevenue = budget.budgetedRevenue * monthPct;
    const budgetedInsurance = budget.budgetedInsurance * monthPct;
    const budgetedEnergy = budget.budgetedEnergy * monthPct;
    const budgetedMaintenance = budget.budgetedMaintenance * monthPct;

    return NextResponse.json({
      budgets: [
        {
          category: "Gross Revenue",
          budgeted: budgetedRevenue,
          actual: ytdActuals.revenue,
          variance: ytdActuals.revenue - budgetedRevenue,
          pct: budgetedRevenue > 0 ? ((ytdActuals.revenue - budgetedRevenue) / budgetedRevenue) * 100 : 0,
          status: ytdActuals.revenue >= budgetedRevenue ? "on_target" : "under",
        },
        {
          category: "Insurance",
          budgeted: budgetedInsurance,
          actual: ytdActuals.insurance,
          variance: ytdActuals.insurance - budgetedInsurance,
          pct: budgetedInsurance > 0 ? ((ytdActuals.insurance - budgetedInsurance) / budgetedInsurance) * 100 : 0,
          status: ytdActuals.insurance <= budgetedInsurance ? "on_target" : "over",
        },
        {
          category: "Energy",
          budgeted: budgetedEnergy,
          actual: ytdActuals.energy,
          variance: ytdActuals.energy - budgetedEnergy,
          pct: budgetedEnergy > 0 ? ((ytdActuals.energy - budgetedEnergy) / budgetedEnergy) * 100 : 0,
          status: ytdActuals.energy <= budgetedEnergy ? "on_target" : "over",
        },
        {
          category: "Maintenance",
          budgeted: budgetedMaintenance,
          actual: ytdActuals.maintenance,
          variance: ytdActuals.maintenance - budgetedMaintenance,
          pct: budgetedMaintenance > 0 ? ((ytdActuals.maintenance - budgetedMaintenance) / budgetedMaintenance) * 100 : 0,
          status: ytdActuals.maintenance <= budgetedMaintenance ? "on_target" : "over",
        },
      ],
    });
  } catch (error) {
    console.error("Error in GET /api/user/financial-budget:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
