/**
 * POST /api/user/income-opportunities/[id]/dismiss
 * Dismiss an income opportunity with a structured reason.
 *
 * Dismiss reasons feed into the learning loop to improve future scoring.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_DISMISS_REASONS = [
  "not_suitable",
  "no_demand",
  "planning_restrictions",
  "tenant_objection",
  "capex_too_high",
  "other",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activationId = (await params).id;
  const body = await request.json();
  const { reason, notes } = body;

  if (!reason || !VALID_DISMISS_REASONS.includes(reason)) {
    return NextResponse.json(
      {
        error: `Invalid dismiss reason. Must be one of: ${VALID_DISMISS_REASONS.join(
          ", "
        )}`,
      },
      { status: 400 }
    );
  }

  // Fetch activation and verify ownership
  const activation = await prisma.incomeActivation.findUnique({
    where: { id: activationId },
    select: { userId: true },
  });

  if (!activation || activation.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Income activation not found or unauthorized" },
      { status: 404 }
    );
  }

  // Update activation with dismiss reason
  await prisma.incomeActivation.update({
    where: { id: activationId },
    data: {
      status: "declined",
      dismissReason: reason,
      // Store dismiss notes in stageHistory
      stageHistory: {
        stage: "dismissed",
        date: new Date().toISOString().split("T")[0],
        notes: notes || `Dismissed: ${reason}`,
      },
      updatedAt: new Date(),
    },
  });

  // TODO: Learning loop — adjust future opportunity scoring based on dismiss reason
  // Example: if "planning_restrictions" dismissed multiple times for billboard in this area,
  // reduce billboard confidence for similar assets

  return NextResponse.json({
    success: true,
    message: "Opportunity dismissed",
    reason,
  });
}
