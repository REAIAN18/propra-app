/**
 * POST /api/user/assets/:id/sell-enquiry
 *
 * Creates a SellEnquiry record when a user flags an asset for potential sale.
 * Idempotent — returns existing enquiry if one is already submitted.
 *
 * Body: { targetPrice?: number; notes?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  // Verify asset belongs to user
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    targetPrice?: number;
    notes?: string;
  };

  // Return existing open enquiry if present (idempotent)
  const existing = await prisma.sellEnquiry.findFirst({
    where: {
      userId:  session.user.id,
      assetId,
      status:  { in: ["submitted", "reviewing"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return NextResponse.json({ enquiry: existing, created: false });
  }

  const enquiry = await prisma.sellEnquiry.create({
    data: {
      userId:      session.user.id,
      assetId,
      targetPrice: body.targetPrice ?? null,
      notes:       body.notes ?? null,
      status:      "submitted",
    },
  });

  return NextResponse.json({ enquiry, created: true }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  const enquiries = await prisma.sellEnquiry.findMany({
    where: { userId: session.user.id, assetId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ enquiries });
}
