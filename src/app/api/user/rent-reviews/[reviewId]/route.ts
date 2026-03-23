/**
 * PATCH /api/user/rent-reviews/:reviewId
 * Update status of a rent review event (e.g. dismiss: status="dismissed").
 *
 * Body: { status: string }
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

const VALID_STATUSES = ["pending", "draft_sent", "hot_drafted", "hot_signed", "lease_renewed", "no_action", "dismissed"];

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
  const body = await req.json() as { status: string };

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const db = prisma as unknown as PrismaWithRentReview;

  const review = await db.rentReviewEvent.findFirst({
    where: { id: reviewId, userId: user.id },
  } as object);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const updated = await db.rentReviewEvent.update({
    where: { id: reviewId },
    data: { status: body.status },
  } as object);

  return NextResponse.json({ review: updated });
}
