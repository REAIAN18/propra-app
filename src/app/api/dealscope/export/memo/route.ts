/**
 * GET /api/dealscope/export/memo?id=<propertyId>
 * Generates a professional acquisition memorandum PDF.
 * Uses RICS analysis data stored in dataSources.ricsAnalysis.
 * Falls back to HTML if Puppeteer is unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderMemoHTML, type MemoData } from "@/lib/dealscope-memo-template";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deal = await prisma.scoutDeal.findUnique({ where: { id } });
    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const ds = (deal.dataSources as any) || {};
    const analysis = ds.ricsAnalysis || ds.dealAnalysis;
    const assumptions = ds.assumptions || {};
    const ai = ds.ai || {};
    const listing = ds.listing || {};

    if (!analysis) {
      return NextResponse.json({ error: "Property has not been fully analysed yet" }, { status: 400 });
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

    const html = renderMemoHTML(memoData);

    // Try Puppeteer PDF generation
    try {
      const chromium = await (async () => { try { return (await import("@sparticuz/chromium" as string) as any).default; } catch { return null; } })();
      const puppeteer = await (async () => { try { return (await import("puppeteer-core" as string) as any).default; } catch { return null; } })();

      if (chromium && puppeteer) {
        const browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
        });
        await browser.close();

        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="memo-${sanitizeFilename(deal.address)}.pdf"`,
          },
        });
      }
    } catch (e) {
      console.warn("[export/memo] Puppeteer unavailable, returning HTML:", e);
    }

    // Fallback: return HTML
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("[export/memo]", error);
    return NextResponse.json({ error: "Failed to generate memo" }, { status: 500 });
  }
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").slice(0, 60);
}
