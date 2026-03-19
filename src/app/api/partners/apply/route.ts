import { NextRequest, NextResponse } from "next/server";
import { sendPartnerApplicationAlert } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, role, clientBase, message } = body;

    if (!name?.trim() || !email?.trim() || !company?.trim() || !role?.trim()) {
      return NextResponse.json({ error: "Name, email, company and role are required." }, { status: 400 });
    }

    // Fire-and-forget admin alert — never block response
    sendPartnerApplicationAlert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company.trim(),
      role: role.trim(),
      clientBase: clientBase?.trim() ?? null,
      message: message?.trim() ?? null,
    }).catch((err) => console.error("[partners] alert failed:", err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[partners]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
