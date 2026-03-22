import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/user/work-orders/:orderId/award — award a tender to a contractor
export async function POST(
  req: NextRequest,
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

  if (!["tendered", "quotes_received"].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot award order with status: ${order.status}` },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { quoteId, contractorName, awardedPrice } = body;

  if (!contractorName) {
    return NextResponse.json(
      { error: "contractorName is required" },
      { status: 400 }
    );
  }

  // Mark the awarded quote
  if (quoteId) {
    await prisma.tenderQuote.updateMany({
      where: { workOrderId: orderId },
      data: { awarded: false },
    });
    await prisma.tenderQuote.update({
      where: { id: quoteId },
      data: { awarded: true },
    });
  }

  const updated = await prisma.workOrder.update({
    where: { id: orderId },
    data: {
      status: "awarded",
      contractor: contractorName,
      costEstimate: awardedPrice ? Number(awardedPrice) : undefined,
    },
    include: {
      asset: { select: { name: true, location: true } },
      quotes: { orderBy: { price: "asc" } },
    },
  });

  return NextResponse.json({ order: updated });
}
