import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/transaction-sale
// Called when a user clicks "Begin Transaction" or "Test the market" on the hold-sell page
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { assetName, sellPrice, holdIRR, sellIRR, recommendation, action, portfolioName, email } = body;

  const notesParts: string[] = [];
  if (action) notesParts.push(`action: ${action}`);
  if (portfolioName) notesParts.push(`portfolio: ${portfolioName}`);
  if (sellPrice) notesParts.push(`indicative value: ${sellPrice}`);
  if (sellIRR) notesParts.push(`sell IRR: ${sellIRR}%`);
  if (holdIRR) notesParts.push(`hold IRR: ${holdIRR}%`);
  if (recommendation) notesParts.push(`recommendation: ${recommendation}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  try {
    await prisma.serviceLead.create({
      data: {
        email: resolvedEmail,
        userId: session?.user?.id ?? null,
        serviceType: "transaction_sale",
        propertyAddress: assetName ?? null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
      },
    });
    await sendAdminServiceLeadAlert({
      serviceType: "transaction_sale",
      email: resolvedEmail ?? "anonymous",
      details: {
        asset: assetName,
        portfolio: portfolioName,
        action,
        sellPrice,
        sellIRR: sellIRR ? `${sellIRR}%` : undefined,
        holdIRR: holdIRR ? `${holdIRR}%` : undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[transaction-sale] lead capture failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/leads/transaction-sale" } });
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
