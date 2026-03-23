/**
 * PATCH /api/user/rent-reviews/:reviewId/complete
 * Records the final agreed rent and triggers commission record creation.
 * Commission: (newRent - passingRent) * 0.08 (8% of annualised uplift)
 * Updates event status to "lease_renewed".
 *
 * Body: { newRent: number; signedDate?: string }
 * Response: { success: true; commissionGbp: number; commissionId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import type { RentReviewEvent } from "@/generated/prisma";

type PrismaWithRentReview = {
  rentReviewEvent: {
    findFirst(q: object): Promise<RentReviewEvent | null>;
    update(q: object): Promise<RentReviewEvent>;
  };
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { reviewId } = await params;
  const body = await req.json() as { newRent: number; signedDate?: string };

  if (!body.newRent || body.newRent <= 0) {
    return NextResponse.json({ error: "newRent is required" }, { status: 400 });
  }

  const db = prisma as unknown as PrismaWithRentReview;

  const review = await db.rentReviewEvent.findFirst({
    where: { id: reviewId, userId: user.id },
  } as object);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const uplift = body.newRent - review.passingRent;
  const commissionRate = 0.08;
  const commissionGbp = Math.max(0, uplift * commissionRate);

  const signedDate = body.signedDate ? new Date(body.signedDate) : new Date();

  // Create Commission record
  const commission = await prisma.commission.create({
    data: {
      userId:          user.id,
      assetId:         review.assetId ?? undefined,
      category:        "rent_review",
      sourceId:        review.id,
      annualSaving:    uplift,
      commissionRate,
      commissionValue: commissionGbp,
      status:          "pending",
      placedAt:        signedDate,
    },
  });

  // Update the review event
  await db.rentReviewEvent.update({
    where: { id: review.id },
    data: {
      status:       "lease_renewed",
      newRent:      body.newRent,
      commissionGbp,
      leaseSigned:  signedDate,
    },
  } as object);

  // Update the Lease record if linked
  if (review.leaseId) {
    await prisma.lease.update({
      where: { id: review.leaseId },
      data: { passingRent: body.newRent, status: "active" },
    }).catch(() => null); // Non-fatal: lease may not exist yet
  }

  return NextResponse.json({
    success:      true,
    commissionGbp,
    commissionId: commission.id,
  });
}
