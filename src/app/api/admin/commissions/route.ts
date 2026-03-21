import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, assetId, category, annualSaving, commissionRate, status, sourceId } = body;

  if (!userId || !category || annualSaving == null || commissionRate == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const commissionValue = annualSaving * commissionRate;

  const commission = await prisma.commission.create({
    data: {
      userId,
      assetId: assetId || null,
      category,
      sourceId: sourceId || null,
      annualSaving: Number(annualSaving),
      commissionRate: Number(commissionRate),
      commissionValue,
      status: status || "pending",
    },
    include: {
      user: { select: { email: true, name: true } },
      asset: { select: { name: true, location: true } },
    },
  });

  return NextResponse.json(commission, { status: 201 });
}
