import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/investor-outreach/[outreachId] - Get single outreach record
export async function GET(
  req: NextRequest,
  { params }: { params: { outreachId: string } }
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

  const outreach = await prisma.investorOutreach.findFirst({
    where: {
      id: params.outreachId,
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
          sourceTag: true,
        },
      },
    },
  });

  if (!outreach) {
    return NextResponse.json({ error: "Outreach not found" }, { status: 404 });
  }

  return NextResponse.json(outreach);
}

// PATCH /api/user/investor-outreach/[outreachId] - Update outreach (track opens, responses)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { outreachId: string } }
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

  const existing = await prisma.investorOutreach.findFirst({
    where: {
      id: params.outreachId,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Outreach not found" }, { status: 404 });
  }

  const body = await req.json();
  const { openedAt, responseAt, status, notes } = body;

  const outreach = await prisma.investorOutreach.update({
    where: { id: params.outreachId },
    data: {
      openedAt: openedAt ? new Date(openedAt) : undefined,
      responseAt: responseAt ? new Date(responseAt) : undefined,
      status: status || undefined,
      notes: notes !== undefined ? notes : undefined,
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
        },
      },
    },
  });

  return NextResponse.json(outreach);
}

// DELETE /api/user/investor-outreach/[outreachId] - Delete outreach record
export async function DELETE(
  req: NextRequest,
  { params }: { params: { outreachId: string } }
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

  const existing = await prisma.investorOutreach.findFirst({
    where: {
      id: params.outreachId,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Outreach not found" }, { status: 404 });
  }

  await prisma.investorOutreach.delete({
    where: { id: params.outreachId },
  });

  return NextResponse.json({ success: true });
}
