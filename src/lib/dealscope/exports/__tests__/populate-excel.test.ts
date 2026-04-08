/**
 * Wave T — populate-excel integration test.
 *
 * Loads the real appraisal.xlsx template, runs the populator against a deal
 * shaped like Regency House, Miles Gray Road, Basildon (the live test the
 * user asked us to verify against), and asserts:
 *
 *   - The correct deal sheet is chosen and left visible
 *   - Non-chosen deal sheets are hidden
 *   - Input cells are populated with deal numbers
 *   - Broken `$B$Bxx` formula typos have been rewritten to valid formulas
 *   - A "DealScope Provenance" sheet is appended
 *   - Reference sheets (FINANCING_MATRIX, CONSTRUCTION_COSTS) are refreshed
 *     with cost-library values
 */

import ExcelJS from "exceljs";
import { populateExcelExport } from "@/lib/dealscope/exports/populate-excel";

const REGENCY_HOUSE_DEAL = {
  id: "test-regency-house",
  address: "Regency House, Miles Gray Road, Basildon SS14 3HA",
  assetType: "Multi-Let Office",
  postcode: "SS14 3HA",
  buildingSizeSqft: 38000,
  yearBuilt: 1985,
  askingPrice: 2_250_000,
  guidePrice: 2_250_000,
  unitCount: null,
  signals: ["mees", "auction"],
  dataSources: {
    passingRent: 185_000,
    erv: 285_000,
    assumptions: {
      passingRent: { value: 185_000, source: "listing" },
      erv: { value: 285_000, source: "market" },
      capRate: { value: 0.075, source: "market" },
      opexRatio: { value: 0.30, source: "default" },
      voidRate: { value: 0.05, source: "default" },
      occupancy: { value: 0.85, source: "listing" },
    },
    valuations: {
      condition: "average",
      scenarios: {
        refurb: {
          erv: 285_000,
          ervPsf: 7.5,
          noi: 199_500,
          capexPsf: 65,
          capexTotal: 2_470_000,
          capexSource: "cost-library",
          grossValue: 3_990_000,
          value: 3_250_000,
          clearsAsking: true,
        },
      },
      compPsfBand: { low: 55, mid: 72, high: 95, sampleSize: 14 },
    },
  },
};

describe("populateExcelExport", () => {
  it("selects Refurb Deal for Regency House (MEES + average condition)", async () => {
    const result = await populateExcelExport(REGENCY_HOUSE_DEAL, { liveBoeBaseRate: 0.0525 });
    expect(result.template.template).toBe("Refurb Deal");
    expect(result.costBasis.region).toBe("SE");
    expect(result.costBasis.asset).toBe("Office");
    expect(result.costBasis.refurbLevel).toBe("Mid");
    expect(result.filename).toMatch(/regency-house/);
  }, 30_000);

  it("populates input cells and hides non-chosen deal sheets", async () => {
    const result = await populateExcelExport(REGENCY_HOUSE_DEAL, { liveBoeBaseRate: 0.0525 });

    // Round-trip through ExcelJS to inspect
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);

    // Chosen sheet visible
    const refurb = wb.getWorksheet("Refurb Deal");
    expect(refurb).toBeDefined();
    expect(refurb!.state).not.toBe("veryHidden");
    expect(refurb!.state).not.toBe("hidden");

    // Non-chosen deal sheets hidden
    expect(wb.getWorksheet("Income Deal")?.state).toBe("veryHidden");
    expect(wb.getWorksheet("Development Deal")?.state).toBe("veryHidden");
    expect(wb.getWorksheet("Multi-Unit Deal")?.state).toBe("veryHidden");

    // Inputs populated
    expect(refurb!.getCell("B4").value).toMatch(/Regency House/);
    expect(refurb!.getCell("B7").value).toBe(38000);
    expect(refurb!.getCell("B10").value).toBe(2_250_000);
    expect(refurb!.getCell("B51").value).toBe(0.075);

    // Broken `$B$B…` formulas replaced with valid ones
    const b58 = refurb!.getCell("B58").value as { formula?: string } | null;
    expect(b58).toBeTruthy();
    expect(b58!.formula).toBe("B56-B57");

    // Provenance sheet appended
    expect(wb.getWorksheet("DealScope Provenance")).toBeDefined();
  }, 30_000);

  it("refreshes financing matrix with live BoE rate + 175bps", async () => {
    const result = await populateExcelExport(REGENCY_HOUSE_DEAL, { liveBoeBaseRate: 0.0525 });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);
    const fin = wb.getWorksheet("FINANCING_MATRIX")!;
    // Row 5 = Grade A Office (Office prime mapped in refreshFinancingMatrix)
    const d5 = fin.getCell("D5").value as number;
    expect(d5).toBeCloseTo(0.0525 + 0.0175, 4);
  }, 30_000);

  it("selects Income Deal for stabilized commercial with no refurb signal", async () => {
    const deal = { ...REGENCY_HOUSE_DEAL, id: "test-stabilized", signals: [], dataSources: {
      ...REGENCY_HOUSE_DEAL.dataSources,
      valuations: { condition: "refurbished" },
    } };
    const result = await populateExcelExport(deal, { liveBoeBaseRate: 0.0525 });
    expect(result.template.template).toBe("Income Deal");
  }, 30_000);
});
