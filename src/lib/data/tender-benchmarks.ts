// Tender benchmark pricing data for the RealHQ procurement engine.
// Ranges are deliberately shown as min/max — never a single number.
// Sources: BCIS (UK), RSMeans (US), public cost guides (MyBuilder, HomeAdvisor, Fixr).

export type TenderCategory =
  | "MAINTENANCE"
  | "COMPLIANCE"
  | "CAPITAL_WORKS"
  | "CONSTRUCTION"
  | "GREEN_ESG"
  | "PROFESSIONAL";

export interface TenderJobType {
  key: string;
  label: string;
  category: TenderCategory;
  categoryLabel: string;
  // benchmark per relevant unit
  benchmarkGBP?: { low: number; high: number; unit: string; source: string };
  benchmarkUSD?: { low: number; high: number; unit: string; source: string };
  // for sqft-based benchmarks, the multiplier is applied to asset sqft
  sqftBased?: boolean;
  // for capital works: typical annual saving or value-add descriptor
  valueAddNote?: string;
}

export const TENDER_JOB_TYPES: TenderJobType[] = [
  // ── MAINTENANCE ──────────────────────────────────────────────────────────
  {
    key: "hvac_service",
    label: "HVAC Service",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 1200, high: 3500, unit: "per unit/yr", source: "BCIS 2024" },
    benchmarkUSD: { low: 1500, high: 4500, unit: "per unit/yr", source: "RSMeans 2024" },
    valueAddNote: "Reduces energy consumption 10–25% vs poorly maintained system",
  },
  {
    key: "lift_service",
    label: "Lift / Elevator Service",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 800, high: 2200, unit: "per lift/yr", source: "BCIS 2024" },
    benchmarkUSD: { low: 1200, high: 3000, unit: "per lift/yr", source: "RSMeans 2024" },
  },
  {
    key: "fire_alarm_test",
    label: "Fire Alarm Test & Service",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 400, high: 1800, unit: "per visit", source: "MyBuilder 2024" },
    benchmarkUSD: { low: 500, high: 2200, unit: "per visit", source: "HomeAdvisor 2024" },
  },
  {
    key: "roof_inspection",
    label: "Roof Inspection",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 350, high: 900, unit: "per inspection", source: "BCIS 2024" },
    benchmarkUSD: { low: 400, high: 1200, unit: "per inspection", source: "HomeAdvisor 2024" },
  },
  {
    key: "electrical_inspection",
    label: "Electrical Inspection (EICR)",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 600, high: 2500, unit: "per inspection", source: "NICEIC 2024" },
    benchmarkUSD: { low: 800, high: 3000, unit: "per inspection", source: "RSMeans 2024" },
  },
  {
    key: "plumbing_maintenance",
    label: "Plumbing Maintenance",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 600, high: 3500, unit: "per visit", source: "Checkatrade 2024" },
    benchmarkUSD: { low: 800, high: 4000, unit: "per visit", source: "HomeAdvisor 2024" },
  },
  {
    key: "pest_control",
    label: "Pest Control",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 200, high: 800, unit: "per visit", source: "BCIS 2024" },
    benchmarkUSD: { low: 300, high: 1000, unit: "per visit", source: "HomeAdvisor 2024" },
  },
  {
    key: "security",
    label: "Security System Maintenance",
    category: "MAINTENANCE",
    categoryLabel: "Maintenance",
    benchmarkGBP: { low: 400, high: 1500, unit: "per yr", source: "NSI 2024" },
    benchmarkUSD: { low: 600, high: 2000, unit: "per yr", source: "HomeAdvisor 2024" },
  },

  // ── COMPLIANCE ───────────────────────────────────────────────────────────
  {
    key: "asbestos_survey",
    label: "Asbestos Survey",
    category: "COMPLIANCE",
    categoryLabel: "Compliance",
    benchmarkGBP: { low: 500, high: 2500, unit: "per survey", source: "BCIS 2024" },
    benchmarkUSD: { low: 700, high: 3500, unit: "per survey", source: "RSMeans 2024" },
  },
  {
    key: "asbestos_removal",
    label: "Asbestos Removal",
    category: "COMPLIANCE",
    categoryLabel: "Compliance",
    benchmarkGBP: { low: 1500, high: 15000, unit: "per job", source: "BCIS 2024" },
    benchmarkUSD: { low: 2000, high: 20000, unit: "per job", source: "RSMeans 2024" },
  },
  {
    key: "fire_safety_upgrade",
    label: "Fire Safety Upgrade",
    category: "COMPLIANCE",
    categoryLabel: "Compliance",
    benchmarkGBP: { low: 2000, high: 25000, unit: "per property", source: "BCIS 2024" },
    benchmarkUSD: { low: 3000, high: 35000, unit: "per property", source: "RSMeans 2024" },
  },
  {
    key: "epc_survey",
    label: "EPC Survey",
    category: "COMPLIANCE",
    categoryLabel: "Compliance",
    benchmarkGBP: { low: 300, high: 1200, unit: "per survey", source: "MHCLG 2024" },
  },
  {
    key: "structural_survey",
    label: "Structural Survey",
    category: "COMPLIANCE",
    categoryLabel: "Compliance",
    benchmarkGBP: { low: 600, high: 3000, unit: "per survey", source: "RICS 2024" },
    benchmarkUSD: { low: 800, high: 4000, unit: "per survey", source: "RSMeans 2024" },
  },
  {
    key: "phase1_esa",
    label: "Phase I Environmental Survey",
    category: "COMPLIANCE",
    categoryLabel: "Compliance",
    benchmarkGBP: { low: 1500, high: 4000, unit: "per survey", source: "BCIS 2024" },
    benchmarkUSD: { low: 2000, high: 6000, unit: "per survey", source: "RSMeans 2024" },
  },

  // ── CAPITAL WORKS ─────────────────────────────────────────────────────────
  {
    key: "refurbishment_cat_a",
    label: "Cat A Refurbishment",
    category: "CAPITAL_WORKS",
    categoryLabel: "Capital Works",
    sqftBased: true,
    benchmarkGBP: { low: 40, high: 75, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 50, high: 90, unit: "per sqft", source: "RSMeans 2024" },
    valueAddNote: "Typically adds 15–25% to ERV on office assets",
  },
  {
    key: "refurbishment_cat_b",
    label: "Cat B Fitout",
    category: "CAPITAL_WORKS",
    categoryLabel: "Capital Works",
    sqftBased: true,
    benchmarkGBP: { low: 60, high: 120, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 80, high: 150, unit: "per sqft", source: "RSMeans 2024" },
    valueAddNote: "De-risks void on expiry — tenant often contributes to Cat B costs",
  },
  {
    key: "roof_replacement",
    label: "Roof Replacement",
    category: "CAPITAL_WORKS",
    categoryLabel: "Capital Works",
    sqftBased: true,
    benchmarkGBP: { low: 15, high: 40, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 18, high: 50, unit: "per sqft", source: "RSMeans 2024" },
  },
  {
    key: "hvac_replacement",
    label: "HVAC Full Replacement",
    category: "CAPITAL_WORKS",
    categoryLabel: "Capital Works",
    sqftBased: true,
    benchmarkGBP: { low: 20, high: 45, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 25, high: 55, unit: "per sqft", source: "RSMeans 2024" },
    valueAddNote: "Reduces energy consumption 20–35% — saves £X,000/yr and improves EPC rating",
  },
  {
    key: "mezzanine",
    label: "Mezzanine Installation",
    category: "CAPITAL_WORKS",
    categoryLabel: "Capital Works",
    sqftBased: true,
    benchmarkGBP: { low: 30, high: 60, unit: "per sqft (mezzanine area)", source: "BCIS 2024" },
    benchmarkUSD: { low: 40, high: 75, unit: "per sqft (mezzanine area)", source: "RSMeans 2024" },
    valueAddNote: "Effective GIA gain — strong ROI vs new build on per-sqft basis",
  },
  {
    key: "car_park_resurfacing",
    label: "Car Park / Yard Resurfacing",
    category: "CAPITAL_WORKS",
    categoryLabel: "Capital Works",
    sqftBased: true,
    benchmarkGBP: { low: 5, high: 15, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 6, high: 18, unit: "per sqft", source: "RSMeans 2024" },
  },

  // ── CONSTRUCTION ──────────────────────────────────────────────────────────
  {
    key: "extension",
    label: "Extension / New Build Unit",
    category: "CONSTRUCTION",
    categoryLabel: "Construction",
    sqftBased: true,
    benchmarkGBP: { low: 150, high: 280, unit: "per sqft (GIA)", source: "BCIS 2024" },
    benchmarkUSD: { low: 180, high: 350, unit: "per sqft (GIA)", source: "RSMeans 2024" },
    valueAddNote: "Value: (ERV x area) / cap rate — compare to build cost for return on equity",
  },
  {
    key: "change_of_use",
    label: "Change of Use Conversion",
    category: "CONSTRUCTION",
    categoryLabel: "Construction",
    sqftBased: true,
    benchmarkGBP: { low: 80, high: 200, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 100, high: 250, unit: "per sqft", source: "RSMeans 2024" },
    valueAddNote: "Potential ERV uplift depends on target use — planning permission required",
  },

  // ── GREEN / ESG ────────────────────────────────────────────────────────────
  {
    key: "led_retrofit",
    label: "LED Retrofit",
    category: "GREEN_ESG",
    categoryLabel: "Green / ESG",
    sqftBased: true,
    benchmarkGBP: { low: 3, high: 8, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 4, high: 10, unit: "per sqft", source: "RSMeans 2024" },
    valueAddNote: "Saves 50–70% of lighting energy cost — payback typically 2–4 years",
  },
  {
    key: "ev_charging",
    label: "EV Charging Installation",
    category: "GREEN_ESG",
    categoryLabel: "Green / ESG",
    benchmarkGBP: { low: 800, high: 3500, unit: "per bay", source: "OZEV 2024" },
    benchmarkUSD: { low: 1000, high: 5000, unit: "per bay", source: "DOE 2024" },
    valueAddNote: "Growing tenant demand — reduces void risk and supports ESG covenant",
  },
  {
    key: "solar_pv",
    label: "Solar PV Installation",
    category: "GREEN_ESG",
    categoryLabel: "Green / ESG",
    benchmarkGBP: { low: 800, high: 1400, unit: "per kWp", source: "MCS 2024" },
    benchmarkUSD: { low: 900, high: 1600, unit: "per kWp", source: "NREL 2024" },
    valueAddNote: "Avoids import at grid rate — SEG/SREC income on export. Typical payback 5–8 years",
  },
  {
    key: "heat_pump",
    label: "Heat Pump Installation",
    category: "GREEN_ESG",
    categoryLabel: "Green / ESG",
    benchmarkGBP: { low: 8000, high: 25000, unit: "per unit", source: "BCIS 2024" },
    benchmarkUSD: { low: 10000, high: 30000, unit: "per unit", source: "RSMeans 2024" },
    valueAddNote: "EPC rating improvement — reduces gas dependency. Boiler Upgrade Scheme grant may apply (UK)",
  },
  {
    key: "insulation",
    label: "Insulation Upgrade",
    category: "GREEN_ESG",
    categoryLabel: "Green / ESG",
    sqftBased: true,
    benchmarkGBP: { low: 5, high: 20, unit: "per sqft", source: "BCIS 2024" },
    benchmarkUSD: { low: 6, high: 25, unit: "per sqft", source: "RSMeans 2024" },
    valueAddNote: "Reduces heat loss 20–40% — improves EPC and reduces energy bills",
  },

  // ── PROFESSIONAL SERVICES ─────────────────────────────────────────────────
  {
    key: "valuation",
    label: "RICS Valuation",
    category: "PROFESSIONAL",
    categoryLabel: "Professional Services",
    benchmarkGBP: { low: 1500, high: 6000, unit: "per report", source: "RICS 2024" },
    benchmarkUSD: { low: 2000, high: 8000, unit: "per report", source: "MAI 2024" },
  },
  {
    key: "reinstatement_survey",
    label: "Reinstatement Cost Assessment",
    category: "PROFESSIONAL",
    categoryLabel: "Professional Services",
    benchmarkGBP: { low: 500, high: 1800, unit: "per report", source: "RICS 2024" },
  },
  {
    key: "planning_consultant",
    label: "Planning Consultant",
    category: "PROFESSIONAL",
    categoryLabel: "Professional Services",
    benchmarkGBP: { low: 2000, high: 15000, unit: "per application", source: "RICS 2024" },
    benchmarkUSD: { low: 3000, high: 20000, unit: "per application", source: "APA 2024" },
    valueAddNote: "Planning uplift can add 30–200% to site value — fee is small vs potential gain",
  },
  {
    key: "architect",
    label: "Architect",
    category: "PROFESSIONAL",
    categoryLabel: "Professional Services",
    benchmarkGBP: { low: 3000, high: 25000, unit: "per project (concept to planning)", source: "RIBA 2024" },
    benchmarkUSD: { low: 4000, high: 35000, unit: "per project", source: "AIA 2024" },
  },
  {
    key: "project_manager",
    label: "Project Manager",
    category: "PROFESSIONAL",
    categoryLabel: "Professional Services",
    benchmarkGBP: { low: 3, high: 6, unit: "% of contract value", source: "RICS 2024" },
    benchmarkUSD: { low: 3, high: 7, unit: "% of contract value", source: "PMI 2024" },
  },
];

export function getBenchmark(
  jobKey: string,
  currency: "GBP" | "USD",
  sqft?: number
): { low: number; high: number; unit: string; source: string } | null {
  const job = TENDER_JOB_TYPES.find((j) => j.key === jobKey);
  if (!job) return null;

  const bench = currency === "GBP" ? job.benchmarkGBP : (job.benchmarkUSD ?? job.benchmarkGBP);
  if (!bench) return null;

  if (job.sqftBased && sqft && sqft > 0) {
    return {
      low: Math.round(bench.low * sqft),
      high: Math.round(bench.high * sqft),
      unit: `for ${sqft.toLocaleString()} sqft (${bench.unit})`,
      source: bench.source,
    };
  }

  return bench;
}

export const TENDER_CATEGORIES: { key: TenderCategory; label: string }[] = [
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "COMPLIANCE", label: "Compliance" },
  { key: "CAPITAL_WORKS", label: "Capital Works" },
  { key: "CONSTRUCTION", label: "Construction" },
  { key: "GREEN_ESG", label: "Green / ESG" },
  { key: "PROFESSIONAL", label: "Professional Services" },
];
