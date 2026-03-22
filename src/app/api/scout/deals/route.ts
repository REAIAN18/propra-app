import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RAPIDAPI_KEY = process.env.X_RapidAPI_Key ?? "";
const RAPIDAPI_HOST = "loopnet-api.p.rapidapi.com";

// ── LoopNet helpers (duplicated from loopnet-sync to avoid circular imports) ──

function mapAssetType(raw: string | undefined): string {
  if (!raw) return "Commercial";
  const r = raw.toLowerCase();
  if (r.includes("industrial") || r.includes("manufacturing")) return "Industrial";
  if (r.includes("warehouse") || r.includes("distribution")) return "Warehouse";
  if (r.includes("office")) return "Office";
  if (r.includes("retail") || r.includes("shop")) return "Retail";
  if (r.includes("flex")) return "Flex / Light Industrial";
  return "Commercial";
}

function extractPrice(l: Record<string, unknown>): number | null {
  for (const k of ["price", "askingPrice", "listingPrice", "salePrice"]) {
    const c = l[k];
    const n = typeof c === "number" ? c : typeof c === "string" ? parseFloat(c.replace(/[^0-9.]/g, "")) : NaN;
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}

function extractCapRate(l: Record<string, unknown>): number | null {
  for (const k of ["capRate", "cap_rate", "capitalizationRate"]) {
    const c = l[k];
    const n = typeof c === "number" ? c : typeof c === "string" ? parseFloat(c.replace(/[^0-9.]/g, "")) : NaN;
    if (!isNaN(n) && n > 0 && n < 50) return n;
  }
  return null;
}

function extractSqft(l: Record<string, unknown>): number | null {
  for (const k of ["sqft", "squareFeet", "buildingSize", "size"]) {
    const c = l[k];
    const n = typeof c === "number" ? c : typeof c === "string" ? parseFloat(c.replace(/[^0-9.]/g, "")) : NaN;
    if (!isNaN(n) && n > 0) return Math.round(n);
  }
  return null;
}

function extractAddress(l: Record<string, unknown>): string {
  if (typeof l.address === "string" && l.address) return l.address;
  if (typeof l.fullAddress === "string" && l.fullAddress) return l.fullAddress;
  if (typeof l.streetAddress === "string") {
    const city = typeof l.city === "string" ? `, ${l.city}` : "";
    const state = typeof l.state === "string" ? `, ${l.state}` : "";
    return `${l.streetAddress}${city}${state}`;
  }
  return "Address unavailable";
}

function extractBroker(l: Record<string, unknown>): string | null {
  if (typeof l.brokerName === "string" && l.brokerName) return l.brokerName;
  if (typeof l.agentName === "string" && l.agentName) return l.agentName;
  if (l.broker && typeof l.broker === "object") {
    const b = l.broker as Record<string, unknown>;
    if (typeof b.name === "string" && b.name) return b.name;
  }
  return null;
}

function extractDaysOnMarket(l: Record<string, unknown>): number | null {
  for (const k of ["daysOnMarket", "days_on_market", "daysListed"]) {
    const c = l[k];
    const n = typeof c === "number" ? c : typeof c === "string" ? parseInt(c, 10) : NaN;
    if (!isNaN(n) && n >= 0) return n;
  }
  const dateStr = l.listingDate ?? l.listedDate ?? l.createdDate;
  if (typeof dateStr === "string") {
    const listed = new Date(dateStr);
    if (!isNaN(listed.getTime())) return Math.floor((Date.now() - listed.getTime()) / 86_400_000);
  }
  return null;
}

function extractId(l: Record<string, unknown>): string {
  return String(l.id ?? l.listingId ?? l.propertyId ?? Math.random().toString(36).slice(2));
}

function extractPhoto(l: Record<string, unknown>): string | null {
  if (typeof l.photoUrl === "string" && l.photoUrl) return l.photoUrl;
  if (typeof l.imageUrl === "string" && l.imageUrl) return l.imageUrl;
  if (typeof l.thumbnailUrl === "string" && l.thumbnailUrl) return l.thumbnailUrl;
  if (Array.isArray(l.photos) && l.photos.length > 0) {
    const p = l.photos[0];
    if (typeof p === "string") return p;
    if (p && typeof p === "object") {
      const po = p as Record<string, unknown>;
      return typeof po.url === "string" ? po.url : null;
    }
  }
  return null;
}

async function syncLoopNet(location: string, currency: string) {
  if (!RAPIDAPI_KEY) return;
  try {
    const params = new URLSearchParams({ location, property_type: "commercial", transaction_type: "sale", limit: "20" });
    const res = await fetch(`https://${RAPIDAPI_HOST}/properties/list?${params}`, {
      headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const listings: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.listings) ? data.listings
      : Array.isArray(data?.results) ? data.results
      : Array.isArray(data?.data) ? data.data
      : [];

    for (const l of listings) {
      const externalId = `loopnet-${extractId(l)}`;
      const askingPrice = extractPrice(l);
      const capRate = extractCapRate(l);
      const sqft = extractSqft(l);
      const broker = extractBroker(l);
      const dom = extractDaysOnMarket(l);
      const photo = extractPhoto(l);
      let signalCount = 1;
      if (capRate) signalCount++;
      if (sqft) signalCount++;
      if (dom !== null && dom < 30) signalCount++;
      if (broker) signalCount++;
      signalCount = Math.min(5, signalCount);
      const sourceUrl = typeof l.url === "string" ? l.url : typeof l.listingUrl === "string" ? l.listingUrl : null;

      await prisma.scoutDeal.upsert({
        where: { externalId },
        create: {
          externalId,
          address: extractAddress(l),
          assetType: mapAssetType(typeof l.propertyType === "string" ? l.propertyType : undefined),
          sqft, askingPrice, capRate, brokerName: broker, daysOnMarket: dom,
          sourceTag: "LoopNet", sourceUrl, satelliteImageUrl: photo,
          signalCount, currency, status: "active",
        },
        update: {
          address: extractAddress(l),
          assetType: mapAssetType(typeof l.propertyType === "string" ? l.propertyType : undefined),
          sqft, askingPrice, capRate, brokerName: broker, daysOnMarket: dom,
          sourceUrl, satelliteImageUrl: photo, signalCount, status: "active",
        },
      });
    }
  } catch (err) {
    console.error("[scout/deals] LoopNet sync error:", err);
    // fail silently — don't block the response
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ deals: [], reactionCount: 0 });
  }

  // Determine geography from user's portfolio or query param
  const { searchParams } = new URL(req.url);
  const locationOverride = searchParams.get("location");

  // Look up user's portfolio to pick location
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { portfolio: true },
  });
  const isUK = user?.portfolio === "SE_LOGISTICS";
  const location = locationOverride ?? (isUK ? "London, UK" : "Florida");
  const currency = isUK ? "GBP" : "USD";

  // Check if LoopNet cache is stale
  const mostRecent = await prisma.scoutDeal.findFirst({
    where: { sourceTag: "LoopNet", status: "active" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  const isStale = !mostRecent || (Date.now() - mostRecent.updatedAt.getTime() > CACHE_TTL_MS);
  if (isStale) {
    await syncLoopNet(location, currency);
  }

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

  const reactionMap = new Map(reactions.map((r) => [r.dealId, r.reaction]));

  const enriched = deals.map((d) => ({
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
  }));

  return NextResponse.json({
    deals: enriched,
    reactionCount: reactions.length,
  });
}
