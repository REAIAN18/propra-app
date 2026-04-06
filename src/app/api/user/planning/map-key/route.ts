/**
 * GET /api/user/planning/map-key
 * Returns Google Maps API key for authenticated users.
 * Used by the Planning page to initialise the Google Maps JS API client-side.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ key: null }, { status: 401 });
  }
  return NextResponse.json({ key: process.env.GOOGLE_MAPS_API_KEY ?? null });
}
