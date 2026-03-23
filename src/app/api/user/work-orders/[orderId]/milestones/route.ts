/**
 * GET  /api/user/work-orders/:orderId/milestones
 * Returns all milestones for a work order, ordered chronologically.
 *
 * POST /api/user/work-orders/:orderId/milestones
 * Creates a new milestone on a work order.
 * Body: { title: string; dueDate?: string; description?: string }
 * Response: { milestone: WorkOrderMilestone }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function verifyOwnership(orderId: string, userId: string) {
  return prisma.workOrder.findFirst({
    where: { id: orderId, userId },
    select: { id: true, status: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const order = await verifyOwnership(orderId, session.user.id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const milestones = await prisma.workOrderMilestone.findMany({
    where: { workOrderId: orderId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ milestones });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const order = await verifyOwnership(orderId, session.user.id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    title?: string;
    dueDate?: string;
    description?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 422 });
  }

  const milestone = await prisma.workOrderMilestone.create({
    data: {
      workOrderId: orderId,
      title:       body.title.trim(),
      description: body.description ?? null,
      dueDate:     body.dueDate ? new Date(body.dueDate) : null,
      status:      "pending",
    },
  });

  return NextResponse.json({ milestone }, { status: 201 });
}
