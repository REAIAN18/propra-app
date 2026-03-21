import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ENERGY_COMMISSION_RATE = 0.10; // 10% of year-1 saving

/**
 * POST /api/energy/quotes/{quoteId}/switch
 *
 * Executes an energy supplier switch:
 * 1. Marks the EnergyQuote status = "switched"
 * 2. Records a Commission row (category=energy, 10% of annual saving)
 *
 * Note: The Octopus Energy API does support account-level switching, but
 * requires the customer's OAuth token. Until the OAuth flow is implemented,
 * this endpoint records the commission and intent. The actual supplier
 * notification can be added later by wiring OCTOPUS_API_KEY + account_id.
 */
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
    const quote = await prisma.energyQuote.findFirst({
      where: { id: quoteId, userId: session.user.id },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    if (quote.status === "switched") {
      return NextResponse.json({ error: "Already switched" }, { status: 409 });
    }
    if (quote.status === "expired") {
      return NextResponse.json({ error: "Quote has expired" }, { status: 410 });
    }

    const annualSaving = quote.annualSaving ?? 0;
    const commissionValue = Math.max(0, annualSaving) * ENERGY_COMMISSION_RATE;

    await prisma.energyQuote.update({
      where: { id: quoteId },
      data: { status: "switched" },
    });

    const commission = await prisma.commission.create({
      data: {
        userId: session.user.id,
        assetId: quote.assetId,
        category: "energy",
        sourceId: quoteId,
        annualSaving,
        commissionRate: ENERGY_COMMISSION_RATE,
        commissionValue,
        status: "confirmed",
        placedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      status: "switched",
      quoteId,
      supplier: quote.supplier,
      annualSaving,
      commission: {
        id: commission.id,
        annualSaving,
        commissionValue,
        commissionRate: ENERGY_COMMISSION_RATE,
      },
    });
  } catch (error) {
    console.error("[energy/quotes/switch] failed:", error);
    Sentry.captureException(error, {
      extra: { route: "/api/energy/quotes/[quoteId]/switch", userId: session.user.id, quoteId },
    });
    return NextResponse.json({ error: "Switch failed" }, { status: 500 });
  }
}
