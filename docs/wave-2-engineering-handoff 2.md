# RealHQ Wave 2 — Engineering Handoff Brief

**Date:** 2026-03-21
**Author:** Head of Product
**For:** Engineering team
**Status:** Ready to build

---

## Overview

Wave 1 is complete. Wave 2 starts now. This document tells engineering:
1. What to build, in what order
2. Which APIs are available today (no board action needed)
3. Which features to stub/defer until board procures access
4. Where the full spec lives for each feature
5. Definition of done — what "complete" means for each feature

---

## Build order (strict priority)

| Priority | Feature | Wave | Spec | Board action needed? |
|----------|---------|------|------|---------------------|
| 1 | Energy screen + tariff comparison | Wave 2 | [PRO-38](/PRO/issues/PRO-38), [docs/wave-2-spec.md] | Octopus sandbox: No. EDF/BG/EON: Maybe. |
| 2 | Solar opportunity card | Wave 2 | [docs/wave-2-spec.md] | Google Solar API key: **Yes — confirm** |
| 3 | HVAC anomaly detection | Wave 2 | [docs/wave-2-spec.md] | Octopus smart meter: start with bill-level. DCC: **Yes — board** |
| 4 | Tenant portal (basic) | Wave 2 | [PRO-43](/PRO/issues/PRO-43) | GoCardless sandbox: No. DocuSign sandbox: No. |
| 5 | Acquisitions Scout deal feed | Wave 2/5 | [PRO-44](/PRO/issues/PRO-44) | CREXI: No. CoStar: **Yes — board** |
| 6 | Hold vs Sell scenario modelling | Wave 5 | [PRO-41](/PRO/issues/PRO-41) | ATTOM/CoStar AVM: **Yes — board** |
| 7 | Marketing Brochure Generator | Wave 5 | [PRO-44](/PRO/issues/PRO-44) | Claude API: existing. Google Maps: existing. |
| 8 | Transaction Room | Wave 5 | [PRO-44](/PRO/issues/PRO-44) | DocuSign sandbox: No. |
| 9 | Valuations / AVM | Wave 5 | [PRO-41](/PRO/issues/PRO-41) | ATTOM/CoStar: **Yes — board** |

---

## Feature 1: Energy screen — build now

**Spec:** `docs/wave-2-spec.md` (full DB schema + ACs) + [PRO-38](/PRO/issues/PRO-38) (screen layout)

### What to build immediately (no blockers)

**Tariff comparison (Octopus sandbox available):**
- Build the tariff extraction pipeline: utility bill PDF → Textract → unit rate, standing charge, tariff type, MPAN
- Call Octopus Energy API for live tariff comparison (sandbox: `https://api.octopus.energy/v1/`)
- Display comparison card: current vs best, annual saving in £
- "Switch" CTA → stub with success confirmation (real switch API available once commercial agreement confirmed for EDF/BG/EON)

**Tariff mismatch detection:**
- If half-hourly profile available: detect flat profile on multi-rate tariff
- Display secondary saving card if mismatch found

**Solar opportunity card (stub until Google Solar API key confirmed):**
- Build the card component with correct data structure
- Call Google Solar API on address load — if key available in env, show live result
- If no key: show pending state with "Solar assessment coming soon"

**Energy screen layout (all 5 sections):**
- Utility switching section (top)
- Anomaly feed (ranked by annual saving — empty if no anomalies yet)
- Consumption heatmap (half-hourly — empty state: "Connect smart meter or upload bill")
- Upgrade opportunities (LED, HVAC, Solar, Insulation cards)
- Per-property energy cards (kWh/sqft vs benchmark — can show from bill data)

### What to stub until board acts

| Item | Stub state | Blocker |
|------|-----------|---------|
| EDF/British Gas/E.ON tariff comparison | Show Octopus-only comparison with "More suppliers coming soon" | Board to confirm commercial API access |
| Smart meter half-hourly reads | Show bill-level annual figures only | DCC/n3rgy authorisation |
| BMS HVAC scheduling | Show recommendation card with "BMS connection required" CTA | Per-installation |
| HVAC anomaly detection | Run anomaly logic on bill-level data only (year-on-year spike, tariff type mismatch) | Smart meter data (above) |

### Acceptance criteria (must pass before feature ships)

From `docs/wave-2-spec.md`:
- [ ] Upload a utility bill → tariff extracted → Octopus API called → comparison card within 30 seconds. No illustrative rates.
- [ ] Solar: if API key in env, card shows live data. If not, shows pending state — not an error, not blank.
- [ ] Anomaly feed: at least bill-level anomaly types work (tariff mismatch, year-on-year spike). Smart meter anomalies appear when data is available.
- [ ] "Switch" on tariff comparison: confirmation modal shows new rate, effective date. Switch executes on confirm (Octopus). Confirmation notification in inbox.
- [ ] Consumption heatmap: shows half-hourly data when smart meter connected. Shows empty state with connection prompt when not.

### New routes

```
/energy                    — portfolio-level energy screen
/energy/[propertyId]       — per-property energy detail
```

---

## Feature 2: Tenant portal — build now

**Spec:** [PRO-43](/PRO/issues/PRO-43) (plan document)

### What to build immediately (no blockers)

GoCardless sandbox and DocuSign sandbox are both available without commercial agreements.

**Tenant portal routes (separate from owner dashboard):**
```
/portal                    — tenant login landing
/portal/rent               — rent payment (GoCardless/Stripe widget)
/portal/maintenance        — raise maintenance request
/portal/documents          — view/download lease, statements, records
/portal/correspondence     — correspondence log
/portal/sign/[docId]       — DocuSign signing flow
```

**Owner-side:**
- "Invite tenant" CTA on tenant record (sends GoCardless invite email via SendGrid)
- Tenant portal status indicator on tenant list: "Portal active / Not invited / Pending"

**Rent payment flow:**
- GoCardless mandate creation → tenant sets up direct debit
- Payment scheduled → confirmed → ledger entry created automatically
- If payment fails → alert to owner queue

**Maintenance request flow:**
- Tenant submits form → work order created in RealHQ `/work-orders`
- Work order assigned per normal workflow
- Automated status emails to tenant (SendGrid) at each milestone

**Document signing:**
- Owner generates document (licence, lease renewal) → DocuSign envelope created
- Tenant receives signing link → signs → completion event logged
- Signed PDF stored in property document vault

### Acceptance criteria (must pass before feature ships)

From [PRO-43](/PRO/issues/PRO-43#document-plan):
- [ ] GoCardless mandate created for a test tenant. Payment collected. Payment appears in RealHQ rent ledger automatically.
- [ ] DocuSign envelope sent for a licence to underlet. Pre-populated. Signing link sent to tenant email. Completion tracked.
- [ ] Tenant maintenance request creates a work order in `/work-orders`. Tenant receives automated status updates via SendGrid at each milestone change.
- [ ] "Invite tenant" sends portal invite email. Tenant can log in and access their documents, rent account, and correspondence.

---

## Feature 3: Acquisitions Scout — partial build

**Spec:** [PRO-44](/PRO/issues/PRO-44) (plan document)

### What to build immediately

**CREXI (US) — available now:**
- Pull live listings from CREXI API
- Run automated underwriting model on each: cap rate, NOI estimate, IRR (3yr/5yr)
- Mandate scoring: match against owner's criteria (property type, geography, price, yield, WAULT)
- Surface top 3–5 to deal inbox daily

**Document upload underwriting (no API dependency):**
- Upload brochure/IM PDF → Textract extracts key figures
- Same underwriting model → full output within 60 seconds
- Stage in pipeline

**Pipeline management UI:**
```
/acquisitions              — deal inbox + pipeline
/acquisitions/[dealId]     — deal detail + underwriting summary + LOI
```

**Underwriting model:**
- Cap rate at asking price
- Suggested offer price (based on comparable cap rates from RealHQ database)
- NOI estimate (gross rent × occupancy estimate × gross-to-net ratio)
- Debt service (65% LTV, current market rate)
- DSCR
- Projected IRR (3yr, 5yr)
- Risk flags: short WAULT, single tenant, EPC risk, flood risk

### What to stub until board acts

| Item | Stub state | Blocker |
|------|-----------|---------|
| CoStar / LoopNet deal feed | "CoStar integration coming — deals arriving via CREXI meanwhile" | Board: CoStar licence |
| CoStar AVM for comparable cap rates | Use RealHQ's own yield database (from uploaded transactions) | Board: CoStar licence |
| ATTOM AVM (US) | AVM stub — show "AVM pending" | Board: ATTOM subscription |

### Acceptance criteria

From [PRO-44](/PRO/issues/PRO-44#document-plan):
- [ ] CREXI listing appears → automated underwriting within 24h → deal card in inbox with: cap rate, suggested offer, NOI, IRR, risk flags.
- [ ] Upload a brochure PDF → full underwriting output within 60 seconds. Fields not found in document shown as "not found" — not illustrative.
- [ ] Deals outside mandate configuration do not appear in inbox regardless of score.

---

## Feature 4: Marketing Brochure Generator — build now

**Spec:** [PRO-44](/PRO/issues/PRO-44) (plan document, Wave 5 linked features section)

No API dependencies beyond what's already live (Claude API, Google Maps Platform).

**What it does:**
- Input: property selected, asking rent (owner enters), optional agent notes
- Output: branded PDF in <60 seconds

**PDF components:**
- Satellite image (Google Maps Static API — already in Wave 1)
- Property address + key metrics (from property data)
- Financial summary: passing rent, ERV, cap rate at asking price, NOI yield
- Investment narrative (Claude API — 2-page summary: location, asset quality, income security, value-add opportunity, market context)
- Comparable evidence (from RealHQ rent database — any transactions already on platform)
- RealHQ branding

**Entry point:** "Generate brochure" in property "..." menu.

**Route:** Result is a downloadable PDF — no new route needed. Trigger from property menu, return download link.

**Acceptance criteria:**
- [ ] Brochure generated within 60 seconds of trigger.
- [ ] PDF includes: satellite image, financial summary with live figures (not illustrative), Investment narrative, RealHQ branding.
- [ ] Comparable evidence section shows only real transactions from the platform — if none available, shows "No comparables yet — RealHQ is building this database."

---

## API readiness matrix

### Available now — start building

| API | Feature | Endpoint / notes |
|-----|---------|-----------------|
| Octopus Energy API | Energy switching | `https://api.octopus.energy/v1/` — public sandbox |
| Google Maps Solar API | Solar card | Need to confirm key — if available, use. If not, stub. |
| Met Office API | Energy weather normalisation | Free with registration |
| Elexon BMRS API | HH settlement benchmarking | Free |
| GoCardless API | Tenant rent payment | Sandbox available — no commercial agreement |
| Stripe API | Tenant rent card fallback | Sandbox available |
| DocuSign API | Tenant document signing | Sandbox available |
| SendGrid | Tenant notification emails | Already in Wave 1 |
| CREXI API | US deal feed | Available — check rate limits |
| Companies House API | Tenant covenant monitoring | Free, registration only |
| EPC Register API | Energy / UK data layer | Free with registration |
| planning.data.gov.uk | UK planning constraints | Free, no auth |
| Environment Agency WFS | UK flood risk | Free, no auth |
| OS Places API | UK UPRN resolution | Free tier: 5k calls/day |
| Historic England API | Listed building status | Free |
| Google Maps Platform | All mapping features | Already in Wave 1 |
| Claude API | Brochure narrative, portfolio analysis | Already in Wave 1 |
| AWS Textract | Document extraction | Already in Wave 1 |

### Waiting on board — stub these

| API | Feature | Board action required |
|-----|---------|----------------------|
| EDF Energy API | Energy switching | Confirm commercial access |
| British Gas API | Energy switching | Confirm commercial access |
| E.ON Next API | Energy switching | Confirm commercial access |
| DCC / n3rgy | Smart meter reads | DCC authorisation |
| Google Solar API key | Solar card | Confirm key / sandbox |
| CoStar AVM (UK) | Valuations, acquisitions | Enterprise licence (~£15–40k/yr) |
| ATTOM AVM API (US) | Valuations | Subscription |
| CoStar / LoopNet (UK+US) | Deal feed | Enterprise licence — shared with AVM |
| Creditsafe | Tenant covenant | Subscription |
| BCIS cost database | Work orders pricing | Commercial licence |
| OS MasterMap | Building footprints, planning | OS Partner licence |

---

## Environment variables needed in Railway (Wave 2)

In addition to Wave 1 env vars:

| Variable | Feature | Urgency |
|----------|---------|---------|
| `OCTOPUS_API_KEY` | Energy switching | High — start with this |
| `GOOGLE_SOLAR_API_KEY` | Solar card | High |
| `GOCARDLESS_ACCESS_TOKEN` | Tenant rent payment | High |
| `GOCARDLESS_SECRET` | Tenant webhooks | High |
| `STRIPE_SECRET_KEY` | Tenant card payment | Medium |
| `DOCUSIGN_INTEGRATION_KEY` | Document signing | Medium |
| `DOCUSIGN_USER_ID` | Document signing | Medium |
| `DOCUSIGN_PRIVATE_KEY` | Document signing | Medium |
| `EDF_API_KEY` | Energy switching (EDF) | Low — await commercial agreement |
| `BRITISH_GAS_API_KEY` | Energy switching | Low — await |
| `EON_API_KEY` | Energy switching | Low — await |
| `DCC_API_KEY` | Smart meter reads | Low — await DCC authorisation |
| `COSTAR_API_KEY` | Deal feed + AVM | Low — await licence |
| `ATTOM_API_KEY` | US AVM | Low — await |

---

## Database migrations needed for Wave 2

See `docs/wave-2-spec.md` for full schema. Tables to create:

**Energy:**
```sql
energy_reads            -- half-hourly consumption data
energy_anomalies        -- detected anomalies
bms_connections         -- BMS connection config
tariff_comparisons      -- tariff comparison results
tariff_switch_log       -- switch execution audit log
solar_assessments       -- Google Solar API results (one per property)
solar_quote_requests    -- installer quote requests
```

**Tenant portal:**
```sql
tenant_portal_invites   -- invite tokens and status
tenant_payments         -- GoCardless/Stripe payment records
tenant_maintenance_requests -- linked to work_orders
```

**Acquisitions:**
```sql
acquisition_mandate     -- owner's search criteria
deal_pipeline           -- deals in pipeline with stage
deal_underwriting       -- underwriting outputs per deal
loi_drafts              -- LOI generation and signing
```

---

## Definition of done (applies to all Wave 2 features)

A feature is done when:
1. It shows **real data** from the correct named API or source — not illustrative, not hardcoded
2. The action it enables **actually executes end-to-end** — not a form submission to a human intermediary
3. The output **matches the screen layout in the spec exactly**
4. It has been **tested on a real document from a real client** — not demo data
5. All **acceptance criteria in the spec document are checkboxed green** — not estimated

Features with pending API access (board blockers) ship with a **clean pending state** — not an error, not blank, not "coming soon" in a way that looks broken. A pending state must:
- Show the expected value or benefit (e.g. "Solar assessment — £8,200/yr potential saving")
- Clearly explain what is missing ("Awaiting Google Solar API connection")
- Have a visible CTA if the user can do something (e.g. "Connect smart meter")

---

## Open board actions blocking Wave 2

**Critical — blocks demo-ready product:**
1. **PRO-385:** Trigger Railway redeploy — production is serving stale build (200+ commits behind)
2. **PRO-254:** Purchase realhq.com domain — blocks brand launch

**Critical — blocks Wave 2 live features:**
3. **PRO-322:** Apply for CoverForce API access — insurance is the highest-commission Wave 1 feature
4. **PRO-238:** Add Google Maps API key + EPC API key to Railway env vars

**High — needed for full energy screen:**
5. **Google Solar API key** — not yet in Railway env. Needed for solar card.
6. **DCC/n3rgy authorisation** — needed for smart meter reads. Start with Octopus bill-level only.
7. **EDF/British Gas/E.ON commercial API access** — energy switching currently Octopus-only without these.

**Medium — needed for Acquisitions + Valuations (Wave 5):**
8. **CoStar API licence** — highest impact but highest cost. Needed for deal feed and AVM.
9. **ATTOM AVM API** — US property valuations.
