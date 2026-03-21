import { NextResponse } from "next/server";
// OUTREACH FREEZE — Rule 1
export async function POST() {
  return NextResponse.json(
    { error: "Outreach frozen. Wave 1 insurance must be live before any outreach." },
    { status: 503 }
  );
}
