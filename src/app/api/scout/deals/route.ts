import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const RAPIDAPI_KEY = process.env.X_RapidAPI_Key ?? "";

// ── Demo deals — FL Mixed Portfolio geography ─────────────────────────────
// Shown on first load when no live deals exist in DB.
const DEMO_DEALS = [
  {
    id: "demo-fl-001",
    address: "4821 Commerce Park Blvd, Tampa, FL 33619",
    assetType: "Industrial / Warehouse",
    sqft: 12400,
    askingPrice: 1_850_000,
    guidePrice: null,
    capRate: 7.2,
    brokerName: "Marcus & Millichap Tampa",
    daysOnMarket: 42,
    sourceTag: "Pre-market",
    sourceUrl: null,
    hasLisPendens: false,
    hasInsolvency: false,
    lastSaleYear: 2009,
    hasPlanningApplication: false,
    solarIncomeEstimate: 18400,
    inFloodZone: false,
    auctionDate: null,
    ownerName: "Tamvest Holdings LLC",
    satelliteImageUrl: null,
    signalCount: 4,
    currency: "USD",
    userReaction: null,
    // Extended deal intelligence
    pricePerSqft: 149,
    marketCapRate: 6.1,
    noi: 133_200,
    occupancy: 100,
    wault: 3.2,
    yearBuilt: 1998,
    rentUplift:
      "Current passing rent is 22% below FL industrial market ERV. Lease expires Q1 2027 — rent review window could add meaningful NOI uplift.",
    planningPlay:
      "Site sits within light industrial zone with neighbouring parcels historically considered for logistics expansion. No formal application on record.",
    portfolioComparison:
      "Asset class and lease profile consistent with your existing portfolio. Cap rate 18% above your current portfolio average.",
  },
  {
    id: "demo-fl-002",
    address: "2210 Landstreet Rd, Orlando, FL 32809",
    assetType: "Flex Industrial",
    sqft: 8500,
    askingPrice: 1_195_000,
    guidePrice: null,
    capRate: 6.8,
    brokerName: "CBRE Orlando",
    daysOnMarket: 17,
    sourceTag: "LoopNet",
    sourceUrl: null,
    hasLisPendens: false,
    hasInsolvency: false,
    lastSaleYear: 2015,
    hasPlanningApplication: false,
    solarIncomeEstimate: null,
    inFloodZone: false,
    auctionDate: null,
    ownerName: null,
    satelliteImageUrl: null,
    signalCount: 3,
    currency: "USD",
    userReaction: null,
    pricePerSqft: 141,
    marketCapRate: 6.1,
    noi: 81_260,
    occupancy: 95,
    wault: 1.8,
    yearBuilt: 2004,
    rentUplift:
      "Short WAULT creates near-term re-gear or re-letting opportunity at market rents. Orlando flex industrial rents have risen 14% over the past 24 months.",
    planningPlay:
      "No active planning applications on record. Area subject to county-level logistics corridor designation — long-term change of use potential.",
    portfolioComparison:
      "Similar sqft and asset class to existing holdings. Lower price/sqft than comparable recent FL acquisitions.",
  },
  {
    id: "demo-fl-003",
    address: "7760 Blanding Blvd Unit C, Jacksonville, FL 32244",
    assetType: "Distribution / Logistics",
    sqft: 28600,
    askingPrice: 3_400_000,
    guidePrice: 3_100_000,
    capRate: 5.9,
    brokerName: "JLL Jacksonville",
    daysOnMarket: 68,
    sourceTag: "Distressed",
    sourceUrl: null,
    hasLisPendens: true,
    hasInsolvency: false,
    lastSaleYear: 2017,
    hasPlanningApplication: false,
    solarIncomeEstimate: 38000,
    inFloodZone: false,
    auctionDate: null,
    ownerName: "Northgate Logistics LLC",
    satelliteImageUrl: null,
    signalCount: 5,
    currency: "USD",
    userReaction: null,
    pricePerSqft: 119,
    marketCapRate: 6.1,
    noi: 200_600,
    occupancy: 88,
    wault: 4.6,
    yearBuilt: 2001,
    rentUplift:
      "Owner entity shows financial stress — lis pendens filed Q4 2025. Guide price reflects motivated seller. Passing rent below market by ~16%.",
    planningPlay:
      "Size and location suitable for last-mile logistics upgrade. Site not subject to any current planning restrictions.",
    portfolioComparison:
      "Largest single asset by sqft in your potential pipeline. NOI yield and WAULT in line with portfolio targets.",
  },
  {
    id: "demo-fl-004",
    address: "1140 N Lime Ave, Sarasota, FL 34237",
    assetType: "Mixed Use / Retail",
    sqft: 6200,
    askingPrice: 920_000,
    guidePrice: null,
    capRate: 7.8,
    brokerName: "Coldwell Banker Commercial",
    daysOnMarket: 91,
    sourceTag: "Planning signal",
    sourceUrl: null,
    hasLisPendens: false,
    hasInsolvency: false,
    lastSaleYear: 2003,
    hasPlanningApplication: true,
    solarIncomeEstimate: null,
    inFloodZone: false,
    auctionDate: null,
    ownerName: "SRQ Properties LLC",
    satelliteImageUrl: null,
    signalCount: 4,
    currency: "USD",
    userReaction: null,
    pricePerSqft: 148,
    marketCapRate: 6.5,
    noi: 71_760,
    occupancy: 92,
    wault: 2.1,
    yearBuilt: 1986,
    rentUplift:
      "Cap rate 130bps above Sarasota mixed-use market rate. Long-held asset suggests owner has not re-based rents to current market levels.",
    planningPlay:
      "Change of use application submitted — outline planning for conversion to residential above retail. Decision pending. Cautious interpretation warranted pending outcome.",
    portfolioComparison:
      "Lower asset value than your typical acquisition, but strong yield. Could complement portfolio diversification into mixed-use.",
  },
  {
    id: "demo-fl-005",
    address: "3340 SW 30th Ave, Fort Lauderdale, FL 33312",
    assetType: "Light Industrial",
    sqft: 15800,
    askingPrice: null,
    guidePrice: 2_100_000,
    capRate: 6.4,
    brokerName: "Auction.com Commercial",
    daysOnMarket: 8,
    sourceTag: "Auction",
    sourceUrl: null,
    hasLisPendens: false,
    hasInsolvency: false,
    lastSaleYear: 2012,
    hasPlanningApplication: false,
    solarIncomeEstimate: 22000,
    inFloodZone: false,
    auctionDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    ownerName: null,
    satelliteImageUrl: null,
    signalCount: 3,
    currency: "USD",
    userReaction: null,
    pricePerSqft: 133,
    marketCapRate: 6.1,
    noi: 134_400,
    occupancy: 100,
    wault: 5.5,
    yearBuilt: 2007,
    rentUplift:
      "Fully let on long WAULT lease. Passing rent marginally below market — limited near-term uplift but strong income security.",
    planningPlay:
      "No current planning applications. Industrial zone with good road access. No identified change of use potential at present.",
    portfolioComparison:
      "Strong WAULT and full occupancy. Suits income-focused portfolio objective. Auction deadline requires prompt decision.",
  },
];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ deals: [], reactionCount: 0 });
  }

  const apiKeyConfigured = !!RAPIDAPI_KEY;

  // Return all active deals with user reactions
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

  // If no live deals, return demo FL portfolio deals
  if (deals.length === 0) {
    return NextResponse.json({
      deals: DEMO_DEALS,
      reactionCount: 0,
      apiKeyConfigured,
      isDemo: true,
    });
  }

  const reactionMap = new Map(reactions.map((r) => [r.dealId, r.reaction]));

  const enriched = deals.map((d) => {
    const pricePerSqft =
      d.askingPrice && d.sqft ? Math.round(d.askingPrice / d.sqft) : null;
    const noi =
      d.askingPrice && d.capRate
        ? Math.round((d.askingPrice * d.capRate) / 100)
        : null;
    return {
      id: d.id,
      address: d.address,
      assetType: d.assetType,
      sqft: d.sqft,
      askingPrice: d.askingPrice,
      guidePrice: d.guidePrice,
      capRate: d.capRate,
      brokerName: d.brokerName,
      daysOnMarket: d.daysOnMarket,
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
      // Computed extended fields
      pricePerSqft,
      marketCapRate: null,
      noi,
      occupancy: null,
      wault: null,
      yearBuilt: null,
      rentUplift: null,
      planningPlay: null,
      portfolioComparison: null,
    };
  });

  return NextResponse.json({
    deals: enriched,
    reactionCount: reactions.length,
    apiKeyConfigured,
    isDemo: false,
  });
}
