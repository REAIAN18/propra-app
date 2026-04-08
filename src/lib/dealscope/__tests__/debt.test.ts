/**
 * Wave S — debt layer unit test.
 *
 * Locks in computeDebtLayer behaviour:
 *   - Uses live BoE base + 175bps when supplied
 *   - Falls back to SCOUT_FINANCING.annualRate when no BoE rate
 *   - Computes amortising annual debt service > 0
 *   - DSCR = NOI / annualDebtService when both present, else null
 *   - Returns null on missing/zero price
 */

import { computeDebtLayer } from "@/lib/dealscope/debt";

describe("computeDebtLayer", () => {
  it("returns null when price is missing", () => {
    expect(computeDebtLayer(null, 50_000, 5.25)).toBeNull();
    expect(computeDebtLayer(0, 50_000, 5.25)).toBeNull();
  });

  it("uses live BoE base + 175bps spread when supplied", () => {
    const d = computeDebtLayer(1_000_000, 60_000, 5.25)!;
    expect(d.baseRate).toBeCloseTo(0.0525, 6);
    expect(d.spreadBps).toBe(175);
    expect(d.allInRate).toBeCloseTo(0.0525 + 0.0175, 6);
    expect(d.rateSource).toBe("live_boe");
  });

  it("falls back to scout default when BoE rate unavailable", () => {
    const d = computeDebtLayer(1_000_000, 60_000, null)!;
    expect(d.baseRate).toBeNull();
    expect(d.rateSource).toBe("scout_default");
    expect(d.allInRate).toBeGreaterThan(0);
  });

  it("computes positive amortising debt service and equity = price - loan", () => {
    const d = computeDebtLayer(1_000_000, 60_000, 5.25)!;
    expect(d.loanAmount).toBe(650_000); // 65% LTV
    expect(d.equityRequired).toBe(350_000);
    expect(d.annualDebtService).toBeGreaterThan(0);
    expect(d.dscr).toBeCloseTo(60_000 / d.annualDebtService, 4);
  });

  it("DSCR is null when NOI is missing or zero", () => {
    const d = computeDebtLayer(1_000_000, null, 5.25)!;
    expect(d.dscr).toBeNull();
    const d2 = computeDebtLayer(1_000_000, 0, 5.25)!;
    expect(d2.dscr).toBeNull();
  });
});
