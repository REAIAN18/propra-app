import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/compliance-renewal
// Called when a user clicks "Renew Now" or "Schedule" on the compliance page
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { certId, certType, assetName, assetLocation, expiryDate, daysToExpiry, status, fineExposure, action, email } = body;

  const notesParts: string[] = [];
  if (action) notesParts.push(`action: ${action}`);
  if (certType) notesParts.push(`cert: ${certType}`);
  if (status) notesParts.push(`status: ${status}`);
  if (expiryDate) notesParts.push(`expires: ${expiryDate}`);
  if (daysToExpiry != null) notesParts.push(`days: ${daysToExpiry}`);
  if (fineExposure) notesParts.push(`fine risk: ${fineExposure}`);
  if (certId) notesParts.push(`certId: ${certId}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;
  const address = [assetName, assetLocation].filter(Boolean).join(", ");

  prisma.serviceLead.create({
    data: {
      email: resolvedEmail,
      userId: session?.user?.id ?? null,
      serviceType: "compliance_renewal",
      propertyAddress: address || null,
      notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
    },
  }).catch((err) => console.error("[compliance-renewal] db save failed:", err));

  sendAdminServiceLeadAlert({
    serviceType: "compliance_renewal",
    email: resolvedEmail ?? "anonymous",
    details: { certId, certType, asset: address, expiryDate, daysToExpiry, status, fineExposure, action },
  }).catch((err) => console.error("[compliance-renewal] email failed:", err));

  return NextResponse.json({ ok: true });
}
