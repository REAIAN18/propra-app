/**
 * src/lib/insurance-risk.ts
 * Insurance risk scorecard and premium reduction roadmap.
 *
 * Wave 2: rule-based scoring + benchmark estimates.
 * No CoverForce required — uses property data from UserAsset.
 *
 * Wave 3 upgrade: plug in CoverForce re-quote to get live carrier
 * pricing after each action, replacing benchmark estimates.
 */

import type { UserAsset } from "@/generated/prisma";
import type { InsuranceRiskFactor, InsuranceRoadmapAction } from "@/types/insurance";

type AssetForRisk = Pick<
  UserAsset,
  "epcRating" | "floodRisk" | "floodZone" | "assetType" | "country" |
  "insurancePremium" | "marketInsurance" | "sqft"
>;

// ── Risk Scoring — rule-based ─────────────────────────────────────────────

export function scoreInsuranceRisk(asset: AssetForRisk): InsuranceRiskFactor[] {
  const factors: InsuranceRiskFactor[] = [];
  const isUK = (asset.country ?? "UK").toUpperCase() !== "US";

  // ── EPC Rating ────────────────────────────────────────────────────────
  const epc = asset.epcRating?.toUpperCase();
  const epcScore = epc === "A" ? 10 : epc === "B" ? 9 : epc === "C" ? 7 :
                   epc === "D" ? 5 : epc === "E" ? 3 : epc === "F" ? 2 :
                   epc === "G" ? 1 : 5;
  factors.push({
    factor: "EPC Rating",
    score: epcScore,
    benchmark: 7,
    status: epcScore >= 7 ? "good" : epcScore >= 4 ? "amber" : "red",
    impact: epcScore >= 7
      ? "EPC C or above — no premium loading from energy risk"
      : epcScore >= 4
        ? "EPC D–E adds ~5–8% premium loading. Improvement to C could save 5–15%."
        : "EPC F–G attracts heavy loading. Some carriers refuse cover. Improvement is urgent.",
  });

  // ── Flood Risk ────────────────────────────────────────────────────────
  const flood = (asset.floodRisk ?? asset.floodZone ?? "").toLowerCase();
  const floodScore =
    /very high|zone 3b/.test(flood) ? 1 :
    /high|zone 3a/.test(flood) ? 3 :
    /medium|zone 2/.test(flood) ? 6 :
    /low|zone 1|minimal|x/.test(flood) ? 9 : 8;

  factors.push({
    factor: isUK ? "Flood Risk (EA)" : "Flood Zone (FEMA)",
    score: floodScore,
    benchmark: 8,
    status: floodScore >= 7 ? "good" : floodScore >= 4 ? "amber" : "red",
    impact: floodScore >= 7
      ? "Low flood risk — minimal flood peril loading"
      : floodScore >= 4
        ? `${isUK ? "Zone 2" : "Zone X-shaded"} — moderate flood loading. Resilience measures could reduce 10–20%.`
        : `${isUK ? "Zone 3" : "Zone AE/VE"} — significant flood loading. Defences + FEMA/EA grants could reduce 20–30%.`,
  });

  // ── Asset Construction Type (proxy via assetType) ─────────────────────
  const t = (asset.assetType ?? "").toLowerCase();
  const isModern = /logistics|industrial|warehouse/.test(t);
  const isOld = /victorian|heritage|listed/.test(t);
  const constructionScore = isOld ? 3 : isModern ? 8 : 6;
  factors.push({
    factor: "Construction Type",
    score: constructionScore,
    benchmark: 6,
    status: constructionScore >= 6 ? "good" : constructionScore >= 4 ? "amber" : "red",
    impact: isOld
      ? "Older or heritage construction attracts 10–20% loading. Surveys and works may reduce this."
      : isModern
        ? "Modern construction — neutral to positive underwriting position"
        : "Standard construction — benchmark loading applies",
  });

  // ── Security Specification ─────────────────────────────────────────────
  factors.push({
    factor: "Security Specification",
    score: 5,
    benchmark: 7,
    status: "amber",
    impact: "Security spec unknown — RealHQ cannot verify alarm grade or CCTV coverage. Carriers may apply 8–15% loading for unverified security. Upload security certificate or confirm via Work Order.",
  });

  // ── Portfolio Structure ────────────────────────────────────────────────
  factors.push({
    factor: "Portfolio Structure",
    score: 6,
    benchmark: 6,
    status: "amber",
    impact: "Single policy per property is the most common structure but not the cheapest. Portfolio consolidation onto one policy can achieve 15–25% volume discount.",
  });

  // ── Reinstatement Value Accuracy ──────────────────────────────────────
  factors.push({
    factor: "Reinstatement Value",
    score: 5,
    benchmark: 8,
    status: "amber",
    impact: "No RICS reinstatement survey on record. Over-insurance is common — up to 30% of rebuild cost inflated. A survey typically costs £500–£1,500 and often reduces the insured sum materially.",
  });

  return factors;
}

// ── Composite score ────────────────────────────────────────────────────────

export function computeCompositeRiskScore(factors: InsuranceRiskFactor[]): number {
  if (factors.length === 0) return 50;
  const avg = factors.reduce((s, f) => s + f.score, 0) / factors.length;
  return Math.round(avg * 10);
}

// ── Premium Reduction Roadmap ──────────────────────────────────────────────

/**
 * Generates a prioritised list of premium reduction actions.
 * Ordered by (annualSaving / costLow) — highest ROI first.
 * Wave 3: replace with CoverForce live re-quote after each action.
 */
export function buildPremiumReductionRoadmap(
  asset: AssetForRisk,
  riskFactors: InsuranceRiskFactor[]
): InsuranceRoadmapAction[] {
  const premium = asset.insurancePremium ?? 10000;
  const isUK = (asset.country ?? "UK").toUpperCase() !== "US";
  const actions: InsuranceRoadmapAction[] = [];

  // 1. Portfolio consolidation
  actions.push({
    id: "portfolio-consolidation",
    action: "Consolidate all properties onto a single portfolio policy",
    why: "Multi-property volume discount from carriers reduces total premium by 15–25%. No physical work needed — restructuring only.",
    costLow: 0,
    costHigh: 0,
    savingPct: 20,
    annualSaving: Math.round(premium * 0.20),
    paybackYears: 0,
    status: "recommended",
    ctaType: "decision_only",
    ctaLabel: "Review consolidation options",
  });

  // 2. Security upgrade
  const secFactor = riskFactors.find(f => f.factor === "Security Specification");
  if (!secFactor || secFactor.status !== "good") {
    const alarmCostMid = 1800;
    const alarmSaving = Math.round(premium * 0.12);
    actions.push({
      id: "security-alarm",
      action: isUK
        ? "Install NSI/NACOSS Grade 2 monitored intruder alarm"
        : "Install UL-listed monitored security system",
      why: "Verified monitored alarms directly reduce carrier risk assessment. Most commercial carriers reduce premium 8–20% on confirmation of NSI Grade 2+.",
      costLow: 800,
      costHigh: 3000,
      savingPct: 12,
      annualSaving: alarmSaving,
      paybackYears: Math.round((alarmCostMid / alarmSaving) * 10) / 10,
      status: "recommended",
      ctaType: "work_order",
      ctaLabel: "Get installer quotes",
      workOrderCategory: "security",
    });

    actions.push({
      id: "cctv",
      action: isUK
        ? "Install CCTV to BS EN 50132 — internal and external entry points"
        : "Install commercial CCTV covering all entry points",
      why: "CCTV covering all access points reduces theft and vandalism claim probability. Saves 5–12% on premium with most carriers.",
      costLow: 1200,
      costHigh: 5000,
      savingPct: 8,
      annualSaving: Math.round(premium * 0.08),
      paybackYears: Math.round((3100 / Math.round(premium * 0.08)) * 10) / 10,
      status: "recommended",
      ctaType: "work_order",
      ctaLabel: "Get CCTV quotes",
      workOrderCategory: "security",
    });
  }

  // 3. EPC improvement
  const epc = asset.epcRating?.toUpperCase();
  const epcFactor = riskFactors.find(f => f.factor === "EPC Rating");
  if (epcFactor && epcFactor.status !== "good") {
    actions.push({
      id: "epc-improvement",
      action: `Improve EPC to C or above (currently ${epc ?? "unknown"})`,
      why: "EPC C+ reduces environmental risk loading. MEES compliance by 2030 also reduces future void risk — some carriers now price this explicitly.",
      costLow: 5000,
      costHigh: 50000,
      savingPct: 10,
      annualSaving: Math.round(premium * 0.10),
      paybackYears: Math.round((15000 / Math.round(premium * 0.10)) * 10) / 10,
      status: "recommended",
      ctaType: "work_order",
      ctaLabel: "Get EPC improvement quotes",
      workOrderCategory: "energy",
    });
  }

  // 4. Increase excess
  actions.push({
    id: "increase-excess",
    action: "Review and increase building excess (deductible)",
    why: "Doubling the excess typically saves 10–30% on premium. Only beneficial if claims history is clean. RealHQ models the break-even point.",
    costLow: 0,
    costHigh: 0,
    savingPct: 15,
    annualSaving: Math.round(premium * 0.15),
    paybackYears: 0,
    status: "recommended",
    ctaType: "decision_only",
    ctaLabel: "Model excess vs saving",
  });

  // 5. Reinstatement survey
  actions.push({
    id: "reinstatement-survey",
    action: "Commission RICS reinstatement value survey",
    why: "Over-insured properties (very common — 30–40% according to RICS) pay unnecessary premium. An accurate rebuild figure typically reduces insured sum and premium materially.",
    costLow: 500,
    costHigh: 1500,
    savingPct: 15,
    annualSaving: Math.round(premium * 0.15),
    paybackYears: Math.round((1000 / Math.round(premium * 0.15)) * 10) / 10,
    status: "recommended",
    ctaType: "third_party",
    ctaLabel: "Order RICS survey",
  });

  // 6. Flood defences
  const floodFactor = riskFactors.find(f => f.factor.includes("Flood"));
  if (floodFactor && floodFactor.status !== "good") {
    actions.push({
      id: "flood-defences",
      action: isUK
        ? "Install flood resilience measures (flood door, airbrick covers, sump pump)"
        : "Install FEMA-approved flood mitigation measures",
      why: "Physical flood resilience directly reduces the flood peril element of premium. Government grants may cover part or all of the cost.",
      costLow: 2000,
      costHigh: 25000,
      savingPct: 15,
      annualSaving: Math.round(premium * 0.10),
      paybackYears: Math.round((8000 / Math.round(premium * 0.10)) * 10) / 10,
      status: "recommended",
      ctaType: "work_order",
      ctaLabel: "Get resilience quotes + check grants",
      workOrderCategory: "structural",
    });
  }

  // 7. No-claims milestone
  actions.push({
    id: "no-claims-3yr",
    action: "Achieve 3-year no-claims record — renegotiate at renewal",
    why: "After 3 clean years most carriers reduce premium 10–25% at renewal. RealHQ will alert you at your 3-year anniversary.",
    costLow: 0,
    costHigh: 0,
    savingPct: 18,
    annualSaving: Math.round(premium * 0.18),
    paybackYears: 3,
    status: "recommended",
    ctaType: "time_based",
    ctaLabel: "RealHQ will alert at 3yr mark",
  });

  // Sort by ROI: highest annualSaving / max(costLow, 1) first
  return actions.sort((a, b) => {
    const roiA = a.annualSaving / Math.max(a.costLow, 1);
    const roiB = b.annualSaving / Math.max(b.costLow, 1);
    return roiB - roiA;
  });
}
