import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/user/income-opportunities/activate
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { opportunityType, assetId, opportunityLabel, annualIncome } = body;

  if (!opportunityType) {
    return NextResponse.json({ error: "opportunityType is required" }, { status: 400 });
  }

  // Validate assetId belongs to this user (if provided)
  if (assetId) {
    const asset = await prisma.userAsset.findFirst({
      where: { id: assetId, userId: session.user.id },
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
  }

  // Persist activation record — automated, no human ops step
  const activation = await prisma.incomeActivation.create({
    data: {
      userId: session.user.id,
      assetId: assetId ?? null,
      opportunityType,
      opportunityLabel: opportunityLabel ?? null,
      annualIncome: annualIncome ? Number(annualIncome) : null,
      status: "active",
    },
  });

  return NextResponse.json({ status: "active", activationId: activation.id });
}
