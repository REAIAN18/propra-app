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
    const ra = ds.ricsAnalysis || {};
    const ai = ds.ai || {};

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
      { field: "Tenure", value: deal.tenure || ai.tenure || "", source: ai.tenureDetail ? "brochure" : "" },
      { field: "Year Built", value: deal.yearBuilt || "", source: assumptions.yearBuilt?.source || "" },
      { field: "Condition", value: ai.condition || "", source: ai.conditionDetail || "" },
      { field: "Source", value: deal.sourceTag || "", source: deal.sourceUrl || "" },
      { field: "Agent", value: ai.agentName || deal.brokerName || "", source: ai.agentType || "" },
      { field: "", value: "", source: "" },
      { field: "── INCOME ──", value: "", source: "" },
      { field: "Passing Rent (p.a.)", value: rentGap.passingRent || ai.totalPassingRent || "", source: rentGap.passingRentSource || "" },
      { field: "Market ERV (p.a.)", value: rentGap.marketERV || "", source: rentGap.ervSource || "" },
      { field: "ERV (£/sqft)", value: market.ervPsf ? `£${market.ervPsf.toFixed(2)}` : "", source: "market benchmark" },
      { field: "Rent Gap %", value: rentGap.gapPct !== undefined ? `${rentGap.gapPct}%` : "", source: rentGap.direction || "" },
      { field: "Occupancy %", value: deal.occupancyPct != null ? `${deal.occupancyPct}%` : "", source: assumptions.occupancy?.source || "" },
      { field: "NOI", value: returns.noi || assumptions.noi?.value || "", source: assumptions.noi?.source || "" },
      { field: "", value: "", source: "" },
      { field: "── RETURNS ──", value: "", source: "" },
      { field: "Cap Rate", value: returns.capRate ? `${returns.capRate}%` : "", source: "" },
      { field: "NIY", value: ra.returns?.netInitialYield ? `${ra.returns.netInitialYield.toFixed(1)}%` : "", source: "" },
      { field: "Stabilised Yield", value: ra.returns?.stabilisedYield ? `${ra.returns.stabilisedYield.toFixed(1)}%` : "", source: "" },
      { field: "Cash-on-Cash (Yr1)", value: ra.returns?.cashOnCashYear1 ? `${ra.returns.cashOnCashYear1.toFixed(1)}%` : returns.cashOnCash ? `${returns.cashOnCash}%` : "", source: "" },
      { field: "IRR (10yr)", value: ra.returns?.irr10yr ? `${ra.returns.irr10yr.toFixed(1)}%` : returns.irr5yr ? `${returns.irr5yr}%` : "", source: "" },
      { field: "Equity Multiple", value: ra.returns?.equityMultiple ? `${ra.returns.equityMultiple.toFixed(2)}x` : returns.equityMultiple ? `${returns.equityMultiple}x` : "", source: "" },
      { field: "DSCR", value: ra.returns?.dscr ? `${ra.returns.dscr.toFixed(2)}x` : market.dscr ? `${market.dscr}x` : "", source: "" },
      { field: "Equity Needed", value: returns.equityNeeded || "", source: "" },
      { field: "", value: "", source: "" },
      { field: "── FINANCING ASSUMPTIONS ──", value: "", source: "" },
      { field: "LTV", value: market.financing?.ltvPct ? `${(market.financing.ltvPct * 100).toFixed(0)}%` : "65%", source: "market benchmark" },
      { field: "Interest Rate", value: market.financing?.interestRate ? `${(market.financing.interestRate * 100).toFixed(2)}%` : "6.75%", source: "SONIA + margin estimate" },
      { field: "Loan Term", value: market.financing?.termYears ? `${market.financing.termYears} years` : "25 years", source: "market benchmark" },
      { field: "Annual Debt Service", value: market.annualDebtService || "", source: "calculated" },
      { field: "", value: "", source: "" },
      { field: "── MARKET BENCHMARKS ──", value: "", source: "" },
      { field: "Market Cap Rate", value: market.capRate ? `${(market.capRate * 100).toFixed(1)}%` : "", source: `${market.region || ""} ${market.assetType || ""}` },
      { field: "Region", value: market.region || "", source: "" },
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

    // ── Sheet 4: Assumptions Audit ──
    if (assumptions && Object.keys(assumptions).length > 0) {
      const assSheet = workbook.addWorksheet("Assumptions");
      assSheet.columns = [
        { header: "Parameter", key: "param", width: 25 },
        { header: "Value", key: "value", width: 25 },
        { header: "Source / Method", key: "source", width: 40 },
      ];

      Object.entries(assumptions).forEach(([key, val]: [string, any]) => {
        if (val?.value !== undefined) {
          assSheet.addRow({
            param: key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()),
            value: val.value,
            source: val.source || "",
          });
        }
      });

      assSheet.getRow(1).font = { bold: true };
      assSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
      assSheet.getRow(1).font = { bold: true, color: { argb: "FFE4E4EC" } };
    }

    // ── Sheet 5: Sensitivity (RICS) ──
    if (ra.sensitivity && Array.isArray(ra.sensitivity) && ra.sensitivity.length > 0) {
      const sensSheet = workbook.addWorksheet("Sensitivity");
      sensSheet.columns = [
        { header: "Scenario", key: "scenario", width: 20 },
        { header: "Void (months)", key: "void", width: 15 },
        { header: "Rent", key: "rent", width: 18 },
        { header: "CAPEX", key: "capex", width: 18 },
        { header: "IRR", key: "irr", width: 12 },
        { header: "Verdict", key: "verdict", width: 18 },
      ];

      ra.sensitivity.forEach((row: any) => {
        sensSheet.addRow({
          scenario: row.scenario,
          void: row.voidMonths,
          rent: row.rent,
          capex: row.capex,
          irr: row.irr,
          verdict: row.verdict,
        });
      });

      sensSheet.getRow(1).font = { bold: true };
    }

    // ── Sheet 6: Tenancy Schedule ──
    const accommodation = ai.accommodation;
    if (Array.isArray(accommodation) && accommodation.length > 0) {
      const tenSheet = workbook.addWorksheet("Tenancy Schedule");
      tenSheet.columns = [
        { header: "Unit", key: "unit", width: 25 },
        { header: "Tenant", key: "tenant", width: 30 },
        { header: "Size (sqft)", key: "size", width: 15 },
        { header: "Rent (p.a.)", key: "rent", width: 15 },
        { header: "Lease End", key: "leaseEnd", width: 15 },
        { header: "Break Date", key: "breakDate", width: 15 },
        { header: "Review", key: "review", width: 20 },
      ];

      accommodation.forEach((a: any, i: number) => {
        tenSheet.addRow({
          unit: a.unit || `Unit ${i + 1}`,
          tenant: a.tenant || "",
          size: a.size_sqft || "",
          rent: a.rent || "",
          leaseEnd: a.leaseEnd || "",
          breakDate: a.breakDate || "",
          review: a.rentReviewType || a.rentReview || "",
        });
      });

      // Totals row
      const totalRent = accommodation.reduce((s: number, a: any) => s + (a.rent || 0), 0);
      const totalSqft = accommodation.reduce((s: number, a: any) => s + (a.size_sqft || 0), 0);
      if (totalRent > 0 || totalSqft > 0) {
        tenSheet.addRow({ unit: "TOTAL", tenant: "", size: totalSqft || "", rent: totalRent || "", leaseEnd: "", breakDate: "", review: "" });
        const lastRow = tenSheet.lastRow;
        if (lastRow) lastRow.font = { bold: true };
      }

      tenSheet.getRow(1).font = { bold: true };
      tenSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
      tenSheet.getRow(1).font = { bold: true, color: { argb: "FFE4E4EC" } };
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
