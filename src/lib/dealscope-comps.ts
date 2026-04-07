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
 * @param monthsBack - Lookback period (reserved for future use when bulk data is imported)
 */
export async function findComps(
  postcode: string,
  propertyType: string,
  sqft?: number,
  monthsBack: number = 24
): Promise<ComparableSale[]> {
  try {
    const { prisma } = await import('@/lib/prisma');

    // Calculate date range
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

    // Normalise postcode → sector. UK Land Registry stores sector as
    // "OUTCODE INCODE-FIRST-DIGIT" e.g. "W8 4". Accept inputs with or
    // without spaces ("W84PF" / "W8 4PF") and derive the sector reliably.
    const compact = postcode.replace(/\s+/g, '').toUpperCase();
    // Sector = outcode + first digit of incode (outcode length varies 2-4)
    const sectorMatch = compact.match(/^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9])[A-Z]{2}$/);
    const sectorPrefix = sectorMatch ? `${sectorMatch[1]} ${sectorMatch[2]}` : compact.slice(0, 4);

    // Land Registry Price Paid only tags residential property types
    // (D/S/T/F/O). For commercial assets the field is typically "O" (other)
    // and filtering by "retail"/"office" etc. returns zero rows. Only apply
    // the filter for clearly residential inputs.
    const lrResidentialType = (() => {
      const pt = (propertyType || '').toLowerCase();
      if (/detached/.test(pt)) return 'D';
      if (/semi/.test(pt)) return 'S';
      if (/terrace/.test(pt)) return 'T';
      if (/flat|apartment/.test(pt)) return 'F';
      return null;
    })();

    const results = await prisma.landRegistryPricePaid.findMany({
      where: {
        OR: [
          {
            postcodeSector: {
              startsWith: sectorPrefix,
              mode: 'insensitive',
            },
          },
          {
            postcode: {
              startsWith: sectorPrefix,
              mode: 'insensitive',
            },
          },
        ],
        ...(lrResidentialType
          ? { propertyType: { equals: lrResidentialType, mode: 'insensitive' as const } }
          : {}),
        transferDate: {
          gte: cutoffDate,
        },
      },
      select: {
        address: true,
        postcode: true,
        price: true,
        transferDate: true,
        propertyType: true,
        isNew: true,
      },
      orderBy: {
        transferDate: 'desc',
      },
      take: 20,
    });

    return results.map(r => ({
      address: r.address,
      postcode: r.postcode,
      price: r.price,
      date: r.transferDate.toISOString().split('T')[0],
      propertyType: r.propertyType,
      sqft: sqft,
      pricePerSqft: sqft ? Math.round(r.price / sqft) : undefined,
      isNew: r.isNew,
    }));
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
