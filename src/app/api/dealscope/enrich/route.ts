import { NextRequest, NextResponse } from "next/server";
import { findComps, scoreCompsConfidence } from "@/lib/dealscope-comps";
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
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
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
      return { lat: result.geometry.location.lat, lng: result.geometry.location.lng };
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
async function fetchFloodRisk(lat: number, lng: number): Promise<any> {
  try {
    const res = await fetch(
      `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const items = data?.items || [];
    if (items.length === 0) return { inFloodZone: false, zones: [], riskLevel: "Low" };
    return {
      inFloodZone: true,
      zones: items.slice(0, 5).map((item: any) => ({
        label: item.label || item.notation || "Flood area",
        riskLevel: item.currentWarning?.severityLevel || "Unknown",
        description: item.description || null,
      })),
      riskLevel: items.some((i: any) => i.currentWarning) ? "High" : "Medium",
    };
  } catch (e) {
    console.warn("[scope-enrich] Flood API failed:", e);
    return null;
  }
}

// ── Build assumptions when data is missing — NEVER returns null/blank ──
async function buildAssumptions(
  aiData: AIExtractedData | null,
  epcData: any,
  askingPrice: number | undefined,
  assetType: string,
  region: string,
  listingDescription: string | null,
  scrapedSqft?: number,
  address?: string | null,
): Promise<{
  sqft: number; sqftSource: string;
  erv: number; ervSource: string;
  yearBuilt: number; yearBuiltSource: string;
  capRate: number; capRateSource: string;
  noi: number; noiSource: string;
  passingRent: number; passingRentSource: string;
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

  // ── ERV — prefer listing passing rent, then AI market analysis, then static benchmark ──
  let erv = 0;
  let ervSource = "data";
  if (aiData?.passingRent) {
    erv = aiData.passingRent;
    ervSource = "listing passing rent";
  } else if (address && sqft > 0) {
    // Use AI-based market ERV estimation for location-aware accuracy.
    // This avoids static benchmark tables that are wrong for secondary/regional markets.
    try {
      const aiERV = await estimateMarketERV(address, assetType, sqft, {
        yearBuilt: aiData?.yearBuilt,
        epcRating: aiData?.epcRating || epcData?.epcRating,
        condition: aiData?.condition,
        occupancy: aiData?.vacancy,
      });
      if (aiERV && aiERV.ervPsf > 0) {
        erv = aiERV.ervAnnual;
        ervSource = `AI market analysis — £${aiERV.ervPsf.toFixed(2)}/sqft (${aiERV.confidence} confidence): ${aiERV.reasoning}`;
      }
    } catch (e) {
      console.warn("[enrich] AI ERV estimation failed, falling back to benchmark:", e);
    }
    // Fallback to static benchmark if AI call failed
    if (!erv) {
      const est = estimateRent(sqft, assetType, region);
      erv = est.value;
      ervSource = `benchmark estimate (${est.method})`;
    }
  } else {
    const est = estimateRent(sqft, assetType, region);
    erv = est.value;
    ervSource = `benchmark estimate (${est.method})`;
  }

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
  const capRate = mktCapRate;
  const capRateSource = `market benchmark for ${region} ${assetType} (${(mktCapRate * 100).toFixed(1)}%)`;

  // ── NOI — never blank ──
  const noi = erv * 0.85;
  const noiSource = "estimated (ERV × 85% after opex)";

  // ── Passing rent — never blank ──
  const passingRent = occupancyPct === 0 ? 0 : (aiData?.passingRent || erv);
  const passingRentSource = occupancyPct === 0 ? "vacant (£0 current income)" : (aiData?.passingRent ? "listing" : "estimated (= ERV)");

  return {
    sqft, sqftSource, erv, ervSource, yearBuilt: yearBuilt!, yearBuiltSource,
    capRate, capRateSource, noi, noiSource, passingRent, passingRentSource,
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
      existingDealId = body.dealId as string | undefined;
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
    if (url) {
      try {
        const parsed = await parsePropertyUrl(url);
        listingData = parsed.listing;
        rawListingText = parsed.description || listingData?.description || null;

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

      const domain = new URL(url).hostname;
      if (domain.includes("savills")) { sourceTag = "Auction"; auctionHouse = "Savills"; }
      else if (domain.includes("eigproperty") || domain.includes("allsop") || domain.includes("acuitus")) { sourceTag = "Auction"; auctionHouse = domain.split(".")[0]; }
      else if (domain.includes("strettons")) { sourceTag = "Auction"; auctionHouse = "Strettons"; }
      else if (domain.includes("rib.co.uk")) { sourceTag = "Agent"; auctionHouse = "RIB"; }
      else if (domain.includes("rightmove") || domain.includes("zoopla") || domain.includes("onthemarket")) { sourceTag = "Listed"; }
      else if (domain.includes("loopnet")) { sourceTag = "Listed"; }
      else { sourceTag = "URL import"; }
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
    ]);

    const epcData = results[0].status === "fulfilled" ? results[0].value : null;
    const comparableSales = results[1].status === "fulfilled" ? results[1].value : [];
    const planningApps = results[2].status === "fulfilled" ? results[2].value : [];
    const floodData = results[3].status === "fulfilled" ? results[3].value : null;
    const companyOwner = results[4].status === "fulfilled" ? results[4].value : null;
    const covenantResult = results[5].status === "fulfilled" ? results[5].value : null;

    // ── SECONDARY: Owner portfolio + Dev potential (need primary results) ──
    let ownerPortfolio: any[] = [];
    if (companyOwner?.companyNumber) {
      try { ownerPortfolio = await findPropertiesByCompany(companyOwner.companyNumber, postcode?.slice(0, 4)); }
      catch (e) { console.warn("[enrich] Portfolio lookup failed:", e); }
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
    const assetType = aiData?.propertyType || "Mixed";
    const region = detectRegionFromAddress(address!); // Detect from address/postcode
    const normAsset = normaliseAssetType(assetType);
    const normRegion = normaliseRegion(region);

    // ── BUILD ASSUMPTIONS (never returns blank fields) ──
    const askingPrice = guidePrice || price;
    const assumptions = await buildAssumptions(aiData, epcData, askingPrice, normAsset, normRegion, rawListingText, scrapedSqft, address);

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
      valuations = {
        incomeCap: { value: Math.round(incomeCapValue), method: "Income capitalisation", capRate: marketCapRate, noi: Math.round(assumptions.noi) },
        psf: psfValue ? { value: Math.round(psfValue.mid * assumptions.sqft), method: "Price per sqft", low: psfValue.low ? Math.round(psfValue.low * assumptions.sqft) : null, high: psfValue.high ? Math.round(psfValue.high * assumptions.sqft) : null } : null,
        blended: b.avmValue !== undefined
          ? { value: b.avmValue ? Math.round(b.avmValue) : null, confidence: b.confidenceScore, method: b.method }
          : { value: b.value ? Math.round(b.value) : null, method: b.method || "blended" },
        askingPrice: effectivePrice,
        discount: incomeCapValue > effectivePrice ? Math.round(((incomeCapValue - effectivePrice) / incomeCapValue) * 100) : null,
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

    // ── HOLD-SELL SCENARIOS ──
    let scenarios: any = null;
    if (effectivePrice > 0) {
      const mktCapRate = getMarketCapRate(normAsset, normRegion);
      const mktERV = assumptions.erv;

      try {
        const baseInputs = defaultHoldInputs(effectivePrice, assumptions.passingRent, mktERV, normAsset, "uk");

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
        passingRent: assumptions.passingRent,
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
        passingRent: assumptions.passingRent,
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
    const dealData = {
        address: address!,
        assetType: normAsset,
        region: normRegion,
        sourceTag,
        sourceUrl: url || undefined,
        askingPrice: askingPrice || undefined,
        guidePrice: guidePrice || undefined,
        capRate: mktCapRate * 100,
        brokerName: auctionHouse || aiData?.agentName || listingData?.agentContact?.name || undefined,
        satelliteImageUrl: satelliteUrl || undefined,
        epcRating: assumptions.epcRating,
        yearBuilt: assumptions.yearBuilt,
        buildingSizeSqft: assumptions.sqft,
        tenure,
        currentRentPsf: assumptions.sqft > 0 ? parseFloat((assumptions.passingRent / assumptions.sqft).toFixed(2)) : undefined,
        marketRentPsf: mktERV,
        occupancyPct: assumptions.occupancyPct,
        leaseLengthYears: aiData?.leaseExpiry ? Math.max(0, (new Date(aiData.leaseExpiry).getFullYear() - new Date().getFullYear())) : undefined,
        tenantCovenantStrength: undefined,
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
          comps: comparableSales.slice(0, 10),
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
          } : null,
          scenarios,
          rentGap,
          market: marketBenchmarks,
          assumptions: {
            sqft: { value: assumptions.sqft, source: assumptions.sqftSource },
            erv: { value: Math.round(assumptions.erv), source: assumptions.ervSource },
            yearBuilt: { value: assumptions.yearBuilt, source: assumptions.yearBuiltSource },
            capRate: { value: assumptions.capRate, source: assumptions.capRateSource },
            noi: { value: Math.round(assumptions.noi), source: assumptions.noiSource },
            passingRent: { value: Math.round(assumptions.passingRent), source: assumptions.passingRentSource },
            epcRating: { value: assumptions.epcRating, source: assumptions.epcRatingSource },
            occupancy: { value: assumptions.occupancyPct, source: assumptions.occupancySource },
            voidPeriod: { value: assumptions.voidMonths, source: assumptions.voidReasoning },
          },
          dealAnalysis: dealAnalysis || null,
          ricsAnalysis: ricsAnalysis || null,
          covenant: covenantResult || null,
          companyOwner: companyOwner || null,
          ownerPortfolio: ownerPortfolio.length > 0 ? ownerPortfolio : null,
          devPotential: devPotential || null,
        } as any,
        currency: "GBP",
        status: "enriched",
    };

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
