/**
 * src/lib/dealscope/exports/cost-library.ts
 *
 * Wave T — TypeScript mirror of CRE_Backend_Cost_Library_2026.xlsx so the
 * appraisal exporter can pick a defensible cost basis for any UK deal
 * deterministically without re-parsing the workbook on every request.
 *
 * Source data: cost-library.xlsx (REFURB_OFFICE, GROUNDUP_OFFICE,
 * REFURB_RESIDENTIAL, GROUNDUP_RESIDENTIAL, REGIONAL_MULTIPLIERS, SOFT_COSTS,
 * FINANCING_DEFAULTS sheets). Mirrored 2025-2026 ranges.
 *
 * Honest-mode contract: every lookup returns a `provenance` string the
 * exporter writes alongside the value so the user can see exactly which
 * library row drove the assumption.
 */

export type UkRegion = "London" | "SE" | "Midlands" | "North";
export type AssetClass = "Office" | "Industrial" | "Retail" | "Residential" | "Multifamily";
export type RefurbLevel = "Light" | "Mid" | "Full" | "Premium";

// ── Region detection ─────────────────────────────────────────────────────────
// Area code = the letter-only prefix of the outcode (e.g. "EC1A" → "EC",
// "SS14" → "SS"). We classify on that.
const LONDON_AREAS = new Set(["E", "EC", "N", "NW", "SE", "SW", "W", "WC"]);
const SE_AREAS = new Set(["AL","BN","BR","CB","CM","CO","CR","CT","DA","EN","GU","HA","HP","IG","KT","LU","ME","MK","OX","PO","RG","RH","RM","SG","SL","SM","SO","SS","TN","TW","UB","WD"]);
const MIDLANDS_AREAS = new Set(["B","CV","DE","DN","DY","HR","LE","LN","NG","NN","PE","ST","TF","WR","WS","WV"]);

export function postcodeToRegion(postcode?: string | null): UkRegion {
  if (!postcode) return "SE";
  const out = postcode.trim().toUpperCase().split(/\s+/)[0];
  // Extract leading letters only (before the first digit).
  const area = out.match(/^[A-Z]+/)?.[0] ?? "";
  if (LONDON_AREAS.has(area)) return "London";
  if (SE_AREAS.has(area)) return "SE";
  if (MIDLANDS_AREAS.has(area)) return "Midlands";
  return "North";
}

// ── Ground-up build costs (£/sqft) ───────────────────────────────────────────
// Mirrors GROUNDUP_OFFICE / GROUNDUP_INDUSTRIAL / GROUNDUP_RESIDENTIAL sheets.
export const GROUNDUP_PSF: Record<AssetClass, Record<UkRegion, number>> = {
  Office:       { London: 350, SE: 300, Midlands: 280, North: 240 },
  Industrial:   { London: 150, SE: 130, Midlands: 120, North: 100 },
  Retail:       { London: 280, SE: 250, Midlands: 220, North: 180 },
  Residential:  { London: 220, SE: 180, Midlands: 150, North: 120 },
  Multifamily:  { London: 270, SE: 230, Midlands: 200, North: 170 },
};

// ── Refurbishment costs (£/sqft) ─────────────────────────────────────────────
// Mirrors REFURB_OFFICE / REFURB_RESIDENTIAL sheets, regionally adjusted.
export const REFURB_PSF: Record<AssetClass, Record<RefurbLevel, Record<UkRegion, number>>> = {
  Office: {
    Light:   { London: 40,  SE: 35,  Midlands: 32,  North: 30 },
    Mid:     { London: 75,  SE: 65,  Midlands: 60,  North: 55 },
    Full:    { London: 120, SE: 100, Midlands: 92,  North: 85 },
    Premium: { London: 160, SE: 130, Midlands: 118, North: 110 },
  },
  Industrial: {
    Light:   { London: 25,  SE: 22,  Midlands: 20,  North: 18 },
    Mid:     { London: 50,  SE: 45,  Midlands: 40,  North: 35 },
    Full:    { London: 90,  SE: 80,  Midlands: 72,  North: 65 },
    Premium: { London: 120, SE: 105, Midlands: 95,  North: 85 },
  },
  Retail: {
    Light:   { London: 35,  SE: 30,  Midlands: 28,  North: 25 },
    Mid:     { London: 65,  SE: 58,  Midlands: 52,  North: 48 },
    Full:    { London: 120, SE: 105, Midlands: 95,  North: 85 },
    Premium: { London: 160, SE: 140, Midlands: 125, North: 115 },
  },
  Residential: {
    Light:   { London: 60,  SE: 50,  Midlands: 45,  North: 40 },
    Mid:     { London: 90,  SE: 78,  Midlands: 70,  North: 65 },
    Full:    { London: 130, SE: 115, Midlands: 105, North: 95 },
    Premium: { London: 180, SE: 155, Midlands: 140, North: 130 },
  },
  Multifamily: {
    Light:   { London: 55,  SE: 48,  Midlands: 42,  North: 38 },
    Mid:     { London: 85,  SE: 75,  Midlands: 68,  North: 62 },
    Full:    { London: 125, SE: 110, Midlands: 100, North: 90 },
    Premium: { London: 170, SE: 148, Midlands: 135, North: 125 },
  },
};

// ── Regional multipliers (informational, base = SE @ 1.00) ───────────────────
export const REGION_MULTIPLIER: Record<UkRegion, number> = {
  London: 1.6, SE: 1.0, Midlands: 0.85, North: 0.7,
};

// ── Soft cost percentages by asset class (mid-band) ──────────────────────────
// Mirrors SOFT_COSTS sheet. Returned as decimals.
export const SOFT_COST_PCT: Record<AssetClass, {
  design: number; engineering: number; pm: number; permits: number; site: number; contingency: number;
}> = {
  Office:      { design: 0.06, engineering: 0.035, pm: 0.045, permits: 0.015, site: 0.015, contingency: 0.11 },
  Industrial:  { design: 0.025, engineering: 0.025, pm: 0.025, permits: 0.0075, site: 0.015, contingency: 0.09 },
  Retail:      { design: 0.045, engineering: 0.025, pm: 0.035, permits: 0.015, site: 0.0075, contingency: 0.11 },
  Residential: { design: 0.045, engineering: 0.025, pm: 0.035, permits: 0.0175, site: 0.0075, contingency: 0.11 },
  Multifamily: { design: 0.045, engineering: 0.025, pm: 0.035, permits: 0.0175, site: 0.0075, contingency: 0.11 },
};

// ── Financing defaults (UK) ──────────────────────────────────────────────────
// Mirrors FINANCING_DEFAULTS sheet. Rates here are placeholder; the live BoE
// base + 175bps spread (Wave P) overrides them in the populator when
// available.
export interface FinancingDefault {
  ltv: number;
  dscrMin: number;
  ratePa: number;
  termYrs: number;
  lenderType: string;
  riskLevel: string;
}

export const FINANCING_DEFAULTS: Record<string, FinancingDefault> = {
  "Prime Office":         { ltv: 0.70, dscrMin: 1.25, ratePa: 0.060, termYrs: 12, lenderType: "Bank",     riskLevel: "Low" },
  "Secondary Office":     { ltv: 0.65, dscrMin: 1.30, ratePa: 0.065, termYrs: 10, lenderType: "Bank",     riskLevel: "Medium" },
  "Industrial Prime":     { ltv: 0.70, dscrMin: 1.20, ratePa: 0.058, termYrs: 13, lenderType: "Life Co",  riskLevel: "Low" },
  "Industrial Secondary": { ltv: 0.65, dscrMin: 1.25, ratePa: 0.063, termYrs: 10, lenderType: "Bank",     riskLevel: "Medium" },
  "Retail Prime":         { ltv: 0.60, dscrMin: 1.35, ratePa: 0.068, termYrs: 10, lenderType: "Bank",     riskLevel: "High" },
  "Multifamily/BTL":      { ltv: 0.75, dscrMin: 1.25, ratePa: 0.065, termYrs: 17, lenderType: "Bank/Life",riskLevel: "Low-Med" },
  "Development":          { ltv: 0.60, dscrMin: 1.30, ratePa: 0.070, termYrs: 2,  lenderType: "Bridge",   riskLevel: "High" },
};

export function pickFinancingRow(asset: AssetClass, prime: boolean): { key: string; row: FinancingDefault } {
  if (asset === "Office")      return { key: prime ? "Prime Office" : "Secondary Office", row: FINANCING_DEFAULTS[prime ? "Prime Office" : "Secondary Office"] };
  if (asset === "Industrial")  return { key: prime ? "Industrial Prime" : "Industrial Secondary", row: FINANCING_DEFAULTS[prime ? "Industrial Prime" : "Industrial Secondary"] };
  if (asset === "Retail")      return { key: "Retail Prime", row: FINANCING_DEFAULTS["Retail Prime"] };
  if (asset === "Multifamily" || asset === "Residential") return { key: "Multifamily/BTL", row: FINANCING_DEFAULTS["Multifamily/BTL"] };
  return { key: "Secondary Office", row: FINANCING_DEFAULTS["Secondary Office"] };
}

// ── Asset-class normaliser ───────────────────────────────────────────────────
const ASSET_MAP: Record<string, AssetClass> = {
  office: "Office", offices: "Office", "multi-let office": "Office",
  industrial: "Industrial", warehouse: "Industrial", logistics: "Industrial",
  retail: "Retail", shop: "Retail", "high street": "Retail",
  residential: "Residential", flat: "Residential", apartment: "Residential",
  multifamily: "Multifamily", btl: "Multifamily", hmo: "Multifamily", "build to rent": "Multifamily",
};

export function normaliseAsset(input?: string | null): AssetClass {
  if (!input) return "Office";
  const k = input.trim().toLowerCase();
  return ASSET_MAP[k] ?? (k.includes("indust") || k.includes("warehouse") ? "Industrial"
    : k.includes("retail") || k.includes("shop") ? "Retail"
    : k.includes("resid") ? "Residential"
    : k.includes("multifam") || k.includes("btl") ? "Multifamily"
    : "Office");
}

// ── Top-level lookup with provenance ─────────────────────────────────────────
export interface CostBasisLookup {
  asset: AssetClass;
  region: UkRegion;
  refurbLevel: RefurbLevel | null;
  groundUpPsf: number;
  refurbPsf: number | null;
  softCost: typeof SOFT_COST_PCT[AssetClass];
  financing: { key: string; row: FinancingDefault };
  provenance: string;
}

export function lookupCostBasis(input: {
  assetType?: string | null;
  postcode?: string | null;
  refurbLevel?: RefurbLevel | null;
  prime?: boolean;
}): CostBasisLookup {
  const asset = normaliseAsset(input.assetType);
  const region = postcodeToRegion(input.postcode);
  const refurbLevel = input.refurbLevel ?? null;
  const groundUpPsf = GROUNDUP_PSF[asset][region];
  const refurbPsf = refurbLevel ? REFURB_PSF[asset][refurbLevel][region] : null;
  const softCost = SOFT_COST_PCT[asset];
  const financing = pickFinancingRow(asset, input.prime ?? true);
  const provLines = [
    `Asset class → ${asset}`,
    `Region (postcode) → ${region}`,
    refurbLevel ? `Refurb level → ${refurbLevel} @ £${refurbPsf}/sqft` : `Ground-up baseline @ £${groundUpPsf}/sqft`,
    `Financing row → ${financing.key} (LTV ${(financing.row.ltv * 100).toFixed(0)}%, DSCR ${financing.row.dscrMin}×, ${(financing.row.ratePa * 100).toFixed(1)}%)`,
  ];
  return {
    asset, region, refurbLevel, groundUpPsf, refurbPsf, softCost, financing,
    provenance: provLines.join(" • "),
  };
}
