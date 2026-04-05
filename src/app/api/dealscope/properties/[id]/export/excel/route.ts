/**
 * GET /api/dealscope/properties/[id]/export/excel
 * Generates and downloads an Excel workbook for a DealScope property.
 * Sheets: Summary, Financials, Comparables, Scenarios, Planning.
 * Uses exceljs.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const maxDuration = 30;

const fmt = (n: number | null | undefined, prefix = "£") =>
  n != null ? `${prefix}${n.toLocaleString("en-GB")}` : "—";
const pct = (n: number | null | undefined) =>
  n != null ? `${n}%` : "—";

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
    const ai = ds.ai || {};
    const listing = ds.listing || {};
    const assumptions = ds.assumptions || {};
    const returns = ds.returns || {};
    const valuations = ds.valuations || {};
    const rentGap = ds.rentGap || {};
    const market = ds.market || {};
    const comps: Record<string, any>[] = ds.comps || [];
    const scenarios: Record<string, any>[] = ds.scenarios || [];
    const planning: Record<string, any>[] = ds.planning || [];

    const wb = new ExcelJS.Workbook();
    wb.creator = "RealHQ";
    wb.created = new Date();

    // ── Style helpers ──────────────────────────────────────────────
    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A1A2E" },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFE4E4EC" }, size: 11 };
    const subFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF111116" },
    };
    const subFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF7C6AF0" }, size: 10 };
    const applyHeader = (row: ExcelJS.Row) => {
      row.font = headerFont;
      row.fill = headerFill;
      row.height = 20;
    };
    const applySub = (row: ExcelJS.Row) => {
      row.font = subFont;
      row.fill = subFill;
      row.height = 16;
    };

    // ── Sheet 1: Summary ──────────────────────────────────────────
    const sum = wb.addWorksheet("Summary");
    sum.columns = [
      { key: "label", width: 28 },
      { key: "value", width: 40 },
    ];
    applyHeader(sum.addRow(["IC MEMO — SUMMARY", ""]));
    sum.mergeCells("A1:B1");

    const sumRows: [string, string][] = [
      ["Address", deal.address || "—"],
      ["Asset Type", deal.assetType || "—"],
      ["Tenure", deal.tenure || ai.tenure || listing.tenure || "—"],
      ["Size (sqft)", deal.buildingSizeSqft ? deal.buildingSizeSqft.toLocaleString("en-GB") : "—"],
      ["Year Built", deal.yearBuilt ? String(deal.yearBuilt) : "—"],
      ["EPC Rating", deal.epcRating || "—"],
      ["Asking Price", fmt(deal.askingPrice || deal.guidePrice)],
      ["Source", deal.sourceTag || "—"],
      ["Broker / Agent", deal.brokerName || ai.agentName || "—"],
      ["Deal Score", (deal as any).dealScore != null ? String((deal as any).dealScore) : "—"],
      ["Generated", new Date().toLocaleDateString("en-GB")],
    ];
    sumRows.forEach(([label, value]) => {
      const r = sum.addRow({ label, value });
      r.getCell("label").font = { bold: true };
    });

    // ── Sheet 2: Financials ───────────────────────────────────────
    const fin = wb.addWorksheet("Financials");
    fin.columns = [
      { key: "metric", width: 30 },
      { key: "value", width: 24 },
      { key: "source", width: 28 },
    ];
    applyHeader(fin.addRow(["FINANCIALS", "", ""]));
    fin.mergeCells("A1:C1");

    applySub(fin.addRow(["Assumptions", "", ""]));
    fin.mergeCells(`A2:C2`);

    const asmRows: [string, string, string][] = [
      ["Asking Price", fmt(deal.askingPrice || deal.guidePrice), "Listed"],
      ["Passing Rent (pa)", fmt(assumptions.passingRent?.value), assumptions.passingRent?.source || "—"],
      ["ERV (pa)", fmt(assumptions.erv?.value), assumptions.erv?.source || "—"],
      ["NOI (pa)", fmt(assumptions.noi?.value), assumptions.noi?.source || "estimated (ERV × 85%)"],
      ["Cap Rate", pct(assumptions.capRate?.value ? +(assumptions.capRate.value * 100).toFixed(2) : null), assumptions.capRate?.source || "—"],
      ["Occupancy", pct(assumptions.occupancy?.value), assumptions.occupancy?.source || "—"],
    ];
    asmRows.forEach(([metric, value, source]) => fin.addRow({ metric, value, source }));

    const finRowStart = fin.rowCount + 1;
    applySub(fin.addRow(["Returns", "", ""]));
    fin.mergeCells(`A${finRowStart}:C${finRowStart}`);

    const retRows: [string, string][] = [
      ["Net Initial Yield", pct(returns.capRate)],
      ["5-yr IRR", pct(returns.irr5yr)],
      ["Cash-on-Cash", pct(returns.cashOnCash)],
      ["Equity Multiple", returns.equityMultiple ? `${returns.equityMultiple}×` : "—"],
      ["Equity Needed", fmt(returns.equityNeeded)],
    ];
    retRows.forEach(([metric, value]) => fin.addRow({ metric, value, source: "" }));

    const valRowStart = fin.rowCount + 1;
    applySub(fin.addRow(["Valuations", "", ""]));
    fin.mergeCells(`A${valRowStart}:C${valRowStart}`);

    const valRows: [string, string][] = [
      ["Income Cap Value", fmt(valuations.incomeCap?.value)],
      ["PSF Value", fmt(valuations.psf?.value)],
      ["Blended AVM", fmt(valuations.blended?.value)],
      ["Asking vs AVM Discount", pct(valuations.discount)],
    ];
    valRows.forEach(([metric, value]) => fin.addRow({ metric, value, source: "" }));

    const rgRowStart = fin.rowCount + 1;
    applySub(fin.addRow(["Rent Gap", "", ""]));
    fin.mergeCells(`A${rgRowStart}:C${rgRowStart}`);

    const rgRows: [string, string][] = [
      ["Passing Rent", fmt(rentGap.passingRent)],
      ["Market ERV", fmt(rentGap.marketERV)],
      ["Gap (pa)", fmt(rentGap.gap)],
      ["Gap %", pct(rentGap.gapPct)],
      ["Direction", rentGap.direction || "—"],
    ];
    rgRows.forEach(([metric, value]) => fin.addRow({ metric, value, source: "" }));

    // Market
    if (market.dscr != null || market.annualDebtService != null) {
      const mktRowStart = fin.rowCount + 1;
      applySub(fin.addRow(["Market / Debt", "", ""]));
      fin.mergeCells(`A${mktRowStart}:C${mktRowStart}`);
      fin.addRow({ metric: "Annual Debt Service", value: fmt(market.annualDebtService), source: "" });
      fin.addRow({ metric: "DSCR", value: market.dscr ? String(market.dscr) : "—", source: "" });
    }

    // ── Sheet 3: Comparables ──────────────────────────────────────
    const compSheet = wb.addWorksheet("Comparables");
    compSheet.columns = [
      { key: "address", width: 36 },
      { key: "price", width: 16 },
      { key: "sqft", width: 12 },
      { key: "psf", width: 14 },
      { key: "date", width: 14 },
      { key: "source", width: 16 },
    ];
    applyHeader(compSheet.addRow(["Address", "Price", "Sqft", "£/sqft", "Date", "Source"]));
    comps.forEach((c) => {
      compSheet.addRow({
        address: c.address || "—",
        price: c.price ? fmt(c.price) : "—",
        sqft: c.sqft || c.floorArea || "—",
        psf: c.pricePerSqft ? fmt(c.pricePerSqft, "£") : "—",
        date: c.date || "—",
        source: c.source || "—",
      });
    });
    if (comps.length === 0) compSheet.addRow({ address: "No comparables available" });

    // ── Sheet 4: Scenarios ────────────────────────────────────────
    const scSheet = wb.addWorksheet("Scenarios");
    scSheet.columns = [
      { key: "name", width: 20 },
      { key: "irr", width: 14 },
      { key: "em", width: 18 },
      { key: "yield", width: 16 },
      { key: "npv", width: 18 },
    ];
    applyHeader(scSheet.addRow(["Scenario", "IRR", "Equity Multiple", "Cash Yield", "NPV"]));
    scenarios.forEach((s) => {
      scSheet.addRow({
        name: s.name || "—",
        irr: s.irr ? `${s.irr}%` : "—",
        em: s.equityMultiple ? `${s.equityMultiple}×` : "—",
        yield: s.cashYield ? `${s.cashYield}%` : "—",
        npv: s.npv ? fmt(s.npv) : "—",
      });
    });
    if (scenarios.length === 0) scSheet.addRow({ name: "No scenario data available" });

    // ── Sheet 5: Planning ─────────────────────────────────────────
    const planSheet = wb.addWorksheet("Planning");
    planSheet.columns = [
      { key: "ref", width: 20 },
      { key: "description", width: 48 },
      { key: "status", width: 16 },
      { key: "date", width: 14 },
    ];
    applyHeader(planSheet.addRow(["Reference", "Description", "Status", "Date"]));
    planning.forEach((p) => {
      planSheet.addRow({
        ref: p.reference || p.ref || "—",
        description: p.description || p.title || "—",
        status: p.status || "—",
        date: p.date || p.receivedDate || "—",
      });
    });
    if (planning.length === 0) planSheet.addRow({ ref: "No planning applications found" });

    // ── Stream response ───────────────────────────────────────────
    const buf = await wb.xlsx.writeBuffer();
    const slug = deal.address
      ? deal.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60)
      : deal.id;
    const filename = `ic-memo-${slug}.xlsx`;

    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("[export/excel]", error);
    return NextResponse.json(
      { error: `Failed to generate Excel: ${(error as Error)?.message || "unknown"}` },
      { status: 500 }
    );
  }
}
