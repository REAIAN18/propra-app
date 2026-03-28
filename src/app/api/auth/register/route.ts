import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, sendAdminSignupAlert, sendSignupNurtureDay3, sendSignupNurtureDay7 } from "@/lib/email";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password } = body;

    // Validation
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!password?.trim() || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") || null;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Check if admin
    const isAdmin = emailLower === (process.env.ADMIN_EMAIL ?? "hello@realhq.com");

    // Create user
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        name,
        password: hashedPassword,
        onboardedAt: new Date(),
        isAdmin,
      },
    });

    // Fire-and-forget emails
    sendWelcomeEmail({ name: name ?? emailLower.split("@")[0], email: emailLower }).catch((err) =>
      console.error("[register] welcome email failed:", err)
    );
    sendAdminSignupAlert({ name: name ?? "", email: emailLower }).catch((err) =>
      console.error("[register] admin alert failed:", err)
    );

    // Check if already captured as lead
    const alreadyCaptured = await prisma.signupLead.findUnique({
      where: { email: emailLower },
      select: { id: true },
    });
    if (!alreadyCaptured) {
      sendSignupNurtureDay3({ name: name ?? emailLower.split("@")[0], email: emailLower }).catch((err) =>
        console.error("[register] nurture day-3 failed:", err)
      );
      sendSignupNurtureDay7({ name: name ?? emailLower.split("@")[0], email: emailLower }).catch((err) =>
        console.error("[register] nurture day-7 failed:", err)
      );
    }

    return NextResponse.json({ ok: true, id: user.id });
  } catch (err) {
    console.error("[register]", err);
    Sentry.captureException(err, { extra: { route: "/api/auth/register" } });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
