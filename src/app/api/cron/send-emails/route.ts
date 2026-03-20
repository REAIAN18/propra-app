import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 20;

// GET /api/cron/send-emails
// Called by an external cron (e.g. cron-job.org every 30 min) to flush the email queue.
// Protect with CRON_SECRET env var — pass as ?secret=<value> or Authorization: Bearer <value>.
export async function GET(req: NextRequest) {
  // Auth check — skip if CRON_SECRET not configured (dev fallback)
  if (CRON_SECRET) {
    const headerSecret = req.headers.get("authorization")?.replace("Bearer ", "");
    const querySecret = req.nextUrl.searchParams.get("secret");
    if (headerSecret !== CRON_SECRET && querySecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: 0, message: "RESEND_API_KEY not configured" });
  }

  const now = new Date();

  // Fetch a batch of unsent emails that are due
  const due = await prisma.scheduledEmail.findMany({
    where: { sentAt: null, sendAfter: { lte: now } },
    orderBy: { sendAfter: "asc" },
    take: BATCH_SIZE,
  });

  if (due.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const email of due) {
    // Check unsubscribe before sending
    try {
      const unsub = await prisma.unsubscribe.findUnique({ where: { email: email.to.toLowerCase() } });
      if (unsub) {
        // Mark as sent so it's not retried
        await prisma.scheduledEmail.update({ where: { id: email.id }, data: { sentAt: now } });
        results.push({ id: email.id, ok: true, error: "unsubscribed — skipped" });
        continue;
      }
    } catch {
      // Don't block on DB error
    }

    try {
      await resend.emails.send({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      await prisma.scheduledEmail.update({ where: { id: email.id }, data: { sentAt: now } });

      // Update prospect touch timestamps if this is a sequenced outreach email
      if (email.prospectKey && email.touchNumber) {
        const today = now.toISOString().split("T")[0];
        const touchField =
          email.touchNumber === 2 ? "touch2SentAt" :
          email.touchNumber === 3 ? "touch3SentAt" : null;
        if (touchField) {
          await prisma.prospectStatus.upsert({
            where: { prospectKey: email.prospectKey },
            update: { [touchField]: today, emailSent: true, lastContact: today },
            create: {
              prospectKey: email.prospectKey,
              status: "contacted",
              emailSent: true,
              [touchField]: today,
              lastContact: today,
            },
          }).catch((e) => console.error("[cron] prospect status update failed:", e));
        }
      }

      results.push({ id: email.id, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/send-emails] Failed to send ${email.id} to ${email.to}:`, msg);
      results.push({ id: email.id, ok: false, error: msg });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`[cron/send-emails] sent=${sent} failed=${failed} batch=${due.length}`);

  return NextResponse.json({ sent, failed, total: due.length });
}
