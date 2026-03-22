import { NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.X_RapidAPI_Key ?? "";
const RAPIDAPI_HOST = "loopnet-api.p.rapidapi.com";

// Simple in-memory cache: address → { result, fetchedAt }
const cache = new Map<string, { result: ListingResult | null; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface ListingResult {
  listingType: "for_sale" | "for_lease" | "recently_sold";
  askingPrice: number | null;
  pricePerSqft: number | null;
  sqft: number | null;
  leaseRatePerSqftYear: number | null;
  currency: string;
  brokerName: string | null;
  brokerFirm: string | null;
  listingUrl: string | null;
  sourceLabel: string; // human-readable label e.g. "Currently listed at $2.4M"
}

function extractNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v.replace(/[^0-9.]/g, "")) : NaN;
  return !isNaN(n) && n > 0 ? n : null;
}

function extractBroker(l: Record<string, unknown>): { name: string | null; firm: string | null } {
  let name: string | null = null;
  let firm: string | null = null;
  if (typeof l.brokerName === "string" && l.brokerName) name = l.brokerName;
  else if (typeof l.agentName === "string" && l.agentName) name = l.agentName;
  else if (l.broker && typeof l.broker === "object") {
    const b = l.broker as Record<string, unknown>;
    if (typeof b.name === "string") name = b.name;
    if (typeof b.company === "string") firm = b.company;
    else if (typeof b.firm === "string") firm = b.firm;
  }
  if (!firm && typeof l.brokerFirm === "string") firm = l.brokerFirm;
  return { name, firm };
}

function buildSourceLabel(result: Omit<ListingResult, "sourceLabel">, currency: string): string {
  const sym = currency === "GBP" ? "£" : "$";
  const fmt = (n: number) => n >= 1_000_000 ? `${sym}${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${sym}${(n / 1_000).toFixed(0)}k` : `${sym}${n.toLocaleString()}`;

  if (result.listingType === "for_sale" && result.askingPrice) {
    return `Currently listed at ${fmt(result.askingPrice)} asking`;
  }
  if (result.listingType === "for_lease" && result.leaseRatePerSqftYear) {
    return `Marketed at ${sym}${result.leaseRatePerSqftYear.toFixed(2)}/sqft/yr`;
  }
  if (result.listingType === "recently_sold" && result.askingPrice) {
    return `Last listed at ${fmt(result.askingPrice)}`;
  }
  return "Active listing found on LoopNet";
}

async function lookupByAddress(address: string, lat?: number, lng?: number): Promise<ListingResult | null> {
  if (!RAPIDAPI_KEY) return null;

  // Try by coordinates first if available, then by address
  const params = new URLSearchParams({ limit: "1" });
  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  } else {
    params.set("address", address);
  }

  const endpoints = [
    `/properties/search?${params}`,
    `/properties/list?location=${encodeURIComponent(address)}&limit=5`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`https://${RAPIDAPI_HOST}${endpoint}`, {
        headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const listings: Record<string, unknown>[] = Array.isArray(data) ? data
        : Array.isArray(data?.listings) ? data.listings
        : Array.isArray(data?.results) ? data.results
        : Array.isArray(data?.data) ? data.data
        : [];

      if (listings.length === 0) continue;

      // Pick the first listing that looks like a match
      const l = listings[0];

      const currency = typeof l.currency === "string" ? l.currency.toUpperCase() : "USD";
      const askingPrice = extractNum(l.price ?? l.askingPrice ?? l.salePrice ?? l.listingPrice);
      const sqft = extractNum(l.sqft ?? l.squareFeet ?? l.buildingSize);
      const pricePerSqft = askingPrice && sqft ? Math.round(askingPrice / sqft) : null;
      const leaseRatePerSqftYear = extractNum(l.leaseRate ?? l.leaseRatePerSqft ?? l.annualRent);
      const { name: brokerName, firm: brokerFirm } = extractBroker(l);

      const txType = String(l.transactionType ?? l.listingType ?? "").toLowerCase();
      const listingType: ListingResult["listingType"] = txType.includes("lease") || txType.includes("rent") ? "for_lease"
        : txType.includes("sold") ? "recently_sold"
        : "for_sale";

      const listingUrl = typeof l.url === "string" ? l.url : typeof l.listingUrl === "string" ? l.listingUrl : null;

      const partial: Omit<ListingResult, "sourceLabel"> = {
        listingType, askingPrice, pricePerSqft, sqft, leaseRatePerSqftYear, currency, brokerName, brokerFirm, listingUrl,
      };
      return { ...partial, sourceLabel: buildSourceLabel(partial, currency) };
    } catch {
      continue;
    }
  }

  return null;
}

// GET /api/property/loopnet-listing?address=...&lat=...&lng=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") ?? "";
  const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
  const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;

  if (!address && lat === undefined) {
    return NextResponse.json({ listing: null });
  }

  const cacheKey = `${address}|${lat}|${lng}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ listing: cached.result });
  }

  const result = await lookupByAddress(address, lat, lng);
  cache.set(cacheKey, { result, fetchedAt: Date.now() });

  return NextResponse.json({ listing: result });
}
