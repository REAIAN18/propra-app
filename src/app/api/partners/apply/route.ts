import { NextRequest, NextResponse } from "next/server";
import { sendPartnerApplicationAlert, sendPartnerConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, role, clientBase, message } = body;

    if (!name?.trim() || !email?.trim() || !company?.trim() || !role?.trim()) {
      return NextResponse.json({ error: "Name, email, company and role are required." }, { status: 400 });
    }

    // Fire-and-forget — admin alert + applicant confirmation
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanRole = role.trim();

    sendPartnerApplicationAlert({
      name: cleanName,
      email: cleanEmail,
      company: company.trim(),
      role: cleanRole,
      clientBase: clientBase?.trim() ?? null,
      message: message?.trim() ?? null,
    }).catch((err) => console.error("[partners] alert failed:", err));

    sendPartnerConfirmationEmail({
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
    }).catch((err) => console.error("[partners] confirmation failed:", err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[partners]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
