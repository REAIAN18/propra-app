import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/planning-flag
// Called when a user clicks "Flag for Review" on a planning application
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { appId, refNumber, assetName, applicant, type, impact, impactScore, holdSellLink, email } = body;

  const notesParts: string[] = [];
  if (refNumber) notesParts.push(`ref: ${refNumber}`);
  if (type) notesParts.push(`type: ${type}`);
  if (impact) notesParts.push(`impact: ${impact}`);
  if (impactScore != null) notesParts.push(`score: ${impactScore}/10`);
  if (holdSellLink) notesParts.push(`hold/sell: ${holdSellLink}`);
  if (applicant) notesParts.push(`applicant: ${applicant}`);
  if (appId) notesParts.push(`appId: ${appId}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  prisma.serviceLead.create({
    data: {
      email: resolvedEmail,
      userId: session?.user?.id ?? null,
      serviceType: "planning_flag",
      propertyAddress: assetName ?? null,
      notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
    },
  }).catch((err) => console.error("[planning-flag] db save failed:", err));

  sendAdminServiceLeadAlert({
    serviceType: "planning_flag",
    email: resolvedEmail ?? "anonymous",
    details: { appId, refNumber, asset: assetName, applicant, type, impact, impactScore, holdSellLink },
  }).catch((err) => console.error("[planning-flag] email failed:", err));

  return NextResponse.json({ ok: true });
}
