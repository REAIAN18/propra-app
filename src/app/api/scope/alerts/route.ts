import { NextResponse } from "next/server";

export async function GET() {
  try {
    // In demo mode without authentication, return empty alerts
    // In production, would fetch user's alerts from AlertEvent model
    return NextResponse.json({
      alerts: [],
    });
  } catch (error) {
    console.error("Alerts fetch error:", error);
    return NextResponse.json({ alerts: [] });
  }
}
