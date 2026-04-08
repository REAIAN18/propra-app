/**
 * Wave T hotfix — lettings-comps widening fallback test.
 *
 * Tests the pure `parsePostcode` helper with zero database dependency. The
 * full widening-stage search is exercised indirectly via the integration
 * path in enrich when run against a seeded Supabase instance.
 */

import { parsePostcode } from "@/lib/dealscope/lettings-comps";

describe("parsePostcode", () => {
  it("splits SS14 3HA into sector / outcode / area", () => {
    const p = parsePostcode("SS14 3HA");
    expect(p.sector).toBe("SS14 3");
    expect(p.outcode).toBe("SS14");
    expect(p.area).toBe("SS");
  });
  it("handles space-less input", () => {
    const p = parsePostcode("ss143ha");
    expect(p.sector).toBe("SS14 3");
    expect(p.outcode).toBe("SS14");
    expect(p.area).toBe("SS");
  });
  it("handles London outcodes (EC1A 1BB)", () => {
    const p = parsePostcode("EC1A 1BB");
    expect(p.sector).toBe("EC1A 1");
    expect(p.outcode).toBe("EC1A");
    expect(p.area).toBe("EC");
  });
  it("handles short area codes (B1 2AA)", () => {
    const p = parsePostcode("B1 2AA");
    expect(p.sector).toBe("B1 2");
    expect(p.outcode).toBe("B1");
    expect(p.area).toBe("B");
  });
});
