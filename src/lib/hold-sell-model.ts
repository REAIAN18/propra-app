/**
 * src/lib/hold-sell-model.ts
 * Hold vs Sell DCF model for RealHQ Wave 2.
 * Pure TypeScript — no external dependencies beyond avm.ts.
 *
 * Import and call from: GET /api/user/hold-sell-scenarios (route upgrade)
 */

import { calculateNPV, calculateIRR, getFallbackCapRate } from "@/lib/avm";

// ---------------------------------------------------------------------------
// TYPES — INPUTS
// ---------------------------------------------------------------------------

export interface HoldInputs {
  /** Current market / AVM value of the asset (equity outlay reference), £/$ */
  currentValue: number;
  /** Annual passing rent as of today, £/$ */
  passingRent: number;
  /** Market ERV (estimated rental value). Used as stabilised income target. */
  marketERV: number;
  /** Vacancy allowance as a fraction of gross rent (default 0.05 = 5%) */
  vacancyAllowance: number;
  /** Operating costs as a fraction of effective gross rent (default 0.15) */
  opexPct: number;
  /** Annual rental growth rate, decimal (default 0.025 = 2.5%/yr) */
  rentGrowthPct: number;
  /** Annual capex budget, absolute £/$ (default 0) */
  capexAnnual: number;
  /** Exit cap rate at end of hold period (decimal, e.g. 0.055) */
  exitYield: number;
  /** Hold period in years (typically 5 or 10) */
  holdPeriodYears: number;
  /** Required return / WACC for NPV discounting (default 0.08 = 8%) */
  discountRate: number;
}

export interface SellInputs {
  /** Current market value (equity outlay reference for comparison), £/$ */
  currentValue: number;
  /** Anticipated gross sale price (may differ from currentValue), £/$ */
  estimatedSalePrice: number;
  /** Selling costs as a fraction of sale price (default 0.02 = 2% agent + legal) */
  sellingCostsPct: number;
  /** Assumed annual yield on reinvested net sale proceeds (default 0.06) */
  redeploymentYield: number;
  /** Annual income growth on reinvested capital (default 0.025) */
  redeploymentGrowthPct: number;
  /** Comparison period — must match holdPeriodYears for a fair NPV comparison */
  holdPeriodYears: number;
  /** Discount rate (should match HoldInputs.discountRate) */
  discountRate: number;
}

// ---------------------------------------------------------------------------
// TYPES — RESULTS
// ---------------------------------------------------------------------------

export interface HoldResult {
  /** Year-by-year cash flows. Index 0 = initial outlay (negative). */
  cashFlows: number[];
  /** Net Present Value at discountRate */
  npv: number;
  /** Internal Rate of Return (decimal, e.g. 0.08 = 8%) */
  irr: number;
  /** Total undiscounted return / initial equity */
  equityMultiple: number;
  /** Year-1 cash-on-cash yield as a percentage (e.g. 5.2 = 5.2%) */
  cashYield: number;
}

export interface SellResult {
  /** Net proceeds after selling costs */
  netProceeds: number;
  /** NPV of reinvesting net proceeds at redeploymentYield over the comparison period */
  redeployedNPV: number;
  /** IRR of the sell + reinvest scenario */
  irr: number;
  /** Total undiscounted return / original equity base */
  equityMultiple: number;
  /** For rationale string generation */
  redeploymentYield: number;
}

export interface RecommendationResult {
  recommendation: "hold" | "sell" | "review";
  rationale: string;
  confidenceScore: number;
}

/** Minimal asset shape needed for recommendation confidence scoring. */
export interface AssetDataForRecommendation {
  marketCapRate: number | null;
  passingRent: number | null;
  netIncome: number | null;
}

// ---------------------------------------------------------------------------
// HOLD SCENARIO — 10-YEAR DCF
// ---------------------------------------------------------------------------

/**
 * Model a hold scenario over holdPeriodYears.
 *
 * Cash flow construction:
 * - Year 0: initial equity outlay (-currentValue)
 * - Years 1..N-1: annual net income = stabilised rent × (1 + g)^(y-1) × (1 - vacancy) × (1 - opex) - capex
 * - Year N: same income + terminal value = final-year NOI / exitYield
 *
 * Rent stabilisation: year-1 income is max(passingRent, marketERV × 0.95)
 * to reflect that below-market leases converge toward ERV at next rent review.
 */
export function calculateHoldScenario(inputs: HoldInputs): HoldResult {
  const {
    currentValue, passingRent, marketERV,
    vacancyAllowance, opexPct, rentGrowthPct,
    capexAnnual, exitYield, holdPeriodYears, discountRate,
  } = inputs;

  const cashFlows: number[] = [-currentValue];

  // Stabilise to ERV: if passing rent is below 95% of ERV, assume it steps up
  const baseRent = Math.max(passingRent, marketERV * 0.95);

  for (let y = 1; y <= holdPeriodYears; y++) {
    const rentY    = baseRent * Math.pow(1 + rentGrowthPct, y - 1);
    const netRentY = rentY * (1 - vacancyAllowance) * (1 - opexPct);
    const annualCF = netRentY - capexAnnual;

    if (y < holdPeriodYears) {
      cashFlows.push(annualCF);
    } else {
      // Terminal year: add exit value = final-year NOI / exitYield
      const finalNOI     = rentY * (1 - vacancyAllowance) * (1 - opexPct);
      const terminalValue = finalNOI / exitYield;
      cashFlows.push(annualCF + terminalValue);
    }
  }

  const npv            = calculateNPV(cashFlows, discountRate);
  const irr            = calculateIRR(cashFlows);
  const totalReturn    = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const equityMultiple = totalReturn / currentValue;
  const cashYield      = (cashFlows[1] / currentValue) * 100;  // yr-1 cash-on-cash %

  return { cashFlows, npv, irr, equityMultiple, cashYield };
}

// ---------------------------------------------------------------------------
// SELL SCENARIO — SELL AND REINVEST
// ---------------------------------------------------------------------------

/**
 * Model a sell + reinvest scenario.
 *
 * The "sell" scenario answers: if the owner sold today and reinvested the net
 * proceeds at redeploymentYield, how does that compare to holding?
 *
 * Cash flow construction (same comparison period as hold):
 * - Year 0: initial equity outlay (-currentValue) — same reference point
 * - Years 1..N-1: income = netProceeds × redeploymentYield × (1 + g)^(y-1)
 * - Year N: same income + return of capital (netProceeds) as terminal value
 */
export function calculateSellScenario(inputs: SellInputs): SellResult {
  const {
    currentValue, estimatedSalePrice, sellingCostsPct,
    redeploymentYield, redeploymentGrowthPct,
    holdPeriodYears, discountRate,
  } = inputs;

  const netProceeds  = estimatedSalePrice * (1 - sellingCostsPct);
  const annualIncome = netProceeds * redeploymentYield;

  const cashFlows: number[] = [-currentValue];  // equity base = currentValue for fair comparison

  for (let y = 1; y <= holdPeriodYears; y++) {
    const incomeY = annualIncome * Math.pow(1 + redeploymentGrowthPct, y - 1);
    if (y < holdPeriodYears) {
      cashFlows.push(incomeY);
    } else {
      // Terminal year: income + return of reinvested capital
      cashFlows.push(incomeY + netProceeds);
    }
  }

  const redeployedNPV  = calculateNPV(cashFlows, discountRate);
  const irr            = calculateIRR(cashFlows);
  const totalReturn    = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const equityMultiple = totalReturn / currentValue;

  return { netProceeds, redeployedNPV, irr, equityMultiple, redeploymentYield };
}

// ---------------------------------------------------------------------------
// RECOMMENDATION LOGIC
// ---------------------------------------------------------------------------

/**
 * Derive a hold / sell / review recommendation from the two scenario results.
 *
 * Rules:
 * - "sell"  — sell IRR exceeds hold IRR by >2pp AND sell NPV > hold NPV
 * - "hold"  — hold IRR exceeds sell IRR by >1pp AND hold NPV > sell NPV
 * - "review" — scenarios are within the above thresholds (inconclusive)
 *
 * Confidence score reflects data quality:
 * - 0.9 — marketCapRate + passingRent both present
 * - 0.7 — marketCapRate present, no passing rent
 * - 0.6 — netIncome present, no market cap rate
 * - 0.4 — estimated from fallback cap rate only
 */
export function deriveRecommendation(
  hold: HoldResult,
  sell: SellResult,
  asset: AssetDataForRecommendation
): RecommendationResult {
  const confidence =
    asset.marketCapRate && asset.passingRent ? 0.9 :
    asset.marketCapRate                       ? 0.7 :
    asset.netIncome                           ? 0.6 : 0.4;

  const irrGap = sell.irr - hold.irr;   // positive = sell is better

  let recommendation: "hold" | "sell" | "review";
  if (irrGap > 0.02 && sell.redeployedNPV > hold.npv) {
    recommendation = "sell";
  } else if (irrGap < -0.01 && hold.npv > sell.redeployedNPV) {
    recommendation = "hold";
  } else {
    recommendation = "review";
  }

  const fmt = {
    pct:  (v: number) => `${(v * 100).toFixed(1)}%`,
    pp:   (v: number) => `${(Math.abs(v) * 100).toFixed(1)}pp`,
    gbp:  (v: number) => `£${(v / 1000).toFixed(0)}k`,
  };

  const rationale: Record<"hold" | "sell" | "review", string> = {
    hold: `Hold IRR (${fmt.pct(hold.irr)}) exceeds exit scenario (${fmt.pct(sell.irr)}). Asset income growth and terminal value support continued ownership.`,
    sell: `Exit IRR (${fmt.pct(sell.irr)}) exceeds hold IRR (${fmt.pct(hold.irr)}) by ${fmt.pp(irrGap)}. Net proceeds of ${fmt.gbp(sell.netProceeds)} reinvested at ${fmt.pct(sell.redeploymentYield)} create superior risk-adjusted returns.`,
    review: `Hold and exit scenarios are comparable (IRR gap: ${fmt.pp(irrGap)}). Recommend reviewing in 6 months or when a specific exit catalyst emerges.`,
  };

  return { recommendation, rationale: rationale[recommendation], confidenceScore: confidence };
}

// ---------------------------------------------------------------------------
// DEFAULT INPUTS — for route use
// ---------------------------------------------------------------------------

/**
 * Returns sensible default HoldInputs for an asset when no stored assumptions exist.
 * Route should call this when `holdSellScenario` is null for an asset.
 */
export function defaultHoldInputs(
  currentValue: number,
  passingRent: number,
  marketERV: number,
  assetType: string | null,
  country: string | null
): HoldInputs {
  const marketCapRate = getFallbackCapRate(country, assetType);
  return {
    currentValue,
    passingRent,
    marketERV,
    vacancyAllowance: 0.05,
    opexPct: 0.15,
    rentGrowthPct: 0.025,
    capexAnnual: 0,
    exitYield: marketCapRate,
    holdPeriodYears: 10,
    discountRate: 0.08,
  };
}

/**
 * Returns sensible default SellInputs for an asset when no stored assumptions exist.
 */
export function defaultSellInputs(
  currentValue: number,
  holdPeriodYears: number
): SellInputs {
  return {
    currentValue,
    estimatedSalePrice: currentValue * 1.03,  // assume small negotiated premium
    sellingCostsPct: 0.02,
    redeploymentYield: 0.06,
    redeploymentGrowthPct: 0.025,
    holdPeriodYears,
    discountRate: 0.08,
  };
}
