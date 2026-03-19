import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, assetCount, portfolioValue } = body;

    if (!name?.trim() || !email?.trim() || !company?.trim()) {
      return NextResponse.json({ error: "Name, email, and company are required." }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    // Upsert so double-submits are idempotent
    const lead = await prisma.signupLead.upsert({
      where: { email: emailLower },
      update: { name: name.trim(), phone: phone?.trim() ?? null, company: company.trim(), assetCount: assetCount ?? null, portfolioValue: portfolioValue ?? null },
      create: { name: name.trim(), email: emailLower, phone: phone?.trim() ?? null, company: company.trim(), assetCount: assetCount ?? null, portfolioValue: portfolioValue ?? null },
    });

    // TODO: send welcome email via Resend once env vars are confirmed
    // await sendWelcomeEmail({ name: lead.name, email: lead.email });

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
