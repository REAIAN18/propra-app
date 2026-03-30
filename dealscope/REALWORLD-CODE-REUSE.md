# DealScope vs Scout: Code Reuse Analysis

## Executive Summary

**Scout already exists.** It's an acquisition platform with:
- Deal sourcing (LoopNet integration)
- Underwriting (3-scenario financial modeling)
- LOI generation
- Pipeline tracking
- Investor outreach

**DealScope is a spinoff of Scout** that:
- Adds intelligent rent gap detection (is gap condition-driven or market-driven?)
- Adds market data-driven yield calculation with user learning
- Adds approach letter generation (Claude AI, personalized per owner)
- Adds bulk auction import
- Rebrands Scout as a standalone product
- Keeps the same database tables, auth, design system, etc.

---

## 1. WHAT EXISTS IN SCOUT (Can Reuse)

### Frontend Pages

```
/scout
  ├── /page.tsx (821 lines) — Scout deals list + pipeline
  └── /[dealId]/
      ├── /underwrite/page.tsx (551 lines) — Financial modeling
      ├── /finance/page.tsx — Deal financing
      └── /equity/page.tsx — Equity structure
```

### Backend APIs

```
/api/scout/
  ├── /deals (GET: list deals, POST: create)
  ├── /deals/[dealId]/
  │   ├── /underwrite (GET: get underwrite, POST: save)
  │   ├── /finance (GET/POST: financing details)
  │   ├── /loi (POST: generate LOI)
  │   ├── /im (POST: generate investment memo)
  │   ├── /teaser (POST: generate teaser)
  │   ├── /send-teaser (POST: send via email)
  │   ├── /express-interest (POST: track interest)
  │   ├── /pipeline (GET/POST: pipeline status)
  │   └── /investors/
  │       ├── / (GET: list investors, POST: add)
  │       └── /[outreachId] (PATCH: update outreach)
  └── /loopnet-sync (POST: sync from LoopNet)
```

### Database Models (Existing)

- **ScoutDeal** — Deal metadata (address, price, cap rate, asset type, etc.)
- **ScoutReaction** — User actions on deals (interested, not, etc.)
- **ScoutUnderwriting** — Financial scenarios saved per deal
- **ScoutLOI** — Generated LOI documents
- **HoldSellScenario** — Financial scenario modeling (reusable)
- **VendorApproach** — Outreach tracking (investor contact records)

### Libraries (Existing & Reusable)

- **scout-returns.ts** — Calculate IRR, cap rate, cash-on-cash, equity multiple
  - Uses 5-year hold, 65% LTV, 2.5% rent growth assumptions
  - Perfect for DealScope scenarios

- **hold-sell-model.ts** — DCF (discounted cash flow) modeling
  - Calculates IRR, equity multiple, cash-on-cash
  - Can be extended for scenario comparison

- **avm.ts** — Valuation (AVM = Automated Valuation Model)
  - Comparable sales analysis
  - Price per sqft calculations

- **covenant-check.ts** — Company strength analysis (Companies House lookup)
  - Used for tenant/owner covenant assessment

- **brochure.ts / brochure-template.ts** — Document generation pipeline
  - Can be extended for approach letters

- **enrich-asset.ts** — Property enrichment (public data lookups)
  - Might already pull CCOD, Land Registry, etc.

---

## 2. WHAT'S MISSING (DealScope Adds)

### New Data Ingestion

- **Bulk auction import** (PDF/CSV upload + parsing)
  - Scout doesn't have this (currently demo deals only)
  - DealScope needs CSV parser + deduplication

- **Portal scraping** (Rightmove, Zoopla, LoopNet)
  - Scout has LoopNet sync, but not other portals
  - DealScope adds Rightmove/Zoopla scrapers

- **Public API integrations** (CCOD, Land Registry, EPC, Planning, EA, Probate)
  - Scout may do some of this in enrich-asset.ts, but DealScope expands it
  - Need to check what's already integrated

### Intelligent Features

- **Rent gap detection**
  - Auto-compare current rent vs. market ERV
  - Detect over-rent / under-rent
  - NOT in Scout

- **Condition vs. market positioning guess**
  - EPC rating analysis
  - Building age analysis
  - Occupancy analysis
  - Tenant strength analysis
  - NOT in Scout

- **Intelligent scenario generation**
  - If condition-driven: Conservative / Retrofit to compliance / Retrofit to premium
  - If market-driven: Owner-occupy / Hold as-is / Alternative play
  - Scout generates scenarios, but doesn't auto-select based on property type

- **Yield calculation with breakdown**
  - Base yield table (property type)
  - Tenant strength adjustment
  - Lease length adjustment
  - Over/under-rent adjustment
  - User can override each component
  - System learns from overrides
  - Scout has cap rate, but not this intelligent yield system

- **Reversion modeling**
  - Model rent at lease end
  - Calculate reversion value
  - Show headline vs. reversion
  - Scout may have this, need to check

- **Market data calibration**
  - Auto-update yield table from CoStar/agent reports
  - Learn from user overrides
  - NOT in Scout

### New UI/Workflow

- **Search interface** (50+ filters, results ranking, alerts)
  - Scout shows deals list, but not a full search interface
  - DealScope needs full search (location, type, opportunity, signals)

- **Headline card** (5-second decision view)
  - Scout shows deals, but not this quick-glance card
  - DealScope adds

- **Full dossier** (tabs with all intelligence)
  - Scout shows underwrite, but not comprehensive property intelligence
  - DealScope expands this

- **Approach letter generator** (Claude AI, personalized, not template)
  - Scout has LOI generation (template-based)
  - DealScope adds AI-powered approach letters (Claude)

- **Bulk import workflow** (upload → parse → enrich → search)
  - Scout doesn't have this
  - DealScope adds

---

## 3. DATABASE REUSE

### Tables to Reuse

- **User** — Authentication & user data (already exists)
- **ScoutDeal** — Can be extended to include all property data (CCOD, Land Registry, EPC, etc.)
  - Current: address, price, cap rate, noi, asset type
  - Extend: epc_rating, year_built, building_size_sqft, owner_company_id, tenure, current_rent, market_rent, etc.

- **ScoutUnderwriting** — Financial scenarios (already exists)
  - Can store condition vs. market guess
  - Can store user yield overrides
  - Can store reversion calculations

- **HoldSellScenario** — DCF modeling (already exists)
  - Can be reused for DealScope scenarios

- **VendorApproach** — Outreach tracking (already exists)
  - Can store approach letters, responses, follow-up dates

- **Lease** — Tenant lease data (already exists)
  - Current fields: start date, end date, rent, renewal terms
  - Extend: lease_length_years, break_dates, tenant_covenant_strength, over_under_rent, market_rent

- **Tenant** — Tenant company info (already exists)
  - Can extend with covenant strength calculations

### New Tables to Create

- **PropertyEnrichment** — Cache of CCOD, Land Registry, EPC, Companies House lookups
  - Avoid repeated API calls
  - Track data freshness

- **ScoutAlert** — Saved searches + alert configuration
  - Filter criteria
  - Alert frequency
  - Match count

- **YieldLearning** — User's yield adjustments over time
  - Log every time user overrides a yield component
  - Track which properties they did it on
  - Use for trend analysis / learning

- **AuctionImport** — Bulk auction uploads
  - File name, import date, property count, duplicate count
  - Link to imported properties

---

## 4. API REUSE

### Existing APIs (Check if we can reuse)

- **GET /api/property/lookup** — Geocoding + ATTOM data
  - Probably pulls property basics
  - DealScope should extend to pull CCOD, Land Registry, EPC, Companies House

- **GET /api/property/satellite** — Google Maps satellite image
  - Reuse for property images

- **GET /api/property/autocomplete** — Google Places autocomplete
  - Reuse for address input

- **POST /api/scout/deals** — Create deal
  - Can be reused or extended

- **GET /api/scout/deals** — List deals
  - Extend with DealScope filters (location, type, opportunity, signals)

- **GET /api/user/assets** — User's portfolio
  - Reuse for existing property context (if user is adding Scout property from portfolio)

### New APIs to Build

- **POST /api/dealscope/search** — Advanced search with 50+ filters
  - Query CCOD + Land Registry + EPC + Planning + EA + Probate
  - Rank by signal strength
  - Return paginated results

- **GET /api/dealscope/property/[address]** — Full property dossier
  - Pull all enriched data
  - Calculate valuations
  - Generate scenarios
  - Return complete dossier

- **POST /api/dealscope/scenarios** — Auto-generate 3 scenarios
  - Detect rent gap
  - Guess condition vs. market
  - Generate 3 paths
  - Calculate IRR/cap/DSCR for each

- **POST /api/dealscope/letter** — Generate approach letter
  - Call Claude API
  - Personalize per owner situation
  - Return letter text

- **POST /api/dealscope/import** — Bulk auction import
  - Parse PDF/CSV
  - Deduplicate
  - Enrich properties
  - Load into search

- **POST /api/dealscope/yield-override** — Log user's yield adjustments
  - Track override (e.g., "tenant adjusted from -0.5% to -0.8%")
  - Use for learning

---

## 5. CODE MIGRATION PLAN

### Phase 1: Reuse Scout Code (This Week)

1. **Clone Scout pages + rename to DealScope**
   - `/scout/page.tsx` → `/dealscope/page.tsx`
   - `/scout/[dealId]/underwrite/page.tsx` → `/dealscope/[dealId]/underwrite/page.tsx`

2. **Extend Scout database tables**
   - Add fields to ScoutDeal (epc_rating, year_built, building_size_sqft, owner_company_id, etc.)
   - Extend ScoutUnderwriting to store yield overrides + reversion models

3. **Reuse Scout libraries**
   - scout-returns.ts (IRR, cap rate, cash-on-cash)
   - hold-sell-model.ts (DCF modeling)
   - avm.ts (valuation by comps)
   - covenant-check.ts (tenant/owner strength)

4. **Build DealScope-specific features**
   - Rent gap detection (new lib: rent-gap-analysis.ts)
   - Intelligent scenario generation (new lib: scenario-generator.ts)
   - Yield calculation with breakdown (extend scout-returns.ts)
   - Approach letter generation (new lib: approach-letter.ts calling Claude API)

5. **New APIs**
   - /api/dealscope/search — replaces /api/scout/deals for advanced filtering
   - /api/dealscope/property/[address] — dossier
   - /api/dealscope/scenarios — scenario generation
   - /api/dealscope/letter — letter generation
   - /api/dealscope/import — bulk import

### Phase 2: Add Intelligence (Post-Demo)

1. **Market data feeds**
   - CoStar integration (if subscribed)
   - Agent report scraping
   - User transaction tracking

2. **Learning system**
   - Aggregate user yield overrides
   - Auto-update yield tables
   - Show calibration trend to user

3. **Advanced scraping**
   - Rightmove, Zoopla, LoopNet automation
   - Agent site scraping (C&W, KF, JLL)
   - Probate + bridging loan tracking

---

## 6. DESIGN SYSTEM REUSE

- Dark theme already established (--bg, --s1, --s2, --acc, --grn, --red)
- Fonts (Instrument Serif, DM Sans, JetBrains Mono) already in place
- Component library (buttons, cards, badges) can be reused
- RealHQ navbar + sidebar nav structure can be extended for DealScope routes

---

## 7. AUTHENTICATION & USER CONTEXT

- NextAuth already set up
- User context available
- User assets linked to User model
- Scout deals linked to User
- DealScope inherits all of this

---

## UPDATED CHECKLIST: REUSE vs. BUILD

### Reuse from Scout (No work)
- ✅ Authentication (NextAuth)
- ✅ User model + session management
- ✅ Dashboard layout
- ✅ Dark theme design system
- ✅ Database infrastructure (Supabase, Prisma)
- ✅ IRR/cap rate calculation (scout-returns.ts)
- ✅ DCF modeling (hold-sell-model.ts)
- ✅ Valuation by comps (avm.ts)
- ✅ Covenant checking (covenant-check.ts)
- ✅ Document generation framework (brochure.ts)

### Extend Scout (Modify existing)
- 🔧 ScoutDeal table → add epc_rating, year_built, building_size_sqft, owner_company_id, tenure, current_rent, market_rent
- 🔧 ScoutUnderwriting → store yield overrides + reversion models + condition vs. market guess
- 🔧 /api/scout/deals → extend with DealScope filters (location, type, opportunity, signals)
- 🔧 scout-returns.ts → add yield calculation with component breakdown + user overrides
- 🔧 Pages structure → extend nav to include /dealscope routes

### Build New (DealScope-specific)
- 🆕 Rent gap detection lib (rent-gap-analysis.ts)
- 🆕 Intelligent scenario generator (scenario-generator.ts)
- 🆕 Approach letter generation (approach-letter.ts + Claude API)
- 🆕 Bulk import workflow (/api/dealscope/import)
- 🆕 Advanced search (/api/dealscope/search with 50+ filters)
- 🆕 Portal scrapers (Rightmove, Zoopla — Phase 2)
- 🆕 Public API integrations (CCOD, Land Registry, EPC, Companies House, Planning, EA, Probate)
- 🆕 Yield learning system (track overrides, update tables — Phase 2)
- 🆕 UI screens (Search, Headline Card, Dossier, Underwrite, Pipeline, Letter Generator, Response Tracking)

---

## REVISED BUILD CHECKLIST

**For this week's demo:**

Instead of building from scratch, you're:
1. **Extending Scout** (add new database fields, extend existing APIs)
2. **Adding DealScope features** (rent gap detection, intelligent scenarios, yield breakdown, letter generation)
3. **Building DealScope UI** (7 screens, mostly reusing Scout components)
4. **Integrating public APIs** (CCOD, Land Registry, EPC, Companies House, Planning, EA, Probate)

This is **30-40% less work** than building DealScope from scratch, because Scout already has the underwriting engine.

---

## Final Word

**DealScope is Scout 2.0**, not a separate product. It reuses Scout's database, APIs, and financial modeling, then adds:
- Intelligent property discovery (search + signals + rent gap detection)
- Smart scenario generation (condition vs. market positioning)
- User-driven yield learning (override + calibrate)
- Personalized outreach (Claude AI approach letters)

This positioning makes it easier to build, but clearer to investors why it's valuable.
