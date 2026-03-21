import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInsuranceBoundEmail } from "@/lib/email";

const COMMISSION_RATE = 0.15;

export async function POST(
  _req: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { quoteId } = params;

  try {
    const quote = await prisma.insuranceQuote.findFirst({
      where: { id: quoteId, userId: session.user.id },
    });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.status !== "pending") {
      return NextResponse.json({ error: `Quote already ${quote.status}` }, { status: 409 });
    }

    await prisma.insuranceQuote.update({
      where: { id: quoteId },
      data: { status: "bound" },
    });

    const annualSaving = quote.annualSaving ?? 0;
    const commissionValue = annualSaving * COMMISSION_RATE;

    await prisma.commission.create({
      data: {
        userId: session.user.id,
        assetId: quote.assetId,
        category: "insurance",
        sourceId: quoteId,
        annualSaving,
        commissionRate: COMMISSION_RATE,
        commissionValue,
        status: "confirmed",
        placedAt: new Date(),
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    if (user?.email) {
      sendInsuranceBoundEmail({
        email: user.email,
        name: user.name,
        carrier: quote.carrier,
        policyType: quote.policyType,
        quotedPremium: quote.quotedPremium,
        annualSaving,
      }).catch((e) => console.error("[insurance/quotes/bind] email failed:", e));
    }

    return NextResponse.json({
      ok: true,
      status: "bound",
      quoteId,
      carrier: quote.carrier,
      commission: { annualSaving, commissionValue, commissionRate: COMMISSION_RATE },
    });
  } catch (error) {
    console.error("[insurance/quotes/bind] failed:", error);
    Sentry.captureException(error, {
      extra: { route: "/api/insurance/quotes/[quoteId]/bind", userId: session.user.id, quoteId },
    });
    return NextResponse.json({ error: "Bind failed" }, { status: 500 });
  }
}
