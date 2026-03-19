import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/demo-visit
// Fires when a prospect lands on /dashboard with ?welcome=1&company=X params
// Captures demo link click-through intent even if they take no further action
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { company, estimatedOpp, email } = body;

  // Only capture when arriving via a personalized outreach link
  if (!company) {
    return NextResponse.json({ ok: true });
  }

  const notesParts: string[] = [];
  if (estimatedOpp) notesParts.push(`est. opp: $${Math.round(estimatedOpp / 1000)}k/yr`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  prisma.serviceLead.create({
    data: {
      email: resolvedEmail,
      userId: session?.user?.id ?? null,
      serviceType: "demo_visit",
      propertyAddress: company,
      notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
    },
  }).catch((err) => console.error("[demo-visit] db save failed:", err));

  sendAdminServiceLeadAlert({
    serviceType: "demo_visit",
    email: resolvedEmail ?? company,
    details: { company, estimatedOpp },
  }).catch((err) => console.error("[demo-visit] email failed:", err));

  return NextResponse.json({ ok: true });
}
