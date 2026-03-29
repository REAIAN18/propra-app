/**
 * GET /api/scout/deals/:dealId/investors
 * Returns all investor outreach for a specific deal, with investor contact details
 *
 * POST /api/scout/deals/:dealId/investors
 * Create new investor outreach record (track when IM/teaser/data room sent)
 *
 * Used by: Scout v2 deal pages for investor tracking and Express Interest features
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/scout/deals/:dealId/investors - List all investor outreach for this deal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
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

  const { dealId } = await params;

  // Verify deal exists
  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Get all investor outreach for this deal
  const outreach = await prisma.investorOutreach.findMany({
    where: { dealId, userId: user.id },
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
    orderBy: { sentAt: "desc" },
  });

  return NextResponse.json(outreach);
}

// POST /api/scout/deals/:dealId/investors - Create new investor outreach
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
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

  const { dealId } = await params;

  // Verify deal exists
  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const body = await req.json();
  const { investorId, documentType, notes } = body;

  // Validate required fields
  if (!investorId || !documentType) {
    return NextResponse.json(
      { error: "investorId and documentType are required" },
      { status: 400 }
    );
  }

  // Validate documentType
  const validDocTypes = ["im", "teaser", "data_room"];
  if (!validDocTypes.includes(documentType)) {
    return NextResponse.json(
      {
        error: `documentType must be one of: ${validDocTypes.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Verify investor exists and belongs to user
  const investor = await prisma.investorContact.findFirst({
    where: { id: investorId, userId: user.id },
  });

  if (!investor) {
    return NextResponse.json(
      { error: "Investor contact not found" },
      { status: 404 }
    );
  }

  // Create outreach record
  const outreach = await prisma.investorOutreach.create({
    data: {
      userId: user.id,
      dealId,
      investorId,
      documentType,
      notes,
      status: "sent",
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

  return NextResponse.json(outreach, { status: 201 });
}
