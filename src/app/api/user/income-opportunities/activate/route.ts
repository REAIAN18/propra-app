import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@realhq.com";

// POST /api/user/income-opportunities/activate
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { opportunityType, assetId, opportunityLabel, annualIncome } = body;

  if (!opportunityType) {
    return NextResponse.json({ error: "opportunityType is required" }, { status: 400 });
  }

  // Validate assetId belongs to this user (if provided)
  if (assetId) {
    const asset = await prisma.userAsset.findFirst({
      where: { id: assetId, userId: session.user.id },
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
  }

  // Persist activation record
  const activation = await prisma.incomeActivation.create({
    data: {
      userId: session.user.id,
      assetId: assetId ?? null,
      opportunityType,
      opportunityLabel: opportunityLabel ?? null,
      annualIncome: annualIncome ? Number(annualIncome) : null,
      status: "requested",
    },
  });

  // Fire notification email to RealHQ ops (best-effort)
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const label = opportunityLabel ?? opportunityType;
    const incomeStr = annualIncome ? ` — £${Number(annualIncome).toLocaleString()}/yr indicative` : "";
    await resend.emails.send({
      from: "RealHQ <noreply@realhq.com>",
      to: ADMIN_EMAIL,
      subject: `Income activation request: ${label}${incomeStr}`,
      text: [
        `New income opportunity activation request`,
        ``,
        `User: ${user?.name ?? "Unknown"} <${user?.email}>`,
        `Opportunity: ${label}`,
        `Type: ${opportunityType}`,
        `Annual income (indicative): ${annualIncome ? `£${Number(annualIncome).toLocaleString()}/yr` : "not specified"}`,
        `Asset ID: ${assetId ?? "none"}`,
        `Activation ID: ${activation.id}`,
        `Requested at: ${activation.requestedAt.toISOString()}`,
      ].join("\n"),
    });
  } catch {
    // Email failure must not block the user response
  }

  return NextResponse.json({ status: "requested", activationId: activation.id });
}
