import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { propertyAddress, supplier, unitRate, annualSpend, contractEndDate, email } = body;

  try {
    await prisma.serviceLead.create({
      data: {
        email: email ?? session?.user?.email ?? null,
        userId: session?.user?.id ?? null,
        serviceType: "energy_switch",
        propertyAddress: propertyAddress ?? null,
        supplier: supplier ?? null,
        unitRate: unitRate ? Number(unitRate) : null,
        annualSpend: annualSpend ? Number(annualSpend) : null,
        notes: contractEndDate ? `contractEndDate: ${contractEndDate}` : null,
      },
    });
    await sendAdminServiceLeadAlert({
      serviceType: "energy_switch",
      email: email ?? session?.user?.email ?? "anonymous",
      details: { propertyAddress, supplier, unitRate, annualSpend, contractEndDate },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[energy-switch] lead capture failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/leads/energy-switch" } });
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
