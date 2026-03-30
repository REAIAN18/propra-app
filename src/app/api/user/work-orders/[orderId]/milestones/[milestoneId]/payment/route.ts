/**
 * POST /api/user/work-orders/:orderId/milestones/:milestoneId/payment
 * Releases payment for a milestone.
 *
 * Body: { signOffNotes?: string }
 * Response: { milestone: WorkOrderMilestone }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; milestoneId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, milestoneId } = await params;

  // Verify order ownership
  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  // Verify milestone belongs to this order
  const milestone = await prisma.workOrderMilestone.findFirst({
    where: { id: milestoneId, workOrderId: orderId },
  });

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  if (milestone.paymentReleased) {
    return NextResponse.json({ error: "Payment already released" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { signOffNotes?: string };

  const updated = await prisma.workOrderMilestone.update({
    where: { id: milestoneId },
    data: {
      paymentReleased: true,
      paymentReleasedAt: new Date(),
      signOffNotes: body.signOffNotes || null,
      status: "complete",
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ milestone: updated });
}
