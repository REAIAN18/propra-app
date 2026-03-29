/**
 * PUT /api/user/income-opportunities/[id]/stage
 * Update activation stage for an income opportunity.
 *
 * Stages: identified → researching → quoting → approved → installing → live → renewing
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STAGES = [
  "identified",
  "researching",
  "quoting",
  "approved",
  "installing",
  "live",
  "renewing",
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activationId = (await params).id;
  const body = await request.json();
  const { stage, notes } = body;

  if (!stage || !VALID_STAGES.includes(stage)) {
    return NextResponse.json(
      { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
      { status: 400 }
    );
  }

  // Fetch activation and verify ownership
  const activation = await prisma.incomeActivation.findUnique({
    where: { id: activationId },
    select: { userId: true, stageHistory: true, activationStage: true },
  });

  if (!activation || activation.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Income activation not found or unauthorized" },
      { status: 404 }
    );
  }

  // Build updated stage history
  const existingHistory = (activation.stageHistory as Array<{
    stage: string;
    date: string;
    notes: string;
  }>) ?? [];

  const newHistoryEntry = {
    stage,
    date: new Date().toISOString().split("T")[0],
    notes: notes || `Moved to ${stage}`,
  };

  const updatedHistory = [...existingHistory, newHistoryEntry];

  // Map stage to legacy status field
  const statusMap: Record<string, string> = {
    identified: "requested",
    researching: "requested",
    quoting: "requested",
    approved: "in_progress",
    installing: "in_progress",
    live: "live",
    renewing: "live",
  };

  const status = statusMap[stage] || "requested";

  // Update activation
  await prisma.incomeActivation.update({
    where: { id: activationId },
    data: {
      activationStage: stage,
      stageHistory: updatedHistory,
      status,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    stage,
    message: `Activation stage updated to ${stage}`,
  });
}
