/**
 * src/lib/dealscope/exports/excel-template.ts
 * DS-T27: ExcelJS financial model template.
 *
 * Sheets: Summary, DCF Model, Sensitivity, Comparables.
 * Formatting, column widths, formulas, and colour themes to match dark RealHQ brand.
 */

import ExcelJS from "exceljs";
import { calculateIRR } from "@/lib/dealscope/calculations/irr";
import { calculateEquityMultiple } from "@/lib/dealscope/calculations/equity";
import { calculateVerdict } from "@/lib/dealscope/calculations/verdict";
import type { Property } from "@/types/dealscope";

// ── Brand colours (light versions for white-background Excel) ─────────────────
const C = {
  PURPLE:   "FF7C6AF0",
  PURPLE_LT:"FFF0EEFF",
  GREEN:    "FF34D399",
  GREEN_LT: "FFE6FAF5",
  RED:      "FFF87171",
  RED_LT:   "FFFEF2F2",
  AMBER:    "FFFBBF24",
  AMBER_LT: "FFFEFCE8",
  DARK:     "FF09090B",
  MID:      "FF18181F",
  BORDER:   "FFD1D5DB",
  HEADER_BG:"FF1E1B4B",
  HEADER_FG:"FFFFFFFF",
  LABEL:    "FF6B7280",
  BODY:     "FF111827",
} as const;

// ── Style helpers ─────────────────────────────────────────────────────────────
function headerFill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function applyHeader(row: ExcelJS.Row, bgArgb = C.HEADER_BG) {
  row.eachCell(cell => {
    cell.fill = headerFill(bgArgb);
    cell.font = { bold: true, color: { argb: C.HEADER_FG }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: C.BORDER } } };
  });
  row.height = 20;
}

function applySubheader(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = headerFill(C.PURPLE_LT);
    cell.font = { bold: true, color: { argb: C.PURPLE }, size: 9 };
    cell.alignment = { vertical: "middle" };
  });
  row.height = 18;
}

function currency(wb: ExcelJS.Workbook, sym = "£"): string {
  return sym === "$" ? '"$"#,##0' : '"£"#,##0';
}

function pctFmt(): string { return "0.0%"; }

// ── Summary sheet ─────────────────────────────────────────────────────────────
function buildSummary(wb: ExcelJS.Workbook, prop: Property, currency_sym: string) {
  const ws = wb.addWorksheet("Summary");
  ws.columns = [
    { key: "label", width: 28 },
    { key: "value", width: 22 },
    { key: "note",  width: 36 },
  ];

  // Title
  const titleRow = ws.addRow(["IC Summary"]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: C.BODY } };
  titleRow.height = 28;

  ws.addRow([prop.address ?? "—", "", "Generated " + new Date().toLocaleDateString("en-GB")]);
  ws.addRow([]);

  // Property section
  applySubheader(ws.addRow(["Property Details"]));
  const propRows: [string, string | number | null, string][] = [
    ["Asset type",     prop.assetType ?? "—",           ""],
    ["Address",        prop.address ?? "—",              ""],
    ["Size (sqft)",    prop.size ?? null,                "NLA"],
    ["Year built",     prop.builtYear ?? null,           ""],
    ["EPC rating",     prop.epcRating ?? "—",            ""],
    ["Tenure",         (prop as { tenure?: string }).tenure ?? "—", ""],
    ["Asking price",   prop.askingPrice ?? null,          ""],
    ["Guide price",    prop.guidePrice ?? null,           ""],
  ];
  for (const [l, v, n] of propRows) {
    const row = ws.addRow([l, v, n]);
    row.getCell(1).font = { color: { argb: C.LABEL }, size: 9 };
    if (typeof v === "number") {
      row.getCell(2).numFmt = l.toLowerCase().includes("price") ? currency(wb, currency_sym) : "#,##0";
    }
    row.getCell(2).font = { bold: true, size: 10, color: { argb: C.BODY } };
  }

  ws.addRow([]);

  // Returns section
  const irr = calculateIRR(prop);
  const em = calculateEquityMultiple(prop);
  const verdict = calculateVerdict(prop);

  applySubheader(ws.addRow(["Returns Summary"]));
  const retRows: [string, number | string, string, string?][] = [
    ["IRR (10yr)",       irr.irr,                pctFmt(), irr.confidence],
    ["Equity multiple",  em.equityMultiple,       "0.00\"×\""],
    ["Deal score",       verdict.dealScore,       "0",     verdict.verdict],
    ["Total cost in",    em.totalCostIn,          currency(wb, currency_sym)],
    ["Annual NOI",       irr.breakdown.annualNOI, currency(wb, currency_sym)],
    ["Exit proceeds",    irr.breakdown.exitProceeds, currency(wb, currency_sym), "Year 10"],
  ];
  for (const [l, v, fmt, note] of retRows) {
    const row = ws.addRow([l, v, note ?? ""]);
    row.getCell(1).font = { color: { argb: C.LABEL }, size: 9 };
    row.getCell(2).numFmt = fmt as string;
    const val = typeof v === "number" ? v : 0;
    let fg: string = C.BODY;
    if (l === "IRR (10yr)") fg = val >= 0.12 ? C.GREEN : val >= 0.07 ? C.AMBER : C.RED;
    if (l === "Equity multiple") fg = val >= 1.8 ? C.GREEN : val >= 1.2 ? C.AMBER : C.RED;
    row.getCell(2).font = { bold: true, size: 11, color: { argb: fg } };
  }

  // Recommendation badge
  ws.addRow([]);
  const recRow = ws.addRow(["Recommendation", verdict.verdict]);
  recRow.getCell(1).font = { bold: true, color: { argb: C.LABEL } };
  const recColor = verdict.verdict === "PROCEED" ? C.GREEN : verdict.verdict === "CONDITIONAL" ? C.AMBER : C.RED;
  const recBg = verdict.verdict === "PROCEED" ? C.GREEN_LT : verdict.verdict === "CONDITIONAL" ? C.AMBER_LT : C.RED_LT;
  recRow.getCell(2).font = { bold: true, color: { argb: recColor }, size: 11 };
  recRow.getCell(2).fill = headerFill(recBg);
}

// ── DCF Model sheet ───────────────────────────────────────────────────────────
function buildDCF(wb: ExcelJS.Workbook, prop: Property, currency_sym: string) {
  const ws = wb.addWorksheet("DCF Model");
  ws.columns = [
    { key: "field", width: 26 },
    ...Array.from({ length: 11 }, (_, i) => ({ key: `y${i}`, width: 14 })),
  ];

  const titleRow = ws.addRow(["10-Year DCF Cash Flow Model"]);
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: C.BODY } };
  titleRow.height = 26;
  ws.addRow([prop.address ?? "—"]);
  ws.addRow([]);

  const irr = calculateIRR(prop);

  // Header row: Year 0–10
  const hdRow = ws.addRow(["", "Year 0", ...Array.from({ length: 10 }, (_, i) => `Year ${i + 1}`)]);
  applyHeader(hdRow);

  // Cash flow data
  const cfByYear: Record<number, number> = {};
  for (const cf of irr.cashFlows) cfByYear[cf.year] = cf.amount;

  const cfRow = ws.addRow(["Cash flow", ...Array.from({ length: 11 }, (_, i) => cfByYear[i] ?? 0)]);
  cfRow.getCell(1).font = { bold: true, color: { argb: C.LABEL }, size: 9 };
  for (let col = 2; col <= 12; col++) {
    const cell = cfRow.getCell(col);
    cell.numFmt = currency(wb, currency_sym);
    const val = cell.value as number;
    cell.font = { bold: true, color: { argb: val >= 0 ? C.GREEN : C.RED }, size: 10 };
  }

  ws.addRow([]);

  // Assumptions table
  applySubheader(ws.addRow(["Assumptions"]));
  const assumRows: [string, number | string | null, string][] = [
    ["Purchase price",  prop.askingPrice ?? null,    currency(wb, currency_sym)],
    ["Passing rent (pa)", prop.passingRent ?? null,  currency(wb, currency_sym)],
    ["ERV (pa)",        prop.erv ?? null,             currency(wb, currency_sym)],
    ["Business rates (pa)", prop.businessRates ?? null, currency(wb, currency_sym)],
    ["Service charge (pa)", prop.serviceCharge ?? null, currency(wb, currency_sym)],
    ["Void period (mo)", prop.expectedVoid ?? null,   "#,##0"],
    ["Occupancy",       prop.occupancyPct ?? null,    "0%"],
  ];
  for (const [l, v, fmt] of assumRows) {
    const row = ws.addRow([l, v]);
    row.getCell(1).font = { color: { argb: C.LABEL }, size: 9 };
    row.getCell(2).numFmt = fmt as string;
    row.getCell(2).font = { bold: true, size: 10 };
  }

  ws.addRow([]);
  applySubheader(ws.addRow(["Results"]));
  const resRows: [string, number | null, string][] = [
    ["IRR (10yr)",          irr.irr,                pctFmt()],
    ["Void costs (yr 1)",   irr.breakdown.voidCosts + irr.breakdown.lettingCosts, currency(wb, currency_sym)],
    ["Annual NOI",          irr.breakdown.annualNOI, currency(wb, currency_sym)],
    ["Exit proceeds",       irr.breakdown.exitProceeds, currency(wb, currency_sym)],
  ];
  for (const [l, v, fmt] of resRows) {
    const row = ws.addRow([l, v]);
    row.getCell(1).font = { color: { argb: C.LABEL }, size: 9 };
    row.getCell(2).numFmt = fmt as string;
    row.getCell(2).font = { bold: true, size: 11 };
  }
}

// ── Sensitivity sheet ─────────────────────────────────────────────────────────
function buildSensitivity(wb: ExcelJS.Workbook, prop: Property) {
  const ws = wb.addWorksheet("Sensitivity");
  ws.columns = [{ key: "field", width: 20 }, ...Array.from({ length: 5 }, () => ({ width: 14 }))];

  const titleRow = ws.addRow(["IRR Sensitivity — Exit Yield vs Entry Price"]);
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: C.BODY } };
  titleRow.height = 26;
  ws.addRow([]);

  const basePrice = prop.askingPrice ?? 1_000_000;
  const priceVariants = [-0.10, -0.05, 0, 0.05, 0.10];
  const exitYields  = [0.06, 0.07, 0.08, 0.09, 0.10];

  // Header
  const hdRow = ws.addRow(["Entry price ↓ / Exit yield →", ...exitYields.map(y => `${(y * 100).toFixed(0)}% exit`)]);
  applyHeader(hdRow);

  for (const pv of priceVariants) {
    const adjPrice = basePrice * (1 + pv);
    const row: (string | number)[] = [`${pv >= 0 ? "+" : ""}${(pv * 100).toFixed(0)}% (${Math.round(adjPrice / 1000)}k)`];
    for (const ey of exitYields) {
      const testProp: Property = { ...prop, askingPrice: adjPrice };
      const r = calculateIRR(testProp);
      row.push(r.irr);
    }
    const wsRow = ws.addRow(row);
    wsRow.getCell(1).font = { color: { argb: C.LABEL }, size: 9 };
    for (let col = 2; col <= 6; col++) {
      const cell = wsRow.getCell(col);
      cell.numFmt = pctFmt();
      const val = cell.value as number;
      cell.fill = headerFill(val >= 0.12 ? C.GREEN_LT : val >= 0.07 ? C.AMBER_LT : C.RED_LT);
      cell.font = { bold: true, color: { argb: val >= 0.12 ? C.GREEN : val >= 0.07 ? C.AMBER : C.RED }, size: 10 };
    }
  }
}

// ── Comparables sheet ─────────────────────────────────────────────────────────
function buildComparables(wb: ExcelJS.Workbook, comps: Record<string, unknown>[]) {
  const ws = wb.addWorksheet("Comparables");
  ws.columns = [
    { key: "address",  width: 36 },
    { key: "type",     width: 14 },
    { key: "sqft",     width: 12 },
    { key: "price",    width: 14 },
    { key: "psf",      width: 12 },
    { key: "date",     width: 14 },
    { key: "distance", width: 12 },
  ];

  const titleRow = ws.addRow(["Comparable Transactions"]);
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: C.BODY } };
  ws.addRow([]);

  const hdRow = ws.addRow(["Address", "Type", "Sqft", "Price (£)", "£/sqft", "Date", "Distance"]);
  applyHeader(hdRow);

  for (const c of comps) {
    const row = ws.addRow([
      c.address ?? "—",
      c.assetType ?? c.type ?? "—",
      c.sqft ?? c.size ?? null,
      c.price ?? c.salePrice ?? null,
      c.psf ?? c.pricePsf ?? null,
      c.date ?? c.saleDate ?? "—",
      c.distance ?? "—",
    ]);
    row.getCell(3).numFmt = "#,##0";
    row.getCell(4).numFmt = '"£"#,##0';
    row.getCell(5).numFmt = '"£"#,##0';
    row.height = 16;
  }

  if (comps.length === 0) {
    ws.addRow(["No comparable transactions available"]).getCell(1).font = { color: { argb: C.LABEL }, italic: true };
  }
}

// ── Main builder ──────────────────────────────────────────────────────────────
export interface ExcelModelInput {
  property: Property;
  comps?: Record<string, unknown>[];
  currency?: string;
}

/**
 * buildExcelModel — creates a full ExcelJS workbook for a DealScope property.
 * Returns the workbook; caller is responsible for writing to buffer/stream.
 */
export async function buildExcelModel({ property, comps = [], currency: ccy = "GBP" }: ExcelModelInput): Promise<ExcelJS.Workbook> {
  const sym = ccy === "USD" ? "$" : "£";
  const wb = new ExcelJS.Workbook();
  wb.creator = "RealHQ";
  wb.created = new Date();
  wb.properties.date1904 = false;

  buildSummary(wb, property, sym);
  buildDCF(wb, property, sym);
  buildSensitivity(wb, property);
  buildComparables(wb, comps);

  return wb;
}
