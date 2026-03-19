import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { propertyAddress, currentPremium, insurer, renewalDate, coverageType, email } = body;

  prisma.serviceLead.create({
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
  }).catch((err) => console.error("[insurance-retender] db save failed:", err));

  sendAdminServiceLeadAlert({
    serviceType: "insurance_retender",
    email: email ?? session?.user?.email ?? "anonymous",
    details: { propertyAddress, currentPremium, insurer, renewalDate, coverageType },
  }).catch((err) => console.error("[insurance-retender] email failed:", err));

  return NextResponse.json({ ok: true });
}
