import { NextRequest, NextResponse } from "next/server";
import { findComps, scoreCompsConfidence } from "@/lib/dealscope-comps";
import { findLettingsComps } from "@/lib/dealscope/lettings-comps";
import { computeDebtLayer } from "@/lib/dealscope/debt";
import { buildEnvironmentalSnapshot } from "@/lib/dealscope/environmental";
import { scoreAndStampComps } from "@/lib/dealscope/comp-scoring";
import { lookupEPCByAddress } from "@/lib/dealscope-epc";
import { fetchUKPlanningApplications } from "@/lib/planning-feed";
import { prisma } from "@/lib/prisma";
import { extractTextFromDocument } from "@/lib/textract";
import { parseDocument } from "@/lib/document-parser";
import { extractAddressFromDescription } from "@/lib/dealscope-text-parser";
import { parsePropertyUrl, type ListingData } from "@/lib/dealscope-url-parser";
import { extractListingWithAI, type AIExtractedData } from "@/lib/dealscope-ai-extract";
import {
  scoreProperty, epcSignal, compsSignal, planningSignal, dealAnalysisSignals,
  type PropertySignal, type PropertyScore,
} from "@/lib/dealscope-scoring";
import { calculateDealReturns, type DealReturnsMetrics } from "@/lib/scout-returns";
import {
  getMarketCapRate, getMarketERV, normaliseRegion, normaliseAssetType,
  detectRegionFromAddress, SCOUT_FINANCING, calculateAnnualDebtService,
} from "@/lib/data/scout-benchmarks";
import { calculateHoldScenario, defaultHoldInputs, type HoldResult } from "@/lib/hold-sell-model";
import { getFallbackCapRate, calculateIncomeCap, blendValuation } from "@/lib/avm";
import {
  analyseDeal, estimateEPC, estimateSize, estimateRent,
  estimateYearBuilt, estimateOccupancy, estimateVoidPeriod,
  type DealAnalysis,
} from "@/lib/deal-analysis";
import {
  analyseProperty, quickFilter,
  type RICSAnalysis, type AnalysisInput, type ComparableSale,
} from "@/lib/dealscope-deal-analysis";
import { checkCovenantUK } from "@/lib/covenant-check";
import { getCompanyOwner, findPropertiesByCompany } from "@/lib/dealscope-ccod";
import { classifyDevPotential } from "@/lib/dev-potential";
import { estimateMarketERV } from "@/lib/dealscope-rental-intelligence";

// ── Address extraction from URL slug ──
function extractAddressFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const postcodeRe = /[a-z]{1,2}\d{1,2}[a-z]?-\d[a-z]{2}/i;
    let addressSegment = segments.find((s) => postcodeRe.test(s));
    if (!addressSegment) {
      addressSegment = segments.reduce((a, b) => (a.length > b.length ? a : b));
    }
    addressSegment = addressSegment.replace(/-\d{3,}$/, "");
    const words = addressSegment.split("-").map((w) =>
      w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
    );
    const address = words.join(" ");
    if (address.length < 5 || address.length > 300) return null;
    return address;
  } catch {
    return null;
  }
}

// ── Geocode ──
// Returns lat/lng AND the formatted address (which Google fills with the
// official postcode even when the input was just a street/city). The caller
// uses formattedAddress to recover a postcode that the listing didn't expose.
async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string | null;
  postcode: string | null;
} | null> {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    if (result?.geometry?.location) {
      const formatted = (result.formatted_address as string | undefined) ?? null;
      const components = (result.address_components as Array<{ long_name: string; types: string[] }> | undefined) ?? [];
      const postalComp = components.find((c) => c.types.includes("postal_code"));
      const postcode = postalComp?.long_name
        ?? formatted?.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i)?.[1]
        ?? null;
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: formatted,
        postcode,
      };
    }
  } catch (e) {
    console.warn("[scope-enrich] Geocode failed:", e);
  }
  return null;
}

function buildSatelliteUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=600x400&maptype=satellite&key=${key}`;
}

function buildStreetViewUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${key}`;
}

// ── Environment Agency flood risk ──
// The EA flood-monitoring API returns STATIC flood area polygons (rivers &
// coastal zones) plus any ACTIVE warnings/alerts. A property is considered
// "in a flood zone" if it falls within ≤1km of any defined flood area.
// Active warnings elevate the risk level from Medium → High/Severe.
//
// severityLevel legend (EA API):
//   1 = Severe Flood Warning   (Severe)
//   2 = Flood Warning          (High)
//   3 = Flood Alert            (Medium)
//   4 = Warning no longer in force (Low)
async function fetchFloodRisk(lat: number, lng: number): Promise<any> {
  try {
    const [areasRes, floodsRes] = await Promise.all([
      fetch(
        `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=1`,
        { signal: AbortSignal.timeout(8000) }
      ),
      fetch(
        `https://environment.data.gov.uk/flood-monitoring/id/floods?lat=${lat}&long=${lng}&dist=5`,
        { signal: AbortSignal.timeout(8000) }
      ),
    ]);

    const areasJson = areasRes.ok ? await areasRes.json() : { items: [] };
    const floodsJson = floodsRes.ok ? await floodsRes.json() : { items: [] };

    const areas = areasJson?.items || [];
    const floods = floodsJson?.items || [];

    if (areas.length === 0 && floods.length === 0) {
      return {
        inFloodZone: false,
        zones: [],
        activeWarnings: 0,
        riskLevel: "Low",
        source: "EA flood-monitoring (floodAreas + floods within 1km/5km)",
      };
    }

    // Map EA severity levels → human labels
    const severityLabel = (n: number | undefined): string => {
      switch (n) {
        case 1: return "Severe";
        case 2: return "High";
        case 3: return "Medium";
        case 4: return "Low";
        default: return "Unknown";
      }
    };

    // Active warning severity = minimum (most severe) level of any active flood
    const activeSeverities = floods
      .map((f: any) => f.severityLevel)
      .filter((s: any) => typeof s === "number" && s >= 1 && s <= 4);
    const worstActive = activeSeverities.length ? Math.min(...activeSeverities) : null;

    // Overall risk level derivation
    let riskLevel: string;
    if (worstActive === 1) riskLevel = "Severe";
    else if (worstActive === 2) riskLevel = "High";
    else if (worstActive === 3) riskLevel = "Medium";
    else if (areas.length > 0) riskLevel = "Medium"; // in defined flood zone, no active warning
    else riskLevel = "Low";

    return {
      inFloodZone: areas.length > 0,
      zones: areas.slice(0, 5).map((item: any) => ({
        label: item.label || item.notation || "Flood area",
        description: item.description || null,
        county: item.county || null,
        riverOrSea: item.riverOrSea || null,
      })),
      activeWarnings: floods.length,
      worstActiveSeverity: worstActive ? severityLabel(worstActive) : null,
      riskLevel,
      source: "EA flood-monitoring (floodAreas + floods within 1km/5km)",
    };
  } catch (e) {
    console.warn("[scope-enrich] Flood API failed:", e);
    return null;
  }
}

// ── Build assumptions when data is missing ──
// ── Wave F: condition detection + dual-scenario ERV ──
// A market-benchmark ERV alone over-values unrefurbished period stock and
// under-values prime Cat-A space. We anchor the ERV against the listing's own
// description of the building's condition, then surface both an "as-is" and a
// "post-refurb" scenario so the recommendation can consider both.
type Condition = "unrefurbished" | "average" | "refurbished";
const CONDITION_MULTIPLIER: Record<Condition, number> = {
  unrefurbished: 0.6,  // bottom of the regional band
  average: 0.85,        // mid-band default
  refurbished: 1.0,     // top of the regional band (Cat-A / Grade-A)
};
const REFURB_TARGET_MULTIPLIER = 1.0; // all roads lead to top of band post-refurb
const DEFAULT_CAPEX_PSF = 125;

function detectCondition(text: string | null): { condition: Condition; signals: string[] } {
  if (!text) return { condition: "average", signals: [] };
  const t = text.toLowerCase();

  // Wave H1/H2: marketing copy uses "to Cat A standard" and "Grade A specification"
  // when describing the refurb *target*, not the current state. Require a positive
  // prefix (newly/recently/fully/finished/delivered/completed) before Cat A / Grade A
  // so target-condition language doesn't get scored as as-is condition.
  const refurbHits = [
    /\b(?:newly|recently|fully|just|finished|delivered)\s+(?:refurb\w*|fitted|completed|to\s+cat\s*a|to\s+grade\s*a)/,
    /\b(?:newly|recently|fully)\s+cat\s*a\b/,
    /\b(?:newly|recently|fully)\s+grade\s*a\b/,
    /\brecently\s+refurbished\b/, /\bfully\s+refurbished\b/, /\bexcellent\s+specification\b/,
    /\brefurbishment\s+completed\b/, /\bcompleted\s+in\s+20[12]\d\b/,
  ].filter((re) => re.test(t)).map((re) => re.source);

  const unrefurbHits = [
    /\bunrefurbished\b/, /\brequires?\s+modernisation\b/, /\brequires?\s+refurbishment\b/,
    /\bin\s+need\s+of\b/, /\boriginal\s+condition\b/, /\btired\b/, /\bdated\b/,
    /\bperiod\s+(?:building|property)\b/, /\brefurbishment\s+opportunity\b/,
    /\basset\s+management\s+opportunit/, /\brepositioning\b/,
    // Wave H1: "to bring to Cat A" / "to Grade A standard" — refurb *target* signals
    /\bto\s+(?:bring\s+to\s+)?(?:cat\s*a|grade\s*a)\b/,
    /\b(?:cat\s*a|grade\s*a)\s+standard\b/,
    /\bcapex\s+required\b/, /\bcurrently\s+dated\b/,
  ].filter((re) => re.test(t)).map((re) => re.source);

  // Wave H2: if capex/refurb language co-occurs, treat ambiguous Cat A / Grade A
  // hits as refurb-target rather than refurb-current.
  const refurbContextNearby = /\b(?:capex|capital\s+expenditure|refurbish[a-z]*|invest(?:ed|ment)?)\b/.test(t);
  const adjustedRefurbHits = refurbContextNearby
    ? refurbHits.filter((src) => !/cat\s*a|grade\s*a/.test(src))
    : refurbHits;

  if (adjustedRefurbHits.length > unrefurbHits.length) {
    return { condition: "refurbished", signals: adjustedRefurbHits };
  }
  if (unrefurbHits.length > 0) {
    return { condition: "unrefurbished", signals: unrefurbHits };
  }
  return { condition: "average", signals: [] };
}

function detectListingCapexPsf(text: string | null): number | null {
  if (!text) return null;
  // Match "£140 per sq ft of capex", "£140 psf capex", "£5.3m of capex (£140 psf)"
  const m1 = text.match(/£\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*sq\.?\s*ft|psf|\/\s*sq\.?\s*ft)\s*(?:of\s+)?(?:capex|capital\s+expenditure|capital\s+investment|refurbishment)/i);
  if (m1) {
    const v = parseFloat(m1[1].replace(/,/g, ""));
    if (v >= 20 && v <= 1000) return v;
  }
  // Match "£140 psf" appearing in same sentence as capex/refurb keyword
  const m2 = text.match(/(?:capex|capital\s+expenditure|refurbish[a-z]*|invested)[^.£]{0,80}£\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*sq\.?\s*ft|psf)/i);
  if (m2) {
    const v = parseFloat(m2[1].replace(/,/g, ""));
    if (v >= 20 && v <= 1000) return v;
  }
  return null;
}

async function buildAssumptions(
  aiData: AIExtractedData | null,
  epcData: any,
  askingPrice: number | undefined,
  assetType: string,
  region: string,
  listingDescription: string | null,
  scrapedSqft?: number,
  address?: string | null,
  scrapedNiy?: number,
): Promise<{
  sqft: number; sqftSource: string;
  erv: number; ervSource: string;
  ervAsIs: number; ervRefurb: number;
  condition: Condition; conditionSignals: string[];
  capexPsf: number; capexPsfSource: string; capexTotal: number;
  yearBuilt: number; yearBuiltSource: string;
  capRate: number; capRateSource: string;
  noi: number; noiSource: string;
  // Wave T honest-mode: passingRent is null when the listing doesn't publish
  // it — callers MUST handle null rather than relying on an ERV fallback.
  passingRent: number | null; passingRentSource: string;
  passingRentPsf: number | null;
  epcRating: string; epcRatingSource: string;
  occupancyPct: number; occupancySource: string;
  voidMonths: number; voidReasoning: string;
}> {
  const mktCapRate = getMarketCapRate(assetType, region);

  // ── Size — never blank ──
  let sqft = aiData?.size_sqft || scrapedSqft || epcData?.floorAreaSqft || null;
  let sqftSource = aiData?.size_sqft ? "AI extraction" : scrapedSqft ? "scraped from listing" : epcData?.floorAreaSqft ? "EPC register" : "";
  if (!sqft && aiData?.size_sqm) {
    sqft = Math.round(aiData.size_sqm * 10.764);
    sqftSource = "converted from sqm";
  }
  if (!sqft) {
    const est = estimateSize(assetType, askingPrice || null, region);
    sqft = est.value;
    sqftSource = `estimated (${est.method})`;
  }

  // ── ERV — listing passing rent (priority 1) or AI market analysis (priority 2) ──
  // estimateMarketERV() NEVER returns null — it always produces a number.
  // There is always available market data; we never prompt the user to enter ERV manually.
  let erv: number;
  let ervSource: string;

  if (aiData?.passingRent) {
    erv = aiData.passingRent;
    ervSource = "listing passing rent";
  } else {
    // AI-based market ERV estimation — works for any location and asset type worldwide.
    // Claude reasons about the specific submarket rather than using a lookup table.
    // Falls back through multiple retry attempts; never returns null.
    const effectiveAddress = address || `${assetType} property, ${region}`;
    const aiERV = await estimateMarketERV(effectiveAddress, assetType, sqft, {
      yearBuilt: aiData?.yearBuilt,
      epcRating: aiData?.epcRating || epcData?.epcRating,
      condition: aiData?.condition,
      occupancy: aiData?.vacancy,
    });
    erv = aiERV.ervAnnual;
    ervSource = `AI market analysis — £${aiERV.ervPsf.toFixed(2)}/sqft (${aiERV.confidence} confidence): ${aiERV.reasoning}`;
  }

  // ── Basement adjustment ──
  // Multi-floor buildings whose accommodation includes a basement command lower
  // rent on that level (typically 30-50% of upper-floor rate). Without floor-by-
  // floor sqft we can't apportion exactly, so we apply a flat 10% haircut to the
  // ERV when the listing or accommodation explicitly mentions a basement. This
  // matches a "5-floor building, one floor at half-rent" rule of thumb (~10% off
  // total). Source label makes the adjustment visible in the dossier.
  const accomText = [
    listingDescription || "",
    Array.isArray(aiData?.accommodation)
      ? aiData!.accommodation!.map((a: any) => [a.unit, a.tenant].filter(Boolean).join(" ")).join(" ")
      : "",
  ].join(" ").toLowerCase();
  if (/\bbasement\b|\blower\s+ground\b/.test(accomText)) {
    erv = Math.round(erv * 0.9);
    ervSource = `${ervSource} · −10% basement adjustment`;
  }

  // ── Wave F: condition-anchored as-is and post-refurb scenarios ──
  // The market-benchmark ERV is treated as the *top* of the regional band.
  // We then anchor as-is against the listing's condition signals (period
  // building → 0.6 of top-band, average → 0.85, Cat-A → 1.0) and treat the
  // refurb scenario as repositioned to top-band.
  const conditionInput = [listingDescription || "", aiData?.condition || ""].join(" ");
  const conditionDetect = detectCondition(conditionInput);
  const condition = conditionDetect.condition;
  const conditionSignals = conditionDetect.signals;
  // If we already used aiData.passingRent (real income), don't fight it: as-is
  // = passing rent, refurb still re-anchored to top-band.
  const baseTopBand = aiData?.passingRent
    ? erv / Math.max(CONDITION_MULTIPLIER[condition], 0.5)  // back-derive top-band
    : erv / CONDITION_MULTIPLIER.refurbished;                // erv already at top
  const ervAsIs = aiData?.passingRent ? erv : Math.round(baseTopBand * CONDITION_MULTIPLIER[condition]);
  const ervRefurb = Math.round(baseTopBand * REFURB_TARGET_MULTIPLIER);
  // Use the condition-anchored as-is figure as the canonical ERV going forward
  // so downstream NOI/IRR/RICS calculations stop over-pricing period stock.
  if (!aiData?.passingRent) {
    erv = ervAsIs;
    ervSource = `${ervSource} · ${condition} anchor (×${CONDITION_MULTIPLIER[condition]})`;
  }

  // ── Capex (post-refurb scenario only) ──
  const listingCapexPsf = detectListingCapexPsf(listingDescription);
  const capexPsf = listingCapexPsf ?? DEFAULT_CAPEX_PSF;
  const capexPsfSource = listingCapexPsf
    ? `listing-stated (£${listingCapexPsf}/sqft)`
    : `default office reposition (£${DEFAULT_CAPEX_PSF}/sqft)`;
  const capexTotal = Math.round(capexPsf * (sqft || 0));

  // ── Year built — never blank ──
  let yearBuilt = aiData?.yearBuilt || null;
  let yearBuiltSource = yearBuilt ? "listing" : "";
  if (!yearBuilt && epcData?.constructionAgeBand) {
    const ageBand = epcData.constructionAgeBand as string;
    const yearMatch = ageBand.match(/(\d{4})/);
    if (yearMatch) {
      yearBuilt = parseInt(yearMatch[1], 10);
      yearBuiltSource = "EPC construction age band";
    }
  }
  if (!yearBuilt) {
    const est = estimateYearBuilt(assetType, epcData?.constructionAgeBand);
    yearBuilt = est.value;
    yearBuiltSource = `estimated (${est.method})`;
  }

  // ── EPC — never blank ──
  let epcRating = epcData?.epcRating || aiData?.epcRating || null;
  let epcRatingSource = epcRating ? (epcData?.epcRating ? "EPC Register" : "listing") : "";
  if (!epcRating) {
    const est = estimateEPC(assetType, yearBuilt);
    epcRating = est.value;
    epcRatingSource = `estimated (${est.method})`;
  }

  // ── Occupancy — never blank, default to vacant ──
  const occEst = estimateOccupancy(listingDescription, aiData?.vacancy || null);
  const occupancyPct = occEst.value;
  const occupancySource = occEst.method;

  // ── Void period ──
  const locationGrade = "secondary"; // will be refined by deal analysis
  const voidEst = estimateVoidPeriod(assetType, locationGrade, sqft);

  // ── Cap rate — never blank ──
  // Listing-stated NIY (RIB / Acuitus / Allsop quote this verbatim) wins over
  // the market benchmark when present and within a sane range.
  let capRate = mktCapRate;
  let capRateSource = `market benchmark for ${region} ${assetType} (${(mktCapRate * 100).toFixed(1)}%)`;
  if (scrapedNiy && scrapedNiy >= 1 && scrapedNiy <= 20) {
    capRate = scrapedNiy / 100;
    capRateSource = `listing (Net Initial Yield ${scrapedNiy.toFixed(2)}%)`;
  }

  // ── NOI — always computed from ERV (ERV is always available) ──
  const noi = erv * 0.85;
  const noiSource = "estimated (ERV × 85% after opex)";

  // ── Passing rent — honest mode ──
  // If the AI extractor found a rent in the listing we use it verbatim
  // (rib.co.uk, Acuitus, Allsop and most agent decks publish the rent roll
  // so this is the normal case). If it didn't, we LEAVE IT NULL rather
  // than fall back to ERV — the old `aiData?.passingRent || erv` fallback
  // was a hallucination that masqueraded as real current income.
  const passingRent = occupancyPct === 0
    ? 0
    : (aiData?.passingRent ?? null);
  const passingRentSource = occupancyPct === 0
    ? "vacant (£0 current income)"
    : (aiData?.passingRent != null ? "listing" : "unknown (not published in brochure)");
  // Derived psf — only when both rent and sqft are known.
  const passingRentPsf = passingRent != null && passingRent > 0 && sqft > 0
    ? passingRent / sqft
    : null;

  return {
    sqft, sqftSource, erv, ervSource,
    ervAsIs, ervRefurb,
    condition, conditionSignals,
    capexPsf, capexPsfSource, capexTotal,
    yearBuilt: yearBuilt!, yearBuiltSource,
    capRate, capRateSource, noi, noiSource,
    passingRent, passingRentSource, passingRentPsf,
    epcRating, epcRatingSource, occupancyPct, occupancySource,
    voidMonths: voidEst.months, voidReasoning: voidEst.reasoning,
  };
}

// ── Build property signals for scoring ──
function buildSignals(
  epcData: any,
  planningApps: any[],
  comps: any[],
  aiData: AIExtractedData | null,
  sourceTag: string,
  listingData: ListingData | null,
  floodData: any,
  assetType: string,
  yearBuilt: number | null,
): PropertySignal[] {
  const signals: PropertySignal[] = [];

  // EPC signal
  const epc = epcSignal(epcData?.epcRating);
  if (epc) signals.push(epc);

  // Comps signal
  const comp = compsSignal(comps.length);
  if (comp) signals.push(comp);

  // Planning signal
  if (planningApps.length > 0) {
    signals.push(planningSignal("planning-history"));
  }

  // Auction signal
  if (sourceTag === "Auction") {
    signals.push({
      type: "distress",
      name: "Listed at auction",
      weight: 7,
      confidence: 100,
      source: "Listing source",
    });
  }

  // Legal pack = potential distress
  if (listingData?.legalPackUrl) {
    signals.push({
      type: "distress",
      name: "Legal pack available (auction)",
      weight: 5,
      confidence: 85,
      source: "Listing page",
    });
  }

  // Vacancy signal
  if (aiData?.vacancy?.toLowerCase().includes("vacant")) {
    signals.push({
      type: "opportunity",
      name: "Property is vacant",
      weight: 6,
      confidence: 90,
      source: "Listing description",
    });
  }

  // Flood risk signal
  if (floodData?.inFloodZone) {
    signals.push({
      type: "opportunity",
      name: "In flood risk zone",
      weight: 4,
      confidence: 95,
      source: "Environment Agency",
    });
  }

  // Contamination risk: industrial + pre-2000
  if (yearBuilt && yearBuilt < 2000) {
    const isIndustrial = /industrial|warehouse|factory/i.test(assetType);
    if (isIndustrial) {
      signals.push({
        type: "opportunity",
        name: "Potential contamination risk (industrial, pre-2000)",
        weight: 5,
        confidence: 60,
        source: "Inferred from age + type",
      });
    }
  }

  // AI-identified risks
  if (aiData?.risks) {
    aiData.risks.slice(0, 3).forEach((risk) => {
      signals.push({
        type: "distress",
        name: risk,
        weight: 4,
        confidence: 70,
        source: "AI extraction",
      });
    });
  }

  return signals;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let address: string | undefined;
    let url: string | undefined;
    let guidePrice: number | undefined;
    let price: number | undefined;
    let sourceTag = "Manual enrichment";
    let auctionHouse: string | undefined;
    let documentId: string | undefined;
    let listingData: ListingData | null = null;
    let aiData: AIExtractedData | null = null;
    let rawListingText: string | null = null;
    let existingDealId: string | undefined;

    // ── PARSE INPUT ──
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      address = formData.get("address") as string | undefined;
      url = formData.get("url") as string | undefined;
      const priceVal = formData.get("price");
      if (priceVal) price = Number(priceVal);
      const pdfFile = formData.get("pdf") as File | undefined;

      if (pdfFile) {
        try {
          const buffer = Buffer.from(await pdfFile.arrayBuffer());
          const extractedText = await extractTextFromDocument(buffer);
          if (extractedText) {
            rawListingText = extractedText;
            const parsed = await parseDocument(extractedText, null, "other");
            const extractedAddressData = await extractAddressFromDescription(extractedText);
            if (extractedAddressData?.address && !address) {
              address = extractedAddressData.address;
            }
            const document = await prisma.document.create({
              data: {
                filename: pdfFile.name,
                fileSize: buffer.length,
                mimeType: pdfFile.type || "application/pdf",
                documentType: parsed?.documentType || "other",
                summary: parsed?.summary || null,
                extractedData: (parsed?.keyData as any) || undefined,
                extractedJson: extractedText,
                status: "processed",
              },
            });
            documentId = document.id;
            sourceTag = "PDF upload";
          }
        } catch (e) {
          console.warn("[scope-enrich] Failed to extract from PDF:", e);
        }
      }
    } else {
      const body = (await req.json()) as Record<string, unknown>;
      address = body.address as string | undefined;
      url = body.url as string | undefined;
      price = body.price as number | undefined;
      existingDealId = (body.dealId ?? body.id ?? body.propertyId) as string | undefined;
      // Wave G test hook: skip the DB write and return the computed enrichment payload.
      // Lets us validate Wave F scenarios against real listings without a DB round-trip.
      if (body.dryRun === true) (req as unknown as { __dryRun?: boolean }).__dryRun = true;
    }

    // ── STAGE 2: If dealId provided, load existing quick-assessed deal ──
    if (existingDealId) {
      const existing = await prisma.scoutDeal.findUnique({ where: { id: existingDealId } });
      if (existing) {
        if (!address) address = existing.address;
        if (!url) url = existing.sourceUrl || undefined;
        if (!price && !guidePrice) guidePrice = existing.guidePrice || undefined;
        sourceTag = existing.sourceTag;
        documentId = existing.brochureDocId || undefined;
        // Recover listing data from dataSources
        const ds = existing.dataSources as any;
        if (ds?.listing) listingData = ds.listing;
      }
    }

    if (!address && !url) {
      return NextResponse.json({ error: "address, url, or pdf is required" }, { status: 400 });
    }

    // ── DEEP SCRAPE URL ──
    let ogImage: string | undefined;
    let scrapedSqft: number | undefined;
    let scrapedPropertyType: string | undefined;
    let scrapedPassingRent: number | undefined;
    let scrapedNiy: number | undefined;
    if (url) {
      try {
        const parsed = await parsePropertyUrl(url);
        listingData = parsed.listing;
        rawListingText = parsed.description || listingData?.description || null;
        if (parsed.property_type) scrapedPropertyType = parsed.property_type;
        if (parsed.passingRent) scrapedPassingRent = parsed.passingRent;
        if (parsed.niy && parsed.niy > 0 && parsed.niy < 25) scrapedNiy = parsed.niy;

        // If scrape got a better address than what we have (or we have nothing), use it
        if (parsed.address && parsed.address !== "Unknown Address" && parsed.address.length >= 5) {
          if (!address || address.length < 5) {
            address = parsed.address;
          } else if (parsed.address.length > address.length && /\d/.test(parsed.address)) {
            // Scraped address has a number (street number/postcode) — likely better
            address = parsed.address;
          }
        }
        if (!price && !guidePrice && parsed.price) {
          guidePrice = parsed.price;
        }
        ogImage = listingData?.ogImage || undefined;
        if (parsed.sqft && !scrapedSqft) scrapedSqft = parsed.sqft;
      } catch (e) {
        console.warn("[scope-enrich] Deep scrape failed:", e);
      }

      // Fallback: extract address from URL slug if scrape didn't produce a good one
      if (!address || address.length < 5) {
        address = extractAddressFromUrl(url) || undefined;
      }
      if (!address) {
        return NextResponse.json(
          { error: "Couldn't extract an address from this URL. Try pasting the address directly." },
          { status: 400 }
        );
      }

      const domain = new URL(url).hostname.replace(/^www\./i, "");
      const rootName = domain.split(".")[0];
      if (domain.includes("savills")) { sourceTag = "Auction"; auctionHouse = "Savills"; }
      else if (domain.includes("allsop")) { sourceTag = "Auction"; auctionHouse = "Allsop"; }
      else if (domain.includes("acuitus")) { sourceTag = "Auction"; auctionHouse = "Acuitus"; }
      else if (domain.includes("eigproperty")) { sourceTag = "Auction"; auctionHouse = "EIG"; }
      else if (domain.includes("strettons")) { sourceTag = "Auction"; auctionHouse = "Strettons"; }
      else if (domain.includes("rib.co.uk")) { sourceTag = "Agent"; auctionHouse = "RIB"; }
      else if (domain.includes("rightmove") || domain.includes("zoopla") || domain.includes("onthemarket")) { sourceTag = "Listed"; }
      else if (domain.includes("loopnet")) { sourceTag = "Listed"; }
      else { sourceTag = "URL import"; auctionHouse = rootName.length > 2 ? rootName.charAt(0).toUpperCase() + rootName.slice(1) : undefined; }
    }

    // ── AI EXTRACTION (parallel with geocode) ──
    // If no description from scraping, build a minimal text from available data for AI
    if (!rawListingText && listingData) {
      const parts: string[] = [];
      if (listingData.features?.length) parts.push("Features: " + listingData.features.join(". "));
      if (listingData.accommodation) parts.push(listingData.accommodation);
      if (listingData.tenure) parts.push("Tenure: " + listingData.tenure);
      if (parts.length > 0) rawListingText = parts.join("\n\n");
    }

    const [aiResult, geo] = await Promise.all([
      rawListingText ? extractListingWithAI(rawListingText) : Promise.resolve(null),
      geocodeAddress(address!),
    ]);
    aiData = aiResult;

    // Use AI-extracted address if better
    if (aiData?.address && aiData.address.length > (address?.length || 0)) {
      address = aiData.address;
    }
    // Use AI-extracted price
    if (aiData?.price && !guidePrice && !price) {
      guidePrice = aiData.price;
    }

    // ── POSTCODE RECOVERY ──
    // If the listing didn't expose a postcode but Google geocoded the address,
    // upgrade `address` to include the official formatted_address. This is the
    // single biggest unlock for downstream EPC + CCOD + comps lookups.
    const addressHasPostcode = !!address && /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i.test(address);
    if (!addressHasPostcode && geo?.postcode && address) {
      address = `${address.replace(/,?\s*$/, "")}, ${geo.postcode}`;
    } else if (!addressHasPostcode && geo?.formattedAddress && /[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i.test(geo.formattedAddress)) {
      address = geo.formattedAddress;
    }

    // ── SATELLITE + STREET VIEW ──
    let satelliteUrl = ogImage || null;
    let streetViewUrl: string | null = null;
    if (geo) {
      const satUrl = buildSatelliteUrl(geo.lat, geo.lng);
      if (satUrl) satelliteUrl = satUrl;
      streetViewUrl = buildStreetViewUrl(geo.lat, geo.lng);
    }

    // ── PARALLEL ENRICHMENT: EPC, Comps, Planning, Flood, Ownership, Covenant ──
    const postcodeMatch = address?.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i);
    const postcode = postcodeMatch?.[1] || "";
    const primaryTenant = aiData?.tenantNames?.[0] || null;

    const results = await Promise.allSettled([
      lookupEPCByAddress(address!),
      findComps(address!, aiData?.propertyType || "Mixed", aiData?.size_sqft || undefined, 24),
      fetchUKPlanningApplications(address!),
      geo ? fetchFloodRisk(geo.lat, geo.lng) : Promise.resolve(null),
      postcode ? getCompanyOwner(address!, postcode) : Promise.resolve(null),
      primaryTenant ? checkCovenantUK(primaryTenant, "UK") : Promise.resolve(null),
      // Wave O: real lettings comps from internal Letting records
      findLettingsComps(postcode, aiData?.propertyType ?? null, 24),
    ]);

    const epcData = results[0].status === "fulfilled" ? results[0].value : null;
    const comparableSales = results[1].status === "fulfilled" ? results[1].value : [];
    const planningApps = results[2].status === "fulfilled" ? results[2].value : [];
    const floodData = results[3].status === "fulfilled" ? results[3].value : null;
    const companyOwner = results[4].status === "fulfilled" ? results[4].value : null;
    const covenantResult = results[5].status === "fulfilled" ? results[5].value : null;
    // Wave O widening fallback — result is now { comps, matchStage, searched, note }
    const lettingsResult = results[6].status === "fulfilled"
      ? results[6].value
      : { comps: [], matchStage: "none" as const, searched: { sector: "", outcode: "", area: "" }, note: "lettings search failed" };
    const lettingsComps = lettingsResult.comps;

    // ── SECONDARY: Owner portfolio + Dev potential (need primary results) ──
    let ownerPortfolio: any[] = [];
    if (companyOwner?.companyNumber) {
      try { ownerPortfolio = await findPropertiesByCompany(companyOwner.companyNumber, postcode?.slice(0, 4)); }
      catch (e) { console.warn("[enrich] Portfolio lookup failed:", e); }
    }

    // Wave K: Companies House charges register for the registered owner.
    // Honest mode — only populated when we have a real owner companyNumber.
    let chargesRecord: { totalCount: number; charges: Array<Record<string, unknown>> } | null = null;
    if (companyOwner?.companyNumber) {
      try {
        const { getCompanyCharges } = await import("@/lib/dealscope-companies-house");
        const ch = await getCompanyCharges(companyOwner.companyNumber);
        if (ch) {
          chargesRecord = {
            totalCount: ch.totalCount,
            charges: ch.charges.map((c) => ({
              priority: c.chargeNumber ?? null,
              chargeCode: c.chargeCode ?? null,
              lender: c.description ?? c.classOfCharge ?? null,
              status: c.status ?? null,
              date: c.dateOfCreation ?? c.dateCreated ?? null,
              classOfCharge: c.classOfCharge ?? null,
            })),
          };
        }
      } catch (e) { console.warn("[enrich] Charges fetch failed:", e); }
    }

    let devPotential: any = null;
    try {
      devPotential = await classifyDevPotential({
        id: "enrich", name: address || "Unknown",
        assetType: aiData?.propertyType || "Mixed",
        location: address || "Unknown", sqft: aiData?.size_sqft || null, country: "UK",
      });
    } catch (e) { console.warn("[enrich] Dev potential failed:", e); }

    // ── DETERMINE ASSET TYPE + REGION ──
    // Scraped (markdown-labelled) type wins over AI-inferred which wins over default.
    // Cross-check: if free-text description / title strongly contradicts the
    // initial classification (e.g. "jewellers shop" labelled as "office"),
    // reclassify to the term we actually saw. This kills the Rightmove
    // false-positive where prime-London office ERV got applied to a retail
    // unit and produced a phantom 38% IRR.
    // Wave H3: count matches per type instead of first-match-wins so a single
    // stray "store" (e.g. "store room") in an office description doesn't
    // mis-classify the whole asset as retail. Office is now first-class.
    const ASSET_KEYWORDS: { type: string; re: RegExp }[] = [
      { type: "office",     re: /\b(office\s+(?:building|accommodation|stock|space|investment)|cat\s*a\s+office|grade\s*a\s+office|hq\s+building|business\s+park\s+office)\b/i },
      { type: "retail",     re: /\b(jeweller|jewellers|shop\b|retail\s+unit|retail\s+investment|boutique|showroom|store\s+(?:premises|investment|unit)|high\s+street|cafe|caf\u00e9|restaurant|takeaway|bar\b|pub\b|salon|barbers?|tea\s*room|beauty\s+salon)\b/i },
      { type: "industrial", re: /\b(warehouse|industrial|factory|workshop|distribution|logistics|trade\s+counter)\b/i },
      { type: "leisure",    re: /\b(gym\b|leisure|nightclub|cinema|hotel\s+leisure)\b/i },
      { type: "hotel",      re: /\b(hotel|guest\s*house|b&b\b|bed\s*and\s*breakfast|inn\b)\b/i },
      { type: "residential",re: /\b(flat\b|flats\b|apartment|house\b|hmo\b|residential\s+investment)\b/i },
      { type: "healthcare", re: /\b(care\s*home|nursing\s*home|surgery|clinic|dental|gp\s*practice)\b/i },
    ];
    const haystack = [
      (rawListingText || "").slice(0, 4000),
      aiData?.keyFeatures?.join(" ") || "",
      address || "",
    ].join(" ").toLowerCase();
    const initialType = scrapedPropertyType || aiData?.propertyType || "Mixed";
    let crossCheckedType = initialType;
    // Score each candidate by number of keyword matches; winner needs ≥2 hits
    // OR a unique single hit when initialType is "Mixed".
    const scores: { type: string; hits: number }[] = ASSET_KEYWORDS.map(({ type, re }) => {
      const matches = haystack.match(new RegExp(re.source, "gi"));
      return { type, hits: matches ? matches.length : 0 };
    }).filter((s) => s.hits > 0).sort((a, b) => b.hits - a.hits);

    if (scores.length > 0) {
      const winner = scores[0];
      const isMixed = /^mixed$/i.test(initialType);
      const strong = winner.hits >= 2 || (isMixed && scores.length === 1);
      const alreadyMatchesInitial = new RegExp(`\\b${winner.type}\\b`, "i").test(initialType);
      if (strong && !alreadyMatchesInitial) {
        console.log(`[enrich] Asset-type cross-check: "${initialType}" → "${winner.type}" (${winner.hits} keyword hits)`);
        crossCheckedType = winner.type;
      }
    }
    const assetType = crossCheckedType;
    // Inject scraped passing rent so buildAssumptions treats it as a listing fact
    if (scrapedPassingRent && !aiData?.passingRent) {
      aiData = { ...(aiData || {} as AIExtractedData), passingRent: scrapedPassingRent };
    }
    const region = detectRegionFromAddress(address!); // Detect from address/postcode
    const normAsset = normaliseAssetType(assetType);
    const normRegion = normaliseRegion(region);

    // ── BUILD ASSUMPTIONS (never returns blank fields) ──
    const askingPrice = guidePrice || price;
    const assumptions = await buildAssumptions(aiData, epcData, askingPrice, normAsset, normRegion, rawListingText, scrapedSqft, address, scrapedNiy);

    // Wave M: re-apply user overrides from prior PATCH calls so they survive
    // a re-enrich. Each override is { value, source: "user", updatedAt }.
    let preservedUserOverrides: Record<string, { value: unknown; source: string; updatedAt: string }> = {};
    if (existingDealId) {
      try {
        const existing = await prisma.scoutDeal.findUnique({
          where: { id: existingDealId },
          select: { dataSources: true },
        });
        const ds = (existing?.dataSources ?? {}) as Record<string, unknown>;
        preservedUserOverrides = (ds.userOverrides as typeof preservedUserOverrides) ?? {};
        const apply = (key: keyof typeof assumptions, source: string) => {
          const ov = preservedUserOverrides[key as string];
          if (ov && typeof ov.value === "number") {
            (assumptions as Record<string, unknown>)[key as string] = ov.value;
            (assumptions as Record<string, unknown>)[source] = "user override";
          }
        };
        apply("sqft", "sqftSource");
        apply("erv", "ervSource");
        apply("passingRent", "passingRentSource");
        apply("capRate", "capRateSource");
        apply("noi", "noiSource");
        apply("voidMonths", "voidReasoning");
      } catch (e) {
        console.warn("[enrich] Failed to load userOverrides:", e);
      }
    }

    // ── PROVENANCE FILTER ──
    // Top-level ScoutDeal columns must only hold values that come from real
    // sources. Estimated/AI/benchmark fallbacks live in `dataSources.assumptions`
    // and the UI surfaces them with their source label. This is enforcing
    // Rule 3 — no fabricated facts on the dossier.
    const isRealSource = (s: string | undefined | null) =>
      !!s && !/^estimated|^assumed|benchmark|^AI market analysis|^typical|^9 months/i.test(s);
    const realSqft = isRealSource(assumptions.sqftSource) ? assumptions.sqft : null;
    const realYearBuilt = isRealSource(assumptions.yearBuiltSource) ? assumptions.yearBuilt : null;
    const realEpc = isRealSource(assumptions.epcRatingSource) ? assumptions.epcRating : null;
    const realPassingRent = isRealSource(assumptions.passingRentSource) && (assumptions.passingRent ?? 0) > 0
      ? assumptions.passingRent : null;
    // Occupancy is only "real" if explicitly stated in the listing/AI vacancy field
    const occupancyIsReal = /listing|stated|tenant|let|vacant/i.test(assumptions.occupancySource);
    const realOccupancyPct = occupancyIsReal ? assumptions.occupancyPct : null;

    // ── SCORING ──
    const signals = buildSignals(
      epcData, planningApps, comparableSales,
      aiData, sourceTag, listingData, floodData,
      assetType, assumptions.yearBuilt,
    );
    let propertyScore = scoreProperty(signals);

    // ── VALUATIONS (AVM) ──
    let valuations: any = null;
    const effectivePrice = askingPrice || 0;
    if (effectivePrice > 0) {
      const marketCapRate = getMarketCapRate(normAsset, normRegion);
      const incomeCapValue = assumptions.noi / marketCapRate;

      // PSF value from comps
      let psfValue: any = null;
      if (comparableSales.length > 0) {
        const compsConf = scoreCompsConfidence(comparableSales, assumptions.sqft);
        psfValue = compsConf.valueRange;
      }

      // Blend
      const psfMid: number | null = typeof psfValue?.mid === "number" ? psfValue.mid * assumptions.sqft : null;
      const blended = blendValuation(
        incomeCapValue,
        psfMid as any,
        comparableSales.length,
      );

      const b = blended as any;

      // ── Wave F: dual-scenario valuation + £/psf comp band check ──
      // Capitalise as-is and refurbished ERVs at the same yield. Refurb deducts
      // capex. The recommendation considers whichever scenario clears asking,
      // not just the headline blended figure.
      const noiAsIs = assumptions.ervAsIs * 0.85;
      const noiRefurb = assumptions.ervRefurb * 0.85;
      const valueAsIs = noiAsIs / assumptions.capRate;
      const valueRefurbGross = noiRefurb / assumptions.capRate;
      const valueRefurbNet = valueRefurbGross - assumptions.capexTotal;

      const askingPsf = assumptions.sqft > 0 ? Math.round(effectivePrice / assumptions.sqft) : null;
      const compPsfBand = psfValue ? {
        low: psfValue.low ? Math.round(psfValue.low) : null,
        mid: psfValue.mid ? Math.round(psfValue.mid) : null,
        high: psfValue.high ? Math.round(psfValue.high) : null,
        sampleSize: comparableSales.length,
      } : null;

      // Recommendation logic — replaces the old "discount %" gate.
      // BUY when either as-is or refurb-net clears asking, OR asking £/psf is
      // visibly below the comp band low. REVIEW when within 10%. PASS otherwise.
      const bestScenarioValue = Math.max(valueAsIs, valueRefurbNet);
      const psfClearlyCheap =
        askingPsf !== null && compPsfBand?.low !== null && compPsfBand?.low !== undefined &&
        askingPsf < compPsfBand.low * 0.9;
      let recommendation: "BUY" | "REVIEW" | "PASS";
      const reasons: string[] = [];
      if (bestScenarioValue >= effectivePrice || psfClearlyCheap) {
        recommendation = "BUY";
        if (valueAsIs >= effectivePrice) reasons.push(`As-is value £${Math.round(valueAsIs).toLocaleString()} clears asking`);
        if (valueRefurbNet >= effectivePrice) reasons.push(`Refurb-net value £${Math.round(valueRefurbNet).toLocaleString()} clears asking`);
        if (psfClearlyCheap) reasons.push(`Asking £${askingPsf}/sqft is below comp band low £${compPsfBand!.low}/sqft`);
      } else if (bestScenarioValue >= effectivePrice * 0.9) {
        recommendation = "REVIEW";
        reasons.push(`Best scenario £${Math.round(bestScenarioValue).toLocaleString()} within 10% of asking £${effectivePrice.toLocaleString()}`);
      } else {
        recommendation = "PASS";
        reasons.push(`Best scenario £${Math.round(bestScenarioValue).toLocaleString()} more than 10% below asking £${effectivePrice.toLocaleString()}`);
      }

      valuations = {
        incomeCap: { value: Math.round(incomeCapValue), method: "Income capitalisation", capRate: marketCapRate, noi: Math.round(assumptions.noi) },
        psf: psfValue ? { value: Math.round(psfValue.mid * assumptions.sqft), method: "Price per sqft", low: psfValue.low ? Math.round(psfValue.low * assumptions.sqft) : null, high: psfValue.high ? Math.round(psfValue.high * assumptions.sqft) : null } : null,
        blended: b.avmValue !== undefined
          ? { value: b.avmValue ? Math.round(b.avmValue) : null, confidence: b.confidenceScore, method: b.method }
          : { value: b.value ? Math.round(b.value) : null, method: b.method || "blended" },
        askingPrice: effectivePrice,
        discount: incomeCapValue > effectivePrice ? Math.round(((incomeCapValue - effectivePrice) / incomeCapValue) * 100) : null,
        // Wave F additions
        scenarios: {
          asIs: {
            erv: Math.round(assumptions.ervAsIs),
            ervPsf: assumptions.sqft > 0 ? parseFloat((assumptions.ervAsIs / assumptions.sqft).toFixed(2)) : null,
            noi: Math.round(noiAsIs),
            value: Math.round(valueAsIs),
            clearsAsking: valueAsIs >= effectivePrice,
          },
          refurb: {
            erv: Math.round(assumptions.ervRefurb),
            ervPsf: assumptions.sqft > 0 ? parseFloat((assumptions.ervRefurb / assumptions.sqft).toFixed(2)) : null,
            noi: Math.round(noiRefurb),
            capexPsf: assumptions.capexPsf,
            capexTotal: assumptions.capexTotal,
            capexSource: assumptions.capexPsfSource,
            grossValue: Math.round(valueRefurbGross),
            value: Math.round(valueRefurbNet),
            clearsAsking: valueRefurbNet >= effectivePrice,
          },
        },
        condition: assumptions.condition,
        conditionSignals: assumptions.conditionSignals,
        askingPsf,
        compPsfBand,
        recommendation,
        recommendationReasons: reasons,
      };
    }

    // ── RETURNS (IRR, DSCR, CoC) ──
    let returns: DealReturnsMetrics | null = null;
    if (effectivePrice > 0) {
      const mktCapRate = getMarketCapRate(normAsset, normRegion);
      returns = calculateDealReturns({
        askingPrice: effectivePrice,
        guidePrice: guidePrice || null,
        capRate: mktCapRate * 100, // as percentage
        noi: assumptions.noi,
        assetType: normAsset,
        currency: "GBP",
      });
    }

    // ── DEBT LAYER (Wave P) ──
    // Pin all-in rate to live BoE base rate when we have one in MacroRate.
    let liveBoeBaseRate: number | null = null;
    try {
      const boe = await prisma.macroRate.findFirst({
        where: { series: "BOE_BASE" },
        orderBy: { date: "desc" },
        select: { value: true },
      });
      liveBoeBaseRate = boe?.value ?? null;
    } catch {
      liveBoeBaseRate = null;
    }
    const debtLayer = computeDebtLayer(effectivePrice || null, assumptions.noi || null, liveBoeBaseRate);

    // ── HOLD-SELL SCENARIOS ──
    let scenarios: any = null;
    if (effectivePrice > 0) {
      const mktCapRate = getMarketCapRate(normAsset, normRegion);
      const mktERV = assumptions.erv;

      try {
        // Wave T honest-mode: if passingRent is unknown, fall back to ERV
        // ONLY for this internal scenario runner (which needs a non-null
        // number). The dataSources persistence layer keeps it null.
        const rentForScenario = assumptions.passingRent ?? mktERV;
        const baseInputs = defaultHoldInputs(effectivePrice, rentForScenario, mktERV, normAsset, "uk");

        // Scenario 1: Base case
        const base = calculateHoldScenario(baseInputs);
        // Scenario 2: Value-add (10% rental uplift)
        const valueAdd = calculateHoldScenario({ ...baseInputs, marketERV: mktERV * 1.10 });
        // Scenario 3: Downside (5% lower exit yield)
        const downside = calculateHoldScenario({ ...baseInputs, exitYield: baseInputs.exitYield * 1.05 });

        scenarios = [
          { name: "Base case", irr: (base.irr * 100).toFixed(1), equityMultiple: base.equityMultiple.toFixed(2), cashYield: base.cashYield.toFixed(1), npv: Math.round(base.npv) },
          { name: "Value-add", irr: (valueAdd.irr * 100).toFixed(1), equityMultiple: valueAdd.equityMultiple.toFixed(2), cashYield: valueAdd.cashYield.toFixed(1), npv: Math.round(valueAdd.npv) },
          { name: "Downside", irr: (downside.irr * 100).toFixed(1), equityMultiple: downside.equityMultiple.toFixed(2), cashYield: downside.cashYield.toFixed(1), npv: Math.round(downside.npv) },
        ];
      } catch (e) {
        console.warn("[scope-enrich] Scenario calculation failed:", e);
      }
    }

    // ── MARKET BENCHMARKS ──
    const mktCapRate = getMarketCapRate(normAsset, normRegion);
    const mktERV = getMarketERV(normAsset, normRegion);
    const annualDebtService = effectivePrice > 0 ? calculateAnnualDebtService(effectivePrice) : null;
    const dscr = annualDebtService && assumptions.noi > 0 ? assumptions.noi / annualDebtService : null;

    const marketBenchmarks = {
      capRate: mktCapRate,
      ervPsf: mktERV,
      region: normRegion,
      assetType: normAsset,
      financing: SCOUT_FINANCING,
      annualDebtService: annualDebtService ? Math.round(annualDebtService) : null,
      dscr: dscr ? parseFloat(dscr.toFixed(2)) : null,
    };

    // ── RENT GAP ──
    let rentGap: any = null;
    if (assumptions.passingRent && assumptions.erv) {
      const gap = assumptions.erv - assumptions.passingRent;
      const gapPct = assumptions.passingRent > 0 ? (gap / assumptions.passingRent) * 100 : 0;
      rentGap = {
        passingRent: Math.round(assumptions.passingRent),
        passingRentSource: assumptions.passingRentSource,
        marketERV: Math.round(assumptions.erv),
        ervSource: assumptions.ervSource,
        gap: Math.round(gap),
        gapPct: parseFloat(gapPct.toFixed(1)),
        direction: gap > 0 ? "under-rented" : gap < 0 ? "over-rented" : "market-rate",
      };
    }

    // ── DEAL ANALYSIS (never returns blank — analyst verdict) ──
    let dealAnalysis: DealAnalysis | null = null;
    if (effectivePrice > 0) {
      dealAnalysis = analyseDeal({
        address: address!,
        assetType: normAsset,
        region: normRegion,
        askingPrice: effectivePrice,
        sqft: assumptions.sqft,
        sqftSource: assumptions.sqftSource,
        // Wave T honest-mode: unknown passing rent → 0 for the analyser
        // (which treats 0 as vacant). Real null is preserved in
        // dataSources below.
        passingRent: assumptions.passingRent ?? 0,
        passingRentSource: assumptions.passingRentSource,
        erv: assumptions.erv,
        ervSource: assumptions.ervSource,
        epcRating: assumptions.epcRating,
        yearBuilt: assumptions.yearBuilt,
        occupancyPct: assumptions.occupancyPct,
        occupancySource: assumptions.occupancySource,
        listingDescription: rawListingText,
        aiVacancy: aiData?.vacancy || null,
        compsCount: comparableSales.length,
        noi: assumptions.noi,
      });
    }

    // ── RICS-ALIGNED ANALYSIS (Level 2) ──
    let ricsAnalysis: RICSAnalysis | null = null;
    if (effectivePrice > 0) {
      const ricsComps: ComparableSale[] = comparableSales.map((c: any) => ({
        address: c.address || c.fullAddress || "Unknown",
        price: c.price || c.pricePaid || 0,
        sqft: c.floorArea || c.size_sqft || undefined,
        date: c.date || c.dateSold || new Date().toISOString().split("T")[0],
        distance: c.distance || undefined,
      }));

      const descText = rawListingText || "";
      const hasDevelopment = /development|conversion|planning|permitted development|change of use|flats?|units?/i.test(descText);
      const isSpecialist = /casino|hotel|leisure|cinema|theatre|bowling/i.test(normAsset) || /casino|hotel/i.test(descText);

      const ricsInput: AnalysisInput = {
        address: address!,
        assetType: normAsset,
        region: normRegion,
        askingPrice: effectivePrice,
        sqft: assumptions.sqft,
        sqftSource: assumptions.sqftSource,
        passingRent: assumptions.passingRent ?? 0,
        passingRentSource: assumptions.passingRentSource,
        erv: assumptions.erv,
        ervSource: assumptions.ervSource,
        epcRating: assumptions.epcRating,
        yearBuilt: assumptions.yearBuilt,
        occupancyPct: assumptions.occupancyPct,
        occupancySource: assumptions.occupancySource,
        listingDescription: rawListingText,
        aiVacancy: aiData?.vacancy || null,
        comps: ricsComps,
        noi: assumptions.noi,
        tenure: aiData?.tenure || listingData?.tenure || null,
        condition: aiData?.condition || null,
        numberOfUnits: aiData?.numberOfUnits || null,
        leaseExpiry: aiData?.leaseExpiry || null,
        breakDates: Array.isArray(aiData?.breakDates) ? aiData.breakDates.join(", ") : (aiData?.breakDates || null),
        rentReviewType: null,
        tenantNames: Array.isArray(aiData?.tenantNames) ? aiData.tenantNames.join(", ") : (aiData?.tenantNames || null),
        developmentPotential: hasDevelopment,
        isSpecialist,
      };

      try {
        ricsAnalysis = analyseProperty(ricsInput);
      } catch (e) {
        console.warn("[scope-enrich] RICS analysis error:", e);
      }
    }

    // ── ENRICH SCORING WITH DEAL ANALYSIS ──
    if (dealAnalysis) {
      const daSignals = dealAnalysisSignals(dealAnalysis);
      signals.push(...daSignals);
      propertyScore = scoreProperty(signals);
    }

    // ── BUILD IMAGES ──
    const allImages: string[] = [];
    if (listingData?.images?.length) allImages.push(...listingData.images.slice(0, 20));
    if (satelliteUrl && !allImages.includes(satelliteUrl)) allImages.push(satelliteUrl);
    if (streetViewUrl) allImages.push(streetViewUrl);

    // ── TENURE ──
    const tenure = aiData?.tenure || listingData?.tenure || undefined;

    // ── AUCTION DATE ──
    let auctionDate: Date | undefined;
    const adStr = aiData?.auctionDate || listingData?.auctionDate;
    if (adStr) {
      const d = new Date(adStr);
      if (!isNaN(d.getTime())) auctionDate = d;
    }

    // ── SAVE (update existing or create new) ──
    // Sanitize broker name — reject obvious garbage like "Use class" (UK planning)
    // or other non-name strings that shouldn't be displayed as a broker.
    const rawBroker = auctionHouse || aiData?.agentName || listingData?.agentContact?.name || undefined;
    const brokerName = (() => {
      if (!rawBroker || typeof rawBroker !== "string") return undefined;
      const trimmed = rawBroker.trim();
      if (trimmed.length < 2 || trimmed.length > 80) return undefined;
      // Reject planning use class, lot numbers, prices, common non-name patterns
      if (/^(use\s*class|lot\s*\d|guide\s*price|£|\$|http|www\.|tbc|tba|n\/a|none|null|unknown)/i.test(trimmed)) return undefined;
      // Must contain at least one letter
      if (!/[a-z]/i.test(trimmed)) return undefined;
      return trimmed;
    })();

    // Hoist real owner name from CCOD lookup (when populated) so OwnershipTab/TitleTab show it.
    const realOwnerName = (companyOwner && typeof companyOwner === "object")
      ? ((companyOwner as { companyName?: string }).companyName || undefined)
      : undefined;

    const dealData = {
        address: address!,
        assetType: normAsset,
        region: normRegion,
        sourceTag,
        sourceUrl: url || undefined,
        askingPrice: askingPrice || undefined,
        guidePrice: guidePrice || undefined,
        capRate: mktCapRate * 100,
        brokerName,
        ownerName: realOwnerName,
        satelliteImageUrl: satelliteUrl || undefined,
        // Top-level columns are facts only — estimated values live in
        // dataSources.assumptions and are surfaced with provenance in the UI.
        epcRating: realEpc ?? undefined,
        yearBuilt: realYearBuilt ?? undefined,
        // Write both `buildingSizeSqft` (canonical) and `sqft` (legacy alias) so
        // any frontend code reading either field gets the value. Use realSqft
        // when available, else the scraped value (which we treat as listing fact).
        buildingSizeSqft: realSqft ?? scrapedSqft ?? undefined,
        sqft: realSqft ?? scrapedSqft ?? undefined,
        tenure,
        currentRentPsf: realPassingRent && realSqft && realSqft > 0
          ? parseFloat((realPassingRent / realSqft).toFixed(2))
          : undefined,
        marketRentPsf: undefined, // benchmark only — read from assumptions
        occupancyPct: realOccupancyPct ?? undefined,
        leaseLengthYears: aiData?.leaseExpiry ? Math.max(0, (new Date(aiData.leaseExpiry).getFullYear() - new Date().getFullYear())) : undefined,
        // Wave H2: persist covenant grade so OwnershipTab + IC memo survive reloads
        tenantCovenantStrength: covenantResult?.grade && covenantResult.grade !== "unknown"
          ? covenantResult.grade
          : undefined,
        auctionDate,
        hasInsolvency: false,
        hasLisPendens: false,
        hasPlanningApplication: planningApps.length > 0,
        inFloodZone: floodData?.inFloodZone || false,
        signalCount: propertyScore.signalCount,
        enrichedAt: new Date(),
        brochureDocId: documentId || undefined,
        inputMethod: url ? "api" : documentId ? "upload" : "manual",
        dataSources: {
          epc: epcData || null,
          // Wave Q: stamp every comp with quality score + provenance before persisting
          comps: scoreAndStampComps(comparableSales.slice(0, 10) as any, assumptions.sqft),
          // Wave O: lettings evidence (only real Letting records — never fabricated)
          rentalComps: scoreAndStampComps(lettingsComps.slice(0, 20) as any, assumptions.sqft),
          // Wave O widening fallback metadata — UI surfaces note + matchStage
          rentalCompsMeta: {
            matchStage: lettingsResult.matchStage,
            searched: lettingsResult.searched,
            note: lettingsResult.note,
          },
          // Wave K: Companies House charges register for the registered owner
          charges: chargesRecord?.charges ?? [],
          chargesTotalCount: chargesRecord?.totalCount ?? 0,
          // Wave K: subject-address sales history (filter PPD comps to exact address match)
          salesHistory: comparableSales
            .filter((c) => address && c.address && c.address.toLowerCase().includes(address.toLowerCase().split(",")[0].trim()))
            .slice(0, 10),
          planning: planningApps.slice(0, 10),
          images: allImages,
          geocode: geo || null,
          flood: floodData,
          listing: listingData ? {
            images: listingData.images.slice(0, 20),
            floorplans: listingData.floorplans,
            features: listingData.features,
            description: listingData.description,
            tenure: listingData.tenure,
            accommodation: listingData.accommodation,
            lotNumber: listingData.lotNumber || aiData?.lotNumber,
            auctionDate: listingData.auctionDate || aiData?.auctionDate,
            agentContact: listingData.agentContact,
            legalPackUrl: listingData.legalPackUrl,
            streetView: streetViewUrl,
          } : null,
          ai: aiData ? {
            propertyType: aiData.propertyType,
            tenure: aiData.tenure,
            size_sqft: aiData.size_sqft,
            yearBuilt: aiData.yearBuilt,
            numberOfUnits: aiData.numberOfUnits,
            accommodation: aiData.accommodation,
            tenantNames: aiData.tenantNames,
            passingRent: aiData.passingRent,
            leaseExpiry: aiData.leaseExpiry,
            breakDates: aiData.breakDates,
            serviceCharge: aiData.serviceCharge,
            groundRent: aiData.groundRent,
            vacancy: aiData.vacancy,
            condition: aiData.condition,
            keyFeatures: aiData.keyFeatures,
            risks: aiData.risks,
            opportunities: aiData.opportunities,
            completionPeriod: aiData.completionPeriod,
            agentName: aiData.agentName,
            agentContact: aiData.agentContact,
          } : null,
          score: {
            total: propertyScore.totalScore,
            signalCount: propertyScore.signalCount,
            confidence: propertyScore.confidence,
            confidenceLevel: propertyScore.confidenceLevel,
            opportunity: propertyScore.opportunity,
            actionable: propertyScore.actionable,
            signals: propertyScore.signals.map((s) => ({ name: s.name, type: s.type, weight: s.weight, source: s.source })),
          },
          valuations,
          returns: returns ? {
            capRate: returns.capRate,
            noi: returns.noi ? Math.round(returns.noi) : null,
            irr5yr: returns.irr5yr,
            cashOnCash: returns.cashOnCash,
            equityMultiple: returns.equityMultiple,
            equityNeeded: returns.equityNeeded ? Math.round(returns.equityNeeded) : null,
            dscr: debtLayer?.dscr ?? null,
          } : null,
          // Wave P: senior debt structure
          debt: debtLayer,
          // Wave L: structured environmental snapshot (live + uncommissioned)
          environmental: buildEnvironmentalSnapshot(floodData as any, epcData as any),
          // Wave M: preserve user overrides across re-enrichment
          userOverrides: preservedUserOverrides,
          scenarios,
          rentGap,
          market: marketBenchmarks,
          assumptions: {
            sqft: { value: assumptions.sqft, source: assumptions.sqftSource },
            erv: { value: Math.round(assumptions.erv), source: assumptions.ervSource },
            yearBuilt: { value: assumptions.yearBuilt, source: assumptions.yearBuiltSource },
            capRate: { value: assumptions.capRate, source: assumptions.capRateSource },
            noi: { value: Math.round(assumptions.noi), source: assumptions.noiSource },
            passingRent: { value: assumptions.passingRent != null ? Math.round(assumptions.passingRent) : null, source: assumptions.passingRentSource },
            epcRating: { value: assumptions.epcRating, source: assumptions.epcRatingSource },
            occupancy: { value: assumptions.occupancyPct, source: assumptions.occupancySource },
            voidPeriod: { value: assumptions.voidMonths, source: assumptions.voidReasoning },
          },
          dealAnalysis: dealAnalysis || null,
          ricsAnalysis: ricsAnalysis || null,
          // Wave H1/H3: shape covenant payload to match what OwnershipTab + IC memo read
          covenant: covenantResult && covenantResult.grade !== "unknown"
            ? {
                tenantName: covenantResult.companyName ?? primaryTenant,
                strength: covenantResult.grade,
                creditScore: covenantResult.score,
                companyNo: covenantResult.companyNo,
                companyStatus: covenantResult.companyStatus,
                lastAccountsDate: covenantResult.lastAccountsDate,
                revenue: null,
                summary: `${covenantResult.companyName ?? primaryTenant} · ${covenantResult.grade} (CR ${covenantResult.score})${covenantResult.companyStatus ? ` · ${covenantResult.companyStatus}` : ""}`,
              }
            : null,
          companyOwner: companyOwner || null,
          ownerPortfolio: ownerPortfolio.length > 0 ? ownerPortfolio : null,
          devPotential: devPotential || null,
        } as any,
        currency: "GBP",
        status: "enriched",
    };

    // Wave G test hook — return assembled payload without touching the DB.
    if ((req as unknown as { __dryRun?: boolean }).__dryRun) {
      return NextResponse.json({
        dryRun: true,
        address,
        assetType: dealData.assetType,
        valuations,
        scenarios,
        condition: aiData?.condition ?? null,
      });
    }

    let deal;
    if (existingDealId) {
      deal = await prisma.scoutDeal.update({
        where: { id: existingDealId },
        data: dealData,
      });
    } else {
      deal = await prisma.scoutDeal.create({ data: dealData });
    }

    return NextResponse.json({
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      score: propertyScore.totalScore,
      enrichment: {
        epc: epcData,
        comps: comparableSales.length,
        planning: planningApps.length,
        ai: !!aiData,
        flood: !!floodData,
        valuations: !!valuations,
        returns: !!returns,
        scenarios: !!scenarios,
      },
    });
  } catch (error) {
    console.error("Enrich error:", error);
    return NextResponse.json({ error: "Failed to enrich property" }, { status: 500 });
  }
}
