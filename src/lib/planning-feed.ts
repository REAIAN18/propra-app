/**
 * src/lib/planning-feed.ts
 * UK planning application data from planning.data.gov.uk + postcodes.io geocoding.
 *
 * Free government APIs — no API keys required.
 * Geocoding: https://api.postcodes.io/postcodes/:postcode
 * Planning data: https://www.planning.data.gov.uk/api/search/
 *
 * Coverage: ~60% of UK Local Planning Authorities (growing).
 * Unmatched LPAs fall back to manual admin entry.
 *
 * US Florida: Miami-Dade Open Data Portal (no key required, 1000 req/day limit).
 * Broward County: no public API — manual admin entry for Wave 2.
 */

import { classifyApplicationType, normaliseStatus } from "@/lib/planning-classifier";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface AssetCoords {
  lat: number;
  lon: number;
}

/** Raw entity from planning.data.gov.uk API response */
export interface GovUKPlanningEntity {
  entity?: string | number;
  reference?: string;
  description?: string;
  status?: string;
  "start-date"?: string;
  "end-date"?: string;
  geometry?: string;   // WKT POINT or GeoJSON string
  "site-address"?: string;
  "applicant-name"?: string;
  organisation?: string;
  "entry-date"?: string;
  dataset?: string;
}

/** Raw record from Miami-Dade Open Data (building permits as planning proxy) */
export interface MiamiDadePermitRecord {
  permit_no?: string;
  description?: string;
  status_current?: string;
  issue_date?: string;
  expiration_date?: string;
  address?: string;
  the_geom?: { coordinates?: [number, number] };
}

/** Normalised planning application ready for Prisma upsert */
export interface MappedPlanningApplication {
  assetId: string;
  userId: string;
  refNumber: string;
  description: string;
  applicant: string | null;
  applicantAgent: string | null;
  applicationType: string;
  status: string;
  submittedDate: Date | null;
  decisionDate: Date | null;
  siteAddress: string | null;
  postcode: string | null;
  distanceMetres: number | null;
  latitude: number | null;
  longitude: number | null;
  lpaCode: string | null;
  lpaName: string | null;
  country: string;
  dataSource: string;
  sourceRef: string;
  sourceUrl: string | null;
  impact: null;
  impactScore: null;
  impactRationale: null;
  holdSellLink: null;
  classifiedAt: null;
  lastStatusSeen: null;
  alertSentAt: null;
  alertAcked: boolean;
}

// ---------------------------------------------------------------------------
// GEOCODING — postcodes.io
// ---------------------------------------------------------------------------

/**
 * Converts a UK postcode to lat/lon using postcodes.io (free, no key).
 * Returns null if the postcode is not found or the request fails.
 */
export async function geocodePostcode(postcode: string): Promise<AssetCoords | null> {
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s+/g, ""))}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.result;
    if (!result?.latitude || !result?.longitude) return null;

    return { lat: result.latitude, lon: result.longitude };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// UK PLANNING DATA — planning.data.gov.uk
// ---------------------------------------------------------------------------

/**
 * Fetches planning applications within radiusMetres of a UK postcode.
 * Uses postcodes.io to geocode the postcode, then queries planning.data.gov.uk.
 *
 * Returns an empty array (not an error) if the LPA is not covered or the API fails.
 */
export async function fetchUKPlanningApplications(
  postcode: string,
  radiusMetres = 800
): Promise<GovUKPlanningEntity[]> {
  const coords = await geocodePostcode(postcode);
  if (!coords) {
    console.warn(`[planning-feed] Could not geocode postcode "${postcode}"`);
    return [];
  }

  const url = new URL("https://www.planning.data.gov.uk/api/search/");
  url.searchParams.set("dataset", "planning-application");
  // WKT POINT format: POINT(longitude latitude) — note the order
  url.searchParams.set("geometry", `POINT(${coords.lon} ${coords.lat})`);
  url.searchParams.set("geometry_relation", "intersects");
  url.searchParams.set("entries", "current");
  url.searchParams.set("limit", "50");
  url.searchParams.set(
    "field",
    "entity,reference,description,status,start-date,end-date,geometry,site-address,applicant-name,organisation,entry-date"
  );

  // Note: planning.data.gov.uk uses a radius geometry query. As of Wave 2, the
  // API supports POINT + a buffer query via the geometry endpoint. If this endpoint
  // changes, fall back to: ?postcode={postcode}&limit=50
  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn(`[planning-feed] planning.data.gov.uk returned ${res.status} for postcode ${postcode}`);
      return [];
    }

    const data = await res.json();
    return (data?.entities ?? []) as GovUKPlanningEntity[];
  } catch (err) {
    console.error("[planning-feed] UK fetch error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// US PLANNING DATA — Miami-Dade Open Data
// ---------------------------------------------------------------------------

/**
 * Fetches building permits from Miami-Dade Open Data as a planning proxy.
 * Falls back to empty array for Broward (no public API in Wave 2).
 *
 * @param postcode  US ZIP code (used for display only — query uses lat/lon)
 * @param lat       Asset latitude (from UserAsset.latitude)
 * @param lon       Asset longitude (from UserAsset.longitude)
 */
export async function fetchUSPlanningApplications(
  postcode: string,
  lat: number | null,
  lon: number | null
): Promise<MiamiDadePermitRecord[]> {
  if (!lat || !lon) return [];

  // Miami-Dade Open Data — within_circle(geometry, lat, lon, radiusMetres)
  const radiusMetres = 800;
  const soql = `$where=within_circle(the_geom,${lat},${lon},${radiusMetres})&$limit=25&$order=issue_date DESC`;
  const url = `https://opendata.miamidade.gov/resource/fmte-mxk9.json?${soql}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];
    return (await res.json()) as MiamiDadePermitRecord[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// MAPPING — raw entities → MappedPlanningApplication
// ---------------------------------------------------------------------------

/**
 * Maps a planning.data.gov.uk entity to a `MappedPlanningApplication` ready for Prisma upsert.
 *
 * Impact fields are left null — they are populated by `classifyPlanningImpact()` after creation.
 */
export function mapGovUKEntityToApp(
  entity: GovUKPlanningEntity,
  assetId: string,
  userId: string,
  assetCoords: AssetCoords
): MappedPlanningApplication | null {
  const sourceRef = String(entity.entity ?? entity.reference ?? "");
  if (!sourceRef) return null;

  const appCoords = parseGeometryPoint(entity.geometry ?? null);
  const distanceMetres = appCoords
    ? haversineDistanceMetres(assetCoords, appCoords)
    : null;

  return {
    assetId,
    userId,
    refNumber: entity.reference ?? sourceRef,
    description: entity.description ?? "",
    applicant: entity["applicant-name"] ?? null,
    applicantAgent: null,
    applicationType: classifyApplicationType(entity.description),
    status: normaliseStatus(entity.status),
    submittedDate: parseISODate(entity["start-date"]),
    decisionDate: parseISODate(entity["end-date"]),
    siteAddress: entity["site-address"] ?? null,
    postcode: null,  // not reliably available from gov.uk
    distanceMetres,
    latitude: appCoords?.lat ?? null,
    longitude: appCoords?.lon ?? null,
    lpaCode: entity.organisation ?? null,
    lpaName: null,  // requires separate LPA lookup — omit for Wave 2
    country: "UK",
    dataSource: "planning_data_gov_uk",
    sourceRef,
    sourceUrl: entity.entity
      ? `https://www.planning.data.gov.uk/entity/${entity.entity}`
      : null,
    impact: null,
    impactScore: null,
    impactRationale: null,
    holdSellLink: null,
    classifiedAt: null,
    lastStatusSeen: null,
    alertSentAt: null,
    alertAcked: false,
  };
}

/**
 * Maps a Miami-Dade permit record to a MappedPlanningApplication.
 */
export function mapMiamiDadePermitToApp(
  permit: MiamiDadePermitRecord,
  assetId: string,
  userId: string,
  assetCoords: AssetCoords
): MappedPlanningApplication | null {
  const sourceRef = permit.permit_no ?? "";
  if (!sourceRef) return null;

  const permitCoords = permit.the_geom?.coordinates
    ? { lat: permit.the_geom.coordinates[1], lon: permit.the_geom.coordinates[0] }
    : null;

  const distanceMetres = permitCoords
    ? haversineDistanceMetres(assetCoords, permitCoords)
    : null;

  return {
    assetId,
    userId,
    refNumber: sourceRef,
    description: permit.description ?? "",
    applicant: null,
    applicantAgent: null,
    applicationType: classifyApplicationType(permit.description),
    status: normaliseStatus(permit.status_current),
    submittedDate: parseISODate(permit.issue_date),
    decisionDate: parseISODate(permit.expiration_date),
    siteAddress: permit.address ?? null,
    postcode: null,
    distanceMetres,
    latitude: permitCoords?.lat ?? null,
    longitude: permitCoords?.lon ?? null,
    lpaCode: "miami-dade",
    lpaName: "Miami-Dade County",
    country: "US",
    dataSource: "miami_dade",
    sourceRef,
    sourceUrl: null,
    impact: null,
    impactScore: null,
    impactRationale: null,
    holdSellLink: null,
    classifiedAt: null,
    lastStatusSeen: null,
    alertSentAt: null,
    alertAcked: false,
  };
}

// ---------------------------------------------------------------------------
// GEOMETRY UTILITIES
// ---------------------------------------------------------------------------

/**
 * Parses a WKT POINT string or GeoJSON point geometry into lat/lon.
 *
 * Handles:
 *   WKT:    "POINT(0.12345 51.23456)"  → { lat: 51.23456, lon: 0.12345 }
 *   GeoJSON: '{"type":"Point","coordinates":[0.12345,51.23456]}' → same
 */
export function parseGeometryPoint(geometry: string | null): AssetCoords | null {
  if (!geometry) return null;

  // WKT: POINT(lon lat)
  const wktMatch = geometry.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (wktMatch) {
    return { lat: parseFloat(wktMatch[2]), lon: parseFloat(wktMatch[1]) };
  }

  // GeoJSON
  try {
    const geoJson = JSON.parse(geometry);
    const coords = geoJson?.coordinates ?? geoJson?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lat: coords[1], lon: coords[0] };
    }
  } catch {
    // not JSON
  }

  return null;
}

/**
 * Haversine distance between two lat/lon points in metres.
 */
export function haversineDistanceMetres(a: AssetCoords, b: AssetCoords): number {
  const R = 6_371_000; // Earth radius in metres
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
