import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ savedYTD: 0, actionCount: 0 });
  }

  const userId = session.user.id;

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const commissions = await prisma.commission.findMany({
    where: {
      userId,
      status: { in: ["confirmed", "invoiced", "paid"] },
      placedAt: { gte: yearStart },
    },
    select: { annualSaving: true },
  });

  const savedYTD = commissions.reduce((s, c) => s + c.annualSaving, 0);
  const actionCount = commissions.length;

  return NextResponse.json({ savedYTD, actionCount });
}
