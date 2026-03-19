import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/rent-review
// Called when a user clicks a lease action button on the rent-clock page
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { assetName, tenantName, action, passingRent, marketERV, daysToEvent, leaseId, email } = body;

  const notesParts: string[] = [];
  if (action) notesParts.push(`action: ${action}`);
  if (tenantName) notesParts.push(`tenant: ${tenantName}`);
  if (passingRent) notesParts.push(`passing rent: ${passingRent}`);
  if (marketERV) notesParts.push(`market ERV: ${marketERV}`);
  if (daysToEvent !== undefined) notesParts.push(`days to event: ${daysToEvent}`);
  if (leaseId) notesParts.push(`leaseId: ${leaseId}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  try {
    await prisma.serviceLead.create({
      data: {
        email: resolvedEmail,
        userId: session?.user?.id ?? null,
        serviceType: "rent_review",
        propertyAddress: assetName ?? null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
      },
    });
    await sendAdminServiceLeadAlert({
      serviceType: "rent_review",
      email: resolvedEmail ?? "anonymous",
      details: {
        asset: assetName,
        tenant: tenantName,
        action,
        passingRent,
        marketERV,
        daysToEvent,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[rent-review] lead capture failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/leads/rent-review" } });
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
