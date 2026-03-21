import { NextResponse } from "next/server";

// OUTREACH FREEZE — Rule 1: No outreach until Wave 1 insurance is live with real carrier quotes.
export async function POST() {
  return NextResponse.json(
    { error: "Outreach frozen. Wave 1 insurance must be live before any outreach." },
    { status: 503 }
  );
}
