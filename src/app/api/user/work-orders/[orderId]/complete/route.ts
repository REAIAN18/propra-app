/**
 * POST /api/user/work-orders/:orderId/complete
 * Marks a work order as complete and triggers commission creation.
 *
 * Flow:
 *   1. Verify order is "in_progress" (idempotency check: 400 if already complete)
 *   2. Create WorkOrderCompletion record
 *   3. Update WorkOrder status → "complete", finalCost
 *   4. Create Commission record (3% of finalCost)
 *   5. If clientRating + contractorId: update Contractor rolling rating
 *   6. If GOCARDLESS_ACCESS_TOKEN: initiate payment
 *   7. Send completion email to owner-operator
 *
 * Body (JSON): { finalCost: number; contractorRating?: number; completionNotes?: string }
 * Response: { order: WorkOrder; commission: { id, commissionValue, commissionRate } }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendWorkOrderComplete } from "@/lib/email";

const COMMISSION_RATE = 0.03;

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
    include: {
      asset: { select: { id: true, name: true, country: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (order.status === "complete") {
    return NextResponse.json(
      { error: "Work order is already complete" },
      { status: 400 }
    );
  }

  if (order.status !== "in_progress") {
    return NextResponse.json(
      { error: `Cannot complete order with status: ${order.status}` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({})) as {
    finalCost?: number;
    contractorRating?: number;
    completionNotes?: string;
  };

  if (!body.finalCost || body.finalCost <= 0) {
    return NextResponse.json(
      { error: "finalCost is required and must be positive" },
      { status: 422 }
    );
  }

  const finalCost = Number(body.finalCost);
  const commissionValue = Math.round(finalCost * COMMISSION_RATE * 100) / 100;
  const isUK = (order.asset?.country ?? "").toUpperCase() !== "US";
  const currency = isUK ? "GBP" : "USD";

  // ── Create completion record ─────────────────────────────────────────────
  let goCardlessPaymentId: string | null = null;

  // GoCardless payment (if configured)
  if (process.env.GOCARDLESS_ACCESS_TOKEN) {
    try {
      const gcRes = await fetch("https://api.gocardless.com/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "GoCardless-Version": "2015-07-06",
        },
        body: JSON.stringify({
          payments: {
            amount:      Math.round(commissionValue * 100), // pence/cents
            currency:    currency,
            description: `RealHQ commission: work order completion — ${order.jobType}`,
            links:       {},
          },
        }),
      });
      if (gcRes.ok) {
        const gcData = await gcRes.json() as { payments?: { id?: string } };
        goCardlessPaymentId = gcData.payments?.id ?? null;
      }
    } catch {
      // Non-fatal — completion proceeds without payment
    }
  }

  await prisma.workOrderCompletion.create({
    data: {
      workOrderId:           orderId,
      contractorId:          order.contractorId ?? null,
      finalCost,
      completionNotes:       body.completionNotes ?? null,
      contractorRatingGiven: body.contractorRating ?? null,
      goCardlessPaymentId,
    },
  });

  // Update WorkOrder
  await prisma.workOrder.update({
    where: { id: orderId },
    data: { status: "complete", finalCost },
  });

  // Create Commission
  const commission = await prisma.commission.create({
    data: {
      userId:         session.user.id,
      assetId:        order.assetId ?? null,
      category:       "work_order",
      sourceId:       orderId,
      annualSaving:   0, // one-time job — not a recurring saving
      commissionRate: COMMISSION_RATE,
      commissionValue,
      status:         "confirmed",
      placedAt:       new Date(),
    },
    select: {
      id:              true,
      commissionValue: true,
      commissionRate:  true,
    },
  });

  // Update contractor rolling rating if provided
  if (body.contractorRating && order.contractorId) {
    const contractor = await prisma.contractor.findUnique({
      where: { id: order.contractorId },
      select: { id: true, rating: true, jobCount: true },
    });
    if (contractor) {
      const newJobCount = contractor.jobCount + 1;
      const newRating   = (
        (contractor.rating * contractor.jobCount) + body.contractorRating
      ) / newJobCount;
      await prisma.contractor.update({
        where: { id: contractor.id },
        data: {
          rating:   Math.round(newRating * 100) / 100,
          jobCount: newJobCount,
        },
      });
    }
  }

  // ── Send completion email (non-fatal) ────────────────────────────────────
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });
    if (user?.email) {
      await sendWorkOrderComplete(
        user.email,
        user.name ?? "there",
        order.jobType,
        order.asset?.name ?? "your property",
        finalCost,
        currency,
        orderId
      );
    }
  } catch {
    // Non-fatal
  }

  // ── Fetch updated order for response ────────────────────────────────────
  const updatedOrder = await prisma.workOrder.findUnique({
    where: { id: orderId },
    include: { asset: { select: { name: true, location: true } } },
  });

  return NextResponse.json({ order: updatedOrder, commission });
}
