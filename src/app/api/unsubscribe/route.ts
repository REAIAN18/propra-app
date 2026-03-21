import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://realhq.com";

function verifyHmac(identifier: string, key: string): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const expected = createHmac("sha256", secret).update(identifier).digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(key));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const key = params.get("key");
  const id = params.get("id");
  const legacy = params.get("e");

  // ── HMAC path (cold outreach) ─────────────────────────────────────────────
  if (key && id) {
    if (!verifyHmac(id, key)) {
      return NextResponse.redirect(`${APP_URL}/unsubscribe?error=1`);
    }

    const today = new Date().toISOString().slice(0, 10);

    // Determine if id is a prospectKey or email (prospectKey never contains '@')
    const isProspectKey = !id.includes("@");
    const emailForUnsub = isProspectKey ? undefined : id;

    await Promise.all([
      // Always mark in Unsubscribe table if we have an email
      emailForUnsub
        ? prisma.unsubscribe.upsert({
            where: { email: emailForUnsub.toLowerCase() },
            create: { email: emailForUnsub.toLowerCase() },
            update: {},
          }).catch(() => {})
        : Promise.resolve(),

      // Mark ProspectStatus if id is a prospectKey
      isProspectKey
        ? prisma.prospectStatus.upsert({
            where: { prospectKey: id },
            create: { prospectKey: id, status: "unsubscribed", emailBounced: true, lastContact: today },
            update: { status: "unsubscribed", emailBounced: true },
          }).catch(() => {})
        : Promise.resolve(),
    ]);

    return NextResponse.redirect(`${APP_URL}/unsubscribe?done=1`);
  }

  // ── Legacy base64 path (nurture emails) ──────────────────────────────────
  const raw = legacy ?? "";
  if (!raw) {
    return NextResponse.redirect(`${APP_URL}/unsubscribe?error=1`);
  }

  let email: string;
  try {
    email = Buffer.from(raw, "base64").toString("utf-8").trim().toLowerCase();
  } catch {
    return NextResponse.redirect(`${APP_URL}/unsubscribe?error=1`);
  }

  if (!email || !email.includes("@")) {
    return NextResponse.redirect(`${APP_URL}/unsubscribe?error=1`);
  }

  await prisma.unsubscribe.upsert({
    where: { email },
    create: { email },
    update: {},
  }).catch(() => {});

  return NextResponse.redirect(`${APP_URL}/unsubscribe?done=1`);
}
