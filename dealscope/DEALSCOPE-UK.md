# DealScope UK — Every Data Source

> **Appendix to DEALSCOPE-SPEC.md**
> UK-first build. The UK has the richest free public property data in the world.
> This is the complete map of every data source that makes DealScope a "wow" product.

---

## WHY UK FIRST

The UK has something the US doesn't: a single national Land Registry with bulk download APIs, free Companies House data on every company, free planning data, free EPC data, and a Gazette that publishes every insolvency notice. You can build a genuine intelligence product from free data alone. In the US, everything is fragmented by county.

---

## UK FREE GOVERNMENT DATA SOURCES (the foundation)

### HM Land Registry — use-land-property-data.service.gov.uk
**All free with account. Monthly bulk CSV downloads. API available.**

| Dataset | What it contains | Signal value |
|---------|-----------------|-------------|
| **CCOD** (UK Companies that Own Property) | Company name, registration number, title number, property address, price paid, tenure | **GOLD.** Cross-ref with Companies House to find distressed company → property. Every corporate-owned property in England & Wales |
| **OCOD** (Overseas Companies that Own Property) | Overseas entity name, country, title, address, price paid | Foreign ownership. Offshore entities = opaque structures, sometimes distressed or motivated to exit |
| **Price Paid Data** | Every property transaction since 1995. Price, date, address, property type, new/existing | Comparable evidence. Identify areas of rapid growth. Track portfolio churn |
| **Transaction Data** | Monthly transaction volumes by area, property type | Market activity indicator. Falling transactions = buyers' market |
| **UK House Price Index** | National/regional price indices, monthly | Market direction. Falling index = motivated sellers |
| **Lease Data** | Registered leases: start date, term length, property address | Lease expiry tracking across entire market. Short remaining terms = motivated to trade |
| **INSPIRE Polygons** | Geographic boundaries of all registered titles | Map every registered title. GIS overlay with other data |
| **National Polygon Service** | Title boundaries, ownership class, unique property reference numbers | £20k/yr. Premium but incredibly powerful for mapping ownership |

### Companies House — api.company-information.service.gov.uk
**Completely free. 600 requests/min. No cost.**

| Endpoint | What it reveals | Signal value |
|----------|----------------|-------------|
| **Company search** | Find any company by name, number, director | Match CCOD owner names to company records |
| **Company profile** | Status (active, dissolved, in administration, liquidation), accounts overdue, confirmation statement overdue | **CRITICAL.** Active/dissolved/administration status is the single most powerful distress signal |
| **Filing history** | Every document filed: annual accounts, confirmation statements, charges, resolutions | Overdue filings = financial stress. Charge creation = new debt. Resolution to wind up = imminent sale |
| **Officers (directors)** | Current and resigned directors, appointment/resignation dates, date of birth, nationality | Director resignation spike = trouble. Cross-ref directors across companies (portfolio mapping) |
| **Persons of Significant Control (PSC)** | Beneficial owners with >25% control | True ownership. Track when PSCs change (signals sale/restructuring) |
| **Charges** | Mortgages and security interests registered against company assets | **KEY.** New charge from non-bank lender (bridging, mezzanine) = financial stress. Multiple charges = leveraged. Charge satisfaction = debt paid off (refinanced or sold) |
| **Insolvency** | Administration orders, CVAs, liquidation, receivers | Direct distress signal. IP appointment = assets will sell |
| **Company accounts** (via iXBRL) | Filed accounts: turnover, P&L, balance sheet, debts | Financial health. Declining turnover + rising debt = pressure to sell assets |

### The Gazette — thegazette.co.uk/api
**Free API. Structured data.**

| Notice type | What it signals |
|------------|----------------|
| **Winding-up petitions** | Creditor forcing company to close. Property must be sold |
| **Administration orders** | Company in administration. Administrator will review all assets |
| **Appointment of receivers** | Secured creditor appointing receiver over specific assets (often property) |
| **Voluntary arrangements (CVA)** | Company restructuring debts. May include property disposals |
| **Striking off** | Company being removed from register. Any property becomes bona vacantia (Crown property) unless transferred |
| **Dissolution** | Company dissolved. Property transfer must happen first or becomes Crown property |
| **Probate notices** (s.27 Trustee Act) | Estate administration. Property in deceased estates will be distributed/sold |

### EPC Register — epc.opendatacommunities.org
**Free API. Every EPC certificate in England & Wales.**

| Data | Signal value |
|------|-------------|
| **Non-domestic EPCs** | Every commercial building's energy rating, floor area, building type, heating, CO2 emissions |
| **Display Energy Certificates (DECs)** | Public buildings' actual energy use. Required for >250 sqm |
| **EPC rating (A-G)** | Poor EPC (F/G) = MEES compliance risk. Owner may sell rather than spend on upgrades |
| **Floor area** | Sqft of every certified commercial property. Free sizing data |
| **Recommendations** | Suggested improvements + cost estimates. Indicates capex needed |
| **Property age + type** | Building characteristics. Cross-ref with other datasets |

### VOA (Valuation Office Agency) — voa.gov.uk
**Rateable value data. Free for summary, paid for detail.**

| Data | Signal value |
|------|-------------|
| **Rateable values** | Every non-domestic property's assessed rental value for business rates |
| **Rating list entries** | Property descriptions, floor areas, use types |
| **Appeals** | Properties under appeal = dispute about value = potential opportunity |
| **Changes** | Rateable value changes signal use change, redevelopment, or vacancy |
| **Special category codes** | Property type classification (shop, office, warehouse, etc.) |

### planning.data.gov.uk
**Free API. ~60% of UK Local Planning Authorities.**

| Data | Signal value |
|------|-------------|
| **Planning applications** | Every application near your target properties |
| **Change of use applications** | Owner seeking different use = may sell if denied, or signals market shift |
| **Demolition notices** | Redevelopment planned |
| **Listed building consent** | Heritage constraints = affects value |
| **Conservation area status** | Development restrictions |
| **Tree preservation orders** | Development constraints |

### Other Free UK Government Sources

| Source | URL | Data | Signal |
|--------|-----|------|--------|
| **ONS** | ons.gov.uk | Demographics, population growth, employment, household income by area | Market fundamentals |
| **MHCLG Open Data** | opendatacommunities.org | Index of Multiple Deprivation, housing stats, planning decisions | Area-level intelligence |
| **Environment Agency** | environment.data.gov.uk | Flood risk zones, contaminated land, bathing water quality | Risk assessment, discount opportunities |
| **Historic England** | historicengland.org.uk | Listed buildings, heritage at risk register | Development constraints. "Heritage at risk" = neglected = opportunity |
| **Forestry Commission** | forestry.gov.uk/open-data | Woodland ownership, land use | Rural/agricultural land opportunities |
| **Coal Authority** | data.gov.uk | Mining hazards, coal mining search areas | Risk factor for CRE |
| **DESNZ** | gov.uk | Sub-national energy consumption data by MSOA | Energy costs by area |
| **DfT** | gov.uk | Transport accessibility (PTAL equivalent), road traffic counts | Location quality scoring |
| **ONS Census 2021** | census.gov.uk | Granular population, tenure, employment, commuting data | Demand modelling by area |
| **UK Insolvency Register** | insolvencydirect.bis.gov.uk | Individual insolvency (IVA, bankruptcy, DRO) | Personal bankruptcy of property owners |
| **Registers of Scotland** | ros.gov.uk | Scottish property ownership, transactions | Scotland coverage |
| **Land & Property Services NI** | finance-ni.gov.uk | Northern Ireland property data | NI coverage |

---

## UK AUCTION HOUSES — Complete List

| Auction House | Website | Specialism | Frequency |
|---------------|---------|-----------|-----------|
| **Allsop** | allsop.co.uk | UK's largest. £1bn+ annual. All sectors | 8–10/yr |
| **Savills Auctions** | savills.co.uk/auctions | Premium. 79% success rate. Live stream | 18/yr |
| **Acuitus** | acuitus.co.uk | Commercial specialist. £3bn+ raised | 6–8/yr |
| **SDL Auctions** | sdlauctions.co.uk | National. Mixed commercial + resi | Monthly |
| **Auction House UK** | auctionhouse.co.uk | Largest network. 40+ rooms | Monthly per region |
| **Clive Emson** | cliveemson.co.uk | Southern England specialist | 8/yr |
| **Pugh Auctions (BTG Eddisons)** | pugh-auctions.com | National. 25+ years | Monthly |
| **BTG Eddisons** | btgeddisons.com | Auctions + advisory | Monthly |
| **Strettons** | strettons.co.uk | London specialist. 91% success | 6/yr |
| **Barnard Marcus** | barnardmarcus.co.uk | London + South East | Monthly |
| **Network Auctions** | networkauctions.co.uk | Regional expertise | 10/yr |
| **Romans Auction** | romansauction.co.uk | 300+ branches | Monthly |
| **Lambert Smith Hampton Auctions** | lsh.co.uk | Mid-market commercial | Periodic |
| **Pattinsons Auction** | pattinson.co.uk | National online | Monthly |
| **DALINGTON Auction House** | dalington.co.uk | London commercial | Periodic |
| **Cottons** | cottons.co.uk | West Midlands | Periodic |
| **Countrywide Property Auctions** | countrywidepropertyauctions.co.uk | National residential + commercial | Monthly |
| **iamsold** | iamsold.co.uk | Modern Method of Auction platform | Continuous |
| **SDL Property Auctions** | sdlauctions.co.uk | Part of SDL Group | Monthly |
| **Mark Jenkinson** | markjenkinson.co.uk | Sheffield / Yorkshire | Periodic |
| **Feather Smailes & Scales** | fssproperty.co.uk | Yorkshire + NE | Periodic |
| **Bagshaws** | bagshaws.com | East Midlands | Periodic |
| **Besley Hill** | besleyhill.co.uk | Bristol / South West | Periodic |
| **Town & Country** | townandcountryauctions.co.uk | Wales + West | Periodic |

---

## UK AGENT WEBSITES — Scrape for Listings

### National / International
CBRE UK, JLL UK, Cushman & Wakefield UK, Colliers UK, Savills, Knight Frank, BNP Paribas RE, Avison Young UK, Newmark UK, Lambert Smith Hampton, Allsop, BTG Eddisons, Gerald Eve, Carter Jonas, Montagu Evans, Cluttons, Bidwells, Vail Williams, Rapleys, Hartnell Taylor Cook

### Regional (high deal flow)
Burston Cook (Bristol), Alder King (South West), Ashtenne (Industrial), LSH (National mid-market), Christie & Co (hospitality, healthcare, retail), Fleurets (licensed/leisure), Davis Coffer Lyons (London leisure), Levy Real Estate (London), Strettons (East London), Fawcett Mead (London), Edward Charles & Partners (London)

### Specialist
**Christie & Co** — hospitality, healthcare, childcare, retail. Often distressed sellers in these sectors.
**Fleurets** — pubs, bars, restaurants, hotels. High failure rate = distressed deal flow.
**Davis Coffer Lyons** — London leisure. Restaurant/bar failures.
**GVA (now Avison Young)** — public sector disposals.

---

## UK DISTRESS / LIQUIDATION FIRMS

| Firm | Website | Specialism |
|------|---------|-----------|
| **Begbies Traynor** | begbies-traynorgroup.com | UK's largest IP. Red Flag Alert = early warning |
| **Hilco Capital** | hilcocapital.com | Retail restructuring, distressed investments |
| **Interpath Advisory** (ex-KPMG) | interpathadvisory.com | Large-scale administrations |
| **Alvarez & Marsal UK** | alvarezandmarsal.com | Restructuring, turnaround |
| **FTI Consulting UK** | fticonsulting.com | Restructuring, corporate finance |
| **Grant Thornton UK** | grantthornton.co.uk | Insolvency, administration |
| **PwC Restructuring** | pwc.co.uk | Major administrations |
| **Deloitte Restructuring** | deloitte.co.uk | Major administrations |
| **EY Restructuring** | ey.com | Major administrations |
| **Kroll UK** | kroll.com | Restructuring, valuation |
| **Smith & Williamson (Evelyn Partners)** | evelyn.com | Mid-market insolvency |
| **Quantuma** | quantuma.com | Mid-market restructuring |
| **Opus Restructuring** | opusllp.com | SME insolvency |
| **RSM Restructuring** | rsmuk.com | Mid-market |
| **BDO Restructuring** | bdo.co.uk | Mid-market |
| **Mazars Restructuring** | mazars.co.uk | Mid-market |
| **PKF Restructuring** | pkf-l.com | Regional |
| **Moore Kingston Smith** | mooreks.co.uk | London mid-market |
| **Savills Distressed / Receivership** | savills.co.uk | Property-specific receivership advisory |
| **CBRE Receivership** | cbre.co.uk | Fixed charge receiver appointments |
| **Colliers Receivership** | colliers.com | LPA receivership |

**KEY INSIGHT:** Monitor the appointment notices of these firms. When Begbies Traynor is appointed as administrator of a company, search CCOD for properties owned by that company. Those properties WILL be sold.

---

## UK-SPECIFIC SIGNAL SOURCES NOBODY ELSE USES

### 1. Begbies Traynor Red Flag Alert
Begbies Traynor publishes a quarterly "Red Flag Alert" report tracking financially distressed companies by sector and region. The underlying data (county court judgments, winding-up petitions, accounts overdue) can be replicated from public sources. But the report itself flags sectors under stress — if "retail" is showing 25% increase in critical distress, every retail property owner in that sector is under pressure.

### 2. Companies House Charges Register
When a company registers a new charge (mortgage/security) from a **non-bank lender** — bridging finance company, mezzanine provider, or private lender — this is a strong distress signal. Banks have rejected them. They're paying 12–18% interest. They will need to sell or refinance within 12–24 months.

**Bridging lenders to watch for in charges register:** Octopus Real Estate, LendInvest, Masthaven, UTB, Together, Shawbrook, Assetz Capital, CrowdProperty, Zorin Finance, Magnet Capital

### 3. London Gazette Probate Notices (Section 27)
When someone dies and their estate includes property, the executor publishes a s.27 notice in the Gazette. This gives creditors 2 months to make claims. After that, the estate is distributed. **Monitor these for property-owning individuals.** Cross-ref the deceased's name against CCOD to find which properties they owned. These properties will be sold within 6–18 months.

### 4. Charity Commission Annual Returns
Charities that own property must file annual returns. If a charity's income is declining, they may need to sell assets. Cross-ref charity names against CCOD. Charity disposals must go through a surveyor valuation process (Charities Act 2011, s.119) — they MUST sell at best value, which means they're motivated but can't be lowballed.

### 5. NHS Surplus Property
NHS Property Services regularly disposes of surplus healthcare properties. These are published on their website but rarely monitored by commercial investors. Many are in prime locations (former GP surgeries, clinics, health centres in town centres).

### 6. MOD / Defence Infrastructure Organisation
The MOD disposes of military land and buildings. Published but not well-known in commercial circles. Large sites, often with development potential.

### 7. Local Authority Surplus Assets
Every local council in England publishes an "assets of community value" register and periodically disposes of surplus property. Monitoring ~300 council websites is tedious but there's gold — council-owned commercial properties in good locations.

### 8. Network Rail Surplus Land
Network Rail disposes of former railway land, arches, and ancillary buildings. Commercial arches under railway bridges are a growing asset class (food halls, craft breweries, offices).

### 9. Right to Buy — Housing Association Surplus
Housing associations periodically dispose of non-core commercial property. Registered with the Regulator of Social Housing — financial stress among HAs is publicly reported.

### 10. Court of Protection Deputyship
When an individual loses mental capacity (dementia, brain injury), a deputy is appointed by the Court of Protection. If they own commercial property, it's often sold. Court of Protection orders are published but very rarely monitored for property signals.

---

## THE "WOW" LAYER — WHAT MAKES THIS SPECIAL

**Cross-referencing is the magic.** No single source is remarkable. The wow comes from connecting:

1. **CCOD** (Land Registry) tells you Company X owns Property Y
2. **Companies House** tells you Company X has just entered administration
3. **The Gazette** confirms the administrator appointment
4. **Charges register** shows 3 bridging loans registered in the last 12 months
5. **EPC data** shows the property is rated F (MEES risk — illegal to let from 2027)
6. **Planning data** shows a change-of-use application was submitted and refused
7. **VOA** shows the rateable value dropped 20% at last revaluation

Each signal alone is worth noting. All 7 together on the same property? That's a deal you should call about TODAY.

**No competitor does this cross-referencing at scale.** They either have listing data (Rightmove, CoStar) OR distress data (Begbies Red Flag) OR corporate data (Companies House). Nobody stitches them all together per property with a score.

---

## MVP BUILD ORDER (UK)

### CATEGORY 8: ABSENT OWNERS & VACANT PROPERTIES

This is one of the strongest acquisition signals. 265,000+ long-term empty homes and 165,000+ vacant commercial properties in England alone. Absent owners are passive, disengaged, often inherited the property, and frequently willing to sell at a discount to avoid ongoing costs.

**How to detect absent owners from public data:**

| Detection Method | Source | Logic | Free? |
|-----------------|--------|-------|-------|
| **CCOD owner address ≠ property address** | Land Registry CCOD bulk download | If Company X's registered office is in London but owns a warehouse in Newcastle, the owner is absent. Cross-ref company registered office vs property location | Free |
| **Overseas owner** | OCOD (Overseas Companies Ownership Data) | Every overseas entity owning UK property is listed. Overseas owners are by definition absent and often motivated to exit | Free |
| **Business rates empty property relief** | VOA / Council NNDR records | Councils publish empty property relief data. Properties receiving empty rates relief are confirmed vacant | Free (council data) |
| **Council Tax empty premium** | MHCLG Council Taxbase statistics | Councils charge up to 300% council tax premium on long-term empty homes. Published in aggregate by council area. FOI for property-level | Free (aggregate), FOI (detail) |
| **No EPC lodged in 10+ years** | EPC Register | If a commercial property has no EPC and hasn't transacted, it may be vacant or owner disengaged. Active properties need EPCs for letting | Free |
| **Dissolved company still on CCOD** | CCOD + Companies House | Company dissolved but property not transferred = bona vacantia (Crown property) or stuck in limbo. Owner literally doesn't exist anymore | Free |
| **Director correspondence address abroad** | Companies House officers endpoint | UK company director living overseas = absent management. Property may be neglected | Free |
| **No charge activity in 10+ years** | Companies House charges | No new mortgages, no refinancing, no activity = passive owner sitting on unleveraged asset | Free |
| **Electoral roll — no residents at commercial property address** | Electoral roll (paid) | Cross-ref with property type. Some mixed-use buildings have residential components — if nobody's registered, it's vacant | Paid (£) |
| **Google Street View — visual vacancy** | Google Maps API | Boarded windows, overgrown entrance, no signage, shuttered shopfront. Can be automated with image classification (Claude Vision) | Free API |
| **Utility disconnection** | Freedom of Information (water companies publish some data) | Property with no water/electricity connection = vacant | FOI |
| **Mail redirection / return to sender** | Royal Mail (not directly accessible) | Inferred from correspondence returns. If letters to owner bounce, they're absent | Indirect |
| **Planning enforcement notices** | Council planning portals | Untidy land notices, breach of condition — council chasing an absent owner who isn't maintaining | Free |
| **Land Registry last transaction 20+ years ago** | Price Paid Data | Property not transacted in 20+ years = long-term passive owner. Combined with other signals (company dissolved, no charges) = strong absent signal | Free |
| **Bona vacantia list** | gov.uk/government/organisations/bona-vacantia | Properties owned by dissolved companies that have reverted to the Crown. Literally available to purchase from the government | Free |

**Absent owner scoring:**

| Signal combination | Score | Action |
|-------------------|-------|--------|
| Overseas owner + no EPC + no charge activity | HOT | Direct approach via registered agent |
| Dissolved company + property on CCOD + not on bona vacantia list | HOT | Contact Crown BV division or former directors |
| Owner address >100 miles from property + no charge in 10 years | WARM | Letter of approach |
| Empty rates relief + last sale 20+ years ago | WARM | Letter + comparable evidence showing value |
| Google Street View shows vacancy + no EPC + planning enforcement | WARM | Direct approach + council liaison |

**The "wow" here:** Nobody systematically matches the Land Registry ownership address against the property address at scale. A simple algorithm — "owner's registered office is >50 miles from the property" — flags tens of thousands of potentially absent owners. Cross-reference with Companies House (is the company still active? are accounts filed? are there bridging loans?) and you get a scored list of every absent-owner commercial property in England & Wales.

**Approach workflow for absent owners:**
1. DealScope identifies absent owner from data cross-reference
2. Look up company/individual via CCOD → Companies House → director details
3. Generate personalised approach letter (Claude) citing the property, its condition, market value, and a buying proposition
4. Send via post to registered office + email to director (if found via Companies House)
5. Track responses in CRM
6. If interested → feed into RealHQ Scout pipeline

---

## MVP BUILD ORDER (UK)

### Week 1–2: Foundation
- CCOD bulk download + parser (every corporate-owned property in England & Wales)
- Companies House API integration (company status, officers, charges, insolvency)
- Cross-reference: CCOD owner → Companies House status
- Score every property: owner in administration/liquidation/dissolved = HOT

### Week 3–4: Distress Layer
- London Gazette API (insolvency notices, probate notices)
- Match Gazette notices → Companies House → CCOD → property
- Charges register monitoring (new charges from bridging lenders = stress signal)
- UK Insolvency Register (personal bankruptcy of property owners)

### Week 5–6: Listing Layer
- Rightmove Commercial scraper
- Auction house scrapers (Allsop, Savills, Acuitus, SDL, Auction House UK)
- Agent website scrapers (top 20 agents)
- Cross-ref: property listed for sale + owner in distress = HIGH CONVICTION

### Week 7–8: Enrichment
- EPC data (energy ratings, floor areas, building types)
- VOA rateable values (market rent proxies)
- Planning data (applications near properties, change of use)
- Environment Agency (flood risk overlay)

### Week 9–10: Intelligence
- Claude classification of Gazette notices (read the actual text, extract structured data)
- Director network mapping (same director across multiple companies = portfolio-level distress)
- News monitoring (Google News + industry press)
- Dashboard + alerts

### Week 11–12: Product Polish
- Map view (every scored property on a map, colour-coded by score)
- Signal timeline per property (when each signal was detected)
- Compare properties side-by-side
- Email alerts when new signals detected on watched properties
- RealHQ integration (feed deals into Scout v2)
