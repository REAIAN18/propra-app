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
import type { EPCCertificate } from "@/lib/dealscope-epc";
import type { CompanyIntel } from "@/lib/dealscope-company-intel";
import type { ComparableSale } from "@/lib/dealscope-comps";

export async function POST(req: NextRequest) {
  try {
    const { address, postcode: inputPostcode } = await req.json() as Record<string, unknown>;

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
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

    // Execute all API calls in parallel
    const [
      ownershipRecords,
      epcData,
      comparableSales,
    ] = await Promise.all([
      findOwnersByAddress(address as string, postcode),
      lookupEPCByAddress(address as string),
      findComps(postcode, "Industrial", undefined, 24), // Default to Industrial, can be enhanced
    ]);

    // Get company intel for the first owner found
    let companyIntel = null;
    if (ownershipRecords.length > 0) {
      const firstOwner = ownershipRecords[0];
      companyIntel = await getCompanyIntel(firstOwner.companyNumber);
    }

    // Build enriched response
    const enriched = {
      address,
      postcode,

      // Ownership data
      ownership: {
        records: ownershipRecords,
        primary: ownershipRecords[0] || null,
        companyIntel: companyIntel,
      },

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
      comps: {
        count: comparableSales.length,
        sales: comparableSales.slice(0, 5), // Return top 5
        summary:
          comparableSales.length > 0
            ? {
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
              }
            : null,
      },

      // Signals and opportunity detection
      signals: generateSignals(epcData, companyIntel, comparableSales),
      opportunities: generateSignals(epcData, companyIntel, comparableSales)
        .length > 0,
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
