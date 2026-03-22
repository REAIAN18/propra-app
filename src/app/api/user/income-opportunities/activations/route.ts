import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/income-opportunities/activations
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ activations: [] });
  }

  const activations = await prisma.incomeActivation.findMany({
    where: { userId: session.user.id },
    select: { assetId: true, opportunityType: true, status: true, requestedAt: true },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ activations });
}
