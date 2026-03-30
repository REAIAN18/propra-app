/**
 * src/lib/dealscope-comps.ts
 * Comparable sales lookup from Land Registry Price Paid data.
 *
 * Finds similar properties sold recently in the same postcode sector.
 * Uses haversine distance for radius-based searches when geocoded.
 */

import { prisma } from '@/lib/prisma';

export interface ComparableSale {
  id: string;
  address: string;
  price: number;
  saleDate: Date;
  propertyType: string;
  sqft?: number;
  pricePerSqft?: number;
  distance?: number; // miles (if geocoded)
}

export interface CompsResult {
  comparables: ComparableSale[];
  avgPrice: number;
  avgPricePerSqft: number | null;
  confidenceScore: number;
  count: number;
}

/**
 * Find comparable sales for a property.
 *
 * Strategy:
 * 1. Filter by postcode sector + property type
 * 2. Look back 24 months for recent sales
 * 3. Sort by proximity (if geocoded) or recency
 * 4. Return top 5-10 comps with pricing metrics
 *
 * @param address Property address for lookup
 * @param postcodeSector Postcode sector (e.g., "SW1A")
 * @param propertyType Property type (e.g., "Terraced", "Flat")
 * @param lat Optional latitude for radius-based search
 * @param lng Optional longitude for radius-based search
 * @returns Array of comparable sales or empty if none found
 */
export async function findComps(
  address: string,
  postcodeSector: string,
  propertyType: string,
  lat?: number,
  lng?: number
): Promise<CompsResult> {
  try {
    // Calculate date range: last 24 months
    const since = new Date();
    since.setMonth(since.getMonth() - 24);

    // Query Land Registry Price Paid data
    const comps = await prisma.landRegistryPricePaid.findMany({
      where: {
        postcodeSector: {
          equals: postcodeSector,
          mode: 'insensitive',
        },
        propertyType: {
          equals: propertyType,
          mode: 'insensitive',
        },
        transferDate: {
          gte: since,
        },
      },
      select: {
        id: true,
        address: true,
        price: true,
        transferDate: true,
        propertyType: true,
        sqft: true,
        lat: true,
        lng: true,
      },
      orderBy: {
        transferDate: 'desc',
      },
      take: 20, // Get more than we need for filtering
    });

    // If no comps found in exact match, fall back to broader search
    if (comps.length === 0) {
      return {
        comparables: [],
        avgPrice: 0,
        avgPricePerSqft: null,
        confidenceScore: 0,
        count: 0,
      };
    }

    // Calculate distances and price metrics
    const comparablesWithMetrics = comps.map((comp: typeof comps[0]) => {
      const pricePerSqft = comp.sqft ? comp.price / comp.sqft : undefined;

      let distance: number | undefined;
      if (lat && lng && comp.lat && comp.lng) {
        distance = haversineDistance(lat, lng, comp.lat, comp.lng);
      }

      return {
        id: comp.id,
        address: comp.address,
        price: comp.price,
        saleDate: comp.transferDate,
        propertyType: comp.propertyType,
        sqft: comp.sqft || undefined,
        pricePerSqft,
        distance,
      };
    });

    // Sort by distance if available, otherwise by recency (already ordered)
    if (lat && lng) {
      comparablesWithMetrics.sort((a: typeof comparablesWithMetrics[0], b: typeof comparablesWithMetrics[0]) => (a.distance || 999999) - (b.distance || 999999));
    }

    // Take top 10 for the result
    const topComps = comparablesWithMetrics.slice(0, 10);

    // Calculate aggregate metrics
    const validPrices = topComps.map((c: typeof topComps[0]) => c.price);
    const validPricesPerSqft = topComps
      .filter((c: typeof topComps[0]) => c.pricePerSqft)
      .map((c: typeof topComps[0]) => c.pricePerSqft as number);

    const avgPrice = validPrices.length > 0 ? validPrices.reduce((a: number, b: number) => a + b, 0) / validPrices.length : 0;
    const avgPricePerSqft =
      validPricesPerSqft.length > 0 ? validPricesPerSqft.reduce((a: number, b: number) => a + b, 0) / validPricesPerSqft.length : null;

    // Confidence score: 0-100
    // Higher confidence if we have more comps with sqft data and recent sales
    const hasPropertyRecords = topComps.length >= 3;
    const hasSqftData = topComps.filter((c: typeof topComps[0]) => c.sqft).length >= 2;
    const hasRecentSales = topComps.filter((c: typeof topComps[0]) => {
      const months = (new Date().getTime() - c.saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return months <= 12;
    }).length >= 2;

    let confidenceScore = 30; // Base confidence
    if (hasPropertyRecords) confidenceScore += 30;
    if (hasSqftData) confidenceScore += 20;
    if (hasRecentSales) confidenceScore += 20;

    return {
      comparables: topComps,
      avgPrice,
      avgPricePerSqft,
      confidenceScore: Math.min(100, confidenceScore),
      count: topComps.length,
    };
  } catch (error) {
    console.error('[dealscope-comps] Error finding comps:', error);
    return {
      comparables: [],
      avgPrice: 0,
      avgPricePerSqft: null,
      confidenceScore: 0,
      count: 0,
    };
  }
}

/**
 * Score comparable sales confidence.
 * Higher score if we have multiple recent sales with detailed data.
 */
export function scoreCompsConfidence(result: CompsResult): number {
  if (result.count === 0) return 0;
  if (result.count < 3) return 20;
  if (result.count < 5) return 50;
  return result.confidenceScore;
}

/**
 * Calculate haversine distance between two coordinates (in miles).
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
