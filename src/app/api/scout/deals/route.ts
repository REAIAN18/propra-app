import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ deals: [], reactionCount: 0 });
  }

  const [deals, reactions] = await Promise.all([
    prisma.scoutDeal.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scoutReaction.findMany({
      where: { userId: session.user.id },
      select: { dealId: true, reaction: true },
    }),
  ]);

  const reactionMap = new Map(reactions.map((r) => [r.dealId, r.reaction]));

  const enriched = deals.map((d) => ({
    id: d.id,
    address: d.address,
    assetType: d.assetType,
    sqft: d.sqft,
    askingPrice: d.askingPrice,
    guidePrice: d.guidePrice,
    sourceTag: d.sourceTag,
    sourceUrl: d.sourceUrl,
    hasLisPendens: d.hasLisPendens,
    hasInsolvency: d.hasInsolvency,
    lastSaleYear: d.lastSaleYear,
    hasPlanningApplication: d.hasPlanningApplication,
    solarIncomeEstimate: d.solarIncomeEstimate,
    inFloodZone: d.inFloodZone,
    auctionDate: d.auctionDate?.toISOString() ?? null,
    ownerName: d.ownerName,
    satelliteImageUrl: d.satelliteImageUrl,
    signalCount: d.signalCount,
    currency: d.currency,
    userReaction: reactionMap.get(d.id) ?? null,
  }));

  return NextResponse.json({
    deals: enriched,
    reactionCount: reactions.length,
  });
}
