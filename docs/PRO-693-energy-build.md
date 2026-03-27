# PRO-693: Energy Optimisation — Full Build

**Issue:** PRO-693
**Date:** 2026-03-27
**Author:** Head of Product
**Status:** Ready to build
**Design file:** `docs/designs/energy-design.html` (1,585 lines — main page + 8 spin-off flows)
**Prerequisite:** AppShell restyle complete (dark theme must be live)
**Estimate:** Large — main page + 8 flows + extraction pipeline + market logic

**Ownership (per CLAUDE.md File Ownership):**
- **Full-Stack Agent (Frontend):** `src/app/energy/page.tsx`, all components in `src/components/`, CSS
- **Founding Agent (Backend):** `src/app/api/*` routes, `src/lib/*` extensions, `prisma/schema.prisma` changes
- **Both:** Read DECISIONS.md and CODE_INVENTORY.md before starting. DECISIONS.md is highest authority.

**Workflow (per CLAUDE.md):**
1. Feature branch from main (`feature/pro-693-energy`)
2. `npx tsc --noEmit && npm run lint` before pushing
3. Push branch. Infra merges after QA.
4. Never push directly to main.

---

> **MANDATORY PRE-READ:** Before writing any code, read these files in order:
> 1. `DECISIONS.md` — highest authority, overrides everything
> 2. `CODE_INVENTORY.md` — maps every existing file, component, hook, model
> 3. `CLAUDE.md` — engineering rules and workflow
> 4. `docs/designs/energy-design.html` — the full design spec for this ticket

---

## What this ticket covers

This is NOT a new module. Per DECISIONS.md: **"Build 5 systems, not 16 pages."** This ticket extends the existing 5 systems to handle energy data:

1. **Property Profile** — energy data (cost, consumption, demand, tariff) becomes part of each property's profile
2. **Document Generator** — bill extraction pipeline creates EnergyRead records, same as lease extraction creates Tenant/Lease records
3. **Portal System** — energy data (consumption, tariff analysis, solar assessment) becomes shareable via portal links
4. **Action Engine** — Octopus Energy integration (already in energy-quotes.ts) handles tariff/supplier quotes and switching
5. **Learning Loop** — anomaly dismiss reasons and tariff preferences feed back into recommendations

The `/energy` page is a **view into the Property Profile's energy data** with actions powered by the Action Engine. Same structural pattern as Insurance (PRO-691) — portfolio toggle, KPIs, per-property cards, action flows.

Per DECISIONS.md: **RESTYLE. REWIRE. EXTEND. Never rebuild what already works.**

---

## Existing code — DO NOT REBUILD

Read every file below before writing a single line. Import and extend.

### Lib files (already working)
| File | Lines | What it does | Use it for |
|------|-------|-------------|------------|
| `energy-quotes.ts` | 289 | Octopus Energy API integration, tariff comparison, quote creation | Tariff/supplier comparison, quote fetching, deregulated market switching |
| `textract.ts` | 48 | AWS Textract OCR for PDFs | Bill upload extraction (step 1) |
| `document-parser.ts` | 101 | Claude-powered field extraction from OCR text | Bill upload extraction (step 2 — extracts tariff, consumption, demand, cost fields) |
| `email.ts` | 2,227 | 30 email functions including `sendEnergySwitchedEmail()`, `sendEnergyQuoteEmail()` | Confirmation emails on tariff switch, supplier switch, audit commission |
| `brochure.ts` + `brochure-template.ts` | 434 | PDF generation from data | Energy summary report generation |
| `opportunity.ts` | 278 | `identifyOpportunities()`, `scoreOpportunity()` | Solar opportunity scoring |

### API routes (already working)
| Route | Method | What it does | Wire to |
|-------|--------|-------------|---------|
| `/api/user/energy-summary` | GET | Returns portfolio energy overview, market_type per state, KPI data | Main page KPIs, market banner |
| `/api/energy/quotes` | GET | Fetches available tariff/supplier quotes | Tariff comparison table, supplier comparison |
| `/api/energy/quotes` | POST | Creates an EnergyQuote record | Flow 1 (tariff apply), Flow 7 (supplier switch) |
| `/api/quotes/bind` | POST | Confirms/binds a quote | Flow 1b (tariff success), Flow 7b (switch success) |
| `/api/user/documents` | GET/POST | Document CRUD | Bill upload, extracted bill list |
| `/api/user/leases/materialise` | POST | Creates records from extracted document data | Pattern for creating EnergyRead from extracted bill data |
| `/api/cron/energy-rates` | — | Daily rate refresh + anomaly detection | Creates EnergyAnomaly records |
| `/api/cron/octopus-rates` | — | Octopus tariff sync for deregulated markets | Keeps supplier rates current |

### Prisma models (already in schema)
| Model | Key fields | Use |
|-------|-----------|-----|
| `EnergyQuote` | provider, rate, status (quoted/accepted/active), assetId | Tariff and supplier quotes |
| `EnergyRead` | assetId, kwh, kw_demand, tariff, cost, billing_period | Monthly consumption data extracted from bills |
| `EnergyAnomaly` | assetId, anomalyType, status (open/investigating/dismissed), annualSaving | Consumption spikes flagged by cron |
| `SolarAssessment` | assetId, roofArea, systemSize, annualGeneration, annualSaving | Per-property solar assessment |
| `SolarQuoteRequest` | assetId, status, providers | PPA quote requests to solar installers |
| `Document`, `DocumentExtract` | type, file, extractedFields | Uploaded bills and extracted data |

### Existing components to reuse
| Component | Use for |
|-----------|---------|
| `LeaseUploadModal` | Pattern for bill upload modal — adapt, don't rebuild |
| `useUserDocuments` hook | Document list fetching |
| `useIncomeOpportunities` hook | Pattern for `useEnergyData` hook |
| `HoldSellRecommendation` | Pattern for energy recommendation cards |
| `NOIBridge` | Pattern for demand/consumption breakdown chart |

### Design patterns to match exactly
| Pattern | Reference file |
|---------|---------------|
| Nav, sidebar, KPI row, section headers, cards, row items | `dashboard-design.html` |
| Portfolio/property toggle, quote comparison, risk items | `insurance-design.html` |
| Bind confirmation, success state, adjust & re-quote, dismiss with reason, no-quotes-work | `insurance-flows-design.html` |
| File upload progress, extraction status, extracted field display | `document-progress-design.html` |

---

## Build order

### Phase 1: Data layer + hooks

1. **Verify Prisma models exist** — `EnergyRead`, `EnergyAnomaly`, `SolarAssessment`, `SolarQuoteRequest` should already be in schema. Check `prisma/schema.prisma` directly. If any are missing, add them using the field specs in the Schema Verification section below.

2. **Create `useEnergyData` hook** (`src/hooks/useEnergyData.ts`)
   - Fetches `/api/user/energy-summary` for portfolio-level data
   - Returns: `{ kpis, properties, anomalies, solarAssessments, marketType, isLoading }`
   - Follow `useIncomeOpportunities` pattern exactly

3. **Create `useEnergyQuotes` hook** (`src/hooks/useEnergyQuotes.ts`)
   - Fetches `/api/energy/quotes?assetId=X` for per-property tariff/supplier quotes
   - Returns: `{ quotes, currentTariff, bestQuote, isLoading }`
   - Handles both regulated (tariff schedules) and deregulated (competing suppliers)

4. **Extend `/api/user/energy-summary`** if needed to return:
   - `market_type` per property (regulated/deregulated) based on state
   - `bills_uploaded` count vs total properties
   - `identified_savings` total
   - `solar_potential` total
   - `anomalies` array (open anomalies)
   - `cost_per_sqft` portfolio and per-property
   - `benchmark_comparison` (portfolio cost vs state commercial avg)

5. **Create bill materialisation endpoint** — `/api/user/energy-reads/materialise` (POST)
   - Receives extracted bill data from document-parser.ts
   - Creates `EnergyRead` records (one per billing period per property)
   - Follow the exact pattern of `/api/user/leases/materialise`
   - Fields: assetId, consumption_kwh, demand_kw, tariff_schedule, total_cost, billing_period_start, billing_period_end, supplier, demand_charge, consumption_charge

### Phase 2: Main page (`/energy`)

6. **Create `/energy/page.tsx`**

   Build from the design file Part A. Structure:

   ```
   <AppShell>                                               ← RESTYLE (existing, 251 lines)
     <PageHero title="Energy Optimisation" ... />           ← RESTYLE (existing component)
     <ViewToggle options={[portfolio, ...properties]} />    ← Match insurance-design.html pattern
     <MarketBanner marketType={regulated|deregulated} />    ← NEW (no similar exists)
     <KPIRow kpis={5} />                                    ← Use MetricCard (existing) × 5, restyled
     <ActionAlert anomalies={openAnomalies} />              ← RESTYLE (existing component) → click opens Flow 8
     <DirectCallout insight={topInsight} />                 ← RESTYLE (existing component) → click opens Flow 1
     <PropertyEnergyList properties={...} />                ← NEW rows, or extend existing row pattern
     <FiveWaysToSave market={regulated|deregulated} />      ← NEW section
     <BarChart data={consumptionData} />                    ← RESTYLE (existing component)
     <NOIBridge demandData={...} />                         ← RESTYLE (existing component) for demand breakdown
     <SolarAssessmentCard assessments={solar} />            ← NEW → CTA opens Flow 2
     <TariffComparison assetId={selected} />                ← NEW → row actions open Flow 1 or 7
     <PolicyUploadWidget type="energy" />                   ← RESTYLE (existing component) → triggers Flow 6
     <PortalHint />                                         ← Match insurance-design.html portal hint
   </AppShell>
   ```

   **Key principle:** Most of this page is existing components restyled to dark theme and rewired to energy data. Only MarketBanner, SolarAssessmentCard, TariffComparison, and FiveWaysToSave are genuinely new.

   **Market logic (critical):**
   - `/api/user/energy-summary` returns `market_type` per property
   - Regulated (FL, most US): Hide supplier switching. Show: tariff restructure, solar, demand reduction, LED/HVAC, rebates. Market banner = amber warning. **Never say "monopoly"** — say "sole provider" or "single utility in this service area".
   - Deregulated (TX, UK): Show supplier switching as Way 1, plus all optimisation. Market banner = green.
   - Mixed portfolio: Show both. Per-property cards show the applicable market badge.

   **EST tags:**
   - Properties without uploaded bills: all cost metrics show `<EstBadge />` (amber)
   - Properties with uploaded bills: cost metrics show `<VerifiedBadge />` (green)
   - API-sourced data (benchmarks, rates): show `<ApiSrcBadge />` (blue)
   - Pattern: create `<DataConfidence source="est|verified|api" />` component, reuse everywhere

   **View toggle:**
   - "Portfolio" = aggregated view across all properties
   - Per-property buttons filter all sections to that property
   - Track selected in state, pass `assetId` filter to all data-fetching hooks

### Phase 3: Spin-off flows

Each flow is either a modal/drawer or a separate route. Match the insurance-flows-design.html pattern — centered 600px max-width page with flow-label, flow-h, flow-sub, cards, action buttons.

7. **Flow 1: Tariff review** — `/energy/tariff-review/[assetId]` or modal
   - Shows: current tariff → recommended tariff change summary
   - Change summary card (from/to pattern from insurance-flows)
   - Save highlight with annual saving
   - "What happens next" steps
   - **Approve button** → `POST /api/energy/quotes` with `{ assetId, tariff_from, tariff_to, type: "tariff_restructure" }` → creates `EnergyQuote` with status "quoted"
   - **On approval** → `POST /api/quotes/bind` → updates status to "submitted" → `sendEnergySwitchedEmail()` → shows success state (Flow 1b)
   - Success state: checkmark animation, reference number, next steps (FPL processes, verify on next bill), "Set reminder to upload next bill" action

8. **Flow 2: Solar PPA request** — `/energy/solar/[assetId]` or modal
   - Shows: properties included with roof area and estimated saving
   - Save highlight with total solar saving
   - "What happens next" steps (RealHQ sends to installers, quotes in 3-5 days, you review)
   - **Request button** → `POST /api/energy/solar-quote` → creates `SolarQuoteRequest` per property with status "requested"
   - Success: confirmation + expected timeline
   - **New API needed:** `/api/energy/solar-quote` (POST) — creates `SolarQuoteRequest` records

9. **Flow 3: Demand analysis detail** — `/energy/demand/[assetId]` or modal
   - Shows: peak demand events list (from `EnergyRead` records — find months with highest kW)
   - Recommended interventions (HVAC scheduling, battery storage, smart load controller) with ROI
   - Each intervention has a CTA:
     - "Implement" (HVAC scheduling) → creates recommendation record
     - "Get battery quotes" → creates a quote request (future integration)
     - "Get quotes" (load controller) → same pattern
   - For now, CTAs can create a simple record or open a contact form. Full integration comes later.

10. **Flow 4: LED/HVAC audit commission** — modal
    - Shows: what the audit covers (5 items), what happens next (4 steps)
    - **Commission button** → creates an audit request record (could be a `WorkOrder` with type "energy_audit" using existing `/api/user/work-orders`)
    - Success: confirmation with timeline
    - Links to Flow 5 (rebates) as the audit confirms rebate eligibility

11. **Flow 5: Rebate check** — `/energy/rebates/[assetId]` or modal
    - Shows: available utility rebate programmes for this property
    - Per-programme rows with eligibility status and value range
    - CTA links to Flow 4 (commission audit to confirm eligibility)
    - **Data source:** Static/semi-static per utility (FPL, Duke, TECO programmes). Store in a config or small lookup table. Can be hardcoded initially with plan to make dynamic.

12. **Flow 6: Bill upload + extraction** — modal (reuse `document-progress-design.html` pattern exactly)
    - Drop zone accepts PDF, JPG, PNG
    - Upload → shows per-file progress cards with status badges (QUEUED → EXTRACTING → EXTRACTED)
    - Pipeline: `upload to S3` → `textract.ts` (AWS OCR) → `document-parser.ts` (Claude extracts fields) → creates `Document` + `DocumentExtract` → calls `/api/user/energy-reads/materialise` to create `EnergyRead` records
    - Extracted fields displayed inline per file: supplier, billing period, total charge, consumption kWh, peak demand kW, tariff schedule, demand charge breakdown
    - **On completion:** KPIs update from EST to verified, tariff analysis runs, anomaly detection checks
    - **Reuse `LeaseUploadModal` pattern** — same upload → progress → extraction → materialise flow, different extracted fields

13. **Flow 7: Switch supplier (deregulated only)** — `/energy/switch/[assetId]` or modal
    - Only shown when `market_type === "deregulated"`
    - Change summary (current supplier → new supplier, rate, contract, renewable)
    - Save highlight
    - "What happens next" steps (submit via Octopus, activation, old supplier cancellation)
    - **Approve button** → `POST /api/energy/quotes` with `{ assetId, provider, rate, type: "supplier_switch" }` → `POST /api/quotes/bind` → `sendEnergySwitchedEmail()`
    - Success state: switch confirmed, cancellation letter download, verify on first bill
    - **Early termination warning:** If current contract has ETF, show amber warning before approval

14. **Flow 8: Anomaly investigation** — `/energy/anomaly/[anomalyId]` or modal
    - Shows: detection summary (current vs average consumption, excess cost)
    - Possible causes ranked: HVAC fault, meter error, tenant activity change
    - Each cause has a CTA:
      - "Create work order" → `POST /api/user/work-orders` (HVAC inspection)
      - "Request meter check" → creates a request record
      - "Check tenants" → links to `/tenants?assetId=X`
    - **Mark as investigating** → `PATCH /api/user/energy-anomaly/[id]` → updates `EnergyAnomaly.status` to "investigating"
    - **Dismiss** → updates status to "dismissed" + stores reason (learning loop — same pattern as `ScoutReaction`)
    - **New API needed:** `/api/user/energy-anomaly/[id]` (PATCH) — updates anomaly status

### Phase 4: Shared features

15. **`<DataConfidence />` component** — `src/components/DataConfidence.tsx`
    - Props: `source: "est" | "verified" | "api"`, optional `label`
    - EST = amber badge, Verified = green ✓ badge, API = blue badge
    - Reuse across every page (dashboard, property detail, insurance, energy, financials)
    - This is the EST tag system described in the handoff doc

16. **Portal link for energy data**
    - "Create a portal link" → opens portal generator (shared feature)
    - Selects: consumption data, tariff analysis, solar assessment, anomaly report
    - Uses `TransactionRoom` model pattern — creates a permissioned shareable link
    - Recipients see only selected data sections
    - This is a shared component — build once in Phase 4, wire to energy page

17. **Energy summary report generation**
    - "Download summary" → generates PDF using `brochure.ts` pattern
    - Template includes: KPIs, per-property breakdown, tariff analysis, solar assessment, demand analysis
    - Creates `Document` record with type "energy_report"

---

## New files to create

**Before creating ANY new component, check CODE_INVENTORY.md.** If a similar component exists, RESTYLE it. Do not duplicate.

### New files (genuinely new — nothing similar exists)
| File | Type | Purpose |
|------|------|---------|
| `src/app/energy/page.tsx` | Page | Main energy page |
| `src/hooks/useEnergyData.ts` | Hook | Portfolio energy data fetching (follow `useIncomeOpportunities` pattern) |
| `src/hooks/useEnergyQuotes.ts` | Hook | Per-property tariff/quote fetching |
| `src/components/DataConfidence.tsx` | Component | EST/Verified/API badges — shared across all pages |
| `src/components/MarketBanner.tsx` | Component | Regulated/deregulated market context (no similar exists) |
| `src/components/TariffComparison.tsx` | Component | Tariff/supplier table (no similar exists) |
| `src/components/SolarAssessmentCard.tsx` | Component | Solar PPA overview (no similar exists) |
| `src/app/api/user/energy-reads/materialise/route.ts` | API | Creates EnergyRead from extracted bill (follow `/api/user/leases/materialise` pattern exactly) |
| `src/app/api/energy/solar-quote/route.ts` | API | Creates SolarQuoteRequest |
| `src/app/api/user/energy-anomaly/[id]/route.ts` | API | Updates anomaly status |

### Existing components to RESTYLE (do NOT create new versions)
| Existing component | Restyle for | Notes |
|-------------------|-------------|-------|
| `BarChart` | Monthly consumption chart | Already exists in CODE_INVENTORY. Restyle to dark theme, pass energy data. Do NOT create a new `ConsumptionChart.tsx`. |
| `NOIBridge` | Demand charge breakdown | Already shows cost breakdowns. Restyle and rewire for demand/consumption split. Do NOT create `DemandAnalysis.tsx`. |
| `PolicyUploadWidget` | Bill upload + extraction | This IS the energy bill upload widget already. Restyle to dark theme, wire to energy bill extraction pipeline. Do NOT create `BillUploadZone.tsx`. |
| `ActionAlert` | Anomaly alerts | Already shows alerts. Restyle for energy anomaly data. |
| `DirectCallout` | Insight banner | Already shows recommendations. Restyle for energy insights. |
| `MetricCard` | Per-property energy KPIs | Already shows property metrics. Restyle and pass energy data. |
| `PageHero` | Energy page header | Restyle to dark theme. |
| `SectionHeader` | Section labels | Restyle to dark theme. |

### Components that look new but might exist — CHECK FIRST
| Need | Check if exists | If yes | If no |
|------|----------------|--------|-------|
| Property energy row card | Any list/row component in the 21 existing | Restyle + extend | Create `PropertyEnergyCard.tsx` |
| Energy insight banner | `DirectCallout` or `ActionAlert` | Restyle | Create `EnergyInsightBanner.tsx` |

## Files to modify

| File | Change |
|------|--------|
| `src/app/api/user/energy-summary/route.ts` | Extend response with market_type, bills_uploaded, solar_potential, anomalies |
| `prisma/schema.prisma` | Verify EnergyRead, EnergyAnomaly, SolarAssessment, SolarQuoteRequest exist — add if missing |
| `src/lib/email.ts` | Verify `sendEnergySwitchedEmail()` and `sendEnergyQuoteEmail()` exist — they should |
| `src/lib/document-parser.ts` | Add energy bill parsing template (tariff, consumption, demand, supplier fields) |
| `globals.css` | No changes needed if AppShell restyle is complete |
| `CLAUDE.md` | Add `energy-design.html` to the Design Files list |

---

## Schema verification

Check `prisma/schema.prisma` for these models. If missing, add them:

```prisma
// Should already exist — verify fields
model EnergyRead {
  id            String   @id @default(cuid())
  userId        String
  assetId       String
  supplier      String?
  tariffSchedule String?
  billingStart  DateTime
  billingEnd    DateTime
  consumptionKwh Float
  demandKw      Float?
  demandCharge  Float?
  consumptionCharge Float?
  totalCost     Float
  source        String   // "bill_extract" | "manual" | "api"
  documentId    String?  // link to uploaded bill Document
  createdAt     DateTime @default(now())

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset    UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  document Document? @relation(fields: [documentId], references: [id])

  @@index([assetId, billingStart(sort: Desc)])
}

model SolarQuoteRequest {
  id            String   @id @default(cuid())
  userId        String
  assetId       String
  roofAreaSqft  Float?
  systemSizeKw  Float?
  status        String   @default("requested") // "requested" | "quotes_received" | "accepted" | "declined"
  providers     Json?    // array of provider names invited
  quotes        Json?    // array of received quotes
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
}
```

---

## Market rules — CRITICAL

Per DECISIONS.md: **"Never ask questions you can infer."** Market type is inferred from the property address — the user is never asked whether they're in a regulated or deregulated market. The system detects it automatically.

Per DECISIONS.md: **"Show results immediately with confidence scores."** Even before bills are uploaded, show estimated energy costs based on sqft × state commercial average. Tag with EST. The moment bills are uploaded, switch to verified data.

This logic must be correct throughout:

| State/Market | market_type | Supplier switching | What to show |
|-------------|-------------|-------------------|-------------|
| Florida (FPL, Duke, TECO) | `regulated` | ❌ Not available | Tariff restructure, solar PPA, demand reduction, LED/HVAC, rebates |
| Texas (ERCOT) | `deregulated` | ✅ Available | Switch supplier (Way 1) + all optimisation |
| UK | `deregulated` | ✅ Available | Switch supplier (Way 1) + all optimisation |
| Other US states | Check per state | Varies | Default to regulated unless confirmed deregulated |

**Language rules:**
- Never say "monopoly" — say "sole provider" or "single utility in this service area"
- Regulated: "You cannot switch supplier" + "RealHQ focuses on optimisation"
- Deregulated: "You can switch supplier" + "RealHQ handles the switch"

---

## Acceptance criteria

### Main page
- [ ] `/energy` renders with AppShell, sidebar showing Energy active with savings badge
- [ ] Portfolio/property toggle works — filters all sections
- [ ] Market banner shows correct type per portfolio's state(s)
- [ ] 5 KPIs render with correct EST/verified badges based on bill upload status
- [ ] Anomaly alert shows for open anomalies with pulse animation
- [ ] Insight banner shows top recommendation with saving amount
- [ ] Per-property cards show correct cost, benchmark comparison, saving, and market badge
- [ ] Properties without bills show EST badges and "Upload bills" CTA
- [ ] 5 Ways to Save adapts for regulated vs deregulated market
- [ ] Consumption chart renders 12-month data from EnergyRead records
- [ ] Demand charge analysis shows consumption/demand split with insight
- [ ] Solar assessment shows portfolio overview with per-property breakdown
- [ ] Tariff comparison table shows available tariffs with BEST FIT and CURRENT tags
- [ ] Bill upload zone accepts drag-drop and click-to-browse
- [ ] Portal hint links to portal generator

### Flows
- [ ] Flow 1: Tariff review shows change summary, creates EnergyQuote, shows success with reference
- [ ] Flow 2: Solar PPA shows properties + estimates, creates SolarQuoteRequest per property
- [ ] Flow 3: Demand detail shows peak events + interventions with ROI
- [ ] Flow 4: Audit commission shows scope + timeline, creates work order
- [ ] Flow 5: Rebate check shows available programmes with eligibility
- [ ] Flow 6: Bill upload shows per-file extraction progress, creates EnergyRead records, updates KPIs from EST to verified
- [ ] Flow 7: Supplier switch (deregulated only) shows change summary, binds via Octopus, shows success
- [ ] Flow 8: Anomaly investigation shows detection + causes + actions, can mark investigating or dismiss

### Shared
- [ ] `<DataConfidence />` renders EST/verified/API badges correctly everywhere
- [ ] Portal link generation works for energy data
- [ ] All emails send correctly (tariff switch, supplier switch, quote received)
- [ ] No "monopoly" language anywhere in the codebase

### Post-build (mandatory)
- [ ] Update `CLAUDE.md` Design Files list to include `energy-design.html`
- [ ] Update `CODE_INVENTORY.md` with all new files created (hooks, components, API routes)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes
- [ ] No duplicate components created — verify against CODE_INVENTORY.md

---

## Notes

- **RESTYLE FIRST.** Per CLAUDE.md: "If component looks wrong: restyle, don't duplicate." The agent must check each existing component before creating anything new. `PolicyUploadWidget`, `BarChart`, `NOIBridge`, `ActionAlert`, `DirectCallout`, `MetricCard`, `PageHero`, `SectionHeader` all exist and should be restyled for energy use.
- **Bill extraction is the unlock.** Without bills, everything is estimated. The upload + extraction flow (Flow 6) is the highest-priority flow to get right. Once a user uploads bills, their data confidence upgrades from EST to verified across all metrics, and RealHQ can run real tariff analysis and demand analysis.
- **Solar is a PPA model, not purchase.** Zero upfront. User buys power at a fixed rate below their utility rate. The installer owns the panels. This is the messaging everywhere.
- **Demand charges are the hidden cost.** 40–60% of Florida commercial bills. Most owners don't know this. The demand analysis section should feel like a revelation — "52% of your bill is demand charges, and here's how to cut them."
- **The deregulated variant is a stretch goal if time is tight.** FL (regulated) is the launch market. TX/UK deregulated logic can ship in a follow-up if needed. But the architecture should support both from day one.
- **Per DECISIONS.md — Voice:** "Direct. Specific. Confident. No hedging, no fluff, no AI-forward language." All copy in the energy page follows this. Don't say "we think you could save" — say "you save $9,200/yr".
