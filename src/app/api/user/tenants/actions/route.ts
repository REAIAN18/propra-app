import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ actions: [] });

  const actions = await prisma.tenantEngagementAction.findMany({
    where: { userId: session.user.id },
    select: { leaseRef: true, actionType: true },
  });

  return NextResponse.json({ actions });
}
