/**
 * POST /api/user/work-orders/:orderId/start
 * Moves a work order from "awarded" → "in_progress".
 * Records an initial WorkOrderMilestone ("Work started").
 *
 * Body: { contractorId?: string; agreedPrice?: number; note?: string }
 * Response: { order: WorkOrder }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const body = await req.json().catch(() => ({})) as {
    contractorId?: string;
    agreedPrice?: number;
    note?: string;
  };

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (order.status !== "awarded") {
    return NextResponse.json(
      { error: `Cannot start order with status: ${order.status}` },
      { status: 400 }
    );
  }

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [updated] = await Promise.all([
    prisma.workOrder.update({
      where: { id: orderId },
      data: {
        status: "in_progress",
        ...(body.contractorId ? { contractorId: body.contractorId } : {}),
        ...(body.agreedPrice   ? { agreedPrice:  body.agreedPrice  } : {}),
      },
      include: { asset: { select: { name: true, location: true } } },
    }),
    prisma.workOrderMilestone.create({
      data: {
        workOrderId: orderId,
        title:       "Work started",
        description: body.note ?? null,
        dueDate:     sevenDaysFromNow,
        status:      "in_progress",
      },
    }),
  ]);

  return NextResponse.json({ order: updated });
}
