import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInsuranceBoundEmail, sendEnergySwitchedEmail } from "@/lib/email";

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

    // Fetch user for email personalisation
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    if (quoteType === "insurance") {
      const quote = await prisma.insuranceQuote.findFirst({
        where: { id: quoteId, userId: session.user.id },
        include: { asset: { select: { country: true } } },
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

      if (user?.email) {
        sendInsuranceBoundEmail({
          email: user.email,
          name: user.name,
          carrier: quote.carrier,
          policyType: quote.policyType,
          quotedPremium: quote.quotedPremium,
          annualSaving: quote.annualSaving ?? 0,
          currency: quote.asset?.country === "UK" ? "GBP" : "USD",
        }).catch((e) => console.error("[bind] insurance email failed:", e));
      }
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

      if (user?.email) {
        // Detect market from asset location if available
        let market: "fl" | "seuk" = "fl";
        if (assetId) {
          const asset = await prisma.userAsset.findUnique({ where: { id: assetId }, select: { location: true } });
          const loc = (asset?.location ?? "").toLowerCase();
          if (loc.includes("uk") || loc.includes("england") || loc.includes("kent") || loc.includes("surrey") || loc.includes("essex") || loc.includes("herts")) {
            market = "seuk";
          }
        }
        sendEnergySwitchedEmail({
          email: user.email,
          name: user.name,
          supplier: quote.supplier,
          quotedRate: quote.quotedRate,
          quotedCost: quote.quotedCost,
          annualSaving: quote.annualSaving ?? 0,
          market,
        }).catch((e) => console.error("[bind] energy email failed:", e));
      }
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
