import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, sendAdminSignupAlert, sendSignupNurtureDay3, sendSignupNurtureDay7 } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, assetCount, portfolioValue } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const nameTrimmed = name?.trim() ?? null;
    const companyTrimmed = company?.trim() ?? null;

    // Upsert so double-submits are idempotent
    const lead = await prisma.signupLead.upsert({
      where: { email: emailLower },
      update: { name: nameTrimmed, phone: phone?.trim() ?? null, company: companyTrimmed, assetCount: assetCount ?? null, portfolioValue: portfolioValue ?? null },
      create: { name: nameTrimmed, email: emailLower, phone: phone?.trim() ?? null, company: companyTrimmed, assetCount: assetCount ?? null, portfolioValue: portfolioValue ?? null },
    });

    // Fire-and-forget emails — never block response
    sendWelcomeEmail({ name: lead.name ?? "", email: lead.email, company: lead.company ?? "", assetCount: lead.assetCount ?? undefined }).catch((err) =>
      console.error("[signup] welcome email failed:", err)
    );
    sendAdminSignupAlert({ name: lead.name ?? "", email: lead.email, company: lead.company ?? "", assetCount: lead.assetCount, portfolioValue: lead.portfolioValue }).catch((err) =>
      console.error("[signup] admin alert failed:", err)
    );
    sendSignupNurtureDay3({ name: lead.name ?? "", email: lead.email, assetCount: lead.assetCount }).catch((err) =>
      console.error("[signup] nurture day-3 failed:", err)
    );
    sendSignupNurtureDay7({ name: lead.name ?? "", email: lead.email }).catch((err) =>
      console.error("[signup] nurture day-7 failed:", err)
    );

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    console.error("[signup]", err);
    Sentry.captureException(err, { extra: { route: "/api/signup" } });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
