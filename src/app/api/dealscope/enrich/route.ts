import { NextRequest, NextResponse } from "next/server";
import { findOwnersByAddress } from "@/lib/dealscope-ccod";
import { findComps } from "@/lib/dealscope-comps";
import { lookupEPCByAddress } from "@/lib/dealscope-epc";
import { getCompanyIntel } from "@/lib/dealscope-company-intel";
import {
  scoreProperty,
  epcSignal,
  companyDistressSignal,
  compsSignal,
  type PropertySignal,
} from "@/lib/dealscope-scoring";
import { extractAddressFromDescription } from "@/lib/dealscope-text-parser";
import type { EPCCertificate } from "@/lib/dealscope-epc";
import type { CompanyIntel } from "@/lib/dealscope-company-intel";
import type { ComparableSale } from "@/lib/dealscope-comps";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    let { address, postcode: inputPostcode, description } = body;

    // If description is provided, extract address and postcode from it
    if (description && typeof description === "string") {
      const extracted = await extractAddressFromDescription(description);
      if (!extracted) {
        return NextResponse.json(
          { error: "Could not extract address from description" },
          { status: 400 }
        );
      }
      address = extracted.address;
      inputPostcode = inputPostcode || extracted.postcode;
    }

    if (!address) {
      return NextResponse.json(
        { error: "Address is required (provide address directly or description to parse)" },
        { status: 400 }
      );
    }

    // For now, postcode must be provided or inferred from address
    // TODO: Call Google Maps to geocode and extract postcode if not provided
    const postcode = (inputPostcode as string | undefined) || "";

    if (!postcode) {
      return NextResponse.json(
        { error: "Postcode is required (or address must be geocodable)" },
        { status: 400 }
      );
    }

    // Execute all API calls in parallel with graceful degradation
    const results = await Promise.allSettled([
      findOwnersByAddress(address as string, postcode),
      lookupEPCByAddress(address as string),
      findComps(postcode, "Industrial", undefined, 24), // Default to Industrial, can be enhanced
    ]);

    // Extract results with fallback to empty/null on failure
    const ownershipRecords =
      results[0].status === "fulfilled" ? results[0].value : [];
    const epcData = results[1].status === "fulfilled" ? results[1].value : null;
    const comparableSales =
      results[2].status === "fulfilled" ? results[2].value : [];

    // Track which data sources succeeded
    const dataSources = {
      ccod: results[0].status === "fulfilled" && ownershipRecords.length > 0,
      epc: results[1].status === "fulfilled" && epcData !== null,
      landRegistry: results[2].status === "fulfilled" && comparableSales.length > 0,
      companiesHouse: false, // Will be set after company intel fetch
    };

    // Log API failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const apiNames = ["CCOD", "EPC", "Land Registry"];
        console.warn(`[dealscope-enrich] ${apiNames[index]} API call failed:`, result.reason);
      }
    });

    // Get company intel for the first owner found (only if CCOD succeeded)
    let companyIntel = null;
    if (ownershipRecords.length > 0) {
      try {
        const firstOwner = ownershipRecords[0];
        companyIntel = await getCompanyIntel(firstOwner.companyNumber);
        dataSources.companiesHouse = companyIntel !== null;
      } catch (error) {
        console.warn("[dealscope-enrich] Companies House API call failed:", error);
        dataSources.companiesHouse = false;
      }
    }

    // Build enriched response
    const enriched = {
      address,
      postcode,

      // Ownership data
      ownership: ownershipRecords.length > 0
        ? {
            records: ownershipRecords,
            primary: ownershipRecords[0],
            companyIntel: companyIntel,
          }
        : null,

      // EPC data
      epc: epcData
        ? {
            rating: epcData.epcRating,
            floorAreaSqft: epcData.floorAreaSqft,
            buildingType: epcData.buildingType,
            meesRisk: epcData.meesRisk,
            co2Emissions: epcData.co2Emissions,
          }
        : null,

      // Comparable sales
      comps: comparableSales.length > 0
        ? {
            count: comparableSales.length,
            sales: comparableSales.slice(0, 5), // Return top 5
            summary: {
              avgPrice: Math.round(
                comparableSales.reduce((sum, c) => sum + c.price, 0) /
                  comparableSales.length
              ),
              minPrice: Math.min(...comparableSales.map((c) => c.price)),
              maxPrice: Math.max(...comparableSales.map((c) => c.price)),
              recentCount: comparableSales.filter((c) => {
                const saleDate = new Date(c.date);
                const sixMonthsAgo = new Date(
                  Date.now() - 180 * 24 * 60 * 60 * 1000
                );
                return saleDate > sixMonthsAgo;
              }).length,
            },
          }
        : null,

      // Signals and opportunity detection
      signals: generateSignals(epcData, companyIntel, comparableSales),
      opportunities: generateSignals(epcData, companyIntel, comparableSales)
        .length > 0,

      // Data source availability
      dataSources: {
        available: dataSources,
        timestamp: new Date().toISOString(),
        note: "Shows which data sources succeeded. If a source is false, that data is unavailable.",
      },

      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        sources: [
          "Land Registry CCOD",
          "Land Registry Price Paid",
          "EPC Register",
          "Companies House",
        ],
      },
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error enriching property:", error);
    return NextResponse.json(
      { error: "Failed to enrich property" },
      { status: 500 }
    );
  }
}

/**
 * Generate opportunity signals from enriched data
 */
function generateSignals(
  epcData: EPCCertificate | null,
  companyIntel: CompanyIntel | null,
  comparableSales: ComparableSale[]
): PropertySignal[] {
  const signals: PropertySignal[] = [];

  // EPC signal
  if (epcData) {
    const epcSig = epcSignal(epcData.epcRating);
    if (epcSig) signals.push(epcSig);
  }

  // Company distress signals
  if (companyIntel) {
    const distressSignals = companyDistressSignal(
      companyIntel.companyStatus,
      companyIntel.insolventCases,
      companyIntel.chargesCount
    );
    signals.push(...distressSignals);
  }

  // Comparables signal
  if (comparableSales.length > 0) {
    const compsSig = compsSignal(comparableSales.length);
    if (compsSig) signals.push(compsSig);
  }

  return signals;
}
