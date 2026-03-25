# Wave 2 — Master Build Order

**Author:** Head of Product
**Date:** 2026-03-23
**Status:** Engineering reference — use this to sequence all Wave 2 work
**Replaces:** Ad-hoc prioritisation. This is the single source of truth for build sequence.

---

## Why sequence matters

Wave 2 has 9 feature areas with shared models. Build the wrong thing first and you block 3 other features. The dependency graph below shows exactly which models and libraries must exist before downstream work can start.

**The three most dangerous ordering mistakes:**
1. Building Rent Review before `Tenant` + `Lease` models — rent review uses `leaseRef` as a FK to `Lease`
2. Building Action Queue before the other 8 features — it aggregates from all of them; build it last
3. Building Hold vs Sell DCF or Scout underwriting before `src/lib/avm.ts` — they both need `getFallbackCapRate()`

---

## New Prisma models — complete list

| Model | Feature | Depends on |
|-------|---------|------------|
| `EnergyRead` | Energy Wave 2 | `UserAsset` |
| `EnergyAnomaly` | Energy Wave 2 | `UserAsset`, `EnergyRead` |
| `SolarAssessment` | Energy Wave 2 | `UserAsset` |
| `SolarQuoteRequest` | Energy Wave 2 | `UserAsset` |
| `Tenant` | Tenant Intelligence | `UserAsset` |
| `Lease` | Tenant Intelligence | `Tenant`, `UserAsset`, `Document` |
| `TenantPayment` | Tenant Intelligence | `Tenant`, `Lease` |
| `TenantEngagement` | Tenant Intelligence | `Tenant`, `Lease` |
| `PlanningApplication` | Planning Intelligence | `UserAsset` |
| `AssetValuation` | AVM | `UserAsset` |
| `RentReviewEvent` | Rent Review | `UserAsset`, `Lease` ← **blocks if Lease not built** |
| `RenewalCorrespondence` | Rent Review | `RentReviewEvent` |
| `HoldSellScenario` | Hold vs Sell | `UserAsset` |
| `SellEnquiry` | Hold vs Sell | `UserAsset` |
| `ScoutUnderwriting` | Scout | `ScoutDeal` |
| `ScoutLOI` | Scout | `ScoutDeal` |
| `ScoutComparable` | Scout | `ScoutDeal` |
| `Contractor` | Work Orders | — |
| `WorkOrderMilestone` | Work Orders | `WorkOrder` |
| `WorkOrderCompletion` | Work Orders | `WorkOrder`, `Contractor` |

**UserAsset field additions** (multiple features):
- `meterType` — Energy Wave 2
- `planningImpactSignal`, `planningLastFetched` — Planning Intelligence
- `avmValue`, `avmDate`, `avmConfidence` — AVM
- `pipelineStage`, `pipelineUpdatedAt`, `brochureDocId`, `region`, `postcode` (already exists), `tenantCount`, `wault` — Scout
- `siteCoveragePct`, `pdRights`, `pdRightsDetail`, `changeOfUsePotential`, `changeOfUseDetail`, `airRightsPotential`, `airRightsDetail`, `devPotentialAssessedAt` — Dev Potential (PRO-604)
- `insuranceRiskScore`, `insuranceRiskFactors`, `insuranceRoadmap`, `insuranceRiskAssessedAt` — Insurance Risk Scorecard (PRO-610)

See `docs/wave-2-prisma-schema-additions.md` Section A for the full Prisma field definitions.

---

## Shared libraries — build once, use everywhere

These must be written **before** any feature that needs them. They live in `src/lib/`.

| Library | Used by | Contents |
|---------|---------|----------|
| `src/lib/avm.ts` | AVM, Hold vs Sell, Scout underwriting | `calculateIncomeCap`, `calculatePsfValue`, `blendValuation`, `getFallbackCapRate`, `calculateIRR`, `calculateNPV`, `median`, `percentile` |
| `src/lib/hold-sell-model.ts` | Hold vs Sell | `calculateHoldScenario`, `calculateSellScenario`, `deriveRecommendation` |
| `src/lib/planning-classifier.ts` | Planning Intelligence cron | `classifyPlanningImpact` (Claude Haiku call) |
| `src/lib/planning-feed.ts` | Planning Intelligence cron | `fetchUKPlanningApplications`, `mapGovUKEntityToApp` |
| `src/lib/land-registry.ts` | AVM (UK comps) | `fetchLandRegistryComps` |
| `src/lib/tenant-health.ts` | Tenant Intelligence | `calculateHealthScore` (composite v2) |
| `src/lib/tenant-materialise.ts` | Tenant Intelligence | `materialiseLease`, `findAssetByAddress` |
| `src/lib/covenant-check.ts` | Tenant Intelligence | `checkCovenantUK` (Companies House) |
| `src/lib/planning-benchmarks.ts` | Scout | `scout-benchmarks.ts` → market cap rates + ERV |
| `src/lib/email.ts` (additions) | Multiple | `sendContractorTenderInvite`, `sendPlanningStatusAlert`, `sendWorkOrderComplete`, `sendTenantEngagementAlert`, `sendRentReviewAlert` |
| `src/lib/dev-potential.ts` | Planning / Dev Potential (PRO-604) | `classifyUKPDR`, `classifyUSPDR`, `classifyUKChangeOfUse`, `classifyAirRights`, `calculateSiteCoverage`, `classifyDevPotential` |
| `src/lib/insurance-risk.ts` | Insurance Risk Scorecard (PRO-610) | `scoreInsuranceRisk`, `buildPremiumReductionRoadmap`, `computeCompositeRiskScore` |

---

## Dependency graph

```
Phase 0: Foundations (do first — everything depends on these)
│
├── ALL Prisma migrations (run as a single batch migration)
│   ├── EnergyRead, EnergyAnomaly, SolarAssessment, SolarQuoteRequest
│   ├── Tenant, Lease, TenantPayment, TenantEngagement
│   ├── PlanningApplication
│   ├── AssetValuation
│   ├── RentReviewEvent, RenewalCorrespondence
│   ├── HoldSellScenario, SellEnquiry
│   ├── ScoutUnderwriting, ScoutLOI, ScoutComparable
│   ├── Contractor, WorkOrderMilestone, WorkOrderCompletion
│   └── UserAsset field additions (meterType, avmValue, planningImpactSignal...)
│
├── Planning data migration script
│   └── UserAsset.planningHistory JSON → PlanningApplication records
│
└── src/lib/avm.ts (getFallbackCapRate, calculateIRR, calculateNPV, median, percentile)
    └── [Hold vs Sell DCF, Scout underwriting, AVM route all unblocked after this]

Phase 1: Independent features (build in parallel — no cross-feature dependencies)
│
├── TRACK A: Energy Wave 2
│   ├── EnergyRead/EnergyAnomaly routes
│   ├── HVAC anomaly detection algorithm
│   ├── Solar card
│   └── Energy heatmap
│
├── TRACK B: Work Orders Wave 2
│   ├── Contractor seed data
│   ├── AI scope generation (POST /scope)
│   ├── GET /api/user/contractors
│   ├── Tender panel email distribution (token-auth)
│   ├── POST /tender/respond/:token (contractor portal)
│   ├── Start + milestone routes
│   └── Completion → Commission creation (3%)
│
└── TRACK C: Scout underwriting + LOI
    ├── scout-benchmarks.ts
    ├── POST /api/scout/deals/:id/underwrite
    ├── ScoutUnderwriting model
    ├── POST /api/scout/deals/:id/loi (Claude)
    ├── Pipeline tab + PATCH /pipeline
    ├── Brochure upload → Textract → underwriting recalc
    └── GET /api/scout/comparables

Phase 2: Interdependent features (order matters within this phase)
│
├── STEP 1: Tenant + Lease foundation
│   ├── src/lib/tenant-materialise.ts
│   ├── src/lib/tenant-health.ts (composite score v2)
│   ├── src/lib/covenant-check.ts
│   ├── GET /api/user/tenants (real data route)
│   ├── POST /engage-renewal (with Claude letter)
│   ├── useRealTenants hook
│   └── Wire tenants page to real data
│
├── STEP 2: Rent Review (requires Lease from Step 1)
│   ├── GET /api/user/rent-reviews
│   ├── POST /api/user/rent-reviews/:id/draft (Claude)
│   ├── POST /api/user/rent-reviews/:id/send
│   ├── POST /api/user/rent-reviews/:id/hot (DocuSign HoT)
│   ├── PATCH /api/user/rent-reviews/:id/complete → Commission (8%)
│   └── POST /api/cron/rent-review-triggers (18m/12m/6m/3m)
│
├── STEP 3: AVM (requires avm.ts from Phase 0)
│   ├── src/lib/land-registry.ts (UK comps)
│   ├── GET /api/user/assets/:id/valuation
│   ├── GET /api/user/portfolio/valuation
│   ├── GET /api/user/assets/:id/valuation/history
│   └── Trigger fetchLandRegistryComps on UK asset creation
│
├── STEP 4: Hold vs Sell Wave 2 (requires AVM from Step 3)
│   ├── src/lib/hold-sell-model.ts (full DCF)
│   ├── POST /api/user/hold-sell-scenarios/:id/assumptions
│   ├── POST + GET /api/user/sell-enquiries
│   ├── Hold vs Sell page: assumptions accordion
│   ├── Hold vs Sell page: NPV + equity multiple row
│   └── Hold vs Sell page: sell CTA modal
│
└── STEP 5: Planning Intelligence (after migration script from Phase 0)
    ├── src/lib/planning-classifier.ts (Claude Haiku)
    ├── src/lib/planning-feed.ts (planning.data.gov.uk)
    ├── GET /api/user/planning (update — reads PlanningApplication table)
    ├── POST /api/cron/planning-monitor (fetch + classify + alert)
    ├── sendPlanningStatusAlert (Resend)
    ├── PATCH /api/user/planning/:id/ack
    └── POST /api/admin/planning/fetch/:assetId

Phase 3: Integration layer (build last — requires all Phase 1+2 features)
│
└── Action Queue
    ├── GET /api/user/action-queue (parallel aggregation from all sources)
    ├── ActionQueueDrawer.tsx component
    ├── Wave2Banner.tsx
    └── TopBar.tsx — replace "X Urgent" with Action Queue badge
```

---

## Sprint plan (3 engineers × 2-week sprints)

Assumes: Founding Engineer (FE), Full-Stack Engineer (FSE), CTO owns infrastructure.

### Sprint 1 — Foundations + parallel tracks start
**CTO:**
- Prisma migration: all 20 new models in one batch
- Planning data migration script
- `src/lib/avm.ts` (shared math library)

**FE:**
- Work Orders Wave 2: Contractor model + seed data + scope generation + contractor GET
- Work Orders: Tender token-auth email flow + `POST /tender/respond/:token`

**FSE:**
- Scout: `scout-benchmarks.ts` + `ScoutUnderwriting` + `POST /underwrite`
- Scout: `ScoutLOI` + `POST /loi` (Claude)

### Sprint 2 — Parallel tracks complete + Tenant foundation
**CTO:**
- AVM: `src/lib/land-registry.ts` + `GET /api/user/assets/:id/valuation`
- AVM: portfolio valuation + dashboard KPI strip update

**FE:**
- Work Orders: milestone + completion routes → Commission trigger (3%)
- Work Orders: completion modal UI + Contractors tab

**FSE:**
- Tenant: `tenant-materialise.ts` + `tenant-health.ts` + `covenant-check.ts`
- Tenant: `GET /api/user/tenants` + `useRealTenants` + wire tenants page
- Tenant: `POST /engage-renewal` with Claude letter + letter modal

### Sprint 3 — Rent Review + Energy + Planning
**CTO:**
- Hold vs Sell: `hold-sell-model.ts` + assumptions route + sell enquiry
- Hold vs Sell: page enhancements (NPV row, assumptions accordion, sell CTA)

**FE:**
- Rent Review: `GET /rent-reviews` + `POST /draft` (Claude) + `POST /send`
- Rent Review: `POST /hot` (DocuSign) + `PATCH /complete` → Commission (8%)
- Rent Review: `POST /api/cron/rent-review-triggers`

**FSE:**
- Energy Wave 2: `EnergyRead`/`EnergyAnomaly` routes + HVAC anomaly detection
- Energy: solar card + heatmap UI
- Planning: `GET /api/user/planning` update + `classifyPlanningImpact` + cron

### Sprint 4 — Planning complete + Action Queue + Scout pipeline
**CTO:**
- Planning: cron + status change alerts + admin fetch trigger
- Action Queue: `GET /api/user/action-queue` route (parallel aggregation)

**FE:**
- Scout: pipeline tab + PATCH /pipeline + brochure upload
- Scout: comparables accordion

**FSE:**
- Action Queue: `ActionQueueDrawer.tsx` + `Wave2Banner.tsx`
- Action Queue: TopBar.tsx update
- Tenant: payment routes + cron triggers
- Polish + bug fixes across all Wave 2 features

**CTO (Sprint 4b — new features specced 2026-03-23):**
- Insurance Risk Scorecard (PRO-610): `src/lib/insurance-risk.ts` + `GET /api/user/insurance-risk/:assetId` + `PATCH /api/user/insurance-risk/:assetId/action/:actionId` + `/insurance` page sections 4+5. Spec: `docs/wave-2-insurance-premium-reduction-handoff.md`
- Per-asset Dev Potential (PRO-604): `src/lib/dev-potential.ts` + `GET /api/user/assets/:id/development-potential`. Spec: `docs/wave-2-planning-dev-potential-handoff.md`

**FE (Sprint 4b):**
- Dashboard Properties Grid (PRO-613): FE-only, no schema dependency. Replace satellite thumbnail strip with 3-across per-asset cards + opportunity badges. Spec: `docs/wave-2-dashboard-properties-grid-handoff.md`. Can start immediately — does not require PRO-563 migration.

---

## Critical path (cannot be parallelised)

```
Prisma migrations (Sprint 1, Day 1)
  → Planning migration script (Sprint 1, Day 2)
  → GET /api/user/planning update (Sprint 3)
  → Planning cron (Sprint 3-4)

Prisma migrations (Sprint 1, Day 1)
  → src/lib/avm.ts (Sprint 1)
  → GET /api/user/assets/:id/valuation (Sprint 2)
  → Hold vs Sell DCF + assumptions (Sprint 3)

Prisma migrations (Sprint 1, Day 1)
  → Tenant/Lease models (Sprint 2)
  → GET /api/user/tenants (Sprint 2)
  → RentReviewEvent (Sprint 3)
  → Rent review cron (Sprint 3)

[Phase 1 + Phase 2 all complete]
  → Action Queue aggregation (Sprint 4)
  → ActionQueueDrawer (Sprint 4)
```

---

## Environment variables gating features

All environment variables are optional — missing keys cause graceful silent fallback, never an error. Features remain visible in UI but show "data pending" state.

| Variable | Feature | Fallback behaviour |
|----------|---------|-------------------|
| `ANTHROPIC_API_KEY` | Scope generation, LOI, renewal letters, planning classification | Buttons hidden / skipped |
| `ATTOM_API_KEY` | US comparable sales | PSF method skipped; income cap only |
| `COMPANIES_HOUSE_API_KEY` | Tenant covenant check | covenantGrade = "unknown" |
| `DOCUSIGN_*` | Rent review HoT | POST /hot returns 501 |
| `GOCARDLESS_ACCESS_TOKEN` | Work order payment on completion | paymentStatus = "pending" |
| `EIG_API_KEY` | UK auction deal feed | Demo scout data only |
| `CREXI_API_KEY` | US deal feed | Demo scout data only |
| `TENDER_SECRET` | Contractor quote token | Tendering disabled until set — **HIGH priority** |
| `X_RapidAPI_Key` | LoopNet Scout feed | **Already live** ✓ |
| `RESEND_API_KEY` | All outbound emails | Already needed ✓ |
| `CRON_SECRET` | All cron endpoints | Already needed ✓ |

---

## Acceptance gates — per phase

Before moving to the next phase, the following must be verified in the **production** environment (not CI, not local):

### Gate 0 → Phase 1
- [ ] All Prisma migrations applied without error in production
- [ ] `src/lib/avm.ts` — `getFallbackCapRate("industrial", "UK")` returns `0.0525`
- [ ] Planning migration script run — `PlanningApplication` table populated from existing `UserAsset.planningHistory` JSON

### Gate 1 → Phase 2
- [ ] Work order completion creates a `Commission` record with `category = "work_order"`, `commissionRate = 0.03`
- [ ] Scout deal with `askingPrice` + `sqft` returns non-null underwriting from `POST /underwrite`
- [ ] Contractor panel returns seeded contractors filtered by region

### Gate 2 → Phase 3
- [ ] `GET /api/user/tenants` returns real lease data for a user with uploaded rent roll PDFs
- [ ] `GET /api/user/assets/:id/valuation` returns `avmValue` for an asset with `netIncome` + `marketCapRate`
- [ ] Hold vs Sell page renders correct `estimatedValue` from `UserAsset.avmValue` (not inline calc)

### Gate 3 → Phase 4 (Action Queue)
- [ ] Rent review completion creates `Commission` record with `commissionRate = 0.08`
- [ ] `POST /api/cron/planning-monitor` creates `PlanningApplication` records for at least one UK asset
- [ ] Energy page shows `EnergyAnomaly` records for an asset with uploaded energy bills

### Gate 4 → Wave 2 complete
- [ ] `GET /api/user/action-queue` returns items from ≥ 3 different sources in < 1.5s
- [ ] `ActionQueueDrawer` renders and ranks by `urgencyScore × annualValue`
- [ ] TopBar "Action Queue" badge shows correct item count and total annual value

### Gate 4b → Sprint 4b features (PRO-610, PRO-613)
- [ ] `GET /api/user/insurance-risk/:assetId` returns `riskScore`, `factors[]`, `roadmap[]` for an asset with known EPC/flood/construction data. Roadmap sorted by ROI (annualSaving / costLow).
- [ ] Dashboard properties grid renders 3-across on desktop, 1-column on mobile. No satellite thumbnail strip. Each card shows up to 3 badges derived from live `portfolio.assets` data. No hardcoded values.
- [ ] `insurance_risk` action type appears in `GET /api/user/action-queue` when top roadmap action is not done and `annualSaving > 300`.

---

## What's already live (do not rebuild)

| Feature | Status | Notes |
|---------|--------|-------|
| LoopNet Scout feed | ✅ **Live** | `syncLoopNet` in `/api/scout/deals`, capRate + brokerName + daysOnMarket fields in schema |
| `GET /api/user/hold-sell-scenarios` | ✅ **Live** | Simplified (netIncome/capRate) — needs DCF upgrade in Sprint 3 |
| `GET /api/market/benchmarks` | ✅ **Live** | Static quarterly data, 6-hr cache |
| `GET /api/market/attom-benchmarks` | ✅ **Live** | Aggregates ATTOM comps |
| `src/lib/attom.ts` | ✅ **Live** | Fetches comps on US asset creation |
| `GET /api/user/noi-bridge` | ✅ **Live** | NOI bridge for dashboard |
| Work Orders Wave 1 | ✅ **Live** | draft → tendered → quotes → awarded |
| Scout feed + swipe | ✅ **Live** | Reactions, swipe mode, grid mode |

---

## Bugs to fix alongside Wave 2 build

These were surfaced during the spec process and should be fixed by whichever engineer touches that area:

| Bug | Found in | Severity |
|-----|---------|---------|
| Tenants page shows zero data for real users | Tenant Intelligence spec | **High** |
| `UserAsset.planningHistory` JSON not queryable | Planning Intelligence spec | **High** |
| `PaymentSparkline` renders 12 hardcoded green bars | Tenant Intelligence spec | Medium |
| Health score 1D (days-to-expiry only) | Tenant Intelligence spec | Medium |
| `hold-sell-scenarios` ignores `UserAsset.avmValue` | AVM spec | Medium |
| `getFallbackCapRate` hardcoded in 4+ places | AVM spec | Medium |
| Planning admin PATCH replaces entire JSON array | Planning Intelligence spec | Medium |
