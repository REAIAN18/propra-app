# FL Insurance Risk Scorecard & Premium Reduction Roadmap
**Wave 2 — RE Commercial Supplement to PRO-610**
**Author:** Head of Real Estate & Commercial
**Date:** 2026-03-24
**Feeds into:** `docs/wave-2-insurance-premium-reduction-handoff.md` (CTO), PRO-610

---

## Why this matters on FL demo calls

FL insurance is the single highest-impact savings lever for the demo portfolio — and the one a sophisticated FL investor will test hardest. The core insurance story ($93.5k/yr portfolio overpay across 5 FL assets) lands only if Ian can explain **why** the overpay exists and what specifically reduces it. Generic "switch broker" answers won't hold up against owners who have already talked to Marsh or Gallagher.

This brief arms Ian with FL-specific substance and gives the CTO the risk factor content for the PRO-610 Risk Scorecard build.

---

## FL Insurance Market Context (Q1 2026)

Florida's commercial property insurance market has undergone a structural crisis:

- **2017–2022:** Back-to-back hurricane seasons (Irma, Ian, Nicole) plus increased litigation drove 28 private carriers to exit FL or become insolvent.
- **Citizens Property Insurance** (state-backed insurer of last resort) grew from 500k to 1.4M policies as private market contracted.
- **2023–2025 reforms:** SB 2A (2023) — legislative reforms to reduce frivolous litigation and attorney's fee multipliers. New private carrier entrants began returning 2024.
- **Current state:** Market is recovering but premiums for wind-exposed assets remain 2-4× 2019 levels. Reinsurance costs have not fully retreated. Best new-market rates are selectively available to assets with strong wind mitigation profiles.

**Key implication for demo:** Owners who auto-renewed 2020-2023 policies are often paying peak-crisis rates. New market entrants in 2024-2025 have significantly better pricing for assets with good wind mitigation.

---

## FL Insurance Risk Score — Factor Model

### A. Building-level risk factors

| Factor | Score weight | Low risk | High risk |
|---|---|---|---|
| Wind zone | 20% | IBHS Fortified designation / Zone 1 (north FL) | Zone 4 (Miami-Dade, Monroe) |
| Construction type | 15% | CBS (Concrete Block Stucco), tilt-up concrete | Frame, masonry-frame, older masonry |
| Roof shape | 15% | Hip roof (4-slope) | Flat roof, gable roof |
| Roof-to-wall attachment | 10% | Clips or straps (good) | Toe-nails only |
| Opening protection | 15% | Impact glass on all openings | None — no shutters, no impact glass |
| Roof cover | 10% | 2006+ build, metal panel, or SBS modified | Older BUR (built-up roof), gravel |
| Building age | 5% | Post-2002 FBC (Florida Building Code) | Pre-1994 (pre-Andrew code) |
| Reinstatement value accuracy | 10% | Recent RICS/Marshall & Swift survey | No survey — insured to pre-2020 value |

**Post-Hurricane Andrew (1994) code** is the critical construction quality dividing line. Pre-1994 buildings carry significantly higher wind risk regardless of appearance.

### B. Site-level risk factors

| Factor | Score weight | Low risk | High risk |
|---|---|---|---|
| FEMA flood zone | 20% | Zone X (minimal risk) | Zone AE or VE (high-risk, base flood elevation) |
| Proximity to coast | 10% | >30 miles inland | <5 miles from coast |
| Elevation (for flood) | 15% | ≥3 ft above base flood elevation | At or below base flood elevation |
| Site drainage | 5% | Graded, no ponding history | Low-lying, history of inundation |
| Wildfire/brush | 5% | None | Interface zone (rare in urban FL commercial) |
| Sinkhole zone | 5% | Not in identified sinkhole area | Pasco/Hernando/Hillsborough (high sinkhole incidence) |

### C. Occupancy/use factors

| Factor | Score weight | Low risk | High risk |
|---|---|---|---|
| Use class | 20% | Standard office, warehouse | Food/bev, automotive, chemical/hazmat, healthcare |
| Tenant mix | 10% | Single-tenant NNN | Multi-tenant with high-turnover retail |
| Vacancy | 15% | <5% vacancy (occupied, maintained) | >30% vacancy (unoccupied = higher risk, some carriers exclude) |
| Claims history | 25% | Clean 5-year record | Any wind/water claim in prior 5 years |
| Security | 10% | Monitored alarm, CCTV, manned security | No monitoring |
| Fire suppression | 20% | Fully sprinklered, current NFPA 25 cert | Non-sprinklered (FL code requires for >12k sqft commercial) |

---

## Risk Scorecard Output — Per Asset

For each FL asset, the scorecard produces:

```typescript
interface FLInsuranceRiskScore {
  assetId: string;
  overallScore: number;       // 0–100 (100 = lowest risk)
  riskBand: "green" | "amber" | "red";
  buildingScore: number;      // 0–100
  siteScore: number;          // 0–100
  occupancyScore: number;     // 0–100

  keyRiskFlags: {
    factor: string;
    severity: "high" | "medium";
    description: string;
    actionAvailable: boolean;
  }[];

  estimatedPremiumRange: {
    low: number;   // $/sqft at this risk profile, competitive market
    high: number;  // $/sqft at this risk profile, legacy market
  };

  windMitigationCreditAvailable: boolean;
  windMitigationEstimatedSaving: number; // $/yr if wind mitigation credit obtained
}
```

### RealHQ FL demo portfolio — Risk Scorecard estimates

| Asset | Building | Site | Occupancy | Overall | Key risk flags |
|---|---|---|---|---|---|
| fl-001 Coral Gables Office | 62/100 | 55/100 | 78/100 | 64 (amber) | Zone 4 wind, 1998 build (post-code but older spec), flat roof sections |
| fl-002 Brickell Retail | 58/100 | 52/100 | 75/100 | 62 (amber) | Zone 4, coastal proximity, multi-tenant |
| fl-003 Tampa Industrial | 74/100 | 70/100 | 82/100 | 75 (green) | Tilt-up CBS, post-2002 FBC, Hillsborough sinkhole zone noted |
| fl-004 Orlando Office | 66/100 | 72/100 | 71/100 | 70 (green) | 18% vacancy flag, 2005 build (good code), inland location |
| fl-005 FLL Flex | 61/100 | 58/100 | 74/100 | 64 (amber) | Zone 3 wind, Broward coastal submarket, mixed-use occupancy |

---

## FL Premium Reduction Roadmap — 10 Steps

Adapted for FL commercial (distinct from UK roadmap in `docs/wave-2-insurance-premium-reduction-handoff.md`).

### Step 1: Wind Mitigation Inspection (FL-specific — highest ROI)
**What:** A licensed FL inspector (Florida-licensed home inspector or engineer) conducts a wind mitigation inspection against OIR-B1-1802 form. Documents roof shape, roof-to-wall attachment, opening protection, and roof cover type.

**Cost:** $300–$800 per commercial building (scale with building size).

**Saving:** Wind mitigation credits in FL can reduce the wind portion of a commercial all-risk premium by **15–40%**. On a $112k/yr Coral Gables office premium, a solid wind mitigation report could save $15–$40k/yr.

**Who does it:** FL-licensed inspector or PE (Professional Engineer) for commercial buildings over a certain size/complexity.

**CTA in product:** "Order wind mitigation inspection — licensed FL inspector assigned within 2 working days — £300 fixed fee"

---

### Step 2: Re-market the risk to 2024-2025 entrants
**What:** Place the insurance out to tender with carriers who have re-entered the FL market 2024-2025. Do not use the same broker who placed the current policy.

**Key 2024-2025 entrant carriers (commercial):** Citizens (last resort), Slide Insurance (acquired Citizens policies), UPC Elevate (rebranded), Demotech-rated carriers including Safepoint, Homeowners Choice. For larger commercial: Zurich, FM Global, Hartford.

**Saving:** 20–35% for assets with clean claims history + good wind mitigation profile.

---

### Step 3: Correct the reinstatement value
**What:** Many FL commercial buildings are insured to 2018-2020 reconstruction cost values. Construction costs have risen 30-50% since 2020 (labour scarcity post-Ian). Over-insuring to today's replacement cost may not reduce the premium, but under-insuring to an inflated estimated cost risks being caught co-insuring. A Marshall & Swift or CoreLogic valuation corrects this.

**For:** Buildings insured on older schedules without a recent reinstatement survey.

**Impact:** Correct reinstatement value can lower the insured sum (if previously over-inflated) and reduce all-risk premium proportionately.

---

### Step 4: Impact window and door retrofits (for pre-2002 builds)
**What:** Install PGT or CGI impact-rated windows and doors on all openings. This is the single biggest physical upgrade available on pre-2002 buildings.

**Cost:** $20–$60/sqft of opening area (significant but one-time capital cost).

**Saving:** Opens eligibility for SBC (Structural Building Component) credits. Insurance saving typically: 8–20% on wind premium.

**Note:** Only relevant where the current policy excludes or penalises wind because of unprotected openings. Run only when wind premium is a significant cost line.

---

### Step 5: FEMA flood zone re-rating (where applicable)
**What:** If the asset is in Zone AE or X-500, commission a FEMA LOMA (Letter of Map Amendment) or LOMR-F (Letter of Map Revision — Fill) to document that the building's lowest floor is above the Base Flood Elevation. This can remove the flood zone designation and eliminate mandatory NFIP flood coverage.

**Cost:** $1,500–$5,000 (surveyor + FEMA filing fee).

**Saving:** NFIP commercial flood premiums in AE zones can be $8,000–$40,000/yr for a 30,000 sqft commercial building. A successful LOMA can eliminate this entirely.

**Prerequisite:** Building must genuinely be above BFE — do not attempt if flooding has occurred or building is marginal.

---

### Step 6: Claims management and 5-year clean record
**What:** Avoid small claims (under $15k). In FL, even a single commercial water/wind claim will trigger non-renewal or 30-40% premium increase at the next renewal. Self-insure small losses.

**For policy purposes:** If a claim has been made in the past 3-5 years, proactively explain to carriers that the claim was a one-off (document the remediation work). Some carriers will overlook a single small claim with evidence of remediation.

---

### Step 7: Consolidate the carrier programme
**What:** Single-carrier all-risk (wind + flood + GL + property) vs split programme (wind with one carrier, flood with NFIP, GL with another). A single carrier programme is administratively simpler and often cheaper — carriers compete harder for the whole account.

**Particularly relevant for:** Multi-asset owners — a portfolio placement (all 5 FL assets, single master policy) typically achieves 8–15% discount vs placing each asset separately.

---

### Step 8: Raise excess/deductible (where risk is retained)
**What:** FL wind deductibles are typically set as a % of the insured value (2-5% is common). Raising from 2% to 5% can reduce the all-risk premium by 10–25%. Only suitable where the owner has sufficient cash reserves to absorb a 5% of value deductible on a large loss.

**For:** Institutional or semi-institutional owners (Coral Gables office at $8M insured value — 5% deductible = $400k retention).

**Not for:** Owner-operators who could not absorb a large deductible without financial distress.

---

### Step 9: Sprinkler system upgrade (if not fully sprinklered)
**What:** FL Fire Prevention Code (NFPA 13) requires full sprinkler coverage for commercial buildings >12,000 sqft occupied by the public. Compliance is legally required but not always enforced on older buildings. Retrofitting sprinklers opens access to fire suppression credits on the all-risk policy.

**Cost:** $3–$7/sqft for full retrofit (significant — only worthwhile if unsprinklered and premium is high).

**Saving:** Fire suppression credit: 8–15% on the fire/peril portion of the all-risk premium.

---

### Step 10: PACE financing for wind mitigation/solar upgrades
**What:** Property Assessed Clean Energy (PACE) financing in FL allows commercial owners to finance energy efficiency and wind hardening improvements and repay through the property tax assessment. No upfront capital cost.

**What it can fund:** Impact windows, roofing upgrades (metal panel), HVAC, solar PV, wind mitigation retrofits.

**Impact on insurance:** Once wind mitigation upgrades are complete and documented via re-inspection, the premium reduction applies immediately at the next renewal.

**FL PACE providers:** Ygrene, PACE Loan Group, Renew Financial (commercial programmes available in most FL counties).

**CTA in product:** "Explore PACE financing — no upfront cost, funded through property tax assessment" → PACE partner referral.

---

## Roadmap Savings Summary — FL Demo Portfolio

| Step | fl-001 Coral Gables | fl-003 Tampa Industrial | fl-005 FLL Flex | Notes |
|---|---|---|---|---|
| Wind mitigation inspection | $12–28k/yr | $5–10k/yr | $8–15k/yr | Step 1 — highest ROI |
| Re-market to 2024 entrants | $15–35k/yr | $8–15k/yr | $10–20k/yr | Step 2 |
| Portfolio placement (all 5 assets) | Combined 10–15% | — | — | Step 7 |
| FEMA LOMA (if applicable) | Varies by flood zone | Sinkhole note | Zone 3 check | Step 5 |
| **Realistic annual saving** | **$28–55k/yr** | **$12–22k/yr** | **$15–28k/yr** | After Steps 1, 2, 7 |

---

## Demo talking points for FL insurance risk scorecard

> "Florida insurance isn't like the rest of the US. The market collapsed 2019–2023 — 28 carriers left the state. If you haven't re-marketed your policies since 2021, you are almost certainly still paying crisis-era premiums. New carriers are back in 2024 with significantly better pricing — but only for buildings with a clean wind mitigation certificate. That's where we start: get the inspection done, document what the building already has, and use that report to put the risk out to tender with the carriers who will actually compete for it. That's how our Coral Gables client moved from $112k/yr to $84k/yr — wind mitigation report plus a competitive tender."

**When challenged on "I already have a broker":**
> "Has your broker run a wind mitigation inspection? Do you have the OIR-B1-1802 form on file? If not, your broker is placing your risk without the single biggest discount lever. We've seen 20-35% savings available purely from documenting the wind mitigation credits the building already qualifies for."

---

## Engineering note for CTO (PRO-610)

The Risk Scorecard UI on the `/insurance` page should:

1. For FL assets (`asset.country === "US"`): use the FL factor model above (wind zone, construction, roof shape, flood zone, claims history)
2. For UK assets (`asset.country === "UK"`): use the existing UK factor model (EPC, flood zone, construction age, claims, security)
3. The `windMitigationCreditAvailable` boolean should be `true` for any FL asset where `asset.country === "US"` and `asset.buildYear < 2002` (pre-Florida Building Code)
4. The 10-step roadmap should branch on `asset.country`: FL steps (above) vs UK steps (in `docs/wave-2-insurance-premium-reduction-handoff.md`)
5. PACE financing CTA should appear for FL assets only

Wind zone by FL county (simplified):
```typescript
const FL_WIND_ZONE: Record<string, 1 | 2 | 3 | 4> = {
  "Miami-Dade": 4, "Monroe": 4, "Broward": 3, "Palm Beach": 3,
  "Martin": 2, "St. Lucie": 2, "Indian River": 2, "Brevard": 2,
  "Volusia": 2, "Flagler": 2, "St. Johns": 2, "Duval": 2,
  "Nassau": 1, "Alachua": 1, "Orange": 1, "Osceola": 1,
  "Hillsborough": 2, "Pinellas": 3, "Manatee": 3, "Sarasota": 3,
  "Charlotte": 3, "Lee": 3, "Collier": 4,
};
```

Flood zone for each FL asset should be pulled from FEMA NFIP API (already wired via `src/lib/enrich-asset.ts` for US assets).

---

*Sources: OIR (Florida Office of Insurance Regulation), FM Global commercial underwriting guides, Marsh FL commercial benchmarks, IBHS Fortified commercial programme, FEMA NFIP rate tables, Citizens Property Insurance 2024 rate filings*
*Last updated: March 2026 | Wave 2 RE Commercial supplement*
