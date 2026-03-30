# DealScope MVP

**Property analysis engine for institutional investors.**

Any property, any source → full intelligence in 1 minute.

---

## What is DealScope?

DealScope is the analysis layer for property investors. Instead of fragmented workflows (emails, calls, valuations), users input a property (from anywhere) and get:

- **Full property dossier** (auto-enriched from public data)
- **3 financial scenarios** (what actually works for this property)
- **Personalized approach letter** (ready to send to owner)
- **Pipeline tracking** (Kanban board shows all opportunities)

---

## Four Ways to Input a Property

### 1. Paste Address
- "179 Harrow Road, London W2 6NB"
- Enriched in <5 seconds

### 2. Upload Brochure
- Agent listing (PDF), auction catalogue, investment memo
- System extracts address + enriches

### 3. Paste Text
- Copy/paste from email, listing, document
- System extracts address + enriches

### 4. Paste Link
- Rightmove, Zoopla, LoopNet, agent site
- System fetches + extracts address + enriches

---

## What User Gets Back

### Headline Card (5 seconds)
- Property image + key metrics
- Valuation range
- Key risks + red flags
- 1-paragraph narrative

### Full Dossier
- Property details (type, size, tenure, age, energy rating)
- Ownership (company, directors, distress signals)
- Valuation (3 methods + confidence score)
- Opportunities (conversion, assemblies, rent reversion)
- Risks (listed status, lease expiry, market position)
- Owner intelligence (company strength, approach strategy)
- Comparable sales (similar properties sold nearby)
- DD checklist (pre-populated with public data)

### 3 Underwrite Scenarios
- Scenario 1: Condition-driven or Market-driven path 1
- Scenario 2: Alternative path
- Scenario 3: Upside path
- Each shows: assumptions, financials (IRR/cap rate/DSCR), thesis
- User can adjust assumptions (sliders) → recalculates instantly

### Approach Letter
- Personalized via Claude AI (not template)
- 3 tone options: Formal / Direct / Consultative
- Owner company details + directors
- Ready to send (or edit)

### Pipeline Tracking
- Kanban board: Identified → Quick review → Full analysis → Approached → In negotiation
- Drag properties between stages
- Track responses (interested, not interested, maybe, no response)
- Set follow-up dates

---

## MVP Scope (This Week)

✅ **What we're building:**
- Property input (4 methods: address, PDF, text, link)
- Enrichment from 6+ public APIs (CCOD, Land Registry, EPC, Companies House, Planning, EA)
- Intelligent rent gap detection
- Smart scenario generation
- Yield calculation with user overrides
- Claude AI approach letters
- Kanban pipeline
- Response tracking

❌ **What's NOT in MVP:**
- Search (find properties)
- Bulk import
- Scraping
- Market data feeds
- Learning system (user overrides don't update base yield table yet)

---

## Why This Scope

**Smaller = faster to demo & prove**
- User has a property → analyze it
- Shows depth of analysis (not breadth of search)
- Tests what matters: is analysis good? Do investors use it?

**Easier to test**
- 4 simple input methods
- Same APIs used for all
- Can test with 5 properties

**Sets up Phase 2**
- Once enrichment works → add search (just batch calls to enrichment API)
- Once enrichment works → add bulk import (same API)
- Once enrichment works → add scraping (feeds into enrichment API)

**Killer for investors**
- Proves tool works for ANY property from ANY source
- They'll use it for every property they see
- Becomes the default "property analyzer"

---

## Demo Script

### Scenario: Investor sees Battleship Building address

```
1. Open DealScope
2. Paste address: "179 Harrow Road, London W2 6NB"
3. Hit Enter
4. [<5 seconds]
5. Headline card appears:
   - Satellite image of building
   - Valuation: £11M–£14M
   - Size: 23,782 sqft
   - Grade II* listed
   - Current rent: £595k/yr
   - Current tenant: 6.2yr lease remaining
   - Key risk: "Listed building status restricts alterations"
   - Narrative: "Grade II* heritage office in Paddington. Strong location. Current tenant stable. Retrofit to Grade A is uneconomic (£9.5M capex). Owner-occupy or hold-as-is viable."

6. Click "Deep dive"
7. Full dossier opens:
   - Overview: All property details auto-populated
   - Valuation: £12.5M (comps method), confidence: MEDIUM
   - Opportunities: Owner-occupy potential, adjacent land assembly
   - Risks: Listed constraints, short lease remaining
   - Owner: HarbourView Properties Ltd (active company, no distress)
   - Comps: 7 comparable sales in W2/W1 area (all shown with £/sqft)

8. Click "Underwrite"
9. 3 scenarios appear:
   - Scenario 1: Owner-occupy
     - Assumptions: Buy £11.5M, capex £150k (maintenance only), hold 10yr
     - Results: Profit £2.5M–£3.5M, IRR 6.8%
     - Why: "Heritage status attracts premium occupiers. Avoid retrofit capex."
   
   - Scenario 2: Hold as-is
     - Assumptions: Buy £11.5M, capex £100k/yr, keep current tenant, hold 7yr
     - Results: Profit £2.1M–£2.8M, IRR 5.1%, DSCR 1.6x
     - Why: "Stable income. Flexible exit at lease end."
   
   - Scenario 3: Assemblies
     - Assumptions: Buy £11.5M + £2M (adjacent land), capex £500k, hold 8yr
     - Results: Profit £4M–£6.5M, IRR 9.2%
     - Why: "Assembled site attracts institutional bidders."

10. User adjusts purchase price slider → all scenarios recalculate
11. Click "Generate letter"
12. Personalized approach letter appears:
    "Dear Directors,
     We are property investors seeking institutional-grade acquisition 
     opportunities in central London. Your property at 179 Harrow Road 
     matches our investment criteria...
     [personalized based on owner situation and property analysis]"

13. Select tone: "Direct" (more aggressive) → letter regenerates
14. Click "Send by email"
15. Letter sent to directors@harborview.co.uk (from Companies House)
16. System logs: "Letter sent, 2024-03-30, awaiting response"

17. User clicks "Add to pipeline"
18. Property moves to "Identified" column
19. Kanban shows: "Battleship Building — W2 6NB — 1 property in pipeline"

20. Days later: Owner replies "Interested, call me"
21. User clicks property in Kanban
22. Clicks "Log response"
23. Selects: "Interested" + sets follow-up date + notes "Call Mar 30"
24. Property moves to "In negotiation" column
```

---

## Architecture

```
Frontend (Next.js 14, TypeScript, Tailwind)
├── Property Input (address/PDF/text/link)
├── Headline Card
├── Full Dossier
├── Underwrite Scenarios
├── Kanban Pipeline
├── Approach Letter
└── Response Tracking

Backend (Next.js API routes)
├── /api/dealscope/enrich (core enrichment API)
├── /api/dealscope/valuations
├── /api/dealscope/rent-gap
├── /api/dealscope/scenarios
├── /api/dealscope/letter
└── /api/dealscope/pipeline

Database (Supabase PostgreSQL)
├── Property (extend ScoutDeal)
├── PropertyValuation
├── PropertyRentGap
├── ScoutUnderwriting (extend)
├── ApproachLetter
└── UserPipeline

External APIs
├── Google Geocoding
├── CCOD (corporate ownership)
├── Land Registry (sales + comps)
├── EPC (energy data)
├── Companies House (company intel)
├── Planning.data (planning apps)
├── Historic England (listed status)
├── Environment Agency (flood/contamination)
├── Probate Service (deceased estates)
├── Anthropic Claude (approach letters)
├── pdf-parse (PDF extraction)
└── Cheerio (HTML parsing, URL scraping)
```

---

## Key Documents

- **DEALSCOPE-MVP-CHECKLIST.md** — What to build this week (start here)
- **DEALSCOPE-SPEC.md** — Full technical spec (reference)
- **DEALSCOPE-DESIGN-GUIDE.md** — UI layouts (reference)
- **REALWORLD-CODE-REUSE.md** — What Scout has, what DealScope adds
- **DEALSCOPE-POSITIONING.md** — Why this product matters
- **MVP-SCOPE.txt** — Quick summary of what's in/out

---

## Timeline

- **Database schema:** 2 days
- **API /enrich (the critical one):** 2 days
- **APIs for valuation/scenarios/letter:** 1 day
- **UI screens:** 2 days
- **Testing:** 1 day

**Total: 7 days (tight, but doable)**

---

## Success Criteria

✅ Input property (any of 4 methods) → enriched in <5 seconds
✅ Headline card displays correctly
✅ Full dossier shows all intelligence
✅ Underwrite generates 3 scenarios (intelligent, not generic)
✅ Rent gap detected (condition vs. market)
✅ Yield transparent + overrideable
✅ Approach letter generated by Claude AI
✅ Kanban pipeline works (drag, stage changes)
✅ Response tracking works
✅ All data persists in Supabase
✅ No broken APIs

---

## Phase 2 (After Demo)

Once MVP is solid:
- Search (find properties matching criteria)
- Bulk import (upload catalogues, auto-enrich many)
- Portal scraping (Rightmove, Zoopla, LoopNet auto-feed)
- Market data feeds (calibrate yield tables)
- Learning system (user overrides improve base tables)
- Scout integration (Scout deals feed into DealScope)

---

## The Vision

DealScope is the property analysis layer for institutional investors. Eventually:
- Replace Scout (becomes primary analysis engine in RealHQ)
- Own "property understanding" across the platform
- Scale to every property an investor looks at (from any source)
- Learn over time (yield tables improve with every override)
- Become the OS for property investment

Built with: Next.js 14, Supabase, Anthropic Claude, RealHQ design system

**Status:** MVP for investor demo (this week)
