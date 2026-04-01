/**
 * GET /api/dealscope/export/model?id=<propertyId>
 * Exports a financial model as .xlsx using ExcelJS.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 15;

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
    const returns = ds.returns || {};
    const rentGap = ds.rentGap || {};
    const valuations = ds.valuations || {};
    const scenarios = ds.scenarios || [];
    const market = ds.market || {};
    const assumptions = ds.assumptions || {};

    // Dynamic import to avoid bundling ExcelJS in every route
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RealHQ DealScope";
    workbook.created = new Date();

    // ── Sheet 1: Summary ──
    const summary = workbook.addWorksheet("Summary");
    summary.columns = [
      { header: "Field", key: "field", width: 30 },
      { header: "Value", key: "value", width: 25 },
      { header: "Source", key: "source", width: 20 },
    ];

    const summaryRows = [
      { field: "Address", value: deal.address, source: "" },
      { field: "Asset Type", value: deal.assetType || "", source: "" },
      { field: "Size (sqft)", value: deal.buildingSizeSqft || assumptions.sqft?.value || "", source: assumptions.sqft?.source || "" },
      { field: "Asking Price", value: deal.askingPrice || "", source: "" },
      { field: "Guide Price", value: deal.guidePrice || "", source: "" },
      { field: "EPC Rating", value: deal.epcRating || "", source: "EPC Register" },
      { field: "Tenure", value: deal.tenure || "", source: "" },
      { field: "Year Built", value: deal.yearBuilt || "", source: assumptions.yearBuilt?.source || "" },
      { field: "", value: "", source: "" },
      { field: "Passing Rent (p.a.)", value: rentGap.passingRent || "", source: rentGap.passingRentSource || "" },
      { field: "Market ERV (p.a.)", value: rentGap.marketERV || "", source: rentGap.ervSource || "" },
      { field: "Rent Gap %", value: rentGap.gapPct !== undefined ? `${rentGap.gapPct}%` : "", source: "" },
      { field: "NOI", value: returns.noi || "", source: "" },
      { field: "Cap Rate", value: returns.capRate ? `${returns.capRate}%` : "", source: "" },
      { field: "Cash-on-Cash", value: returns.cashOnCash ? `${returns.cashOnCash}%` : "", source: "" },
      { field: "IRR (5yr)", value: returns.irr5yr ? `${returns.irr5yr}%` : "", source: "" },
      { field: "Equity Multiple", value: returns.equityMultiple ? `${returns.equityMultiple}x` : "", source: "" },
      { field: "Equity Needed", value: returns.equityNeeded || "", source: "" },
      { field: "", value: "", source: "" },
      { field: "Market Cap Rate", value: market.capRate ? `${(market.capRate * 100).toFixed(1)}%` : "", source: "" },
      { field: "Market ERV (£/sqft)", value: market.ervPsf ? `£${market.ervPsf.toFixed(2)}` : "", source: "" },
      { field: "DSCR", value: market.dscr ? `${market.dscr}x` : "", source: "" },
    ];

    summaryRows.forEach((r) => summary.addRow(r));

    // Style header row
    summary.getRow(1).font = { bold: true };
    summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
    summary.getRow(1).font = { bold: true, color: { argb: "FFE4E4EC" } };

    // ── Sheet 2: Valuations ──
    if (valuations.incomeCap || valuations.psf || valuations.blended) {
      const valSheet = workbook.addWorksheet("Valuations");
      valSheet.columns = [
        { header: "Method", key: "method", width: 25 },
        { header: "Value (£)", key: "value", width: 20 },
        { header: "Details", key: "details", width: 35 },
      ];

      if (valuations.incomeCap) {
        valSheet.addRow({ method: "Income Capitalisation", value: valuations.incomeCap.value, details: `Cap rate: ${(valuations.incomeCap.capRate * 100).toFixed(1)}%` });
      }
      if (valuations.psf) {
        valSheet.addRow({ method: "Price per sqft", value: valuations.psf.value, details: `Range: £${valuations.psf.low?.toLocaleString()} – £${valuations.psf.high?.toLocaleString()}` });
      }
      if (valuations.blended?.value) {
        valSheet.addRow({ method: "Blended AVM", value: valuations.blended.value, details: valuations.blended.method });
      }

      valSheet.getRow(1).font = { bold: true };
    }

    // ── Sheet 3: Scenarios ──
    if (Array.isArray(scenarios) && scenarios.length > 0) {
      const scSheet = workbook.addWorksheet("Scenarios");
      scSheet.columns = [
        { header: "Scenario", key: "name", width: 20 },
        { header: "IRR %", key: "irr", width: 12 },
        { header: "Equity Multiple", key: "equityMultiple", width: 18 },
        { header: "Cash Yield %", key: "cashYield", width: 15 },
        { header: "NPV (£)", key: "npv", width: 18 },
      ];

      scenarios.forEach((sc: any) => {
        scSheet.addRow({
          name: sc.name,
          irr: sc.irr,
          equityMultiple: sc.equityMultiple,
          cashYield: sc.cashYield,
          npv: sc.npv,
        });
      });

      scSheet.getRow(1).font = { bold: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="model-${sanitizeFilename(deal.address)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[export/model]", error);
    return NextResponse.json({ error: "Failed to generate model" }, { status: 500 });
  }
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").slice(0, 60);
}
