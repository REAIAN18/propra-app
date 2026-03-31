/**
 * src/lib/dealscope-epc.ts
 * EPC (Energy Performance Certificate) lookups for UK properties.
 *
 * Fetches energy rating and efficiency data from the official EPC register.
 */

export interface EPCRecord {
  addressLine1: string;
  postcode: string;
  certificateNumber?: string;
  ratingAdjacent?: string; // A-G rating
  currentEnergyEfficiency?: number; // 1-100 score
  potentialEnergyEfficiency?: number; // 1-100 score
  currrentRating?: string; // A-G (note: typo from API)
  potentialRating?: string; // A-G
  inspectionDate?: string;
  expiryDate?: string;
  buildingType?: string;
  builtForm?: string;
}

/**
 * Fetch EPC data for a UK property.
 * Uses the Open EPC API or gov.uk EPC register.
 *
 * @param address Full property address
 * @param postcode Property postcode
 * @returns EPC record with energy rating and efficiency data
 */
export async function getEPCData(address: string, postcode: string): Promise<EPCRecord | null> {
  try {
    const apiKey = process.env.EPC_API_KEY;
    if (!apiKey) {
      console.warn('[EPC] No EPC_API_KEY configured');
      return null;
    }

    // Try Open EPC API (free, no auth required for basic lookups)
    // API endpoint: https://api.openepc.org/address/
    const query = encodeURIComponent(`${address} ${postcode}`);
    const response = await fetch(
      `https://api.openepc.org/address/?address=${query}&latest=true&format=json`,
      {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.warn(`[EPC] Open EPC API returned ${response.status}`);
      return null;
    }

    const data = await response.json() as EPCRecord[];
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Return the most recent certificate
    return data[0];
  } catch (error) {
    console.error('[EPC] Lookup failed:', error);
    return null;
  }
}

/**
 * Extract rating letter (A-G) from EPC data.
 * Normalizes various response formats.
 */
export function extractRating(epcData: EPCRecord): string | null {
  // Try different field names from various EPC APIs
  const rating = epcData.ratingAdjacent || epcData.currrentRating || epcData.potentialRating;
  if (rating && /^[A-G]$/.test(rating)) {
    return rating;
  }
  return null;
}

/**
 * Extract energy efficiency score (1-100) from EPC data.
 */
export function extractEfficiencyScore(epcData: EPCRecord): number | null {
  const score = epcData.currentEnergyEfficiency || epcData.potentialEnergyEfficiency;
  if (typeof score === 'number' && score >= 1 && score <= 100) {
    return score;
  }
  return null;
}
