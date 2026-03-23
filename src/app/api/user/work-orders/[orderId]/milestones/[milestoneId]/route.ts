/**
 * PATCH /api/user/work-orders/:orderId/milestones/:milestoneId
 * Updates milestone status (and optionally title/description/dueDate).
 * When all milestones are "complete", returns { allComplete: true }.
 *
 * Body: { status?: "pending" | "in_progress" | "complete"; title?: string; description?: string; dueDate?: string }
 * Response: { milestone: WorkOrderMilestone; allComplete: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["pending", "in_progress", "complete"] as const;
type MilestoneStatus = typeof VALID_STATUSES[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; milestoneId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, milestoneId } = await params;

  // Verify work order ownership
  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify milestone belongs to this order
  const existing = await prisma.workOrderMilestone.findFirst({
    where: { id: milestoneId, workOrderId: orderId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    status?: string;
    title?: string;
    description?: string;
    dueDate?: string;
  };

  const updateData: {
    status?: MilestoneStatus;
    title?: string;
    description?: string | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
  } = {};

  if (body.status) {
    if (!VALID_STATUSES.includes(body.status as MilestoneStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 422 }
      );
    }
    updateData.status = body.status as MilestoneStatus;
    updateData.completedAt = body.status === "complete" ? new Date() : null;
  }
  if (body.title)       updateData.title       = body.title.trim();
  if ("description" in body) updateData.description = body.description ?? null;
  if ("dueDate"     in body) updateData.dueDate     = body.dueDate ? new Date(body.dueDate) : null;

  const milestone = await prisma.workOrderMilestone.update({
    where: { id: milestoneId },
    data: updateData,
  });

  // Check if all milestones are complete
  const remaining = await prisma.workOrderMilestone.count({
    where: { workOrderId: orderId, status: { not: "complete" } },
  });

  return NextResponse.json({ milestone, allComplete: remaining === 0 });
}
