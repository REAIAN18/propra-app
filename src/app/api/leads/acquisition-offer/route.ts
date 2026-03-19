import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/acquisition-offer
// Called when a user clicks "Submit Offer" or "Pass Deal" on the AI Scout page
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { dealId, dealName, dealLocation, dealType, askingPrice, estimatedYield, score, action, email } = body;

  const notesParts: string[] = [];
  if (action) notesParts.push(`action: ${action}`);
  if (dealType) notesParts.push(`type: ${dealType}`);
  if (askingPrice) notesParts.push(`asking: ${askingPrice}`);
  if (estimatedYield) notesParts.push(`yield: ${estimatedYield}%`);
  if (score) notesParts.push(`score: ${score}`);
  if (dealId) notesParts.push(`dealId: ${dealId}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  prisma.serviceLead.create({
    data: {
      email: resolvedEmail,
      userId: session?.user?.id ?? null,
      serviceType: action === "pass" ? "acquisition_pass" : "acquisition_offer",
      propertyAddress: dealLocation ? `${dealName ?? ""} — ${dealLocation}`.trim() : (dealName ?? null),
      notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
    },
  }).catch((err) => console.error("[acquisition-offer] db save failed:", err));

  if (action !== "pass") {
    sendAdminServiceLeadAlert({
      serviceType: "acquisition_offer",
      email: resolvedEmail ?? "anonymous",
      details: { deal: dealName, location: dealLocation, type: dealType, askingPrice, yield: estimatedYield ? `${estimatedYield}%` : undefined, score },
    }).catch((err) => console.error("[acquisition-offer] email failed:", err));
  }

  return NextResponse.json({ ok: true });
}
