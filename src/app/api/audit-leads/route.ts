import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAuditLeadEmail, sendAdminAuditAlert, sendAuditLeadNurtureDay2, sendAuditLeadNurtureDay5 } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, portfolioInput, estimate } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();

  // Best-effort DB save — never fail the request if DB is unavailable
  prisma.auditLead.create({
    data: {
      email: emailLower,
      portfolioInput: portfolioInput ?? "",
      assetType: estimate?.assetType ?? null,
      assetCount: estimate?.assetCount ?? null,
      estimateTotal: estimate?.total ?? null,
      estimateJson: estimate ? JSON.stringify(estimate) : null,
    },
  }).catch((err) => console.error("[audit-leads] db save failed:", err));

  // Fire-and-forget emails — independent of DB
  sendAuditLeadEmail({
    email: emailLower,
    portfolioInput: portfolioInput ?? "",
    estimate,
  }).catch((err) => console.error("[audit-leads] email failed:", err));
  sendAdminAuditAlert({
    email: emailLower,
    portfolioInput: portfolioInput ?? "",
    assetType: estimate?.assetType ?? null,
    assetCount: estimate?.assetCount ?? null,
    estimateTotal: estimate?.total ?? null,
  }).catch((err) => console.error("[audit-leads] admin alert failed:", err));

  if (estimate?.total && estimate?.assetCount) {
    sendAuditLeadNurtureDay2({ email: emailLower, estimate }).catch(
      (err) => console.error("[audit-leads] nurture day-2 failed:", err)
    );
    sendAuditLeadNurtureDay5({ email: emailLower, estimate }).catch(
      (err) => console.error("[audit-leads] nurture day-5 failed:", err)
    );
  }

  return NextResponse.json({ ok: true });
}
