# RealHQ Wave 2 — Launch Readiness Checklist

**Author:** Head of Product
**Date:** 2026-03-24 (updated)
**Status:** Wave 2 code COMPLETE as of 2026-03-24. All API routes built, all FE pages wired, TypeScript clean. Remaining gates: one CTO migration action + env vars + CTO/FSE testing.

---

## Go/No-Go Summary

| Gate | Status | Owner | Notes |
|------|--------|-------|-------|
| Phase 0: Prisma schema migration | ✅ Done | — | All Wave 2 models live in Neon. PRO-563 closed. |
| Phase 0: Contractor seed | 🟡 Verify | CTO | `npx ts-node prisma/seeds/contractors.ts` — confirm `Contractor` table populated |
| Phase 0: Planning history migration | 🟡 Verify | CTO | `npx ts-node prisma/scripts/migrate-planning-history.ts` — confirm `PlanningApplication` records |
| **Insurance Risk migration** | 🔴 One action | CTO | Run `prisma/migrations/20260324_insurance_risk_scorecard/migration.sql` against Neon. Single `psql` command. Unblocks PRO-610 scorecard UI. |
| AVM / Portfolio Valuation | ✅ Code done | CTO | PRO-570 — routes built, FE wired. CTO testing to verify `AssetValuation` writes. |
| Tenant Intelligence | ✅ Code done | FSE | PRO-572 — routes + FE built. FSE testing to verify materialisation + health scores. |
| Work Orders Wave 2 | ✅ Code done | — | PRO-566/571 — all lifecycle routes built + FE wired. `TENDER_SECRET` env var needed for tender invite emails. |
| Planning Intelligence | ✅ Code done | CTO | PRO-576 done. `CRON_SECRET` env var needed for cron endpoints. |
| Per-asset Development Potential | ✅ Code done | — | PRO-604 done. Wired to `/assets/:id` page. Pending insurance migration to unblock `planningImpactSignal` field. |
| Insurance Risk Scorecard + Roadmap | ✅ Code done | CTO | PRO-610 — all routes + lib + FE built 2026-03-24. Blocked only on migration above. |
| Dashboard: Properties Grid + Donut + Value Score + 8-tile KPI | ✅ Done | — | PRO-613 — all 4 parts built 2026-03-24. TypeScript clean. |
| Hold vs Sell Wave 2 (full DCF) | ✅ Code done | CTO | PRO-575 done. CTO testing to verify DCF with real AVM data. |
| Rent Review automation | ✅ Code done | FSE | PRO-574 done. FSE testing to verify cron triggers + letter generation + HoT + commission. |
| Scout Wave 2 (underwriting, LOI, pipeline) | ✅ Code done | FSE | PRO-568/569 done. FSE testing to verify end-to-end underwrite → LOI → bind pipeline. |
| Action Queue (all 9 sources) | ✅ Code done | — | Route + FE built. All 9 sources live once feature routes tested. |
| NOI Bridge (dashboard waterfall) | ✅ Code done | — | Built 2026-03-24. Dashboard section 8b. |
| Rent Review full workflow (draft, HoT, send, complete) | ✅ Code done | — | All routes wired to tenants page. `RESEND_API_KEY` already in prod for email send. |
| Income Opportunities (solar, EV, 5G) | ✅ Code done | — | Activate/activations routes wired to `/income` page. `GOOGLE_SOLAR_API_KEY` optional (graceful fallback). |
| Scout LOI + pipeline | ✅ Code done | — | Underwrite + LOI + pipeline wired to scout page. |
| Energy switch | ✅ Code done | — | `POST /api/energy/quotes/:quoteId/switch` wired to energy page. |
| Insurance bind | ✅ Code done | — | `POST /api/insurance/quotes/:quoteId/bind` wired behind `coverforceEnabled` config flag. |
| Compliance renewal | ✅ Code done | — | `POST /api/user/compliance/renew` wired to compliance page. |
| COMPANIES_HOUSE_API_KEY | 🔴 Missing | Board | Free API — get from developer.company-information.service.gov.uk. Graceful fallback if absent. |
| CRON_SECRET | 🔴 Missing | CTO | Generate any strong random string. Set in Vercel env vars. Required for planning + tenant engagement crons. |
| TENDER_SECRET | 🔴 Missing | CTO | Generate any strong random string. Set in Vercel env vars. Required for contractor tender invite token URLs. |
| GOOGLE_SOLAR_API_KEY | 🟡 Optional | Board | Solar opportunity card has graceful fallback. Skip for Wave 2 launch. |
| GOCARDLESS_ACCESS_TOKEN | 🟡 Optional | Board | Contractor payment. Skip for initial Wave 2 launch. |
| npm ci (PRO-392) | 🟡 In progress | CTO | Affects CI only, not production. |

**Critical path to launch:**
1. CTO: Run insurance risk migration (`prisma/migrations/20260324_insurance_risk_scorecard/migration.sql`) — 10 mins
2. CTO: Set `CRON_SECRET` + `TENDER_SECRET` env vars in Vercel — 5 mins
3. Board: Get `COMPANIES_HOUSE_API_KEY` (free, 2 mins signup)
4. CTO: Run contractor seed + planning history migration
5. CTO/FSE: Test AVM (PRO-570), Tenant Intelligence (PRO-572), Hold/Sell (PRO-575), Rent Review (PRO-574), Scout (PRO-568/569)
6. Go live

---

## Phase 0 — Foundations Gate

✅ **Schema migration is complete.** Applied piecemeal across 9 individual migration files on 2026-03-22 and 2026-03-23. Single-command migration (PRO-563) was not needed — same net result.

### P0-1: Prisma schema migration — ✅ DONE (PRO-563)

Applied via:
- `20260322_add_income_activations` — `IncomeActivation`
- `20260322_add_scout_deals` — `ScoutDeal` base
- `20260322_add_tenant_engagement_actions` — `TenantEngagement`
- `20260322_add_work_orders` — `WorkOrder` base
- `20260322_scout_deal_loopnet_fields` — LoopNet fields on `ScoutDeal`
- `20260323_wave2_tenant_scout_models` — `Tenant`, `Lease`, `TenantPayment`, `ScoutUnderwriting`, `ScoutLOI`, `HoldSellScenario`; UserAsset fields (`avmValue`, `planningImpactSignal`, `region`, etc.)
- `20260323_wave2_rent_review` — `RentReviewEvent`, `RenewalCorrespondence`
- `20260323_wave2_work_orders` — `Contractor`, `WorkOrderMilestone`, `WorkOrderCompletion`
- `20260323_wave2_planning_schema` — `PlanningApplication` fields, `UserAsset` dev potential fields
- `Commission` + `AssetValuation` — in schema.prisma, applied via `prisma db push` (no standalone migration file)

**⚠️ Note:** `insuranceRiskScore`, `insuranceRiskFactors`, `insuranceRoadmap`, `insuranceRiskAssessedAt` on `UserAsset` are in `schema.prisma` (PRO-610) but have no migration file. Run `npx prisma db push` or write migration before PRO-610 routes go live.

### P0-2: Contractor seed (after P0-1)

```bash
npx ts-node --project tsconfig.json prisma/seeds/contractors.ts
```

Seeds 10 SE UK + 5 FL US contractors for Work Orders Wave 2.

### P0-3: Planning history migration (after P0-1)

```bash
npx ts-node --project tsconfig.json prisma/scripts/migrate-planning-history.ts
```

Migrates `UserAsset.planningHistory` JSON blobs → `PlanningApplication` table records.

---

## Feature-by-Feature Readiness

### 1. AVM / Portfolio Valuation

**Routes built:** `GET /api/user/assets/:id/valuation`, `GET /api/user/assets/:id/valuation/history`, `GET /api/user/portfolio/valuation`

**What it does:** Per-asset income cap rate + PSF blend AVM with 7-day cache. Dashboard KPI tile shows live portfolio value.

**Gate after P0:** PRO-570 — CTO runs AVM routes, verifies valuation stored in `AssetValuation` table.

**Env vars needed:** None — uses existing data.

**Go criteria:**
- [ ] `GET /api/user/assets/:id/valuation` returns `{ value, method, confidence }` for a real asset
- [ ] Value is stored in `AssetValuation` table (`avmValue`, `avmDate` on UserAsset updated)
- [ ] Dashboard portfolio value KPI tile shows sum of all asset valuations
- [ ] History endpoint returns array of previous valuations

---

### 2. Tenant Intelligence

**Routes built:** `GET /api/user/tenants`, `POST /api/user/leases/materialise`, `POST /api/user/tenants/:leaseId/letter`

**What it does:** Real tenant directory from document extraction; lease expiry alerts; covenant health scores; rent review letter generation via Claude.

**Gate after P0:** PRO-572 — FSE tests tenant materialisation, health score, renewal letter.

**Env vars needed:** `COMPANIES_HOUSE_API_KEY` (free, required for UK covenant grades — graceful fallback if absent, shows "Covenant check unavailable")

**Go criteria:**
- [ ] `GET /api/user/tenants` returns real tenants derived from uploaded lease documents
- [ ] Each tenant shows `healthScore`, `expiryDays`, `rentGap`
- [ ] Tenants page renders real data, not demo fallback
- [ ] `POST /api/user/tenants/:leaseId/letter` generates a renewal notice via Claude and returns HTML
- [ ] `POST /api/cron/tenant-engagement-triggers` creates `TenantEngagement` records for leases within trigger horizons (365, 180, 90 days)

---

### 3. Work Orders — Wave 2 additions

**Routes built:** `POST /api/user/work-orders/:id/scope`, `POST /api/user/work-orders/:id/start`, `POST /api/user/work-orders/:id/milestone`, `GET /api/user/work-orders/:id/milestones`, `POST /api/user/work-orders/:id/complete`, `GET /api/user/contractors`, `GET /api/tender/respond/:token`, `POST /api/tender/respond/:token`

**What it does:** AI scope generation → contractor tender invites → public quote response via token URL → job start → milestones → completion + commission.

**Gate after P0:** PRO-566/567/571 — FE wires start/scope/complete UI, tests contractor quote flow.

**Env vars needed:** `TENDER_SECRET` (sign token URLs), `RESEND_API_KEY` (already in prod — tender invite emails)

**Go criteria:**
- [ ] Scope generation produces a plain-English scope of works from brief + asset type
- [ ] Contractor list seeded — `GET /api/user/contractors` returns contractors
- [ ] Tender invite email sent to contractor with token URL on work order creation
- [ ] Public `GET /api/tender/respond/:token` renders contractor quote form without auth
- [ ] `POST /api/tender/respond/:token` creates quote, notifies owner via email
- [ ] Job start → `WorkOrderMilestone` created with "Job started" milestone
- [ ] Job complete → `Commission` record created at 3% of final cost
- [ ] Contractor rating stored on `WorkOrderCompletion`

---

### 4. Planning Intelligence — Nearby applications + dev potential

**Routes built:** `GET /api/user/planning`, `PATCH /api/user/planning/:id/ack`, `POST /api/cron/planning-monitor`, `GET /api/user/assets/:id/development-potential`

**What it does:** Live UK planning application feed (planning.data.gov.uk) — nearby applications per asset, Claude impact classification, status-change email alerts. Plus per-asset PDR/change of use/air rights assessment.

**Gate after P0:** PRO-576 (planning cron) + PRO-603 (schema) + PRO-604 (dev potential)

**Env vars needed:** `CRON_SECRET` (secure cron), none for planning.data.gov.uk (free, no key)

**Go criteria:**
- [ ] `POST /api/cron/planning-monitor` fetches UK planning applications for assets with postcodes
- [ ] New applications receive Claude impact classification (threat/opportunity/neutral, score 1–10)
- [ ] Status change on existing application → email alert sent to owner
- [ ] No duplicate records on re-run (upsert on `assetId + sourceRef`)
- [ ] `GET /api/user/assets/:id/development-potential` returns PDR/change of use/air rights for a UK industrial asset
- [ ] Planning page renders with real `PlanningApplication` records (not JSON blob fallback)
- [ ] Development Potential section shows on `/planning` page for real user

---

### 5. Hold vs Sell — Wave 2 (full DCF)

**Routes built:** `GET /api/user/hold-sell-scenarios`

**What it does:** Full 10-year DCF with hold IRR, sell IRR, NPV, buy/hold/sell recommendation. Upgrades Wave 1 simplified model.

**Gate after P0:** PRO-575 — CTO wires DCF route with real AVM data.

**Env vars needed:** None.

**Go criteria:**
- [ ] `GET /api/user/hold-sell-scenarios` returns `holdIRR`, `sellIRR`, `npv`, `recommendation` for each asset
- [ ] Model uses real `avmValue` from AVM table (not static estimate)
- [ ] Hold vs Sell page renders real DCF results
- [ ] Recommendation updates when `planningImpactSignal` is "threat"

---

### 6. Scout — Wave 2 (underwriting, LOI, pipeline)

**Routes built:** `POST /api/scout/deals/:dealId/underwrite`, `POST /api/scout/deals/:dealId/loi`, `PATCH /api/scout/deals/:dealId/pipeline`, `GET /api/scout/pipeline`

**What it does:** Per-deal cap rate + DSCR + 5-yr IRR underwriting; AI Letter of Intent generation; Kanban pipeline management.

**Gate after P0:** PRO-568/569/597 — FSE builds + tests, end-to-end Scout flow.

**Env vars needed:** `ANTHROPIC_API_KEY` (already in prod — LOI generation)

**Go criteria:**
- [ ] `POST /api/scout/deals/:dealId/underwrite` returns `capRate`, `dscr`, `irr5yr`, `recommendation`
- [ ] `POST /api/scout/deals/:dealId/loi` returns full AI-drafted LOI as HTML/markdown
- [ ] LOI saves as `ScoutLOI` record in database
- [ ] Pipeline kanban shows deals in correct stage (Screening → LOI → Due Diligence → Exchange → Complete)
- [ ] Scout page renders deal cards with underwriting scores
- [ ] `/scout` page resolves auth 401 from portfolio API (PRO-557 fix verified)

---

### 7. Rent Review Automation

**Routes built:** `POST /api/cron/tenant-engagement-triggers`, `POST /api/user/tenants/:leaseId/letter`

**What it does:** Daily cron scans leases for renewal trigger horizons; generates formal rent review notices via Claude; creates `TenantLetter` records.

**Gate after P0:** PRO-574 — FSE tests cron + letter generation.

**Env vars needed:** `CRON_SECRET`, `RESEND_API_KEY` (already in prod), `COMPANIES_HOUSE_API_KEY`

**Go criteria:**
- [ ] Cron creates `TenantEngagement` records for leases within 90/180/365 days of expiry
- [ ] Letter generation returns properly formatted renewal notice with correct legal references
- [ ] Letter stored as `TenantLetter` in database
- [ ] Owner receives email notification when cron triggers on their assets
- [ ] Cron skips assets already triggered (idempotent on `assetId + triggerType + triggerDate`)

---

### 8. Action Queue (aggregated from all 9 sources)

**Built:** `ActionQueueDrawer.tsx`, `GET /api/user/action-queue`

**What it does:** Ranked queue of all identified opportunities across the portfolio — one place for the owner to see what to do first.

**Gate:** PRO-577 — depends on all feature routes above being live.

**Go criteria:**
- [ ] TopBar badge shows item count + total annual value
- [ ] Drawer opens and shows items from at least 4 sources (compliance, lease expiry, insurance, income)
- [ ] Items rank correctly (urgent items first, then by annual value × urgency multiplier)
- [ ] Dismiss persists to localStorage, does not re-appear on next load
- [ ] Wave 2 sources (energy anomalies, planning alerts, scout pipeline) contribute items once those features are live
- [ ] Badge turns red when any item has `urgency: "urgent"`

---

## Environment Variables — Board Actions Required

| Variable | Feature | How to get | Priority |
|----------|---------|------------|---------|
| `COMPANIES_HOUSE_API_KEY` | UK covenant check in Tenant Intelligence | Free: developer.company-information.service.gov.uk — 5 min | **High** |
| `CRON_SECRET` | Planning monitor + tenant engagement cron | Generate: `openssl rand -hex 32` | **High** |
| `TENDER_SECRET` | Contractor tender token signing | Generate: `openssl rand -hex 32` | **High** |
| `GOOGLE_SOLAR_API_KEY` | Solar opportunity card in Energy | Google Cloud Console — requires billing, ~$0/month for first 1k calls | Medium |
| `GOCARDLESS_ACCESS_TOKEN` | Contractor payment (Wave 2 optional) | GoCardless developer sandbox | Low — skip for initial Wave 2 |

`CRON_SECRET` and `TENDER_SECRET` can be any strong random string — generate with `openssl rand -hex 32` on any machine. Set in Vercel environment variables.

---

## Revenue Mechanism Readiness

Wave 2 adds four new commission streams to Wave 1 (insurance + energy already live).

| Stream | Commission rate | Gate | Status |
|--------|----------------|------|--------|
| Work order tenders | 3% of job cost | Job completion → `Commission` record | 🟡 Schema live — gate: PRO-566/567/571 |
| Rent review uplift | 8% of annual uplift | Renewal engagement → `Commission` record | 🟡 Schema live — gate: PRO-574 |
| Scout acquisition advisory | Fixed fee per completed acquisition | LOI → Exchange → Commission | 🟡 Schema live — gate: PRO-568/569 |
| Planning advisory (Wave 3 stub) | CTA only — fixed fee advisory in Wave 3 | "Assess PD rights →" CTA in Wave 2 | 🟡 CTA built, not earnable yet |

---

### 9. Dashboard UI Sprint — PRO-613 (FE-only, start now)

**No P0 dependency.** All data computable from existing `portfolio.assets` + action queue fetch.

**What it delivers (4 parts):**
- Per-asset properties grid with opportunity badges (replaces satellite thumbnail strip)
- Occupancy breakdown donut (Occupied / Notice / In Negotiation / Vacant by sqft)
- Portfolio Value Score: circular gauge 0–100 with Income, Cost, Growth sub-scores
- Expanded KPI strip: 8 tiles (adds Total Sqft, Avg NOI Yield, Costs Saved YTD, Unactioned Opportunity to Wave 1's 5 tiles)

**Spec:** `docs/wave-2-dashboard-properties-grid-handoff.md` Parts 1–4

**Go criteria:**
- [ ] Properties grid (3 across) renders with real per-asset data — no thumbnail strip
- [ ] Opportunity badges use spec colours and only show above minimum thresholds
- [ ] Occupancy donut shows 4 segments from tenant materialisation data (or placeholder if no tenants)
- [ ] Portfolio Value Score circular gauge renders with real computed score — no hardcoded "73"
- [ ] All 3 sub-score bars (Income, Cost, Growth) show real computed values
- [ ] KPI strip shows all 8 tiles; Tile 7 shows £0 with subtext for new users; Tile 8 reuses action queue fetch (no duplicate API call)
- [ ] All components mobile-responsive

---

### 10. Insurance Risk Scorecard + Premium Reduction Roadmap (PRO-610)

**Routes to build:** `GET /api/user/insurance-risk/:assetId`, `PATCH /api/user/insurance-risk/:assetId/action/:actionId`

**What it does:** Per-factor insurance risk scorecard (EPC, flood zone, security, construction, reinstatement) + prioritised premium reduction roadmap with cost/saving/payback. Actions route to Work Orders for physical remediation (alarm, CCTV, EPC improvement).

**Spec:** `docs/wave-2-insurance-premium-reduction-handoff.md`

**Env vars needed:** None — uses existing property data + Claude API (already in prod)

**Schema:** Add `insuranceRiskScore`, `insuranceRiskFactors`, `insuranceRoadmap`, `insuranceRiskAssessedAt` to `UserAsset` (include in same migration as PRO-563)

**Go criteria:**
- [ ] `GET /api/user/insurance-risk/:assetId` returns risk factors for any real asset
- [ ] EPC D asset → EPC factor shows amber status with correct estimated saving %
- [ ] Risk Scorecard section renders on `/insurance` page
- [ ] Premium Reduction Roadmap shows 5+ actions ranked by ROI
- [ ] "Get quotes via RealHQ" routes to Work Orders with pre-filled security/energy category
- [ ] Roadmap status updates to `in_progress` when a Work Order is raised for that action

---

## Soft Launch vs Full Wave 2 Launch

### Start immediately — no P0 needed

- **PRO-613 (FE Sprint):** Properties grid + Occupancy donut + Portfolio Value Score + 8-tile KPI strip. FE-only. Start now. No migration, no env vars.

### Soft launch now (do immediately after P0)

1. Run Prisma migration + seeds (P0)
2. AVM working (feature #1) — portfolio value now live on dashboard
3. Tenant directory with health scores (feature #2)
4. Work order scope generation (feature #3 partial)
5. Planning live feed (feature #4 — cron + CRON_SECRET needed)

These 4 features require zero new board API access. Only need CRON_SECRET and TENDER_SECRET (5-minute generation).

### Full Wave 2 launch gate (all 8 features live)

1. All Phase 0 steps complete
2. COMPANIES_HOUSE_API_KEY set (covenant check)
3. CRON_SECRET + TENDER_SECRET set
4. All PRO-563 through PRO-577 sprint tickets tested and passed

### What to tell prospects during Wave 2

Wave 1 message: "Here is your portfolio intelligence — here is what you're overpaying"
Wave 2 message: "RealHQ is now executing on the intelligence — work orders tendered, leases auto-reviewed, planning applications monitored, assets valued automatically"

---

*Last updated: 2026-03-23 | Head of Product | For CEO Wave 2 go/no-go decision*
