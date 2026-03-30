/**
 * GET /api/scout/deals/:dealId/investors/:outreachId
 * Get single investor outreach record
 *
 * PATCH /api/scout/deals/:dealId/investors/:outreachId
 * Update investor outreach status (opened, responded, etc.)
 *
 * Used by: Scout v2 investor tracking to update when documents opened/responded
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/scout/deals/:dealId/investors/:outreachId - Get single outreach record
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string; outreachId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { dealId, outreachId } = await params;

  const outreach = await prisma.investorOutreach.findFirst({
    where: {
      id: outreachId,
      dealId,
      userId: user.id,
    },
    include: {
      investor: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          type: true,
          status: true,
        },
      },
      deal: {
        select: {
          id: true,
          address: true,
          assetType: true,
          askingPrice: true,
          region: true,
        },
      },
    },
  });

  if (!outreach) {
    return NextResponse.json(
      { error: "Outreach record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(outreach);
}

// PATCH /api/scout/deals/:dealId/investors/:outreachId - Update outreach status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string; outreachId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { dealId, outreachId } = await params;

  // Verify outreach exists and belongs to user
  const existingOutreach = await prisma.investorOutreach.findFirst({
    where: {
      id: outreachId,
      dealId,
      userId: user.id,
    },
  });

  if (!existingOutreach) {
    return NextResponse.json(
      { error: "Outreach record not found" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { status, openedAt, responseAt, notes } = body;

  // Validate status if provided
  if (status) {
    const validStatuses = ["sent", "opened", "responded", "declined"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  // Update outreach record
  const updated = await prisma.investorOutreach.update({
    where: { id: outreachId },
    data: {
      ...(status !== undefined && { status }),
      ...(openedAt !== undefined && { openedAt: openedAt ? new Date(openedAt) : null }),
      ...(responseAt !== undefined && { responseAt: responseAt ? new Date(responseAt) : null }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      investor: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          type: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/scout/deals/:dealId/investors/:outreachId - Delete outreach record
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string; outreachId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { dealId, outreachId } = await params;

  // Verify outreach exists and belongs to user
  const outreach = await prisma.investorOutreach.findFirst({
    where: {
      id: outreachId,
      dealId,
      userId: user.id,
    },
  });

  if (!outreach) {
    return NextResponse.json(
      { error: "Outreach record not found" },
      { status: 404 }
    );
  }

  await prisma.investorOutreach.delete({
    where: { id: outreachId },
  });

  return NextResponse.json({ success: true });
}
