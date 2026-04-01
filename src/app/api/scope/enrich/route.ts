import { NextRequest, NextResponse } from "next/server";
import { findOwnersByAddress } from "@/lib/dealscope-ccod";
import { findComps } from "@/lib/dealscope-comps";
import { lookupEPCByAddress } from "@/lib/dealscope-epc";
import { getCompanyIntel } from "@/lib/dealscope-company-intel";
import { fetchUKPlanningApplications } from "@/lib/planning-feed";
import { assessDevPotential } from "@/lib/dev-potential";
import { calculateIncomeCap } from "@/lib/avm";
import { runHoldSellScenario } from "@/lib/hold-sell-model";
import { enrichAsset } from "@/lib/enrich-asset";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const address = body.address as string | undefined;
    const url = body.url as string | undefined;

    if (!address && !url) {
      return NextResponse.json(
        { error: "address or url is required" },
        { status: 400 }
      );
    }

    let enrichedAddress = address;

    // If URL provided, extract address from it (stub for now)
    if (url && !address) {
      // TODO: Implement URL extraction from listing page
      return NextResponse.json(
        { error: "URL extraction not yet implemented" },
        { status: 501 }
      );
    }

    // Run enrichment in parallel with graceful degradation
    const results = await Promise.allSettled([
      enrichAsset(enrichedAddress!), // Geocode
      lookupEPCByAddress(enrichedAddress!), // EPC rating
      findOwnersByAddress(enrichedAddress!, ""), // Owner company
      findComps("", "Mixed", undefined, 24), // Comparable sales
      fetchUKPlanningApplications(enrichedAddress!), // Planning applications
      assessDevPotential(enrichedAddress!), // Dev potential
      calculateIncomeCap({} as any), // Valuations (stub)
      runHoldSellScenario({} as any), // Hold/sell scenarios (stub)
    ]);

    // Extract results with fallback to empty/null on failure
    const geocodeData =
      results[0].status === "fulfilled" ? results[0].value : null;
    const epcData = results[1].status === "fulfilled" ? results[1].value : null;
    const ownershipRecords =
      results[2].status === "fulfilled" ? results[2].value : [];
    const comparableSales =
      results[3].status === "fulfilled" ? results[3].value : [];
    const planningApps =
      results[4].status === "fulfilled" ? results[4].value : [];
    const devPotential =
      results[5].status === "fulfilled" ? results[5].value : null;
    const valuations = results[6].status === "fulfilled" ? results[6].value : null;
    const scenarios = results[7].status === "fulfilled" ? results[7].value : null;

    // Get company intel if ownership found
    let companyIntel = null;
    if (ownershipRecords.length > 0) {
      try {
        const firstOwner = ownershipRecords[0];
        companyIntel = await getCompanyIntel(firstOwner.companyNumber);
      } catch (error) {
        console.warn("[scope-enrich] Companies House lookup failed:", error);
      }
    }

    // Determine asset type and location
    const assetType = body.assetType || "Mixed";
    const region = body.region || "uk";

    // Save to ScoutDeal
    const deal = await prisma.scoutDeal.create({
      data: {
        address: enrichedAddress!,
        assetType,
        region,
        sourceTag: "Manual enrichment",
        ownerName: ownershipRecords[0]?.ownerName,
        signalCount: Math.min(
          5,
          (planningApps.length > 0 ? 1 : 0) +
            (devPotential ? 1 : 0) +
            (epcData?.epcRating === "F" || epcData?.epcRating === "G" ? 1 : 0) +
            (ownershipRecords.some((r) => r.isDistressed) ? 1 : 0)
        ),
        // Store enrichment data as JSON for future retrieval
        brochureDocId: JSON.stringify({
          geocode: geocodeData,
          epc: epcData,
          ownership: ownershipRecords,
          comps: comparableSales.slice(0, 5),
          planning: planningApps.slice(0, 5),
          devPotential,
          company: companyIntel,
        }),
      },
    });

    return NextResponse.json({
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      enrichment: {
        geocode: geocodeData,
        epc: epcData,
        ownership: ownershipRecords.slice(0, 3),
        comps: comparableSales.slice(0, 5),
        planning: planningApps.slice(0, 5),
        devPotential,
        company: companyIntel,
        signals: [
          planningApps.length > 0 && "Planning applications found",
          devPotential && "Development potential identified",
          epcData?.epcRating === "F" || epcData?.epcRating === "G"
            ? "MEES at risk"
            : null,
          ownershipRecords.some((r) => r.isDistressed) && "Distressed ownership",
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Enrich error:", error);
    return NextResponse.json(
      { error: "Failed to enrich property" },
      { status: 500 }
    );
  }
}
