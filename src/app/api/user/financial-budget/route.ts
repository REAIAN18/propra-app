import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!session?.user?.email || !assetId) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      budgets: [
        {
          category: "Gross Revenue",
          budgeted: 115500,
          actual: 115500,
          variance: 0,
          pct: 0,
        },
        {
          category: "Insurance",
          budgeted: 9500,
          actual: 9900,
          variance: 400,
          pct: 4,
        },
        {
          category: "Energy",
          budgeted: 12000,
          actual: 14800,
          variance: 2800,
          pct: 23,
        },
        {
          category: "Maintenance",
          budgeted: 8000,
          actual: 6800,
          variance: -1200,
          pct: -15,
        },
      ],
    });
  }

  // TODO: Fetch real data from FinancialBudget + MonthlyFinancial after migration
  // For now return demo data
  return NextResponse.json({
    budgets: [
      {
        category: "Gross Revenue",
        budgeted: 115500,
        actual: 115500,
        variance: 0,
        pct: 0,
      },
      {
        category: "Insurance",
        budgeted: 9500,
        actual: 9900,
        variance: 400,
        pct: 4,
      },
      {
        category: "Energy",
        budgeted: 12000,
        actual: 14800,
        variance: 2800,
        pct: 23,
      },
      {
        category: "Maintenance",
        budgeted: 8000,
        actual: 6800,
        variance: -1200,
        pct: -15,
      },
    ],
  });
}
