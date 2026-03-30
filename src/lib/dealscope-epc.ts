/**
 * DealScope EPC (Energy Performance Certificate) Integration
 * Query UK non-domestic EPC register for building data, energy rating, floor area.
 *
 * Requires: EPC_API_KEY
 * Free API: epc.opendatacommunities.org/api/v1
 * Register at: epc.opendatacommunities.org
 */

const EPC_BASE = "https://epc.opendatacommunities.org/api/v1";

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
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`[dealscope-epc] No EPCs found for postcode ${postcode}`);
        return [];
      }
      console.warn(`[dealscope-epc] Lookup failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const results = data.rows || data.results || [];

    return results.map((r: any) => ({
      address: r.address || "",
      postcode: r.postcode,
      epcRating: r["energy-rating"] || r.energyRating || "unknown",
      floorAreaM2: r["total-floor-area"] || r.floorArea,
      floorAreaSqft: r["total-floor-area"] ? Math.round((r["total-floor-area"] || 0) * 10.764) : undefined,
      buildingType: r["property-type"] || r.propertyType,
      constructionAge: r["construction-age-band"] || r.constructionAge,
      mainHeating: r["main-heating-fuel"] || r.mainHeating,
      co2Emissions: r["co2-emissions-current"] || r.co2Emissions,
      energyEfficiencyRating: r["energy-efficiency-rating"] || r.energyEfficiencyRating,
      meesRisk: (r["energy-rating"] || r.energyRating || "").toUpperCase() >= "F", // F or G = non-compliant
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
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      console.warn(`[dealscope-epc] Address lookup failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const results = data.rows || data.results || [];

    if (!results.length) {
      console.log(`[dealscope-epc] No EPC found for "${address}"`);
      return null;
    }

    const r = results[0]; // Take the first (most recent) match
    return {
      address: r.address || address,
      postcode: r.postcode,
      epcRating: r["energy-rating"] || r.energyRating || "unknown",
      floorAreaM2: r["total-floor-area"] || r.floorArea,
      floorAreaSqft: r["total-floor-area"] ? Math.round((r["total-floor-area"] || 0) * 10.764) : undefined,
      buildingType: r["property-type"] || r.propertyType,
      constructionAge: r["construction-age-band"] || r.constructionAge,
      mainHeating: r["main-heating-fuel"] || r.mainHeating,
      co2Emissions: r["co2-emissions-current"] || r.co2Emissions,
      energyEfficiencyRating: r["energy-efficiency-rating"] || r.energyEfficiencyRating,
      meesRisk: (r["energy-rating"] || r.energyRating || "").toUpperCase() >= "F",
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
  const gNum = "G".charCodeAt(0);

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
