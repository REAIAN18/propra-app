/**
 * GET /api/dealscope/export/memo?id=<propertyId>
 * Generates a PDF investment memo for a ScoutDeal property.
 * Maps ScoutDeal data → BrochureData → HTML → PDF via Puppeteer.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBrochurePDF, type BrochureData } from "@/lib/brochure";

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
    const assumptions = ds.assumptions || {};
    const returns = ds.returns || {};
    const rentGap = ds.rentGap || {};
    const ai = ds.ai || {};
    const valuations = ds.valuations || {};

    // Map to BrochureData
    const brochureData: BrochureData = {
      type: "investment_memo",
      assetName: deal.address,
      assetType: deal.assetType || "Commercial",
      location: extractLocation(deal.address),
      address: deal.address,
      sqft: deal.buildingSizeSqft || assumptions.sqft?.value || undefined,
      passingRent: rentGap.passingRent || undefined,
      marketERV: rentGap.marketERV || undefined,
      noi: returns.noi || undefined,
      yieldPct: returns.capRate || undefined,
      capRate: returns.capRate || undefined,
      marketCapRate: ds.market?.capRate ? ds.market.capRate * 100 : undefined,
      epcRating: deal.epcRating || undefined,
      satelliteUrl: deal.satelliteImageUrl || undefined,
      tenants: ai.accommodation
        ? (ai.accommodation as any[]).map((a: any) => ({
            name: a.tenant || "Vacant",
            expiry: a.leaseExpiry || null,
            rentPerSqft: a.rent && a.size_sqft ? a.rent / a.size_sqft : null,
          }))
        : undefined,
      financials: returns.noi
        ? {
            grossRevenue: rentGap.passingRent || returns.noi,
            operatingCosts: (rentGap.passingRent || returns.noi) - returns.noi,
            noi: returns.noi,
          }
        : undefined,
      narrative: ai.investmentSummary || ai.summary || buildNarrative(deal, ds),
      sym: "£",
      confidential: false,
      generatedAt: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };

    const pdfBuffer = await generateBrochurePDF(brochureData);

    if (!pdfBuffer) {
      // Fallback: return the HTML for client-side rendering
      const { renderBrochureHTML } = await import("@/lib/brochure-template");
      const html = renderBrochureHTML(brochureData);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="memo-${sanitizeFilename(deal.address)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[export/memo]", error);
    return NextResponse.json({ error: "Failed to generate memo" }, { status: 500 });
  }
}

function extractLocation(address: string): string {
  const parts = address.split(",").map((p) => p.trim());
  return parts.length >= 2 ? parts.slice(-2).join(", ") : address;
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").slice(0, 60);
}

function buildNarrative(deal: any, ds: any): string {
  const parts: string[] = [];
  parts.push(`${deal.address} is a ${deal.assetType || "commercial"} property`);
  if (deal.buildingSizeSqft) parts.push(`comprising ${deal.buildingSizeSqft.toLocaleString()} sqft`);
  if (deal.askingPrice) parts.push(`offered at £${deal.askingPrice.toLocaleString()}`);
  if (ds.rentGap?.passingRent) parts.push(`with passing rent of £${ds.rentGap.passingRent.toLocaleString()} per annum`);
  if (ds.rentGap?.gapPct > 0) parts.push(`representing a ${ds.rentGap.gapPct}% discount to estimated rental value`);
  if (deal.epcRating) parts.push(`The property holds an EPC rating of ${deal.epcRating}`);
  return parts.join(". ") + ".";
}
