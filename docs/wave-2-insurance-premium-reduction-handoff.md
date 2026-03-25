# Wave 2 — Insurance Premium Reduction: Risk Scorecard + Roadmap Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-23
**Status:** Ready to build
**Source:** RealHQ-Spec-v3.2 Section 4
**Revenue path:** Contractor panel commissions (3%) when remediation work is tendered via RealHQ. Insurance placement commission (15% of saving) when CoverForce is live (Wave 3 live re-quote).
**Prerequisite:** No new dependencies. Uses existing data on `UserAsset` + Claude API.

---

## What this adds

The current insurance page has:
- Section 2: Coverage Gap Audit ✅
- Section 3: Premium Inflation Checklist ✅

Missing (this spec):
- **Insurance Risk Scorecard** — per-factor breakdown of what is driving the premium
- **Premium Reduction Roadmap** — ordered, actionable steps with cost/saving/payback/CTA
- **Placed Policies tracker** — active policies placed via RealHQ with renewal date

PRO-496 was a previous attempt at this spec; it was cancelled. This handoff replaces it with a scoped Wave 2 approach that does not require CoverForce.

> **FL/US assets:** The risk factor model and 10-step reduction roadmap differ significantly for Florida (wind zone, wind mitigation certificates, FEMA LOMA, PACE financing). See `docs/wave-2-insurance-fl-risk-scorecard.md` for the FL-specific factor model, county wind zone table, OIR-B1-1802 wind mitigation details, and FL roadmap steps. The product must branch on `asset.country === "US"` to render the FL roadmap instead of the UK one.

---

## Wave 2 vs Wave 3 split

| Component | Wave 2 | Wave 3 (CoverForce required) |
|-----------|--------|------------------------------|
| Risk Scorecard | ✅ Build — uses existing property data + Claude | — |
| Premium Reduction Roadmap | ✅ Build — shows cost/saving estimates from benchmarks | — |
| Roadmap CTAs to contractor panel | ✅ Build — alarm, CCTV, EPC, flood defence route to Work Orders | — |
| Placed Policies tracker | ✅ Build — from uploaded insurance schedule data | — |
| Live carrier re-quote after each action | ❌ Wave 3 — needs CoverForce API | ✅ Wave 3 |
| RICS reinstatement survey ordering | ❌ Wave 3 — needs RICS panel API integration | ✅ Wave 3 |

---

## 1. Data model additions

Add to `model UserAsset` in `prisma/schema.prisma`:

```prisma
  // Insurance risk scorecard (Wave 2)
  insuranceRiskScore      Float?    // 0–100 composite score (higher = better risk profile)
  insuranceRiskFactors    Json?     // array of InsuranceRiskFactor
  insuranceRoadmap        Json?     // array of InsuranceRoadmapAction
  insuranceRiskAssessedAt DateTime?
```

Types (in `src/types/insurance.ts` or inline):

```ts
export interface InsuranceRiskFactor {
  factor: string;          // "EPC Rating" | "Flood Zone" | "Security" | "Construction" | "Claims" | ...
  score: number;           // 0–10 (10 = best/lowest risk)
  benchmark: number;       // 0–10 (market average for this asset type)
  status: "good" | "amber" | "red";
  impact: string;          // "Reducing premium by ~X%" | "Adding ~X% premium loading"
}

export interface InsuranceRoadmapAction {
  id: string;
  action: string;          // "Install NSI Grade 2 intruder alarm"
  why: string;             // one sentence on why this reduces premium
  costLow: number;         // estimate in portfolio currency
  costHigh: number;
  savingPct: number;       // % premium reduction estimate
  annualSaving: number;    // in £/$ based on current premium
  paybackYears: number;    // costAvg / annualSaving
  status: "recommended" | "in_progress" | "done" | "skipped";
  ctaType: "work_order" | "decision_only" | "third_party" | "time_based";
  ctaLabel: string;        // "Get quotes via RealHQ" | "Adjust policy" | "Review excess level"
  workOrderCategory?: string; // e.g. "security" | "electrical" | "structural"
}
```

---

## 2. Classification utility — `src/lib/insurance-risk.ts`

```ts
/**
 * src/lib/insurance-risk.ts
 * Insurance risk scorecard and premium reduction roadmap.
 *
 * Wave 2: rule-based scoring + Claude narrative.
 * No CoverForce required — uses property data from UserAsset.
 *
 * Wave 3 upgrade: plug in CoverForce re-quote to get live carrier
 * pricing after each action, replacing benchmark estimates.
 */

import type { UserAsset } from "@prisma/client";
import type { InsuranceRiskFactor, InsuranceRoadmapAction } from "@/types/insurance";

// ── Risk Scoring — rule-based ─────────────────────────────────────────────

export function scoreInsuranceRisk(asset: Pick<
  UserAsset,
  "epcRating" | "floodRisk" | "floodZone" | "assetType" | "country" |
  "insurancePremium" | "marketInsurance" | "sqft"
>): InsuranceRiskFactor[] {
  const factors: InsuranceRiskFactor[] = [];
  const isUK = (asset.country ?? "UK").toUpperCase() !== "US";

  // ── EPC Rating ────────────────────────────────────────────────────────
  const epc = asset.epcRating?.toUpperCase();
  const epcScore = epc === "A" ? 10 : epc === "B" ? 9 : epc === "C" ? 7 :
                   epc === "D" ? 5 : epc === "E" ? 3 : epc === "F" ? 2 :
                   epc === "G" ? 1 : 5;  // unknown = neutral
  factors.push({
    factor: "EPC Rating",
    score: epcScore,
    benchmark: 7,  // C or above is market standard
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
    /low|zone 1|minimal|x/.test(flood) ? 9 : 8;  // unknown = slight caution

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

  // ── Security (default to 'unknown' — user can update) ─────────────────
  // In Wave 2 we don't have security spec data — score as 5 (neutral)
  // This is surfaced as "action required" on the roadmap
  factors.push({
    factor: "Security Specification",
    score: 5,
    benchmark: 7,
    status: "amber",
    impact: "Security spec unknown — RealHQ cannot verify alarm grade or CCTV coverage. Carriers may apply 8–15% loading for unverified security. Upload security certificate or confirm via Work Order.",
  });

  // ── Portfolio Consolidation ────────────────────────────────────────────
  // Only meaningful with multi-asset — single asset gets neutral
  factors.push({
    factor: "Portfolio Structure",
    score: 6,
    benchmark: 6,
    status: "amber",
    impact: "Single policy per property is the most common structure but not the cheapest. Portfolio consolidation onto one policy can achieve 15–25% volume discount.",
  });

  // ── Reinstatement Value Accuracy ──────────────────────────────────────
  // Without a RICS survey we mark as unknown
  factors.push({
    factor: "Reinstatement Value",
    score: 5,
    benchmark: 8,
    status: "amber",
    impact: "No RICS reinstatement survey on record. Over-insurance is common — up to 30% of rebuild cost inflated. A survey typically costs £500–£1,500 and often reduces the insured sum materially.",
  });

  return factors;
}

// ── Premium Reduction Roadmap — rule-based ────────────────────────────────

/**
 * Generates a prioritised list of premium reduction actions.
 * Ordered by (annualSaving / costLow) — highest ROI first.
 *
 * All cost/saving figures are estimates from industry benchmarks.
 * Wave 3: replace with CoverForce live re-quote after each action.
 */
export function buildPremiumReductionRoadmap(
  asset: Pick<UserAsset, "insurancePremium" | "epcRating" | "floodRisk" | "floodZone" | "assetType" | "country" | "sqft">,
  riskFactors: InsuranceRiskFactor[]
): InsuranceRoadmapAction[] {
  const premium = asset.insurancePremium ?? 10000;  // fallback for calculation
  const isUK = (asset.country ?? "UK").toUpperCase() !== "US";
  const actions: InsuranceRoadmapAction[] = [];

  // 1. Portfolio consolidation — zero cost, high saving
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

  // 2. Security upgrade — if score is amber/red
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

  // 3. EPC improvement — if EPC is D or below
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

  // 4. Increase excess — zero cost, significant saving
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

  // 5. Reinstatement value survey
  actions.push({
    id: "reinstatement-survey",
    action: "Commission RICS reinstatement value survey",
    why: "Over-insured properties (very common — 30–40% according to RICS) pay unnecessary premium. An accurate rebuild figure typically reduces insured sum and premium materially.",
    costLow: 500,
    costHigh: 1500,
    savingPct: 15,  // estimate — actual saving varies widely
    annualSaving: Math.round(premium * 0.15),
    paybackYears: Math.round((1000 / Math.round(premium * 0.15)) * 10) / 10,
    status: "recommended",
    ctaType: "third_party",
    ctaLabel: "Order RICS survey",
  });

  // 6. Flood defences — if in flood zone
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
      savingPct: 15,  // on flood element, not full premium
      annualSaving: Math.round(premium * 0.10),
      paybackYears: Math.round((8000 / Math.round(premium * 0.10)) * 10) / 10,
      status: "recommended",
      ctaType: "work_order",
      ctaLabel: "Get resilience quotes + check grants",
      workOrderCategory: "structural",
    });
  }

  // 7. No-claims milestone — time-based
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

  // Sort by ROI: (annualSaving / max(costLow, 1)) — highest first
  return actions.sort((a, b) => {
    const roiA = a.annualSaving / Math.max(a.costLow, 1);
    const roiB = b.annualSaving / Math.max(b.costLow, 1);
    return roiB - roiA;
  });
}

// ── Composite risk score ───────────────────────────────────────────────────

export function computeCompositeRiskScore(factors: InsuranceRiskFactor[]): number {
  if (factors.length === 0) return 50;
  const avg = factors.reduce((s, f) => s + f.score, 0) / factors.length;
  return Math.round(avg * 10);  // 0–100
}

// ── Claude narrative for each risk factor ─────────────────────────────────

export async function enrichRiskFactorNarratives(
  factors: InsuranceRiskFactor[],
  assetName: string,
  assetType: string | null
): Promise<InsuranceRiskFactor[]> {
  // In Wave 2 the rule-based impact strings are sufficient.
  // Wave 3 upgrade: call Claude Haiku to produce asset-specific narratives.
  return factors;
}
```

---

## 3. API routes

### `GET /api/user/insurance-risk/:assetId`

Returns the risk scorecard and roadmap for a specific asset.

```ts
// src/app/api/user/insurance-risk/[assetId]/route.ts

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assetId } = await params;

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    select: {
      id: true, name: true, assetType: true, country: true,
      epcRating: true, floodRisk: true, floodZone: true,
      insurancePremium: true, marketInsurance: true, sqft: true,
      insuranceRiskScore: true, insuranceRiskFactors: true,
      insuranceRoadmap: true, insuranceRiskAssessedAt: true,
    },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Return cached if assessed within 30 days
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  if (
    asset.insuranceRiskAssessedAt &&
    Date.now() - new Date(asset.insuranceRiskAssessedAt).getTime() < CACHE_TTL_MS &&
    asset.insuranceRiskFactors
  ) {
    return NextResponse.json({ asset, cached: true });
  }

  // Compute and persist
  const factors = scoreInsuranceRisk(asset);
  const roadmap = buildPremiumReductionRoadmap(asset, factors);
  const compositeScore = computeCompositeRiskScore(factors);

  const updated = await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      insuranceRiskScore: compositeScore,
      insuranceRiskFactors: factors as object[],
      insuranceRoadmap: roadmap as object[],
      insuranceRiskAssessedAt: new Date(),
    },
    select: {
      id: true, name: true, insuranceRiskScore: true,
      insuranceRiskFactors: true, insuranceRoadmap: true,
      insuranceRiskAssessedAt: true,
    },
  });

  return NextResponse.json({ asset: updated, cached: false });
}
```

### `PATCH /api/user/insurance-risk/:assetId/action/:actionId`

Updates the status of a roadmap action (e.g. when a Work Order is raised for it).

```ts
// body: { status: "in_progress" | "done" | "skipped" }
// Updates the matching action.id in insuranceRoadmap JSON
```

---

## 4. UI additions to `/insurance` page

### Section 4: Insurance Risk Scorecard

Add after Section 3 (Premium Inflation Checklist):

```tsx
{/* ── Section 4: Insurance Risk Scorecard ── */}
<SectionHeader
  title="Insurance Risk Scorecard"
  subtitle="What is driving your premium — scored against market benchmarks"
/>

{/* Composite score + factor bars */}
<div className="rounded-xl border border-gray-100 overflow-hidden">
  {/* Header — composite score */}
  <div className="px-5 py-4 bg-gray-50 flex items-center justify-between">
    <div>
      <div className="text-sm font-semibold text-gray-900">Risk Score</div>
      <div className="text-xs text-gray-500">Higher = better risk profile, lower premium</div>
    </div>
    <RiskScoreGauge score={riskScore} />  {/* 0–100 circle gauge */}
  </div>

  {/* Factor rows */}
  {riskFactors.map(factor => (
    <RiskFactorRow key={factor.factor} factor={factor} />
  ))}
</div>
```

**`RiskFactorRow` component:**
- Factor name + status pill (GOOD / REVIEW / ACT NOW) in green/amber/red
- Horizontal bar: asset score vs benchmark
- Impact line in gray text
- If status is amber or red: "See roadmap action →" link

### Section 5: Premium Reduction Roadmap

```tsx
{/* ── Section 5: Premium Reduction Roadmap ── */}
<SectionHeader
  title="Premium Reduction Roadmap"
  subtitle={`${totalAnnualSaving > 0 ? `${sym}${Math.round(totalAnnualSaving / 1000)}k/yr identified in achievable savings` : "Actions to reduce your premium"}`}
/>

{/* Roadmap ordered list */}
{roadmapActions.map((action, i) => (
  <RoadmapActionCard key={action.id} action={action} rank={i + 1} />
))}
```

**`RoadmapActionCard` component:**
- Rank number + status indicator (dot — green = done, amber = recommended, gray = skipped)
- Action title + one-line "Why" text
- Cost range + saving % + payback years
- Annual saving in green (`£X,XXX/yr`)
- CTA button:
  - `ctaType: "work_order"` → `"Get quotes via RealHQ"` — opens Work Orders new order flow with pre-filled category
  - `ctaType: "decision_only"` → `"Review"` — links to relevant page
  - `ctaType: "third_party"` → `"Order survey"` — Wave 3 stub (CTA only, shows "Coming soon" until RICS API live)
  - `ctaType: "time_based"` → shows countdown to 3-year mark or "RealHQ monitoring"

**Wave 3 upgrade note** (shown at bottom of roadmap):
```tsx
<div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
  <strong>Coming in Wave 3:</strong> After each action, RealHQ will automatically re-quote your premium via carrier APIs to show you the exact saving — not an estimate.
</div>
```

---

## 5. Prisma schema additions (include in Wave 2 migration)

Add to `model UserAsset` in same migration as `PlanningApplication`:

```prisma
  // Insurance risk scorecard (Wave 2)
  insuranceRiskScore      Float?
  insuranceRiskFactors    Json?
  insuranceRoadmap        Json?
  insuranceRiskAssessedAt DateTime?
```

---

## 6. Build order

1. Add schema fields to `UserAsset` (include in PRO-563 migration or separate migration)
2. `src/lib/insurance-risk.ts` — `scoreInsuranceRisk()`, `buildPremiumReductionRoadmap()`, `computeCompositeRiskScore()`
3. `GET /api/user/insurance-risk/:assetId` — compute + cache on request
4. `PATCH /api/user/insurance-risk/:assetId/action/:actionId` — status update
5. UI: Risk Scorecard section (Section 4 on insurance page)
6. UI: Premium Reduction Roadmap section (Section 5 on insurance page)
7. Wire `ctaType: "work_order"` actions to Work Orders new order flow

---

## 7. Acceptance criteria

- [ ] `GET /api/user/insurance-risk/:assetId` returns `insuranceRiskFactors` array for any real asset
- [ ] EPC D asset → `epcRating` factor shows `status: "amber"` with correct saving % estimate
- [ ] Flood Zone 2 (UK) asset → flood factor shows `status: "amber"` with resilience CTA
- [ ] Risk scorecard renders on `/insurance` page for real user with one asset minimum
- [ ] Premium Reduction Roadmap shows 5+ actions sorted by ROI
- [ ] "Get quotes via RealHQ" CTA on alarm/CCTV/EPC actions pre-fills a Work Order draft
- [ ] Total annual saving shown in section header is sum of all roadmap actions' `annualSaving`
- [ ] Roadmap status updates when a Work Order for that action is raised (`status: "in_progress"`)
- [ ] Response is cached for 30 days — second load returns `cached: true`, no re-computation
- [ ] Page renders correctly when no risk assessment yet (loading skeleton → triggered on mount)

---

## 8. What this is NOT (Wave 3)

- Live carrier re-quote after each action (needs CoverForce)
- RICS reinstatement survey ordering via API (needs RICS panel integration)
- Fire suppression procurement from BCIS (needs BCIS subscription)
- Placed policies tracker with renewal tracking (needs CoverForce placement API)

These are Wave 3. The roadmap CTA for "Order survey" shows a "Coming soon" stub in Wave 2.
