import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const BATCH_SIZE = 20;

// POST /api/admin/flush-email-queue — admin-authenticated cron trigger
// Called by the "Flush queue now" button in /admin/email-queue
export async function POST() {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: 0, message: "RESEND_API_KEY not configured" });
  }

  const now = new Date();
  const due = await prisma.scheduledEmail.findMany({
    where: { sentAt: null, sendAfter: { lte: now } },
    orderBy: { sendAfter: "asc" },
    take: BATCH_SIZE,
  });

  if (due.length === 0) return NextResponse.json({ sent: 0, failed: 0, total: 0 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  for (const email of due) {
    try {
      const unsub = await prisma.unsubscribe.findUnique({ where: { email: email.to.toLowerCase() } });
      if (unsub) {
        await prisma.scheduledEmail.update({ where: { id: email.id }, data: { sentAt: now } });
        sent++;
        continue;
      }
      await resend.emails.send({ from: email.from, to: email.to, subject: email.subject, html: email.html, text: email.text });
      await prisma.scheduledEmail.update({ where: { id: email.id }, data: { sentAt: now } });
      sent++;
    } catch (err) {
      console.error(`[flush-email-queue] Failed to send ${email.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: due.length });
}
