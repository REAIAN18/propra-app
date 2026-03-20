import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendColdOutreachEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
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
    const autoSchedule = !!body.autoSchedule; // when true + touch===1: also queue T2 (+4d) and T3 (+8d)

    const emailArg = {
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      company: company?.trim() || null,
      assetCount: Number(assetCount),
      area: area.trim(),
      market,
      prospectKey: prospectKey ?? undefined,
    };

    await sendColdOutreachEmail({ ...emailArg, touch, scheduleAfter: scheduleAfterDate });

    // Auto-schedule T2 and T3 when requested
    if (autoSchedule && touch === 1) {
      const t2Date = new Date(); t2Date.setDate(t2Date.getDate() + 4);
      const t3Date = new Date(); t3Date.setDate(t3Date.getDate() + 8);
      await Promise.all([
        sendColdOutreachEmail({ ...emailArg, touch: 2, scheduleAfter: t2Date }),
        sendColdOutreachEmail({ ...emailArg, touch: 3, scheduleAfter: t3Date }),
      ]);
    }

    return NextResponse.json({ ok: true, autoScheduled: autoSchedule && touch === 1 });
  } catch (err) {
    console.error("[send-cold-outreach]", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
