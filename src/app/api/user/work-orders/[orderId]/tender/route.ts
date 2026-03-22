import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/user/work-orders/:orderId/tender — transition status to tendered
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["draft", "tendered"].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot tender order with status: ${order.status}` },
      { status: 400 }
    );
  }

  const updated = await prisma.workOrder.update({
    where: { id: orderId },
    data: { status: "tendered" },
    include: { asset: { select: { name: true, location: true } } },
  });

  return NextResponse.json({ order: updated });
}
