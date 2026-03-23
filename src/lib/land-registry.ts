/**
 * src/lib/land-registry.ts
 * UK comparable sales from HM Land Registry Price Paid Index.
 *
 * Free government API — no API key required.
 * SPARQL endpoint: https://landregistry.data.gov.uk/landregistry/query
 *
 * Wave 2 limitation: Land Registry PPD does not include sqft for commercial
 * properties. `pricePerSqft` will always be null for LR comparables.
 * The AVM PSF method is therefore unavailable for UK assets in Wave 2.
 * Income capitalisation is the primary (and reliable) UK method.
 *
 * Wave 3 path: CoStar UK API provides sqft + cap rates (£12–20k/yr).
 *
 * Usage — call on UK asset creation (same pattern as fetchAttomComparables):
 *
 *   if (asset.country === "UK" && asset.postcode) {
 *     await fetchLandRegistryComps(asset.id, asset.postcode, asset.sqft ?? null);
 *   }
 */

import { prisma } from "@/lib/prisma";

const SPARQL_ENDPOINT = "https://landregistry.data.gov.uk/landregistry/query";

/** Minimum sale amount to filter noise (£50k). */
const MIN_SALE_AMOUNT = 50_000;

/** Only fetch transactions from the last 3 years for relevance. */
const SINCE_YEAR = new Date().getFullYear() - 3;

interface LRSparqlBinding {
  pricePaid?: { value: string };
  date?:      { value: string };
  address?:   { value: string };
  type?:      { value: string };
}

interface LRSparqlResponse {
  results?: {
    bindings?: LRSparqlBinding[];
  };
}

/**
 * Fetch comparable sales from Land Registry for a UK postcode sector and
 * upsert them into PropertyComparable.
 *
 * @param assetId   UserAsset.id
 * @param postcode  UK postcode, e.g. "TN24 0AB" or "TN24 0AB"
 * @param sqft      Asset gross floor area (for future PSF calc — stored but not used in Wave 2)
 */
export async function fetchLandRegistryComps(
  assetId: string,
  postcode: string,
  sqft: number | null,
): Promise<void> {
  // Skip if LR comps already exist for this asset
  const existing = await prisma.propertyComparable.count({
    where: { assetId, source: "land_registry" },
  });
  if (existing > 0) return;

  // Derive postcode sector: strip inward code (last 3 chars after removing spaces)
  // "TN24 0AB" → "TN24" | "SE1 9GF" → "SE1" | "EC2V 7HN" → "EC2V"
  const stripped = postcode.replace(/\s+/g, "");
  const sector   = stripped.slice(0, stripped.length - 3);

  if (!sector || sector.length < 2) {
    console.warn(`[land-registry] Invalid postcode "${postcode}" for asset ${assetId}`);
    return;
  }

  const sinceDate = `${SINCE_YEAR}-01-01`;

  const query = `
    PREFIX ppi: <http://landregistry.data.gov.uk/def/ppi/>
    PREFIX common: <http://landregistry.data.gov.uk/def/common/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?pricePaid ?date ?address ?type WHERE {
      ?trans a ppi:TransactionRecord ;
        ppi:pricePaid ?pricePaid ;
        ppi:transactionDate ?date ;
        ppi:propertyAddress ?addr .
      ?addr common:postcode ?postcode .
      OPTIONAL { ?trans ppi:propertyType ?type }
      FILTER(STRSTARTS(STR(?postcode), "${sector}"))
      FILTER(?date > "${sinceDate}"^^xsd:date)
    }
    ORDER BY DESC(?date)
    LIMIT 25
  `;

  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&output=json`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/sparql-results+json" },
    });

    if (!res.ok) {
      console.error(`[land-registry] SPARQL request failed: ${res.status} ${res.statusText}`);
      return;
    }

    const data: LRSparqlResponse = await res.json();
    const bindings = data?.results?.bindings ?? [];

    if (bindings.length === 0) {
      console.log(`[land-registry] No results for postcode sector "${sector}"`);
      return;
    }

    let inserted = 0;
    for (const b of bindings) {
      const saleAmount  = parseFloat(b.pricePaid?.value ?? "0");
      const saleDate    = b.date?.value?.slice(0, 10) ?? null;
      const address     = b.address?.value ?? `${sector} transaction`;

      if (saleAmount < MIN_SALE_AMOUNT) continue;

      try {
        await prisma.propertyComparable.upsert({
          where: {
            // Requires @@unique([assetId, source, address]) on PropertyComparable
            // (added in wave-2-prisma-schema-additions.md Section A)
            assetId_source_address: { assetId, source: "land_registry", address },
          },
          create: {
            assetId,
            address,
            saleAmount,
            saleDate,
            pricePerSqft: null,    // LR PPD does not include sqft for commercial
            sqft: sqft,            // asset sqft stored for reference only
            source: "land_registry",
          },
          update: {
            saleAmount,
            saleDate,
          },
        });
        inserted++;
      } catch (upsertErr) {
        // Non-fatal: individual upsert failure should not block the batch
        console.warn(`[land-registry] Upsert skipped for "${address}":`, upsertErr);
      }
    }

    console.log(`[land-registry] Inserted/updated ${inserted} comps for asset ${assetId} (sector ${sector})`);
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      console.error(`[land-registry] Timeout fetching comps for sector "${sector}"`);
    } else {
      console.error(`[land-registry] Unexpected error:`, err);
    }
    // Errors are non-fatal — AVM falls back to income cap only
  }
}

/**
 * Returns the postcode sector from a full UK postcode.
 * Exported for unit testing.
 *
 * "TN24 0AB" → "TN24"
 * "EC2V 7HN" → "EC2V"
 * "SW1A 2AA" → "SW1A"
 */
export function extractPostcodeSector(postcode: string): string {
  return postcode.replace(/\s+/g, "").slice(0, -3);
}
