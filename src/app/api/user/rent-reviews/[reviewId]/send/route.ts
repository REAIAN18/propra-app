/**
 * POST /api/user/rent-reviews/:reviewId/send
 * Sends an approved draft to the tenant (or owner) via Resend.
 * Creates a RenewalCorrespondence record with sentAt timestamp.
 * Updates the RentReviewEvent status to "draft_sent".
 *
 * Body: { type: string; body: string; recipientEmail: string; correspondenceId?: string }
 * Response: { success: true; correspondenceId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import type { RentReviewEvent, RenewalCorrespondence } from "@/generated/prisma";

type PrismaWithRentReview = {
  rentReviewEvent: {
    findFirst(q: object): Promise<RentReviewEvent | null>;
    update(q: object): Promise<RentReviewEvent>;
  };
  renewalCorrespondence: {
    create(q: object): Promise<RenewalCorrespondence>;
    update(q: object): Promise<RenewalCorrespondence>;
  };
};

function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { reviewId } = await params;
  const body = await req.json() as {
    type: string;
    body: string;
    recipientEmail: string;
    correspondenceId?: string;
  };

  if (!body.recipientEmail || !body.body) {
    return NextResponse.json({ error: "recipientEmail and body are required" }, { status: 400 });
  }

  const db = prisma as unknown as PrismaWithRentReview;

  const review = await db.rentReviewEvent.findFirst({
    where: { id: reviewId, userId: user.id },
  } as object);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  // PRO-695 Gap 3: Save tenant email if provided and different from stored email
  if (review.leaseId && body.recipientEmail) {
    const lease = await (prisma as { lease: { findUnique(q: object): Promise<{ tenantId: string } | null> } }).lease.findUnique({
      where: { id: review.leaseId },
      select: { tenantId: true },
    } as object);

    if (lease?.tenantId) {
      const tenant = await (prisma as { tenant: { findUnique(q: object): Promise<{ email: string | null } | null> } }).tenant.findUnique({
        where: { id: lease.tenantId },
        select: { email: true },
      } as object);

      // Only update if email is missing or different
      if (tenant && tenant.email !== body.recipientEmail) {
        await (prisma as { tenant: { update(q: object): Promise<unknown> } }).tenant.update({
          where: { id: lease.tenantId },
          data: { email: body.recipientEmail },
        } as object);
      }
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const typeLabel: Record<string, string> = {
    renewal_letter: "Lease Renewal Notice",
    section_25:     "Section 25 Notice",
    hot:            "Heads of Terms",
    reminder:       "Lease Renewal Reminder",
  };
  const subject = `${typeLabel[body.type] ?? "Correspondence"}: ${review.propertyAddress ?? review.tenantName}`;

  const now = new Date();
  const resend = new Resend(resendKey);

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@realhq.co";

  // Send email and capture message ID for webhook tracking (PRO-695 Gap 4)
  const emailResult = await resend.emails.send({
    from:    fromAddress,
    to:      body.recipientEmail,
    subject,
    html:    markdownToHtml(body.body),
    text:    body.body,
  });

  const resendMessageId = emailResult.data?.id ?? null;

  let correspondenceId: string;

  if (body.correspondenceId) {
    // Update existing draft
    const updated = await db.renewalCorrespondence.update({
      where: { id: body.correspondenceId },
      data: { sentAt: now, resendMessageId },
    } as object);
    correspondenceId = updated.id;
  } else {
    // Create new record
    const corr = await db.renewalCorrespondence.create({
      data: {
        id:              `rc_${Math.random().toString(36).slice(2, 12)}`,
        reviewId:        review.id,
        type:            body.type,
        direction:       "outbound",
        body:            body.body,
        sentAt:          now,
        resendMessageId,
      },
    } as object);
    correspondenceId = corr.id;
  }

  // Update event status
  await db.rentReviewEvent.update({
    where: { id: review.id },
    data: { status: "draft_sent" },
  } as object);

  return NextResponse.json({ success: true, correspondenceId });
}
