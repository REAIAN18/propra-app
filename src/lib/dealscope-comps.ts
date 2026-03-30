/**
 * DealScope Comparable Sales Integration
 * Land Registry Price Paid data (bulk download) for comparable evidence.
 *
 * Phase 1: Stub implementation with demo data
 * Phase 2: Integrate with Land Registry bulk data via PostgreSQL
 * Phase 3: Real-time API when available
 *
 * Free source: landregistry.data.gov.uk (monthly CSV downloads)
 */

export interface ComparableSale {
  address: string;
  postcode: string;
  price: number;
  date: string;
  propertyType: string;
  sqft?: number;
  pricePerSqft?: number;
  isNew?: boolean;
}

/**
 * Find comparable sales near a property
 *
 * Current implementation: returns empty (waiting for bulk data import)
 * Will query Land Registry Price Paid data filtered by:
 *   - Postcode sector (first 4 chars of outcode + incode sector)
 *   - Property type match
 *   - Date range (typically last 24 months)
 *
 * @param postcode - UK postcode to search
 * @param propertyType - Type of property to match
 * @param sqft - Optional floor area for price per sqft calculation
 * @param _monthsBack - Lookback period (reserved for future use when bulk data is imported)
 */
export async function findComps(
  postcode: string,
  propertyType: string,
  sqft?: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _monthsBack: number = 24
): Promise<ComparableSale[]> {
  try {
    // TODO: Query PostgreSQL Land Registry Price Paid table
    // For now, return empty to prevent errors
    // Once bulk data is imported:
    //
    // const result = await prisma.$queryRaw`
    //   SELECT address, postcode, price, date, property_type, sqft
    //   FROM land_registry_price_paid
    //   WHERE postcode LIKE $1
    //     AND property_type = $2
    //     AND date >= DATE_SUB(NOW(), INTERVAL $3 MONTH)
    //   ORDER BY date DESC
    //   LIMIT 20
    // `;

    console.log(
      `[dealscope-comps] Land Registry data not yet imported (postcode: ${postcode}, type: ${propertyType})`
    );
    return [];
  } catch (error) {
    console.error(
      `[dealscope-comps] Error finding comps for ${postcode} (${propertyType}):`,
      error
    );
    return [];
  }
}

/**
 * Score based on comps evidence
 */
export function scoreCompsConfidence(
  comps: ComparableSale[],
  estFloorArea?: number
): { valueRange: { low?: number; mid?: number; high?: number }; confidence: number } {
  if (!comps.length) {
    return {
      valueRange: {},
      confidence: 0,
    };
  }

  const prices = comps.map((c) => c.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // If we have sqft data for comps and this property, estimate by psf
  let byAreaEstimate = null;
  const compsWithArea = comps.filter((c) => c.sqft && c.pricePerSqft);
  if (compsWithArea.length > 0 && estFloorArea) {
    const avgPsf =
      compsWithArea.reduce((sum, c) => sum + (c.pricePerSqft || 0), 0) /
      compsWithArea.length;
    byAreaEstimate = estFloorArea * avgPsf;
  }

  const valueRange = {
    low: minPrice,
    mid: byAreaEstimate || avgPrice,
    high: maxPrice,
  };

  // Confidence based on number and recency of comps
  let confidence = Math.min(100, 20 + comps.length * 10);

  // Recent sales are more reliable
  const recentComps = comps.filter((c) => {
    const saleDate = new Date(c.date);
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    return saleDate > sixMonthsAgo;
  });
  confidence += recentComps.length * 5;

  return {
    valueRange,
    confidence: Math.min(100, confidence),
  };
}
