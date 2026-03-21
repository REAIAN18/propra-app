import { NextResponse } from "next/server";

// OUTREACH FREEZE — Resend outreach webhook disabled.
// Will be re-enabled when Wave 1 insurance is live and outreach is permitted.
export async function POST() {
  return NextResponse.json({ received: true });
}
