import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendColdOutreachEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { WAVE1_FL_PROSPECTS } from "@/lib/wave1-fl-prospects";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // ── Batch wave mode: { market, wave, dryRun? } ───────────────────────────
  if (body.wave !== undefined) {
    const { market, wave, dryRun = false } = body as {
      market: string;
      wave: number;
      dryRun?: boolean;
    };

    if (market !== "fl") {
      return NextResponse.json({ error: "Only market=fl is supported for batch wave sends." }, { status: 400 });
    }
    if (wave !== 1) {
      return NextResponse.json({ error: "Only wave=1 is supported." }, { status: 400 });
    }

    // Load existing prospect statuses to detect already-sent
    const statusRows = await prisma.prospectStatus.findMany({
      where: { prospectKey: { in: WAVE1_FL_PROSPECTS.map((p) => p.prospectKey) } },
    });
    const statusMap = new Map(statusRows.map((r) => [r.prospectKey, r]));

    const toSend: typeof WAVE1_FL_PROSPECTS = [];
    const skipped: Array<{ prospectKey: string; reason: string }> = [];

    for (const prospect of WAVE1_FL_PROSPECTS) {
      if (!prospect.email) {
        skipped.push({ prospectKey: prospect.prospectKey, reason: "no email address" });
        continue;
      }
      const existing = statusMap.get(prospect.prospectKey);
      if (existing?.emailSent) {
        skipped.push({ prospectKey: prospect.prospectKey, reason: "already emailed (emailSent=true)" });
        continue;
      }
      toSend.push(prospect);
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        queued: 0,
        skipped: skipped.length,
        wouldSend: toSend.length,
        prospects: toSend.map((p) => ({
          prospectKey: p.prospectKey,
          name: p.firstName,
          email: p.email,
          company: p.company,
        })),
        skippedProspects: skipped,
      });
    }

    // Live send — queue each via scheduledEmail + upsert ProspectStatus
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let queued = 0;
    const results: Array<{ prospectKey: string; ok: boolean; error?: string }> = [];

    for (const prospect of toSend) {
      try {
        // Queue Touch 1 (immediate), Touch 2 (+7 days), Touch 3 (+14 days)
        const t2Date = new Date(now); t2Date.setDate(t2Date.getDate() + 7);
        const t3Date = new Date(now); t3Date.setDate(t3Date.getDate() + 14);
        const emailArg = {
          email: prospect.email,
          firstName: prospect.firstName,
          company: prospect.company,
          assetCount: prospect.assetCount,
          area: prospect.area,
          market: "fl" as const,
          prospectKey: prospect.prospectKey,
        };
        await sendColdOutreachEmail({ ...emailArg, touch: 1, scheduleAfter: now });
        await sendColdOutreachEmail({ ...emailArg, touch: 2, scheduleAfter: t2Date });
        await sendColdOutreachEmail({ ...emailArg, touch: 3, scheduleAfter: t3Date });

        await prisma.prospectStatus.upsert({
          where: { prospectKey: prospect.prospectKey },
          create: {
            prospectKey: prospect.prospectKey,
            status: "contacted",
            emailSent: true,
            touch1SentAt: today,
            lastContact: today,
            updatedBy: session.user?.email ?? null,
          },
          update: {
            status: "contacted",
            emailSent: true,
            touch1SentAt: today,
            lastContact: today,
            updatedBy: session.user?.email ?? null,
          },
        });

        queued++;
        results.push({ prospectKey: prospect.prospectKey, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[send-cold-outreach/wave] failed for ${prospect.prospectKey}:`, err);
        results.push({ prospectKey: prospect.prospectKey, ok: false, error: msg });
      }
    }

    return NextResponse.json({
      dryRun: false,
      queued,
      skipped: skipped.length,
      prospects: results,
      skippedProspects: skipped,
    });
  }

  // ── Single-prospect mode (existing behaviour) ─────────────────────────────
  try {
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
