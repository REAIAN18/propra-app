/**
 * src/lib/land-registry.ts
 * UK Land Registry SPARQL integration for commercial property comparable sales.
 * Free tier, no API key required.
 */

import { prisma } from "./prisma";

interface LandRegistryTransaction {
  transactionDate: string;
  pricePaid: number;
  propertyAddress: string;
  postcode?: string;
}

/**
 * Fetches UK commercial property comparable sales from HM Land Registry
 * and stores them in PropertyComparable table.
 * 
 * @param postcode - UK postcode (e.g., "SE1 9SG")
 * @param assetId - UserAsset ID to associate comparables with
 */
export async function fetchLandRegistryComps(
  postcode: string,
  assetId: string
): Promise<void> {
  if (!postcode || postcode.length < 4) {
    console.warn(`Invalid postcode for Land Registry fetch: ${postcode}`);
    return;
  }

  // Get postcode sector (first 4 characters, e.g., "SE1 " from "SE1 9SG")
  const postcodeSector = postcode.substring(0, 4).toUpperCase();

  // Calculate date 24 months ago
  const twoYearsAgo = new Date();
  twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
  const fromDate = twoYearsAgo.toISOString().split('T')[0];

  // SPARQL query to Land Registry Price Paid Data
  const sparqlQuery = `
    PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
    PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
    
    SELECT ?transaction ?date ?price ?addr ?postcode
    WHERE {
      ?transaction lrppi:pricePaid ?price ;
                   lrppi:transactionDate ?date ;
                   lrppi:propertyAddress ?addr_obj .
      
      ?addr_obj lrcommon:postcode ?postcode .
      
      OPTIONAL { ?addr_obj lrcommon:paon ?paon }
      OPTIONAL { ?addr_obj lrcommon:saon ?saon }
      OPTIONAL { ?addr_obj lrcommon:street ?street }
      OPTIONAL { ?addr_obj lrcommon:town ?town }
      
      BIND(CONCAT(
        COALESCE(?saon, ""), " ",
        COALESCE(?paon, ""), " ",
        COALESCE(?street, ""), ", ",
        COALESCE(?town, "")
      ) AS ?addr)
      
      FILTER(?date >= "${fromDate}"^^xsd:date)
      FILTER(?price > 100000)
      FILTER(REGEX(?postcode, "^${postcodeSector}", "i"))
    }
    LIMIT 50
  `;

  try {
    const response = await fetch(
      "https://landregistry.data.gov.uk/landregistry/query",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/sparql-query",
          "Accept": "application/json",
        },
        body: sparqlQuery,
      }
    );

    if (!response.ok) {
      console.error(`Land Registry API error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const results = data.results?.bindings || [];

    console.log(`Found ${results.length} Land Registry comparables for ${postcodeSector}`);

    // Upsert each transaction as a PropertyComparable
    for (const result of results) {
      const address = result.addr?.value?.trim() || "Unknown";
      const salePrice = parseFloat(result.price?.value || "0");
      const saleDate = result.date?.value || new Date().toISOString().split('T')[0];
      const pc = result.postcode?.value || postcode;

      if (salePrice === 0) continue;

      await prisma.propertyComparable.upsert({
        where: {
          assetId_source_address: {
            assetId,
            source: "land_registry",
            address,
          },
        },
        create: {
          assetId,
          address,
          saleAmount: salePrice,
          saleDate,
          pricePerSqft: null, // HMLR doesn't provide sqft for commercial
          source: "land_registry",
        },
        update: {
          // Don't overwrite if already exists
        },
      });
    }

    console.log(`Upserted ${results.length} Land Registry comparables for asset ${assetId}`);
  } catch (error) {
    console.error("Land Registry fetch failed:", error);
    // Silent failure - don't block asset creation if LR is down
  }
}
