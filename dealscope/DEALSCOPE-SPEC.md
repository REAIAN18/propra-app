# DealScope — Standalone Acquisition Platform

> **One platform. Every property. Zero friction.**

Find properties. Understand them. Approach owners. Close deals.

---

## WHAT IS DEALSCOPE?

DealScope is an acquisition platform for property investors, agents, and scouts. Instead of waiting for listings on EIG, Rightmove, or Cushman & Wakefield, you **search the entire UK market proactively**, get complete intelligence in seconds, and approach owners before deals hit the market.

**Three user types:**
- **Investors** — Find and acquire properties matching your criteria
- **Agents** — Scout for clients, track pipelines, generate investment memos
- **Scouts** — Build pipelines for funds, track multiple search criteria

All three use the same platform. Different saved searches. Same intelligence. Same workflow.

---

## THE WORKFLOW

```
TIER 1: QUICK FILTER (Is this worth my time?)
  ↓
Search → Alert Triggered → Headline Data → Narrative → Decision (Deep Dive? YES/NO)
  
  
TIER 2: DEEP ANALYSIS (Full intelligence + underwriting)
  ↓
Complete Dossier → Full Underwrite → Comps Pack → Projected Costs → Owner Intel → Approach
  ↓
Pipeline Management (Kanban: Identified → Quick Review → Full Analysis → Approached → In Negotiation)
```

---

# TIER 1: QUICK FILTER

**Goal:** Get enough information in 30 seconds to decide if this property deserves deeper analysis.

## 1.1 The Sourcing Engine

DealScope works differently than Rightmove or EIG. Instead of waiting for listings, **it searches the entire UK market proactively** across 12 data sources and flags properties matching your exact criteria.

### What Data Sources Does DealScope Mine?

**Tier 1: Property Registry Data**
- **CCOD (Commercial CoD)** — every corporate-owned property in UK with company details
- **Land Registry Price Paid** — every sale since 1995, trends, price per sqft
- **Non-domestic EPC Register** — every commercial building, energy rating, floor area, age
- **VOA Rating List** — rateable values, business rates liability
- **Land Registry Title Register** — ownership, tenure, covenants, charges (title details)

**Tier 2: Planning & Regulation**
- **planning.data.gov.uk** — every planning application, decision, appeal
- **Historic England** — listed building database (Grade I/II*/II)
- **Environment Agency** — flood risk zones, contamination register
- **Conservation Areas** — local authority records
- **Historic England Change Management** — buildings recently added to register

**Tier 3: Distress & Opportunity Signals**
- **Companies House** — company status (active, dissolved, in administration, receivership, strike-off pending)
- **Companies House Insolvency Register** — company financial distress
- **Council tax/business rates** — arrears, non-payment signals
- **Land Charges Register** — tax liens, charges against property
- **Probate Records** — deceased estates (bona vacantia opportunities)
- **Bridging Loan Data** — stressed borrowers (via data partnerships)
- **Fund Exit Tracker** — institutional fund managers exiting UK properties (FMCAD data)

**Tier 4: Market Intelligence**
- **Auction Sites** — EIG, SDL, Allsop, Voa Property, Purple Bricks Auctions (scraped daily)
- **Agent Coming-to-Market** — partnerships with agents for early pipeline access
- **News/Press** — planning decisions, company receiverships, developer failures
- **Local Authority Planning Notices** — enforcement notices, breach of condition notices

**Tier 5: Adjacent Properties**
- **Land Registry Title Plans** — identify adjacent titles for assemblies/mergers
- **Council Tax / Rates** — bulk lookups of all properties in a postcode for portfolio mapping

---

### How The Search Works

**User flow:**

1. **User sets search criteria** (what they're looking for)
2. **System queries all 12 data sources** in parallel
3. **Results are cross-referenced and deduplicated** (same property might appear in 3 sources)
4. **Signal scoring** (properties with MORE signals rank higher)
5. **Alert triggers** (daily/weekly) when new properties match

---

### Search Criteria (What Users Can Filter By)

**LOCATION**
- Postcode / postcode district
- Local authority
- NUTS2 region
- Radius from a point (1–50 miles)
- Flood zone (1/2/3)
- Conservation area (yes/no)
- PTAL accessibility band

**PROPERTY TYPE**
- Building use class (Office, Retail, Industrial, Leisure, Residential, Mixed)
- Size range (sqft or sqm)
- Age band (pre-1919, 1919–1960, 1960–1990, post-1990)
- Tenure (Freehold, Leasehold, Mixed)
- Listed status (Grade I, II*, II, or not listed)
- EPC rating (A–G, or filter by F/G = MEES risk)

**OWNERSHIP SIGNALS**
- Corporate-owned (company-registered CCOD address)
- Individual-owned
- Specific company name (if known)
- Company status (Active, Dormant, In Administration, Receivership, Strike-Off Pending, Dissolved)
- Director-linked (find all properties linked to a specific director)

**OPPORTUNITY SIGNALS**
- **Distressed:**
  - Rates arrears (recorded)
  - Tax lien (property charge exists)
  - Bridging loan stress (2+ years overdue)
  - Probate/deceased estate
  - Company in administration / receivership
  - Fund exit deadline approaching
  
- **Market mismatch:**
  - Vacant 2+ years (no occupancy signal)
  - Under-rented (passing rent << market ERV)
  - Wrong use class (office building rated as industrial = mismatch = opportunity)
  - MEES non-compliant (F/G rated = unlettable without upgrade)
  
- **Planning potential:**
  - Listed building (conversion / extension potential)
  - Adjacent to planning application (assemblies)
  - Permitted development rights analysis (e.g., office → residential possible)
  - Conservation area (restricts demolition, unlocks grants)
  - Planning history shows rejected applications (can resubmit)
  
- **Infrastructure/accessibility:**
  - Near new transport link (pending opening)
  - Near new commercial hub / development
  - High PTAL (urban intensification potential)
  - Broadband speed (for serviced office conversion)

**VALUATION TRIGGERS**
- Price range (£X to £Y)
- Price per sqft (below market)
- Yield range (if income-producing)
- Days on market (stale listings — 180+ days = motivation)

---

### Example Search Profiles (Templates)

User can start with a pre-built search template and adjust:

**Template 1: "Listed Building Conversions in Prime London"**
```
Location: London (postcodes W1, W2, E1, N1, SW1)
Building type: Listed (Grade II* or Grade II)
Size: 5,000–50,000 sqft
Age: Any
Opportunity: Permitted development rights = residential conversion potential
Ownership: Corporate-owned preferred (easier to approach)
Status: Not currently listed on major auction sites
Results: 47 matches across London
```

**Template 2: "Distressed Corporate Owners (High Motivation)"**
```
Location: UK (nationwide)
Building type: Any
Ownership signal: Company status = "In Administration" or "Receivership" or "Strike-Off Pending"
Valuation: Discount to market likely (50%+ below valuation)
Recent sale: Not sold in last 24 months (stale asset)
Results: 156 matches nationwide, sorted by administration date (oldest first = highest urgency)
```

**Template 3: "MEES Non-Compliant Properties (Retrofit Opportunity)"**
```
Location: South East England
Building type: Office or retail
EPC rating: F or G (currently unlettable)
Size: 5,000–20,000 sqft
Cost to upgrade: <£500k (based on EPC recommendations)
Upside: Retrofit from F→C = allows letting, increases value
Results: 34 matches, ranked by upgrade cost (cheapest first)
```

**Template 4: "Vacant Industrial With Land Assemblies"**
```
Location: Post-industrial London (Stratford, Hackney, Southwark)
Building type: Industrial or warehouse
Status: Vacant 2+ years (confirmed by rates relief)
Adjacent properties: Can be assembled into larger site (22,000+ sqft)
Planning: Residential conversion zone (strategic site allocation)
Ownership: Fragmented (10–15 different owners = opportunity to be aggregator)
Results: 8 matches, mapped with adjacent titles highlighted
```

**Template 5: "Fund Exit Pipeline (Bulk Acquisition)"**
```
Location: South East
Ownership: Institutional fund-owned (tracked via FMCAD)
Fund exit deadline: Next 18 months (must sell)
Portfolio value: £50M–£200M
Strategy: Approach portfolio as single bulk deal (volume discount)
Results: 12 institutional sellers with exit deadlines tracked
```

---

### Search Execution: Under The Hood

When user runs a search, DealScope:

1. **Queries CCOD** → finds all corporate-owned properties matching criteria
2. **Looks up company status** (Companies House) for each property
3. **Pulls EPC data** → building specs, energy rating, size
4. **Checks Land Registry** → recent sales, trends, valuation indicators
5. **Scans planning.data.gov.uk** → nearby applications, planning history
6. **Flags distress signals:**
   - Rates arrears recorded?
   - Tax lien on title?
   - Company status changed recently?
   - Administration / receivership?
   - Fund exit deadline approaching?
7. **Scores by signal strength:**
   - 1 signal = low confidence
   - 3+ signals = high confidence (multiple corroboration)
8. **Ranks by relevance** (most signals first)
9. **Returns results** with property card

**Processing time:** <5 seconds for 50 properties, <30 seconds for nationwide searches

---

### Alert System

User saves a search → system **monitors it automatically**:

**When properties are added to search results:**
- Property matched criteria for first time
- User gets alert (email / in-app notification)
- Alert shows headline card with one-line narrative

**When property signals change:**
- Company status changes (e.g., becomes "In Administration")
- Rates arrears recorded (new signal)
- Planning application filed nearby (new opportunity)
- Listed on auction site (coming-to-market)
- Historic England adds to listed building register
- User gets update: "Signal change: [property]. [4 signals] now."

**Frequency:** Daily or weekly digest (user chooses)

---

### The Competitive Moat

Why DealScope's sourcing is different:

| Competitor | How They Find Deals |
|---|---|
| **EIG / Auction Sites** | Wait for distressed sellers to list. Reactive. User sees 50 deals/week. |
| **Rightmove / Zoopla** | Wait for agents to list. Prime assets only. User sees 500 deals/week but 95% are off-market. |
| **Cushman & Wakefield / Knight Frank** | Agents represent sellers. User only sees agent-listed deals. Limited to their client base. |
| **Land Registry + manual research** | User manually downloads price paid data, cross-references with company info, calls owners. 40 hours/week for 1 scout. |
| **DealScope** | Automatically queries 12 data sources continuously. Finds unlisted properties, distressed owners, planning opportunities, assemblies, everything. Updates daily. Zero manual research. |

**DealScope finds:**
- Properties that will NEVER be listed (owner doesn't know they should sell)
- Properties before they hit auction (first-mover advantage)
- Properties with multiple signals (high confidence, high value)
- Pattern matches (10 similar properties with same opportunity type)
- Portfolio aggregation (50 properties owned by 1 distressed company = bulk deal)

---

## 1.2 Search Results & Ranking

When search completes, user sees **results in a list or map view**:

**List view (ranked by signal strength):**
```
1. Battleship Building, W2 6NB — Grade II* listed, Corp owner, No auction listing
   Signals: Listed building (Historic England) + Corporate owner (CCOD) + Planning applications nearby (planning.data.gov.uk)
   Price estimate: £11M–£14M | Occupancy: 80% | Opportunity: Conversion to residential
   
2. [Property], [Postcode] — [Type], [Owner], [Signals]
   ...
```

**Map view:**
- Pin for each property
- Colour-coded by signal strength (red = high confidence, yellow = medium, grey = single signal)
- Click pin → headline card
- Cluster analysis (areas with high concentration of opportunities)

User can:
- Click any property → headline card → decide "Deep Dive" or "Dismiss"
- Bulk select properties → add all to pipeline at once
- Export results as CSV (address, valuation, signals, owner contact)
- Save search as alert

---

---

## 1.3 Bulk Import: Upload Auction Catalogues

**New workflow (for demo):** Instead of automated scraping, user uploads auction catalogues directly.

**User flow:**

1. **Download catalogue from auctioneer** (PDF or CSV from Countrywide, Allsop, etc.)
2. **Upload to DealScope** ("Import catalogue" button)
3. **System parses the file:**
   - PDF: OCR + text extraction → property details
   - CSV: direct parsing
   - Captures: address, reserve price, guide price, lot number, auction date, images (if linked)
4. **Data normalization:**
   - Standardize address format (postcode, street)
   - Parse prices (remove commas, currency symbols)
   - Extract auction dates in consistent format
5. **Deduplication:**
   - Match against existing properties (address fuzzy matching)
   - If property already in DealScope → update reserve/auction date, don't duplicate
6. **Auto-enrichment (15 minutes per 50 properties):**
   - CCOD lookup (corporate ownership)
   - Land Registry search (tenure, last sale, valuation comps)
   - EPC lookup (building specs, energy rating)
   - Companies House (owner company status)
   - Planning.data (nearby applications)
   - Historic England (listed building status)
   - Environment Agency (flood risk)
7. **Properties loaded into DealScope:**
   - Appear in user's saved searches automatically
   - Alerts fire if they match any saved criteria
   - Full dossier available for deep dive

**Demo scenario:**

User: "Here's a Countrywide auction catalogue from this week. 47 properties."

Action:
- Upload PDF
- System extracts: 47 addresses, reserves, auction dates
- Dedup: 3 are already in DealScope, 44 are new
- Enrich: 44 properties × public APIs = full intelligence in 15 minutes
- Results: User can search, filter, alert on the new properties immediately

**Data captured from catalogue upload:**

| Field | Source | Required |
|-------|--------|----------|
| Address | PDF/CSV | Yes |
| Postcode | PDF/CSV or inferred | Yes |
| Lot number | PDF/CSV | Yes |
| Reserve price | PDF/CSV | Yes |
| Guide price | PDF/CSV | No |
| Auction date | PDF/CSV | Yes |
| Building type | PDF/CSV or EPC | No |
| Floor area | PDF/CSV or EPC | No |
| Images | PDF/CSV or linked | No |
| Legal pack link | PDF/CSV or auctioneer URL | No |
| Sale type (probate/mortgagee/etc) | PDF/CSV | No |

**Technical implementation:**

```
Upload catalogue (PDF/CSV)
    ↓
Parse file (PDFParse + CSV parser)
    ↓
Extract property data (addresses, prices, dates)
    ↓
Normalize data (standardize format)
    ↓
Deduplication (fuzzy address match against existing properties)
    ↓
Batch enrich (queue 44 properties for API lookups)
    ↓
Parallel API calls (CCOD, Land Registry, EPC, Companies House, etc.)
    ↓
Store in Supabase (auction_imports table + links to main properties)
    ↓
Make searchable (properties indexed in search, alerts triggered)
    ↓
User sees results (in DealScope search)
```

**Tools Claude Code needs:**

- **PDF parsing:** pdf-parse (Node.js) or Tesseract OCR (if handwritten)
- **CSV parsing:** papaparse
- **Address normalization:** postcode-validator (UK postcodes)
- **Fuzzy matching:** string-similarity or Levenshtein distance
- **Batch processing:** p-queue (manage API rate limits)
- **Storage:** Supabase (auction_imports table)

**Advantages of manual upload:**

✅ No scraping infrastructure needed
✅ No parser maintenance (auctioneer sites don't matter)
✅ No legal/ToS risk (you're importing user-provided data)
✅ User controls what data enters the system
✅ Easy to demo (show catalogue → properties → search in <2 minutes)
✅ Scales to 100+ catalogues/week if needed
✅ Post-demo, can move to automated scraping if you want

**Limitations:**

❌ Manual process (user has to download + upload)
❌ Slower than real-time scraping (properties appear hours/days after auction goes live, not minutes)
❌ User might miss new properties if they don't check daily

**Post-demo option:**

Once you have traction, automate:
- Auctioneer sends you catalogue automatically (email partnership)
- System parses + loads automatically
- Still zero scraping infrastructure needed

---

**Top 10 Auctioneers by Market Share:**
1. Countrywide Auctions
2. Auction House
3. Allsop
4. Pugh Auctions
5. Clive Emson
6. SDL Auctions
7. Deanston
8. H&H Auctions
9. Bawtry Hall
10. Reeds Rains Auctions

**Core principle:** Don't scrape on a schedule. Scrape **when catalogues go live** — real-time competitive advantage.

**How it works:**

1. **Monitor catalogue launch announcements:**
   - Email subscriptions to top 10 auctioneers (they email clients when catalogues launch)
   - RSS feeds (if available)
   - Auctioneer websites (calendar of upcoming catalogues)
   - User can manually input catalogue launch dates in DealScope UI

2. **When catalogue is announced → trigger scrape immediately:**
   - System receives notification (email parser, webhook, or manual input)
   - Initiates scrape within minutes
   - Parses new lot numbers + property details + images
   - Deduplicates against existing properties (by address matching)
   - Loads into DealScope database within 15 minutes

3. **Properties appear in user's alerts automatically:**
   - User's saved search triggers instantly
   - Alert fires within 20 minutes of lots being live
   - User can deep-dive and approach owners before other investors even know about the property

---

## 1.2.6 Complete Data Source Inventory (All Free/Scraping)

This section covers how DealScope sources data from agent feeds, specialist platforms, off-market sources, probate, and distress signals — without paying for subscriptions.

---

### Agent Portal Feeds (Rightmove, Zoopla, OnTheMarket, PropertyLink)

**Strategy: Scrape listings + use as a supplementary signal source**

**Rightmove (rightmove.co.uk)**
- Scrape commercial property listings (filter by property type)
- Parse: address, asking price, images, agent details, days on market, property specs
- Days on market is KEY signal (180+ days = stale listing = motivated seller)
- Store: original_asking_price, list_date, days_on_market
- Dedup: match against CCOD/Land Registry by address
- Purpose: Find on-market properties that are undervalued or stale

**Zoopla (zoopla.co.uk)**
- Similar scrape to Rightmove
- Zoopla has price history (sold prices nearby) — useful for valuation benchmarking
- Parse: asking price, sold price history (comps), agent details

**OnTheMarket (onthemarket.com)**
- Smaller volume but higher quality agents
- Same parse as above

**PropertyLink (estategazette.com)**
- Specialist commercial platform
- Higher commercial property concentration
- Better data on investment sales

**Technical approach:**
- Scraper: Puppeteer (handles dynamic listing pages)
- Frequency: Daily (low volume changes, once per night)
- Storage: Supabase table (agent_portal_listings)
- Deduplication: address matching against main property table
- Data quality: ~90% address completeness, ~80% price accuracy

**What you get:**
- On-market properties (already available, but useful signal)
- Days on market (stale listings = motivation signal)
- Agent details (contact for outreach)
- Price trends (asking vs. sold nearby)

**What you don't get:**
- Off-market pocket deals (agents don't list these)
- Withdrawn from market (won't show on portal)

---

### Off-Market Sources (Pocket Deals, Withdrawn, Unsold Lots)

**Strategy: Triangulate across multiple sources to identify off-market opportunities**

**Withdrawn from Market (Rightmove/Zoopla history)**
- Properties that were listed, then delisted (seller pulled out)
- Often indicates distress: couldn't sell at asking price, motivation increased
- Approach: "I saw your property at [address] was listed on Rightmove. It's no longer there. I'm interested if circumstances have changed."
- Source: Web Archive (archive.org) — snapshot old Rightmove listings, compare to today
- Storage: withdrawn_properties table (address, original_asking, delisted_date)

**Unsold Auction Lots**
- Properties that went to auction but didn't sell (reserve not met)
- Extremely high motivation — seller now has no other option
- Source: Auctioneer websites (they publish unsold lots)
- Data: Same scraping as live lots, but marked as "unsold"
- Storage: unsold_auction_lots table
- Signal value: VERY HIGH (motivated seller, failed to achieve reserve)

**Pocket Deals / Coming-to-Market**
- Deals that haven't hit the public market yet
- Source: Agent relationships (partnership or networking)
- NOT scraped — requires direct relationship with agents
- Phase 1: Skip this
- Phase 2: Build agent referral network (scouts, sourcing partners)

**Stale Listings (180+ days on market)**
- Listed for 6+ months without selling
- Major motivation signal
- Source: Rightmove/Zoopla scrape + days_on_market field
- Signal value: HIGH (seller is increasingly motivated)

---

### Probate Data (Deceased Estates)

**Strategy: Use public probate records + electoral roll to identify executors/heirs**

**Data sources:**

**1. Probate Service (probatesearch.service.gov.uk)**
- UK government probate search (free, public record)
- Search by property address or deceased name
- Returns: deceased name, property address, value of estate, executor name/address
- Data quality: ~95% (official government record)
- Frequency: Updated daily
- Approach: Identify probate granted → contact executor → "Estate property available?"

**2. Land Registry (death notation on title)**
- Land Registry title sometimes notes "deceased" owner
- Combining title register + probate search = confirmation
- Source: Land Registry searches (£3 per title)

**3. Electoral Roll Historical**
- Old electoral rolls show who was living at an address 5-10 years ago
- Compare to current owner: if different, may be deceased
- Triangulate: current title owner + electoral history + probate search

**4. Council Tax Banding History**
- Council tax billing doesn't always update immediately after death
- Empty properties often show 100% council tax reduction (empty property exemption)
- Signal: Property empty + council tax listed under deceased name = probate/estate

**Workflow:**
1. Identify property address
2. Search Probate Service (free) → find executor name + estate value
3. Land Registry title search (£3) → confirm death notation
4. Contact executor via address on probate record
5. Approach: "I see your property at [address] is in probate. I can offer [cash, quick completion, simple transaction]. Interested?"

**Data to capture:**
- Deceased name
- Property address
- Executor name + address
- Estate value (if disclosed)
- Date of death
- Date probate granted
- Probate search result (public document)

**Signal value:** VERY HIGH (executors want clean distribution, not maximum price)

---

### Bridging Loan Stress Data (Distressed Borrowers)

**Strategy: Identify bridging loan borrowers + detect stress signals**

**Challenge:** Bridging loan data is not public. BUT you can infer it through:

**1. Land Registry Charges Register**
- Search Land Registry charges (£3 per property)
- Look for charge holder = "bridging lender" (common names: "Together Finance", "Specialist Lending", "Bridging Capital", etc.)
- Properties with bridging charges are time-sensitive (bridge is expensive, lender wants exit)

**2. Company Accounts (if corporate borrower)**
- Companies House filing shows "secured borrowing" + amount
- If growing + highly leveraged + recent acquisition = likely bridging
- Link via CCOD: company owns property + accounts show heavy debt = stress signal

**3. Planning Applications + Bridge Correlation**
- Investor buys property, applies for planning permission to add value, gets bridge loan
- If planning application goes 12+ months without decision = developer stress
- Combine: planning application date + land registry charge (bridge) + no progress = motivation

**4. Property Flipping Timeline**
- Property X bought 6 months ago via bridging (Land Registry charge date)
- Hadn't sold yet = bridge still accruing interest (expensive)
- Approach: "I know you're carrying a bridge on [property]. I can offer quick exit, certainty, cash."

**Data to capture:**
- Charge holder name
- Charge date + likely bridge term (usually 12-18 months)
- Property address
- If company-owned: accounts showing secured debt
- Planning status (if applicable)

**Storage:** bridging_loan_signals table

**Signal value:** HIGH (bridge is expensive, time-limited, lender will enforce)

---

### Fund Exit Tracker (FMCAD Data Alternative)

**Strategy: Publicly available alternatives to FMCAD**

**Challenge:** FMCAD is institutional-only subscription. BUT you can identify fund-owned properties through:

**1. Companies House - Company Structure Mapping**
- Many funds are registered companies (SPV = Special Purpose Vehicle)
- Register a company, buy property, hold in SPV name
- Search Companies House for patterns: company own 1 property, newly incorporated, no trading activity
- Indicators of fund/investor SPV:
  - Incorporated within last 5 years
  - Registered office = property address OR generic office address
  - No employees listed
  - No trading revenue shown
  - Sole director = fund manager / investment company

**2. Land Registry Price Paid**
- Track bulk purchases by single company (institutional buyers)
- Example: "BlackRock Residential Fund" bought 15 properties in London, 2022-2023
- Bulk purchases = institutional investors = fund
- Funds typically exit every 5-7 years

**3. Planning Applications - Investor Patterns**
- Institutional investor often files planning for multiple similar conversions
- Pattern recognition: same address for "agents" + "environmental consultants" across 10 properties = institutional sourcing

**4. News/Press Releases**
- Google alerts for "fund exit UK property", "[Fund name] selling portfolio"
- LinkedIn (fund manager announcements)
- Property press (Property Week, Estate Gazette)

**5. Sector Trackers (Free)**
- British Private Equity & Venture Capital Association (BVCA) — publishes deal flow
- UK Real Estate Forum — exit pipeline announcements
- News aggregators: LoopNet (has some UK data), PropertyShark (UK tracker)

**Workflow:**
1. Identify institutional owner via Companies House
2. Map their property portfolio (all properties registered to their SPV)
3. Search news for fund exit signals (exit strategy, fund raising closing, deadline)
4. Approach: "Your fund owns 8 properties in London. Looking for portfolio acquisition? I can move fast."

**Data to capture:**
- Fund/company name
- Properties owned (portfolio map)
- Fund age (when SPV incorporated)
- Estimated fund exit deadline (from news/press)
- Contact (fund manager from Companies House)

**Storage:** institutional_owners table

**Signal value:** VERY HIGH (fund managers have hard exit deadlines, will discount for certainty/speed)

---

### Direct Agent Scraping (Cushman & Wakefield, Knight Frank, JLL)

**Strategy: Scrape agent websites for their exclusive listings**

**Challenge:** Large firms like Cushman & Wakefield have their own websites separate from portals. They list exclusive deals not on Rightmove.

**Approach:**
- Scrape their commercial property databases (cushmanwakefield.com/search, knightfrank.com/search, etc.)
- Parse: address, asking price, agent contact, property specs, days on market
- Flag: properties on agent site but NOT on Rightmove = exclusive deals = less competition

**Technical:**
- Scraper: Puppeteer (handles JavaScript search)
- Frequency: Weekly (slower change rate than portals)
- Storage: exclusive_agent_listings table
- Dedup: address match against main property table + agent portal listings

**Data to capture:**
- Property address
- Asking price (often higher on agent site, lower on portal)
- Agent contact + office
- Days on market (when first listed?)
- Property specs (size, type, tenancy)
- Agent narrative (often reveals motivation/signals)

**What you get:**
- Exclusive deals with less competition
- Price differences (agent site vs. public portal = clue)
- Direct agent contact (approach for off-market deals)

**What you don't get:**
- Pocket deals (agents don't post these)
- Coming-to-market (before public listing)

---

### Planning Applications (Opportunity Signal)

**Already in spec via planning.data.gov.uk, but worth expanding:**

**What to extract:**
- Application type (change of use, extension, demolition = opportunity)
- Application date + decision date + status (pending = decision risk, approved = planning risk, refused = motivation)
- Applicant details (property owner name, address)
- Officer's report (sometimes hints at developer stress, funding issues)
- Appeals (refused once = appealing = motivation)

**Workflow:**
- Property X: Planning application for residential conversion, filed 18 months ago, still pending
- Approach: "Planning is stalled. I can fund the application, complete it, and offer you cash exit."

**Data to capture:**
- Application number
- Property address
- Application type + date
- Status (pending/approved/refused/appeal)
- Applicant name/address
- Officer's report (PDF scrape)

---

### Companies House Insolvency Register

**Already in spec, but worth detailing:**

**What to capture:**
- Company name
- Properties owned (via CCOD)
- Insolvency type (administration, receivership, CVA, liquidation)
- Date of insolvency action
- Insolvency practitioner name + contact
- Expected completion date (if filed)

**Signal value:**
- Administration: receiver appointed, property will be sold (timeline: 6-12 months)
- Receivership: lender has seized property, will sell (timeline: 3-6 months)
- CVA: Company Voluntary Arrangement (less urgent)
- Liquidation: company dissolved, assets sold

**Approach workflow:**
1. CCOD lookup: find all properties owned by [Company X]
2. Companies House: check if company is in administration/receivership
3. Find insolvency practitioner contact
4. Approach: "I see [Company X] is in administration with [property count] properties. I can offer bulk acquisition, quick completion."

---

### Summary: Data Source Matrix

| Source | Type | Free? | How | Frequency | Signal Value |
|--------|------|-------|-----|-----------|--------------|
| CCOD | Corporate ownership | Yes | Query + download | Daily | High |
| Land Registry Price Paid | Sales history | Yes | Bulk download | Monthly | High |
| EPC Register | Building specs | Yes | API | Daily | Medium |
| Planning.data.gov.uk | Planning history | Yes | API | Daily | High |
| Companies House | Company info | Yes | API | Daily | High |
| Probate Service | Deceased estates | Yes | Search online | Daily | Very High |
| Historic England | Listed buildings | Yes | API | Weekly | Medium |
| Environment Agency | Flood/contamination | Yes | API | Weekly | Medium |
| Rightmove | On-market listings | Yes | Scrape | Daily | Medium |
| Zoopla | On-market listings | Yes | Scrape | Daily | Medium |
| Auction Sites (10) | Auction listings | Yes | Event-driven scrape | Real-time | High |
| Agent Sites (C&W, KF, JLL) | Exclusive listings | Yes | Scrape | Weekly | High |
| Web Archive | Withdrawn listings | Yes | archive.org | Lookup | Medium |
| Companies House Charges | Bridging loans | Yes | Lookup | Daily | High |
| News/Press Releases | Fund exits | Yes | Alerts + scrape | Daily | Very High |

---

---

## DEMO vs POST-DEMO ROADMAP

### ✅ LIVE FOR INVESTOR DEMO (This Week)

**Data sources:**

**Auctions:**
- ✅ Bulk import workflow (PDF/CSV upload)
  - User downloads catalogue from any auctioneer
  - Uploads to DealScope
  - System parses, deduplicates, auto-enriches with CCOD/Land Registry/EPC/Companies House
  - Properties searchable + alerts trigger immediately

**Portal & Agent Scraping (Live):**
- ✅ Rightmove scraping (daily, capture: address, asking price, days on market, agent contact)
- ✅ Zoopla scraping (daily)
- ✅ LoopNet scraping (daily)
- ✅ EIG scraping (daily — from their portal, aggregated view)
- ✅ Cushman & Wakefield scraping (weekly, exclusive listings)
- ✅ Knight Frank scraping (weekly, exclusive listings)
- ✅ JLL scraping (weekly, exclusive listings)

**Off-Market & Distress Signals:**
- ✅ Web Archive (archive.org) — find withdrawn listings
- ✅ Auctioneer unsold lots (from catalogue upload — properties that didn't sell)
- ✅ Stale listings (180+ days on market, flagged from portal scraping)
- ✅ Land Registry charges (identify bridging loan stress)

**Public Data APIs (Auto-Query):**
- ✅ CCOD + Land Registry Price Paid + EPC Register + Planning.data + Companies House
- ✅ Historic England (listed buildings)
- ✅ Environment Agency (flood risk, contamination)

**Probate & Deceased Estates:**
- ✅ Probate Service integration (free search, auto-lookup by property address)
- ✅ Electoral roll + council tax correlation (detect deceased owners)

**Product Features Ready:**
- ✅ Search interface (50+ filter combinations, signal-based ranking)
- ✅ Saved searches + alerts (email/in-app)
- ✅ Headline card (quick filter view, 5-second decision)
- ✅ Full dossier (auto-assembled from all data sources)
- ✅ Valuation (three methods: comps, income cap, replacement cost)
- ✅ Three underwrite scenarios (conservative, value-add, upside)
- ✅ Underwrite export (Excel + PDF investment memo)
- ✅ Comps evidence pack (Land Registry comparables)
- ✅ Risk assessment (flood, listed, structural, tenant, legal, market)
- ✅ Owner intelligence (Companies House profile, distress signals)
- ✅ DD checklist (pre-populated with public data already gathered)
- ✅ Kanban pipeline (Identified → Quick Review → Full Analysis → Approached → In Negotiation)
- ✅ Approach letter generation (Claude AI, auto-personalized per owner situation)
- ✅ Response tracking (interested / not now / not selling / no response / follow-up date)

**What Investor Sees:**

Demo workflow:
1. **Search:** "Grade II* listed + corporate owner + conversion potential + London"
   - Results from CCOD + Historic England + planning.data (instant)
   - 15 properties found
2. **Or upload:** Download Countrywide auction catalogue → upload → 47 properties auto-enriched in 15 min
3. **Deep dive:** Click Battleship Building
   - Headline card appears instantly
   - Full dossier loads (all intelligence from 8 data sources)
   - See valuation (£11M–£14M, methodology explained)
   - See owner intel (Companies House profile, director names)
   - See opportunities (conversion potential, adjacent assemblies)
   - See risks (flood, listed building constraints)
4. **Underwrite:** Three scenarios (conservative, value-add, upside)
   - Export as Excel
5. **Approach:** One-click letter generation
   - Claude writes personalized letter to owner
6. **Pipeline:** Add to Kanban, track through negotiation

**Investor takeaway:**
- "Real product, live data, working end-to-end"
- "Multiple data sources (auctions + portals + public data) = triangulation"
- "Institutional-grade underwriting in <10 minutes"
- "Acquisition velocity: search/upload → alert → analysis → approach in <15 minutes"
- "Data moat: scraping infrastructure + parser network hard to replicate"

---

### 🔧 EXTENSIBILITY: Custom Agent Site Scraping

**Post-demo feature (easy to add):**

User can add any new agent site to scrape:

1. User: "Scrape [agent site URL]"
2. System: "What data fields? (address, price, agent, days-on-market, etc.)"
3. User provides CSS selectors or HTML pattern
4. Claude Code generates custom parser
5. Parser runs on schedule (daily/weekly)
6. Properties auto-loaded into DealScope

**Example:**
- User: "Add Savills.com to scraping"
- System generates Savills parser automatically
- Within 1 week, Savills properties appearing in searches + alerts

This scales to 50+ agent sites without rebuilding infrastructure.

---

### 📋 POST-DEMO ROADMAP (Next 3 Months)

**Phase 1 (Month 1):**
- Custom agent site parser generator (user can add new sites)
- Probate estate trend tracking (new probates vs. old ones)
- Companies House pattern matching (identify fund-owned portfolios)
- News aggregation (fund exit announcements, receivership notices)

**Phase 2 (Month 2):**
- Bridging loan stress scoring (over-leveraged owner identification)
- FMCAD alternative (fund exit pipeline from news + Companies House)
- Bulk import v2 (users can upload 100+ property lists, all auto-enriched)
- Collaboration (teams can share pipelines, assign properties to co-investors)

**Phase 3 (Month 3):**
- Partnership negotiations with auctioneers (approach with "we're driving deals, want to partner?")
- EIG partnership (transition from scraping to data feed)
- Agent partnerships (direct catalogue feeds, early access to coming-to-market)

**Hiring post-demo:**
- Data engineer (custom parser maintenance, scraping infrastructure scaling)
- Business development (auctioneer/agent/platform partnerships)

---

### Legal & Ethics Note

**Scraping:** All scraping targets are public websites with no explicit scraping prohibition in their ToS. However:
- Be respectful of rate limits (1 request per 2 seconds)
- User-agent should be transparent ("DealScope-Bot")
- Monitor for IP blocks; rotate if needed
- Agent sites and auctioneers may object — prepare for cease & desist + have partnership pitch ready

**Probate Service:** Public record, free to search. No restriction on using data for commercial purposes (approach property owners).

**Companies House:** Public record, free API, commercial use is standard.

**Conclusion:** You can source 90% of useful data without paying subscriptions. The key is smart triangulation: one signal = weak, three signals corroborating = high confidence deal.

---

### Technical Implementation

**Phase 1 (Before Demo): Proof of Concept**
- Integrate with 3 top auctioneers' email announcement lists
- Build HTML parsers for each auctioneer's site structure
- Manual trigger option in DealScope UI ("Scrape catalogue now")
- Test deduplication logic (address matching via Supabase)
- Validate data accuracy (spot-check 10 properties)

**Technology Stack:**
- Email listener: Nodemailer + IMAP (monitor auctioneer@company email for catalogue launches)
- Scraper: Puppeteer (handles JavaScript-heavy auction sites)
- Storage: Supabase PostgreSQL (raw_auction_listings table)
- HTML parsing: Cheerio
- Deduplication: PostgreSQL full-text search (address matching)
- Error handling: Retry logic + Slack alerts on scraper failures

**Phase 2 (Post-Demo): Full Scale**
- Expand to remaining 7 auctioneers
- Build auctioneer-specific HTML parsers (each site is structurally different)
- Automate email parsing (detect catalogue launch announcements automatically)
- Negotiate direct catalogue feeds / webhooks with auctioneers (if willing to partner)
- Real-time webhooks: property pushed to DealScope within 5 minutes of listing

---

## 1.2 Alert Card (Headline View)

When a property matches a saved search, user sees a **card** with:

**Top section:**
- Property address + postcode + map pin
- Building photo (satellite or street view)

**Headline data (auto-populated from public sources):**
- Building type & size (sqft)
- Tenure (freehold/leasehold)
- Estimated market value (with confidence: high/medium/low)
- Annual rental income (if occupied)
- Occupancy % (if occupied)
- Energy rating (EPC A–G)

**Key risks (flagged in red if critical):**
- Flood zone (1/2/3)
- Listed status (blocks alterations)
- MEES non-compliant (unlettable without upgrade)
- Tenant covenant (if occupied — company status from Companies House)
- Short lease remaining (if leasehold)

**One-line narrative:**
> "Grade II* listed office in Paddington. 23,780 sqft. £25/sqft passing rent. Conversion to residential potential — adjacent land assemblies possible. Corporate owner (dormant company). Listed on 0 auction sites. Last sold 2008 for £8.2M."

**User action:**
- Swipe left = dismiss
- Swipe right / click "Deep Dive" = add to pipeline + unlock full analysis

---

# TIER 2: DEEP ANALYSIS

When user clicks "Deep Dive," DealScope assembles the complete intelligence package. Everything auto-populates from public data; user only provides info that's not publicly available.

## 2.1 The Dossier (Auto-Assembled Property Profile)

**SECTION A: What Is This Property?**

| Data | Source | Status |
|------|--------|--------|
| Address, postcode, coords | CCOD / Land Registry | ✅ Auto |
| Title number(s) | CCOD | ✅ Auto |
| Tenure (freehold/leasehold) | Land Registry title | ✅ Auto |
| Floor area (sqft/sqm) | EPC register | ✅ Auto |
| Building type & use class | EPC + VOA | ✅ Auto |
| Year built / age band | EPC | ✅ Auto |
| Number of floors | EPC | ✅ Auto |
| Energy rating (A–G) | EPC | ✅ Auto |
| Current heating / utilities | EPC | ✅ Auto |
| Rateable value (business rates proxy) | VOA | ✅ Auto |
| Last sale price + date | Land Registry | ✅ Auto |
| Full sale history since 1995 | Land Registry | ✅ Auto |
| Listed building status | Historic England | ✅ Auto |
| Conservation area | planning.data.gov.uk | ✅ Auto |
| Flood risk (zone + surface water) | EA | ✅ Auto |
| Contaminated land register | EA | ✅ Auto |
| MEES compliance risk (F/G = unlettable) | Calculated | ✅ Auto |
| Current tenant details (if occupied) | Companies House / lease data | ⚠️ User uploads lease if not on register |
| Occupancy % | Estimated from rates relief + EPC | ⚠️ User confirms if known |
| Passing rent (if occupied) | Estimated from rateable value | ⚠️ User enters if different |

**SECTION B: Building Images**
- Satellite image (Google Maps)
- Street view (360°)
- Recent planning photos (if available)

**SECTION C: Nearby Context**
- Comparable properties nearby (for benchmarking)
- Nearby planning applications (next 2 years)
- Local demographics (ONS Census 2021)
- Employment data (local jobs, sectors)
- Transport accessibility (PTAL / TfL)
- Broadband speed (Ofcom)
- Crime rate (Police.uk)
- Recent news or regulation changes (local authority planning changes, new infrastructure, rate changes, etc.)

---

## 2.2 Full Underwrite

The underwrite is the **decision engine**. It shows "what should I pay and why?"

**Auto-calculated from public data + user input:**

### Rent Gap Analysis & Retrofit Intelligence

**Auto-detect rent opportunity:**

1. **Current passing rent** (from lease data or rateable value proxy)
2. **Market ERV** (from comparable lettings in same postcode/type)
3. **Gap** = Market ERV - Passing rent
4. Example: Battleship £25/sqft current vs. £40/sqft market = **£15/sqft gap**

**Initial guess: Is the gap condition-driven or market-driven?**

System analyses:
- **EPC rating** (F/G = likely condition issue; C+ = likely market/tenant quality issue)
- **Building age** (pre-1919 or flat roof = structural condition likely); post-1960 = modern, condition less likely)
- **Listed status** (Grade I/II* = constraint on works, not primary condition issue)
- **Tenant quality** (from Companies House check: strong covenant = market issue, weak covenant = condition issue)
- **Occupancy** (if 100% let = market positioning; if 50% = condition issue)

**Example guess logic:**
- Battleship: EPC C (compliant) + 1920s (old) + Grade II* (constraint) + strong tenant (80% occ) = **Market positioning issue, not condition**
- Therefore: Retrofit is NOT the solution; hold-as-is or owner-occupy are the plays

**Pull BCIS retrofit costs automatically:**

If system guesses "condition-driven," it pulls:
- BCIS building type (office, retail, etc.) + region (London, etc.)
- Standard retrofit cost/sqft for moving from current EPC to target EPC
- Example: Office E→C retrofit = £45-65/sqft (London)
- Applied to Battleship: 23,782 sqft × £550/sqft = **£13.1M**

Cost is shown in underwrite scenarios, with caveat: "Listed building status may increase costs 20-40%."

---

### Underwriting Scenarios (Auto-Generated Based on Gap Analysis)

**Scenario logic:**

If rent gap is **condition-driven** (EPC F/G, pre-1919 building, low occupancy, weak tenant):
- Scenario 1: **Conservative** (no retrofit, accept low rent, focus on cost control)
- Scenario 2: **Retrofit to compliance** (upgrade to meet minimum lettability, E/D rating)
- Scenario 3: **Retrofit to premium** (upgrade to Grade A/B, maximize rent potential)

If rent gap is **market-driven** (EPC C+, 1960+ building, good occupancy, strong tenant):
- Scenario 1: **Owner-occupy** (no retrofit, use as HQ/creative space, avoid capex)
- Scenario 2: **Hold as-is** (keep current tenant, extract stable income, minimal intervention)
- Scenario 3: **Alternative play** (adjacent assemblies, conversion to alternative use, repositioning)

**Each scenario auto-calculates:**

| Field | Source/Logic |
|-------|---|
| **Purchase price** | Market valuation (comps, confidence-weighted) |
| **Financing** | LTV based on property risk (50-70%), rate from market (5-6% p.a.) |
| **Capex** | BCIS retrofit costs (auto-pulled) if condition-driven; £0-500k if market-driven |
| **Capex financed?** | Default: in-pocket for owner-occ; debt-financed for income plays |
| **Annual costs** | Insurance + business rates + maintenance (estimated from comps + property type) |
| **Rental income** | Current passing rent, OR estimated market ERV if no tenant |
| **Holding period** | Default: 5 years; user adjusts via slider |
| **Exit strategy** | Described in scenario (sell at market, hold for income, operator exit, assembly, etc.) |
| **Exit value** | Market appreciation (2-3% p.a.) + any planned uplift (rent growth, condition improvement) |
| **IRR, cap rate, DSCR** | Calculated for each scenario; flagged red if <5% IRR or <1.2x DSCR |

**Example: Battleship (market-driven gap, so three paths offered)**

```
Scenario 1: Owner-occupy
  Purchase: £11.5M
  Capex: £150k (maintenance only, no retrofit)
  Financing: 50% LTV (£5.75M @ 5.5%)
  Annual costs: £120k (insurance, rates, maintenance)
  Holding: 10 years
  Exit value: £14M–£15M (2.5% p.a. appreciation)
  Profit: £2.5M–£3.5M
  IRR: 6.8%
  Why: Heritage status commands premium for occupier; avoid uneconomic retrofit
  
Scenario 2: Hold as-is
  Purchase: £11.5M
  Capex: £100k/yr (maintenance)
  Financing: 60% LTV (£6.9M @ 5.5%)
  Annual rental income: £595k (current tenant, 6.2yr lease)
  Annual costs: £100k + debt service £380k = £480k
  Net income: £115k/yr
  Holding: 7 years (to lease expiry)
  Exit value: £13M–£14M
  Profit: £2.1M–£2.8M
  IRR: 5.1%
  DSCR: 1.6x
  Why: Stable income, low risk, flexible at lease end
  
Scenario 3: Alternative — Adjacent assemblies
  Purchase: £11.5M + £2M (adjacent land acquisition)
  Capex: £500k (planning & legal)
  Financing: 50% LTV
  Holding: 8 years
  Exit value: £18M–£20M (assembled site premium)
  Profit: £4M–£6.5M
  IRR: 9.2%
  Why: Larger site attracts institutional bidders, higher exit multiples
```

**User controls:**

- **Confirm/override guess**: "We think the gap is market-driven. Does that match your view?" [Yes] [No, it's condition] [Unsure]
- **Adjust capex**: Slider to increase/decrease BCIS estimate (±20% typical for uncertainties)
- **Adjust holding period**: Slider, 3–15 years
- **Adjust exit assumption**: Appreciation rate, market multiplier, or specific target exit value
- **Regenerate scenarios**: Any change recalculates all three instantly

**What's NOT shown:**

- Retrofit-to-Grade-A scenario if market-driven (uneconomic, system hides it)
- Owner-occupy if income property (not relevant, system hides it)
- Conversions if listed building prohibits them (system flags as constrained)

---

### Valuation (Three Methods)

**Method 1: Comparable Transactions**
- Find 5–10 similar properties (same type, same area, sold last 24 months)
- Calculate £/sqft range from comps
- Apply to this property's floor area
- Output: Value range (low–mid–high) + confidence score

**Method 2: Income Capitalisation**
- Rateable value ÷ market yield for this type/area = estimated rental value
- Cross-check against actual passing rent (if occupied)
- Capitalise at appropriate yield
- Output: Income-based valuation

**Method 3: Replacement Cost (floor, not ceiling)**
- Floor area × BCIS rebuild cost/sqft for building type/region
- Minus depreciation based on age
- Plus land value (derived from comps)
- Output: Cost-based floor valuation

**Intelligent yield calculation (auto-detect with user override):**

System auto-builds yield by detecting:

| Factor | Auto-detect from | User can override |
|--------|---|---|
| **Property type** | VOA use class (retail/industrial/office/residential/mixed) | Type selector |
| **Location quality** | Postcode + comparables + accessibility | Location tier (high street / secondary / industrial park) |
| **Tenant strength** | Companies House covenant check (turnover, solvency, credit rating) | Dropdown (A+ / A / B / C / Unrated) |
| **Lease length** | Lease data from Land Registry / user input | Years remaining selector |
| **Break clauses** | Lease data / user input | Add break dates (5yr, 10yr, etc.) |
| **Rent position** | Current rent vs. market ERV from comps | Over/under-rented % slider |
| **Mixed-use split** | Property specs (sqft per unit type) | Adjust sqft per unit |

**Base yield table (market data + learning):**

```
Retail high street:     5.0% base
  + Tenant A+ (Tesco):  -0.5%
  + Tenant A:           -0.3%
  + Tenant B:           +0.5%
  + Tenant C:           +2.0%
  
  + Lease 15yr:         +0.0%
  + Lease 5yr:          +0.5%
  + Lease 2yr:          +1.5%
  + Lease with breaks:  +0.5% per break
  
  + Over-rented 10%:    +1.0%
  + Over-rented 20%:    +2.0%
  + Under-rented 10%:   -0.5%
  
  Final yield = Base + Tenant adj + Lease adj + Rent adj

Retail secondary:       7.0% base (apply same adjustments)
Industrial:             6.0% base
Office:                 5.5% base
Residential:            4.5% base
```

**System shows the calculation to user:**

```
Yield calculation for [Property]

Base yield (high street retail):           5.0%
Tenant adjustment (Starbucks A+):         -0.5%
Lease length adjustment (3yr):            +1.5%
Break clause adjustment (5yr break):      +0.5%
Over-rent adjustment (15% above market):  +1.0%
─────────────────────────────────────────
Final yield:                               7.5%

Headline value = £50/sqft ÷ 7.5% = £667/sqft

[User can click each adjustment to see reasoning or override]
```

**At lease reversion (auto-model):**

```
Year 3: Current lease ends
Market rent today: £45/sqft
Market rent growth (assumed 2% p.a.): £47.7/sqft

Reversion yield = Base 5.0% - Tenant -0.5% = 4.5%
Reversion value = £47.7/sqft ÷ 4.5% = £1,060/sqft

Reversion profit/loss vs. headline: +18% (if under-rented) or -20% (if over-rented)
```

**For mixed-use (split valuation):**

```
Ground floor retail (2,000 sqft):
  Rent: £30/sqft
  Yield: 5.5% (applied separately)
  Value: £1.09M

Upper residential (6,000 sqft):
  Rent: £20/sqft
  Yield: 4.5% (applied separately)
  Value: £2.67M

Total: £3.76M (not blended average)
```

**Result displayed as:** 
```
Market Value Estimate: £11M–£14M (mid: £12.5M)
  Comparable sales: £12.0M–£13.2M
  Income capitalisation: £11.8M (headline, with current over-rent)
    Reversion value: £12.7M (when lease refreshes, assuming 2% market growth)
    Reversion upside: £900k at year 5
  Replacement cost floor: £10.2M
Confidence: MEDIUM (comps limited, market yield 7.5% adjusted +250bps for short lease + over-rent)

User adjustments: Tenant strength changed A→A+ (Tesco), yield reduced 50bps
Updated yield: 7.0%, updated headline value: £714/sqft
```

---

## Market Data Learning & Calibration

**DealScope learns from user overrides:**

When user adjusts a yield component, system logs:
- Property type: Retail high street
- Tenant: Starbucks (A+ covenant)
- User adjusted: Tenant coefficient from -0.5% to -0.8%
- Reason: "Starbucks is safer than average A+ tenant"

Over time (100+ overrides per market segment):
- System builds distribution: "Starbucks coefficient ranges -0.5% to -1.0%, mean -0.7%"
- Auto-updates base yield table for next property
- Notifies user: "Updated: High street A+ yield adjustment now -0.7% (was -0.5%)"

**Market data feeds calibrate the table:**

Real-time feeds from:
- **CoStar / Real Capital Analytics**: Market yields per postcode/type (if subscribed)
- **Knight Frank / Cushman & Wakefield**: Agent market reports (scrape yield ranges)
- **Property press**: Deal announcements with yields disclosed
- **User transactions**: "We sold this for £X with Y% yield" → data point

System compares:
- Calculated yield: 5.5%
- Market data shows: 5.2%–5.8% range
- Flag: "Market yield is 30bps lower than calculated. Update base? [Yes] [No] [Ask me later]"

**Audit trail:**

User can see:
- Original yield table (baseline)
- User overrides (what they changed and why)
- Market data updates (what the market told us)
- Current yield table (live, calibrated version)

Example:
```
Base yield adjustment history:
  Jan 2025: High street retail base = 5.0%
  Feb 2025: User overrides (10 properties) averaged -0.3% → updated to 4.7%
  Mar 2025: CoStar data shows market 4.5%–5.0% → updated to 4.8%
  Apr 2025: User feedback: "My deals close at 4.6%" → noted for future
```

**User control over learning:**

- "Auto-update yield table from market data": [On] [Off]
- "Include user overrides in yield learning": [On] [Off]
- "Manual override lock": Lock a yield component so system doesn't change it
- "Reset to published benchmarks": Revert all learning, go back to baseline

---

## 2.2 Full Underwrite

---

### Underwriting Scenarios

User sees **three acquisition scenarios**. For each, the system calculates:
- **Purchase price** (estimate based on leverage assessment)
- **Financing** (available debt at current market rates, based on property type/location/covenant)
- **Capex** (auto-pulled from EPC recommendations + user adjustments)
- **Holding costs** (insurance, rates, maintenance, void period)
- **Exit value** (based on market trends + planned improvements)
- **Profit** (exit value – purchase – all costs = net profit)
- **IRR** (internal rate of return, % per annum)
- **Cap rate** (annual NOI ÷ purchase price)
- **DSCR** (if financed: NOI ÷ annual debt service)
- **Months to payback**

**Scenario 1: Conservative (Buy at fair market value, minimal value-add)**
```
Purchase price:           £12.5M (market value)
Financing (60% LTV):      £7.5M debt @ 5.5% p.a.
Capex:                    £200k (maintenance only)
Holding period:           5 years
Annual costs:             £150k (rates, insurance, maintenance)
Exit strategy:            Sell at market appreciation (assume 2.5% p.a.)
Exit value (year 5):      £14.2M
Total profit:             £1.7M
IRR:                      6.2%
DSCR:                     1.8x (healthy)
```

**Scenario 2: Value-Add (Identify specific opportunity, improve)**
```
Purchase price:           £11.5M (negotiate 8% below market)
Purchase rationale:       [Listed in AI narrative]
Financing (60% LTV):      £6.9M debt @ 5.5%
Capex:                    £800k (retrofit E→C rating, address MEES)
Capex financed:           YES (adds to debt, amortised)
Opportunity:              Unlock lettability post-retrofit
New rental income:        £450k/yr (projected, user confirms)
Holding period:           5 years
Annual costs:             £140k (lower once occupied)
Exit value:               £13.8M (higher yield due to compliance + income)
Total profit:             £2.8M
IRR:                      11.4%
DSCR:                     2.1x
```

**Scenario 3: Upside (Planning/conversion/assemblies)**
```
Purchase price:           £10.5M (distressed, negotiate hard)
Purchase rationale:       [Listed in AI narrative]
Financing (50% LTV):      £5.25M debt @ 5.5%
Capex:                    £2.2M (retrofit + planning application cost)
Planning approval:        Grade II* listed → residential conversion
New use:                  Residential (assumed 20 units)
Value per unit (comp):    £680k/unit
Gross value (20 units):   £13.6M
Less conversion cost:     -£2.2M
Less contingency (10%):   -£1.34M
Exit value:               £10.06M [PROBLEM: Planning failed or underestimated cost]
Scenario revised:         [User explores different conversion angle or different exit]
IRR:                      [Varies based on timing]
Risk:                     HIGH (planning risk, execution risk, market risk)
```

**User experience:**
- Sees all three side-by-side
- Can adjust assumptions (purchase price, capex, financing rate, holding period, exit multiple)
- Chart shows profit/IRR/payback changing in real-time
- Can export as Excel file

---

## 2.3 Full Dossier Tabs

Once underwrite is set, user navigates tabs:

### Tab 1: Overview
- All auto-populated property data from Section A above
- Ownership details (current owner, company status, charges)
- Valuation summary (three methods)
- Key risks highlighted

### Tab 2: Valuation & Comps
- Detailed valuation breakdown
- 5–10 comparable sales (Land Registry data)
  - Address, type, size, price, £/sqft, sale date
  - Why they're comparable (or differences if edge cases)
- Trend analysis (market moving up/down?)
- "What to offer" guidance based on property condition + market

### Tab 3: Opportunities
AI-generated analysis:
- **Highest and best use** — current use vs. what it could be
- **Planning potential** — permitted dev rights, conversion feasibility, listed building constraints
- **Rent reversion** — current rent vs. market ERV
- **Capex value-add** — EPC recommendations with costs
- **Split/merge potential** — could it be subdivided or merged?
- **Ancillary income** — solar, EV charging, telecoms potential
- **Adjacent assemblies** — could you buy next-door and create larger asset?

### Tab 4: Risk Assessment
- **Flood risk** — zone + historical flooding + surface water
- **Contamination** — brownfield status, remediation needed?
- **Listed / Conservation** — what can/can't you do?
- **Structural** — age, type, known issues
- **MEES** — compliance risk, upgrade cost
- **Tenant risk** — if occupied, company covenant strength
- **Lease risk** — length remaining, terms
- **Market risk** — vacancy rates, trends in area
- **Legal** — title restrictions, covenants, charges

**Output:** Risk score 1–10 with mitigation strategies

### Tab 5: Owner Intelligence
- **Current owner** (name, company status, directors, other holdings)
- **Ownership history** — bought when, for how much, how many changes of hands
- **Why they might sell** — signals detected:
  - Rates arrears? Bridging loan stress? Fund exit deadline? Probate? Dissolution?
  - Competitor analysis (if same owner has other distressed properties)
- **Company financials** (if corporate) — turnover, profit, leverage, solvency
- **Contact options** — registered office, director home address (public record), Companies House contact

### Tab 6: Approach Strategy
- **Suggested offer range** — based on valuation + leverage assessment + signals
- **Offer structure** — terms that appeal to this specific owner situation
- **Messaging framework** — what angle resonates (quick sale vs. tax efficiency vs. simplification)
- **Outreach channels** — post, email, phone, agent

### Tab 7: DD Checklist
Pre-populated with everything DealScope already knows. User ticks off as it's obtained:

**Already gathered (from public data):**
- ✅ Title register + plan
- ✅ Company ownership + status
- ✅ EPC certificate + rating
- ✅ Flood risk assessment
- ✅ Contamination search
- ✅ Listed building status
- ✅ Planning history
- ✅ Comparable sales evidence
- ✅ Business rates valuation
- ✅ Company accounts

**Still needed (from seller/solicitor):**
- ☐ Full title documents + deeds
- ☐ CPSE replies (Commercial Property Standard Enquiries)
- ☐ Asbestos survey / management plan
- ☐ Fire risk assessment
- ☐ Building insurance details
- ☐ Service charge accounts (if multi-let)
- ☐ Tenant leases (if occupied)
- ☐ Planning consents / building regulations
- ☐ Environmental audit (if industrial)
- ☐ Building survey

---

## 2.4 Underwrite Export

User can export the full underwrite as:
- **Excel file** — all scenarios, assumptions, calculations (editable)
- **PDF investment memo** — professional format for presenting to LPs or co-investors
- **Narrative report** — full analysis in written form

---

# TIER 3: PIPELINE MANAGEMENT

User's properties live in a **Kanban board:**

```
Identified      Quick Review    Full Analysis    Approached      In Negotiation
    │               │                │               │                │
  [15]            [4]               [3]             [2]               [1]
    │               │                │               │                │
```

**Column definitions:**

**Identified**
- Property matches a saved search
- User has seen headline card
- Has NOT decided to deep dive yet
- Action: Review headline card → decide "Deep Dive?" or "Dismiss"

**Quick Review**
- User has clicked "Deep Dive"
- System is assembling full dossier
- User can see headline data + early narrative
- Action: Wait for full data → then commit to "Full Analysis" or "Archive"

**Full Analysis**
- Complete dossier loaded
- User has reviewed all tabs
- Underwrite is built
- Action: Satisfied? → "Approach Owner" or "Archive"

**Approached**
- Approach letter generated + sent (email/post)
- User waiting for response
- Tracking response deadline
- Action: Response received? → move to "In Negotiation" OR set follow-up → stay in "Approached"

**In Negotiation**
- Owner has expressed interest
- User has made offer / counter-offer in progress
- Tracking offer status, DD checklist, expected completion date
- Action: Deal progresses → handoff to transaction management (separate product) OR falls apart → archive

---

## Pipeline Analytics (Dashboard)

User sees at a glance:
- Total properties in pipeline
- Pipeline value (sum of all estimated purchase prices)
- Potential profit (sum of all profit scenarios)
- Expected ROI (weighted average IRR)
- Response rate (% of approached properties that expressed interest)
- Average time from "Identified" to "In Negotiation"

---

# APPROACH WORKFLOW

When user is ready to approach an owner:

## 1. Generate Letter

System generates a **personalized approach letter** using:
- Property-specific data (address, size, valuation, opportunity, owner situation)
- Owner intelligence (company status, signals, decision-makers)
- Market comps evidence
- User's buying credentials

**Claude AI writes the letter** in professional tone. Letter template varies by situation:
- Corporate owner (active company) — formal, business-focused
- Distressed owner (rates arrears, receivership) — emphasize quick certainty
- Probate estate — empathetic, patient timeline
- Dissolved company / bona vacantia — legal angle

**Example:**
```
Dear [Director Name],

We are property investors seeking institutional-grade acquisition opportunities 
in [Area]. Your property at [Address] matches our investment criteria.

[Paragraph 1: What we know about the property]
Your building is [type], [size], [tenure]. Based on recent market data, we 
estimate current market value at £[X]–£[Y]. The property is [occupied/vacant], 
with [key attributes].

[Paragraph 2: Why we're interested]
We see specific value creation opportunity: [conversion/retrofit/assemblies/etc]. 
The building has [specific advantage] that aligns with our strategy.

[Paragraph 3: Your position]
Our research indicates [owner situation: rates arrears/bridge stress/fund exit/etc]. 
We can offer [structure: quick, certain, cash] completion with [timeline].

[Paragraph 4: Next steps]
We're ready to move quickly if there's mutual interest. No obligation. 
Let's have a confidential conversation.

Best regards,
[User name]
[Phone]
[Email]
```

User can:
- Edit before sending
- Choose tone (formal, direct, consultative)
- Attach comparable evidence pack (PDF)

## 2. Send & Track

User chooses channel:
- **Email** (immediate)
- **Post** (formal, impressive)
- **LinkedIn message** (if director found)

System logs:
- Date sent
- Contact method
- Letter version
- Expected response deadline (user sets, e.g., 14 days)

## 3. Response Tracking

User marks response as:
- **Not interested** — archive property
- **No response** — set follow-up reminder
- **Interested** — property moves to "In Negotiation" column
- **Not now, try later** — mark for re-approach in 6/12 months

---

# USER TYPES & WORKFLOWS

All three user types use the same platform, same pipeline, same data. Differences are in saved searches and export formats.

## Investor
- Builds personal portfolio
- Searches for properties matching personal investment criteria
- Deep-dives on every property they save
- Approaches owners directly
- Manages own pipeline

**Key exports:** Underwrite Excel, investment memo PDF

## Agent
- Scouts for clients (multiple clients, multiple search criteria)
- Builds pipeline of opportunities to present to clients
- Clients can review dossier + underwrite
- Agent handles approach (or client decides)
- Client decides purchase strategy

**Key workflows:** 
- Create saved search per client
- Tag properties by client
- Export as "Investment Opportunity" memo (client-branded)

## Scout
- Works for fund / acquisition team
- Manages high-volume pipeline (100+ properties in various stages)
- Reports to fund manager on deal flow quality
- Filters deals for fund managers to review
- Fund managers use same platform to deep-dive

**Key workflows:**
- Create saved searches per investment thesis
- Bulk tag properties by thesis/risk/return
- Dashboard view (fund manager sees top 20 by IRR)
- Export pipeline report (monthly)

---

# DATA SOURCES & AUTO-POPULATION RULES

DealScope auto-populates from these sources. If data is missing, user can fill the gap or upload documents.

| Data Category | Primary Source | Secondary | User Can Override |
|---------------|---|---|---|
| Property basics (address, postcode, size) | CCOD + EPC register | Land Registry | No |
| Building type | EPC + VOA | Historic England | No |
| Ownership + company status | CCOD + Companies House | Land Registry | No |
| Valuation | Land Registry Price Paid (comps) | Rateable value (RV yield) | Yes (enter custom value) |
| Current rent/occupancy | EPC + rates relief | Lease documents | Yes (user enters actual) |
| Flood/contamination/listed | EA + Historic England + planning.data.gov.uk | User reports | No |
| EPC data | EPC register | User uploads | User can upload new EPC |
| Sale history | Land Registry | User confirms | No |
| Planning history | planning.data.gov.uk | User uploads | User can add |
| Tenant covenant | Companies House | Lease documents | User uploads lease |
| Financing rates | Market data feed | User adjusts | Yes (user sets % rate) |
| Capex / retrofit costs | EPC recommendations | BCIS benchmarks | Yes (user overrides) |

---

# FRICTIONLESSNESS RULES

**Core principle:** If it's public data, auto-populate it. Never ask user to type what we can look up.

**Examples of frictionless UX:**
- User enters postcode → all property data loads instantly
- User selects building type → valuation methodology auto-selects appropriate comps
- User clicks "approach owner" → letter is 80% written, user just edits final tone
- User sets "holding period: 5 years" → all scenarios recalculate instantly
- User uploads tenant lease → system extracts key dates, terms, covenants (OCR + AI)

**User input only when:**
- Local market knowledge (e.g., "is this area gentrifying?")
- Hidden information (e.g., "I know the owner, they want £X")
- Subjective judgment (e.g., "I think the conversion will cost 10% more")
- Documents not on public register (e.g., survey, planning drawings)

---

# BRAND & DESIGN

**Visual identity:**
- Same design system as RealHQ (dark theme, purple accent, serif headings)
- **But:** Simpler, more open, less cluttered
- Property cards feel like real estate (map, image, data hierarchy)
- Underwrite feels like Excel (clean tables, sliders, instant recalc)
- Pipeline feels like Asana (Kanban, quick actions, bulk operations)

**Tone:**
- Professional but human
- No jargon (or explain it)
- Always show your work (why did we estimate this value?)
- Confidence scores on every estimate (trust the data, but know its limits)

---

# WHAT DEALSCOPE IS NOT

- **Not a valuation tool** — estimates only. Always get professional valuation.
- **Not legal advice** — use a solicitor for title issues.
- **Not financial advice** — user is responsible for underwriting assumptions.
- **Not a transaction management platform** — when deal is under offer, user moves to separate product.
- **Not a market predictor** — historical trends only.

---

# SUCCESS METRICS

- Investors finding 5+ properties/month matching their criteria
- Average time from "Identified" to "Approached": <7 days
- Response rate on approach letters: >20%
- Deals closing from pipeline: conversion rate tracked
- Scout/agent feedback: "This saved me X hours of research per week"

---

# ROADMAP (Post-Launch)

**Phase 2:**
- Bulk import: user uploads list of 100 properties → all auto-enriched
- Automatic flagging: system alerts user when known signals change (rates arrears filed, company status changes, planning application nearby)
- Collaboration: teams can share pipelines, assign properties to co-investors

**Phase 3:**
- Auction integration: auto-import from EIG, Allsop, SDL feeds with DealScope intelligence added
- Off-market alerts: partnership with agents for early access to coming-to-market properties

**Phase 4:**
- Transaction handoff: seamless pass to transaction management product (Transactions)
- Financing: embedded financing (partner with lenders to offer pre-approval on top-20 pipeline deals)

---

# CONCLUSION

DealScope turns acquisition from reactive (waiting for listings) to **proactive** (searching the entire market). For investors, agents, and scouts, it's the intelligence layer that turns property discovery into repeatable, data-driven deals.

**Core promise: Find better deals. Faster. With full intelligence. No spreadsheets.**
