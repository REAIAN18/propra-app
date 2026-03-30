import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!session?.user?.email || !assetId) {
    // Demo data for 12-month forecast
    return NextResponse.json({
      months: [
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
      ],
    });
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get monthly debt payment (constant across all months)
    const loans = await prisma.loan.findMany({
      where: { assetId },
    });
    const debt = loans.reduce((sum, loan) => sum + (loan.monthlyPayment || 0), 0);

    // Fetch 12-month actuals/projections from MonthlyFinancial
    const months = [];
    for (let i = 0; i < 12; i++) {
      let m = currentMonth + i;
      let y = currentYear;
      if (m > 12) {
        m -= 12;
        y += 1;
      }

      const financial = await prisma.monthlyFinancial.findFirst({
        where: { assetId, month: m, year: y },
      });

      const monthLabel = new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      months.push({
        month: monthLabel,
        revenue: financial?.grossRevenue ?? 0,
        opex: financial?.operatingCosts ?? 0,
        noi: financial?.noi ?? 0,
        debt: Math.round(debt),
        capex: 0, // TODO: aggregate from capexPlan
        netCash: Math.round((financial?.noi ?? 0) - debt),
      });
    }

    return NextResponse.json({ months });
  } catch (error) {
    console.error("Error fetching cash flow forecast:", error);
    return NextResponse.json({ months: [] }, { status: 500 });
  }
}
