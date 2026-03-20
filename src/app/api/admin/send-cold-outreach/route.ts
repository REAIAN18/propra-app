import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendColdOutreachEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, firstName, company, assetCount, area, touch, market, prospectKey } = body;

    if (!email?.trim() || !firstName?.trim() || !area?.trim() || !assetCount) {
      return NextResponse.json(
        { error: "email, firstName, area, and assetCount are required." },
        { status: 400 }
      );
    }

    if (touch !== 1 && touch !== 2 && touch !== 3) {
      return NextResponse.json({ error: "touch must be 1, 2, or 3." }, { status: 400 });
    }

    if (market !== "fl" && market !== "seuk") {
      return NextResponse.json({ error: "market must be fl or seuk." }, { status: 400 });
    }

    const scheduleAfterDate = body.scheduleAfter ? new Date(body.scheduleAfter) : undefined;

    await sendColdOutreachEmail({
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      company: company?.trim() || null,
      assetCount: Number(assetCount),
      area: area.trim(),
      touch,
      market,
      prospectKey: prospectKey ?? undefined,
      scheduleAfter: scheduleAfterDate,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-cold-outreach]", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
