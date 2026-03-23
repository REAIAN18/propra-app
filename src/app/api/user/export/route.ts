/**
 * GET /api/user/export?type=noi|dcf|hold-sell|lease-schedule|insurance
 *
 * Generates and streams an Excel (.xlsx) workbook for the requested export type.
 * All data sourced from the authenticated user's real database records.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import {
  calculateHoldScenario,
  calculateSellScenario,
  deriveRecommendation,
  defaultHoldInputs,
  defaultSellInputs,
} from "@/lib/hold-sell-model";
import { getFallbackCapRate } from "@/lib/avm";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0A8A4C" }, // RealHQ green
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF0A8A4C" } },
    };
  });
  row.height = 22;
}

function pct(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "";
  return `${(v * 100).toFixed(1)}%`;
}

function currency(v: number | null | undefined, sym = "£") {
  if (v == null) return "";
  return `${sym}${Math.round(v).toLocaleString()}`;
}

function dateStr(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

async function buildWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RealHQ";
  wb.created = new Date();
  return wb;
}

// ---------------------------------------------------------------------------
// NOI Model export
// ---------------------------------------------------------------------------
async function exportNOI(userId: string): Promise<ExcelJS.Workbook> {
  const wb = await buildWorkbook();
  const ws = wb.addWorksheet("NOI Model");

  const assets = await prisma.userAsset.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  // Columns
  ws.columns = [
    { key: "name",          header: "Property",           width: 28 },
    { key: "type",          header: "Type",               width: 14 },
    { key: "location",      header: "Location",           width: 22 },
    { key: "sqft",          header: "Sq Ft",              width: 10 },
    { key: "grossIncome",   header: "Gross Income",       width: 15 },
    { key: "insuranceCost", header: "Insurance",          width: 13 },
    { key: "energyCost",    header: "Energy",             width: 13 },
    { key: "opex",          header: "Other OpEx (est.)",  width: 16 },
    { key: "totalCosts",    header: "Total Costs",        width: 14 },
    { key: "noi",           header: "NOI",                width: 14 },
    { key: "noiMargin",     header: "NOI Margin",         width: 13 },
    { key: "occupancy",     header: "Occupancy",          width: 12 },
  ];

  const headerRow = ws.getRow(1);
  styleHeader(headerRow);

  let totalGross = 0, totalCosts = 0, totalNOI = 0;
  const sym = assets.some((a) => a.country !== "UK") ? "$" : "£";

  for (const asset of assets) {
    const gross      = asset.grossIncome ?? 0;
    const insurance  = asset.insurancePremium ?? 0;
    const energy     = asset.energyCost ?? 0;
    // Estimate other opex at 10% of gross if not otherwise captured
    const otherOpex  = Math.max(0, (asset.netIncome != null)
      ? gross - insurance - energy - (asset.netIncome)
      : gross * 0.10);
    const costs      = insurance + energy + otherOpex;
    const noi        = asset.netIncome ?? (gross - costs);
    const margin     = gross > 0 ? noi / gross : 0;

    totalGross += gross;
    totalCosts += costs;
    totalNOI   += noi;

    const row = ws.addRow({
      name:          asset.name,
      type:          asset.assetType ?? "mixed",
      location:      asset.location,
      sqft:          asset.sqft ?? 0,
      grossIncome:   gross,
      insuranceCost: insurance,
      energyCost:    energy,
      opex:          otherOpex,
      totalCosts:    costs,
      noi,
      noiMargin:     margin,
      occupancy:     (asset.occupancy ?? 95) / 100,
    });

    // Format currency cells
    ["grossIncome","insuranceCost","energyCost","opex","totalCosts","noi"].forEach(k => {
      const cell = row.getCell(k);
      cell.numFmt = `"${sym}"#,##0`;
    });
    row.getCell("noiMargin").numFmt = "0.0%";
    row.getCell("occupancy").numFmt = "0%";
  }

  // Portfolio totals row
  if (assets.length > 1) {
    const totalRow = ws.addRow({
      name: "PORTFOLIO TOTAL",
      grossIncome: totalGross,
      totalCosts,
      noi: totalNOI,
      noiMargin: totalGross > 0 ? totalNOI / totalGross : 0,
    });
    totalRow.font = { bold: true };
    ["grossIncome","totalCosts","noi"].forEach(k => {
      totalRow.getCell(k).numFmt = `"${sym}"#,##0`;
    });
    totalRow.getCell("noiMargin").numFmt = "0.0%";
    totalRow.fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FFE8F5EE" },
    };
  }

  ws.autoFilter = { from: "A1", to: "L1" };
  return wb;
}

// ---------------------------------------------------------------------------
// Acquisition DCF export
// ---------------------------------------------------------------------------
async function exportDCF(userId: string): Promise<ExcelJS.Workbook> {
  const wb = await buildWorkbook();

  const acquisitions = await prisma.acquisition.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // One sheet per deal (or all on one sheet with spacer rows for small portfolios)
  const summaryWs = wb.addWorksheet("DCF Summary");
  summaryWs.columns = [
    { key: "name",         header: "Deal",              width: 28 },
    { key: "location",     header: "Location",          width: 22 },
    { key: "type",         header: "Type",              width: 14 },
    { key: "askingPrice",  header: "Asking Price",      width: 14 },
    { key: "noi",          header: "NOI",               width: 13 },
    { key: "yield",        header: "Entry Yield",       width: 13 },
    { key: "marketYield",  header: "Market Yield",      width: 13 },
    { key: "irr5yr",       header: "5yr IRR",           width: 10 },
    { key: "exitValue",    header: "Exit Value (5yr)",  width: 15 },
    { key: "status",       header: "Status",            width: 14 },
  ];
  styleHeader(summaryWs.getRow(1));

  for (const deal of acquisitions) {
    const sym = deal.currency === "GBP" ? "£" : "$";
    const noi = deal.noi ?? deal.askingPrice * deal.estimatedYield;
    const marketYield = deal.marketYield ?? deal.estimatedYield;

    // Simple 5yr DCF: buy at asking price, receive NOI growing at 2.5%/yr,
    // sell at year 5 at market yield
    const YEARS = 5;
    const g = 0.025;
    const cashFlows: number[] = [-deal.askingPrice];
    for (let y = 1; y <= YEARS; y++) {
      const noiY = noi * Math.pow(1 + g, y - 1);
      if (y < YEARS) {
        cashFlows.push(noiY);
      } else {
        const exitValue = noiY / marketYield;
        cashFlows.push(noiY + exitValue);
      }
    }

    // IRR by Newton-Raphson
    let irr = 0.1;
    for (let i = 0; i < 100; i++) {
      let f = 0, df = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        f  += cashFlows[t] / Math.pow(1 + irr, t);
        df -= t * cashFlows[t] / Math.pow(1 + irr, t + 1);
      }
      if (Math.abs(df) < 1e-12) break;
      const newIrr = irr - f / df;
      if (Math.abs(newIrr - irr) < 1e-8) { irr = newIrr; break; }
      irr = newIrr;
    }

    const exitValue = (noi * Math.pow(1 + g, YEARS - 1)) / marketYield;

    const row = summaryWs.addRow({
      name:        deal.name,
      location:    deal.location,
      type:        deal.assetType,
      askingPrice: deal.askingPrice,
      noi,
      yield:       deal.estimatedYield,
      marketYield,
      irr5yr:      isNaN(irr) ? null : irr,
      exitValue,
      status:      deal.status,
    });

    row.getCell("askingPrice").numFmt = `"${sym}"#,##0`;
    row.getCell("noi").numFmt         = `"${sym}"#,##0`;
    row.getCell("exitValue").numFmt   = `"${sym}"#,##0`;
    row.getCell("yield").numFmt       = "0.0%";
    row.getCell("marketYield").numFmt = "0.0%";
    row.getCell("irr5yr").numFmt      = "0.0%";

    // Detailed cashflow tab per deal
    const dealWs = wb.addWorksheet(deal.name.slice(0, 31));
    dealWs.addRow(["Deal:", deal.name]);
    dealWs.addRow(["Location:", deal.location]);
    dealWs.addRow(["Asking Price:", deal.askingPrice]);
    dealWs.addRow(["Entry NOI:", noi]);
    dealWs.addRow(["Entry Yield:", `${(deal.estimatedYield * 100).toFixed(1)}%`]);
    dealWs.addRow([]);
    const cfHeader = dealWs.addRow(["Year", "NOI", "Exit Value", "Total Cash Flow", "Discounted CF (8%)"]);
    styleHeader(cfHeader);

    const disc = 0.08;
    cashFlows.forEach((cf, idx) => {
      const noi_y = idx === 0 ? 0 : noi * Math.pow(1 + g, idx - 1);
      const exit_y = idx === YEARS ? exitValue : 0;
      const discCf = cf / Math.pow(1 + disc, idx);
      const cfRow = dealWs.addRow([
        idx === 0 ? "Acquisition" : `Year ${idx}`,
        idx === 0 ? null : noi_y,
        idx === 0 ? null : (exit_y || null),
        cf,
        discCf,
      ]);
      [2,3,4,5].forEach(colIdx => {
        const cell = cfRow.getCell(colIdx);
        if (cell.value != null) cell.numFmt = `"${sym}"#,##0`;
      });
    });
    dealWs.addRow([]);
    const irrRow = dealWs.addRow(["5yr IRR:", isNaN(irr) ? "—" : `${(irr * 100).toFixed(1)}%`]);
    irrRow.font = { bold: true };
    dealWs.columns = [
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 18 },
    ];
  }

  summaryWs.autoFilter = { from: "A1", to: "J1" };
  return wb;
}

// ---------------------------------------------------------------------------
// Hold vs Sell export
// ---------------------------------------------------------------------------
async function exportHoldSell(userId: string): Promise<ExcelJS.Workbook> {
  const wb = await buildWorkbook();
  const ws = wb.addWorksheet("Hold vs Sell");

  ws.columns = [
    { key: "assetName",         header: "Property",            width: 28 },
    { key: "currentValue",      header: "Estimated Value",     width: 16 },
    { key: "recommendation",    header: "Recommendation",      width: 16 },
    { key: "holdIRR",           header: "Hold IRR (10yr)",     width: 16 },
    { key: "holdNPV",           header: "Hold NPV",            width: 14 },
    { key: "holdMultiple",      header: "Hold Equity Multiple",width: 18 },
    { key: "sellPrice",         header: "Est. Sale Price",     width: 16 },
    { key: "netProceeds",       header: "Net Proceeds",        width: 14 },
    { key: "sellIRR",           header: "Sell + Redeploy IRR", width: 18 },
    { key: "sellNPV",           header: "Redeploy NPV",        width: 14 },
    { key: "confidence",        header: "Confidence",          width: 12 },
    { key: "rationale",         header: "Rationale",           width: 50 },
  ];

  styleHeader(ws.getRow(1));

  const assets = await prisma.userAsset.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const sym = assets.some((a) => a.country !== "UK") ? "$" : "£";

  for (const asset of assets) {
    // Derive current value from income cap — avmValue is a Wave 2 field, not yet migrated
    const currentValue =
      (asset.netIncome && asset.marketCapRate
        ? asset.netIncome / asset.marketCapRate
        : null) ??
      (asset.grossIncome && asset.marketCapRate
        ? (asset.grossIncome * 0.75) / asset.marketCapRate
        : null);

    const passingRent = asset.passingRent ?? asset.grossIncome ?? null;
    const marketERV =
      asset.marketRentSqft && asset.sqft
        ? asset.marketRentSqft * asset.sqft
        : passingRent;

    if (!currentValue || !passingRent) {
      ws.addRow({
        assetName:    asset.name,
        currentValue: null,
        recommendation: "Insufficient data",
        rationale: "Add annual rent and cap rate to generate analysis.",
      });
      continue;
    }

    // Always recalculate (holdSellScenario is a Wave 2 model, not yet migrated)
    let holdIRR: number, holdNPV: number, holdMultiple: number;
    let sellIRR: number, sellNPV: number, netProceeds: number, sellPrice: number;
    let recommendation: string, rationale: string, confidence: number;

    {
      const holdInputs = defaultHoldInputs(
        currentValue, passingRent, marketERV ?? passingRent,
        asset.assetType, asset.country
      );
      const sellInputs = defaultSellInputs(currentValue, holdInputs.holdPeriodYears);
      const holdResult = calculateHoldScenario(holdInputs);
      const sellResult = calculateSellScenario(sellInputs);
      const rec = deriveRecommendation(holdResult, sellResult, {
        marketCapRate: asset.marketCapRate,
        passingRent,
        netIncome: asset.netIncome,
      });

      holdIRR    = holdResult.irr;
      holdNPV    = holdResult.npv;
      holdMultiple = holdResult.equityMultiple;
      sellPrice  = sellInputs.estimatedSalePrice;
      netProceeds = sellResult.netProceeds;
      sellIRR    = sellResult.irr;
      sellNPV    = sellResult.redeployedNPV;
      recommendation = rec.recommendation;
      rationale      = rec.rationale;
      confidence     = rec.confidenceScore;
    }

    const row = ws.addRow({
      assetName:     asset.name,
      currentValue,
      recommendation: recommendation.toUpperCase(),
      holdIRR:       isNaN(holdIRR) ? null : holdIRR,
      holdNPV,
      holdMultiple:  isNaN(holdMultiple) ? null : holdMultiple,
      sellPrice,
      netProceeds,
      sellIRR:       isNaN(sellIRR) ? null : sellIRR,
      sellNPV,
      confidence,
      rationale,
    });

    ["currentValue","holdNPV","sellPrice","netProceeds","sellNPV"].forEach(k => {
      row.getCell(k).numFmt = `"${sym}"#,##0`;
    });
    ["holdIRR","sellIRR"].forEach(k => {
      row.getCell(k).numFmt = "0.0%";
    });
    ["holdMultiple"].forEach(k => {
      row.getCell(k).numFmt = "0.00x";
    });
    row.getCell("confidence").numFmt = "0%";

    // Colour recommendation cell
    const recCell = row.getCell("recommendation");
    if (recommendation === "hold") {
      recCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5EE" } };
      recCell.font = { bold: true, color: { argb: "FF0A8A4C" } };
    } else if (recommendation === "sell") {
      recCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
      recCell.font = { bold: true, color: { argb: "FF856404" } };
    }
  }

  ws.autoFilter = { from: "A1", to: "L1" };
  return wb;
}

// ---------------------------------------------------------------------------
// Lease schedule export
// ---------------------------------------------------------------------------
async function exportLeaseSchedule(userId: string): Promise<ExcelJS.Workbook> {
  const wb = await buildWorkbook();
  const ws = wb.addWorksheet("Lease Schedule");

  ws.columns = [
    { key: "property",      header: "Property",           width: 28 },
    { key: "tenant",        header: "Tenant",             width: 22 },
    { key: "sector",        header: "Sector",             width: 14 },
    { key: "sqft",          header: "Sq Ft",              width: 10 },
    { key: "annualRent",    header: "Annual Rent",        width: 14 },
    { key: "rentPerSqft",   header: "£/$ per Sq Ft",      width: 13 },
    { key: "startDate",     header: "Lease Start",        width: 13 },
    { key: "expiryDate",    header: "Expiry",             width: 12 },
    { key: "breakDate",     header: "Break",              width: 12 },
    { key: "reviewDate",    header: "Review",             width: 12 },
    { key: "daysToExpiry",  header: "Days to Expiry",     width: 15 },
    { key: "leaseStatus",   header: "Status",             width: 14 },
    { key: "covenantGrade", header: "Covenant Grade",     width: 15 },
    { key: "currency",      header: "Currency",           width: 10 },
  ];

  styleHeader(ws.getRow(1));

  // Lease is a Wave 2 model — guard against missing migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leasePrisma = (prisma as any).lease;
  const leases: Array<{
    id: string; sqft: number; passingRent: number; currency: string | null;
    rentPerSqft: number | null; startDate: Date | null; expiryDate: Date | null;
    breakDate: Date | null; reviewDate: Date | null;
    tenant: { name: string; sector: string | null; covenantGrade: string | null } | null;
    asset: { name: string } | null;
  }> = leasePrisma
    ? await leasePrisma.findMany({
        where: { userId },
        include: {
          tenant: { select: { name: true, sector: true, covenantGrade: true } },
          asset: { select: { name: true } },
        },
        orderBy: { expiryDate: "asc" },
      }).catch(() => [])
    : [];

  if (leases.length === 0) {
    ws.addRow({ property: "No lease data available. Upload lease PDFs to generate this report." });
  }

  const today = new Date();

  for (const lease of leases) {
    const daysToExpiry = lease.expiryDate
      ? Math.floor((lease.expiryDate.getTime() - today.getTime()) / 86_400_000)
      : null;

    let leaseStatus = "current";
    if (daysToExpiry != null) {
      if (daysToExpiry < 0)   leaseStatus = "expired";
      else if (daysToExpiry < 180) leaseStatus = "expiring_soon";
    }

    const sym = (lease.currency ?? "GBP") === "GBP" ? "£" : "$";

    const row = ws.addRow({
      property:      lease.asset?.name ?? "",
      tenant:        lease.tenant?.name ?? "",
      sector:        lease.tenant?.sector ?? "",
      sqft:          lease.sqft,
      annualRent:    lease.passingRent,
      rentPerSqft:   lease.rentPerSqft ?? 0,
      startDate:     dateStr(lease.startDate),
      expiryDate:    dateStr(lease.expiryDate),
      breakDate:     dateStr(lease.breakDate),
      reviewDate:    dateStr(lease.reviewDate),
      daysToExpiry,
      leaseStatus:   leaseStatus.replace("_", " ").toUpperCase(),
      covenantGrade: (lease.tenant?.covenantGrade ?? "unknown").toUpperCase(),
      currency:      lease.currency ?? "GBP",
    });

    row.getCell("annualRent").numFmt  = `"${sym}"#,##0`;
    row.getCell("rentPerSqft").numFmt = `"${sym}"0.00`;

    // Highlight expiring leases
    if (leaseStatus === "expiring_soon") {
      row.getCell("leaseStatus").fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" },
      };
    } else if (leaseStatus === "expired") {
      row.getCell("leaseStatus").fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" },
      };
    }
  }

  ws.autoFilter = { from: "A1", to: "N1" };
  return wb;
}

// ---------------------------------------------------------------------------
// Insurance schedule export
// ---------------------------------------------------------------------------
async function exportInsurance(userId: string): Promise<ExcelJS.Workbook> {
  const wb = await buildWorkbook();
  const ws = wb.addWorksheet("Insurance Schedule");

  ws.columns = [
    { key: "property",        header: "Property",             width: 28 },
    { key: "carrier",         header: "Carrier",              width: 18 },
    { key: "policyType",      header: "Policy Type",          width: 16 },
    { key: "currentPremium",  header: "Current Premium",      width: 16 },
    { key: "quotedPremium",   header: "Best Quote",           width: 14 },
    { key: "annualSaving",    header: "Annual Saving",        width: 14 },
    { key: "status",          header: "Status",               width: 12 },
    { key: "dataSource",      header: "Data Source",          width: 14 },
    { key: "expiresAt",       header: "Quote Expires",        width: 14 },
    { key: "createdAt",       header: "Date",                 width: 12 },
  ];

  styleHeader(ws.getRow(1));

  const quotes = await prisma.insuranceQuote.findMany({
    where: { userId },
    include: { asset: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  for (const q of quotes) {
    const row = ws.addRow({
      property:       q.asset?.name ?? "Portfolio",
      carrier:        q.carrier,
      policyType:     q.policyType ?? "Commercial",
      currentPremium: q.currentPremium,
      quotedPremium:  q.quotedPremium,
      annualSaving:   q.annualSaving,
      status:         q.status.toUpperCase(),
      dataSource:     q.dataSource === "live_api" ? "Live API" : "Benchmark",
      expiresAt:      dateStr(q.expiresAt),
      createdAt:      dateStr(q.createdAt),
    });

    ["currentPremium","quotedPremium","annualSaving"].forEach(k => {
      const cell = row.getCell(k);
      if (cell.value != null) cell.numFmt = '"£"#,##0';
    });

    if (q.status === "bound") {
      row.getCell("status").fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5EE" },
      };
    }
  }

  // Summary: total saving
  const totalSaving = quotes.reduce((s, q) => s + (q.annualSaving ?? 0), 0);
  if (quotes.length > 0) {
    ws.addRow([]);
    const sumRow = ws.addRow({
      property: "TOTAL ANNUAL SAVING",
      annualSaving: totalSaving,
    });
    sumRow.font = { bold: true };
    sumRow.getCell("annualSaving").numFmt = '"£"#,##0';
  }

  ws.autoFilter = { from: "A1", to: "J1" };
  return wb;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "noi";
  const userId = session.user.id;

  const exportMap: Record<string, () => Promise<ExcelJS.Workbook>> = {
    "noi":            () => exportNOI(userId),
    "dcf":            () => exportDCF(userId),
    "hold-sell":      () => exportHoldSell(userId),
    "lease-schedule": () => exportLeaseSchedule(userId),
    "insurance":      () => exportInsurance(userId),
  };

  const fn = exportMap[type];
  if (!fn) {
    return NextResponse.json(
      { error: `Unknown export type "${type}". Valid: noi, dcf, hold-sell, lease-schedule, insurance` },
      { status: 400 }
    );
  }

  const filenameMap: Record<string, string> = {
    "noi":            "realhq-noi-model.xlsx",
    "dcf":            "realhq-acquisition-dcf.xlsx",
    "hold-sell":      "realhq-hold-vs-sell.xlsx",
    "lease-schedule": "realhq-lease-schedule.xlsx",
    "insurance":      "realhq-insurance-schedule.xlsx",
  };

  try {
    const wb = await fn();
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameMap[type]}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export] Error generating workbook:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
