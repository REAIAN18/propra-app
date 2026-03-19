import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { propertyAddress, supplier, unitRate, annualSpend, contractEndDate, email } = body;

  prisma.serviceLead.create({
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
  }).catch((err) => console.error("[energy-switch] db save failed:", err));

  sendAdminServiceLeadAlert({
    serviceType: "energy_switch",
    email: email ?? session?.user?.email ?? "anonymous",
    details: { propertyAddress, supplier, unitRate, annualSpend, contractEndDate },
  }).catch((err) => console.error("[energy-switch] email failed:", err));

  return NextResponse.json({ ok: true });
}
