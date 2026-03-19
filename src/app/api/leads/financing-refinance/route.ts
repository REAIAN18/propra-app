import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/financing-refinance
// Called when a user clicks "Source competing lender terms" on the financing page
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { assetName, lender, outstandingBalance, interestRate, marketRate, annualSaving, daysToMaturity, email } = body;

  const notesParts: string[] = [];
  if (lender) notesParts.push(`lender: ${lender}`);
  if (interestRate) notesParts.push(`current rate: ${interestRate}%`);
  if (marketRate) notesParts.push(`market rate: ${marketRate}%`);
  if (annualSaving) notesParts.push(`annual saving: ${annualSaving}`);
  if (daysToMaturity !== undefined) notesParts.push(`days to maturity: ${daysToMaturity}`);
  if (outstandingBalance) notesParts.push(`outstanding: ${outstandingBalance}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  try {
    await prisma.serviceLead.create({
      data: {
        email: resolvedEmail,
        userId: session?.user?.id ?? null,
        serviceType: "financing_refinance",
        propertyAddress: assetName ?? null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
      },
    });
    await sendAdminServiceLeadAlert({
      serviceType: "financing_refinance",
      email: resolvedEmail ?? "anonymous",
      details: {
        asset: assetName,
        lender,
        currentRate: interestRate ? `${interestRate}%` : undefined,
        marketRate: marketRate ? `${marketRate}%` : undefined,
        annualSaving,
        daysToMaturity,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[financing-refinance] lead capture failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/leads/financing-refinance" } });
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
