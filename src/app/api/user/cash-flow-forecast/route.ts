import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // TODO: Implement real data fetching from MonthlyFinancial, FinancialBudget, CapexPlan, and Loan models
    // For now, return stub response
    return NextResponse.json({
      months: [],
    });
  } catch (error) {
    console.error("Error in GET /api/user/cash-flow-forecast:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
