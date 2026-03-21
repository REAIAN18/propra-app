import { NextResponse } from "next/server";
// OUTREACH FREEZE — Rule 1
export async function GET() {
  return NextResponse.json(
    { sent: 0, message: "Outreach frozen. Wave 1 insurance must be live before any outreach." },
    { status: 503 }
  );
}
