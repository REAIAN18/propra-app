/**
 * GET /api/dealscope/export/memo?id=<propertyId>&format=pdf|html
 *
 * Generates an investment memorandum.
 *  - format=html (default) — returns printable HTML; user prints to PDF
 *  - format=pdf            — server-side renders a real PDF via puppeteer-core
 *                            + @sparticuz/chromium (Vercel serverless pattern)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderMemoHTML, type MemoData } from "@/lib/dealscope-memo-template";
import { analyseProperty, type AnalysisInput, type ComparableSale } from "@/lib/dealscope-deal-analysis";
import { normaliseRegion, normaliseAssetType } from "@/lib/data/scout-benchmarks";

export const maxDuration = 60;

/**
 * Render HTML → PDF buffer using puppeteer-core + @sparticuz/chromium.
 * Lazy-imported so cold starts stay snappy for the default HTML path.
 */
async function htmlToPdf(html: string): Promise<Buffer> {
  const [chromium, puppeteer] = await Promise.all([
    import("@sparticuz/chromium").then((m) => m.default),
    import("puppeteer-core"),
  ]);
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const format = (searchParams.get("format") || "html").toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deal = await prisma.scoutDeal.findUnique({ where: { id } });
    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const ds = (deal.dataSources as any) || {};
    const assumptions = ds.assumptions || {};
    const ai = ds.ai || {};
    const listing = ds.listing || {};

    // Re-run RICS analysis at export time so it uses the latest fixed calculation
    // functions (IRR, NIY, CAPEX) rather than stale cached values.
    let analysis = ds.ricsAnalysis || ds.dealAnalysis || null;
    try {
      const asmp = assumptions;
      const normAsset = normaliseAssetType(deal.assetType || "commercial");
      const normRegion = normaliseRegion(deal.address || "");
      const ricsComps: ComparableSale[] = (ds.comps || []).slice(0, 12).map((c: any) => ({
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
        sqft: asmp.sqft?.value || deal.buildingSizeSqft || 0,
        sqftSource: asmp.sqft?.source || "stored",
        passingRent: asmp.passingRent?.value || 0,
        passingRentSource: asmp.passingRent?.source || "stored",
        erv: asmp.erv?.value || 0,
        ervSource: asmp.erv?.source || "stored",
        epcRating: asmp.epcRating?.value || deal.epcRating || null,
        yearBuilt: asmp.yearBuilt?.value || deal.yearBuilt || null,
        occupancyPct: asmp.occupancy?.value ?? 0,
        occupancySource: asmp.occupancy?.source || "stored",
        listingDescription: listing.description || ai.description || null,
        aiVacancy: ai.vacancy || null,
        comps: ricsComps,
        noi: asmp.noi?.value || 0,
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
      console.warn("[export/memo] Re-analysis failed, using cached:", (e as any)?.message);
      // Fall back to stored analysis
    }

    // Build MemoData from stored deal + analysis
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

    let html: string;
    try {
      html = renderMemoHTML(memoData);
    } catch (renderErr: any) {
      console.error("[export/memo] renderMemoHTML crashed:", renderErr?.message, renderErr?.stack);
      return NextResponse.json({ error: `Memo render failed: ${renderErr?.message || "unknown"}` }, { status: 500 });
    }

    if (format === "pdf") {
      try {
        const pdf = await htmlToPdf(html);
        const safeName = (deal.address || "memo")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || "memo";
        return new NextResponse(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
            "Cache-Control": "private, no-store",
          },
        });
      } catch (pdfErr: any) {
        console.error("[export/memo] PDF render failed, falling back to HTML:", pdfErr?.message);
        // Fall through to HTML response so the user still gets their memo.
      }
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[export/memo]", error);
    return NextResponse.json({ error: `Failed to generate memo: ${error?.message || "unknown"}` }, { status: 500 });
  }
}
