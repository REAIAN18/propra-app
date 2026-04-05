import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/quotes/sale-lead
 * Records a disposal enquiry from the hold-sell page.
 * Called when user clicks "Proceed to sell" / "Get sale quotes".
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { action, portfolioName, sellPrice } = body as {
    action?: string;
    portfolioName?: string;
    sellPrice?: string;
  };

  if (!session?.user?.id) {
    return NextResponse.json({ ok: true });
  }

  try {
    await (prisma as unknown as {
      scheduledEmail: { create: (q: object) => Promise<unknown> };
    }).scheduledEmail.create({
      data: {
        to: session.user.email ?? "",
        subject: "Sale enquiry logged",
        html: `<p>Sale enquiry: action=${action}, portfolio=${portfolioName}, price=${sellPrice} for user ${session.user.id}.</p>`,
        scheduledFor: new Date(),
        status: "pending",
        type: "sale_lead",
      },
    });
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ ok: true });
}
