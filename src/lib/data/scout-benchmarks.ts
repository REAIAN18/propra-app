/**
 * src/lib/data/scout-benchmarks.ts
 * Market cap rate and ERV (Estimated Rental Value) benchmarks for Scout underwriting.
 *
 * These are the fallback values used when CoStar submarket data is not available.
 * Updated quarterly by Head of Product from published market reports.
 *
 * Last updated: Q1 2026
 * Sources:
 *   UK: CBRE/Savills SE England commercial market reports
 *   US: CoStar FL/TX submarket summary, Marcus & Millichap cap rate survey
 *
 * IMPORTANT: Do not use getFallbackCapRate() from avm.ts in Scout underwriting.
 * Scout uses SUBMARKET-level benchmarks (e.g. "se_uk" vs generic "UK"). The
 * avm.ts table is country-level. Both are maintained here as the single source
 * of truth for Scout.
 */

// ---------------------------------------------------------------------------
// MARKET CAP RATES BY SUBMARKET + ASSET TYPE
// ---------------------------------------------------------------------------

/**
 * Market cap rates (decimal) by submarket region and asset type.
 * Used as `marketCapRate` in Scout underwriting when no better data is available.
 *
 * These represent prime / good secondary rates for stabilised assets.
 * Distressed / value-add deals will exhibit higher in-place cap rates.
 */
export const MARKET_CAP_RATES: Record<string, Record<string, number>> = {
  prime_london: {
    // Prime Central London — West End, City, Mayfair, Victoria, Fitzrovia
    industrial:  0.0400,
    warehouse:   0.0425,
    logistics:   0.0400,
    office:      0.0425,  // West End prime office 3.5-4.5%
    retail:      0.0450,  // Prime high street 4-5%
    flex:        0.0475,
    mixed:       0.0450,
  },
  greater_london: {
    // Greater London zones 2-5 — Hackney, Fulham, Stratford, etc.
    industrial:  0.0475,
    warehouse:   0.0475,
    logistics:   0.0450,
    office:      0.0550,  // Outer London office
    retail:      0.0600,
    flex:        0.0525,
    mixed:       0.0525,
  },
  se_uk: {
    // SE England (Thames corridor, Kent, Sussex, Hampshire) — logistics premium
    industrial:  0.0525,
    warehouse:   0.0525,
    logistics:   0.0500,  // best-in-class logistics (sub-50k sqft) tighter than generic industrial
    office:      0.0650,  // SE UK out-of-town office
    retail:      0.0750,  // high street; out-of-town retail 6.5%
    flex:        0.0600,
    mixed:       0.0575,
  },
  midlands: {
    industrial:  0.0575,
    warehouse:   0.0550,
    logistics:   0.0525,
    office:      0.0750,
    retail:      0.0800,
    flex:        0.0650,
    mixed:       0.0625,
  },
  north_uk: {
    industrial:  0.0625,
    warehouse:   0.0600,
    logistics:   0.0575,
    office:      0.0800,
    retail:      0.0850,
    flex:        0.0700,
    mixed:       0.0675,
  },
  fl_us: {
    // Florida — Miami, Broward, Palm Beach, Tampa, Orlando
    industrial:  0.0600,
    warehouse:   0.0580,
    logistics:   0.0560,
    office:      0.0700,
    retail:      0.0650,
    flex:        0.0620,
    mixed:       0.0630,
  },
  tx_us: {
    industrial:  0.0575,
    warehouse:   0.0560,
    logistics:   0.0540,
    office:      0.0725,
    retail:      0.0650,
    flex:        0.0600,
    mixed:       0.0610,
  },
  ca_us: {
    industrial:  0.0475,  // CA compression — limited supply, strong demand
    warehouse:   0.0490,
    logistics:   0.0460,
    office:      0.0725,
    retail:      0.0600,
    flex:        0.0525,
    mixed:       0.0550,
  },
};

// ---------------------------------------------------------------------------
// MARKET ERV (ESTIMATED RENTAL VALUE)
// ---------------------------------------------------------------------------

/**
 * Market ERV per sqft per year by submarket and asset type.
 * UK: £/sqft/yr. US: $/sqft/yr.
 *
 * Used in underwriting when no passing rent is available from the brochure.
 * Estimate: estRent = sqft × getMarketERV(assetType, region)
 */
export const MARKET_ERV: Record<string, Record<string, number>> = {
  prime_london: {
    // Prime Central London ERV — West End, City, Mayfair, Victoria, etc.
    industrial:  18.00,
    warehouse:   16.00,
    logistics:   18.00,
    office:      55.00,  // Grade A West End £65-85, Grade B £40-55
    retail:      65.00,  // Zone A high street — varies hugely (£30-£200+)
    flex:        25.00,
    mixed:       35.00,
  },
  greater_london: {
    // Greater London (outside prime) — Hackney, Fulham, zones 2-4
    industrial:  15.00,
    warehouse:   14.00,
    logistics:   16.00,
    office:      38.00,  // Grade B outer London
    retail:      45.00,
    flex:        18.00,
    mixed:       22.00,
  },
  se_uk: {
    // SE England ERV — mid-point of Q1 2026 range
    industrial:  11.50,  // £9.50–£14.50/sqft/yr (Ashford/Sittingbourne mid)
    warehouse:   11.50,
    logistics:   14.00,  // distribution warehouses commanding premium
    office:      28.00,  // SE UK out-of-town grade B; grade A up to £45
    retail:      35.00,  // zone A estimate; actual varies widely
    flex:        14.00,
    mixed:       12.00,
  },
  midlands: {
    industrial:  8.50,
    warehouse:   9.00,
    logistics:   11.00,
    office:      22.00,
    retail:      28.00,
    flex:        11.00,
    mixed:       9.50,
  },
  north_uk: {
    industrial:  7.50,
    warehouse:   7.75,
    logistics:   9.50,
    office:      18.00,
    retail:      22.00,
    flex:        9.50,
    mixed:       8.00,
  },
  fl_us: {
    // Florida ERV — $/sqft/yr NNN basis
    industrial:  9.50,
    warehouse:   9.50,
    logistics:   11.00,
    office:      22.00,  // class B; class A up to $35
    retail:      28.00,
    flex:        12.00,
    mixed:       11.00,
  },
  tx_us: {
    industrial:  9.00,
    warehouse:   9.25,
    logistics:   10.50,
    office:      24.00,
    retail:      26.00,
    flex:        11.00,
    mixed:       10.50,
  },
  ca_us: {
    industrial:  14.00,  // CA premium — supply-constrained
    warehouse:   13.00,
    logistics:   16.00,
    office:      35.00,
    retail:      38.00,
    flex:        18.00,
    mixed:       16.00,
  },
};

// ---------------------------------------------------------------------------
// LOOKUP HELPERS
// ---------------------------------------------------------------------------

/** Normalise a region string to a key in the benchmark tables. */
export function normaliseRegion(region: string | null | undefined): string {
  if (!region) return "se_uk"; // default to SE UK
  const r = region.toLowerCase().replace(/[\s_-]+/g, "_");
  if (r.includes("prime_london") || r.includes("west_end") || r.includes("city_of_london") || r.includes("mayfair") || r.includes("fitzrovia") || r.includes("victoria") || r.includes("pimlico") || r.includes("marylebone") || r.includes("soho") || r.includes("covent_garden") || r.includes("knightsbridge") || r.includes("chelsea") || r.includes("kensington")) return "prime_london";
  if (r.includes("london") || r.includes("greater_london")) return "greater_london";
  if (r.includes("se") || r.includes("south_east") || r.includes("kent") || r.includes("sussex") || r.includes("hamp")) return "se_uk";
  if (r.includes("midland") || r.includes("birmingham"))                   return "midlands";
  if (r.includes("north") || r.includes("manchester") || r.includes("leeds") || r.includes("liverpool") || r.includes("newcastle") || r.includes("sheffield") || r.includes("glasgow") || r.includes("edinburgh") || r.includes("scotland")) return "north_uk";
  if (r.includes("fl") || r.includes("florida"))                          return "fl_us";
  if (r.includes("tx") || r.includes("texas"))                            return "tx_us";
  if (r.includes("ca") || r.includes("california"))                       return "ca_us";
  return "se_uk";
}

/**
 * Detect region from address string. Uses London postcodes and area names.
 */
export function detectRegionFromAddress(address: string): string {
  const a = address.toLowerCase();

  // Prime London postcodes: W1, WC1, WC2, SW1, EC1-EC4
  if (/\b(w1[a-z]?|wc[12][a-z]?|sw1[a-z]?|ec[1-4][a-z]?)\b/i.test(address)) return "prime_london";
  // Prime London area names
  if (/\b(mayfair|fitzrovia|soho|covent garden|marylebone|victoria|pimlico|belgravia|knightsbridge|chelsea|kensington|city of london|st james|strand)\b/i.test(address)) return "prime_london";

  // Greater London postcodes (any London postcode pattern)
  if (/\b(e\d{1,2}|n\d{1,2}|nw\d{1,2}|se\d{1,2}|sw\d{1,2}|w\d{1,2}|ec\d|wc\d)\s?\d[a-z]{2}\b/i.test(address)) return "greater_london";
  // London area names
  if (/\b(london|hackney|shoreditch|hoxton|islington|camden|brixton|fulham|hammersmith|stratford|greenwich|lewisham|southwark|lambeth|wandsworth|tower hamlets|canary wharf|docklands)\b/i.test(address)) return "greater_london";

  // SE England — Essex, Kent, Sussex, Hampshire, Surrey, Berkshire, Herts, etc.
  if (/\b(basildon|chelmsford|colchester|southend|essex|thurrock|brentwood|harlow|grays|romford|dartford|medway|maidstone|tunbridge|ashford|canterbury|dover|crawley|brighton|worthing|eastbourne|hastings|horsham|guildford|woking|reading|slough|bracknell|watford|st albans|hemel|stevenage|luton|aylesbury|high wycombe|oxford|portsmouth|southampton|winchester|basingstoke|farnborough|aldershot|swindon|milton keynes)\b/i.test(address)) return "se_uk";

  // Scottish / Northern cities
  if (/\b(glasgow|edinburgh|manchester|liverpool|leeds|sheffield|newcastle|sunderland|bradford|hull|nottingham)\b/i.test(address)) return "north_uk";

  // Midlands
  if (/\b(birmingham|coventry|leicester|derby|wolverhampton|stoke|telford|northampton)\b/i.test(address)) return "midlands";

  return "se_uk"; // default
}

/** Normalise an asset type string to a key in the benchmark tables. */
export function normaliseAssetType(assetType: string | null | undefined): string {
  if (!assetType) return "mixed";
  const t = assetType.toLowerCase().replace(/[^a-z]/g, "");
  if (t.includes("logistic"))  return "logistics";
  if (t.includes("warehouse")) return "warehouse";
  if (t.includes("industri"))  return "industrial";
  if (t.includes("office"))    return "office";
  if (t.includes("retail"))    return "retail";
  if (t.includes("flex"))      return "flex";
  return "mixed";
}

/**
 * Returns the benchmark cap rate for a deal.
 * Prefers submarket-level benchmarks over the country-level table in avm.ts.
 */
export function getMarketCapRate(
  assetType: string | null,
  region: string | null
): number {
  const r = normaliseRegion(region);
  const t = normaliseAssetType(assetType);
  return MARKET_CAP_RATES[r]?.[t] ?? MARKET_CAP_RATES["se_uk"].mixed;
}

/**
 * Returns the benchmark ERV per sqft for a deal.
 * Currency matches the region: UK = GBP, US = USD.
 */
export function getMarketERV(
  assetType: string | null,
  region: string | null
): number {
  const r = normaliseRegion(region);
  const t = normaliseAssetType(assetType);
  return MARKET_ERV[r]?.[t] ?? MARKET_ERV["se_uk"].mixed;
}

/**
 * Returns the currency for a region.
 */
export function getRegionCurrency(region: string | null): "GBP" | "USD" {
  const r = normaliseRegion(region);
  return r.endsWith("_us") ? "USD" : "GBP";
}

// ---------------------------------------------------------------------------
// DSCR FINANCING ASSUMPTIONS (constant — review annually)
// ---------------------------------------------------------------------------

/** Standard financing assumptions used in Scout DSCR calculation. */
export const SCOUT_FINANCING = {
  ltvPct:       0.65,   // 65% LTV senior debt
  annualRate:   0.055,  // 5.5% floating (Bank Rate + 175bps as of Q1 2026)
  termYears:    25,
  amortising:   true,
} as const;

/**
 * Calculates annual debt service for a given purchase price.
 * Assumes a standard amortising mortgage at SCOUT_FINANCING defaults.
 */
export function calculateAnnualDebtService(purchasePrice: number): number {
  const loanAmount   = purchasePrice * SCOUT_FINANCING.ltvPct;
  const monthlyRate  = SCOUT_FINANCING.annualRate / 12;
  const n            = SCOUT_FINANCING.termYears * 12;
  const monthlyPmt   = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n))
                       / (Math.pow(1 + monthlyRate, n) - 1);
  return monthlyPmt * 12;
}
