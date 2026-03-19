import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propra-app-production.up.railway.app";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("e") ?? "";
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

  // Upsert so clicking twice is idempotent
  await prisma.unsubscribe.upsert({
    where: { email },
    create: { email },
    update: {},
  }).catch(() => {
    // Best effort — don't fail the redirect
  });

  return NextResponse.redirect(`${APP_URL}/unsubscribe?done=1`);
}
