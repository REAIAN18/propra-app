import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const coverforceEnabled = process.env.COVERFORCE_ENABLED === "true";

  return NextResponse.json({ coverforceEnabled });
}
