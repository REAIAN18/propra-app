/**
 * GET /api/dealscope/properties/[id]/export/pdf
 * Returns a downloadable HTML IC Memo using the dark-theme ICMemoTemplate.
 * No Puppeteer required — user can print to PDF from browser if needed.
 */

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { prisma } from "@/lib/prisma";
import { ICMemoTemplate } from "@/lib/dealscope/exports/ic-memo-template";
import { populateICMemo } from "@/lib/dealscope/exports/populate-ic-memo";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Derive the same signal-based deal score used by the GET /properties/[id] endpoint. */
function deriveSignalScore(deal: {
  hasInsolvency: boolean;
  hasPlanningApplication: boolean;
  sourceTag: string | null;
  epcRating: string | null;
}): number {
  let score = 50;
  if (deal.hasInsolvency) score += 20;
  if (deal.hasPlanningApplication) score += 15;
  if (deal.sourceTag === "Auction") score += 12;
  if (deal.sourceTag === "Distressed") score += 15;
  if (deal.epcRating === "F" || deal.epcRating === "G") score += 10;
  return Math.min(100, score);
}

/** Map a numeric deal score to the ICMemoProps recommendation enum. */
function scoreToRecommendation(score: number): "PROCEED" | "CONDITIONAL" | "PASS" {
  if (score >= 70) return "PROCEED";
  if (score >= 45) return "CONDITIONAL";
  return "PASS";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deal = await prisma.scoutDeal.findUnique({ where: { id } });
    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const ds = (deal.dataSources as Record<string, unknown>) || {};
    const ai = (ds.ai as Record<string, unknown>) || {};
    // Pre-computed returns stored by the enrichment pipeline / user PATCH
    const storedReturns = (ds.returns as Record<string, unknown> | undefined) ?? {};

    const memoProps = populateICMemo({
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      sqft: deal.sqft ?? undefined,
      buildingSizeSqft: deal.buildingSizeSqft ?? undefined,
      yearBuilt: deal.yearBuilt ?? undefined,
      epcRating: deal.epcRating ?? undefined,
      tenure: deal.tenure ?? (ai.tenure as string | undefined),
      occupancyPct: deal.occupancyPct ?? undefined,
      hasInsolvency: deal.hasInsolvency,
      hasLisPendens: deal.hasLisPendens,
      inFloodZone: deal.inFloodZone,
      signals: Array.isArray(ds.signals) ? (ds.signals as string[]) : [],
      dataSources: ds,
      currency: deal.currency ?? "GBP",
      askingPrice: deal.askingPrice ?? undefined,
      guidePrice: deal.guidePrice ?? undefined,
    }, { confidential: true });

    // Override with pre-computed returns when available — avoids NaN from
    // recalculating with incomplete enrichment data (e.g. vacant properties).
    const dealScore = deriveSignalScore(deal);
    if (typeof storedReturns.irr5yr === "number") {
      memoProps.irr = storedReturns.irr5yr / 100;
    }
    if (typeof storedReturns.equityMultiple === "number") {
      memoProps.equityMultiple = storedReturns.equityMultiple;
    }
    if (typeof storedReturns.noi === "number") {
      memoProps.noi = storedReturns.noi;
    }
    memoProps.dealScore = dealScore;
    memoProps.recommendation = scoreToRecommendation(dealScore);

    // Dynamic import avoids Next.js static analysis rejecting react-dom/server in route handlers
    const { renderToStaticMarkup } = await import("react-dom/server");
    const markup = renderToStaticMarkup(React.createElement(ICMemoTemplate, memoProps));
    const html = `<!DOCTYPE html>\n${markup}`;

    const safeName = deal.address
      .replace(/[^a-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 60);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="ic-memo-${safeName}.html"`,
      },
    });
  } catch (error: unknown) {
    console.error("[export/pdf]", error);
    return NextResponse.json(
      { error: `Failed to generate memo: ${(error as Error)?.message || "unknown"}` },
      { status: 500 }
    );
  }
}
