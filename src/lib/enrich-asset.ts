import { prisma } from "@/lib/prisma";
import { fetchAttomComparables } from "@/lib/attom";

const UK_RE = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}|\bUK\b|\bUnited Kingdom\b|\bEngland\b|\bScotland\b|\bWales\b/i;
const UK_POSTCODE_RE = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i;

interface GeoResult {
  lat: number;
  lng: number;
  postcode?: string;
  formattedAddress?: string;
}

async function geocode(address: string): Promise<GeoResult | null> {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

  if (mapsKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        const result = data?.results?.[0];
        if (result) {
          const pcComp = result.address_components?.find((c: { types: string[] }) =>
            c.types.includes("postal_code")
          );
          return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            postcode: pcComp?.long_name,
            formattedAddress: result.formatted_address ?? undefined,
          };
        }
      }
    } catch {
      console.error("[enrichAsset] Google Maps geocoding failed");
    }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`,
      {
        headers: { "User-Agent": "RealHQ/1.0 (realhq.ai)" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          postcode: data[0].address?.postcode,
          formattedAddress: data[0].display_name ?? undefined,
        };
      }
    }
  } catch {
    console.error("[enrichAsset] Nominatim geocoding failed");
  }

  return null;
}

function buildSatelliteUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=400x250&maptype=satellite&key=${key}`;
}

async function fetchEpc(
  postcode: string | null,
  address: string
): Promise<{ epcRating?: string; epcExpiry?: Date; epcFetched: true }> {
  const epcKey = process.env.EPC_API_KEY;
  if (!epcKey) return { epcFetched: true };

  const epcQuery = postcode
    ? `postcode=${encodeURIComponent(postcode)}&size=5`
    : `address=${encodeURIComponent(address)}&size=1`;
  const authHeader = `Basic ${Buffer.from(`${epcKey}:`).toString("base64")}`;

  let epcRating: string | undefined;
  let epcExpiry: Date | undefined;

  for (const segment of ["non-domestic", "domestic"] as const) {
    try {
      const res = await fetch(
        `https://epc.opendatacommunities.org/api/v1/${segment}/search?${epcQuery}`,
        {
          headers: { Accept: "application/json", Authorization: authHeader },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const row = data?.rows?.[0];
      if (!row) continue;

      if (segment === "non-domestic") {
        if (row["asset-rating-band"]) {
          epcRating = (row["asset-rating-band"] as string).toUpperCase();
        }
        if (row["or-assessment-end-date"]) {
          const d = new Date(row["or-assessment-end-date"] as string);
          if (!isNaN(d.getTime())) epcExpiry = d;
        }
      } else {
        if (row["current-energy-rating"]) {
          epcRating = row["current-energy-rating"] as string;
        }
        if (row["lodgement-datetime"]) {
          const d = new Date(row["lodgement-datetime"] as string);
          if (!isNaN(d.getTime())) {
            d.setFullYear(d.getFullYear() + 10);
            epcExpiry = d;
          }
        }
      }
      if (epcRating) break;
    } catch {
      console.error(`[enrichAsset] EPC ${segment} fetch failed`);
    }
  }

  return { epcRating, epcExpiry, epcFetched: true };
}

async function fetchPlanning(
  postcode: string | null,
  address: string
): Promise<{ planningHistory: unknown } | null> {
  const query = postcode ?? address;
  try {
    const res = await fetch(
      `https://www.planning.data.gov.uk/entity.json?q=${encodeURIComponent(query)}&limit=10`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entities: Record<string, unknown>[] = data?.entities ?? [];
    return {
      planningHistory: {
        fetchedAt: new Date().toISOString(),
        applications: entities.map((e) => ({
          reference: e["reference"] ?? null,
          address: e["name"] ?? null,
          status: e["planning-application-status"] ?? e["status"] ?? null,
          description: e["notes"] ?? e["description"] ?? null,
          receivedDate: e["start-date"] ?? e["entry-date"] ?? null,
        })),
      },
    };
  } catch {
    console.error("[enrichAsset] Planning Portal fetch failed");
  }
  return null;
}

async function fetchFloodZone(
  lat: number,
  lng: number
): Promise<{ floodZone: string; femaZoneRaw: unknown } | null> {
  try {
    const url =
      `https://msc.fema.gov/arcgis/rest/services/NSS/NFHL/MapServer/28/query` +
      `?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326` +
      `&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTYP&returnGeometry=false&f=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature?.attributes) return null;
    const zone = (feature.attributes.FLD_ZONE as string | undefined) ?? null;
    if (!zone) return null;
    return { floodZone: zone, femaZoneRaw: feature.attributes };
  } catch {
    console.error("[enrichAsset] FEMA flood zone lookup failed");
  }
  return null;
}

/**
 * Fire-and-forget background enrichment after asset creation.
 *
 * Step 1 (sequential): Geocode via Google Maps (primary) or Nominatim (fallback).
 * Step 2 (parallel):   Satellite image, EPC, planning history, FEMA flood zone.
 * Step 3 (sequential): ATTOM comparables for US properties.
 *
 * Never throws — logs errors to console only.
 */
export async function enrichAsset(
  assetId: string,
  address: string,
  country?: string | null
): Promise<void> {
  try {
    const existing = await prisma.userAsset.findUnique({
      where: { id: assetId },
      select: {
        latitude: true,
        longitude: true,
        epcRating: true,
        epcFetched: true,
        country: true,
        postcode: true,
        floodZone: true,
        planningHistory: true,
        satelliteUrl: true,
      },
    });
    if (!existing) return;

    const isUK = (existing.country ?? country) === "UK" || UK_RE.test(address);
    const isUS = (existing.country ?? country) === "US";
    const updates: Record<string, unknown> = {};

    // Step 1: Geocode if lat/lng missing (sequential — satellite + FEMA depend on results)
    let lat = existing.latitude;
    let lng = existing.longitude;
    let postcode = existing.postcode;

    if (!lat || !lng) {
      const geo = await geocode(address);
      if (geo) {
        updates.latitude = lat = geo.lat;
        updates.longitude = lng = geo.lng;
        if (geo.formattedAddress) updates.formattedAddress = geo.formattedAddress;
        if (geo.postcode && !existing.postcode) {
          updates.postcode = postcode = geo.postcode;
        }
      }
    }

    const postcodeForQuery = postcode ?? UK_POSTCODE_RE.exec(address)?.[1] ?? null;

    // Step 2: Parallel enrichment — satellite, EPC, planning, flood zone
    const [satUrl, epcResult, planningResult, floodResult] = await Promise.all([
      lat && lng && !existing.satelliteUrl
        ? Promise.resolve(buildSatelliteUrl(lat, lng))
        : Promise.resolve(null),
      isUK && !existing.epcFetched
        ? fetchEpc(postcodeForQuery, address)
        : Promise.resolve(null),
      isUK && !existing.planningHistory
        ? fetchPlanning(postcodeForQuery, address)
        : Promise.resolve(null),
      isUS && lat && lng && !existing.floodZone
        ? fetchFloodZone(lat, lng)
        : Promise.resolve(null),
    ]);

    if (satUrl) updates.satelliteUrl = satUrl;
    if (epcResult) {
      if (epcResult.epcRating) updates.epcRating = epcResult.epcRating;
      if (epcResult.epcExpiry) updates.epcExpiry = epcResult.epcExpiry;
      updates.epcFetched = true;
    } else if (isUK && !existing.epcFetched) {
      // Mark attempted even when skipped — prevents re-hammering the API
      updates.epcFetched = true;
    }
    if (planningResult) updates.planningHistory = planningResult.planningHistory;
    if (floodResult) {
      updates.floodZone = floodResult.floodZone;
      updates.femaZoneRaw = floodResult.femaZoneRaw;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.userAsset.update({ where: { id: assetId }, data: updates });
    }

    // Step 3: ATTOM comparable sales (US only)
    if (isUS) {
      await fetchAttomComparables(assetId, address);
    }
  } catch {
    console.error("[enrichAsset] unexpected error for", assetId);
  }
}
