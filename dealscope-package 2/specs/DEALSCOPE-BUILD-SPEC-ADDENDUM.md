# DealScope Build Spec: Addendum

> **This amends DEALSCOPE-BUILD-SPEC.md** with discovered infrastructure, the new Market Intelligence tab, rental evidence exports, and corrected error handling.

---

## A1. ADDITIONAL EXISTING INFRASTRUCTURE (discovered in code audit)

The original spec undercounted what's already built. Here's the full inventory:

### A1.1 Libraries NOT previously listed but available

| Library | Lines | What it does | DealScope use |
|---------|-------|-------------|---------------|
| `enrich-asset.ts` | 287 | Full geocoding pipeline (Google → Nominatim fallback), UK postcode detection, asset enrichment orchestrator | **Core of the enrichment flow.** Already handles address → lat/lng → data fetch. Extend for new sources. |
| `company-intelligence.ts` | 178 | Multi-source company lookup: Companies House (UK), Sunbiz (FL), D&B stub. Routes by country. | Reuse for Ownership tab. Already integrates with `covenant-check.ts`. |
| `planning-feed.ts` | 370 | UK planning data from `planning.data.gov.uk` + `postcodes.io` geocoding. Fetches nearby applications, normalises status. | **Reuse directly for Planning tab.** Already handles the API calls and data normalization. |
| `planning-classifier.ts` | 179 | Classifies planning application types (major/minor/householder), normalises status codes. | Used by `planning-feed.ts`. No changes needed. |
| `dev-potential.ts` | 261 | Development potential assessment: site coverage, PD rights classification (UK GPDO + US zoning), change-of-use scoring, air rights. Uses Claude Haiku for narrative fields. | Reuse for Planning tab PD rights section. Already classifies Class MA, Class E, Article 4. |
| `dealscope-comps.ts` | 124 | Comparable property search for DealScope deals | Reuse for Financials tab comps table. |
| `dealscope-epc.ts` | 162 | EPC register API calls, rating parsing, recommendation extraction | Already used in enrich route. Provides EPC upgrade path data. |
| `brochure.ts` / `brochure-template.ts` | ~200 | PDF brochure generation (Puppeteer) | Reuse pattern for investment memo + evidence pack PDF generation. |
| `document-parser.ts` | ~100 | PDF text extraction | Reuse for uploaded PDF address extraction. |
| `email.ts` | ~80 | Email sending infrastructure | Reuse for alert digest + urgent alert emails. |
| `data/scout-benchmarks.ts` | 246 | Market cap rates by submarket + asset type (UK: se_uk, london; US: fl_us, tx_us). ERV benchmarks. Updated quarterly. | **Critical for Market Intelligence tab.** Provides yield context, sector benchmarks. |
| `data/financing.ts` | 242 | Per-asset loan data: LTV, ICR, rates, covenants, debt service, maturity. | Reuse for financing environment analysis. Already has current market rate data. |
| `data/acquisitions.ts` | 94 | Acquisition pipeline helper functions | Utility functions for pipeline calculations. |
| `opportunity.ts` | 14 | Opportunity scoring (basic) | Extend significantly for the 0-10 opportunity score. |

### A1.2 Existing Prisma models NOT previously listed but useful

| Model | What it has | DealScope use |
|-------|------------|---------------|
| `MacroRate` | SOFR/SONIA rates, daily updates from FRED | **Market Intelligence tab** — base rate, swap rates, rate trend. Already stores time-series data. |
| `PropertyComparable` | Sale comps per asset (from Attom/LR) | Reuse for comparable sales in Financials + Market Intelligence tabs. |
| `DealFinanceModel` | Full deal-level finance model data | Reuse/extend for Financials tab scenario modelling. |
| `HoldSellScenario` | Per-deal hold/sell/develop scenario outputs | Already stores the 3-scenario analysis. Wire into Financials tab. |
| `PlanningApplication` | Planning applications per property | Reuse for Planning tab. May need to extend for expanded detail fields. |
| `Loan` | Loan-level data per property | Wire into Title & Legal tab for charges register + Market Intelligence for financing context. |
| `Acquisition` | Acquisition targets with scores, yields, asset type | Similar to ScoutDeal — may be the US-market equivalent. Check for duplication. |
| `VendorApproach` | Vendor/owner approach records | Already on ScoutDeal. Reuse for approach tracking. |
| `ScoutComparable` | Sale comps specific to Scout deals | Already related to ScoutDeal. Reuse for comps table. |
| `EmailTracking` | Email send/open/click tracking | Reuse for approach letter tracking (sent, opened, response). |
| `Document` / `DocumentExtract` | Uploaded document storage + extraction | Reuse for PDF upload + extraction flow. |
| `ClientPortfolio` | Portfolio groupings | May map to our PortfolioProperty concept. Check structure. |

### A1.3 ScoutDeal already has rental fields

The existing ScoutDeal model already stores:
```
currentRentPsf    Float?   // Current rent per sqft
marketRentPsf     Float?   // Market rent per sqft  
occupancyPct      Float?   // Occupancy percentage
leaseLengthYears  Float?   // Current lease length
breakDates        Json?    // Array of break dates
tenantCompanyId   String?  // Tenant company reference
tenantCovenantStrength String?  // "strong" | "satisfactory" | "weak"
```

**This means rental analysis data is already modelled.** We just need to populate it during enrichment and display it.

---

## A2. NEW DOSSIER TAB: MARKET INTELLIGENCE

**Design file:** `batch-updates-market-errors.html` → "Market Intelligence tab"

The dossier now has **8 tabs** (not 7):
```
Property | Planning | Title & Legal | Environmental | Ownership | Financials | Market | Approach
```

**"Market" tab contains:**

### A2.1 Macro environment
- Bank of England base rate (from `MacroRate` model — already stores SONIA daily)
- 5yr SONIA swap rate
- CPI inflation
- GDP growth
- Unemployment
- Rate cuts priced

**Data source:** `MacroRate` model already exists and stores FRED data. Need to add UK-specific series (BoE base rate, CPI, GDP) alongside SOFR.

### A2.2 Sector analysis
- Prime/secondary yields for the property's sector + region (from `scout-benchmarks.ts`)
- Yield movement (12m trend)
- ERV benchmarks (from `scout-benchmarks.ts`)
- Rental growth trend
- Vacancy rate (submarket)
- Take-up volume
- New supply pipeline
- Supply/demand ratio
- Transaction volume
- Average time to let

**Data source:** `scout-benchmarks.ts` already has market cap rates by submarket and asset type (se_uk: industrial 5.25%, warehouse 5.25%, office 6.50%, retail 7.50%). Need to extend with vacancy, take-up, and supply data. Consider CoStar API integration for live market data.

### A2.3 Rental evidence (comparable lettings)
- Table of 6+ comparable lettings within radius
- Columns: property, type, size, rent pa, £/sqft, lease terms, break clauses, date, distance
- Summary: average rent, range, subject ERV estimate

**Data source:** New. Need to source from EGi/CoStar or build from collected data. For MVP, manual input or Claude AI estimation from market reports. PropertyRentGap model already stores current vs market rent.

### A2.4 Demand indicators
- Active tenant requirements by size band
- Market strength indicators (demand depth, rental growth, vacancy pressure, supply risk, finance availability, economic headwinds)
- Average letting time

**Data source:** New. For MVP, derive from vacancy rate + take-up data. For production, CoStar/EGi API.

### A2.5 Financing environment
- Current market rates for equivalent debt
- Typical spreads
- All-in rate analysis
- ICR stress testing at different rates
- Rate scenario impact on IRR
- Break-even rate calculation

**Data source:** `financing.ts` already has market rate data + ICR/LTV calculations. `MacroRate` has daily rate data. Wire both into this section.

### A2.6 Sector news & intelligence
- Relevant planning approvals nearby (from `planning-feed.ts`)
- MEES deadline context (from DealScope signal analysis)
- Insolvency trends (from Gazette monitoring)
- AI-generated sector commentary (Claude)

**Data source:** Combination of `planning-feed.ts` output, Gazette analysis, and Claude AI narrative generation.

---

## A3. UPDATED EXPORT LIST

### A3.1 New exports (rental evidence + market)

| Export | Format | Contents |
|--------|--------|----------|
| Rental evidence pack | xlsx | 6+ comparable lettings, rent/sqft, lease terms, trend analysis |
| Market benchmarks | xlsx | Sector yields, vacancy, take-up, supply, rental growth — 5yr history |
| Market intelligence report | pdf | Full market context: macro, sector, demand, financing, news |
| Risk report | pdf | Environmental, flood, legal, planning, financial risk analysis |
| All property data | csv | Every field from the dossier in flat CSV |
| API response | json | Full enrichment response for developer integration |
| All images | zip | 9 image files (satellite, street, photos, plans, certs) |

### A3.2 Updated full export inventory

**Spreadsheets (xlsx):**
1. Full financial model (3 scenarios, cashflow, sensitivity, IRR)
2. Sensitivity analysis (price vs yield matrix, rate stress)
3. Comparable sales pack (8 sale transactions)
4. Rental evidence pack (6 comparable lettings) ← NEW
5. Market benchmarks (sector data, 5yr history) ← NEW

**PDFs:**
6. Investment memo (4 pages)
7. Evidence pack (for approach letters — now includes rental evidence)
8. Full property report (all 8 tabs)
9. Market intelligence report ← NEW
10. Risk report ← NEW
11. Approach letter
12. Formal offer letter

**Other:**
13. All property data (CSV)
14. API response (JSON) ← NEW
15. All images (ZIP) ← NEW

---

## A4. CORRECTED ERROR HANDLING

**Replace all technical error states with friendly, human language.**

### A4.1 Design principle
The user never sees: API names, HTTP codes, timeout durations, retry logic, rate limit numbers, or data source names. They see: progress, a friendly pause message, and an option to be notified.

### A4.2 Three states (replacing 6 technical error states)

| State | When | Design | User sees |
|-------|------|--------|-----------|
| **Pending** | Data loading normally | Animated dots (10 circles, filling green as sources complete) | "Pulling the latest data" + "4 of 10 sources complete" |
| **Taking a break** | 1+ sources slow/failed, but most data available | Coffee emoji, green/amber source badges | "Taking a short break. We've got most of what you need." + "Notify me when complete" button |
| **Be right back** | Full service interruption | Tools emoji, email input | "We're doing some quick maintenance." + "Get notified when we're back" |

**Design file:** `batch-updates-market-errors.html` → "Pending state", "Slow / partial", "Service down"

### A4.3 Partial data handling (in dossier)
When some tabs have data and others don't:
- **Tabs with data:** Render normally
- **Tabs without data:** Show a soft message: "This section is still loading. You'll see it appear automatically." No error codes, no retry buttons, no technical detail.
- **Tab badge:** Small amber dot on the tab label if partial

---

## A5. INFRASTRUCTURE CORRECTIONS TO BUILD SPEC

### A5.1 APIs that DON'T need to be built from scratch

These were listed as "new" in the original spec but have significant existing code:

| Original "new" API | Existing code to extend |
|---------------------|------------------------|
| `/api/scope/enrich` | `enrich-asset.ts` (287 lines) already handles geocoding pipeline. `dealscope-epc.ts` handles EPC. `dealscope-companies-house.ts` handles CH. `dealscope-gazette.ts` handles Gazette. `planning-feed.ts` handles planning. Wire them together — don't rewrite. |
| `/api/scope/company-lookup` | `company-intelligence.ts` (178 lines) already routes UK→CH, US/FL→Sunbiz. Just needs a route handler wrapper. |
| `/api/scope/address-lookup` | `enrich-asset.ts` geocode function handles Google→Nominatim fallback. Add ScoutDeal spatial query. |
| Planning data in dossier | `planning-feed.ts` (370 lines) + `planning-classifier.ts` (179 lines) already fetch and classify planning apps from planning.data.gov.uk. |
| PD rights in dossier | `dev-potential.ts` (261 lines) already classifies Class MA, Class E, Article 4, change-of-use potential. |
| PDF generation | `brochure.ts` / `brochure-template.ts` already use Puppeteer for PDF generation. Reuse the pattern. |
| Email sending | `email.ts` already has send infrastructure. |
| Document upload/parse | `document-parser.ts` + `textract.ts` already handle PDF extraction. |

### A5.2 Models that DON'T need to be created from scratch

| Original "new" model | Existing equivalent |
|----------------------|-------------------|
| Market rate data | `MacroRate` model already stores time-series rate data |
| Property comparables | `PropertyComparable` + `ScoutComparable` already exist |
| Finance scenarios | `DealFinanceModel` + `HoldSellScenario` already exist |
| Planning applications | `PlanningApplication` model already exists |
| Document storage | `Document` + `DocumentExtract` already exist |
| Email tracking | `EmailTracking` already exists |
| Portfolio properties | `ClientPortfolio` may partially cover this — check structure |

### A5.3 Data already available in scout-benchmarks.ts

The `MARKET_CAP_RATES` object in `scout-benchmarks.ts` already contains:

```typescript
se_uk: {
  industrial: 0.0525,
  warehouse: 0.0525,
  logistics: 0.0500,
  office: 0.0650,
  retail: 0.0750,
  flex: 0.0600,
  mixed: 0.0575,
}
```

Plus similar for `london`, `fl_us`, `tx_us`. This is the foundation for the Market Intelligence tab sector yields.

### A5.4 Financing data already modelled

`financing.ts` has `AssetLoan` interface with:
- Outstanding balance, original balance
- Interest rate, rate type (fixed/variable), rate reference
- LTV, current LTV
- ICR, ICR covenant, LTV covenant
- Annual debt service
- **Market rate** (current market rate for equivalent debt)

This feeds directly into the Market Intelligence financing environment section.

---

## A6. REVISED BUILD ORDER

The original 5-week plan assumed more greenfield work than necessary. With the discovered infrastructure, the build is faster:

### Week 1: Wiring (not writing)
1. Create only the truly new models: `SavedSearch`, `AlertEvent`, `PropertyWatchlist`, `PipelineNote`, `PipelineResponse`, `PipelineStageLog`
2. Extend `UserPipeline` with mandate/notes/responses fields
3. Wire `dealscope-companies-house.ts` + `dealscope-gazette.ts` into `enrich-asset.ts` flow
4. Wire `planning-feed.ts` output into enrichment response
5. Wire `dev-potential.ts` into enrichment response
6. Extend `MacroRate` with UK series (BoE base, CPI, GDP)
7. Build route handlers that wrap existing libs: `/api/scope/search`, `/api/scope/address-lookup`, `/api/scope/company-lookup`

### Week 2: Pages (using existing data)
8. Build Home, Search, Address Results pages
9. Build Dossier shell with 8 tabs
10. Wire each tab to existing enrichment data
11. Build Market Intelligence tab using `scout-benchmarks.ts` + `MacroRate` + `financing.ts`
12. Build Financials tab using `hold-sell-model.ts` + `scout-returns.ts` + `avm.ts`

### Week 3: Pipeline + Alerts + Actions
13. Replace pipeline stubs with Prisma queries
14. Build Pipeline page + card detail modal
15. Build Alerts page + alert generation cron
16. Build approach flow (reuse existing letter API)
17. Build all modal components (send confirm, watch, log response, mandate wizard)

### Week 4: Exports + Polish
18. PDF generation using existing `brochure.ts` Puppeteer pattern
19. XLSX generation (financial model, comps, rental evidence, benchmarks)
20. Email templates using existing `email.ts`
21. Friendly loading/error states
22. Onboarding flow
23. Settings page
24. Toast notification system
25. Bulk select + context menus

### Week 5: QA + Cut-over
26. Test every state against design files
27. Update sidebar navigation
28. Performance optimisation (enrichment parallel calls, caching)
29. Mobile responsive pass
30. Cut-over: retire old routes

---

*This addendum should be read alongside DEALSCOPE-BUILD-SPEC.md. Together they form the complete build specification.*
