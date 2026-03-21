import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/requests — returns the user's actioned commissions (previously service requests)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const commissions = await prisma.commission.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      annualSaving: true,
      commissionValue: true,
      status: true,
      placedAt: true,
      createdAt: true,
      asset: { select: { name: true, location: true } },
    },
  });

  return NextResponse.json(commissions);
}
