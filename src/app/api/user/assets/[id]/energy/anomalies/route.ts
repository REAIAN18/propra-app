import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const assetId = params.id;
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: user.id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const anomalies = await prisma.energyAnomaly.findMany({
    where: { assetId: asset.id, status: "open" },
    orderBy: { annualSavingGbp: "desc" },
  });

  return NextResponse.json({ anomalies });
}
