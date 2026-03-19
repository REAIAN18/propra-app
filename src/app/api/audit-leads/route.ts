import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAuditLeadEmail, sendAdminAuditAlert, sendAuditLeadNurtureDay2 } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, portfolioInput, estimate } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }

    await prisma.auditLead.create({
      data: {
        email: email.trim().toLowerCase(),
        portfolioInput: portfolioInput ?? "",
        assetType: estimate?.assetType ?? null,
        assetCount: estimate?.assetCount ?? null,
        estimateTotal: estimate?.total ?? null,
        estimateJson: estimate ? JSON.stringify(estimate) : null,
      },
    });

    const emailLower = email.trim().toLowerCase();

    // Fire-and-forget — never block response
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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[audit-leads]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
