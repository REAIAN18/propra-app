import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert, sendBookingConfirmation } from "@/lib/email";

// POST /api/leads/book-visit
// Fires when a prospect lands on /book with personalization params (company, assets, name)
// Captures high-intent outreach link visits even if they don't click the cal.com button
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { company, name, assets, estimatedOpp, email, portfolio, serviceType: bodyServiceType } = body;
  const serviceType = bodyServiceType === "demo_booked" ? "demo_booked" : "book_visit";
  const isUK = portfolio === "se-logistics" || body.currency === "GBP";

  // Don't capture anonymous visits with no context
  if (!company && !name && !assets) {
    return NextResponse.json({ ok: true });
  }

  const notesParts: string[] = [];
  if (assets) notesParts.push(`assets: ${assets}`);
  if (estimatedOpp) notesParts.push(`est. opp: $${Math.round(estimatedOpp / 1000)}k/yr`);
  if (name) notesParts.push(`name: ${name}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  try {
    await prisma.serviceLead.create({
      data: {
        email: resolvedEmail,
        userId: session?.user?.id ?? null,
        serviceType: serviceType,
        propertyAddress: company ?? null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
      },
    });
  } catch (error) {
    console.error("[book-visit] lead capture failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/leads/book-visit" } });
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }

  // Notifications are fire-and-forget — failure must not break the booking capture
  sendAdminServiceLeadAlert({
    serviceType: serviceType,
    email: resolvedEmail ?? company ?? name ?? "anonymous",
    details: { company, name, assets, estimatedOpp },
  }).catch((err) => console.error("[book-visit] admin notification failed:", err));

  if (serviceType === "demo_booked" && resolvedEmail) {
    sendBookingConfirmation({
      email: resolvedEmail,
      firstName: name?.split(" ")[0] ?? null,
      company: company ?? null,
      assetCount: assets ? Number(assets) : null,
      isUK,
    }).catch((err) => console.error("[book-visit] booking confirmation failed:", err));
  }

  return NextResponse.json({ ok: true });
}
