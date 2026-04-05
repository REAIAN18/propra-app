import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!session?.user?.email || !assetId) {
    return NextResponse.json({ budgets: [] });
  }

  // TODO: Fetch real data from FinancialBudget + MonthlyFinancial after migration
  return NextResponse.json({ budgets: [] });
}
