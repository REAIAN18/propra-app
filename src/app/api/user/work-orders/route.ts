import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/work-orders
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.workOrder.findMany({
    where: { userId: session.user.id },
    include: { asset: { select: { name: true, location: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

// POST /api/user/work-orders — create a draft work order
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { jobType, assetId, description, targetStart, budgetEstimate } = body;

  if (!jobType || !description) {
    return NextResponse.json({ error: "jobType and description are required" }, { status: 400 });
  }

  // Determine currency from the user's asset (or default GBP)
  let currency = "GBP";
  if (assetId) {
    const asset = await prisma.userAsset.findFirst({
      where: { id: assetId, userId: session.user.id },
      select: { country: true },
    });
    if (asset?.country === "US") currency = "USD";
  }

  const order = await prisma.workOrder.create({
    data: {
      userId: session.user.id,
      assetId: assetId || null,
      jobType,
      description,
      targetStart: targetStart || null,
      budgetEstimate: budgetEstimate ? Number(budgetEstimate) : null,
      currency,
      status: "draft",
    },
    include: { asset: { select: { name: true, location: true } } },
  });

  return NextResponse.json({ order }, { status: 201 });
}
