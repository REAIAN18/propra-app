/**
 * Wave T — all-deals matrix report.
 *
 * This is a reporter test, not a strict assertion test. It runs every
 * representative deal archetype through populateExcelExport() and prints
 * the full data-point table: template chosen, reason, cost basis, cells
 * populated, and financing row. Purpose: give the user a single place to
 * audit that every deal type routes correctly without having to open the
 * xlsx files by hand.
 *
 * Run: jest src/lib/dealscope/exports/__tests__/all-deals-matrix.test.ts
 */

import ExcelJS from "exceljs";
import { populateExcelExport, type PopulateExcelDeal } from "@/lib/dealscope/exports/populate-excel";

interface Fixture extends PopulateExcelDeal {
  _narrative: string;
}

const FIXTURES: Fixture[] = [
  // ── REAL LISTING ───────────────────────────────────────────────────────
  {
    _narrative: "Regency House, Basildon — £7m multi-let office, already refurbished, 8.9% yield (rib.co.uk)",
    id: "regency-house",
    address: "Regency House, Miles Gray Road, Basildon SS14 3HA",
    assetType: "Multi-Let Office",
    postcode: "SS14 3HA",
    buildingSizeSqft: null,
    yearBuilt: null,
    askingPrice: 7_000_000,
    guidePrice: 7_000_000,
    unitCount: null,
    signals: [],
    dataSources: {
      assumptions: {
        capRate: { value: 0.089, source: "listing" },
        opexRatio: { value: 0.30, source: "default" },
        voidRate: { value: 0.05, source: "default" },
        occupancy: { value: 1.0, source: "default" },
      },
      valuations: { condition: "refurbished", compPsfBand: null },
    },
  },

  // ── DEMO DECK (from the GET route) ─────────────────────────────────────
  {
    _narrative: "Meridian Business Park Unit 7 — stabilised Kent industrial, £520k asking",
    id: "demo-meri-1",
    address: "Meridian Business Park, Unit 7, Rochester ME1 1BB",
    assetType: "Industrial",
    postcode: "ME1 1BB",
    buildingSizeSqft: 8200,
    yearBuilt: 2019,
    askingPrice: 520_000,
    guidePrice: 520_000,
    unitCount: null,
    signals: [],
    dataSources: {
      passingRent: 49_200,
      erv: 57_400,
      assumptions: {
        passingRent: { value: 49_200, source: "estimated" },
        erv: { value: 57_400, source: "market" },
        capRate: { value: 0.075, source: "market" },
        opexRatio: { value: 0.25, source: "default" },
      },
      valuations: { condition: "refurbished" },
    },
  },
  {
    _narrative: "Maidstone Enterprise Zone Plot B3 — industrial auction with planning upside",
    id: "demo-maid-2",
    address: "Maidstone Enterprise Zone, Plot B3 ME15 9AA",
    assetType: "Industrial",
    postcode: "ME15 9AA",
    buildingSizeSqft: 9400,
    yearBuilt: 1998,
    askingPrice: 580_000,
    guidePrice: 580_000,
    unitCount: null,
    signals: ["auction", "planning"],
    dataSources: {
      passingRent: 56_400,
      erv: 65_800,
      assumptions: {
        capRate: { value: 0.075, source: "market" },
        opexRatio: { value: 0.25, source: "default" },
      },
      valuations: { condition: "average" },
    },
  },

  // ── SYNTHETIC — each remaining archetype ───────────────────────────────
  {
    _narrative: "Value-add refurb — unrefurbished Reading office with MEES risk, £3m",
    id: "synth-refurb",
    address: "40 Example Way, Reading RG1 1AA",
    assetType: "Office",
    postcode: "RG1 1AA",
    buildingSizeSqft: 25_000,
    yearBuilt: 1985,
    askingPrice: 3_000_000,
    guidePrice: 3_000_000,
    unitCount: null,
    signals: ["mees"],
    dataSources: {
      assumptions: { capRate: { value: 0.08, source: "market" } },
      valuations: {
        condition: "unrefurbished",
        scenarios: { refurb: { capexTotal: 1_200_000, capexPsf: 48, capexSource: "cost-library" } },
      },
    },
  },
  {
    _narrative: "Ground-up development — Shoreditch mixed-use site, £8m land",
    id: "synth-dev",
    address: "Old Street Yard, Shoreditch EC1V 1AA",
    assetType: "Development Site",
    postcode: "EC1V 1AA",
    buildingSizeSqft: 150_000,
    yearBuilt: null,
    askingPrice: 8_000_000,
    guidePrice: 8_000_000,
    unitCount: null,
    signals: ["development"],
    dataSources: {
      assumptions: { capRate: { value: 0.055, source: "market" } },
      valuations: { condition: "groundup" },
    },
  },
  {
    _narrative: "Multi-unit residential — 5 unit BTL block in Birmingham",
    id: "synth-multi",
    address: "12 Broad St, Birmingham B1 2AA",
    assetType: "Multifamily",
    postcode: "B1 2AA",
    buildingSizeSqft: 5500,
    yearBuilt: 2005,
    askingPrice: 1_250_000,
    guidePrice: 1_250_000,
    unitCount: 5,
    signals: [],
    dataSources: {
      passingRent: 84_000,
      assumptions: {
        passingRent: { value: 84_000, source: "rent roll" },
        capRate: { value: 0.055, source: "market" },
      },
      valuations: { condition: "refurbished" },
    },
  },
];

function pad(s: unknown, w: number): string {
  const str = s == null ? "—" : String(s);
  return str.length >= w ? str.slice(0, w - 1) + "…" : str + " ".repeat(w - str.length);
}

describe("all deals → Excel template matrix", () => {
  it("prints every data point for every archetype", async () => {
    const LIVE_BOE = 0.0525;
    const rows: Array<Record<string, unknown>> = [];

    for (const f of FIXTURES) {
      const result = await populateExcelExport(f, { liveBoeBaseRate: LIVE_BOE });
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);

      // Pull visible deal sheet
      const visible = wb.worksheets.find(
        w => ["Income Deal", "Refurb Deal", "Development Deal", "Multi-Unit Deal"].includes(w.name)
              && w.state !== "veryHidden" && w.state !== "hidden",
      );
      const fin = wb.getWorksheet("FINANCING_MATRIX")!;

      // Asset → financing row mapping (mirrors refreshFinancingMatrix)
      const finRowByAsset: Record<string, number> = {
        Office: 5, Industrial: 7, Retail: 8, Residential: 9, Multifamily: 9,
      };
      const finRow = finRowByAsset[result.costBasis.asset];
      const finLtv  = finRow ? fin.getCell(`B${finRow}`).value : null;
      const finDscr = finRow ? fin.getCell(`C${finRow}`).value : null;
      const finRate = finRow ? fin.getCell(`D${finRow}`).value : null;
      const finTerm = finRow ? fin.getCell(`E${finRow}`).value : null;

      // Sheet-specific input cell probes
      const cells: Record<string, unknown> = {};
      if (visible?.name === "Income Deal") {
        cells.address = visible.getCell("B4").value;
        cells.price   = visible.getCell("B11").value;
        cells.exitCap = visible.getCell("B23").value;
        cells.opexR   = visible.getCell("B26").value;
        cells.occ     = visible.getCell("B28").value;
        const rentRaw = visible.getCell("B30").value;
        cells.rentB30 = rentRaw == null
          ? "(blank — awaiting rent roll)"
          : typeof rentRaw === "object"
            ? `formula:${(rentRaw as { formula?: string }).formula ?? "?"}`
            : rentRaw;
      } else if (visible?.name === "Refurb Deal") {
        cells.address  = visible.getCell("B4").value;
        cells.price    = visible.getCell("B10").value;
        cells.sqft     = visible.getCell("B7").value;
        cells.capexTot = visible.getCell("B36").value;
        cells.ervPsf   = visible.getCell("B50").value;
        cells.exitCap  = visible.getCell("B51").value;
      } else if (visible?.name === "Development Deal") {
        cells.address   = visible.getCell("B4").value;
        cells.landPrice = visible.getCell("B10").value;
        cells.devSqft   = visible.getCell("B6").value;
        cells.hardPsf   = visible.getCell("B39").value;
        cells.softPct   = visible.getCell("B40").value;
        cells.exitCap   = visible.getCell("B41").value;
        cells.rentPsf   = visible.getCell("B42").value;
      } else if (visible?.name === "Multi-Unit Deal") {
        cells.price    = visible.getCell("B12").value;
        cells.exitCap  = visible.getCell("B14").value;
        cells.occ      = visible.getCell("B19").value;
        cells.grossRnt = visible.getCell("C9").value;
      }

      rows.push({
        id: f.id,
        narrative: f._narrative,
        template: result.template.template,
        reason: result.template.reason,
        asset: result.costBasis.asset,
        region: result.costBasis.region,
        refurbLevel: result.costBasis.refurbLevel,
        groundUpPsf: result.costBasis.groundUpPsf,
        refurbPsf: result.costBasis.refurbPsf,
        financingKey: result.costBasis.financing.key,
        financingLtv: finLtv,
        financingDscr: finDscr,
        financingRate: finRate,
        financingTerm: finTerm,
        visibleSheet: visible?.name ?? "(none)",
        ...cells,
      });
    }

    // Print as a compact table.
    // eslint-disable-next-line no-console
    console.log("\n════════════════════════════════════════════════════════════════════════════════════");
    console.log("DEALSCOPE EXCEL EXPORT — ALL-DEALS MATRIX");
    console.log(`Live BoE base used: ${(LIVE_BOE * 100).toFixed(2)}% → all-in debt rate = ${((LIVE_BOE + 0.0175) * 100).toFixed(2)}%`);
    console.log("════════════════════════════════════════════════════════════════════════════════════\n");

    for (const r of rows) {
      console.log(`┌─ ${r.id} ──`);
      console.log(`│  ${r.narrative}`);
      console.log(`│  Template      : ${r.template}`);
      console.log(`│  Reason        : ${r.reason}`);
      console.log(`│  Visible sheet : ${r.visibleSheet}`);
      console.log(`│  Cost basis    : ${r.asset} / ${r.region} / refurbLevel=${r.refurbLevel ?? "—"}`);
      console.log(`│  £/sqft        : ground-up ${r.groundUpPsf} · refurb ${r.refurbPsf ?? "—"}`);
      console.log(`│  Financing row : ${r.financingKey}`);
      const ltv   = typeof r.financingLtv  === "number" ? `${(r.financingLtv  * 100).toFixed(0)}%` : "—";
      const rate  = typeof r.financingRate === "number" ? `${(r.financingRate * 100).toFixed(2)}%` : "—";
      const dscr  = r.financingDscr ?? "—";
      const term  = r.financingTerm ?? "—";
      console.log(`│  Debt          : LTV ${ltv} · DSCR ${dscr}× · rate ${rate} · term ${term}y`);
      console.log(`│  Populated cells:`);
      for (const [k, v] of Object.entries(r)) {
        if (["id","narrative","template","reason","asset","region","refurbLevel","groundUpPsf","refurbPsf","financingKey","financingLtv","financingDscr","financingRate","financingTerm","visibleSheet"].includes(k)) continue;
        console.log(`│     ${pad(k, 12)} = ${v}`);
      }
      console.log(`└────────────\n`);
    }

    // Sanity: every fixture produced a valid visible sheet
    for (const r of rows) {
      expect(r.visibleSheet).not.toBe("(none)");
    }
  }, 60_000);
});
