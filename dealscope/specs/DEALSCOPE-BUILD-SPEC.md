# DealScope: Complete Build Specification

> **Purpose:** Everything needed to build DealScope from the design mockups to a working product. Written for a developer with zero prior context.

---

## 1. WHAT IS DEALSCOPE

DealScope is a UK commercial property acquisition intelligence platform. It monitors public data sources for distressed and opportunistic property signals (administrations, auctions, MEES non-compliance, absent owners, etc.), enriches properties with deep analysis, and gives users tools to approach owners, track deals through a pipeline, and generate professional documents.

**Core user flow:** Search → Dossier → Pipeline → Approach → Complete

**It is part of the RealHQ ecosystem** alongside Elevate (portfolio performance engine). Both products share authentication, the design system, the Prisma schema, and Supabase/PostgreSQL. They are separate Next.js route groups in the same repository.

---

## 2. EXISTING CODEBASE

**Repository:** `github.com/REAIAN18/propra-app`
**Stack:** Next.js 15 (App Router), React 19, Prisma 7, Supabase (PostgreSQL), Vercel deployment, NextAuth

### 2.1 Existing routes to keep running (DO NOT break)

| Route | Status | Notes |
|-------|--------|-------|
| `/scout` | Working | US-market acquisition tool. Keep live for demos. |
| `/scout/[id]` | Working | Scout deal detail pages. |
| `/dealscope` | Working | Current paste-address analyser. |
| `/dealscope/letter` | Working | AI letter generation page. |
| `/elevate/*` | Working | Portfolio performance engine. |

### 2.2 New routes to build (parallel, not replacement)

Build everything under `/scope` (or `/ds`). When complete, update sidebar navigation to point here. Old routes stay live until cut-over.

| New route | Maps to | Design file |
|-----------|---------|-------------|
| `/scope` | Home page | batch1a: "Home: Active/Empty/Loading" |
| `/scope/search` | Search page | batch1a: "Search: Initial/Results/None/Loading" |
| `/scope/address` | Address results | batch1a: "Address: Found/NotFound/Ambiguous/Loading" |
| `/scope/company/[id]` | Company results | batch1a: "Company: Found/NotFound" |
| `/scope/property/[id]` | Dossier (7 tabs) | batch1b: full dossier |
| `/scope/pipeline` | Pipeline kanban | batch1c: "Pipeline: Active/Empty" |
| `/scope/alerts` | Alert feed | batch1c: "Alerts: Active/Empty/AllRead" |
| `/scope/settings` | Settings (5 sections) | batch1c: "Settings" |
| `/scope/onboarding` | First-time wizard | batch1a + batch3-5: Onboarding 1-5 |

### 2.3 Existing APIs to reuse (DO NOT rebuild)

| API route | What it does | Reuse how |
|-----------|-------------|-----------|
| `/api/dealscope/enrich` | Geocodes address, pulls EPC, finds LR comps, saves to ScoutDeal | Call from new `/scope/property/[id]` page. Extend (don't replace) to also call Companies House + Gazette. |
| `/api/dealscope/letter` | Claude AI letter generation | Call from new Approach tab in dossier. No changes needed. |
| `/api/dealscope/letter/send` | Sends letter (email/post) | Call from Send confirmation modal. No changes needed. |

### 2.4 Existing APIs to extend (add functionality)

| API route | Current state | What to add |
|-----------|--------------|-------------|
| `/api/dealscope/enrich` | Calls geocoder, EPC, LR comps | Wire in Companies House lib (`dealscope-companies-house.ts` — 277 lines, already built), Gazette lib (`dealscope-gazette.ts` — 127 lines, already built). Also wire PropertyValuation via AVM. |
| `/api/dealscope/pipeline` | Returns `[]` | Replace with real Prisma queries against UserPipeline model. |
| `/api/dealscope/pipeline/update-stage` | Returns `{ok:true}` | Replace with real Prisma update. |
| `/api/dealscope/pipeline/track-response` | Returns `{ok:true}` | Replace with real Prisma insert. |

### 2.5 Existing libraries to reuse

| Library | Path | What it does |
|---------|------|-------------|
| `dealscope-companies-house.ts` | `/src/lib/` | Full Companies House API: company profile, officers, charges, filing history. **Built but not wired into enrich route.** |
| `dealscope-gazette.ts` | `/src/lib/` | London Gazette insolvency notices. **Built but not wired.** |
| `scout-returns.ts` | `/src/lib/` | IRR, equity multiple, DSCR, cashflow projections. Reuse for Financials tab. |
| `hold-sell-model.ts` | `/src/lib/` | 3-scenario modelling (hold, refurb+sell, develop). Reuse for scenario tabs. |
| `avm.ts` | `/src/lib/` | Automated valuation model (3 methods: comps, income cap, replacement). Wire into PropertyValuation. |
| `covenant-check.ts` | `/src/lib/` | Tenant covenant strength checking. Reuse if property has tenant. |
| `land-registry.ts` | `/src/lib/` | Land Registry price paid + title data. Already used in enrich. |

### 2.6 New APIs to build

| API route | Purpose | Data sources |
|-----------|---------|-------------|
| `/api/scope/search` | Search properties by filters (source, asset class, location, price, size, EPC, score) | Query ScoutDeal table with filters |
| `/api/scope/address-lookup` | Geocode address, check DB match, find nearby properties | Google Geocoding → ScoutDeal spatial query |
| `/api/scope/company-lookup` | Look up company by name/number, find owned properties | Companies House API → CCOD cross-ref |
| `/api/scope/enrich` | Full enrichment pipeline (extend existing) | EPC + LR + CH + Gazette + Planning + HE + EA + Google |
| `/api/scope/mandate` | CRUD for saved searches (mandates) | SavedSearch model |
| `/api/scope/mandate/[id]/matches` | Get current matches for a mandate | SavedSearch criteria → ScoutDeal query |
| `/api/scope/alerts` | List alerts for user, mark read, dismiss | AlertEvent model |
| `/api/scope/alerts/check` | Cron job: check mandates against new data, create AlertEvents | SavedSearch → ScoutDeal diff → AlertEvent |
| `/api/scope/pipeline` | CRUD for pipeline deals | UserPipeline model |
| `/api/scope/pipeline/[id]/stage` | Update pipeline stage, log timestamp | UserPipeline update |
| `/api/scope/pipeline/[id]/response` | Log approach response | New PipelineResponse model |
| `/api/scope/pipeline/[id]/note` | Add note to pipeline deal | New PipelineNote model |
| `/api/scope/pipeline/analytics` | Pipeline stats: counts, values, conversion, velocity | Aggregate queries on UserPipeline |
| `/api/scope/watchlist` | CRUD for watched properties | PropertyWatchlist model |
| `/api/scope/export/memo` | Generate investment memo PDF | Puppeteer/react-pdf from dossier data |
| `/api/scope/export/model` | Generate financial model XLSX | ExcelJS from scenario data |
| `/api/scope/export/evidence` | Generate evidence pack PDF | Puppeteer/react-pdf from comps data |
| `/api/scope/export/offer` | Generate formal offer letter PDF | Puppeteer/react-pdf from offer calculator |
| `/api/scope/export/csv` | Export search results or pipeline as CSV | Stream from query |
| `/api/scope/preferences` | CRUD for user preferences (defaults, alerts, portfolio) | AcquisitionStrategy + new UserPreference |
| `/api/scope/portfolio` | CRUD for user's existing portfolio | New PortfolioProperty model |
| `/api/scope/pdf-extract` | Extract address/data from uploaded PDF | pdf-parse + Claude AI extraction |

---

## 3. DATABASE MODELS

### 3.1 Existing models to reuse

| Model | Current use | DealScope use |
|-------|------------|---------------|
| `ScoutDeal` | Stores enriched property data | Same — the central property record. All search, dossier, pipeline reference this. |
| `ScoutUnderwriting` | Financial scenarios | Reuse for Financials tab scenarios. |
| `ApproachLetter` | Generated letters | Reuse for Approach tab. |
| `PropertyValuation` | Valuation results | Wire AVM output here. |
| `PropertyRentGap` | Rent gap analysis | Reuse for income analysis. |
| `UserPipeline` | Pipeline stages | Extend with: mandate reference, notes, response log, follow-up date. |
| `AcquisitionStrategy` | User preferences | Extend for DealScope default criteria. |
| `User` | Auth/profile | Add: approach letter defaults (signatory, company, phone, address). |

### 3.2 New models to create

```prisma
model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String               // "SE Industrial <£800k"
  clientName  String?              // for agents
  criteria    Json                 // {sources:[], assetClasses:[], locations:[], priceMin, priceMax, sizeMin, sizeMax, epcFilter:[], minScore, yieldMin, yieldMax, excludes:[]}
  alertEmail  Boolean  @default(true)
  alertDigest String   @default("daily")  // "daily" | "weekly" | "off"
  alertUrgent Boolean  @default(true)
  alertInApp  Boolean  @default(true)
  paused      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  alerts      AlertEvent[]
}

model AlertEvent {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  mandateId     String?
  mandate       SavedSearch? @relation(fields: [mandateId], references: [id])
  propertyId    String?
  property      ScoutDeal?  @relation(fields: [propertyId], references: [id])
  type          String      // "signal_match" | "price_change" | "status_change" | "deadline" | "portfolio" | "followup" | "completion"
  title         String
  description   String
  metadata      Json?       // {oldPrice, newPrice, daysLeft, etc}
  read          Boolean     @default(false)
  dismissed     Boolean     @default(false)
  snoozedUntil  DateTime?
  createdAt     DateTime    @default(now())
}

model PropertyWatchlist {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  propertyId  String
  property    ScoutDeal @relation(fields: [propertyId], references: [id])
  reasons     String[] // ["price_change", "admin_resolution", "auction_listing"]
  note        String?
  createdAt   DateTime @default(now())
}

model PipelineNote {
  id          String       @id @default(cuid())
  pipelineId  String
  pipeline    UserPipeline @relation(fields: [pipelineId], references: [id])
  content     String
  createdAt   DateTime     @default(now())
}

model PipelineResponse {
  id          String       @id @default(cuid())
  pipelineId  String
  pipeline    UserPipeline @relation(fields: [pipelineId], references: [id])
  status      String       // "interested" | "not_interested" | "maybe" | "no_response"
  note        String?
  followUpDate DateTime?
  createdAt   DateTime     @default(now())
}

model PipelineStageLog {
  id          String       @id @default(cuid())
  pipelineId  String
  pipeline    UserPipeline @relation(fields: [pipelineId], references: [id])
  fromStage   String?
  toStage     String
  createdAt   DateTime     @default(now())
}

model PortfolioProperty {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  address     String
  type        String   // "industrial" | "office" | "retail" | "warehouse" | "mixed" | "residential"
  location    String
  value       Float
  acquiredDate DateTime?
  elevateId   String?  // cross-reference to Elevate
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3.3 Extensions to existing models

Add to `UserPipeline`:
```prisma
  mandateId    String?
  mandate      SavedSearch? @relation(fields: [mandateId], references: [id])
  followUpDate DateTime?
  notes        PipelineNote[]
  responses    PipelineResponse[]
  stageLogs    PipelineStageLog[]
```

Add to `ScoutDeal`:
```prisma
  watchlist    PropertyWatchlist[]
  alerts       AlertEvent[]
  // Ensure signal fields exist:
  signalType   String[]     // ["admin", "auction", "mees", "absent", "probate", "dissolved", "price_drop", "planning"]
  signalScore  Float?       // opportunity score 0-10
  auctionDate  DateTime?
  auctionHouse String?
  auctionLot   String?
```

---

## 4. EXTERNAL DATA SOURCES

| Source | API | What it provides | Cost | Rate limit |
|--------|-----|-----------------|------|------------|
| EPC Register | `epc.opendatacommunities.org` | EPC rating, floor area, recommendations | Free | 5000/day |
| Land Registry (Price Paid) | `landregistry.data.gov.uk` | Sales history, prices, buyers | Free | Unlimited |
| Land Registry (Title) | `use.landregistry.gov.uk` | Title number, tenure, charges | ~£3/title | N/A |
| Companies House | `api.company-information.service.gov.uk` | Company profile, officers, charges, filing history | Free | 600/5min |
| London Gazette | `thegazette.co.uk/api` | Insolvency notices, winding up | Free | Reasonable use |
| Planning (DLUHC) | `planning.data.gov.uk` | Planning applications, decisions | Free | Unlimited |
| Historic England | `historicengland.org.uk/listing/the-list` | Listed buildings, conservation areas | Free | Reasonable use |
| Environment Agency | `environment.data.gov.uk` | Flood risk zones, flood history | Free | Unlimited |
| Google Geocoding | `maps.googleapis.com/maps/api/geocode` | Address → lat/lng | $5/1000 | 50/sec |
| Google Static Maps | `maps.googleapis.com/maps/api/staticmap` | Satellite imagery | $2/1000 | 25000/day |
| CCOD | `use.landregistry.gov.uk/app/nps/olr` | Company-owned property register | ~£1/search | N/A |
| Anthropic Claude | `api.anthropic.com/v1/messages` | Letter generation, AI analysis | Per token | Standard |

---

## 5. PAGE-BY-PAGE SPECIFICATION

### 5.1 Home (`/scope`)

**States:** Active (returning user), Empty (new user), Loading (skeleton)
**Design file:** `batch1a-home-search-states.html` → "Home: Active/Empty/Loading"

**Data required:**
- Source counts (query ScoutDeal grouped by signalType, cached 5min)
- User's mandates (SavedSearch where userId = current)
- Recent alerts (AlertEvent where userId = current, limit 5, ordered by createdAt desc)

**Input bar behaviour:**
- Detects input type by regex:
  - UK postcode pattern (`/[A-Z]{1,2}\d/i`) or contains comma → `/scope/address?q=...`
  - Contains `http` → `/api/scope/enrich` with URL extraction → redirect to `/scope/property/[id]`
  - Otherwise → `/scope/search?q=...` (company name or free text)
- PDF drop → `/api/scope/pdf-extract` → extract address → redirect to enrichment

**Source cards:** Click → navigate to `/scope/search?source=auction` (or admin, mees, etc.)
**Mandate cards:** Click → navigate to `/scope/search?mandate=[id]` (pre-loads saved filters)
**Alert items:** Click → navigate to `/scope/property/[propertyId]`

---

### 5.2 Search (`/scope/search`)

**States:** Initial (no source), Filtered (with results), No results, Loading
**Design file:** `batch1a` → "Search: Initial/Results/None/Loading", `dealscope-v6.html` → search page

**Layout:** Full-width source hero bar at top, then filters sidebar (260px) + results area below.

**Query params:**
- `?source=auction,admin` — pre-selected sources
- `?mandate=[id]` — load saved search criteria
- `?q=...` — free text search within results

**Filter state:** All filters stored in URL query params for shareability and back-button support.

**API call:** `GET /api/scope/search?sources=auction&assetClasses=industrial&locations=south_east,london&priceMax=800000&epcFilter=fg&minScore=5&sort=relevance&page=1&limit=20`

Returns: `{ results: ScoutDeal[], total: number, facets: { sources: {auction: 47, admin: 23, ...}, assetClasses: {...}, ... } }`

**Save as mandate:** POST to `/api/scope/mandate` with current filter state as criteria JSON.

---

### 5.3 Address Results (`/scope/address`)

**States:** Found (match + nearby), Not found (analyse + nearby), Ambiguous (disambiguation), Loading
**Design file:** `batch1a` → "Address: Found/NotFound/Ambiguous/Loading"

**Flow:**
1. `GET /api/scope/address-lookup?q=Rochester+Kent+ME2`
2. Geocode → get lat/lng
3. Check ScoutDeal for exact match (address fuzzy match or postcode exact)
4. Query ScoutDeal for nearby (within 3 miles, matching user's default criteria)
5. Return: `{ exact: ScoutDeal | null, nearby: ScoutDeal[], ambiguous: Address[] | null }`

**"Analyse this property" button:** Triggers enrichment → shows enrichment progress → redirects to dossier.

---

### 5.4 Company Results (`/scope/company/[id]`)

**Design file:** `batch1a` → "Company: Found/NotFound"

**Flow:**
1. `GET /api/scope/company-lookup?q=Meridian+Property+Holdings` OR `?number=05847291`
2. Companies House API → full profile
3. CCOD cross-reference → find all properties owned
4. Return: `{ company: CHProfile, properties: ScoutDeal[] }`

**"Portfolio opportunity" card:** If multiple properties share same owner and are in distress, show combined value and suggest bulk approach.

---

### 5.5 Dossier (`/scope/property/[id]`)

**Design file:** `batch1b-dossier-full.html` — all 7 tabs + partial data state

**This is the largest page.** Each tab maps to specific data sources:

| Tab | Data sources | Key fields |
|-----|-------------|------------|
| Property | EPC API, Google (satellite/street), brochure extraction | Specs, images, EPC rating, upgrade path, MEES status |
| Planning | planning.data.gov.uk, council API | Zone, use class, PD rights, restrictions, history |
| Title & Legal | Land Registry (title + price paid), Historic England | Title number, tenure, owner, covenants, sales history, charges, heritage status |
| Environmental | Environment Agency, BGS | Flood zones, contamination, radon, subsidence, asbestos risk |
| Ownership | Companies House, Gazette, CCOD | Company profile, directors, charges, gazette notices, other properties |
| Financials | AVM lib, returns lib, hold-sell model, LR comps | 3 valuations, 3 scenarios, cost breakdown, cashflow, IRR, sliders, comps table, downloads |
| Approach | Claude AI, letter API | Approach type selection, AI letter gen, tone/channel, send & track, DD checklist, leverage, offer calculator |

**Enrichment flow:** If property is new (no enrichment yet), show enrichment progress modal (`batch1a` → "Enrichment"). Each data source completes independently — show partial dossier as sources complete.

**Interactive elements:**
- Financials sliders: purchase price, rent growth, exit yield, LTV, interest rate, hold period, void months → all financials recalculate client-side using the returns lib
- Planning rows: click to expand full description/decision reason
- DD checkboxes: click to mark done, updates remaining cost total
- Gallery images: click to open lightbox (`batch3-5` → "Lightbox")

**Sidebar:** Actions (approach, pipeline, watch, export), mandate match context, data source status, related properties.

---

### 5.6 Pipeline (`/scope/pipeline`)

**Design file:** `batch1c` → "Pipeline: Active/Empty/CardDetail/Analytics"

**Columns:** Identified → Researched → Approached → Negotiating → Under Offer → Completing

**Data:** `GET /api/scope/pipeline?mandate=all` → returns UserPipeline[] with ScoutDeal, mandate, notes, responses, stage logs.

**Card detail modal:** Click card → show quick view with stage timeline, move-to-stage chips, log response buttons, notes, follow-up date picker.

**Drag-and-drop:** Use `@dnd-kit/core` or similar. On drop: `PATCH /api/scope/pipeline/[id]/stage` with new stage → creates PipelineStageLog entry.

**Analytics view:** Aggregate queries — conversion funnel, time-in-stage, pipeline-by-mandate.

---

### 5.7 Alerts (`/scope/alerts`)

**Design file:** `batch1c` → "Alerts: Active/Empty/AllRead"

**7 alert types** (each with distinct icon + colour):
1. `signal_match` — red `!` — new property matches mandate
2. `price_change` — amber `↓`/`↑` — watched property price changed
3. `status_change` — red `⟳` — company status changed (admin, dissolved)
4. `deadline` — amber `⏱` — auction approaching
5. `portfolio` — green `◎` — diversification opportunity
6. `followup` — blue `↻` — approach follow-up due
7. `completion` — green `✓` — deal completing

**Alert generation (cron job):** `/api/scope/alerts/check` runs every 15 min:
1. For each active SavedSearch, query ScoutDeal for new matches since last check
2. For each watched property, check for price/status changes
3. For each pipeline deal in "Approached" stage, check if follow-up date has passed
4. Create AlertEvent records
5. If user has email alerts enabled, queue email digest

---

### 5.8 Settings (`/scope/settings`)

**Design file:** `batch1c` → "Settings" (5 sub-sections)

**Sections:** Default criteria, Alert preferences, Portfolio, Profile, Manage mandates

**Portfolio sync:** "Sync from Elevate" button calls Elevate API to pull user's existing portfolio properties.

---

## 6. COMPONENT LIBRARY

Build these as reusable React components:

| Component | Used in | Props |
|-----------|---------|-------|
| `<SourceCard>` | Home, Search | count, label, active, live, onClick |
| `<MandateCard>` | Home, Settings | mandate, newCount, onClick |
| `<ResultCard>` | Search, Address, Company | property, selected, onSelect, onClick |
| `<DossierHeader>` | Dossier | property, score, actions |
| `<KanbanColumn>` | Pipeline | stage, deals, onDrop |
| `<KanbanCard>` | Pipeline | deal, onClick, onDrag |
| `<AlertItem>` | Alerts, Home | alert, onClick, onDismiss, onSnooze |
| `<ChipFilter>` | Search, Settings, Mandate wizard | label, active, color, onClick |
| `<RangeSlider>` | Search, Settings, Financials | min, max, value, onChange, label |
| `<ScoreRing>` | Dossier header, Cards | score, size |
| `<SignalBadge>` | Everywhere | type ("admin"/"auction"/"mees"/etc) |
| `<Toast>` | Global | type, title, desc, onClose, duration |
| `<Modal>` | Actions | size, title, children, footer |
| `<ConfirmModal>` | Delete, Archive | title, desc, danger, onConfirm |
| `<EmptyState>` | All pages | icon, title, desc, actions |
| `<Skeleton>` | All pages | type ("card"/"line"/"block") |
| `<EnrichmentProgress>` | Dossier loading | steps[], currentStep |
| `<ImageGallery>` | Dossier Property tab | images[], onOpen |
| `<Lightbox>` | Dossier | images[], currentIndex, onClose |
| `<PlanningRow>` | Dossier Planning tab | application, expandable |
| `<DDChecklist>` | Dossier Approach tab | items[], onToggle |
| `<ContextMenu>` | Search, Pipeline | items[], position, onSelect |
| `<BulkActionBar>` | Search | selectedCount, totalValue, actions |

---

## 7. DESIGN SYSTEM

**Colours (CSS variables):**
```css
--bg: #06060a;  --s1: #0d0d14;  --s2: #15151e;  --s3: #1f1f2c;  --s4: #2a2a3a;
--acc: #7c6af0;  --acc2: #a899ff;  --accd: rgba(124,106,240,.08);
--tx: #e8e8f0;  --tx2: #8e8ea0;  --tx3: #555566;
--grn: #2dd4a8;  --red: #f06060;  --amb: #eab020;  --blu: #5599f0;
```

**Typography:**
- Display: Instrument Serif (headings, page titles, product name)
- Body: DM Sans (everything else)
- Numbers: JetBrains Mono (prices, scores, stats, dates)

**Animations:**
- Page elements: fadeUp (translateY 12px → 0, opacity 0 → 1, 0.4-0.5s ease)
- Staggered delays: 0.04s increments (a1=0.04s, a2=0.08s, etc.)
- Input glow: on focus, border-color → accent, box-shadow pulsing glow
- Card hover: translateY(-1-2px), box-shadow deepens, border-color → accent
- Score ring: green glow box-shadow when score > 7
- Alert badge: liveDot animation (expanding ring fade-out, 2s infinite)
- Loading: shimmer (background-position slide, 1.5s infinite)

---

## 8. DESIGN FILE INDEX

| File | Contents | States |
|------|----------|--------|
| `dealscope-v6.html` | Complete product mockup (reference design) | Home, Search, Address, Dossier, Pipeline, Alerts, Settings |
| `batch1a-home-search-states.html` | Home (3), Search (4), Address (4), Company (2), Enrichment, Onboarding (3) | 17 states |
| `batch1b-dossier-full.html` | Full dossier — 7 tabs + partial data | 8 states |
| `batch1c-pipeline-alerts-settings.html` | Pipeline (4), Alerts (3), Settings (5 sections) | 8 states |
| `batch2-actions-exports.html` | Send confirm, success, pipeline add, watch, log response, bulk approach, PDF previews (3), gen progress (3), toasts (9), delete confirms (3) | 13 states |
| `batch3-5-remaining.html` | Errors (6), Onboarding 4-5 + done, Emails (3), Bulk select, Lightbox, Context menus, Mandate wizard | 17 states |
| `DEALSCOPE-GAP-ANALYSIS.md` | Code audit, gap analysis, migration plan | Reference |
| `DEALSCOPE-DESIGN-INVENTORY.md` | Complete inventory of ~160 designs needed | Checklist |

**Total designed states: 63**

---

## 9. BUILD ORDER

### Phase 1: Foundation (Week 1)
1. Create new Prisma models (SavedSearch, AlertEvent, PropertyWatchlist, PipelineNote, PipelineResponse, PipelineStageLog, PortfolioProperty)
2. Run migration
3. Wire Companies House + Gazette into existing enrich route
4. Wire AVM into PropertyValuation
5. Build `/api/scope/search` endpoint
6. Build `/api/scope/address-lookup` endpoint
7. Build Home page (`/scope`) with source cards + mandate cards
8. Build Search page (`/scope/search`) with source hero + filter sidebar + results

### Phase 2: Dossier (Week 2)
9. Build Dossier page (`/scope/property/[id]`) with 7 tabs
10. Wire each tab to its data sources
11. Build enrichment progress modal
12. Build image gallery + lightbox
13. Build Financials tab with live sliders (client-side recalculation)
14. Build Approach tab with letter generation (reuse existing API)

### Phase 3: Pipeline + Alerts (Week 3)
15. Replace pipeline API stubs with real Prisma queries
16. Build Pipeline page (`/scope/pipeline`) with kanban
17. Build card detail modal with stage history, notes, responses
18. Build Alerts page (`/scope/alerts`)
19. Build alert generation cron job
20. Build email digest + urgent alert email templates (use React Email or similar)

### Phase 4: Actions + Exports (Week 4)
21. Build send approach confirmation modal + success state
22. Build watch property modal
23. Build log response modal
24. Build create mandate wizard
25. Build PDF generation (investment memo, evidence pack, offer letter)
26. Build XLSX generation (financial model, comps pack)
27. Build CSV export
28. Build toast notification system

### Phase 5: Polish (Week 5)
29. Build onboarding flow (5 steps)
30. Build Settings page (5 sections)
31. Build bulk select + bulk approach
32. Build context menus
33. Build all error states and edge cases
34. Build empty states for all pages
35. Update sidebar navigation to point to new routes
36. QA: test every state against design files
37. Cut-over: retire old /scout and /dealscope nav items

---

## 10. INTEGRATION POINTS

### 10.1 DealScope → Elevate
- **Portfolio sync:** Elevate provides property-level cost data. DealScope's Settings > Portfolio > "Sync from Elevate" pulls PortfolioProperty records.
- **Cost optimisation card:** In Dossier Financials tab, show "Elevate can reduce costs by X%" with link to Elevate for that property.
- **Elevate → DealScope:** When a property completes acquisition in DealScope pipeline, auto-create it in Elevate portfolio.

### 10.2 Email integration
- **Daily digest:** Cron job at 8am. Query AlertEvents from last 24h. Render React Email template. Send via Resend/SendGrid.
- **Urgent alerts:** Real-time. When AlertEvent with type `signal_match` (admin filing) or `deadline` (<48h) is created, immediately send email.
- **Approach letter dispatch:** For "Post + PDF" channel, generate PDF and queue for print service or email as attachment.

### 10.3 Claude AI integration
- **Letter generation:** Already built at `/api/dealscope/letter`. System prompt includes property data, recipient context, tone preference.
- **AI analysis summary:** New. On enrichment complete, call Claude with all property data → generate the narrative summary shown at top of Property tab.
- **PDF extraction:** New. When user drops a PDF, call Claude with extracted text → identify address, property details, auction lot info.

---

## 11. PIPELINE STAGES (state machine)

```
Identified → Researched → Approached → Negotiating → Under Offer → Completing → [Completed | Archived]
                                                                                    ↓
                                                                               [Fallen Through] → Identified (re-enter)
```

**Any stage can also → Archived** (soft delete, restorable)

**Stage change side-effects:**
- Identified → Researched: no side effects
- Researched → Approached: must have approach letter sent (enforced in UI)
- Approached → Negotiating: requires logged response ("Interested")
- Negotiating → Under Offer: requires offer details (price, deposit, completion date)
- Under Offer → Completing: requires exchange confirmation
- Completing → Completed: requires completion date + final price

---

## 12. SCORING ALGORITHM (opportunity score)

The opportunity score (0-10) is calculated from weighted signals:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Administration | +2.0 | Active admin = +2 |
| MEES non-compliance | +1.5 | EPC F = +1.5, EPC G = +2.0 |
| Absent owner | +1.0 | Absent >2yr = +1.0, >5yr = +1.5 |
| Price below market | +2.0 | Linear: 10% below = +0.5, 30% below = +2.0 |
| Auction (approaching) | +1.0 | <7 days = +1.0, <30 days = +0.5 |
| Dissolved company | +1.0 | Active dissolution = +1.0 |
| Probate | +0.5 | Probate filed = +0.5 |
| Clean title | +0.5 | No restrictions, clean covenants = +0.5 |
| Portfolio fit | +0.5 | Diversifies user's portfolio = +0.5 |

Score = sum of applicable factors, capped at 10.0

---

## 13. TESTING CHECKLIST

For each page, verify against the design files:

- [ ] Active state matches design
- [ ] Empty state matches design
- [ ] Loading state shows skeleton
- [ ] Error states show appropriate banners/messages
- [ ] All interactive elements work (chips toggle, sliders update, modals open/close)
- [ ] Navigation between pages works (back buttons, breadcrumbs)
- [ ] Data flows correctly from API to UI
- [ ] Toast notifications appear on actions
- [ ] Mobile responsive (not in designs but should degrade gracefully)
- [ ] Dark theme consistent (all colours use CSS variables)
- [ ] Animations play on page load (staggered fadeUp)
- [ ] Score ring colour changes based on value (green >7, amber 5-7, red <5)
- [ ] Pipeline drag-and-drop works between columns
- [ ] Financial sliders recalculate all values in real time
- [ ] PDF/XLSX generation produces correct output
- [ ] Email templates render correctly in Gmail/Outlook

---

*This document + the 6 design HTML files + the gap analysis document constitute the complete specification for DealScope. Build it.*
