/**
 * Wave S — environmental snapshot unit test.
 *
 * Locks in Wave L honest-mode contract:
 *   - Live flood + EPC are flagged "live" when present, "missing" when absent
 *   - Contamination / radon / mining are always "uncommissioned" (no free feeds)
 *   - MEES note fires for F/G ratings and only for F/G
 */

import { buildEnvironmentalSnapshot } from "@/lib/dealscope/environmental";

describe("buildEnvironmentalSnapshot", () => {
  it("flags both flood and EPC as live when both present", () => {
    const snap = buildEnvironmentalSnapshot(
      { inFloodZone: false, riverFloodRisk: "Low", floodZone: "Zone 1", summary: "ok" },
      { epcRating: "B", expiryDate: "2030-01-01" },
    );
    expect(snap.flood.status).toBe("live");
    expect(snap.epc.status).toBe("live");
    expect(snap.epc.rating).toBe("B");
    expect(snap.epc.meesRisk).toBe(false);
    expect(snap.epc.meesNote).toMatch(/MEES/);
  });

  it("flags MEES risk for F/G ratings", () => {
    const f = buildEnvironmentalSnapshot(null, { epcRating: "F" });
    expect(f.epc.meesRisk).toBe(true);
    expect(f.epc.meesNote).toMatch(/cannot be let after/i);
    const g = buildEnvironmentalSnapshot(null, { epcRating: "G" });
    expect(g.epc.meesRisk).toBe(true);
  });

  it("E rating clears MEES floor but flags 2030 EPC C target", () => {
    const e = buildEnvironmentalSnapshot(null, { epcRating: "E" });
    expect(e.epc.meesRisk).toBe(false);
    expect(e.epc.meesNote).toMatch(/2030/);
  });

  it("flags missing data as 'missing' rather than fabricating", () => {
    const snap = buildEnvironmentalSnapshot(null, null);
    expect(snap.flood.status).toBe("missing");
    expect(snap.epc.status).toBe("missing");
    expect(snap.flood.inFloodZone).toBeNull();
    expect(snap.epc.rating).toBeNull();
  });

  it("always marks contamination/radon/mining as uncommissioned", () => {
    const snap = buildEnvironmentalSnapshot({ inFloodZone: false }, { epcRating: "C" });
    expect(snap.contamination.status).toBe("uncommissioned");
    expect(snap.radon.status).toBe("uncommissioned");
    expect(snap.mining.status).toBe("uncommissioned");
  });
});
