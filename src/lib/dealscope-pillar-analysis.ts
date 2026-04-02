/**
 * src/lib/dealscope-pillar-analysis.ts
 *
 * Pillar-level deal analysis: 5 pillars with scores, red flags,
 * data confidence tracking, and AI-generated narratives.
 *
 * Pillars:
 *   1. Price vs Market
 *   2. Asset Condition
 *   3. Operator Quality
 *   4. Market Context
 *   5. Deal Structure
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type FlagSeverity = "red" | "amber" | "grey";
export type FlagType = "data" | "assumption" | "inconsistency";

export interface RedFlag {
  text: string;
  severity: FlagSeverity;
  evidence: string;
  source: string;
  type: FlagType;
  pillar: string;
  overrideField?: string;
}

export interface PillarAnalysis {
  name: string;
  pillarKey: string;
  score: number;            // 0-100
  narrative: string;        // AI-generated or template
  redFlags: RedFlag[];
  dataCompleteness: number; // 0-100
  dataFields: DataField[];
}

export interface DataField {
  name: string;
  source: "verified" | "estimated" | "missing";
  value: string;
  assumption?: string;
}

export interface PillarAnalysisResult {
  pillars: PillarAnalysis[];
  overallScore: number;
  dealTemperature: "hot" | "warm" | "watch" | "cold";
  totalRedFlags: number;
  overallDataCompleteness: number;
  generatedAt: string;
}

// Input: everything the enrichment pipeline knows
export interface PillarInput {
  address: string;
  assetType: string;
  region: string;
  askingPrice: number | null;
  guidePrice: number | null;
  sqft: number | null;
  sqftSource: string;
  yearBuilt: number | null;
  yearBuiltSource: string;
  tenure: string | null;
  epcRating: string | null;
  epcSource: string;
  passingRent: number | null;
  passingRentSource: string;
  marketErv: number | null;
  ervSource: string;
  occupancyPct: number | null;
  occupancySource: string;
  voidMonths: number | null;
  voidSource: string;
  capRate: number | null;
  capRateSource: string;
  noiAmount: number | null;
  noiSource: string;
  compsCount: number;
  compsAvgPsf: number | null;
  planningAppsCount: number;
  hasFloodData: boolean;
  inFloodZone: boolean;
  hasEpcData: boolean;
  hasAiExtraction: boolean;
  hasListingScrape: boolean;
  hasGeocode: boolean;
  hasValuations: boolean;
  companyStatus: string | null;
  companyName: string | null;
  hasCompanyData: boolean;
  isAuction: boolean;
  isAdmin: boolean;
  isVacant: boolean;
  condition: string | null;
  tenantNames: string[] | null;
  leaseExpiry: string | null;
  breakDates: string[] | null;
  leaseLengthYears: number | null;
  dscr: number | null;
  irr: number | null;
  stabilisedYield: number | null;
  rentGapPct: number | null;
  rentGapDirection: string | null;
  aiRisks: string[] | null;
  aiOpportunities: string[] | null;
  keyFeatures: string[] | null;
}

// ---------------------------------------------------------------------------
// RED FLAG DETECTION
// ---------------------------------------------------------------------------

function detectRedFlags(p: PillarInput): RedFlag[] {
  const flags: RedFlag[] = [];
  const price = p.askingPrice || p.guidePrice || 0;

  // ── PRICE VS MARKET ──
  if (p.compsCount === 0) {
    flags.push({
      text: "No comparable sales found",
      severity: "amber",
      evidence: "Land Registry search returned no similar transactions within search radius. Agent comp report recommended.",
      source: "Land Registry API",
      type: "data",
      pillar: "priceVsMarket",
    });
  } else if (p.compsCount < 3) {
    flags.push({
      text: `Limited comparable sales data (only ${p.compsCount} in 12mo)`,
      severity: "amber",
      evidence: `Only ${p.compsCount} similar transaction(s) found. Typical market would show 5-8 comparable sales.`,
      source: "Land Registry API",
      type: "data",
      pillar: "priceVsMarket",
    });
  }

  if (p.sqftSource.includes("estimated") || p.sqftSource === "benchmark") {
    flags.push({
      text: `Floor area estimated at ${(p.sqft || 0).toLocaleString()} sqft`,
      severity: "amber",
      evidence: `Calculated from asking price (£${price.toLocaleString()}) ÷ benchmark £/sqft for ${p.assetType} in ${p.region}. Enter actual measurement to refine.`,
      source: "Estimation Engine",
      type: "assumption",
      pillar: "priceVsMarket",
      overrideField: "buildingSizeSqft",
    });
  }

  if (p.compsAvgPsf && p.sqft && price) {
    const askingPsf = price / p.sqft;
    const premium = ((askingPsf / p.compsAvgPsf) - 1) * 100;
    if (premium > 30) {
      flags.push({
        text: `Asking price ${premium.toFixed(0)}% above comparable average`,
        severity: "red",
        evidence: `Asking £${askingPsf.toFixed(0)}/sqft vs comparable avg £${p.compsAvgPsf.toFixed(0)}/sqft. Significant premium — verify condition, specification, or special circumstances.`,
        source: "Comparable Analysis",
        type: "inconsistency",
        pillar: "priceVsMarket",
      });
    } else if (premium < -30) {
      flags.push({
        text: `Asking price ${Math.abs(premium).toFixed(0)}% below comparable average`,
        severity: "amber",
        evidence: `Asking £${askingPsf.toFixed(0)}/sqft vs comparable avg £${p.compsAvgPsf.toFixed(0)}/sqft. Deep discount may reflect structural issues.`,
        source: "Comparable Analysis",
        type: "data",
        pillar: "priceVsMarket",
      });
    }
  }

  // ── ASSET CONDITION ──
  if (p.epcSource.includes("estimated") || p.epcSource === "benchmark" || !p.hasEpcData) {
    const grade = p.epcRating || "D";
    flags.push({
      text: `EPC Grade estimated as ${grade}`,
      severity: "amber",
      evidence: p.yearBuilt
        ? `${p.yearBuilt < 2000 ? "Pre-2000" : "Post-2000"} ${p.assetType} property — default assumption is Grade ${grade}. Check EPC register for actual rating.`
        : `No EPC data found on register. Default Grade ${grade} assumed. Verify with energy assessor.`,
      source: "EPC Estimation Engine",
      type: "assumption",
      pillar: "assetCondition",
      overrideField: "epcRating",
    });
  }

  if (p.epcRating && /[EFG]/i.test(p.epcRating)) {
    flags.push({
      text: `EPC Grade ${p.epcRating} — MEES compliance risk`,
      severity: "red",
      evidence: `Minimum Energy Efficiency Standard requires Grade E or better for new commercial leases. Grade ${p.epcRating} requires upgrade before re-letting.`,
      source: p.hasEpcData ? "EPC Register" : "Estimated",
      type: "data",
      pillar: "assetCondition",
    });
  }

  if (!p.condition) {
    flags.push({
      text: "No structural survey — condition assumed from building age",
      severity: "grey",
      evidence: p.yearBuilt
        ? `Built ~${p.yearBuilt}. Condition assumed ${p.yearBuilt < 1980 ? "poor to fair" : p.yearBuilt < 2000 ? "fair" : "good"}. Upload survey for accurate assessment.`
        : "Building age unknown. Condition cannot be assessed without survey.",
      source: "Estimation Engine",
      type: "assumption",
      pillar: "assetCondition",
    });
  }

  if (p.yearBuilt && p.yearBuilt < 2000 && /industrial|warehouse|factory/i.test(p.assetType)) {
    flags.push({
      text: "Asbestos risk — pre-2000 industrial building",
      severity: "amber",
      evidence: `Built ~${p.yearBuilt}. Pre-2000 industrial buildings commonly contain asbestos-containing materials. Management survey recommended (est. £600-1,200).`,
      source: "Building Age Assessment",
      type: "data",
      pillar: "assetCondition",
    });
  }

  // ── OPERATOR QUALITY ──
  if (!p.hasCompanyData) {
    flags.push({
      text: "Owner/operator data not available",
      severity: "grey",
      evidence: "Companies House lookup did not return results. Owner may be individual or overseas entity.",
      source: "Companies House API",
      type: "data",
      pillar: "operatorQuality",
    });
  }

  if (p.companyStatus && /dissolved|struck/i.test(p.companyStatus)) {
    flags.push({
      text: `Company status: ${p.companyStatus}`,
      severity: "red",
      evidence: "Dissolved companies cannot enter new contracts. Verify current legal ownership.",
      source: "Companies House API",
      type: "data",
      pillar: "operatorQuality",
    });
  }

  if (p.isAdmin) {
    flags.push({
      text: "Company in administration — distressed seller",
      severity: "red",
      evidence: "Administrator controls sale process. Timeline pressure may create negotiation opportunity but also complexity.",
      source: "Companies House / Gazette",
      type: "data",
      pillar: "operatorQuality",
    });
  }

  if (p.tenantNames && p.tenantNames.length === 1) {
    flags.push({
      text: "Single tenant risk",
      severity: "amber",
      evidence: `Sole tenant: ${p.tenantNames[0]}. Income stream depends entirely on one covenant. Verify financial strength and lease security.`,
      source: "Listing Data",
      type: "data",
      pillar: "operatorQuality",
    });
  }

  // ── MARKET CONTEXT ──
  if (p.ervSource.includes("estimated") || p.ervSource === "benchmark") {
    const ervPsf = p.marketErv && p.sqft ? (p.marketErv / p.sqft).toFixed(2) : "unknown";
    flags.push({
      text: `Rental value estimated from benchmark — £${ervPsf}/sqft`,
      severity: "grey",
      evidence: `Market ERV derived from Scout Benchmarks for ${p.assetType} in ${p.region}. Update with local agent evidence for accuracy.`,
      source: "Scout Benchmarks",
      type: "assumption",
      pillar: "marketContext",
      overrideField: "erv",
    });
  }

  if (p.rentGapPct != null && Math.abs(p.rentGapPct) > 25) {
    const dir = p.rentGapPct > 0 ? "above" : "below";
    flags.push({
      text: `Passing rent ${Math.abs(p.rentGapPct)}% ${dir} market ERV`,
      severity: p.rentGapPct > 25 ? "amber" : "red",
      evidence: p.rentGapPct > 0
        ? "Over-rented — risk of void at lease expiry as market won't support current rent level."
        : "Under-rented — significant reversionary upside. Value-add opportunity if rent reviews or re-letting achievable.",
      source: "Rent Gap Analysis",
      type: "data",
      pillar: "marketContext",
    });
  }

  if (p.inFloodZone) {
    flags.push({
      text: "Property in flood risk zone",
      severity: "red",
      evidence: "Environment Agency data indicates flood risk. May impact insurance costs and lettability.",
      source: "Environment Agency",
      type: "data",
      pillar: "marketContext",
    });
  }

  // ── DEAL STRUCTURE ──
  if (p.isVacant) {
    const months = p.voidMonths || 6;
    flags.push({
      text: `Property vacant — void period estimated at ${months} months`,
      severity: "amber",
      evidence: `No passing income. Void period assumed at ${months} months based on ${p.assetType} market averages. Carry costs apply during void.`,
      source: p.voidSource || "Market Benchmark",
      type: "assumption",
      pillar: "dealStructure",
      overrideField: "voidMonths",
    });
  }

  if (p.passingRentSource.includes("estimated") || p.passingRentSource.includes("assumed")) {
    flags.push({
      text: `Passing rent estimated at £${(p.passingRent || 0).toLocaleString()}/yr`,
      severity: "amber",
      evidence: `No lease data available. Rent estimated from ${p.sqft ? `${p.sqft.toLocaleString()} sqft × ` : ""}market benchmark. Enter actual rent to refine analysis.`,
      source: "Estimation Engine",
      type: "assumption",
      pillar: "dealStructure",
      overrideField: "passingRent",
    });
  }

  if (p.leaseLengthYears != null && p.leaseLengthYears < 3) {
    flags.push({
      text: `Short lease remaining (${p.leaseLengthYears} years)`,
      severity: "red",
      evidence: "Short unexpired term reduces income certainty and impacts financing. Consider void risk at expiry.",
      source: "Lease Data",
      type: "data",
      pillar: "dealStructure",
    });
  }

  if (p.dscr != null && p.dscr < 1.0) {
    flags.push({
      text: `DSCR ${p.dscr.toFixed(2)}× — cannot service debt`,
      severity: "red",
      evidence: "Debt service coverage ratio below 1.0× means rental income doesn't cover mortgage payments at assumed terms.",
      source: "Returns Analysis",
      type: "data",
      pillar: "dealStructure",
    });
  } else if (p.dscr != null && p.dscr < 1.25) {
    flags.push({
      text: `DSCR ${p.dscr.toFixed(2)}× — thin debt coverage`,
      severity: "amber",
      evidence: "Most lenders require minimum 1.25× DSCR. Current level leaves minimal headroom for rate rises or void periods.",
      source: "Returns Analysis",
      type: "data",
      pillar: "dealStructure",
    });
  }

  if (p.isAuction) {
    flags.push({
      text: "Auction sale — completion deadline applies",
      severity: "amber",
      evidence: "Typically 28-day completion required. Ensure financing and legal review completed before bidding.",
      source: "Listing Data",
      type: "data",
      pillar: "dealStructure",
    });
  }

  // AI-identified risks
  if (p.aiRisks && p.aiRisks.length > 0) {
    p.aiRisks.slice(0, 3).forEach((risk) => {
      flags.push({
        text: risk,
        severity: "amber",
        evidence: "Identified by AI analysis of listing description.",
        source: "AI Extraction",
        type: "data",
        pillar: "assetCondition",
      });
    });
  }

  return flags;
}

// ---------------------------------------------------------------------------
// PILLAR SCORE CALCULATION
// ---------------------------------------------------------------------------

function calcPriceScore(p: PillarInput): number {
  let score = 50; // Base
  const price = p.askingPrice || p.guidePrice || 0;

  // Comps confidence
  if (p.compsCount >= 5) score += 15;
  else if (p.compsCount >= 3) score += 10;
  else if (p.compsCount >= 1) score += 5;

  // Price vs comps
  if (p.compsAvgPsf && p.sqft && price) {
    const askingPsf = price / p.sqft;
    const discount = ((p.compsAvgPsf - askingPsf) / p.compsAvgPsf) * 100;
    if (discount > 20) score += 20;
    else if (discount > 10) score += 15;
    else if (discount > 0) score += 10;
    else if (discount > -10) score += 5;
    else score -= 5;
  }

  // Valuations available
  if (p.hasValuations) score += 10;

  // Sqft verified
  if (!p.sqftSource.includes("estimated")) score += 5;

  return Math.max(0, Math.min(100, score));
}

function calcAssetScore(p: PillarInput): number {
  let score = 50;

  // EPC
  if (p.hasEpcData) {
    score += 10;
    if (p.epcRating && /[AB]/i.test(p.epcRating)) score += 10;
    else if (p.epcRating && /C/i.test(p.epcRating)) score += 5;
    else if (p.epcRating && /[EFG]/i.test(p.epcRating)) score -= 10;
  }

  // Condition
  if (p.condition) {
    score += 5;
    if (/good|excellent|refurbished/i.test(p.condition)) score += 10;
    else if (/poor|derelict/i.test(p.condition)) score -= 10;
  }

  // Year built
  if (p.yearBuilt) {
    score += 5;
    if (p.yearBuilt >= 2010) score += 5;
    else if (p.yearBuilt < 1970) score -= 5;
  }

  // Features
  if (p.keyFeatures && p.keyFeatures.length > 3) score += 5;

  // Flood risk
  if (p.hasFloodData && !p.inFloodZone) score += 5;
  if (p.inFloodZone) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function calcOperatorScore(p: PillarInput): number {
  let score = 50;

  if (p.hasCompanyData) {
    score += 15;
    if (p.companyStatus && /active/i.test(p.companyStatus)) score += 10;
    if (p.companyStatus && /dissolved|struck/i.test(p.companyStatus)) score -= 20;
  }

  if (p.isAdmin) score -= 15;

  if (p.tenantNames && p.tenantNames.length > 1) score += 10;
  else if (p.tenantNames && p.tenantNames.length === 1) score += 5;

  if (p.leaseExpiry) score += 5;
  if (p.leaseLengthYears && p.leaseLengthYears > 5) score += 10;
  else if (p.leaseLengthYears && p.leaseLengthYears > 2) score += 5;

  return Math.max(0, Math.min(100, score));
}

function calcMarketScore(p: PillarInput): number {
  let score = 50;

  // ERV source quality
  if (p.ervSource === "listing" || p.ervSource.includes("passing")) score += 15;
  else if (p.ervSource.includes("estimated")) score += 0;
  else score += 10;

  // Rent gap direction
  if (p.rentGapDirection === "under-rented") score += 10; // Upside
  else if (p.rentGapDirection === "over-rented") score -= 5;

  // Market cap rate available
  if (p.capRate) score += 5;

  // Flood data verified
  if (p.hasFloodData) score += 5;

  // Comps give market context
  if (p.compsCount >= 3) score += 10;
  else if (p.compsCount >= 1) score += 5;

  // Planning applications
  if (p.planningAppsCount > 0) score += 5;

  return Math.max(0, Math.min(100, score));
}

function calcDealScore(p: PillarInput): number {
  let score = 50;

  // Vacancy
  if (p.isVacant) score -= 10;
  else if (p.occupancyPct && p.occupancyPct >= 90) score += 15;

  // DSCR
  if (p.dscr && p.dscr >= 1.5) score += 15;
  else if (p.dscr && p.dscr >= 1.25) score += 10;
  else if (p.dscr && p.dscr < 1.0) score -= 15;

  // IRR
  if (p.irr && p.irr >= 15) score += 15;
  else if (p.irr && p.irr >= 10) score += 10;
  else if (p.irr && p.irr >= 7) score += 5;
  else if (p.irr && p.irr < 5) score -= 5;

  // Stabilised yield
  if (p.stabilisedYield && p.stabilisedYield >= 8) score += 10;
  else if (p.stabilisedYield && p.stabilisedYield >= 6) score += 5;

  // Passing rent verified
  if (p.passingRentSource === "listing" || p.passingRentSource.includes("passing")) score += 5;

  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// DATA CONFIDENCE
// ---------------------------------------------------------------------------

function calcDataFields(p: PillarInput, pillar: string): DataField[] {
  const fields: DataField[] = [];

  switch (pillar) {
    case "priceVsMarket":
      fields.push({ name: "Asking price", source: (p.askingPrice || p.guidePrice) ? "verified" : "missing", value: (p.askingPrice || p.guidePrice) ? `£${(p.askingPrice || p.guidePrice)!.toLocaleString()}` : "Not available" });
      fields.push({ name: "Floor area", source: p.sqftSource.includes("estimated") ? "estimated" : p.sqft ? "verified" : "missing", value: p.sqft ? `${p.sqft.toLocaleString()} sqft` : "Unknown", assumption: p.sqftSource.includes("estimated") ? `Estimated from price ÷ benchmark` : undefined });
      fields.push({ name: "Comparable sales", source: p.compsCount >= 3 ? "verified" : p.compsCount > 0 ? "estimated" : "missing", value: `${p.compsCount} transactions` });
      fields.push({ name: "Valuations", source: p.hasValuations ? "verified" : "missing", value: p.hasValuations ? "Computed" : "Not available" });
      break;

    case "assetCondition":
      fields.push({ name: "EPC rating", source: p.hasEpcData ? "verified" : p.epcRating ? "estimated" : "missing", value: p.epcRating || "Unknown", assumption: !p.hasEpcData && p.epcRating ? `Assumed Grade ${p.epcRating} from building age` : undefined });
      fields.push({ name: "Year built", source: p.yearBuiltSource.includes("estimated") ? "estimated" : p.yearBuilt ? "verified" : "missing", value: p.yearBuilt ? String(p.yearBuilt) : "Unknown" });
      fields.push({ name: "Condition", source: p.condition ? "verified" : "missing", value: p.condition || "Not assessed" });
      fields.push({ name: "Flood risk", source: p.hasFloodData ? "verified" : "missing", value: p.hasFloodData ? (p.inFloodZone ? "At risk" : "Low risk") : "Unknown" });
      fields.push({ name: "Planning history", source: p.planningAppsCount > 0 ? "verified" : "missing", value: p.planningAppsCount > 0 ? `${p.planningAppsCount} applications` : "None found" });
      break;

    case "operatorQuality":
      fields.push({ name: "Company data", source: p.hasCompanyData ? "verified" : "missing", value: p.companyName || "Not available" });
      fields.push({ name: "Company status", source: p.companyStatus ? "verified" : "missing", value: p.companyStatus || "Unknown" });
      fields.push({ name: "Tenant names", source: p.tenantNames && p.tenantNames.length > 0 ? "verified" : "missing", value: p.tenantNames?.join(", ") || "Unknown" });
      fields.push({ name: "Lease details", source: p.leaseExpiry ? "verified" : p.leaseLengthYears ? "estimated" : "missing", value: p.leaseExpiry || (p.leaseLengthYears ? `${p.leaseLengthYears} years` : "Unknown") });
      break;

    case "marketContext":
      fields.push({ name: "Market ERV", source: p.ervSource.includes("estimated") || p.ervSource === "benchmark" ? "estimated" : p.marketErv ? "verified" : "missing", value: p.marketErv ? `£${p.marketErv.toLocaleString()}/yr` : "Unknown", assumption: p.ervSource.includes("estimated") ? `From ${p.region} ${p.assetType} benchmark` : undefined });
      fields.push({ name: "Market cap rate", source: p.capRate ? "verified" : "missing", value: p.capRate ? `${(p.capRate * 100).toFixed(1)}%` : "Unknown" });
      fields.push({ name: "Rent gap", source: p.rentGapPct != null ? "verified" : "missing", value: p.rentGapPct != null ? `${p.rentGapPct > 0 ? "+" : ""}${p.rentGapPct}%` : "Unknown" });
      fields.push({ name: "Geocode", source: p.hasGeocode ? "verified" : "missing", value: p.hasGeocode ? "Located" : "Not resolved" });
      break;

    case "dealStructure":
      fields.push({ name: "Passing rent", source: p.passingRentSource.includes("estimated") || p.passingRentSource.includes("assumed") ? "estimated" : p.passingRent ? "verified" : "missing", value: p.passingRent ? `£${p.passingRent.toLocaleString()}/yr` : "£0 (vacant)", assumption: p.passingRentSource.includes("estimated") ? "From market benchmark" : undefined });
      fields.push({ name: "Occupancy", source: p.occupancySource.includes("estimated") || p.occupancySource.includes("assumed") ? "estimated" : "verified", value: `${p.occupancyPct || 0}%` });
      fields.push({ name: "Void period", source: p.voidSource.includes("benchmark") || p.voidSource.includes("estimated") ? "estimated" : "verified", value: `${p.voidMonths || 0} months` });
      fields.push({ name: "DSCR", source: p.dscr ? "verified" : "missing", value: p.dscr ? `${p.dscr.toFixed(2)}×` : "Not calculated" });
      fields.push({ name: "IRR", source: p.irr ? "verified" : "missing", value: p.irr ? `${p.irr.toFixed(1)}%` : "Not calculated" });
      break;
  }

  return fields;
}

function calcDataCompleteness(fields: DataField[]): number {
  if (fields.length === 0) return 0;
  let score = 0;
  for (const f of fields) {
    if (f.source === "verified") score += 1;
    else if (f.source === "estimated") score += 0.5;
    // missing = 0
  }
  return Math.round((score / fields.length) * 100);
}

// ---------------------------------------------------------------------------
// NARRATIVE GENERATION (Claude API)
// ---------------------------------------------------------------------------

async function generateNarrative(
  pillarName: string,
  score: number,
  p: PillarInput,
  flags: RedFlag[],
  dataFields: DataField[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return buildFallbackNarrative(pillarName, score, p, flags);

  try {
    const client = new Anthropic();
    const verified = dataFields.filter((f) => f.source === "verified").length;
    const total = dataFields.length;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Generate a 2-3 sentence explanation for why this property pillar scored ${score}/100. Be specific with numbers. Do not use markdown.

Pillar: ${pillarName}
Property: ${p.address} (${p.assetType})
Region: ${p.region}
Asking: £${(p.askingPrice || p.guidePrice || 0).toLocaleString()}
Size: ${p.sqft?.toLocaleString() || "unknown"} sqft
Data confidence: ${verified}/${total} fields verified

Key data: ${dataFields.map((f) => `${f.name}: ${f.value} (${f.source}${f.assumption ? `, ${f.assumption}` : ""})`).join("; ")}

Red flags: ${flags.length > 0 ? flags.map((f) => `${f.text} [${f.severity}]`).join("; ") : "None"}`,
        },
      ],
    });

    const text = response.content[0];
    if (text.type === "text") return text.text;
    return buildFallbackNarrative(pillarName, score, p, flags);
  } catch {
    return buildFallbackNarrative(pillarName, score, p, flags);
  }
}

function buildFallbackNarrative(
  pillarName: string,
  score: number,
  p: PillarInput,
  flags: RedFlag[],
): string {
  const price = p.askingPrice || p.guidePrice || 0;
  const flagCount = flags.length;
  const quality = score >= 75 ? "strong" : score >= 50 ? "moderate" : "weak";

  switch (pillarName) {
    case "Price vs Market":
      return `${quality.charAt(0).toUpperCase() + quality.slice(1)} price positioning at £${price.toLocaleString()}${p.sqft ? ` (£${(price / p.sqft).toFixed(0)}/sqft)` : ""}. ${p.compsCount} comparable sales available for benchmarking.${flagCount > 0 ? ` ${flagCount} flag(s) noted — review assumptions.` : ""}`;
    case "Asset Condition":
      return `EPC ${p.epcRating || "unknown"}${p.yearBuilt ? `, built ~${p.yearBuilt}` : ""}. ${p.condition || "Condition not surveyed"}.${p.inFloodZone ? " Flood risk identified." : ""}${flagCount > 0 ? ` ${flagCount} flag(s) require attention.` : ""}`;
    case "Operator Quality":
      return `${p.companyName || "Owner"} — ${p.companyStatus || "status unknown"}.${p.tenantNames?.length ? ` Tenant(s): ${p.tenantNames.join(", ")}.` : " No tenant data."}${p.isAdmin ? " Company in administration." : ""}`;
    case "Market Context":
      return `${p.region} ${p.assetType} market.${p.marketErv && p.sqft ? ` Market ERV £${(p.marketErv / p.sqft).toFixed(0)}/sqft.` : ""}${p.rentGapPct != null ? ` Rent gap: ${p.rentGapPct > 0 ? "+" : ""}${p.rentGapPct}% (${p.rentGapDirection}).` : ""}`;
    case "Deal Structure":
      return `${p.isVacant ? "Vacant — no passing income." : `Passing rent £${(p.passingRent || 0).toLocaleString()}/yr.`}${p.dscr ? ` DSCR ${p.dscr.toFixed(2)}×.` : ""}${p.irr ? ` IRR ${p.irr.toFixed(1)}%.` : ""}${flagCount > 0 ? ` ${flagCount} flag(s) noted.` : ""}`;
    default:
      return `Score ${score}/100 with ${flagCount} flag(s).`;
  }
}

// ---------------------------------------------------------------------------
// MAIN: GENERATE PILLAR ANALYSIS
// ---------------------------------------------------------------------------

export async function generatePillarAnalysis(
  input: PillarInput,
  useAI: boolean = true,
): Promise<PillarAnalysisResult> {
  const allFlags = detectRedFlags(input);

  const pillarDefs = [
    { name: "Price vs Market", key: "priceVsMarket", calcScore: calcPriceScore },
    { name: "Asset Condition", key: "assetCondition", calcScore: calcAssetScore },
    { name: "Operator Quality", key: "operatorQuality", calcScore: calcOperatorScore },
    { name: "Market Context", key: "marketContext", calcScore: calcMarketScore },
    { name: "Deal Structure", key: "dealStructure", calcScore: calcDealScore },
  ];

  const pillars: PillarAnalysis[] = await Promise.all(
    pillarDefs.map(async (def) => {
      const pillarFlags = allFlags.filter((f) => f.pillar === def.key);
      const score = def.calcScore(input);
      const dataFields = calcDataFields(input, def.key);
      const dataCompleteness = calcDataCompleteness(dataFields);

      const narrative = useAI
        ? await generateNarrative(def.name, score, input, pillarFlags, dataFields)
        : buildFallbackNarrative(def.name, score, input, pillarFlags);

      return {
        name: def.name,
        pillarKey: def.key,
        score,
        narrative,
        redFlags: pillarFlags,
        dataCompleteness,
        dataFields,
      };
    }),
  );

  const overallScore = Math.round(
    pillars.reduce((sum, p) => sum + p.score * 0.2, 0),
  );

  const overallDataCompleteness = Math.round(
    pillars.reduce((sum, p) => sum + p.dataCompleteness, 0) / pillars.length,
  );

  let dealTemperature: "hot" | "warm" | "watch" | "cold";
  if (overallScore >= 75) dealTemperature = "hot";
  else if (overallScore >= 55) dealTemperature = "warm";
  else if (overallScore >= 40) dealTemperature = "watch";
  else dealTemperature = "cold";

  return {
    pillars,
    overallScore,
    dealTemperature,
    totalRedFlags: allFlags.length,
    overallDataCompleteness,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// HELPER: Build PillarInput from enrichment data
// ---------------------------------------------------------------------------

export function buildPillarInput(
  property: Record<string, any>,
  ds: Record<string, any>,
): PillarInput {
  const assumptions = ds.assumptions || {};
  const market = ds.market || {};
  const rentGap = ds.rentGap;
  const ra = ds.ricsAnalysis;
  const da = ds.dealAnalysis;
  const ai = ds.ai;
  const listing = ds.listing;

  return {
    address: property.address || "",
    assetType: property.assetType || "mixed",
    region: market.region || "se_uk",
    askingPrice: property.askingPrice || null,
    guidePrice: property.guidePrice || null,
    sqft: property.buildingSizeSqft || assumptions.sqft?.value || null,
    sqftSource: assumptions.sqft?.source || "unknown",
    yearBuilt: property.yearBuilt || assumptions.yearBuilt?.value || null,
    yearBuiltSource: assumptions.yearBuilt?.source || "unknown",
    tenure: property.tenure || listing?.tenure || ai?.tenure || null,
    epcRating: property.epcRating || assumptions.epcRating?.value || null,
    epcSource: assumptions.epcRating?.source || "unknown",
    passingRent: assumptions.passingRent?.value || null,
    passingRentSource: assumptions.passingRent?.source || "unknown",
    marketErv: assumptions.erv?.value || null,
    ervSource: assumptions.erv?.source || "unknown",
    occupancyPct: assumptions.occupancy?.value ?? null,
    occupancySource: assumptions.occupancy?.source || "unknown",
    voidMonths: assumptions.voidPeriod?.value || null,
    voidSource: assumptions.voidPeriod?.source || "unknown",
    capRate: market.capRate || null,
    capRateSource: assumptions.capRate?.source || "benchmark",
    noiAmount: assumptions.noi?.value || null,
    noiSource: assumptions.noi?.source || "unknown",
    compsCount: Array.isArray(ds.comps) ? ds.comps.length : 0,
    compsAvgPsf: Array.isArray(ds.comps) && ds.comps.length > 0
      ? ds.comps.reduce((s: number, c: any) => {
          const p = Number(c.price || c.pricePaid || 0);
          const a = Number(c.size_sqft || c.floorArea || 0);
          return a > 0 ? s + p / a : s;
        }, 0) / ds.comps.filter((c: any) => Number(c.size_sqft || c.floorArea || 0) > 0).length || null
      : null,
    planningAppsCount: Array.isArray(ds.planning) ? ds.planning.length : 0,
    hasFloodData: !!ds.flood,
    inFloodZone: ds.flood?.inFloodZone || property.inFloodZone || false,
    hasEpcData: !!ds.epc,
    hasAiExtraction: !!ds.ai,
    hasListingScrape: !!ds.listing,
    hasGeocode: !!ds.geocode,
    hasValuations: !!ds.valuations || !!ra?.valuations,
    companyStatus: ds.company?.companyStatus || null,
    companyName: ds.company?.companyName || property.ownerName || null,
    hasCompanyData: !!ds.company,
    isAuction: property.sourceTag === "Auction" || !!listing?.auctionDate,
    isAdmin: !!(ds.company?.companyStatus && /admin/i.test(ds.company.companyStatus)),
    isVacant: !!(ai?.vacancy && /vacant/i.test(ai.vacancy)) || (assumptions.occupancy?.value === 0),
    condition: ai?.condition || null,
    tenantNames: ai?.tenantNames || null,
    leaseExpiry: ai?.leaseExpiry || null,
    breakDates: ai?.breakDates || null,
    leaseLengthYears: property.leaseLengthYears || null,
    dscr: ra?.returns?.dscr || market.dscr || null,
    irr: ra?.returns?.irr10yr || ds.returns?.irr5yr || null,
    stabilisedYield: ra?.returns?.stabilisedYield || da?.stabilisedYield?.pct || null,
    rentGapPct: rentGap?.gapPct ?? null,
    rentGapDirection: rentGap?.direction || null,
    aiRisks: ai?.risks || null,
    aiOpportunities: ai?.opportunities || null,
    keyFeatures: ai?.keyFeatures || listing?.features || null,
  };
}
