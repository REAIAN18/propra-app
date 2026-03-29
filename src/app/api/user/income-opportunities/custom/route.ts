/**
 * POST /api/user/income-opportunities/custom
 * Create a user-defined custom income opportunity.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    assetId,
    opportunityType,
    opportunityLabel,
    annualIncome,
    notes,
    providerContact,
  } = body;

  if (!assetId || !opportunityLabel || !annualIncome) {
    return NextResponse.json(
      { error: "Missing required fields: assetId, opportunityLabel, annualIncome" },
      { status: 400 }
    );
  }

  // Verify asset ownership
  const asset = await prisma.userAsset.findUnique({
    where: { id: assetId },
    select: { userId: true },
  });

  if (!asset || asset.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Asset not found or unauthorized" },
      { status: 404 }
    );
  }

  // Create custom income activation
  const activation = await prisma.incomeActivation.create({
    data: {
      userId: session.user.id,
      assetId,
      opportunityType: opportunityType || "custom",
      opportunityLabel,
      annualIncome: parseFloat(annualIncome),
      isCustom: true,
      status: "requested",
      activationStage: "identified",
      confidence: null, // User-added, no AI confidence
      methodology: notes || "User-defined custom opportunity",
      providerContact: providerContact || null,
      stageHistory: [
        {
          stage: "identified",
          date: new Date().toISOString().split("T")[0],
          notes: "Custom opportunity added by user",
        },
      ],
    },
  });

  return NextResponse.json({
    success: true,
    id: activation.id,
    message: "Custom opportunity created",
  });
}
