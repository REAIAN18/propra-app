/**
 * src/lib/dealscope/debt.ts
 * Wave P — Debt layer.
 *
 * Builds a transparent senior-debt structure for a deal at SCOUT_FINANCING
 * defaults, with the all-in rate optionally pinned to the latest live BoE
 * Bank Rate (BoE base + 175 bps spread). DSCR is computed against a real NOI
 * — never fabricated.
 */

import { SCOUT_FINANCING, calculateAnnualDebtService } from "@/lib/data/scout-benchmarks";

const SPREAD_BPS = 175; // Bank Rate + 175bps senior spread (Q1 2026 Scout default)

export interface DebtStructure {
  ltvPct: number;
  loanAmount: number;
  equityRequired: number;
  baseRate: number | null; // BoE base rate as decimal (e.g. 0.0525 for 5.25%) or null
  spreadBps: number;
  allInRate: number; // decimal
  termYears: number;
  amortising: boolean;
  annualDebtService: number;
  dscr: number | null;
  rateSource: "live_boe" | "scout_default";
}

/**
 * Compute the debt structure for a property.
 * @param purchasePrice the deal asking price
 * @param noi annual net operating income (for DSCR)
 * @param liveBoeBaseRate optional latest BoE base rate (in % e.g. 5.25)
 */
export function computeDebtLayer(
  purchasePrice: number | null | undefined,
  noi: number | null | undefined,
  liveBoeBaseRate?: number | null,
): DebtStructure | null {
  if (!purchasePrice || purchasePrice <= 0) return null;

  const baseDecimal =
    liveBoeBaseRate != null && Number.isFinite(liveBoeBaseRate)
      ? liveBoeBaseRate / 100
      : null;

  // If we have a live BoE rate, use base + spread; otherwise fall back to the
  // SCOUT_FINANCING.annualRate constant (which already bakes in spread).
  const allInRate =
    baseDecimal != null
      ? baseDecimal + SPREAD_BPS / 10_000
      : SCOUT_FINANCING.annualRate;
  const rateSource: "live_boe" | "scout_default" = baseDecimal != null ? "live_boe" : "scout_default";

  const loanAmount = purchasePrice * SCOUT_FINANCING.ltvPct;
  const equityRequired = purchasePrice - loanAmount;

  // Annual debt service computed against the *effective* all-in rate so the
  // DSCR shifts when BoE moves. Mirrors calculateAnnualDebtService formula.
  const monthlyRate = allInRate / 12;
  const n = SCOUT_FINANCING.termYears * 12;
  const monthlyPmt =
    loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1);
  const annualDebtService = monthlyPmt * 12;

  const dscr = noi && noi > 0 && annualDebtService > 0 ? noi / annualDebtService : null;

  return {
    ltvPct: SCOUT_FINANCING.ltvPct,
    loanAmount,
    equityRequired,
    baseRate: baseDecimal,
    spreadBps: SPREAD_BPS,
    allInRate,
    termYears: SCOUT_FINANCING.termYears,
    amortising: SCOUT_FINANCING.amortising,
    annualDebtService,
    dscr,
    rateSource,
  };
}

// Re-export for callers that want the static helper
export { calculateAnnualDebtService };
