import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@realhq.com";

// POST /api/user/compliance/renew
// Fires an admin notification so RealHQ ops can action the certificate renewal.
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { certId, certType, assetName, assetLocation, expiryDate, daysToExpiry, fineExposure, action } = body;

  if (!certId || !action) {
    return NextResponse.json({ error: "certId and action are required" }, { status: 400 });
  }

  const actionLabel = action === "renew_now" ? "Renew Now (expired)" : "Schedule renewal";
  const expiryStr = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "unknown";
  const fineStr = fineExposure ? `£${Number(fineExposure).toLocaleString()}` : "none";

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    await resend.emails.send({
      from: "RealHQ <noreply@realhq.com>",
      to: ADMIN_EMAIL,
      subject: `Compliance renewal request: ${certType ?? certId} — ${assetName ?? "unknown asset"}`,
      text: [
        `Compliance certificate renewal request`,
        ``,
        `User: ${user?.name ?? "Unknown"} <${user?.email}>`,
        `Action: ${actionLabel}`,
        `Certificate: ${certType ?? certId}`,
        `Asset: ${assetName ?? "—"} (${assetLocation ?? "—"})`,
        `Expiry date: ${expiryStr}`,
        `Days to expiry: ${daysToExpiry ?? "—"}`,
        `Fine exposure: ${fineStr}`,
        ``,
        `Action this immediately in the admin dashboard.`,
      ].join("\n"),
    });
  } catch {
    // Email failure must not block the user response
  }

  return NextResponse.json({ status: "requested" });
}
