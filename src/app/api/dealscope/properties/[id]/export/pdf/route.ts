/**
 * GET /api/dealscope/properties/[id]/export/pdf
 * Returns a printable HTML page for the IC Memo (open in new tab → browser print-to-PDF).
 * No Puppeteer required — the browser handles PDF generation via print dialog.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderMemoHTML, type MemoData } from "@/lib/dealscope-memo-template";
import { analyseProperty, type AnalysisInput, type ComparableSale } from "@/lib/dealscope-deal-analysis";
import { normaliseRegion, normaliseAssetType } from "@/lib/data/scout-benchmarks";

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deal = await prisma.scoutDeal.findUnique({ where: { id } });
    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const ds = (deal.dataSources as Record<string, any>) || {};
    const assumptions = ds.assumptions || {};
    const ai = ds.ai || {};
    const listing = ds.listing || {};

    // Re-run analysis at export time to use latest calculation functions
    let analysis = ds.ricsAnalysis || ds.dealAnalysis || null;
    try {
      const normAsset = normaliseAssetType(deal.assetType || "commercial");
      const normRegion = normaliseRegion(deal.address || "");
      const ricsComps: ComparableSale[] = (ds.comps || []).slice(0, 12).map((c: Record<string, any>) => ({
        address: c.address || "Comparable",
        price: c.price || 0,
        sqft: c.sqft || c.floorArea || 0,
        pricePerSqft: c.pricePerSqft || (c.price && (c.sqft || c.floorArea) ? Math.round(c.price / (c.sqft || c.floorArea)) : 0),
        date: c.date || null,
        source: c.source || "Market",
        assetType: c.assetType || normAsset,
        condition: c.condition || null,
        tenure: c.tenure || null,
        adjustmentPct: 0,
        adjustmentReason: null,
      }));
      const ricsInput: AnalysisInput = {
        address: deal.address,
        assetType: normAsset,
        region: normRegion,
        askingPrice: deal.askingPrice || deal.guidePrice || 0,
        sqft: assumptions.sqft?.value || deal.buildingSizeSqft || 0,
        sqftSource: assumptions.sqft?.source || "stored",
        passingRent: assumptions.passingRent?.value || 0,
        passingRentSource: assumptions.passingRent?.source || "stored",
        erv: assumptions.erv?.value || 0,
        ervSource: assumptions.erv?.source || "stored",
        epcRating: assumptions.epcRating?.value || deal.epcRating || null,
        yearBuilt: assumptions.yearBuilt?.value || deal.yearBuilt || null,
        occupancyPct: assumptions.occupancy?.value ?? 0,
        occupancySource: assumptions.occupancy?.source || "stored",
        listingDescription: listing.description || ai.description || null,
        aiVacancy: ai.vacancy || null,
        comps: ricsComps,
        noi: assumptions.noi?.value || 0,
        tenure: deal.tenure || ai.tenure || listing.tenure || null,
        condition: ai.condition || null,
        numberOfUnits: ai.numberOfUnits || null,
        leaseExpiry: ai.leaseExpiry || null,
        breakDates: ai.breakDates
          ? (Array.isArray(ai.breakDates) ? ai.breakDates.join(", ") : ai.breakDates)
          : null,
        rentReviewType: null,
        tenantNames: ai.tenantNames
          ? (Array.isArray(ai.tenantNames) ? ai.tenantNames.join(", ") : ai.tenantNames)
          : null,
        developmentPotential: false,
        isSpecialist: false,
      };
      analysis = analyseProperty(ricsInput);
    } catch (e) {
      console.warn("[export/pdf] Re-analysis failed, using cached:", (e as Error)?.message);
    }

    const memoData: MemoData = {
      address: deal.address,
      assetType: deal.assetType || "Commercial",
      tenure: deal.tenure || ai.tenure || listing.tenure || null,
      sqft: deal.buildingSizeSqft || assumptions.sqft?.value || 0,
      yearBuilt: deal.yearBuilt || assumptions.yearBuilt?.value || null,
      epcRating: deal.epcRating || assumptions.epcRating?.value || null,
      condition: ai.condition || null,

      askingPrice: deal.askingPrice || deal.guidePrice || 0,
      guidePrice: deal.guidePrice || null,

      heroImage: ds.images?.[0] || listing.images?.[0] || null,
      satelliteUrl: deal.satelliteImageUrl || null,
      streetViewUrl: listing.streetView || null,
      images: ds.images?.slice(0, 6) || listing.images?.slice(0, 6) || [],
      floorplans: listing.floorplans || [],

      description: listing.description || ai.description || null,
      features: listing.features || ai.keyFeatures || [],
      accommodation: listing.accommodation || ai.accommodation || null,

      sourceTag: deal.sourceTag || "Unknown",
      sourceUrl: deal.sourceUrl || null,
      lotNumber: listing.lotNumber || ai.lotNumber || null,
      auctionDate: deal.auctionDate ? new Date(deal.auctionDate).toLocaleDateString("en-GB") : listing.auctionDate || null,
      agentName: deal.brokerName || ai.agentName || listing.agentContact?.name || null,

      ownerName: null,
      companyStatus: null,

      epcData: ds.epc || null,
      planningApps: ds.planning || [],
      comps: ds.comps || [],
      floodData: ds.flood || null,

      tenantNames: ai.tenantNames ? (Array.isArray(ai.tenantNames) ? ai.tenantNames.join(", ") : ai.tenantNames) : null,
      leaseExpiry: ai.leaseExpiry || null,
      breakDates: ai.breakDates ? (Array.isArray(ai.breakDates) ? ai.breakDates.join(", ") : ai.breakDates) : null,

      covenant: ds.covenant || null,
      ownerPortfolio: ds.ownerPortfolio || null,
      devPotential: ds.devPotential || null,

      analysis,

      market: ds.market || null,
      assumptions: ds.assumptions || {},
      rentGap: ds.rentGap || null,
      scenarios: ds.scenarios || null,

      generatedAt: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      dealId: deal.id,
    };

    const html = renderMemoHTML(memoData);

    // Return the HTML page directly — the browser handles print-to-PDF via Ctrl+P.
    // No Puppeteer or server-side chromium required.
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    console.error("[export/pdf]", error);
    return NextResponse.json(
      { error: `Failed to generate PDF: ${(error as Error)?.message || "unknown"}` },
      { status: 500 }
    );
  }
}
