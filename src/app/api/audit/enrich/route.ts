import { NextRequest, NextResponse } from "next/server";

export interface EnrichmentResult {
  address: string;
  lat: number | null;
  lng: number | null;
  floodZone: string | null;
  floodZoneDesc: string | null;
  floodRiskLevel: "low" | "moderate" | "high" | "unknown";
  assessedValue: number | null;
  yearBuilt: number | null;
  sqft: number | null;
  useCode: string | null;
  county: string | null;
  narrative: string | null;
  error?: string;
}

// Flood zone classifications
function classifyFloodZone(zone: string): { desc: string; level: "low" | "moderate" | "high" } {
  const z = zone.toUpperCase().trim();
  if (z.startsWith("A") || z.startsWith("V")) {
    // AE, AH, AO, AX, A, VE, V — special flood hazard areas
    if (z === "AX" || z === "X") return { desc: "Minimal flood risk (Zone X)", level: "low" };
    if (z.startsWith("V")) return { desc: "Coastal high hazard — mandatory flood insurance", level: "high" };
    return { desc: "Special flood hazard area — elevated premium likely", level: "high" };
  }
  if (z === "X" || z.startsWith("X")) return { desc: "Minimal flood risk (Zone X)", level: "low" };
  if (z === "B" || z === "C") return { desc: "Moderate flood risk", level: "moderate" };
  if (z === "D") return { desc: "Undetermined flood risk", level: "moderate" };
  return { desc: "Standard flood zone", level: "low" };
}

async function geocode(address: string): Promise<{ lat: number; lng: number; county: string | null } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Arca Property Platform (arca.ai)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    const { lat, lon, display_name } = data[0];
    // Extract county from display_name
    const countyMatch = display_name?.match(/([A-Za-z\s]+County)/i);
    const county = countyMatch ? countyMatch[1].trim() : null;
    return { lat: parseFloat(lat), lng: parseFloat(lon), county };
  } catch {
    return null;
  }
}

async function getFemaFloodZone(lat: number, lng: number): Promise<{ zone: string } | null> {
  try {
    // Build a small bounding box around the point
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
    // FEMA returns results array; look for FLD_ZONE attribute
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

async function getMiamiDadePropertyData(
  address: string
): Promise<{ assessedValue: number | null; yearBuilt: number | null; sqft: number | null; useCode: string | null } | null> {
  try {
    // Miami-Dade public property appraiser API
    // Strip unit/suite info; extract street number and name
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
    return {
      assessedValue: p.AssessedValue ? Number(p.AssessedValue) : null,
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
  floodZone: string | null,
  floodZoneDesc: string | null,
  assessedValue: number | null,
  yearBuilt: number | null
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const parts: string[] = [];
  if (floodZone) parts.push(`Flood zone: ${floodZone} — ${floodZoneDesc}`);
  if (assessedValue) parts.push(`Assessed value: $${assessedValue.toLocaleString()}`);
  if (yearBuilt) parts.push(`Year built: ${yearBuilt}`);
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

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || address.trim().length < 5) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const result: EnrichmentResult = {
    address,
    lat: null,
    lng: null,
    floodZone: null,
    floodZoneDesc: null,
    floodRiskLevel: "unknown",
    assessedValue: null,
    yearBuilt: null,
    sqft: null,
    useCode: null,
    county: null,
    narrative: null,
  };

  // Step 1: Geocode
  const geo = await geocode(address);
  if (!geo) {
    result.error = "Could not geocode address";
    return NextResponse.json(result);
  }
  result.lat = geo.lat;
  result.lng = geo.lng;
  result.county = geo.county;

  // Step 2: FEMA flood zone (parallel with property lookup)
  const [femaResult, propertyResult] = await Promise.allSettled([
    getFemaFloodZone(geo.lat, geo.lng),
    getMiamiDadePropertyData(address),
  ]);

  if (femaResult.status === "fulfilled" && femaResult.value) {
    const { zone } = femaResult.value;
    const { desc, level } = classifyFloodZone(zone);
    result.floodZone = zone;
    result.floodZoneDesc = desc;
    result.floodRiskLevel = level;
  }

  if (propertyResult.status === "fulfilled" && propertyResult.value) {
    const p = propertyResult.value;
    result.assessedValue = p.assessedValue;
    result.yearBuilt = p.yearBuilt;
    result.sqft = p.sqft;
    result.useCode = p.useCode;
  }

  // Step 3: Claude narrative (optional)
  result.narrative = await generateNarrative(
    address,
    result.floodZone,
    result.floodZoneDesc,
    result.assessedValue,
    result.yearBuilt
  );

  return NextResponse.json(result);
}
