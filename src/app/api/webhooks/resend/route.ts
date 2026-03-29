import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Resend webhook handler for email delivery tracking.
 * Processes delivery, bounce, open, and click events.
 *
 * Webhook events: https://resend.com/docs/dashboard/webhooks/event-types
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Extract email ID from Resend event
    const messageId = data?.email_id;
    if (!messageId) {
      console.error("[resend-webhook] No email_id in event:", type);
      return NextResponse.json({ received: true });
    }

    // Find tracking record
    const tracking = await prisma.emailTracking.findUnique({
      where: { messageId },
    });

    if (!tracking) {
      console.warn(`[resend-webhook] No tracking record for messageId: ${messageId}`);
      return NextResponse.json({ received: true });
    }

    // Update tracking record based on event type
    const now = new Date();
    let updateData: Record<string, unknown> = {};

    switch (type) {
      case "email.sent":
        updateData = { status: "sent" };
        break;

      case "email.delivered":
        updateData = {
          status: "delivered",
          deliveredAt: now,
        };
        break;

      case "email.delivery_delayed":
        updateData = { status: "delayed" };
        break;

      case "email.bounced":
        updateData = {
          status: "bounced",
          bouncedAt: now,
          bouncedReason: data?.reason || "Unknown bounce reason",
        };
        break;

      case "email.complained":
        updateData = {
          status: "complained",
          complainedAt: now,
        };
        break;

      case "email.opened":
        updateData = {
          status: tracking.status === "sent" || tracking.status === "delivered" ? "opened" : tracking.status,
          openedAt: tracking.openedAt || now, // Keep first open time
        };
        break;

      case "email.clicked":
        updateData = {
          status: "clicked",
          clickedAt: tracking.clickedAt || now, // Keep first click time
        };
        break;

      default:
        console.warn(`[resend-webhook] Unknown event type: ${type}`);
        return NextResponse.json({ received: true });
    }

    // Update tracking record
    await prisma.emailTracking.update({
      where: { messageId },
      data: updateData,
    });

    console.log(`[resend-webhook] Processed ${type} for ${messageId}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[resend-webhook] Error processing webhook:", error);
    // Return 200 to prevent Resend from retrying (we log the error for investigation)
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}
