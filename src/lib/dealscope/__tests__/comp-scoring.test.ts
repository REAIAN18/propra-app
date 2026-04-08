/**
 * Wave S — comp-scoring unit test.
 *
 * Locks in the Wave Q quality scoring contract: each comp gets a 0-100
 * score driven by recency, size match, and source weight, plus a
 * provenance stamp that the dossier always renders.
 */

import { scoreAndStampComps } from "@/lib/dealscope/comp-scoring";

describe("comp-scoring", () => {
  const today = new Date();
  const monthsAgo = (n: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - n);
    return d.toISOString().split("T")[0];
  };

  it("scores a fresh, exact-size, Land Registry comp near 100", () => {
    const [scored] = scoreAndStampComps(
      [{ address: "1 High St", price: 500_000, sqft: 5_000, date: monthsAgo(2), source: "Land Registry PPD" }],
      5_000,
    );
    expect(scored.score).toBeGreaterThanOrEqual(95);
    expect(scored.scoreBreakdown.recency).toBe(40);
    expect(scored.scoreBreakdown.size).toBe(30);
    expect(scored.scoreBreakdown.source).toBe(30);
    expect(scored.provenance.dataset).toMatch(/Land Registry/i);
  });

  it("penalises stale and size-mismatched comps", () => {
    const [scored] = scoreAndStampComps(
      [{ address: "Old Lane", price: 400_000, sqft: 12_000, date: monthsAgo(40), source: "Rightmove" }],
      5_000,
    );
    // 40mo = 0 recency, 140% delta = 0 size, Rightmove = 20 source → 20
    expect(scored.score).toBeLessThanOrEqual(25);
    expect(scored.provenance.source).toBe("Rightmove");
  });

  it("falls back to neutral size score when comp has no sqft", () => {
    const [scored] = scoreAndStampComps(
      [{ address: "Unknown", price: 250_000, date: monthsAgo(1), source: "Land Registry" }],
      5_000,
    );
    expect(scored.scoreBreakdown.size).toBe(10);
    expect(scored.scoreBreakdown.recency).toBe(40);
  });

  it("stamps provenance with retrievedAt date even on unknown source", () => {
    const [scored] = scoreAndStampComps(
      [{ address: "Mystery Plot", price: 100_000, sqft: 1_000, date: null, source: null }],
      1_000,
    );
    expect(scored.provenance.source).toMatch(/Unverified/);
    expect(scored.provenance.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
