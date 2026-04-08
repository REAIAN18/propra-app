/**
 * Wave T — cost-library unit test.
 *
 * Locks in the defensible-assumptions contract:
 *   - Postcode → region mapping covers London / SE / Midlands / North
 *   - Asset normaliser collapses listing jargon into the 5 canonical classes
 *   - lookupCostBasis returns a provenance string every caller can render
 *   - Financing row falls through correctly for prime vs secondary
 */

import {
  postcodeToRegion,
  normaliseAsset,
  lookupCostBasis,
  pickFinancingRow,
  GROUNDUP_PSF,
  REFURB_PSF,
} from "@/lib/dealscope/exports/cost-library";

describe("postcodeToRegion", () => {
  it("maps London outcodes to London", () => {
    expect(postcodeToRegion("EC1A 1BB")).toBe("London");
    expect(postcodeToRegion("W1A 0AX")).toBe("London");
    expect(postcodeToRegion("SE1 9SG")).toBe("London");
    expect(postcodeToRegion("E14 5AB")).toBe("London");
  });
  it("maps SE and home counties to SE", () => {
    expect(postcodeToRegion("SS14 3HA")).toBe("SE"); // Basildon — the live test
    expect(postcodeToRegion("CM1 1AA")).toBe("SE");
    expect(postcodeToRegion("RG1 1AA")).toBe("SE");
  });
  it("maps Midlands outcodes to Midlands", () => {
    expect(postcodeToRegion("B1 1AA")).toBe("Midlands");
    expect(postcodeToRegion("NG1 1AA")).toBe("Midlands");
  });
  it("falls back to North for unknown", () => {
    expect(postcodeToRegion("M1 1AA")).toBe("North");
    expect(postcodeToRegion(null)).toBe("SE"); // safe default
  });
});

describe("normaliseAsset", () => {
  it("maps common listing strings to canonical classes", () => {
    expect(normaliseAsset("Multi-Let Office")).toBe("Office");
    expect(normaliseAsset("Industrial")).toBe("Industrial");
    expect(normaliseAsset("warehouse / logistics")).toBe("Industrial");
    expect(normaliseAsset("High street retail")).toBe("Retail");
    expect(normaliseAsset("BTL")).toBe("Multifamily");
    expect(normaliseAsset(undefined)).toBe("Office");
  });
});

describe("pickFinancingRow", () => {
  it("picks prime vs secondary by flag", () => {
    expect(pickFinancingRow("Office", true).key).toBe("Prime Office");
    expect(pickFinancingRow("Office", false).key).toBe("Secondary Office");
    expect(pickFinancingRow("Industrial", true).key).toBe("Industrial Prime");
    expect(pickFinancingRow("Multifamily", true).key).toBe("Multifamily/BTL");
  });
});

describe("lookupCostBasis", () => {
  it("returns region + asset matching the library sheet", () => {
    const basis = lookupCostBasis({
      assetType: "Multi-Let Office",
      postcode: "SS14 3HA", // Basildon → SE
      refurbLevel: "Mid",
    });
    expect(basis.asset).toBe("Office");
    expect(basis.region).toBe("SE");
    expect(basis.groundUpPsf).toBe(GROUNDUP_PSF.Office.SE);
    expect(basis.refurbPsf).toBe(REFURB_PSF.Office.Mid.SE);
    expect(basis.provenance).toMatch(/Office/);
    expect(basis.provenance).toMatch(/SE/);
    expect(basis.provenance).toMatch(/Mid/);
  });
  it("emits ground-up provenance when refurbLevel absent", () => {
    const basis = lookupCostBasis({
      assetType: "Industrial",
      postcode: "EC1A 1BB",
      refurbLevel: null,
    });
    expect(basis.region).toBe("London");
    expect(basis.refurbPsf).toBeNull();
    expect(basis.provenance).toMatch(/Ground-up baseline/);
  });
});
