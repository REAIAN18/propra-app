import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/work-orders/:orderId/bids
// Returns all contractor bids (TenderQuotes) for a work order.
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
    include: {
      quotes: {
        orderBy: { price: "asc" },
        select: {
          id: true,
          contractorName: true,
          price: true,
          timeline: true,
          warranty: true,
          rating: true,
          notes: true,
          awarded: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bids = order.quotes.map((q) => ({
    id: q.id,
    contractor: { name: q.contractorName, rating: q.rating },
    price: q.price,
    timeline: q.timeline,
    warranty: q.warranty,
    notes: q.notes,
    awarded: q.awarded,
    submittedAt: q.createdAt,
  }));

  return NextResponse.json({ bids });
}
