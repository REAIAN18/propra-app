import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/summary — compact opportunity aggregate for dashboard polling
// Used by the post-property-add polling loop to update the KPI strip without a full page refresh.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ totalOpportunity: 0, cards: [], assetCount: 0 }, { status: 401 });
  }

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      insurancePremium: true,
      marketInsurance: true,
      energyCost: true,
      marketEnergyCost: true,
    },
  });

  const insuranceSave = assets.reduce(
    (s, a) => s + Math.max(0, (a.insurancePremium ?? 0) - (a.marketInsurance ?? 0)),
    0
  );
  const energySave = assets.reduce(
    (s, a) => s + Math.max(0, (a.energyCost ?? 0) - (a.marketEnergyCost ?? 0)),
    0
  );
  const totalOpportunity = insuranceSave + energySave;

  const cards = [
    { category: "ins", amount: insuranceSave },
    { category: "util", amount: energySave },
  ].filter((c) => c.amount > 0);

  return NextResponse.json({
    totalOpportunity,
    cards,
    assetCount: assets.length,
  });
}
