import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!session?.user?.email) {
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

  // TODO: Fetch real data from MonthlyFinancial, Lease, CapexPlan, Loan
  return NextResponse.json({ months: [] });
}
