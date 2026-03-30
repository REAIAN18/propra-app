import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const coverforceEnabled = process.env.COVERFORCE_ENABLED === "true";

  // Return config for both authenticated and demo users
  return NextResponse.json({ coverforceEnabled });
}
