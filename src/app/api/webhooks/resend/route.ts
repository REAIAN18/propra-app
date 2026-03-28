/**
 * POST /api/webhooks/resend
 * Resend webhook handler for email delivery/open/bounce tracking.
 * Fixes PRO-695 Gap 4: Email tracking for renewal letters.
 *
 * Events handled:
 * - email.delivered → sets deliveredAt
 * - email.opened → sets openedAt
 * - email.bounced → logs error (future: notify user)
 * - email.complained → logs error (future: notify user)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ResendWebhookEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ResendWebhookEvent;

    // Validate event type
    if (!body.type || !body.data?.email_id) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const emailId = body.data.email_id;
    const eventType = body.type;

    // Find correspondence by Resend message ID
    const correspondence = await (prisma as {
      renewalCorrespondence: {
        findFirst(q: object): Promise<{ id: string; deliveredAt: Date | null; openedAt: Date | null } | null>;
        update(q: object): Promise<unknown>;
      };
    }).renewalCorrespondence.findFirst({
      where: { resendMessageId: emailId },
      select: { id: true, deliveredAt: true, openedAt: true },
    } as object);

    if (!correspondence) {
      // Email not from rent reviews — might be marketing, invoice, etc.
      // Return 200 to avoid webhook retry spam
      return NextResponse.json({ received: true, note: "Not a renewal correspondence" });
    }

    const now = new Date();

    // Handle event types
    switch (eventType) {
      case "email.delivered":
        if (!correspondence.deliveredAt) {
          await (prisma as { renewalCorrespondence: { update(q: object): Promise<unknown> } }).renewalCorrespondence.update({
            where: { id: correspondence.id },
            data: { deliveredAt: now },
          } as object);
        }
        break;

      case "email.opened":
        if (!correspondence.openedAt) {
          await (prisma as { renewalCorrespondence: { update(q: object): Promise<unknown> } }).renewalCorrespondence.update({
            where: { id: correspondence.id },
            data: { openedAt: now },
          } as object);
        }
        break;

      case "email.bounced":
      case "email.complained":
        // Log for debugging — future: create notification for user
        console.error(`[resend-webhook] ${eventType} for correspondence ${correspondence.id}:`, {
          emailId,
          to: body.data.to,
          subject: body.data.subject,
        });
        // TODO PRO-695 extension: Create a notification/alert for the user
        break;

      default:
        // Unhandled event type (e.g., email.sent, email.delivery_delayed)
        break;
    }

    return NextResponse.json({ received: true, eventType, correspondenceId: correspondence.id });
  } catch (error) {
    console.error("[resend-webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
