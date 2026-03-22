import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ leaseRef: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leaseRef } = await params;

  const existing = await prisma.tenantEngagementAction.findFirst({
    where: { userId: session.user.id, leaseRef, actionType: "review_break" },
  });
  if (existing) return NextResponse.json({ action: existing });

  const action = await prisma.tenantEngagementAction.create({
    data: { userId: session.user.id, leaseRef, actionType: "review_break" },
  });

  return NextResponse.json({ action });
}
