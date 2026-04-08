/**
 * Wave T — template selector unit test.
 *
 * Locks in the decision tree: Multi-Unit → Development → Refurb → Income.
 */

import { selectExcelTemplate } from "@/lib/dealscope/exports/select-excel-template";

describe("selectExcelTemplate", () => {
  it("picks Multi-Unit for residential with >1 units", () => {
    const r = selectExcelTemplate({ assetType: "Multifamily", unitCount: 5 });
    expect(r.template).toBe("Multi-Unit Deal");
    expect(r.reason).toMatch(/5 units/);
  });

  it("picks Development when condition is groundup", () => {
    const r = selectExcelTemplate({ assetType: "Office", condition: "groundup", buildingSizeSqft: 50000 });
    expect(r.template).toBe("Development Deal");
  });

  it("picks Development when no sqft and no refurb capex", () => {
    const r = selectExcelTemplate({ assetType: "Office" });
    expect(r.template).toBe("Development Deal");
  });

  it("picks Refurb on unrefurbished condition", () => {
    const r = selectExcelTemplate({ assetType: "Office", condition: "unrefurbished", buildingSizeSqft: 30000 });
    expect(r.template).toBe("Refurb Deal");
  });

  it("picks Refurb when refurb capex present", () => {
    const r = selectExcelTemplate({
      assetType: "Office",
      buildingSizeSqft: 30000,
      refurbCapexTotal: 450_000,
    });
    expect(r.template).toBe("Refurb Deal");
    expect(r.reason).toMatch(/450/);
  });

  it("picks Refurb on MEES signal", () => {
    const r = selectExcelTemplate({ assetType: "Office", buildingSizeSqft: 30000, signals: ["mees"] });
    expect(r.template).toBe("Refurb Deal");
  });

  it("picks Income for stabilized commercial by default", () => {
    const r = selectExcelTemplate({
      assetType: "Multi-Let Office",
      buildingSizeSqft: 40000,
      condition: "refurbished",
    });
    expect(r.template).toBe("Income Deal");
  });
});
