/**
 * GET /api/dealscope/properties/[id]/export/excel
 *
 * Wave T — Excel export now loads the supplied
 * CRE_Professional_Appraisal_Complete_EDITABLE_2026.xlsx template, picks the
 * appropriate deal sheet (Income / Refurb / Development / Multi-Unit), wires
 * deal numbers into the input cells (formulas preserved so the user can edit
 * any assumption), refreshes the embedded reference sheets from the live
 * cost library + macro rates, and hides the deal sheets the user shouldn't
 * see.
 *
 * Honest-mode contract:
 *   - Only known input cells are overwritten — every formula remains
 *     editable.
 *   - A "DealScope Provenance" tab is appended showing exactly which
 *     library row + macro rate drove each default.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { populateExcelExport, type PopulateExcelDeal } from "@/lib/dealscope/exports/populate-excel";

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

    // Live BoE base rate (Wave J/P) — drives FINANCING_MATRIX rate cell.
    let liveBoeBaseRate: number | null = null;
    try {
      const boe = await prisma.macroRate.findFirst({
        where: { series: "BOE_BASE" },
        orderBy: { date: "desc" },
      });
      if (boe?.value != null) liveBoeBaseRate = Number(boe.value) / 100;
    } catch {
      // honest-mode: if MacroRate query fails, fall back to cost-library default
    }

    // ScoutDeal has no postcode column — extract from the address string.
    const POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;
    const postcode = deal.address.match(POSTCODE_RE)?.[1] ?? null;

    // Synthesize signal tags from the booleans (mirrors the GET route).
    const signals: string[] = [];
    if (deal.hasInsolvency) signals.push("insolvency");
    if (deal.hasPlanningApplication) signals.push("planning");
    if (deal.sourceTag === "Auction") signals.push("auction");
    if (deal.sourceTag === "Distressed") signals.push("distressed");
    if (deal.epcRating === "F" || deal.epcRating === "G") signals.push("mees");

    const populateDeal: PopulateExcelDeal = {
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      postcode,
      buildingSizeSqft: deal.buildingSizeSqft ?? deal.sqft ?? null,
      yearBuilt: deal.yearBuilt,
      askingPrice: deal.askingPrice,
      guidePrice: deal.guidePrice,
      unitCount: null,
      signals,
      dataSources: (deal.dataSources as Record<string, unknown>) ?? {},
    };

    const result = await populateExcelExport(populateDeal, { liveBoeBaseRate });

    return new NextResponse(result.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-DealScope-Template": result.template.template,
        "X-DealScope-Template-Reason": encodeURIComponent(result.template.reason),
        "X-DealScope-Cost-Basis": encodeURIComponent(result.costBasis.provenance),
      },
    });
  } catch (err) {
    console.error("[excel-export] failed", err);
    return NextResponse.json(
      { error: "Failed to generate Excel export", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
