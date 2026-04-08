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

    // Wave J6: snapshot current macro rates for the IC memo context
    const [sofr, boe, cpi, gdp] = await Promise.all([
      prisma.macroRate.findFirst({ where: { series: "SOFR" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
      prisma.macroRate.findFirst({ where: { series: "BOE_BASE" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
      prisma.macroRate.findFirst({ where: { series: "CPI" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
      prisma.macroRate.findFirst({ where: { series: "GDP_QOQ" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
    ]);
    const macroDates = [sofr?.date, boe?.date, cpi?.date, gdp?.date].filter(Boolean) as (string | Date)[];
    const macroAsOf = macroDates.length > 0
      ? macroDates.map((d) => (typeof d === "string" ? d : d.toISOString().split("T")[0])).sort().slice(-1)[0]
      : null;
    const macroSnapshot = {
      sofr: sofr?.value ?? null,
      boeBase: boe?.value ?? null,
      cpi: cpi?.value ?? null,
      gdp: gdp?.value ?? null,
      asOf: macroAsOf,
    };

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
      // PSF rates for deriving annual rent figures when full ERV not in dataSources
      currentRentPsf: deal.currentRentPsf ?? undefined,
      marketRentPsf: deal.marketRentPsf ?? undefined,
    }, { confidential: true, macroSnapshot });

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
