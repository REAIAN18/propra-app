import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/income-activation
// Called when a user clicks "Activate" on an income opportunity or "Request Asset Scan"
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const {
    email,
    opportunityType,  // "5g_mast" | "ev_charging" | "solar" | "parking" | "billboard" | "scan"
    assetName,
    assetLocation,
    opportunityLabel,
    annualIncome,
    probability,
  } = body;

  const resolvedEmail = email ?? session?.user?.email ?? null;
  const notesParts: string[] = [];
  if (opportunityType) notesParts.push(`type: ${opportunityType}`);
  if (assetName) notesParts.push(`asset: ${assetName}`);
  if (assetLocation) notesParts.push(`location: ${assetLocation}`);
  if (opportunityLabel) notesParts.push(`opp: ${opportunityLabel}`);
  if (annualIncome) notesParts.push(`annualIncome: ${annualIncome}`);
  if (probability) notesParts.push(`probability: ${probability}%`);

  prisma.serviceLead.create({
    data: {
      email: resolvedEmail,
      userId: session?.user?.id ?? null,
      serviceType: opportunityType === "scan" ? "income_scan" : "income_activation",
      propertyAddress: assetLocation ?? null,
      notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
    },
  }).catch((err) => console.error("[income-activation] db save failed:", err));

  sendAdminServiceLeadAlert({
    serviceType: "income_activation",
    email: resolvedEmail ?? "anonymous",
    details: {
      type: opportunityType,
      asset: assetName,
      location: assetLocation,
      opportunity: opportunityLabel,
      annualIncome: annualIncome ? `$${Math.round(annualIncome / 1000)}k/yr` : undefined,
      probability: probability ? `${probability}%` : undefined,
    },
  }).catch((err) => console.error("[income-activation] email failed:", err));

  return NextResponse.json({ ok: true });
}
