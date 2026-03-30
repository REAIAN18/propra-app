import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // TODO: Implement real data fetching from CapexPlan model
    // For now, return stub response
    return NextResponse.json({
      plans: [],
    });
  } catch (error) {
    console.error("Error in GET /api/user/capex-plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
