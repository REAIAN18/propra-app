import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const COMMISSION_RATE = 0.15; // 15% of annual saving — default Wave 1 rate

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { quoteId, quoteType } = body as { quoteId?: string; quoteType?: "insurance" | "energy" };

  if (!quoteId || !quoteType) {
    return NextResponse.json({ error: "quoteId and quoteType are required" }, { status: 400 });
  }
  if (quoteType !== "insurance" && quoteType !== "energy") {
    return NextResponse.json({ error: "quoteType must be 'insurance' or 'energy'" }, { status: 400 });
  }

  try {
    let annualSaving = 0;
    let assetId: string | null = null;
    const newStatus = quoteType === "insurance" ? "bound" : "switched";

    if (quoteType === "insurance") {
      const quote = await prisma.insuranceQuote.findFirst({
        where: { id: quoteId, userId: session.user.id },
      });
      if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
      if (quote.status !== "pending") {
        return NextResponse.json({ error: `Quote already ${quote.status}` }, { status: 409 });
      }
      annualSaving = quote.annualSaving ?? 0;
      assetId = quote.assetId;

      await prisma.insuranceQuote.update({
        where: { id: quoteId },
        data: { status: newStatus },
      });
    } else {
      const quote = await prisma.energyQuote.findFirst({
        where: { id: quoteId, userId: session.user.id },
      });
      if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
      if (quote.status !== "pending") {
        return NextResponse.json({ error: `Quote already ${quote.status}` }, { status: 409 });
      }
      annualSaving = quote.annualSaving ?? 0;
      assetId = quote.assetId;

      await prisma.energyQuote.update({
        where: { id: quoteId },
        data: { status: newStatus },
      });
    }

    const commissionValue = annualSaving * COMMISSION_RATE;

    const commission = await prisma.commission.create({
      data: {
        userId: session.user.id,
        assetId,
        category: quoteType,
        sourceId: quoteId,
        annualSaving,
        commissionRate: COMMISSION_RATE,
        commissionValue,
        status: "confirmed",
        placedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      status: newStatus,
      commission: {
        id: commission.id,
        annualSaving,
        commissionValue,
        commissionRate: COMMISSION_RATE,
      },
    });
  } catch (error) {
    console.error("[quotes/bind] failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/quotes/bind", userId: session.user.id, quoteId, quoteType } });
    return NextResponse.json({ error: "Bind failed" }, { status: 500 });
  }
}
