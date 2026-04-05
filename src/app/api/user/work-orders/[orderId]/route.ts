/**
 * GET /api/user/work-orders/:orderId
 * Returns work order details with quotes, milestones, and all v2 fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  const { orderId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ order: null });
  }

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: {
      asset: { select: { id: true, name: true, location: true } },
      quotes: { orderBy: { price: "asc" } },
      milestones: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
