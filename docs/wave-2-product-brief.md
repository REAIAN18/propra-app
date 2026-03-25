# RealHQ Wave 2 Product Brief

**Status:** Draft
**Date:** 2026-03-21
**Author:** Head of Product
**Sources:** RealHQ-Spec-v3.2, Addendum v3.1, BuildOrder v1.0

---

## Purpose

This brief defines what changes between Wave 1 and Wave 2. It is the single reference for engineering on what to build next, what new screens to create, what new APIs to integrate, and what the user experience looks like when they return after Wave 1.

---

## Wave 1 recap (what is live)

| Feature | Status | Key capability |
|---------|--------|---------------|
| Dashboard | Live | Opportunity cards, KPIs, lease expiry tracker, deal scout cards (inline) |
| Property onboarding | Live | Address → 12+ APIs fire automatically (satellite, EPC, planning, flood, insurance) |
| Rent Clock | Live | Lease expiry countdowns, break dates, leverage scores |
| Insurance placement | Live | CoverForce integration — commercial insurance quotes and bind |
| Ask RealHQ | Live | Natural language queries against property data |
| Document ingestion | Live | Textract + Claude pipeline — lease, insurance, utility bills |
| First-use flow | Live | Guided onboarding — property add, document uploads, first analysis |

---

## Wave 2 scope

Wave 2 ships **9 new feature areas**, all code-complete as of 2026-03-23. The single gate is the Prisma schema migration (PRO-563 — CTO action).

| Feature area | Commission mechanic | PRO ref |
|---|---|---|
| Energy Intelligence (full energy screen) | 10% of year-1 tariff saving; 10% of solar income | PRO-376 |
| Work Orders Wave 2 (AI scope, contractor panel, completion) | 3% of contract value | PRO-566/567/571 |
| Acquisitions Scout (underwriting, LOI, pipeline) | 0.5–1% of deal value | PRO-568/569 |
| Tenant Intelligence (health scores, lazy materialisation) | Enables rent review commission | PRO-572 |
| Rent Review Automation (cron + Claude letters + DocuSign) | 8% of annual uplift | PRO-574 |
| AVM / Portfolio Valuation (7-day cache) | Enables Hold vs Sell | PRO-570 |
| Hold vs Sell Wave 2 (10-year DCF, full model) | 0.25% on completed transactions | PRO-575 |
| Planning Intelligence (nearby applications + dev potential) | Enables planning advisory (Wave 3) | PRO-576/603/604 |
| Insurance Risk Scorecard + Premium Reduction Roadmap | Surfaces roadmap actions via work orders (3%) | PRO-610 |
| Action Queue (aggregates all 9 sources) | UX layer — not a revenue stream itself | PRO-577 |
| Dashboard Properties Grid (per-asset opportunity badges) | UX layer | PRO-613 |

**NOT in Wave 2:** Tenant Portal (Wave 3 — T3-3), Transaction Room (Wave 3 — T3-1), Marketing Brochure Generator (Wave 3 — PRO-451), CoverForce live re-quotes (Wave 3 — T3 pending). See `docs/wave-3-triage.md`.

---

## New screens in Wave 2

All screen code is written. Prisma migration (PRO-563) must run before any Wave 2 screens show live data.

### 1. Energy screen (`/energy`) — enhanced

**Replaces:** Wave 1 stub with no live data.

**New in Wave 2:**
- Full tariff comparison + Switch CTA (UK SME-metered only — HH-metered and FL assets: see `docs/wave-2-energy-engineering-handoff.md` rendering rules)
- Anomaly feed: HVAC waste, overnight spikes, weekend waste — each with annual saving and action CTA
- Solar opportunity card (Google Solar API — requires `GOOGLE_SOLAR_API_KEY`)
- Upgrade cards: LED, HVAC replacement, insulation — cost, saving, payback, EPC improvement

**Spec:** `docs/wave-2-energy-engineering-handoff.md`

---

### 2. Tenants screen (`/tenants`) — upgraded

**Replaces:** Wave 1 static tenant list.

**New in Wave 2:**
- Per-tenant health score (covenant grade, payment history, sector risk, expiry urgency)
- Rent review CTA: Claude-generated letter + DocuSign Heads of Terms
- Lease materialisation: automatically extracts tenant/lease data from uploaded documents (no manual entry)
- Tenant engagement cron: daily scan for leases within renewal trigger windows

**Spec:** `docs/wave-2-tenant-intelligence-engineering-handoff.md`, `docs/wave-2-rent-review-automation.md`

---

### 3. Planning screen (`/planning`) — new

**Entirely new screen.**

**Sections:**
- Nearby planning applications: all applications within 1km, classified by AI (positive/neutral/negative impact)
- Development potential: per-asset PDR rights, change of use potential, air rights — each with Claude narrative
- Alerts: daily cron detects new applications, sends email for high-impact ones

**Spec:** `docs/wave-2-planning-intelligence-engineering-handoff.md`, `docs/wave-2-planning-dev-potential-handoff.md`

---

### 4. Insurance screen (`/insurance`) — enhanced

**New in Wave 2 (adds to Wave 1 overpay panel):**
- Section 4: Insurance Risk Scorecard — composite risk score (0–100), breakdown by factor (EPC, flood zone, construction type, security, reinstatement value)
- Section 5: Premium Reduction Roadmap — ordered actions by ROI (annualSaving/costLow), each with CTA routing to work order or decision panel

**Spec:** `docs/wave-2-insurance-premium-reduction-handoff.md`

---

### 5. Acquisitions Scout screen (`/scout`) — new

**Replaces:** 2 inline dashboard deal cards → full pipeline view.

**Sections:**
- Deal inbox: deals ranked by mandate score with underwriting summary
- Pipeline kanban: Review → Underwritten → Offer Made → Closed Won / Closed Lost
- Underwriting tool: cap rate, DSCR, 5-yr IRR from uploaded brochure
- LOI generator: AI Letter of Intent (Claude Sonnet, raw fetch)
- Document upload: brochure/IM → underwriting in <60s

**Spec:** `docs/wave-2-scout-engineering-handoff.md`

---

### 6. Work Orders screen (`/work-orders`) — enhanced

**New in Wave 2:**
- "Generate scope →" button: AI scope of works via Claude Sonnet
- Contractor tendering: tender invitations sent to panel by email (token URL)
- Public quote response: `/tender/respond/:token` — no login required for contractors
- Start job flow: awarded → in progress + started milestone
- Complete job modal: final cost, rating, 3% commission preview, commission ledger entry

**Spec:** `docs/wave-2-work-orders-engineering-handoff.md`

---

### 7. Hold vs Sell screen (`/hold-sell`) — upgraded

**New in Wave 2:**
- Full 10-year DCF model replacing Wave 1 approximation
- 4 scenario cards: Hold / Sell now / Sell after value-add / Refinance
- IRR, NPV, net proceeds per scenario
- RealHQ recommendation with live data rationale

**Spec:** `docs/wave-2-hold-vs-sell-engineering-handoff.md`

---

### 8. Action Queue drawer (global) — new

**New global component:**
- Accessible from TopBar badge (blue = open actions; red = urgent)
- Drawer slides in from right on any page
- Items from: insurance, energy, compliance, leases, planning, work orders, financing, insurance risk roadmap
- Items ranked by urgency × annual value
- Each item has a one-tap "Act now" → deep link to relevant action

**Spec:** `docs/wave-2-action-queue-spec.md`

---

### 9. Dashboard UI sprint — 4 new components within dashboard (PRO-613)

All FE-only, no new API routes, no schema changes required.

**9a. Properties grid (Part 1):**
- 3-across grid of per-asset cards replacing satellite thumbnail strip
- Each card: thumbnail, name, location, up to 3 opportunity badges (COST SAVING / INCOME UPLIFT / URGENT / VALUE ADD)
- Badge data computed from existing portfolio.assets — no new API call
- "View asset →" links to `/assets/:id`

**9b. Occupancy breakdown donut (Part 2):**
- Donut chart: 4 segments (Occupied / Notice given / In negotiation / Vacant) in sqft
- Computed client-side from tenant materialisation data already fetched

**9c. Portfolio Value Score (Part 3):**
- Circular gauge (0–100) with Income, Cost, Growth sub-score bars
- Client-side computation from portfolio + action queue data

**9d. Expanded KPI strip — 8 tiles (Part 4):**
- Wave 1 had 5 KPI tiles. Wave 2 adds: Total Sq Footage, Avg NOI Yield, Costs Saved YTD, Unactioned Opportunity
- All 8 tiles computed from existing data fetches

**Spec:** `docs/wave-2-dashboard-properties-grid-handoff.md` (Parts 1–4) | Tests: AT-613-1 through AT-613-12

---

## Dashboard changes in Wave 2

| Component | Wave 1 | Wave 2 |
|-----------|--------|--------|
| Energy card | Stub (no live data) | Live — top anomaly/tariff saving, Switch CTA |
| Deal Scout | 2 dashboard cards (limited data) | Full pipeline screen (`/scout`) with AI underwriting |
| Tenant records | Static list | Health scores + rent review CTA |
| Planning | Not present | New screen with nearby applications + dev potential |
| Action Queue badge | Not present | TopBar badge → slide-in drawer with ranked actions |
| Properties grid | Satellite thumbnail strip | Per-asset cards with opportunity badges (PRO-613 Part 1) |
| Occupancy donut | Not present | 4-segment sqft donut (PRO-613 Part 2) |
| Portfolio Value Score | Not present | Circular 0–100 gauge + Income/Cost/Growth sub-scores (PRO-613 Part 3) |
| KPI strip | 5 tiles | 8 tiles — adds Total Sqft, NOI Yield, Costs Saved, Unactioned (PRO-613 Part 4) |
| Insurance | Overpay panel only | + Risk Scorecard + Premium Reduction Roadmap |
| Commission tracker | Not visible | "RealHQ earned: £X" summary on dashboard |

---

## New APIs in Wave 2

Only free/low-cost APIs are required for Wave 2 launch. No commercial licences are gating launch.

| API | Feature | Market | Cost | Status |
|-----|---------|--------|------|--------|
| planning.data.gov.uk | Planning applications + constraints | UK | Free | ✅ No key needed |
| postcodes.io | Geocoding for planning lookups | UK | Free | ✅ No key needed |
| Land Registry Price Paid | AVM comparable transactions | UK | Free | ✅ No key needed |
| Companies House API | Tenant covenant check | UK | Free | Need key — `COMPANIES_HOUSE_API_KEY` |
| Anthropic API (Claude) | Scope/LOI/letter/planning classification | Global | Pay-per-use | `ANTHROPIC_API_KEY` |
| Resend | Cron alert emails, tender invites | Global | Pay-per-use | `RESEND_API_KEY` |
| Google Solar API | Solar opportunity card | Global | Pay-per-use | `GOOGLE_SOLAR_API_KEY` — optional |
| DocuSign | Rent review HoT signing | Global | Commercial | Optional at launch |

**NOT required at Wave 2 launch:** CoStar, ATTOM, LoopNet, CREXI, DCC/n3rgy, GoCardless, Stripe, energy supplier APIs (energy switching uses rate benchmarks, not live API switches for initial launch).

---

## What does NOT change in Wave 2

- Property onboarding flow — unchanged
- Rent Clock page — unchanged (Wave 1, already live)
- Insurance overpay panel — unchanged (Wave 1); Wave 2 adds new sections below it
- Ask RealHQ — unchanged
- Document ingestion pipeline — unchanged; re-used by tenant intelligence (lease extraction) and energy (utility bill OCR)
- Auth / sign-up — unchanged

---

## Revenue unlocked in Wave 2

| Feature | Commission rate | When it fires |
|---------|----------------|--------------|
| Energy tariff switch | 10% year-1 saving | Switch confirmed via supplier |
| Solar referral | 10% year-1 income | Installer appointed via RealHQ |
| Work order completion | 3% of contract value | Owner approves completed works |
| Rent review uplift | 8% of annual uplift | New rent confirmed (`PATCH /rent-reviews/:id/complete`) |
| Scout deal (acquisition) | 0.5–1% of deal value | Deal completed via RealHQ |
| Transaction management | 0.25% of deal value | Sale/purchase managed to completion |

All commissions recorded in `Commission` table at execution. Visible to owner as "RealHQ has earned £X for your portfolio."

---

## Engineering sequencing recommendation

All Wave 2 code is written. Engineering work is launch preparation, not feature building.

1. **CTO: Run Wave 2 Prisma migration** (PRO-563) — this unblocks everything. Zero Wave 2 features work without this.
2. **CTO: Seed contractor panel** (15 contractors) — unblocks Work Orders
3. **CTO: Run planning history migration** — one-time, migrates JSON blobs to PlanningApplication records
4. **Board: Set env vars** — `COMPANIES_HOUSE_API_KEY`, `CRON_SECRET`, `TENDER_SECRET` (all free/fast to obtain)
5. **Board: Configure cron jobs** — 2 daily crons on Vercel Cron (planning monitor + tenant engagement)
6. **FE: Build dashboard UI sprint** (PRO-613) — 4 parts (properties grid + occupancy donut + value score + expanded KPI strip), FE-only, no schema dependency, can start immediately
7. **CTO: Build insurance risk scorecard** (PRO-610) — new lib + API routes, needs schema fields from migration

Full go/no-go checklist: `docs/wave-2-launch-readiness.md`

---

## Board action items (Wave 2 blockers)

| Item | Urgency | Impact if delayed |
|------|---------|------------------|
| PRO-563: Prisma migration | Critical | Everything blocked |
| `COMPANIES_HOUSE_API_KEY` | High | UK tenant covenant check — free, 5-min signup |
| `CRON_SECRET` | High | Planning + tenant crons won't authenticate |
| `TENDER_SECRET` | High | Contractor quote token URLs won't work |
| `GOOGLE_SOLAR_API_KEY` | Medium | Solar cards show no data (feature degrades gracefully) |
| `GOCARDLESS_ACCESS_TOKEN` | Low | Wave 2 optional — skip for launch |
| DCC/n3rgy smart meter authorisation | Low | Wave 2 uses bill-level anomalies; HH data is a Wave 3 upgrade |
| CoStar/ATTOM API licences | Low | Wave 2 AVM uses Land Registry (free); CoStar is Wave 5 |
