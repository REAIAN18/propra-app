import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { renderColdOutreachEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, firstName, company, assetCount, area, touch, market, prospectKey } = body;

  if (!email || !firstName || !area || !assetCount) {
    return NextResponse.json({ error: "email, firstName, area, and assetCount are required." }, { status: 400 });
  }

  if (touch !== 1 && touch !== 2 && touch !== 3) {
    return NextResponse.json({ error: "touch must be 1, 2, or 3." }, { status: 400 });
  }

  if (market !== "fl" && market !== "seuk") {
    return NextResponse.json({ error: "market must be fl or seuk." }, { status: 400 });
  }

  const rendered = renderColdOutreachEmail({
    email,
    firstName,
    company: company ?? null,
    assetCount: Number(assetCount),
    area,
    touch,
    market,
    prospectKey,
  });

  return NextResponse.json({
    subject: rendered.subject,
    html: rendered.html,
    to: email,
    prospectName: firstName,
  });
}
