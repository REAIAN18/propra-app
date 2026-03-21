import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendColdOutreachEmail } from "@/lib/email";
import { WAVE1_FL_PROSPECTS } from "@/lib/wave1-fl-prospects";

// FL_PROSPECTS name lookup for dry-run display (firstName + company)
function prospectDisplayName(prospectKey: string): string {
  const p = WAVE1_FL_PROSPECTS.find((x) => x.prospectKey === prospectKey);
  return p ? `${p.firstName} ${p.company}` : prospectKey;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { market, wave, dryRun } = body;

  if (market !== "fl" || wave !== 1) {
    return NextResponse.json(
      { error: "Only market=fl and wave=1 supported right now." },
      { status: 400 }
    );
  }

  if (!dryRun && !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured — cannot send emails." },
      { status: 422 }
    );
  }

  const prospects = WAVE1_FL_PROSPECTS;
  const prospectKeys = prospects.map((p) => p.prospectKey);

  // Fetch existing ProspectStatus rows
  const existingRows = await prisma.prospectStatus.findMany({
    where: { prospectKey: { in: prospectKeys } },
  });
  const statusByKey = Object.fromEntries(existingRows.map((r) => [r.prospectKey, r]));

  // Categorise
  const toSend = prospects.filter((p) => {
    const existing = statusByKey[p.prospectKey];
    return !existing?.emailSent;
  });
  const toSkip = prospects
    .filter((p) => {
      const existing = statusByKey[p.prospectKey];
      return existing?.emailSent;
    })
    .map((p) => ({ prospectKey: p.prospectKey, reason: "Already sent" }));

  // Dry run — return preview without sending
  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldSend: toSend.length,
      skipped: toSkip.length,
      prospects: toSend.map((p) => ({
        prospectKey: p.prospectKey,
        name: prospectDisplayName(p.prospectKey),
        email: p.email,
        company: p.company,
      })),
      skippedProspects: toSkip,
    });
  }

  // Live send
  const now = new Date();
  const nowIso = now.toISOString();
  let queued = 0;

  for (const p of toSend) {
    try {
      await sendColdOutreachEmail({
        email: p.email,
        firstName: p.firstName,
        company: p.company,
        assetCount: p.assetCount,
        area: p.area,
        touch: 1,
        market: "fl",
        prospectKey: p.prospectKey,
        scheduleAfter: now, // queue via ScheduledEmail (cron picks up)
      });

      await prisma.prospectStatus.upsert({
        where: { prospectKey: p.prospectKey },
        create: {
          prospectKey: p.prospectKey,
          status: "contacted",
          emailSent: true,
          touch1SentAt: nowIso,
          lastContact: nowIso,
          updatedBy: session.user?.email ?? null,
        },
        update: {
          status: "contacted",
          emailSent: true,
          touch1SentAt: nowIso,
          lastContact: nowIso,
          updatedBy: session.user?.email ?? null,
        },
      });

      queued++;
    } catch (err) {
      console.error(`[send-wave] Failed to queue ${p.prospectKey}:`, err);
    }
  }

  return NextResponse.json({ ok: true, queued, skipped: toSkip.length });
}
