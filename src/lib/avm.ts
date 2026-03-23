/**
 * src/lib/avm.ts
 * Shared math library for RealHQ Wave 2.
 * Used by: AVM route, Hold vs Sell DCF, Scout underwriting.
 *
 * All functions are pure TypeScript — no external dependencies, no Prisma.
 * Import Prisma separately in the route/model files that call these.
 */

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface IncomeCapInputs {
  netIncome: number | null;       // Annual NOI from UserAsset.netIncome
  grossIncome: number | null;     // Fallback if netIncome null
  passingRent: number | null;     // Fallback: lease rent roll
  opexRatio: number;              // Default 0.30 gross lease; 0.12 NNN/FRI
  marketCapRate: number | null;   // From UserAsset.marketCapRate
  fallbackCapRate: number;        // From getFallbackCapRate()
  sqft: number | null;
  epcRating: string | null;       // Applies EPC penalty for UK assets
  wault: number | null;           // WAULT penalty for short leases
}

export interface IncomeCapResult {
  noiUsed: number;
  capRateUsed: number;
  capRateSource: "user_asset" | "market_benchmark";
  value: number;
  adjustments: { label: string; bps: number }[];
}

export interface PsfInputs {
  sqft: number;
  pricePerSqft: number | null;    // Median from PropertyComparable (ATTOM US / LR UK)
  p25PricePsf: number | null;
  p75PricePsf: number | null;
}

export interface BlendResult {
  avmValue: number | null;
  avmLow: number | null;
  avmHigh: number | null;
  confidenceScore: number;
  method: "blended" | "income_cap" | "psf_only" | "insufficient_data";
  dataSource: string;
}

// ---------------------------------------------------------------------------
// CAP RATE TABLE
// ---------------------------------------------------------------------------

/**
 * Fallback cap rates by region and asset type.
 * Used when UserAsset.marketCapRate is null.
 * Single source of truth — import this in Hold vs Sell and Scout underwriting
 * instead of maintaining separate hardcoded tables.
 */
const CAP_RATES: Record<"uk" | "us", Record<string, number>> = {
  uk: {
    industrial:  0.0525,
    warehouse:   0.0525,
    logistics:   0.0525,
    office:      0.0575,
    retail:      0.0650,
    flex:        0.0600,
    mixed:       0.0575,
    commercial:  0.0575,
  },
  us: {
    industrial:  0.0600,
    warehouse:   0.0600,
    logistics:   0.0580,
    office:      0.0725,
    retail:      0.0650,
    flex:        0.0650,
    mixed:       0.0650,
    commercial:  0.0650,
  },
};

/**
 * Returns the benchmark cap rate for an asset type + country.
 * Normalises asset type string to lower-case alpha for fuzzy matching.
 */
export function getFallbackCapRate(
  assetType: string | null,
  country: string | null
): number {
  const region = (country ?? "").toUpperCase() === "UK" ? "uk" : "us";
  const type = (assetType ?? "").toLowerCase().replace(/[^a-z]/g, "");
  for (const key of Object.keys(CAP_RATES[region])) {
    if (type.includes(key)) return CAP_RATES[region][key];
  }
  return CAP_RATES[region].mixed;
}

/**
 * Opex ratio by lease type (fraction of gross rent absorbed by operating costs).
 * NNN/FRI: tenant pays all outgoings → 12%.
 * Gross/inclusive: landlord pays rates, insurance, maintenance → 30%.
 */
export function deriveOpExRatio(assetType: string | null): number {
  const t = (assetType ?? "").toLowerCase();
  // NNN (US) and FRI (UK Full Repairing and Insuring) leases are net
  if (t.includes("nnn") || t.includes("fri") || t.includes("industrial") || t.includes("logistics") || t.includes("warehouse")) {
    return 0.12;
  }
  return 0.30;
}

// ---------------------------------------------------------------------------
// EPC AND WAULT ADJUSTMENTS
// ---------------------------------------------------------------------------

/** EPC rating → basis point premium to add to cap rate (UK only). */
const EPC_CAP_RATE_BPS: Record<string, number> = {
  A: -10,
  B: -5,
  C: 0,
  D: 15,
  E: 35,
  F: 60,
  G: 90,
};

/** WAULT (years) → basis point premium. Short WAULT = higher yield = lower value. */
function waultPremiumBps(wault: number): number {
  if (wault < 2)  return 75;
  if (wault < 4)  return 40;
  if (wault < 7)  return 15;
  return 0;
}

// ---------------------------------------------------------------------------
// INCOME CAPITALISATION
// ---------------------------------------------------------------------------

/**
 * Primary AVM method: capitalise NOI at an adjusted cap rate.
 * Returns null when insufficient income data exists to compute a NOI.
 *
 * EPC and WAULT adjustments increase the cap rate (decrease value) for
 * UK assets with poor energy performance or short remaining lease terms.
 */
export function calculateIncomeCap(inputs: IncomeCapInputs): IncomeCapResult | null {
  // Step 1: derive best NOI estimate
  const noi =
    inputs.netIncome ??
    (inputs.grossIncome != null
      ? inputs.grossIncome * (1 - inputs.opexRatio)
      : null) ??
    (inputs.passingRent != null
      ? inputs.passingRent * (1 - inputs.opexRatio)
      : null);

  if (noi == null || noi <= 0) return null;

  // Step 2: select base cap rate
  const baseCapRate = inputs.marketCapRate ?? inputs.fallbackCapRate;
  let adjustedCapRate = baseCapRate;
  const adjustments: { label: string; bps: number }[] = [];

  // WAULT adjustment
  if (inputs.wault != null) {
    const bps = waultPremiumBps(inputs.wault);
    if (bps > 0) {
      adjustedCapRate += bps / 10_000;
      adjustments.push({ label: `Short WAULT (${inputs.wault.toFixed(1)}yr)`, bps });
    }
  }

  // EPC adjustment
  if (inputs.epcRating) {
    const bps = EPC_CAP_RATE_BPS[inputs.epcRating.toUpperCase()] ?? 0;
    if (bps !== 0) {
      adjustedCapRate += bps / 10_000;
      adjustments.push({ label: `EPC ${inputs.epcRating.toUpperCase()} rating`, bps });
    }
  }

  const capRateSource: IncomeCapResult["capRateSource"] = inputs.marketCapRate
    ? "user_asset"
    : "market_benchmark";

  return {
    noiUsed: noi,
    capRateUsed: adjustedCapRate,
    capRateSource,
    value: noi / adjustedCapRate,
    adjustments,
  };
}

// ---------------------------------------------------------------------------
// PRICE PER SQFt
// ---------------------------------------------------------------------------

/**
 * Secondary AVM method: multiply median price-per-sqft from comparable sales
 * by the asset's gross floor area.
 *
 * NOTE: UK Land Registry PPD does not include sqft for commercial properties.
 * This method is only reliable for US assets with ATTOM comparables (≥2 comps).
 */
export function calculatePsfValue(
  inputs: PsfInputs
): { mid: number; low: number; high: number } | null {
  if (!inputs.pricePerSqft || inputs.sqft <= 0) return null;
  return {
    mid:  inputs.sqft * inputs.pricePerSqft,
    low:  inputs.sqft * (inputs.p25PricePsf ?? inputs.pricePerSqft * 0.88),
    high: inputs.sqft * (inputs.p75PricePsf ?? inputs.pricePerSqft * 1.12),
  };
}

// ---------------------------------------------------------------------------
// BLENDED AVM
// ---------------------------------------------------------------------------

/**
 * Blend income-cap and PSF values into a single AVM estimate.
 *
 * Blend rules:
 * - Both methods + ≥3 comps: 70% income cap / 30% PSF (blended)
 * - Income cap only: use income cap; confidence depends on cap rate source
 * - PSF only: use PSF; lower confidence
 * - Neither: insufficient_data
 */
export function blendValuation(
  incomeCap: IncomeCapResult | null,
  psf: { mid: number; low: number; high: number } | null,
  compsCount: number
): BlendResult {
  if (!incomeCap && !psf) {
    return {
      avmValue: null,
      avmLow: null,
      avmHigh: null,
      confidenceScore: 0,
      method: "insufficient_data",
      dataSource: "Insufficient data to compute valuation",
    };
  }

  if (incomeCap && psf && compsCount >= 3) {
    const avmValue = incomeCap.value * 0.7 + psf.mid * 0.3;
    const avmLow   = incomeCap.value * 0.92 * 0.7 + psf.low  * 0.3;
    const avmHigh  = incomeCap.value * 1.08 * 0.7 + psf.high * 0.3;
    return {
      avmValue,
      avmLow,
      avmHigh,
      confidenceScore: Math.min(0.9, 0.6 + compsCount * 0.03),
      method: "blended",
      dataSource: `Income capitalisation (${(incomeCap.capRateUsed * 100).toFixed(2)}% cap rate) blended with ${compsCount} comparable sales`,
    };
  }

  if (incomeCap) {
    const score = incomeCap.capRateSource === "user_asset" ? 0.65 : 0.45;
    return {
      avmValue: incomeCap.value,
      avmLow:   incomeCap.value * 0.90,
      avmHigh:  incomeCap.value * 1.10,
      confidenceScore: score,
      method: "income_cap",
      dataSource: `Income capitalisation at ${(incomeCap.capRateUsed * 100).toFixed(2)}% cap rate (${incomeCap.capRateSource})`,
    };
  }

  // PSF only
  return {
    avmValue: psf!.mid,
    avmLow:   psf!.low,
    avmHigh:  psf!.high,
    confidenceScore: Math.min(0.5, 0.25 + compsCount * 0.05),
    method: "psf_only",
    dataSource: `Capital value per sqft from ${compsCount} comparable sales`,
  };
}

// ---------------------------------------------------------------------------
// STATISTICS UTILITIES
// ---------------------------------------------------------------------------

/** Returns the median of a numeric array. Returns null for empty arrays. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Returns the p-th percentile of a numeric array (0–100).
 * Uses linear interpolation. Returns null for empty arrays.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ---------------------------------------------------------------------------
// DCF: NPV AND IRR
// ---------------------------------------------------------------------------

/**
 * Net Present Value of a cash flow series.
 *
 * @param cashFlows  Array of cash flows. Index 0 is the initial outlay
 *                   (negative for investments). Indices 1..n are annual flows.
 * @param rate       Annual discount rate (decimal, e.g. 0.08 = 8%).
 */
export function calculateNPV(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((acc, cf, t) => {
    return acc + cf / Math.pow(1 + rate, t);
  }, 0);
}

/**
 * Internal Rate of Return — the discount rate that makes NPV = 0.
 * Uses Newton-Raphson with up to 100 iterations.
 *
 * @param cashFlows  Same convention as calculateNPV.
 * @returns IRR as a decimal (e.g. 0.12 = 12%), or NaN if it doesn't converge.
 */
export function calculateIRR(cashFlows: number[]): number {
  // Require a sign change for IRR to exist
  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) return NaN;

  let rate = 0.1; // initial guess: 10%
  const MAX_ITER = 100;
  const TOLERANCE = 1e-7;

  for (let i = 0; i < MAX_ITER; i++) {
    const npv  = calculateNPV(cashFlows, rate);
    // Derivative of NPV with respect to rate
    const dnpv = cashFlows.reduce((acc, cf, t) => {
      return t === 0 ? acc : acc - (t * cf) / Math.pow(1 + rate, t + 1);
    }, 0);

    if (Math.abs(dnpv) < 1e-12) break; // avoid divide-by-zero

    const nextRate = rate - npv / dnpv;

    if (Math.abs(nextRate - rate) < TOLERANCE) return nextRate;
    rate = nextRate;
  }

  return rate;
}

// ---------------------------------------------------------------------------
// CONFIDENCE SCORE → UI LABEL
// ---------------------------------------------------------------------------

export type ConfidenceLabel = "High confidence" | "Moderate" | "Estimated" | "Indicative only";

/** Maps a 0–1 confidence score to a human-readable label for the AVM card. */
export function confidenceLabel(score: number): ConfidenceLabel {
  if (score >= 0.80) return "High confidence";
  if (score >= 0.60) return "Moderate";
  if (score >= 0.40) return "Estimated";
  return "Indicative only";
}

/** Maps a 0–1 confidence score to the colour hex used in the AVM card. */
export function confidenceColour(score: number): string {
  if (score >= 0.80) return "#0A8A4C"; // Green
  if (score >= 0.60) return "#F5A94A"; // Amber
  if (score >= 0.40) return "#1647E8"; // Blue
  return "#9CA3AF";                    // Grey
}
