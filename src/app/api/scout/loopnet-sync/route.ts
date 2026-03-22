import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RAPIDAPI_KEY = process.env.X_RapidAPI_Key ?? "";
const RAPIDAPI_HOST = "loopnet-api.p.rapidapi.com";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Map LoopNet property type strings to our asset type labels
function mapAssetType(raw: string | undefined): string {
  if (!raw) return "Commercial";
  const r = raw.toLowerCase();
  if (r.includes("industrial") || r.includes("manufacturing")) return "Industrial";
  if (r.includes("warehouse") || r.includes("distribution")) return "Warehouse";
  if (r.includes("office")) return "Office";
  if (r.includes("retail") || r.includes("shop")) return "Retail";
  if (r.includes("flex")) return "Flex / Light Industrial";
  if (r.includes("land")) return "Land";
  return "Commercial";
}

// Extract a numeric price from various LoopNet response shapes
function extractPrice(listing: Record<string, unknown>): number | null {
  const candidates = [
    listing.price,
    listing.askingPrice,
    listing.listingPrice,
    listing.salePrice,
  ];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : typeof c === "string" ? parseFloat(c.replace(/[^0-9.]/g, "")) : NaN;
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}

function extractCapRate(listing: Record<string, unknown>): number | null {
  const candidates = [listing.capRate, listing.cap_rate, listing.capitalizationRate];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : typeof c === "string" ? parseFloat(c.replace(/[^0-9.]/g, "")) : NaN;
    if (!isNaN(n) && n > 0 && n < 50) return n; // sanity check: cap rate 0-50%
  }
  return null;
}

function extractSqft(listing: Record<string, unknown>): number | null {
  const candidates = [listing.sqft, listing.squareFeet, listing.buildingSize, listing.size];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : typeof c === "string" ? parseFloat(c.replace(/[^0-9.]/g, "")) : NaN;
    if (!isNaN(n) && n > 0) return Math.round(n);
  }
  return null;
}

function extractAddress(listing: Record<string, unknown>): string {
  if (typeof listing.address === "string" && listing.address) return listing.address;
  if (typeof listing.fullAddress === "string" && listing.fullAddress) return listing.fullAddress;
  if (typeof listing.streetAddress === "string") {
    const city = typeof listing.city === "string" ? `, ${listing.city}` : "";
    const state = typeof listing.state === "string" ? `, ${listing.state}` : "";
    return `${listing.streetAddress}${city}${state}`;
  }
  return "Address unavailable";
}

function extractBroker(listing: Record<string, unknown>): string | null {
  if (typeof listing.brokerName === "string" && listing.brokerName) return listing.brokerName;
  if (typeof listing.agentName === "string" && listing.agentName) return listing.agentName;
  if (listing.broker && typeof listing.broker === "object") {
    const b = listing.broker as Record<string, unknown>;
    if (typeof b.name === "string" && b.name) return b.name;
  }
  return null;
}

function extractDaysOnMarket(listing: Record<string, unknown>): number | null {
  const candidates = [listing.daysOnMarket, listing.days_on_market, listing.daysListed];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : typeof c === "string" ? parseInt(c, 10) : NaN;
    if (!isNaN(n) && n >= 0) return n;
  }
  // Try to calculate from listingDate
  const dateStr = listing.listingDate ?? listing.listedDate ?? listing.createdDate;
  if (typeof dateStr === "string") {
    const listed = new Date(dateStr);
    if (!isNaN(listed.getTime())) {
      return Math.floor((Date.now() - listed.getTime()) / 86_400_000);
    }
  }
  return null;
}

function extractId(listing: Record<string, unknown>): string {
  return String(listing.id ?? listing.listingId ?? listing.propertyId ?? Math.random().toString(36).slice(2));
}

function extractPhoto(listing: Record<string, unknown>): string | null {
  if (typeof listing.photoUrl === "string" && listing.photoUrl) return listing.photoUrl;
  if (typeof listing.imageUrl === "string" && listing.imageUrl) return listing.imageUrl;
  if (typeof listing.thumbnailUrl === "string" && listing.thumbnailUrl) return listing.thumbnailUrl;
  if (Array.isArray(listing.photos) && listing.photos.length > 0) {
    const p = listing.photos[0];
    if (typeof p === "string") return p;
    if (p && typeof p === "object") {
      const po = p as Record<string, unknown>;
      return typeof po.url === "string" ? po.url : null;
    }
  }
  return null;
}

// Determine currency from listing/location
function extractCurrency(listing: Record<string, unknown>): string {
  if (typeof listing.currency === "string" && listing.currency) return listing.currency.toUpperCase();
  const addr = extractAddress(listing).toLowerCase();
  if (addr.includes("uk") || addr.includes("london") || addr.includes("england") || addr.includes("scotland")) return "GBP";
  return "USD";
}

async function fetchLoopNetListings(location: string, currency: string): Promise<Record<string, unknown>[]> {
  if (!RAPIDAPI_KEY) return [];

  const params = new URLSearchParams({
    location,
    property_type: "commercial",
    transaction_type: "sale",
    limit: "20",
  });

  const res = await fetch(`https://${RAPIDAPI_HOST}/properties/list?${params}`, {
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    console.error(`[loopnet-sync] API error ${res.status}: ${await res.text().catch(() => "")}`);
    return [];
  }

  const data = await res.json();
  // Handle various response shapes: { listings: [] } or { results: [] } or []
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (Array.isArray(data?.listings)) return data.listings as Record<string, unknown>[];
  if (Array.isArray(data?.results)) return data.results as Record<string, unknown>[];
  if (Array.isArray(data?.data)) return data.data as Record<string, unknown>[];
  return [];
}

// POST /api/scout/loopnet-sync
// Called internally by /api/scout/deals when cache is stale
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const location: string = body.location ?? "Florida";
    const currency: string = body.currency ?? "USD";

    const listings = await fetchLoopNetListings(location, currency);

    if (listings.length === 0) {
      return NextResponse.json({ synced: 0, message: "No listings returned from LoopNet" });
    }

    let synced = 0;
    for (const listing of listings) {
      const externalId = `loopnet-${extractId(listing)}`;
      const askingPrice = extractPrice(listing);
      const capRate = extractCapRate(listing);
      const sqft = extractSqft(listing);
      const broker = extractBroker(listing);
      const dom = extractDaysOnMarket(listing);
      const photo = extractPhoto(listing);
      const listingCurrency = extractCurrency(listing) || currency;

      // Build signal count
      let signalCount = 1; // base signal for being a LoopNet listing
      if (capRate) signalCount++;
      if (sqft) signalCount++;
      if (dom !== null && dom < 30) signalCount++; // fresh listing
      if (broker) signalCount++;
      signalCount = Math.min(5, signalCount);

      const sourceUrl = typeof listing.url === "string" ? listing.url :
        typeof listing.listingUrl === "string" ? listing.listingUrl : null;

      await prisma.scoutDeal.upsert({
        where: { externalId },
        create: {
          externalId,
          address: extractAddress(listing),
          assetType: mapAssetType(typeof listing.propertyType === "string" ? listing.propertyType : undefined),
          sqft,
          askingPrice,
          capRate,
          brokerName: broker,
          daysOnMarket: dom,
          sourceTag: "LoopNet",
          sourceUrl,
          satelliteImageUrl: photo,
          signalCount,
          currency: listingCurrency,
          status: "active",
        },
        update: {
          address: extractAddress(listing),
          assetType: mapAssetType(typeof listing.propertyType === "string" ? listing.propertyType : undefined),
          sqft,
          askingPrice,
          capRate,
          brokerName: broker,
          daysOnMarket: dom,
          sourceUrl,
          satelliteImageUrl: photo,
          signalCount,
          status: "active",
        },
      });
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (err) {
    console.error("[loopnet-sync] error:", err);
    return NextResponse.json({ synced: 0, error: String(err) }, { status: 200 }); // 200 so callers don't blow up
  }
}

// GET /api/scout/loopnet-sync?location=Florida&currency=USD
// Returns whether the cache is still fresh (no sync triggered)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location") ?? "Florida";
  const currency = searchParams.get("currency") ?? "USD";

  // Check if we have fresh LoopNet deals
  const mostRecent = await prisma.scoutDeal.findFirst({
    where: { sourceTag: "LoopNet", status: "active" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const isStale = !mostRecent || (Date.now() - mostRecent.updatedAt.getTime() > CACHE_TTL_MS);

  if (isStale) {
    // Trigger sync inline (non-blocking from the caller's perspective via POST)
    const listings = await fetchLoopNetListings(location, currency);
    let synced = 0;
    for (const listing of listings) {
      const externalId = `loopnet-${extractId(listing)}`;
      const askingPrice = extractPrice(listing);
      const capRate = extractCapRate(listing);
      const sqft = extractSqft(listing);
      const broker = extractBroker(listing);
      const dom = extractDaysOnMarket(listing);
      const photo = extractPhoto(listing);
      const listingCurrency = extractCurrency(listing) || currency;

      let signalCount = 1;
      if (capRate) signalCount++;
      if (sqft) signalCount++;
      if (dom !== null && dom < 30) signalCount++;
      if (broker) signalCount++;
      signalCount = Math.min(5, signalCount);

      const sourceUrl = typeof listing.url === "string" ? listing.url :
        typeof listing.listingUrl === "string" ? listing.listingUrl : null;

      await prisma.scoutDeal.upsert({
        where: { externalId },
        create: {
          externalId,
          address: extractAddress(listing),
          assetType: mapAssetType(typeof listing.propertyType === "string" ? listing.propertyType : undefined),
          sqft,
          askingPrice,
          capRate,
          brokerName: broker,
          daysOnMarket: dom,
          sourceTag: "LoopNet",
          sourceUrl,
          satelliteImageUrl: photo,
          signalCount,
          currency: listingCurrency,
          status: "active",
        },
        update: {
          address: extractAddress(listing),
          assetType: mapAssetType(typeof listing.propertyType === "string" ? listing.propertyType : undefined),
          sqft,
          askingPrice,
          capRate,
          brokerName: broker,
          daysOnMarket: dom,
          sourceUrl,
          satelliteImageUrl: photo,
          signalCount,
          status: "active",
        },
      });
      synced++;
    }
    return NextResponse.json({ synced, stale: true });
  }

  return NextResponse.json({ synced: 0, stale: false });
}
