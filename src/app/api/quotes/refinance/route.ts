import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/quotes/refinance
 * Records a refinance enquiry for an asset.
 * Called from the financing page when user clicks "Get quotes".
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { assetId } = body as { assetId?: string };

  if (!session?.user?.id || !assetId) {
    return NextResponse.json({ ok: true });
  }

  try {
    await (prisma as unknown as {
      scheduledEmail: { create: (q: object) => Promise<unknown> };
    }).scheduledEmail.create({
      data: {
        to: session.user.email ?? "",
        subject: "Refinance enquiry logged",
        html: `<p>Refinance enquiry for asset ${assetId} logged for user ${session.user.id}.</p>`,
        scheduledFor: new Date(),
        status: "pending",
        type: "refinance_lead",
      },
    });
  } catch {
    // Non-blocking — proceed even if email creation fails
  }

  return NextResponse.json({ ok: true });
}
