import { NextRequest, NextResponse } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────────

interface GeoResult {
  lat: number;
  lng: number;
  county: string;
  state: string;
  displayName: string;
}

interface FloodZoneResult {
  zone: string;
  description: string;
  isHighRisk: boolean;
  insuranceMessage: string;
}

interface PropertyRecord {
  assessedValue: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  useCode: string | null;
  folio: string | null;
}

export interface EnrichmentResult {
  address: string;
  geocode: GeoResult | null;
  floodZone: FloodZoneResult | null;
  property: PropertyRecord | null;
  narrative: string | null;
  errors: string[];
}

// ── Geocode via Nominatim (OpenStreetMap, free, no key) ────────────────────

async function geocode(address: string): Promise<GeoResult | null> {
  try {
    const q = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { "User-Agent": "arca-property-audit/1.0 (contact@arca.ai)" },
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    if (!data?.[0]) return null;
    const item = data[0];
    const addr = item.address ?? {};
    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      county: (addr.county ?? addr.city_district ?? "").replace(/\s*County$/i, ""),
      state: addr.state ?? "",
      displayName: item.display_name ?? address,
    };
  } catch {
    return null;
  }
}

// ── FEMA NFHL Flood Zone lookup ────────────────────────────────────────────

function floodZoneDescription(zone: string, subtype: string): string {
  if (zone === "AE" || zone === "AH" || zone === "AO" || zone === "A") {
    return "High flood risk — 100-year floodplain (Special Flood Hazard Area)";
  }
  if (zone?.startsWith("VE") || zone?.startsWith("V")) {
    return "Coastal high hazard — wave action zone";
  }
  if (zone === "X") {
    if (subtype?.includes("0.2")) return "Moderate flood risk — 500-year floodplain";
    return "Minimal flood hazard";
  }
  if (zone === "D") return "Undetermined flood risk";
  return zone ? `Flood zone ${zone}` : "Flood zone data unavailable";
}

function insuranceMessageForZone(zone: string): string {
  if (zone === "AE" || zone === "AH" || zone === "AO" || zone === "A" || zone?.startsWith("V")) {
    return "Flood Zone " + zone + " — mandatory flood insurance required. Arca can identify specialist carriers and flood-specific policy discounts.";
  }
  if (zone === "X") {
    return "Low-risk flood zone (X) — flood insurance is optional but may still be cost-effective. Arca can benchmark your current premium.";
  }
  return "Flood zone data retrieved — Arca can assess flood insurance requirements and identify savings.";
}

async function fetchFloodZone(lat: number, lng: number): Promise<FloodZoneResult | null> {
  try {
    const delta = 0.001;
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      layers: "all:28",
      sr: "4326",
      tolerance: "1",
      mapExtent: `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`,
      imageDisplay: "800,600,96",
      returnGeometry: "false",
      f: "json",
    });
    const url = `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/identify?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    const data = await res.json();

    const result = data?.results?.[0];
    const zone = (result?.attributes?.FLD_ZONE ?? "X") as string;
    const subtype = (result?.attributes?.ZONE_SUBTY ?? "") as string;
    const isHighRisk = zone !== "X" && zone !== "D" && !!zone;

    return {
      zone,
      description: floodZoneDescription(zone, subtype),
      isHighRisk,
      insuranceMessage: insuranceMessageForZone(zone),
    };
  } catch {
    return null;
  }
}

// ── Miami-Dade Property Appraiser (free public API) ────────────────────────

async function fetchMiamiDadeProperty(address: string): Promise<PropertyRecord | null> {
  try {
    const streetAddress = address.replace(/,.*$/, "").trim();
    const encoded = encodeURIComponent(streetAddress);
    const url = `https://www.miamidade.gov/Apps/PA/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetAddress&Address=${encoded}&ldPageNum=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "arca-property-audit/1.0" },
      signal: AbortSignal.timeout(7000),
    });
    const text = await res.text();

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }

    const infos =
      (data as Record<string, unknown> & { MinimumPropertyInfos?: { MinimumPropertyInfo?: unknown[] } })
        ?.MinimumPropertyInfos?.MinimumPropertyInfo;
    const prop = Array.isArray(infos) ? infos[0] as Record<string, string> : null;
    if (!prop) return null;

    return {
      assessedValue: prop.Assessment ? parseInt(prop.Assessment.replace(/[^0-9]/g, "")) : null,
      sqft: prop.BuildingSize ? parseInt(prop.BuildingSize.replace(/[^0-9]/g, "")) : null,
      yearBuilt: prop.YearBuilt ? parseInt(prop.YearBuilt) : null,
      useCode: prop.DORCode ?? prop.UseCode ?? null,
      folio: prop.Strap ?? prop.Folio ?? null,
    };
  } catch {
    return null;
  }
}

// ── Claude narrative (optional, only if ANTHROPIC_API_KEY set) ─────────────

async function generateNarrative(
  address: string,
  flood: FloodZoneResult | null,
  property: PropertyRecord | null
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const propertyDetails = property
    ? [
        property.assessedValue ? `assessed at $${property.assessedValue.toLocaleString()}` : null,
        property.sqft ? `${property.sqft.toLocaleString()} sq ft` : null,
        property.yearBuilt ? `built in ${property.yearBuilt}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const prompt = [
    `You are an expert commercial real estate advisor for Arca, a property platform that saves owners money on insurance, energy, and income.`,
    ``,
    `A property owner has entered this address: "${address}"`,
    flood ? `Flood zone: ${flood.zone} — ${flood.description}` : "",
    propertyDetails ? `Property data: ${propertyDetails}` : "",
    ``,
    `Write a SHORT (2–3 sentences, max 60 words) personalised insight for this specific property.`,
    `Mention the flood zone implications for insurance if relevant. Reference the year built or building size if it affects rebuild cost or insurance benchmarking.`,
    `Be specific, confident, and helpful. Do not use generic filler phrases. Do not mention "Arca" by name. End with one specific action the owner should take.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

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
    return data?.content?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// ── Detect if address looks like Miami-Dade ────────────────────────────────

function looksLikeMiamiDade(county: string, address: string): boolean {
  const upper = (county + " " + address).toUpperCase();
  return (
    county.toLowerCase().includes("miami") ||
    upper.includes("MIAMI") ||
    upper.includes("HIALEAH") ||
    upper.includes("CORAL GABLES") ||
    upper.includes("HOMESTEAD") ||
    upper.includes("DORAL") ||
    upper.includes("BRICKELL") ||
    upper.includes("KENDALL")
  );
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const address: string = (body.address ?? "").trim();

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  const errors: string[] = [];
  const result: EnrichmentResult = {
    address,
    geocode: null,
    floodZone: null,
    property: null,
    narrative: null,
    errors,
  };

  // Step 1: geocode
  const geo = await geocode(address);
  result.geocode = geo;
  if (!geo) {
    errors.push("Could not geocode address — check that the address is valid and in the US.");
    return NextResponse.json(result);
  }

  // Step 2: FEMA flood zone (works nationwide)
  const [flood] = await Promise.allSettled([fetchFloodZone(geo.lat, geo.lng)]);
  result.floodZone = flood.status === "fulfilled" ? flood.value : null;
  if (!result.floodZone) errors.push("FEMA flood data unavailable");

  // Step 3: FL county property appraiser (Miami-Dade only for now)
  const isFL = geo.state?.toLowerCase().includes("florida");
  const isMiamiDade = isFL && looksLikeMiamiDade(geo.county, address);
  if (isMiamiDade) {
    const prop = await fetchMiamiDadeProperty(address);
    result.property = prop;
    if (!prop) errors.push("Miami-Dade property records unavailable for this address");
  }

  // Step 4: Claude narrative (optional)
  result.narrative = await generateNarrative(address, result.floodZone, result.property);

  return NextResponse.json(result);
}
