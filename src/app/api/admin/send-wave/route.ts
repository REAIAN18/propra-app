import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendColdOutreachEmail } from "@/lib/email";
import { WAVE1_FL_PROSPECTS } from "@/lib/wave1-fl-prospects";
import { WAVE1_SEUK_PROSPECTS } from "@/lib/wave1-seuk-prospects";

const ALL_PROSPECTS = {
  fl: WAVE1_FL_PROSPECTS,
  seuk: WAVE1_SEUK_PROSPECTS,
};

// Prospect name lookup for dry-run display (firstName + company)
function prospectDisplayName(prospectKey: string, market: "fl" | "seuk"): string {
  const list = ALL_PROSPECTS[market];
  const p = list.find((x) => x.prospectKey === prospectKey);
  return p ? `${p.firstName} ${p.company}` : prospectKey;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { market, wave, dryRun } = body;

  if ((market !== "fl" && market !== "seuk") || wave !== 1) {
    return NextResponse.json(
      { error: "Only wave=1 is supported. market must be 'fl' or 'seuk'." },
      { status: 400 }
    );
  }

  if (!dryRun && !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured — cannot send emails." },
      { status: 422 }
    );
  }

  const prospects = ALL_PROSPECTS[market as "fl" | "seuk"];
  const prospectKeys = prospects.map((p) => p.prospectKey);

  // Fetch existing ProspectStatus rows
  const existingRows = await prisma.prospectStatus.findMany({
    where: { prospectKey: { in: prospectKeys } },
  });
  const statusByKey = Object.fromEntries(existingRows.map((r) => [r.prospectKey, r]));

  // DB emailOverride takes precedence over static email
  function effectiveEmail(p: (typeof prospects)[number]): string {
    return statusByKey[p.prospectKey]?.emailOverride || p.email;
  }

  // Categorise — skip if already sent OR if no usable email
  const toSend = prospects.filter((p) => {
    const existing = statusByKey[p.prospectKey];
    return !existing?.emailSent && !!effectiveEmail(p);
  });
  const toSkip = prospects
    .filter((p) => {
      const existing = statusByKey[p.prospectKey];
      return existing?.emailSent || !effectiveEmail(p);
    })
    .map((p) => ({
      prospectKey: p.prospectKey,
      reason: statusByKey[p.prospectKey]?.emailSent ? "Already sent" : "No email address",
    }));

  // Dry run — return preview without sending
  if (dryRun) {
    const warnings: string[] = [];
    if (!process.env.RESEND_API_KEY) warnings.push("RESEND_API_KEY not set — emails will queue but not deliver");
    if (!process.env.OUTREACH_EMAIL_FROM) warnings.push("OUTREACH_EMAIL_FROM not set — using fallback sender address");
    if (!process.env.CAL_LINK && !process.env.NEXT_PUBLIC_CAL_LINK) warnings.push("CAL_LINK not set — booking links will use default cal.com/realhq/portfolio-review URL");
    if (!process.env.CRON_SECRET) warnings.push("CRON_SECRET not set — email delivery cron is unprotected");

    return NextResponse.json({
      dryRun: true,
      warnings,
      wouldSend: toSend.length,
      skipped: toSkip.length,
      prospects: toSend.map((p) => ({
        prospectKey: p.prospectKey,
        name: prospectDisplayName(p.prospectKey, market as "fl" | "seuk"),
        email: effectiveEmail(p),
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
        email: effectiveEmail(p),
        firstName: p.firstName,
        company: p.company,
        assetCount: p.assetCount,
        area: p.area,
        touch: 1,
        market: market as "fl" | "seuk",
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
