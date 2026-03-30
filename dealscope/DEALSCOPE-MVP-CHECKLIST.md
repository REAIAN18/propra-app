# DealScope MVP Build Checklist

**Target:** Investor demo (this week)

**Scope:** Property input + analysis (NOT discovery/search yet)

**Reference:** See `DEALSCOPE-SPEC.md` for full specification

---

## How It Works: Property Input → Analysis

### User has a property (from anywhere)
- Sees address in email / portal / brochure / WhatsApp / podcast
- Opens DealScope
- Inputs the property (4 ways below)
- Gets back: full intelligence in <1 minute

---

## Four Ways to Input a Property

### Input 1: Paste Address
- Text input: "179 Harrow Road, London W2 6NB"
- User hits Enter
- System geocodes + enriches
- Shows headline card in <5 seconds

### Input 2: Upload Brochure (PDF)
- User uploads agent brochure / auction catalogue page / investment memo
- System extracts text + finds address
- Geocodes + enriches
- Shows headline card + extracted property details

### Input 3: Paste Text (Copy/Paste Description)
- User pastes description from email / listing / document
- System extracts address from text
- Geocodes + enriches
- Shows headline card

### Input 4: Paste Link (URL)
- User pastes link (Rightmove / Zoopla / LoopNet / agent site)
- System fetches page + extracts address (and price, description, agent)
- Geocodes + enriches
- Shows headline card

---

## Frontend

### Screen 1: Property Input (Home Page)
- [ ] Four input methods visible (tabs or toggles)
- [ ] **Address input:** Text field with autocomplete (Google Places)
- [ ] **Brochure upload:** Drag-drop PDF area
- [ ] **Text paste:** Large textarea ("Paste description or listing here")
- [ ] **Link paste:** Text field ("Paste Rightmove/Zoopla/LoopNet URL")
- [ ] "Analyze" button (sends to backend)
- [ ] Example properties at bottom ("Try analyzing Battleship Building, W2 6NB")
- [ ] Stores recent properties (user's history)

### Screen 2: Headline Card (5-second decision)
- [ ] Property image (satellite + street view)
- [ ] Key metrics grid (valuation, size, tenure, energy rating)
- [ ] Key risks section (red flags)
- [ ] Narrative (1 paragraph why property matters)
- [ ] Actions: Deep dive / Dismiss / Save to pipeline

### Screen 3: Full Dossier (All tabs)
- [ ] Tab navigation: Overview / Valuation / Opportunities / Risk / Owner / Comps / DD Checklist
- [ ] Overview tab populated with all enriched data
- [ ] Other tabs: skeleton (detail deferred, but structure ready)

### Screen 4: Underwrite Scenarios (3 paths)
- [ ] Auto-generate 3 scenarios based on condition vs. market guess
- [ ] Tab navigation: Scenario 1 / Scenario 2 / Scenario 3
- [ ] Each shows: assumptions, results (profit/IRR/DSCR/cap rate), thesis
- [ ] Sliders to adjust key assumptions
- [ ] Export: Excel / PDF memo

### Screen 5: Kanban Pipeline
- [ ] 5 columns: Identified / Quick review / Full analysis / Approached / In negotiation
- [ ] Property cards draggable between columns
- [ ] Analytics: pipeline value, success rate, avg time

### Screen 6: Approach Letter
- [ ] Property context + owner intel (from Companies House)
- [ ] Tone selector: Formal / Direct / Consultative
- [ ] Letter preview (Claude AI generated)
- [ ] Edit / Send by email / Send by post buttons

### Screen 7: Response Tracking
- [ ] Modal/form: Response status dropdown
- [ ] Follow-up date picker
- [ ] Notes field
- [ ] Save → updates property in pipeline

---

## Backend APIs

### Core: Property Enrichment (Everything starts here)

- [ ] **POST /api/dealscope/enrich** (NEW - THE CRITICAL API)
  - Input: Any of these:
    - `{ address: string }` (e.g., "W2 6NB")
    - `{ file: File }` (PDF brochure)
    - `{ text: string }` (copy-pasted description)
    - `{ url: string }` (Rightmove/Zoopla link)
  - Process (all parallel):
    1. Extract address (geocode if needed, parse PDF/text/URL)
    2. Fetch CCOD (corporate ownership)
    3. Fetch Land Registry (sales history, comps, current owner)
    4. Fetch EPC (energy rating, building specs)
    5. Fetch Companies House (company status, directors, finances)
    6. Fetch Planning.data (recent planning applications)
    7. Fetch Historic England (listed status)
    8. Fetch Environment Agency (flood, contamination)
    9. Fetch Probate Service (if deceased estate)
  - Response: Full enriched property object (ready for headline card)
  - Latency: <5 seconds (parallel API calls, cache hits where possible)
  - Error handling: Graceful degradation (if one API fails, return others)

### Valuation

- [ ] **POST /api/dealscope/valuations** (NEW)
  - Input: enriched property object
  - Calculate three methods:
    1. Comparable sales (Land Registry comps)
    2. Income capitalisation (rent ÷ yield)
    3. Replacement cost floor (BCIS rebuild cost)
  - Return: { valueLow, valueMid, valueHigh, method, confidence }

### Rent Gap Detection

- [ ] **POST /api/dealscope/rent-gap** (NEW)
  - Input: enriched property (current rent, building age, EPC, occupancy, tenant strength)
  - Detect:
    - Current rent vs. market rent (over/under-rented?)
    - Guess: condition-driven or market-driven gap
    - EPC rating, building age, tenant strength analysis
  - Return: { gap, percentageGap, guess, reasoning }

### Scenario Generation

- [ ] **POST /api/dealscope/scenarios** (NEW)
  - Input: enriched property + rent gap analysis
  - Generate 3 scenarios based on gap guess:
    - If condition-driven: Conservative / Retrofit to compliance / Retrofit to premium
    - If market-driven: Owner-occupy / Hold as-is / Alternative play
  - For each scenario:
    - Pull BCIS retrofit costs (if applicable)
    - Calculate: purchase price, financing, capex, annual costs, exit value
    - Calculate: IRR, cap rate, DSCR, profit
  - Return: 3 complete scenarios

### Approach Letter

- [ ] **POST /api/dealscope/letter** (NEW)
  - Input: enriched property + owner intel + tone choice
  - Call Claude API:
    - "Generate approach letter for [owner name] at [company]"
    - "Property: [address], [type], [valuation]"
    - "Current situation: [owner status], [opportunity thesis]"
    - "Tone: [formal/direct/consultative]"
  - Return: Letter text (ready to edit/send)

### Pipeline Management

- [ ] **POST /api/dealscope/pipeline** (NEW)
  - Add property to user's pipeline (stage: identified)
  - Store property + valuation + scenarios + letter

- [ ] **PATCH /api/dealscope/pipeline/[propertyId]** (NEW)
  - Move property between stages
  - Log response (interested/not/maybe/no response)
  - Update follow-up date

- [ ] **GET /api/dealscope/pipeline** (NEW)
  - Return user's pipeline (all properties, grouped by stage)
  - Return analytics (pipeline value, success rate, avg time)

---

## Database Schema (Extend Existing Scout Tables)

### ScoutDeal table (rename to Property, extend with new fields)

```sql
-- Existing Scout fields
id, address, postcode, lat, lng, property_type, currency, created_at, updated_at

-- Extend with DealScope fields
epc_rating (varchar)
year_built (int)
building_size_sqft (int)
tenure (varchar: freehold/leasehold)
owner_company_id (FK to company)
owner_individual (varchar)
current_rent_psf (decimal)
current_rent_annual (decimal)
occupancy_pct (decimal)
market_rent_psf (decimal)
lease_length_years (int)
break_dates (jsonb: array of dates)
tenant_company_id (FK to company)
tenant_covenant_strength (varchar: A+/A/B/C/unrated)
data_sources (jsonb: which APIs enriched this)
enriched_at (timestamp)

-- For tracking user analysis
user_id (FK to user)
analyzed_at (timestamp)
input_method (varchar: address/pdf/text/link)
input_raw (text: original input)
```

### New: PropertyValuation table

```sql
id, property_id, valuation_low, valuation_mid, valuation_high, method (comparable/income/replacement), confidence, created_at
```

### New: PropertyRentGap table

```sql
id, property_id, current_rent_psf, market_rent_psf, gap_psf, gap_percentage, guess (condition_driven/market_driven), epc_rating, building_age, occupancy, tenant_strength, created_at
```

### ScoutUnderwriting table (extend for DealScope)

```sql
-- Existing Scout fields
id, deal_id, scenario_name, purchase_price, capex, financing_ltv, irr_5yr, cap_rate, etc.

-- Extend with DealScope fields
condition_vs_market_guess (varchar)
yield_base (decimal)
yield_tenant_adjustment (decimal)
yield_lease_adjustment (decimal)
yield_over_under_rent_adjustment (decimal)
final_yield (decimal)
reversion_value (decimal)
user_yield_overrides (jsonb)
scenario_type (varchar: owner_occupy/hold_as_is/retrofit/alternative)
```

### New: ApproachLetter table

```sql
id, property_id, owner_company_id, letter_content (text), tone (formal/direct/consultative), generated_at, sent_at, sent_via (email/post), response_status, follow_up_date, notes
```

### New: UserPipeline table

```sql
id, user_id, property_id, stage (identified/reviewed/analyzed/approached/negotiating), added_at, updated_at
```

---

## APIs to Integrate (MVP)

### Must Have (for demo to work)
- [ ] Google Geocoding (address → lat/lng)
- [ ] CCOD API (corporate ownership)
- [ ] Land Registry Price Paid (sales history, comps)
- [ ] EPC API (energy rating, building specs)
- [ ] Companies House API (company status, directors)
- [ ] Anthropic Claude API (approach letter generation)

### Nice to Have (if time)
- [ ] Planning.data.gov.uk (planning applications)
- [ ] Historic England (listed building status)
- [ ] Environment Agency (flood risk)
- [ ] Probate Service (deceased estates)
- [ ] Web scraping (PDF extraction, URL parsing)

### For PDF/Text Extraction
- [ ] pdf-parse (extract text from PDFs)
- [ ] cheerio (parse HTML from URLs)
- [ ] simple-nlp (extract address from unstructured text)

---

## User Workflow (Demo Script)

### Scenario 1: User has Battleship Building address
```
1. Open DealScope
2. Click "Paste address" tab
3. Type "179 Harrow Road, London W2 6NB"
4. Hit Enter
5. <5 seconds: Headline card appears
   - Image (satellite + street view)
   - Valuation: £12.5M
   - Size: 23,782 sqft
   - Energy: EPC C
   - Risks: Grade II* listed, 6.2yr lease remaining
   - Narrative: "Grade II* office in Paddington, currently 80% occupied. Owner-occupied option viable, retrofit to Grade A is uneconomic."
6. User clicks "Deep dive"
7. Full dossier loads (all tabs)
8. User clicks "Underwrite"
9. 3 scenarios appear: Owner-occupy (6.8% IRR) / Hold as-is (5.1%) / Assemblies (9.2%)
10. User adjusts purchase price slider → IRR recalculates
11. User clicks "Generate letter"
12. Personalized approach letter appears (Claude AI)
13. User clicks "Send by email" (or edits first)
14. Letter sent to directors@harborview.co.uk
15. User clicks "Add to pipeline"
16. Property moves to "Identified" column in Kanban
```

### Scenario 2: User uploads agent brochure
```
1. Open DealScope
2. Click "Upload brochure" tab
3. Drag-drop PDF (agent listing for a property)
4. System extracts text + finds address
5. <5 seconds: Headline card appears (same as above)
```

### Scenario 3: User pastes listing description from email
```
1. Open DealScope
2. Click "Paste text" tab
3. Paste: "Grade II listed office building, W2 area, 25,000 sqft, asking £11.5M..."
4. Hit "Analyze"
5. System extracts address from text
6. <5 seconds: Headline card appears
```

### Scenario 4: User pastes Rightmove link
```
1. Open DealScope
2. Click "Paste link" tab
3. Paste: "https://www.rightmove.co.uk/commercial/property-123456.html"
4. Hit "Analyze"
5. System fetches page + extracts address, price, description
6. <5 seconds: Headline card appears
```

---

## Success Criteria (MVP)

✅ Address input works (paste → enriched property in <5 seconds)
✅ PDF brochure upload works (extract address → enrich)
✅ Text paste works (extract address from description)
✅ URL paste works (fetch page → extract address)
✅ Headline card displays instantly
✅ Full dossier auto-enriches from all APIs
✅ Underwrite generates 3 intelligent scenarios
✅ Rent gap detected correctly (condition vs. market)
✅ Yield calculation transparent + overrideable
✅ Approach letter generated by Claude AI
✅ Pipeline Kanban tracks properties
✅ User can move property between stages
✅ User can log responses + set follow-ups
✅ All data persists in Supabase
✅ No broken integrations

---

## What's NOT in MVP

- ❌ Search (find properties matching criteria)
- ❌ Bulk auction import
- ❌ Portal scraping
- ❌ Market data feeds
- ❌ Yield learning system (user overrides don't update base tables yet)
- ❌ Collaboration features
- ❌ Transaction management

(These go in Phase 2, once analysis engine is proven)

---

## Why This Approach

**Faster to demo:**
- No complex search filtering logic
- No portal scraping setup
- Focus on quality of analysis (not quantity of properties)
- Shows depth, not breadth

**Easier to test:**
- User has a property → analyze it
- Can use same 5 properties for testing all 4 input methods
- Less moving parts to break

**Better for investors:**
- Proves the analysis is good
- Shows they'll use this for every property (not just Scout deals)
- Can immediately use on properties they're already looking at

**Easy to extend:**
- Once analysis works, add search (point to same enrichment APIs)
- Once analysis works, add bulk import (batch calls to enrichment API)
- Once analysis works, add scraping (feeds into enrichment API)

---

## Tickets for Paperclip

1. **Database schema** (blocker for everything else)
   - Extend ScoutDeal, ScoutUnderwriting
   - Create PropertyValuation, PropertyRentGap, ApproachLetter, UserPipeline
   - Create indexes for fast lookups

2. **API: /api/dealscope/enrich** (blocker for UI)
   - Handle 4 input types (address, PDF, text, URL)
   - Call 6+ APIs in parallel
   - Return enriched property object

3. **API: /api/dealscope/valuations**
   - Implement 3 valuation methods
   - Return valuations

4. **API: /api/dealscope/rent-gap**
   - Detect over/under-rent
   - Guess condition vs. market

5. **API: /api/dealscope/scenarios**
   - Generate 3 scenarios based on guess
   - Calculate financials

6. **API: /api/dealscope/letter**
   - Call Claude API
   - Generate personalized letter

7. **UI: Property input home page**
   - 4 input methods (address, PDF, text, link)
   - Recent properties
   - Example properties

8. **UI: Headline card**
   - Display enriched data
   - Image + metrics + risks + narrative

9. **UI: Full dossier**
   - Tab navigation
   - Overview tab (auto-populated)
   - Other tabs (skeleton)

10. **UI: Underwrite**
    - Display 3 scenarios
    - Slider adjustments
    - Real-time calculations

11. **UI: Pipeline Kanban**
    - 5 columns
    - Drag-drop cards
    - Analytics

12. **UI: Approach letter**
    - Display generated letter
    - Tone selector
    - Edit/send buttons

13. **UI: Response tracking**
    - Modal form
    - Status + follow-up + notes

14. **Integration testing**
    - Test all 4 input methods with real properties
    - Test all APIs return correct data
    - Test UI displays data correctly
    - End-to-end: input → letter → pipeline

---

## Timeline

**This week:**
- Database schema (2 days)
- API /enrich (1 day) — this is the hard one
- APIs for valuation/rent-gap/scenarios/letter (1 day)
- UI screens (2 days)
- Integration testing (1 day)

**Total: 7 days (tight but doable)**

---

## The Secret Sauce

Everything hinges on **POST /api/dealscope/enrich**.

If that API works:
- Address input works
- PDF upload works
- Text paste works
- Link paste works
- Everything else is UI + wiring

If that API is fast (<5 seconds):
- Users will use it for everything
- Will become the default tool

If that API handles all 4 input types:
- Shows investors "this is the analysis layer for any property"
- Positioning is clear: "DealScope understands any property, from any source"
