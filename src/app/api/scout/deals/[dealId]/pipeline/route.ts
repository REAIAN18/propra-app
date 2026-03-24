/**
 * PATCH /api/scout/deals/:dealId/pipeline
 * Updates the pipeline stage for a Scout deal.
 *
 * Valid stages:
 *   interested → due_diligence → offer_made → under_offer → completed | withdrawn
 *
 * Also used by the LOI modal ("Mark as Sent" → offer_made).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STAGES = [
  "interested",
  "due_diligence",
  "offer_made",
  "under_offer",
  "completed",
  "withdrawn",
] as const;

type PipelineStage = typeof VALID_STAGES[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await params;
  const body = await req.json().catch(() => ({})) as { stage?: string };

  if (!body.stage || !VALID_STAGES.includes(body.stage as PipelineStage)) {
    return NextResponse.json(
      { error: `stage must be one of: ${VALID_STAGES.join(", ")}` },
      { status: 422 }
    );
  }

  // Verify the user has reacted to this deal (owns it in their pipeline)
  const reaction = await prisma.scoutReaction.findFirst({
    where: { dealId, userId: session.user.id },
  });

  if (!reaction) {
    return NextResponse.json(
      { error: "React to the deal before updating its pipeline stage" },
      { status: 403 }
    );
  }

  const deal = await prisma.scoutDeal.update({
    where: { id: dealId },
    data: {
      pipelineStage:     body.stage,
      pipelineUpdatedAt: new Date(),
    },
    select: {
      id:                true,
      address:           true,
      pipelineStage:     true,
      pipelineUpdatedAt: true,
    },
  });

  return NextResponse.json({ deal });
}
