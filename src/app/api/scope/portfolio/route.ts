import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // In demo mode without authentication, return empty portfolio
    // In production, would fetch user's portfolio properties
    return NextResponse.json({
      items: [],
    });
  } catch (error) {
    console.error("Portfolio fetch error:", error);
    return NextResponse.json({ items: [] });
  }
}
