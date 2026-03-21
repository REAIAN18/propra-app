import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { sendAuditLeadEmail, sendAdminAuditAlert, sendAuditLeadNurtureDay2, sendAuditLeadNurtureDay3, sendAuditLeadNurtureDay5 } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, portfolioInput, estimate, enrichments } = body;

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
      enrichmentsJson: enrichments?.length ? JSON.stringify(enrichments) : null,
    },
  }).catch((err) => { console.error("[audit-leads] db save failed:", err); Sentry.captureException(err, { extra: { route: "/api/audit-leads", email: emailLower } }); });

  // Summarise enrichment data for admin alert
  const enrichmentSummary = Array.isArray(enrichments) && enrichments.length > 0
    ? enrichments.map((e: { address: string; floodZone?: { zone: string; isHighRisk: boolean } | null; property?: { assessedValue?: number } | null }) => {
        const parts: string[] = [e.address];
        if (e.floodZone) parts.push(`Zone ${e.floodZone.zone}${e.floodZone.isHighRisk ? " ⚠ HIGH RISK" : ""}`);
        if (e.property?.assessedValue) parts.push(`$${Math.round(e.property.assessedValue / 1000)}k assessed`);
        return parts.join(" · ");
      }).join("\n")
    : null;

  // Fire-and-forget emails — independent of DB
  sendAuditLeadEmail({
    email: emailLower,
    portfolioInput: portfolioInput ?? "",
    estimate,
    enrichments: Array.isArray(enrichments) && enrichments.length > 0 ? enrichments : undefined,
  }).catch((err) => console.error("[audit-leads] email failed:", err));
  sendAdminAuditAlert({
    email: emailLower,
    portfolioInput: portfolioInput ?? "",
    assetType: estimate?.assetType ?? null,
    assetCount: estimate?.assetCount ?? null,
    estimateTotal: estimate?.total ?? null,
    enrichmentSummary,
  }).catch((err) => console.error("[audit-leads] admin alert failed:", err));

  if (estimate?.total && estimate?.assetCount) {
    sendAuditLeadNurtureDay2({ email: emailLower, estimate }).catch(
      (err) => console.error("[audit-leads] nurture day-2 failed:", err)
    );
    sendAuditLeadNurtureDay3({ email: emailLower, estimate }).catch(
      (err) => console.error("[audit-leads] nurture day-3 failed:", err)
    );
    sendAuditLeadNurtureDay5({ email: emailLower, estimate }).catch(
      (err) => console.error("[audit-leads] nurture day-5 failed:", err)
    );
  }

  return NextResponse.json({ ok: true });
}
