/**
 * src/lib/scout-returns.ts
 * Calculate returns metrics for Scout deals using hold-sell-model.ts
 */

import { calculateHoldScenario, type HoldInputs } from "@/lib/hold-sell-model";

export interface DealReturnsMetrics {
  capRate: number | null;
  noi: number | null;
  irr5yr: number | null; // as percentage e.g. 11.8
  cashOnCash: number | null; // as percentage e.g. 8.4
  equityMultiple: number | null; // as multiplier e.g. 1.72
  equityNeeded: number | null; // absolute amount
}

export interface DealForReturns {
  askingPrice: number | null;
  guidePrice: number | null;
  capRate: number | null;
  noi?: number | null;
  assetType: string;
  currency: string;
}

/**
 * Calculate returns metrics for a Scout deal.
 * Uses hold-sell-model.ts for IRR, cash-on-cash, and equity multiple.
 *
 * Assumptions:
 * - 5-year hold period
 * - 65% LTV financing (35% equity)
 * - 2.5% annual rent growth
 * - 5% vacancy allowance
 * - 15% opex ratio
 * - Exit cap rate = entry cap rate
 */
export function calculateDealReturns(deal: DealForReturns): DealReturnsMetrics {
  const price = deal.askingPrice ?? deal.guidePrice;
  const capRate = deal.capRate;

  // If no price or cap rate, return nulls
  if (!price || !capRate) {
    return {
      capRate: capRate,
      noi: deal.noi ?? null,
      irr5yr: null,
      cashOnCash: null,
      equityMultiple: null,
      equityNeeded: price ? price * 0.35 : null, // 35% equity = 65% LTV
    };
  }

  // Calculate NOI from cap rate if not provided
  const noi = deal.noi ?? (price * capRate) / 100;

  // Calculate equity needed (35% of price for 65% LTV)
  const equityNeeded = price * 0.35;

  // Build hold scenario inputs
  const passingRent = noi; // Assume NOI approximates passing rent (simplified)
  const marketERV = noi * 1.05; // Assume 5% upside to market ERV

  const holdInputs: HoldInputs = {
    currentValue: equityNeeded, // We're analyzing from equity investment perspective
    passingRent,
    marketERV,
    vacancyAllowance: 0.05, // 5%
    opexPct: 0.15, // 15%
    rentGrowthPct: 0.025, // 2.5% p.a.
    capexAnnual: price * 0.005, // 0.5% of price annually
    exitYield: capRate / 100, // Exit at same cap rate as entry
    holdPeriodYears: 5,
    discountRate: 0.08, // 8% discount rate
  };

  try {
    const holdResult = calculateHoldScenario(holdInputs);

    return {
      capRate,
      noi,
      irr5yr: holdResult.irr * 100, // Convert to percentage
      cashOnCash: holdResult.cashYield, // Already in percentage
      equityMultiple: holdResult.equityMultiple,
      equityNeeded,
    };
  } catch (error) {
    // If calculation fails, return basic metrics
    console.error("Failed to calculate deal returns:", error);
    return {
      capRate,
      noi,
      irr5yr: null,
      cashOnCash: null,
      equityMultiple: null,
      equityNeeded,
    };
  }
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number | null, currency: string): string {
  if (value === null || value === undefined) return "—";

  const symbol = currency === "GBP" ? "£" : "$";

  if (value >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(0)}k`;
  }
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number | null, decimals: number = 1): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format multiplier for display
 */
export function formatMultiplier(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}×`;
}

/**
 * Determine if a return metric is "good", "neutral", or "bad"
 * Used for color coding in the UI
 */
export function classifyReturn(metric: "irr" | "coc" | "multiple", value: number | null): "good" | "neutral" | "bad" {
  if (value === null || value === undefined) return "neutral";

  switch (metric) {
    case "irr":
      if (value >= 12) return "good";
      if (value >= 8) return "neutral";
      return "bad";

    case "coc":
      if (value >= 8) return "good";
      if (value >= 5) return "neutral";
      return "bad";

    case "multiple":
      if (value >= 1.6) return "good";
      if (value >= 1.3) return "neutral";
      return "bad";

    default:
      return "neutral";
  }
}
