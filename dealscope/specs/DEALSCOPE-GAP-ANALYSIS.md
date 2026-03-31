# DealScope: Gap Analysis & Revised Specification

## Code Audit, Document Review, and Unified Product Architecture

---

## 1. WHAT EXISTS TODAY (Code Audit)

### Frontend: 2 pages built

| Page | Path | Lines | Status |
|------|------|-------|--------|
| Main input + headline card | `/dealscope/page.tsx` | 693 | **Working** — 4 input methods (address, PDF, text, link), headline card with narrative + risks, recent properties sidebar, example properties |
| Letter generator | `/dealscope/letter/page.tsx` | ~550 | **Working** — tone selector, Claude AI letter preview, edit + send |

**What's missing from frontend:**
- No `/dealscope/[dealId]` deep-dive dossier page (the "Deep Dive" button links to it but it doesn't exist)
- No pipeline/kanban view
- No underwrite/scenarios page
- No search/filter/map view (Scout surface)
- No alerts/notifications UI
- No user preferences/onboarding wizard
- No dashboard home

### Backend APIs: 6 routes, 3 are stubs

| Route | Lines | Status |
|-------|-------|--------|
| `POST /api/dealscope/enrich` | 393 | **Working** — geocoding, EPC lookup, Land Registry comps, satellite image. Companies House + Gazette are imported but only log placeholders ("requires CCOD data"). No CCOD integration. |
| `POST /api/dealscope/letter` | 182 | **Working** — Claude AI generation, persists to ApproachLetter table, GET for retrieval |
| `POST /api/dealscope/letter/send` | 133 | **Working** — email sending |
| `GET/POST /api/dealscope/pipeline` | 12 | **Stub** — returns empty array / `{ success: true }` |
| `PATCH /api/dealscope/pipeline/update-stage` | 11 | **Stub** — no database interaction |
| `POST /api/dealscope/pipeline/track-response` | 13 | **Stub** — no database interaction |

**APIs that are specified but don't exist:**
- `POST /api/dealscope/valuations` — 3-method valuation
- `POST /api/dealscope/rent-gap` — rent gap detection
- `POST /api/dealscope/scenarios` — 3-scenario generation
- `POST /api/dealscope/search` — advanced search/filter
- `POST /api/dealscope/import` — bulk auction import
- Any alert/notification endpoints
- Any user preference endpoints

### Libraries: 9 files, partial coverage

| Library | Lines | Status |
|---------|-------|--------|
| `dealscope-epc.ts` | 162 | **Working** — lookupEPCByAddress, scoreEPCRisk via OpenDataCommunities API |
| `dealscope-comps.ts` | 124 | **Working** — findComps, scoreCompsConfidence via Land Registry Price Paid |
| `dealscope-companies-house.ts` | 277 | **Working** — getCompanyProfile, searchCompany, getCompanyCharges, getCompanyInsolvency, scoreCompanyDistress. All call real Companies House API. But NOT called from enrich route (imported, not used). |
| `dealscope-gazette.ts` | 127 | **Working** — searchGazetteByCompanyName, scoreGazetteDistress. Calls real London Gazette API. But NOT called from enrich route. |
| `scout-returns.ts` | 161 | **Reusable** — calculateDealReturns (IRR, cap rate, cash-on-cash, equity multiple) |
| `hold-sell-model.ts` | 294 | **Reusable** — DCF modeling (5-year hold projections) |
| `avm.ts` | 462 | **Reusable** — automated valuation model (comps-based) |
| `covenant-check.ts` | 141 | **Reusable** — company covenant strength analysis |
| `land-registry.ts` | 131 | **Reusable** — Land Registry title lookups |

**Libraries that are specified but don't exist:**
- `rent-gap-analysis.ts` — rent gap detection
- `scenario-generator.ts` — intelligent scenario generation
- `approach-letter.ts` — approach letter context builder (the API route calls Claude directly but no lib)
- Any alert/signal engine logic
- Any user preference matching logic

### Database Schema: Models exist, partially wired

| Model | Fields | Wired to API? |
|-------|--------|---------------|
| `ScoutDeal` | Full DealScope fields added (epcRating, yearBuilt, buildingSizeSqft, ownerCompanyId, currentRentPsf, marketRentPsf, occupancyPct, leaseLengthYears, breakDates, tenantCompanyId, tenantCovenantStrength, dataSources, enrichedAt) | Yes — enrich route writes to it |
| `ScoutUnderwriting` | DealScope fields added (conditionVsMarketGuess, yieldBase, yieldTenantAdjustment, yieldLeaseAdjustment, yieldOverUnderRentAdjustment, finalYield, reversionValue, userYieldOverrides, scenarioType) | No — no scenarios API exists |
| `ApproachLetter` | Complete (tone, recipientName/Email/Address, sentAt, sentVia, responseStatus, followUpDate, notes) | Yes — letter route writes to it |
| `PropertyValuation` | Complete (valuationLow/Mid/High, method, confidence) | No — no valuations API exists |
| `PropertyRentGap` | Complete (currentRentPsf, marketRentPsf, gapPsf, gapPercentage, guess, epcRating, buildingAge, occupancy, tenantStrength) | No — no rent-gap API exists |
| `UserPipeline` | Complete (userId, propertyId, stage, addedAt, updatedAt) | No — pipeline API is a stub |
| `AcquisitionStrategy` | Exists (targetTypes, targetGeography, minYield, maxYield, minPrice, maxPrice, minSqft, maxSqft) | Used by Scout only, not DealScope |

**Models that don't exist:**
- `ScoutAlert` / `SavedSearch` — alert configuration, saved search criteria
- `AlertEvent` / `Notification` — triggered alert records
- `UserPreference` — beyond AcquisitionStrategy (signal type preferences, alert frequency, notification channels)
- `PropertyWatchlist` — properties being monitored for changes
- `AuctionImport` — bulk import tracking
- `YieldLearning` — user yield override history

### Existing Scout Code (Reusable)

The Scout module at `/scout` is substantial — 39K main page, 72K of sub-pages (underwrite, finance, equity), 152K of API routes. Key reusable pieces:

- **Pipeline/kanban pattern** — Scout has `pipelineStage` on ScoutDeal and a pipeline API at `/api/scout/pipeline`
- **Strategy/filter pattern** — AcquisitionStrategy model with StrategyBar + StrategyEditorModal components
- **Deal card pattern** — Scout page renders deal cards with signals, returns, actions
- **Underwrite flow** — `/scout/[dealId]/underwrite` has 3-scenario modeling with sliders
- **LOI/teaser generation** — Claude AI document generation pattern (reusable for approach letters)
- **Investor outreach tracking** — VendorApproach model + InvestorOutreach model
- **LoopNet sync** — ingestion pattern at `/api/scout/loopnet-sync` (12K lines)

---

## 2. DOCUMENT CONFLICTS & GAPS

### Six documents, three mental models

The uploaded documents describe DealScope differently depending on when they were written:

| Document | Mental Model | Entry Point |
|----------|-------------|-------------|
| **DEALSCOPE-SPEC.md** (70K) | Full sourcing platform — search 12 data sources, filter by 50+ criteria, map view, alert system | Search/filter → headline → dossier → approach |
| **README.md** (9.5K) | Analysis engine — "any property, any source, full intelligence in 1 minute" | 4 input methods → headline → dossier → underwrite → letter → pipeline |
| **MVP-SCOPE.txt** (2K) | Minimal analyzer — "property analysis engine (not property discovery)" | 4 input methods → headline → dossier → scenarios → letter → pipeline |
| **DEALSCOPE-MVP-CHECKLIST.md** (16K) | Build checklist matching MVP-SCOPE | Same as above, with API/DB tickets |
| **REALWORLD-CODE-REUSE.md** (14K) | Scout 2.0 — DealScope extends Scout with intelligence layer | Extends existing Scout flow |
| **DEALSCOPE_COMPLETE_SPECIFICATION.md** (prior upload, 1054 lines) | 3 entry points, 10 analysis tabs, learning engine, 4 branching workflows | Find/Upload/Browse → Analysis Hub → Pipeline/Outreach/Negotiate/Memo |
| **dealscope-design.html** (prior upload, 2796 lines) | Signal-driven heatmap → property dossier → approach wizard → negotiation → pipeline | Heatmap → dossier → wizard → pipeline |

**Key conflicts:**
1. The SPEC says "search the entire UK market proactively." The MVP says "not property discovery." The HTML mockup shows a monitoring heatmap. These are three different products.
2. The SPEC describes 12 data sources and 50+ filters. The code integrates 3 data sources (EPC, Land Registry comps, Google geocoding). Companies House and Gazette are imported but not called.
3. The COMPLETE_SPECIFICATION has 10 analysis tabs. The MVP checklist has 7 dossier tabs. The HTML mockup has 6. The built code has 0 (no dossier page exists).
4. The SPEC describes an alert system ("user saves a search → system monitors it automatically"). No alert model, no alert API, no alert UI exists.
5. The REALWORLD-CODE-REUSE doc says "DealScope is Scout 2.0." But the code has DealScope as a completely separate route (`/dealscope`) with no shared components from Scout, despite Scout having reusable underwriting, pipeline, and deal card patterns.

### What Ian clarified in our conversation

Two critical product decisions that aren't in any document:
1. **Portfolio context is available from day one** — users can input preferences and some will have known portfolios. This isn't a Phase 2 learning system; it's onboarding.
2. **DealScope is also a push/alert system** — "not just discovery but also an alert when a deal comes available or worth reviewing or a price change."

These shift the architecture significantly. The product isn't just "paste address → get analysis." It's a continuous monitoring platform that also handles on-demand analysis.

---

## 3. THE GAP MAP

### What's built vs what's needed for the merged product

```
BUILT                              NEEDED (not built)
─────                              ──────────────────

Frontend:
✅ Property input (4 methods)      ❌ Dashboard home (alerts, portfolio, activity)
✅ Headline card                   ❌ Scout surface (map + signals + filters)
✅ Letter generator                ❌ Dossier deep-dive (/dealscope/[dealId])
                                   ❌ Underwrite/scenarios page
                                   ❌ Pipeline kanban
                                   ❌ Approach wizard (from HTML mockup)
                                   ❌ Negotiation dashboard
                                   ❌ Alert inbox
                                   ❌ User preferences / onboarding
                                   ❌ Saved searches / watchlist

Backend APIs:
✅ /enrich (partial)               ❌ /valuations (3-method)
✅ /letter (Claude AI)             ❌ /rent-gap
✅ /letter/send                    ❌ /scenarios (3 paths)
⬜ /pipeline (stub)                ❌ /search (advanced filter)
⬜ /pipeline/update-stage (stub)   ❌ /alerts (CRUD + delivery)
⬜ /pipeline/track-response (stub) ❌ /preferences (user profile)
                                   ❌ /watchlist (monitor properties)
                                   ❌ /import (bulk auction)
                                   ❌ Signal engine cron job

Libraries:
✅ dealscope-epc.ts                ❌ rent-gap-analysis.ts
✅ dealscope-comps.ts              ❌ scenario-generator.ts
✅ dealscope-companies-house.ts    ❌ signal-matcher.ts (match events to user prefs)
   (built but NOT called)          ❌ alert-delivery.ts (email/push/in-app)
✅ dealscope-gazette.ts            ❌ yield-calculator.ts (component breakdown)
   (built but NOT called)
✅ scout-returns.ts (reusable)
✅ hold-sell-model.ts (reusable)
✅ avm.ts (reusable)
✅ covenant-check.ts (reusable)

Database:
✅ ScoutDeal (extended)            ❌ SavedSearch / AlertConfig
✅ ScoutUnderwriting (extended)    ❌ AlertEvent / Notification
✅ ApproachLetter                  ❌ PropertyWatchlist
✅ PropertyValuation (unused)      ❌ UserPreference (beyond AcquisitionStrategy)
✅ PropertyRentGap (unused)        ❌ AuctionImport
✅ UserPipeline (unused)           ❌ YieldLearning
✅ AcquisitionStrategy (Scout)

Data Sources:
✅ EPC (OpenDataCommunities)       ❌ CCOD (corporate ownership bulk data)
✅ Land Registry (Price Paid)      ❌ Planning.data.gov.uk
✅ Google Geocoding + Satellite    ❌ Historic England (listed status)
✅ Companies House (built, unused) ❌ Environment Agency (flood/contamination)
✅ London Gazette (built, unused)  ❌ Probate Service
                                   ❌ VOA Rating List
                                   ❌ Auction site scrapers
                                   ❌ Market data feeds
```

---

## 4. IMMEDIATE FIXES (Wire Up What's Already Built)

These require zero new code — just connecting existing pieces:

### Fix 1: Wire Companies House into enrich route
`dealscope-companies-house.ts` is imported but the enrich route just logs "requires CCOD data." The functions work. At minimum, if we have an owner name from any source, call `searchCompany()` → `getCompanyProfile()` → `getCompanyCharges()` → `getCompanyInsolvency()` → `scoreCompanyDistress()`. Store results on ScoutDeal (`ownerCompanyId`, `hasInsolvency`).

### Fix 2: Wire Gazette into enrich route
Same pattern. `dealscope-gazette.ts` is ready. If we have a company name from Fix 1, call `searchGazetteByCompanyName()` → `scoreGazetteDistress()`. Adds insolvency signal detection.

### Fix 3: Wire PropertyValuation model
The model exists. The `avm.ts` library exists. After enrichment, call AVM with the comps data from `dealscope-comps.ts` and write to `PropertyValuation`. Return valuations in the enrich response.

### Fix 4: Wire UserPipeline model
The model exists. The pipeline API route is a stub. Replace the stub with actual Prisma queries — this is ~30 lines of code per endpoint.

### Fix 5: Reuse Scout's AcquisitionStrategy for DealScope preferences
The model already has targetTypes, targetGeography, yield ranges, price ranges, size ranges. Add: `signalTypes String[]` (admin, probate, MEES, auction, etc.), `alertFrequency String` (realtime, daily, weekly), and `notificationChannels String[]` (inapp, email, push). This becomes the DealScope user preference model.

---

## 5. REVISED PRODUCT ARCHITECTURE

Based on the code audit, document review, and Ian's clarifications, here's the unified architecture:

### Product surfaces (5 pages + settings)

```
/dealscope                → Dashboard home (alerts, portfolio snapshot, recent)
/dealscope/scout          → Scout surface (map + signals + filters + input bar)
/dealscope/[dealId]       → Dossier (5 tabs: Overview, Financials, Ownership, Market, Opportunity & Risk)
/dealscope/[dealId]/act   → Act (approach wizard + negotiation + memo export)
/dealscope/pipeline       → Pipeline kanban (6 columns)
/dealscope/alerts         → Alert inbox (chronological feed, filterable)
/dealscope/preferences    → User preferences + portfolio context
```

### Data flow

```
Signal Engine (cron: hourly)
├── Companies House filings → new admin/liquidation/strike-off events
├── EPC register changes → MEES breaches, new certificates
├── Auction site scraping → new lots, price changes
├── Land Registry → new sales, price movements
└── London Gazette → insolvency notices

Events matched against UserPreferences
├── Geography match? Type match? Price range? Signal type?
├── Score by match strength (perfect=10, partial=5, weak=2)
└── Create AlertEvent → deliver via configured channels

User actions
├── Paste address/URL/PDF/text → enrich → create ScoutDeal → show headline
├── Click alert → open dossier
├── Click map pin → open dossier
├── Save to pipeline → create UserPipeline entry
├── Save search → create SavedSearch → enables alerts
└── Watch property → create PropertyWatchlist entry → monitor for changes
```

### New database models needed

```prisma
model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  name        String   // "South East Industrial Under £1M"
  criteria    Json     // { geography, types, priceRange, signals, yield, etc. }
  alertFreq   String   @default("daily") // "realtime" | "daily" | "weekly" | "off"
  lastRunAt   DateTime?
  matchCount  Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  alerts AlertEvent[]
  
  @@index([userId])
}

model AlertEvent {
  id            String    @id @default(cuid())
  userId        String
  savedSearchId String?
  watchlistId   String?
  dealId        String?   // FK to ScoutDeal
  alertType     String    // "new_signal" | "price_change" | "status_change" | "deadline" | "portfolio_gap"
  title         String    // "New admin filing: Meridian Business Park"
  summary       String?   // One-line context
  matchScore    Int       @default(0) // 0-10
  priority      String    @default("normal") // "urgent" | "high" | "normal" | "low"
  isRead        Boolean   @default(false)
  isDismissed   Boolean   @default(false)
  snoozedUntil  DateTime?
  deliveredVia  String[]  // ["inapp", "email"]
  createdAt     DateTime  @default(now())
  readAt        DateTime?
  
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  savedSearch SavedSearch? @relation(fields: [savedSearchId], references: [id])
  
  @@index([userId, isRead])
  @@index([createdAt])
}

model PropertyWatchlist {
  id         String   @id @default(cuid())
  userId     String
  dealId     String   // FK to ScoutDeal
  reason     String?  // "monitoring price" | "awaiting admin resolution" | "auction in 14 days"
  addedAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, dealId])
  @@index([userId])
}
```

### Extended AcquisitionStrategy (user preferences)

```prisma
// Add to existing AcquisitionStrategy model:
signalTypes         String[]  // ["administration", "probate", "mees", "auction", "absent_owner", "dissolved"]
alertFrequency      String    @default("daily") // "realtime" | "daily" | "weekly"
notificationChannels String[] @default(["inapp"]) // ["inapp", "email", "push"]
riskAppetite        String?   // "conservative" | "moderate" | "aggressive"
maxLeaseLength      Int?      // minimum acceptable lease years
avoidedSignals      String[]  // signals user never wants to see
```

---

## 6. BUILD PRIORITY (Phased)

### Phase 1: Wire up + Dossier (Week 1-2)
**Goal:** Complete the core analysis flow end-to-end

1. Wire Companies House + Gazette into enrich route (Fix 1 + Fix 2)
2. Wire PropertyValuation via AVM into enrich route (Fix 3)
3. Build `/dealscope/[dealId]` dossier page — 5 tabs (reuse Scout underwrite patterns)
4. Wire pipeline API with real Prisma queries (Fix 4)
5. Build pipeline kanban page (reuse Scout pipeline pattern)
6. Build `/api/dealscope/scenarios` using `hold-sell-model.ts` + `scout-returns.ts`

### Phase 2: Alert Engine + Preferences (Week 3-4)
**Goal:** DealScope becomes a monitoring platform, not just an analyzer

1. Create SavedSearch, AlertEvent, PropertyWatchlist models (migration)
2. Extend AcquisitionStrategy with signal/alert fields
3. Build preferences page (onboarding wizard + settings)
4. Build `/api/dealscope/alerts` CRUD
5. Build signal engine cron job (`/api/cron/dealscope-signals`)
   - Companies House: check status changes for watched companies
   - EPC: check new certificates for watched postcodes
   - Match events against SavedSearch criteria
   - Create AlertEvent records
6. Build alert inbox page
7. Build dashboard home (alert summary + portfolio snapshot + recent activity)
8. Email delivery for alerts (reuse existing email infrastructure)

### Phase 3: Scout Surface + Search (Week 5-6)
**Goal:** Full discovery experience (the HTML mockup's heatmap vision)

1. Build Scout surface page with map + signal pins
2. Build `/api/dealscope/search` with filter engine
3. Integrate CCOD bulk data for corporate ownership lookups
4. Build saved search UI (save criteria → enable alerts)
5. Add Planning.data.gov.uk integration
6. Add Historic England integration
7. Add Environment Agency integration
8. Build approach wizard (port from HTML mockup)
9. Build negotiation dashboard (port from HTML mockup)

### Phase 4: Intelligence + Scale (Month 2+)
**Goal:** Learning system, bulk operations, market intelligence

1. Rent gap detection library + API
2. Intelligent scenario generation (condition vs market)
3. Yield calculation with component breakdown + user overrides
4. Bulk auction import workflow
5. Portfolio complementarity analysis
6. Learning system (track user overrides, refine recommendations)
7. Elevate integration (cost reduction impact on scenarios)
8. Investment memo PDF export

---

## 7. KEY ARCHITECTURAL DECISIONS

### Decision 1: ScoutDeal stays as the property model
Don't create a separate DealScope property table. ScoutDeal already has all the fields. DealScope features extend it. This is what REALWORLD-CODE-REUSE recommends, and the code already does this.

### Decision 2: AcquisitionStrategy becomes the preference model
Don't create a new UserPreference model. Extend AcquisitionStrategy with DealScope-specific fields. One model, one place to configure what the user wants.

### Decision 3: Signal engine is a cron job, not real-time
Real-time monitoring of Companies House, Land Registry, and EPC registers isn't practical (rate limits, cost). An hourly or daily cron job that checks for changes is sufficient. Urgent alerts (auction deadlines) can use tighter intervals.

### Decision 4: One dossier, many entry points
Whether a user arrives from an alert, a map pin, a pasted URL, or a search result, they land on the same `/dealscope/[dealId]` dossier page. The dossier doesn't know or care how you got there.

### Decision 5: Scout and DealScope share the page shell but not pages
DealScope uses AppShell (sidebar nav, header) but has its own route tree under `/dealscope`. Scout remains at `/scout` for existing US-market users. Eventually, DealScope subsumes Scout entirely.

---

## 8. WHAT THE SPEC OVER-SPECIFIED

Things in the documents that should be cut or deferred:

- **50+ search filters** — Start with 8: geography, property type, price range, size range, signal type, EPC rating, tenure, company status. Add more as users request them.
- **12 data sources in parallel** — Start with 5 (EPC, Land Registry, Companies House, Gazette, Google). Add Planning/Historic England/EA in Phase 3.
- **10 analysis tabs** — 5 is enough. Quick and Property merge into Overview. Financial, Finance, and Costs merge into Financials. Opportunity and Risks merge.
- **Learning engine ML model** — Explicit preferences + simple frequency counting beats ML for the first 1000 users. Track what users search/save/pass, surface as "you usually look at X" hints, but don't build a model.
- **Competitor intelligence** — "Another buyer showing interest" requires data partnerships that don't exist. Cut entirely.
- **Fund Exit Tracker, FMCAD data, bridging loan stress data** — These are premium data partnerships. Not MVP.
- **Three user types** (Investor, Agent, Scout) — Build for one user type first. Add multi-user/team features in Phase 4.
