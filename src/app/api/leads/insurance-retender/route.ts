import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { propertyAddress, currentPremium, insurer, renewalDate, coverageType, email } = body;

  try {
    await prisma.serviceLead.create({
      data: {
        email: email ?? session?.user?.email ?? null,
        userId: session?.user?.id ?? null,
        serviceType: "insurance_retender",
        propertyAddress: propertyAddress ?? null,
        currentPremium: currentPremium ? Number(currentPremium) : null,
        insurer: insurer ?? null,
        renewalDate: renewalDate ?? null,
        coverageType: coverageType ?? null,
      },
    });
    await sendAdminServiceLeadAlert({
      serviceType: "insurance_retender",
      email: email ?? session?.user?.email ?? "anonymous",
      details: { propertyAddress, currentPremium, insurer, renewalDate, coverageType },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[insurance-retender] lead capture failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/leads/insurance-retender" } });
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
