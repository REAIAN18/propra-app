import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@arcahq.ai";
const FROM = process.env.AUTH_EMAIL_FROM ?? "Arca <noreply@arcahq.ai>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propra-app-production.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const { email, message, company, page } = await req.json();

    if (!email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Email and message required." }, { status: 400 });
    }

    const subject = `Quick question from ${email}${company ? ` — ${company}` : ""}`;

    if (!process.env.RESEND_API_KEY) {
      console.log(`[contact] ${subject} | page=${page ?? "?"} | message="${message}"`);
      return NextResponse.json({ ok: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Alert admin
    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      replyTo: email.trim(),
      subject,
      html: `<div style="font-family:sans-serif;font-size:14px;color:#222;max-width:560px;">
        <h2 style="font-size:16px;margin-bottom:4px;">Quick question from demo</h2>
        <p style="color:#5a7a96;margin-top:0;">Sent from the Arca demo dashboard${page ? ` · ${page}` : ""}</p>
        <p><strong>Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p>
        ${company ? `<p><strong>Company:</strong> ${company}</p>` : ""}
        <p><strong>Message:</strong></p>
        <blockquote style="border-left:3px solid #0A8A4C;margin:8px 0;padding:8px 16px;color:#333;background:#f7faf8;">
          ${message.replace(/\n/g, "<br/>")}
        </blockquote>
        <p style="margin-top:16px;"><a href="${APP_URL}/admin/leads" style="color:#0A8A4C;">View leads →</a></p>
      </div>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
