import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all saved searches/mandates for the user
    // In demo mode without authentication, return empty array
    return NextResponse.json({
      mandates: [],
    });
  } catch (error) {
    console.error("Mandates fetch error:", error);
    return NextResponse.json({ mandates: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, criteria } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name required" },
        { status: 400 }
      );
    }

    // Create a new mandate (SavedSearch)
    // In demo mode without authentication, just return a mock
    return NextResponse.json({
      id: "mandate_" + Date.now(),
      name,
      criteria,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Mandate create error:", error);
    return NextResponse.json({ error: "Failed to create mandate" }, { status: 500 });
  }
}
