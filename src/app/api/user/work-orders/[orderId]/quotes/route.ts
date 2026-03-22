import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/work-orders/:orderId/quotes
export async function GET(
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
    include: { quotes: { orderBy: { price: "asc" } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ quotes: order.quotes });
}

// POST /api/user/work-orders/:orderId/quotes — add a quote received
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

  const body = await req.json();
  const { contractorName, price, warranty, timeline, rating, notes } = body;

  if (!contractorName || !price) {
    return NextResponse.json(
      { error: "contractorName and price are required" },
      { status: 400 }
    );
  }

  const quote = await prisma.tenderQuote.create({
    data: {
      workOrderId: orderId,
      contractorName: String(contractorName),
      price: Number(price),
      warranty: warranty ?? null,
      timeline: timeline ?? null,
      rating: rating ? Number(rating) : null,
      notes: notes ?? null,
    },
  });

  // Move status to quotes_received if still tendered
  if (order.status === "tendered") {
    await prisma.workOrder.update({
      where: { id: orderId },
      data: { status: "quotes_received" },
    });
  }

  return NextResponse.json({ quote }, { status: 201 });
}
