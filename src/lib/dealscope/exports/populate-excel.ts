/**
 * src/lib/dealscope/exports/populate-excel.ts
 *
 * Wave T — loads CRE_Professional_Appraisal_Complete_EDITABLE_2026.xlsx,
 * picks the right deal tab via selectExcelTemplate(), populates input cells
 * with the deal's underwriting numbers, refreshes the embedded reference
 * sheets (CONSTRUCTION_COSTS, FINANCING_MATRIX, COMPARABLE_ANALYSIS) from
 * the cost library + live macro rates + Wave Q comps, hides the deal tabs
 * the user shouldn't see, and returns a Buffer the API route streams to the
 * browser.
 *
 * Honest-mode contract:
 *   - Only known input cells are overwritten — formulas are preserved so
 *     the user can edit any assumption and see metrics recalculate live.
 *   - The template ships with a handful of `$B$Bxx` formula typos
 *     (broken in the source xlsx); we rewrite those as we go so the file
 *     opens cleanly. Every rewrite is documented inline.
 *   - A "DealScope Provenance" sheet is appended showing the cost-basis
 *     lookup and template-selection reason so the user can audit which
 *     library row drove each default.
 */

import path from "node:path";
import ExcelJS from "exceljs";
import { selectExcelTemplate, type SelectTemplateResult } from "./select-excel-template";
import {
  lookupCostBasis,
  type CostBasisLookup,
  type RefurbLevel,
} from "./cost-library";

// Resolved at runtime; bundled into the Vercel function output via the
// Next.js `outputFileTracingIncludes` config below.
const TEMPLATE_PATH = path.join(process.cwd(), "src/lib/dealscope/exports/templates/appraisal.xlsx");

export interface PopulateExcelDeal {
  id: string;
  address: string;
  assetType?: string | null;
  postcode?: string | null;
  buildingSizeSqft?: number | null;
  yearBuilt?: number | null;
  askingPrice?: number | null;
  guidePrice?: number | null;
  unitCount?: number | null;
  signals?: string[] | null;
  dataSources?: Record<string, unknown> | null;
}

export interface PopulateExcelOptions {
  liveBoeBaseRate?: number | null; // decimal, e.g. 0.0525
  filenameHint?: string;
}

export interface PopulateExcelResult {
  buffer: Buffer;
  template: SelectTemplateResult;
  costBasis: CostBasisLookup;
  filename: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "value" in (v as object)) {
    const inner = (v as { value: unknown }).value;
    if (typeof inner === "number" && Number.isFinite(inner)) return inner;
  }
  return null;
}

function setVal(ws: ExcelJS.Worksheet, ref: string, value: number | string | null) {
  if (value == null) return;
  ws.getCell(ref).value = value;
}

function setFormula(ws: ExcelJS.Worksheet, ref: string, formula: string) {
  ws.getCell(ref).value = { formula };
}

// Rewrite the template's broken `$B$Bxx` typos. Each fix below is referenced
// against a specific sheet/cell in the source xlsx (April 2026 build).
function patchBrokenFormulas(ws: ExcelJS.Worksheet, sheet: string) {
  if (sheet === "Income Deal") {
    // B30 ships as `=B17` (=acquisition total) — wrong; passing rent must be
    // a stand-alone input. Leave as a number once we set it below.
    setFormula(ws, "B31", "B30*B25");      // vacancy = rent * void rate
    setFormula(ws, "B32", "B30-B31");      // EGI
    setFormula(ws, "B33", "B32*B26");      // opex = EGI * opex ratio
    setFormula(ws, "B34", "B32-B33");      // NOI
    setFormula(ws, "B35", "B34/B11");      // entry cap
    setFormula(ws, "B36", "B34/B23");      // exit value
    setFormula(ws, "B37", "B11+B12+B13+B14+B15+B16"); // equity invested
    setFormula(ws, "B38", "B34*B27");      // cumulative NOI
    setFormula(ws, "B39", "B36+B38");      // total return
    setFormula(ws, "B40", "B39/B37");      // equity multiple
  }
  if (sheet === "Refurb Deal") {
    setFormula(ws, "B56", "B50*B7");       // post-refurb annual rent
    setFormula(ws, "B57", "B56*B52");      // opex
    setFormula(ws, "B58", "B56-B57");      // NOI
    setFormula(ws, "B59", "B58/B51");      // exit value
    setFormula(ws, "B60", "B15+B36");      // total cost in
    setFormula(ws, "B61", "B58*B53");      // cumulative NOI
    setFormula(ws, "B62", "B59+B61");      // total return
    setFormula(ws, "B63", "B62/B60");      // equity multiple
  }
  if (sheet === "Development Deal") {
    setFormula(ws, "B46", "B6*B39");       // hard costs = sqft * £/sqft
    setFormula(ws, "B47", "B46*B40");      // soft = hard * %
    setFormula(ws, "B48", "B46+B47+B14");  // total dev cost
    setFormula(ws, "B49", "B6*B42");       // stabilized rent
    setFormula(ws, "B50", "B49*B43");      // opex
    setFormula(ws, "B51", "B49-B50");      // NOI
    setFormula(ws, "B52", "B51/B41");      // exit value
    setFormula(ws, "B53", "B52-B48");      // profit
  }
  if (sheet === "Multi-Unit Deal") {
    setFormula(ws, "B25", "C24*B19");      // effective = gross * occupancy
    setFormula(ws, "B26", "B25*B20");      // opex
    setFormula(ws, "B27", "B25-B26");      // NOI
    setFormula(ws, "B28", "B27/B18");      // exit value
    setFormula(ws, "B29", "B27*B21");      // cumulative NOI
    setFormula(ws, "B30", "B28+B29");      // total return
    setFormula(ws, "B31", "B30/B12");      // equity multiple
  }
}

// ─── populators per template ─────────────────────────────────────────────────
function populateIncomeDeal(
  ws: ExcelJS.Worksheet,
  deal: PopulateExcelDeal,
  ds: Record<string, unknown>,
) {
  const assumptions = (ds.assumptions ?? {}) as Record<string, unknown>;
  const passingRent = toNum(ds.passingRent) ?? toNum(assumptions.passingRent) ?? toNum(ds.currentRentPa);
  const exitCap = toNum(assumptions.capRate) ?? toNum(ds.capRate);
  const opexRatio = toNum(assumptions.opexRatio);
  const voidRate = toNum(assumptions.voidRate);
  const occupancy = toNum(assumptions.occupancy);

  setVal(ws, "B4", deal.address);
  setVal(ws, "B5", deal.assetType ?? "Commercial");
  setVal(ws, "B6", deal.buildingSizeSqft ?? null);
  setVal(ws, "B7", deal.buildingSizeSqft ?? null);
  setVal(ws, "B8", deal.yearBuilt ?? null);

  // Acquisition
  setVal(ws, "B11", deal.askingPrice ?? deal.guidePrice ?? null);
  // B12 = SDLT formula left intact
  // B13 legal, B14 broker formula, B15 survey, B16 DD — leave defaults; user edits
  // B17 = SUM(B11:B16) formula left intact

  // Editable assumptions
  if (exitCap != null)   setVal(ws, "B23", exitCap);
  if (opexRatio != null) setVal(ws, "B26", opexRatio);
  if (voidRate != null)  setVal(ws, "B25", voidRate);
  if (occupancy != null) setVal(ws, "B28", occupancy);

  // Passing rent — the template ships B30 as the broken formula `=B17`
  // (which resolves to the acquisition total). Always overwrite: use the
  // real figure if we have it, otherwise clear the cell so the user sees
  // an empty input rather than a nonsense auto-populated "rent".
  //
  // When rent + sqft are both known we attach a cell note showing the
  // derived psf so the user can sanity-check against the comps tab.
  if (passingRent != null) {
    setVal(ws, "B30", passingRent);
    const sqftForPsf = deal.buildingSizeSqft ?? null;
    if (sqftForPsf && sqftForPsf > 0) {
      const psf = passingRent / sqftForPsf;
      ws.getCell("B30").note = `DealScope: listing passing rent £${passingRent.toLocaleString()} over ${sqftForPsf.toLocaleString()} sqft → £${psf.toFixed(2)}/sqft`;
    }
  } else {
    ws.getCell("B30").value = null;
    ws.getCell("B30").note = "DealScope: rent roll not yet enriched — enter annual passing rent";
  }
}

function populateRefurbDeal(
  ws: ExcelJS.Worksheet,
  deal: PopulateExcelDeal,
  ds: Record<string, unknown>,
  cb: CostBasisLookup,
) {
  const sqft = deal.buildingSizeSqft ?? null;
  const valuations = (ds.valuations ?? {}) as Record<string, unknown>;
  const refurb = ((valuations.scenarios as Record<string, unknown> | undefined)?.refurb ?? {}) as Record<string, unknown>;
  const erv = toNum(refurb.erv) ?? toNum(ds.erv);
  const exitCap = toNum((ds.assumptions as Record<string, unknown> | undefined)?.capRate);
  const capexTotal = toNum(refurb.capexTotal);

  setVal(ws, "B4", deal.address);
  setVal(ws, "B5", (valuations.condition as string) ?? "Average");
  setVal(ws, "B6", "Refurbished");
  setVal(ws, "B7", sqft);

  setVal(ws, "B10", deal.askingPrice ?? deal.guidePrice ?? null);

  // Hard costs from cost library × sqft, split heuristically
  if (sqft && cb.refurbPsf) {
    const hard = sqft * cb.refurbPsf;
    setVal(ws, "B18", Math.round(hard * 0.10)); // structural
    setVal(ws, "B19", Math.round(hard * 0.20)); // M&E
    setVal(ws, "B20", Math.round(hard * 0.28)); // flooring/finishes
    setVal(ws, "B21", Math.round(hard * 0.20)); // facade
    setVal(ws, "B22", Math.round(hard * 0.12)); // roof
    setVal(ws, "B23", Math.round(hard * 0.10)); // asbestos/env
  }
  // B27-B31 soft cost formulas left intact (they reference B24)

  // Post-refurb editable inputs
  if (erv != null && sqft && sqft > 0) setVal(ws, "B50", Math.round((erv / sqft) * 100) / 100);
  if (exitCap != null) setVal(ws, "B51", exitCap);

  if (capexTotal != null) {
    // Override the contingency-derived B36 formula with the dossier total so
    // the headline matches Wave F when the user opens the file.
    setVal(ws, "B36", capexTotal);
  }
}

function populateDevelopmentDeal(
  ws: ExcelJS.Worksheet,
  deal: PopulateExcelDeal,
  ds: Record<string, unknown>,
  cb: CostBasisLookup,
) {
  const sqft = deal.buildingSizeSqft ?? null;
  const exitCap = toNum((ds.assumptions as Record<string, unknown> | undefined)?.capRate);
  const erv = toNum(ds.erv);
  const ervPsf = erv != null && sqft && sqft > 0 ? erv / sqft : null;

  setVal(ws, "B4", deal.address);
  setVal(ws, "B5", deal.assetType ?? "Mixed-Use Development");
  setVal(ws, "B6", sqft);

  setVal(ws, "B10", deal.askingPrice ?? deal.guidePrice ?? null);

  // Cost basis: groundup £/sqft from cost library
  setVal(ws, "B39", cb.groundUpPsf);
  const softTotalPct = cb.softCost.design + cb.softCost.engineering + cb.softCost.pm + cb.softCost.permits + cb.softCost.site + cb.softCost.contingency;
  setVal(ws, "B40", Math.round(softTotalPct * 100) / 100);
  if (exitCap != null) setVal(ws, "B41", exitCap);
  if (ervPsf != null) setVal(ws, "B42", Math.round(ervPsf * 100) / 100);
}

function populateMultiUnitDeal(
  ws: ExcelJS.Worksheet,
  deal: PopulateExcelDeal,
  ds: Record<string, unknown>,
) {
  const passingRent = toNum(ds.passingRent) ?? toNum((ds.assumptions as Record<string, unknown> | undefined)?.passingRent);
  const exitCap = toNum((ds.assumptions as Record<string, unknown> | undefined)?.capRate);

  setVal(ws, "B12", deal.askingPrice ?? deal.guidePrice ?? null);
  if (exitCap != null) setVal(ws, "B14", exitCap);
  if (exitCap != null) setVal(ws, "B18", exitCap);

  // Override gross-rent formula in C9 with the dossier passing rent so the
  // multiplier math holds together regardless of unit mix breakdown.
  if (passingRent != null) setVal(ws, "C9", passingRent);
}

// ─── reference-sheet refresh ─────────────────────────────────────────────────
function refreshConstructionCosts(wb: ExcelJS.Workbook, cb: CostBasisLookup) {
  const ws = wb.getWorksheet("CONSTRUCTION_COSTS");
  if (!ws) return;
  // Highlight the row matching the deal's asset class with library data.
  // Row layout (from template dump):
  //   row5 Office A, row6 Office B, row7 Industrial, row8 Retail Prime,
  //   row9 Residential, row10 Multifamily
  const rowMap: Record<string, number> = {
    Office: 5, Industrial: 7, Retail: 8, Residential: 9, Multifamily: 10,
  };
  const targetRow = rowMap[cb.asset];
  if (!targetRow) return;
  // Cols: B=London C=SE D=Midlands E=North
  const colMap: Record<string, string> = { London: "B", SE: "C", Midlands: "D", North: "E" };
  const targetCell = `${colMap[cb.region]}${targetRow}`;
  ws.getCell(targetCell).value = cb.refurbPsf ?? cb.groundUpPsf;
  ws.getCell(targetCell).fill = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" },
  };
  ws.getCell(targetCell).note = `DealScope: live cost-library lookup for ${cb.asset} in ${cb.region}`;
}

function refreshFinancingMatrix(
  wb: ExcelJS.Workbook,
  cb: CostBasisLookup,
  liveBoeBaseRate: number | null | undefined,
) {
  const ws = wb.getWorksheet("FINANCING_MATRIX");
  if (!ws) return;
  // Effective rate = BoE base + 175bps if live, else cost-library default.
  const effectiveRate = liveBoeBaseRate != null
    ? liveBoeBaseRate + 0.0175
    : cb.financing.row.ratePa;
  // Asset → row in FINANCING_MATRIX
  const rowMap: Record<string, number> = {
    Office: 5, Industrial: 7, Retail: 8, Residential: 9, Multifamily: 9,
  };
  const r = rowMap[cb.asset];
  if (!r) return;
  ws.getCell(`B${r}`).value = cb.financing.row.ltv;
  ws.getCell(`C${r}`).value = cb.financing.row.dscrMin;
  ws.getCell(`D${r}`).value = Math.round(effectiveRate * 10000) / 10000;
  ws.getCell(`E${r}`).value = cb.financing.row.termYrs;
  ws.getCell(`D${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  ws.getCell(`D${r}`).note = liveBoeBaseRate != null
    ? `Live BoE base ${(liveBoeBaseRate * 100).toFixed(2)}% + 175bps spread`
    : `Cost-library default for ${cb.financing.key}`;
}

function refreshComparableAnalysis(wb: ExcelJS.Workbook, ds: Record<string, unknown>) {
  const ws = wb.getWorksheet("COMPARABLE_ANALYSIS");
  if (!ws) return;
  const valuations = ds.valuations as Record<string, unknown> | undefined;
  const band = valuations?.compPsfBand as { low?: number; mid?: number; high?: number; sampleSize?: number } | undefined;
  if (!band) return;
  // Append a "DealScope live" row at row 10 below the static reference rows.
  ws.getCell("A10").value = "DealScope live (subject market)";
  ws.getCell("A10").font = { bold: true };
  if (band.low != null)  ws.getCell("B10").value = band.low;
  if (band.mid != null)  ws.getCell("C10").value = band.mid;
  if (band.high != null) ws.getCell("D10").value = band.high;
  ws.getCell("E10").value = band.mid ?? null;
  ws.getCell("E10").note = `Wave Q comp band, sample size ${band.sampleSize ?? 0}`;
}

// ─── provenance sheet ────────────────────────────────────────────────────────
function appendProvenanceSheet(
  wb: ExcelJS.Workbook,
  deal: PopulateExcelDeal,
  template: SelectTemplateResult,
  cb: CostBasisLookup,
  liveBoeBaseRate: number | null | undefined,
) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const assumptions = (ds.assumptions ?? {}) as Record<string, unknown>;
  const passingRent = toNum(ds.passingRent) ?? toNum(assumptions.passingRent);
  const sqftForPsf = deal.buildingSizeSqft ?? null;
  const rentPsfDerived = passingRent != null && sqftForPsf && sqftForPsf > 0
    ? passingRent / sqftForPsf
    : null;
  const rentalMeta = ds.rentalCompsMeta as
    | { matchStage?: string; searched?: { sector?: string; outcode?: string; area?: string }; note?: string }
    | undefined;
  const ws = wb.addWorksheet("DealScope Provenance");
  ws.columns = [
    { header: "Field",  key: "k", width: 28 },
    { header: "Value",  key: "v", width: 60 },
  ];
  ws.getRow(1).font = { bold: true };
  const rows: [string, string][] = [
    ["Deal ID",         deal.id],
    ["Address",         deal.address],
    ["Asset type",      deal.assetType ?? "—"],
    ["Postcode",        deal.postcode ?? "—"],
    ["Template chosen", template.template],
    ["Why",             template.reason],
    ["Cost-basis asset",  cb.asset],
    ["Cost-basis region", cb.region],
    ["Refurb level",      cb.refurbLevel ?? "—"],
    ["Ground-up £/sqft",  String(cb.groundUpPsf)],
    ["Refurb £/sqft",     cb.refurbPsf != null ? String(cb.refurbPsf) : "—"],
    ["Financing row",     cb.financing.key],
    ["Live BoE base",     liveBoeBaseRate != null ? `${(liveBoeBaseRate * 100).toFixed(2)}%` : "n/a (using cost-library default)"],
    ["Passing rent",      passingRent != null ? `£${passingRent.toLocaleString()}` : "unknown (not published)"],
    ["NLA (sqft)",        sqftForPsf != null ? sqftForPsf.toLocaleString() : "unknown"],
    ["Rent psf (derived)", rentPsfDerived != null ? `£${rentPsfDerived.toFixed(2)}/sqft` : "—"],
    ["Lettings comp match", rentalMeta?.matchStage ?? "n/a"],
    ["Lettings comp note",  rentalMeta?.note ?? "n/a"],
    ["Provenance line",   cb.provenance],
    ["Generated",         new Date().toISOString()],
  ];
  for (const [k, v] of rows) ws.addRow({ k, v });
}

// ─── public entry ────────────────────────────────────────────────────────────
export async function populateExcelExport(
  deal: PopulateExcelDeal,
  options: PopulateExcelOptions = {},
): Promise<PopulateExcelResult> {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const valuations = ds.valuations as Record<string, unknown> | undefined;
  const refurbScenario = (valuations?.scenarios as Record<string, unknown> | undefined)?.refurb as
    | { capexTotal?: number; capexPsf?: number }
    | undefined;
  const condition = (valuations?.condition as string | undefined) ?? null;
  const refurbCapexTotal = refurbScenario?.capexTotal ?? null;

  // 1. Pick template
  const template = selectExcelTemplate({
    assetType: deal.assetType,
    buildingSizeSqft: deal.buildingSizeSqft,
    unitCount: deal.unitCount,
    signals: deal.signals,
    condition,
    refurbCapexTotal,
  });

  // 2. Pick refurb level for cost basis (Mid by default; Premium for Grade A;
  //    Light if signals say "cosmetic")
  const refurbLevel: RefurbLevel | null = template.template === "Refurb Deal"
    ? (deal.signals ?? []).some(s => s.toLowerCase().includes("cosmetic")) ? "Light"
    : (deal.signals ?? []).some(s => s.toLowerCase().includes("premium")) ? "Premium"
    : "Mid"
    : null;

  const cb = lookupCostBasis({
    assetType: deal.assetType,
    postcode: deal.postcode,
    refurbLevel,
    prime: !((deal.signals ?? []).some(s => /secondary|tertiary/.test(s.toLowerCase()))),
  });

  // 3. Load template workbook
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  wb.creator = "RealHQ DealScope";
  wb.lastModifiedBy = "RealHQ DealScope";
  wb.modified = new Date();

  // 4. Update COVER with deal address
  const cover = wb.getWorksheet("COVER");
  if (cover) {
    cover.getCell("A6").value = `Property Analysis — ${deal.address}`;
    cover.getCell("A15").value = `Prepared: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`;
  }

  // 5. Patch broken formulas + populate inputs on the chosen sheet only
  const ws = wb.getWorksheet(template.template);
  if (!ws) throw new Error(`Template sheet not found: ${template.template}`);
  patchBrokenFormulas(ws, template.template);

  if (template.template === "Income Deal")        populateIncomeDeal(ws, deal, ds);
  else if (template.template === "Refurb Deal")   populateRefurbDeal(ws, deal, ds, cb);
  else if (template.template === "Development Deal") populateDevelopmentDeal(ws, deal, ds, cb);
  else if (template.template === "Multi-Unit Deal")  populateMultiUnitDeal(ws, deal, ds);

  // 6. Refresh reference sheets
  refreshConstructionCosts(wb, cb);
  refreshFinancingMatrix(wb, cb, options.liveBoeBaseRate ?? null);
  refreshComparableAnalysis(wb, ds);

  // 7. Hide the deal sheets the user didn't pick
  const allDealSheets: Array<"Income Deal" | "Refurb Deal" | "Development Deal" | "Multi-Unit Deal"> =
    ["Income Deal", "Refurb Deal", "Development Deal", "Multi-Unit Deal"];
  for (const name of allDealSheets) {
    if (name === template.template) continue;
    const s = wb.getWorksheet(name);
    if (s) s.state = "veryHidden";
  }

  // 8. Provenance sheet
  appendProvenanceSheet(wb, deal, template, cb, options.liveBoeBaseRate ?? null);

  // 9. Force the chosen sheet active
  if (ws) {
    wb.views = [{
      activeTab: wb.worksheets.indexOf(ws),
      firstSheet: 0,
      visibility: "visible",
      x: 0, y: 0, width: 12000, height: 9000,
    }];
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
  const safeAddr = (deal.address || deal.id).replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60);
  const filename = `${options.filenameHint ?? "appraisal"}-${safeAddr}.xlsx`;

  return { buffer, template, costBasis: cb, filename };
}
