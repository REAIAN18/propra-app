import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    // Fetch the deal from the database
    const deal = await prisma.scoutDeal.findUnique({
      where: { id: dealId },
      include: {
        approachLetters: true,
        comparables: true,
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    // Return the deal data
    return NextResponse.json({
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      region: deal.region,
      satelliteImageUrl: deal.satelliteImageUrl,
      sqft: deal.sqft,
      askingPrice: deal.askingPrice,
      epcRating: deal.epcRating,
      yearBuilt: deal.yearBuilt,
      buildingSizeSqft: deal.buildingSizeSqft,
      ownerCompanyId: deal.ownerCompanyId,
      currentRentPsf: deal.currentRentPsf,
      marketRentPsf: deal.marketRentPsf,
      occupancyPct: deal.occupancyPct,
      enrichedAt: deal.enrichedAt,
      dataSources: deal.dataSources,
      brokerName: deal.brokerName,
      daysOnMarket: deal.daysOnMarket,
      sourceTag: deal.sourceTag,
      sourceUrl: deal.sourceUrl,
      ownerName: deal.ownerName,
      capRate: deal.capRate,
      guidePrice: deal.guidePrice,
      hasLisPendens: deal.hasLisPendens,
      hasInsolvency: deal.hasInsolvency,
      lastSaleYear: deal.lastSaleYear,
      hasPlanningApplication: deal.hasPlanningApplication,
      solarIncomeEstimate: deal.solarIncomeEstimate,
      inFloodZone: deal.inFloodZone,
      auctionDate: deal.auctionDate,
      signalCount: deal.signalCount,
      currency: deal.currency,
      approachLetters: deal.approachLetters,
      comparables: deal.comparables,
    });
  } catch (error) {
    console.error("Error fetching deal:", error);
    return NextResponse.json(
      { error: "Failed to fetch deal" },
      { status: 500 }
    );
  }
}
