import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all watched properties for the user
    // In demo mode without authentication, return empty array
    return NextResponse.json({
      watchlist: [],
    });
  } catch (error) {
    console.error("Watchlist fetch error:", error);
    return NextResponse.json({ watchlist: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, reason } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId required" },
        { status: 400 }
      );
    }

    // Add property to watchlist
    // In demo mode without authentication, just return a mock
    return NextResponse.json({
      id: "watch_" + Date.now(),
      propertyId,
      reason,
      addedAt: new Date(),
    });
  } catch (error) {
    console.error("Watchlist add error:", error);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId required" },
        { status: 400 }
      );
    }

    // Remove from watchlist
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist remove error:", error);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}
