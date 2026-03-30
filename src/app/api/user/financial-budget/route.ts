import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // TODO: Implement real data fetching from FinancialBudget model
    // For now, return stub response
    return NextResponse.json({
      budgets: [],
    });
  } catch (error) {
    console.error("Error in GET /api/user/financial-budget:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
