/**
 * Wave T — populate-excel integration test.
 *
 * HONEST-MODE FIXTURES.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Correction note (post-review):
 * The earlier version of this file used a Regency House fixture at £2.25m
 * with a "Refurb Deal" branch and invented passing rent / ERV numbers. That
 * was wrong on three counts:
 *   1. The £2.25m figure was copied from the template's own default
 *      (Refurb Deal B10 ships as £2,250,000 with placeholder address
 *      "Basildon Central, Essex") — it is NOT the rib.co.uk listing price.
 *   2. Regency House has already been refurbished, so the correct
 *      classification is Income Deal, not Refurb.
 *   3. Passing rent / ERV figures were fabricated. The populator must not
 *      assert specific rent values in a fixture unless they come from the
 *      enriched listing.
 *
 * The fixtures below now reflect:
 *   - REGENCY_HOUSE_DEAL uses the stated listing headline (£7,000,000 at
 *     8.9% quoted yield, condition: "refurbished", no refurb capex, no
 *     MEES signal) and leaves passing rent / ERV null so the populator
 *     writes only the acquisition + assumption cells and preserves the
 *     template's editable rent inputs for the user to complete.
 *   - A separate GENERIC_REFURB_DEAL fixture exercises the refurb populator
 *     cell-writes without pretending to be Regency House.
 * ──────────────────────────────────────────────────────────────────────────
 */

import ExcelJS from "exceljs";
import { populateExcelExport } from "@/lib/dealscope/exports/populate-excel";

/**
 * Regency House, Miles Gray Road, Basildon.
 * Headline data from the rib.co.uk listing: £7,000,000 asking, 8.9% net
 * initial yield quoted by the agent, already refurbished multi-let office.
 * NLA and year built are placeholders marked unknown — the real enrich
 * pipeline pulls those from the brochure.
 */
const REGENCY_HOUSE_DEAL = {
  id: "test-regency-house",
  address: "Regency House, Miles Gray Road, Basildon SS14 3HA",
  assetType: "Multi-Let Office",
  postcode: "SS14 3HA",
  buildingSizeSqft: null, // unknown until brochure parsed
  yearBuilt: null,
  askingPrice: 7_000_000,
  guidePrice: 7_000_000,
  unitCount: null,
  signals: [], // no MEES / auction / refurb signals — stabilized asset
  dataSources: {
    // No passingRent / erv — those come from the rent roll. Leaving them
    // null means the populator only writes the acquisition + assumption
    // cells and leaves the rent inputs for the user to fill.
    assumptions: {
      // 8.9% is the agent's quoted yield — we treat it as the cap rate
      // assumption until the user overrides it in the sheet.
      capRate: { value: 0.089, source: "listing" },
      opexRatio: { value: 0.30, source: "default" },
      voidRate: { value: 0.05, source: "default" },
      occupancy: { value: 1.0, source: "default" },
    },
    valuations: {
      condition: "refurbished", // already refurbished per listing
      compPsfBand: null,
    },
  },
};

/**
 * Synthetic value-add fixture — purely to exercise the Refurb Deal
 * populator code path. Not tied to any real listing.
 */
const GENERIC_REFURB_DEAL = {
  id: "test-generic-refurb",
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
    assumptions: {
      capRate: { value: 0.08, source: "market" },
      opexRatio: { value: 0.30, source: "default" },
    },
    valuations: {
      condition: "unrefurbished",
      scenarios: {
        refurb: { capexTotal: 1_200_000, capexPsf: 48, capexSource: "cost-library" },
      },
    },
  },
};

describe("populateExcelExport", () => {
  // ── Regency House (real listing) ─────────────────────────────────────────
  it("routes already-refurbished Regency House to Income Deal at £7m", async () => {
    const result = await populateExcelExport(REGENCY_HOUSE_DEAL, { liveBoeBaseRate: 0.0525 });
    expect(result.template.template).toBe("Income Deal");
    expect(result.template.reason).toMatch(/stabilized|Stabilized/);
    expect(result.costBasis.region).toBe("SE");
    expect(result.costBasis.asset).toBe("Office");
    // Not a refurb deal → no refurb level picked
    expect(result.costBasis.refurbLevel).toBeNull();
    expect(result.filename).toMatch(/regency-house/);
  }, 30_000);

  it("writes Regency House acquisition + yield inputs to Income Deal sheet", async () => {
    const result = await populateExcelExport(REGENCY_HOUSE_DEAL, { liveBoeBaseRate: 0.0525 });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);

    const income = wb.getWorksheet("Income Deal");
    expect(income).toBeDefined();
    expect(income!.state).not.toBe("veryHidden");

    // Non-chosen sheets hidden
    expect(wb.getWorksheet("Refurb Deal")?.state).toBe("veryHidden");
    expect(wb.getWorksheet("Development Deal")?.state).toBe("veryHidden");
    expect(wb.getWorksheet("Multi-Unit Deal")?.state).toBe("veryHidden");

    // Real listing numbers populated
    expect(income!.getCell("B4").value).toMatch(/Regency House/);
    expect(income!.getCell("B11").value).toBe(7_000_000);
    expect(income!.getCell("B23").value).toBe(0.089); // agent's quoted 8.9% yield
    expect(income!.getCell("B26").value).toBe(0.30);  // default opex ratio

    // Passing rent NOT written — the populator blanks B30 when we don't
    // have a rent roll, so the user sees an empty input cell rather than
    // the template's broken `=B17` default (which would resolve to the
    // acquisition total). It must NOT be a fabricated rent.
    const b30 = income!.getCell("B30").value;
    expect(b30).toBeNull();
    // And a helper note must prompt the user to fill it in.
    expect(income!.getCell("B30").note).toBeDefined();
  }, 30_000);

  it("derives rent psf and writes it as a cell note when rent + sqft both known", async () => {
    // Regency House with the rent roll filled in — £623k passing over
    // 70,000 sqft → ~£8.90/sqft. The populator should write the rent into
    // B30 AND attach a cell note with the derived psf so the user can
    // sanity-check against the comps tab.
    const enriched = {
      ...REGENCY_HOUSE_DEAL,
      buildingSizeSqft: 70_000,
      dataSources: {
        ...REGENCY_HOUSE_DEAL.dataSources,
        passingRent: 623_000,
      },
    };
    const result = await populateExcelExport(enriched, { liveBoeBaseRate: 0.0525 });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);
    const income = wb.getWorksheet("Income Deal")!;
    expect(income.getCell("B30").value).toBe(623_000);
    const note = String(income.getCell("B30").note ?? "");
    expect(note).toMatch(/£623,000/);
    expect(note).toMatch(/70,000/);
    expect(note).toMatch(/£8\.90\/sqft/);

    // Provenance sheet should also carry the derived psf
    const prov = wb.getWorksheet("DealScope Provenance")!;
    const values: string[] = [];
    prov.eachRow((r) => { r.eachCell((c) => values.push(String(c.value ?? ""))); });
    expect(values.some(v => /Rent psf/.test(v))).toBe(true);
    expect(values.some(v => /8\.90/.test(v))).toBe(true);

    // Provenance sheet appended
    expect(wb.getWorksheet("DealScope Provenance")).toBeDefined();
  }, 30_000);

  it("refreshes financing matrix with live BoE + 175bps for Regency House", async () => {
    const result = await populateExcelExport(REGENCY_HOUSE_DEAL, { liveBoeBaseRate: 0.0525 });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);
    const fin = wb.getWorksheet("FINANCING_MATRIX")!;
    // Row 5 = prime Office — populator writes BoE base + 175bps spread
    const d5 = fin.getCell("D5").value as number;
    expect(d5).toBeCloseTo(0.0525 + 0.0175, 4);
  }, 30_000);

  // ── Synthetic refurb fixture exercising the Refurb populator ─────────────
  it("routes an unrefurbished value-add deal to Refurb Deal", async () => {
    const result = await populateExcelExport(GENERIC_REFURB_DEAL, { liveBoeBaseRate: 0.0525 });
    expect(result.template.template).toBe("Refurb Deal");
    expect(result.costBasis.refurbLevel).toBe("Mid");

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);
    const refurb = wb.getWorksheet("Refurb Deal")!;
    expect(refurb.getCell("B10").value).toBe(3_000_000);
    expect(refurb.getCell("B7").value).toBe(25_000);
    // Broken $B$B57 formula rewritten
    const b58 = refurb.getCell("B58").value as { formula?: string } | null;
    expect(b58!.formula).toBe("B56-B57");
  }, 30_000);
});
