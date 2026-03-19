import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/work-order-tender
// Called when a user clicks "Start Tender" on the work orders page
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { assetName, assetLocation, jobType, description, costEstimate, benchmarkCost, contractor, email } = body;

  const notesParts: string[] = [];
  if (jobType) notesParts.push(`job: ${jobType}`);
  if (description) notesParts.push(`desc: ${description}`);
  if (costEstimate) notesParts.push(`estimate: ${costEstimate}`);
  if (benchmarkCost) notesParts.push(`benchmark: ${benchmarkCost}`);
  if (contractor) notesParts.push(`current contractor: ${contractor}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;
  const address = [assetName, assetLocation].filter(Boolean).join(", ");

  try {
    await prisma.serviceLead.create({
      data: {
        email: resolvedEmail,
        userId: session?.user?.id ?? null,
        serviceType: "work_order_tender",
        propertyAddress: address || null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
      },
    });
    await sendAdminServiceLeadAlert({
      serviceType: "work_order_tender",
      email: resolvedEmail ?? "anonymous",
      details: { asset: address, jobType, description, costEstimate, benchmarkCost, contractor },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[work-order-tender] lead capture failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/leads/work-order-tender" } });
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
