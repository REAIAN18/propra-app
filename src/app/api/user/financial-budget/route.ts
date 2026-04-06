/**
 * GET  /api/user/financial-budget?year=2026
 *   Returns BudgetRow[] comparing annual budget to YTD actuals from MonthlyFinancial.
 *
 * POST /api/user/financial-budget
 *   Body: { year, budgetedRevenue, budgetedInsurance, budgetedEnergy, budgetedMaintenance, budgetedManagement }
 *   Creates or updates the portfolio-level annual budget for the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface BudgetRow {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  pct: number;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ budgets: [], year: null });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : 12; // months elapsed

  // Load budget for this year
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budget = await (prisma as any).financialBudget
    .findUnique({ where: { userId_year: { userId: session.user.id, year } } })
    .catch(() => null);

  // Load YTD actuals from MonthlyFinancial (Jan–currentMonth of this year)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actuals = await (prisma as any).monthlyFinancial
    .findMany({
      where: {
        userId: session.user.id,
        year,
        month: { lte: currentMonth },
      },
    })
    .catch(() => []);

  // Aggregate actuals
  let ytdRevenue = 0;
  let ytdInsurance = 0;
  let ytdEnergy = 0;
  let ytdMaintenance = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of actuals as any[]) {
    ytdRevenue     += r.grossRevenue     ?? 0;
    ytdInsurance   += r.insuranceCost   ?? 0;
    ytdEnergy      += r.energyCost      ?? 0;
    ytdMaintenance += r.maintenanceCost ?? 0;
  }

  const ytdOpEx = ytdInsurance + ytdEnergy + ytdMaintenance;

  if (!budget) {
    // No budget set — return actuals only (budgeted = 0)
    return NextResponse.json({
      budgets: [],
      year,
      hasBudget: false,
    });
  }

  // Pro-rate annual budget to YTD (months elapsed / 12)
  const fraction = currentMonth / 12;
  const proRate = (annual: number) => Math.round(annual * fraction);

  const rows: BudgetRow[] = [
    buildRow("Gross Revenue", proRate(budget.budgetedRevenue), ytdRevenue),
    buildRow("Insurance",     proRate(budget.budgetedInsurance), ytdInsurance),
    buildRow("Energy",        proRate(budget.budgetedEnergy), ytdEnergy),
    buildRow("Maintenance",   proRate(budget.budgetedMaintenance), ytdMaintenance),
    buildRow("Management",    proRate(budget.budgetedManagement), 0), // no actual source yet
    buildRow("Total OpEx",    proRate(budget.budgetedOpEx), ytdOpEx),
  ];

  return NextResponse.json({ budgets: rows, year, hasBudget: true });
}

function buildRow(category: string, budgeted: number, actual: number): BudgetRow {
  const variance = actual - budgeted;
  const pct = budgeted > 0 ? Math.round((variance / budgeted) * 100) : 0;
  return { category, budgeted, actual, variance, pct };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    year,
    budgetedRevenue    = 0,
    budgetedInsurance  = 0,
    budgetedEnergy     = 0,
    budgetedMaintenance = 0,
    budgetedManagement = 0,
  } = body;

  if (!year || typeof year !== "number") {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  const budgetedOpEx = budgetedInsurance + budgetedEnergy + budgetedMaintenance + budgetedManagement;
  const budgetedNOI  = budgetedRevenue - budgetedOpEx;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budget = await (prisma as any).financialBudget.upsert({
    where: { userId_year: { userId: session.user.id, year } },
    create: {
      userId: session.user.id,
      year,
      budgetedRevenue,
      budgetedOpEx,
      budgetedNOI,
      budgetedInsurance,
      budgetedEnergy,
      budgetedMaintenance,
      budgetedManagement,
    },
    update: {
      budgetedRevenue,
      budgetedOpEx,
      budgetedNOI,
      budgetedInsurance,
      budgetedEnergy,
      budgetedMaintenance,
      budgetedManagement,
    },
  });

  return NextResponse.json({ budget }, { status: 201 });
}
