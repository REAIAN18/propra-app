import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const { token } = await context.params;

  try {
    const body = await req.json();
    const { price, breakdown, proposedStart, proposedDuration, paymentTerms, questions } = body;

    if (!price || !breakdown || !proposedStart || !proposedDuration || !paymentTerms) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the quote by token
    const quote = await prisma.tenderQuote.findUnique({
      where: { tenderToken: token },
      include: { workOrder: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (quote.submittedAt) {
      return NextResponse.json(
        { error: "Quote already submitted" },
        { status: 400 }
      );
    }

    // Update the quote
    const updated = await prisma.tenderQuote.update({
      where: { id: quote.id },
      data: {
        price,
        breakdown: breakdown as any,
        proposedStart: new Date(proposedStart),
        proposedDuration,
        paymentTerms,
        questions,
        submittedAt: new Date(),
        status: "submitted",
      },
    });

    // Update work order status if needed
    await prisma.workOrder.update({
      where: { id: quote.workOrderId },
      data: { status: "quotes_received" },
    });

    return NextResponse.json({ success: true, quote: updated });
  } catch (error) {
    console.error("Tender submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit quote" },
      { status: 500 }
    );
  }
}
