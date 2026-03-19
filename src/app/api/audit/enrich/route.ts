import { NextRequest, NextResponse } from "next/server";

// ── Types (shape must match what /audit/page.tsx renders) ─────────────────

export interface FloodZoneInfo {
  zone: string;
  description: string;
  isHighRisk: boolean;
  level: "low" | "moderate" | "high";
}

export interface PropertyInfo {
  assessedValue: number;
  yearBuilt: number | null;
  sqft: number | null;
  useCode: string | null;
}

export interface EnrichmentResult {
  address: string;
  lat: number | null;
  lng: number | null;
  county: string | null;
  floodZone: FloodZoneInfo | null;
  property: PropertyInfo | null;
  narrative: string | null;
  error?: string;
}

// ── Flood zone classification ─────────────────────────────────────────────

function classifyFloodZone(zone: string): FloodZoneInfo {
  const z = zone.toUpperCase().trim();
  if (z.startsWith("V")) {
    return { zone, description: "Coastal high hazard — mandatory flood insurance (wave action zone)", isHighRisk: true, level: "high" };
  }
  if (z === "AE" || z === "AH" || z === "AO" || z === "A" || z === "A99") {
    return { zone, description: "Special flood hazard area — 100-year floodplain, elevated premium likely", isHighRisk: true, level: "high" };
  }
  if (z.startsWith("A")) {
    return { zone, description: "Special flood hazard area — elevated risk", isHighRisk: true, level: "high" };
  }
  if (z === "B" || z === "C") {
    return { zone, description: "Moderate flood risk", isHighRisk: false, level: "moderate" };
  }
  if (z === "D") {
    return { zone, description: "Undetermined flood risk", isHighRisk: false, level: "moderate" };
  }
  // Zone X (most common minimal-risk zone)
  return { zone, description: "Minimal flood hazard (Zone X)", isHighRisk: false, level: "low" };
}

// ── Geocode via Nominatim (OpenStreetMap, free, no key) ───────────────────

async function geocode(address: string): Promise<{ lat: number; lng: number; county: string | null } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Arca Property Platform (arca.ai)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    const item = data[0];
    const addr = item.address ?? {};
    const county = (addr.county ?? addr.city_district ?? "").replace(/\s*County$/i, "") || null;
    return { lat: parseFloat(item.lat), lng: parseFloat(item.lon), county };
  } catch {
    return null;
  }
}

// ── FEMA NFHL flood zone (free, no key) ───────────────────────────────────

async function getFemaFloodZone(lat: number, lng: number): Promise<{ zone: string } | null> {
  try {
    const delta = 0.01;
    const mapExtent = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const geometry = encodeURIComponent(JSON.stringify({ x: lng, y: lat }));
    const url =
      `https://msc.fema.gov/arcgis/rest/services/Map_Service_v2/MapServer/identify` +
      `?geometry=${geometry}` +
      `&geometryType=esriGeometryPoint` +
      `&layers=all` +
      `&tolerance=0` +
      `&mapExtent=${encodeURIComponent(mapExtent)}` +
      `&imageDisplay=400,400,96` +
      `&returnGeometry=false` +
      `&f=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const results: { attributes?: Record<string, string> }[] = data?.results ?? [];
    for (const r of results) {
      const zone = r.attributes?.FLD_ZONE ?? r.attributes?.DFIRM_ID;
      if (zone && zone !== "OPEN WATER") return { zone };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Miami-Dade Property Appraiser (free public data) ──────────────────────

async function getMiamiDadePropertyData(
  address: string
): Promise<PropertyInfo | null> {
  try {
    const streetMatch = address.match(/^(\d+)\s+(.+?)(?:,|\s+Miami|\s+FL|\s+Coral|\s+Hialeah)/i);
    if (!streetMatch) return null;
    const streetNum = streetMatch[1];
    const streetName = streetMatch[2].replace(/\s+/g, "+");
    const url =
      `https://www.miamidade.gov/Apps/PA/PApublicServiceProxy/PaServicesProxy.ashx` +
      `?Operation=GetPropertySearchByAddress` +
      `&Address=${streetNum}+${streetName}` +
      `&ZipCode=` +
      `&HideResult=0` +
      `&OutputType=JSON`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const props: Record<string, unknown>[] = data?.MinimumPropertyInfos?.MinimumPropertyInfo ?? [];
    if (!props.length) return null;
    const p = props[0] as Record<string, string | number>;
    const assessedValue = p.AssessedValue ? Number(p.AssessedValue) : null;
    if (!assessedValue) return null;
    return {
      assessedValue,
      yearBuilt: p.YearBuilt ? Number(p.YearBuilt) : null,
      sqft: p.BuildingSize ? Number(p.BuildingSize) : null,
      useCode: (p.DORDescription as string) ?? null,
    };
  } catch {
    return null;
  }
}

// ── Claude narrative (optional — only if ANTHROPIC_API_KEY is set) ────────

async function generateNarrative(
  address: string,
  flood: FloodZoneInfo | null,
  property: PropertyInfo | null
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const parts: string[] = [];
  if (flood) parts.push(`Flood zone: ${flood.zone} — ${flood.description}`);
  if (property?.assessedValue) parts.push(`Assessed value: $${property.assessedValue.toLocaleString()}`);
  if (property?.yearBuilt) parts.push(`Year built: ${property.yearBuilt}`);
  if (parts.length === 0) return null;

  const prompt = [
    `You are an expert commercial real estate advisor.`,
    `Property: "${address}"`,
    ...parts,
    ``,
    `Write 2–3 sentences (max 55 words) of personalised property insight.`,
    `If in a high-risk flood zone, mention mandatory flood insurance and the opportunity to find specialist carriers.`,
    `If the building is old (pre-2000), note that older builds carry higher insurance premiums.`,
    `Reference assessed value for rebuild cost benchmarking if available.`,
    `Be specific and confident. End with one concrete action the owner should take.`,
  ].join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return (data?.content?.[0]?.text ?? "").trim() || null;
  } catch {
    return null;
  }
}

// ── Shared enrich logic ───────────────────────────────────────────────────

async function enrich(address: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    address,
    lat: null,
    lng: null,
    county: null,
    floodZone: null,
    property: null,
    narrative: null,
  };

  const geo = await geocode(address);
  if (!geo) {
    result.error = "Could not geocode address";
    return result;
  }
  result.lat = geo.lat;
  result.lng = geo.lng;
  result.county = geo.county;

  const [femaResult, propertyResult] = await Promise.allSettled([
    getFemaFloodZone(geo.lat, geo.lng),
    getMiamiDadePropertyData(address),
  ]);

  if (femaResult.status === "fulfilled" && femaResult.value) {
    result.floodZone = classifyFloodZone(femaResult.value.zone);
  }
  if (propertyResult.status === "fulfilled" && propertyResult.value) {
    result.property = propertyResult.value;
  }

  result.narrative = await generateNarrative(address, result.floodZone, result.property);
  return result;
}

// ── GET handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || address.trim().length < 5) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  return NextResponse.json(await enrich(address.trim()));
}

// ── POST handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { address?: string };
  const address = (body.address ?? "").trim();
  if (address.length < 5) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  return NextResponse.json(await enrich(address));
}
