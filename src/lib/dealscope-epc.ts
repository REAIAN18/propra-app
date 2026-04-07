/**
 * DealScope EPC (Energy Performance Certificate) Integration
 * Query UK non-domestic EPC register for building data, energy rating, floor area.
 *
 * Requires: EPC_API_KEY
 * Free API: epc.opendatacommunities.org/api/v1
 * Register at: epc.opendatacommunities.org
 */

const EPC_BASE = "https://epc.opendatacommunities.org/api/v1";

/**
 * EPC opendatacommunities.org uses HTTP Basic auth where the username is the
 * registered email and the password is the API key. We also accept a raw
 * `Bearer <key>` format for back-compat, and emit an Accept: application/json
 * header so we don't get CSV back.
 */
function buildEpcAuthHeaders(): Record<string, string> {
  const apiKey = process.env.EPC_API_KEY || "";
  const email = process.env.EPC_EMAIL || process.env.EPC_API_EMAIL || "";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (email && apiKey) {
    const token = Buffer.from(`${email}:${apiKey}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  } else if (apiKey) {
    // Fall back to basic auth with api key only (some registrations work this way)
    headers.Authorization = `Basic ${Buffer.from(`:${apiKey}`).toString("base64")}`;
  }
  return headers;
}

export interface EPCCertificate {
  address: string;
  postcode?: string;
  epcRating: string; // A-G
  floorAreaM2?: number;
  floorAreaSqft?: number;
  buildingType?: string;
  constructionAge?: string;
  mainHeating?: string;
  co2Emissions?: number;
  energyEfficiencyRating?: number;
  meesRisk?: boolean; // F or G rating
}

/**
 * Lookup EPCs by postcode
 */
export async function lookupEPCByPostcode(postcode: string): Promise<EPCCertificate[]> {
  const apiKey = process.env.EPC_API_KEY;
  if (!apiKey) {
    console.log("[dealscope-epc] EPC_API_KEY not set - returning empty results");
    return [];
  }

  try {
    const cleanPostcode = postcode.replace(/\s/g, "").toUpperCase();
    const res = await fetch(
      `${EPC_BASE}/non-domestic/search?postcode=${encodeURIComponent(cleanPostcode)}&size=100`,
      { headers: buildEpcAuthHeaders(), signal: AbortSignal.timeout(10_000) }
    );

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`[dealscope-epc] No EPCs found for postcode ${postcode}`);
        return [];
      }
      console.warn(`[dealscope-epc] Lookup failed: ${res.status}`);
      return [];
    }

    const data = await res.json() as Record<string, unknown>;
    const results = (data.rows || data.results || []) as Array<Record<string, unknown>>;

    return results.map((r: Record<string, unknown>) => ({
      address: (r.address || "") as string,
      postcode: r.postcode as string | undefined,
      epcRating: ((r["energy-rating"] || r.energyRating) || "unknown") as string,
      floorAreaM2: r["total-floor-area"] as number | undefined || (r.floorArea as number | undefined),
      floorAreaSqft: r["total-floor-area"] ? Math.round(((r["total-floor-area"] as number) || 0) * 10.764) : undefined,
      buildingType: (r["property-type"] || r.propertyType) as string | undefined,
      constructionAge: (r["construction-age-band"] || r.constructionAge) as string | undefined,
      mainHeating: (r["main-heating-fuel"] || r.mainHeating) as string | undefined,
      co2Emissions: r["co2-emissions-current"] as number | undefined || (r.co2Emissions as number | undefined),
      energyEfficiencyRating: (r["energy-efficiency-rating"] || r.energyEfficiencyRating) as number | undefined,
      meesRisk: ((r["energy-rating"] || r.energyRating || "") as string).toUpperCase() >= "F",
    }));
  } catch (error) {
    console.error(`[dealscope-epc] Error looking up postcode ${postcode}:`, error);
    return [];
  }
}

/**
 * Lookup EPC by full address
 */
export async function lookupEPCByAddress(address: string): Promise<EPCCertificate | null> {
  const apiKey = process.env.EPC_API_KEY;
  if (!apiKey) {
    console.log("[dealscope-epc] EPC_API_KEY not set");
    return null;
  }

  try {
    const res = await fetch(
      `${EPC_BASE}/non-domestic/search?address=${encodeURIComponent(address)}&size=10`,
      { headers: buildEpcAuthHeaders(), signal: AbortSignal.timeout(10_000) }
    );

    if (!res.ok) {
      console.warn(`[dealscope-epc] Address lookup failed: ${res.status}`);
      return null;
    }

    const data = await res.json() as Record<string, unknown>;
    const results = (data.rows || data.results || []) as Array<Record<string, unknown>>;

    if (!results.length) {
      console.log(`[dealscope-epc] No EPC found for "${address}"`);
      return null;
    }

    const r = results[0]; // Take the first (most recent) match
    return {
      address: (r.address || address) as string,
      postcode: r.postcode as string | undefined,
      epcRating: ((r["energy-rating"] || r.energyRating) || "unknown") as string,
      floorAreaM2: (r["total-floor-area"] as number | undefined) || (r.floorArea as number | undefined),
      floorAreaSqft: r["total-floor-area"] ? Math.round(((r["total-floor-area"] as number) || 0) * 10.764) : undefined,
      buildingType: (r["property-type"] || r.propertyType) as string | undefined,
      constructionAge: (r["construction-age-band"] || r.constructionAge) as string | undefined,
      mainHeating: (r["main-heating-fuel"] || r.mainHeating) as string | undefined,
      co2Emissions: (r["co2-emissions-current"] as number | undefined) || (r.co2Emissions as number | undefined),
      energyEfficiencyRating: (r["energy-efficiency-rating"] || r.energyEfficiencyRating) as number | undefined,
      meesRisk: ((r["energy-rating"] || r.energyRating || "") as string).toUpperCase() >= "F",
    };
  } catch (error) {
    console.error(`[dealscope-epc] Error looking up address "${address}":`, error);
    return null;
  }
}

/**
 * Score EPC data for risk factors
 */
export function scoreEPCRisk(epc: EPCCertificate): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 100;

  // MEES (Minimum Energy Efficiency Standard) risk
  const ratingNum = (epc.epcRating || "").charCodeAt(0);
  const fNum = "F".charCodeAt(0);

  if (ratingNum >= fNum) {
    signals.push(`MEES non-compliant (${epc.epcRating} rating)`);
    score -= 25; // Significant compliance risk
  } else if (ratingNum >= "D".charCodeAt(0)) {
    signals.push(`Poor energy rating (${epc.epcRating})`);
    score -= 10;
  }

  // Floor area info
  if (!epc.floorAreaM2) {
    signals.push("Floor area unknown");
  } else if (epc.floorAreaSqft && epc.floorAreaSqft > 100_000) {
    signals.push("Very large building (>100k sqft)");
  }

  // Building age
  if (epc.constructionAge && epc.constructionAge.toLowerCase().includes("pre-1919")) {
    signals.push("Pre-1919 building (may have heritage constraints)");
    score -= 5;
  }

  return { score: Math.max(0, score), signals };
}
