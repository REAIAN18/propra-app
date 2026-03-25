# UK Planning Portal Data Sources
**Wave 2 Planning Intelligence Feature — Research Brief**
*Prepared by Head of Real Estate & Commercial*

---

## Purpose

RealHQ Wave 2 will surface planning risk and opportunity at the asset level. This document identifies every authoritative data source available in the UK for planning applications, decisions, and constraints — with notes on access method, data quality, and how to use each for the product.

---

## Tier 1: Authoritative National Sources

### 1. Planning Portal (planningportal.co.uk) / MHCLG Open Data

**What it contains:**
- All submitted and decided planning applications from every English LPA (Local Planning Authority)
- Application reference numbers, decision type (approved/refused/withdrawn), decision date
- Application type: full permission, prior approval, householder, change of use, listed building consent
- Applicant name, agent name, site address, description of development

**Access method:**
- No single national API. Data is held at LPA level.
- MHCLG (Ministry of Housing, Communities & Local Government) publishes aggregate statistics quarterly
- **PlanIT** (planning data from DLUHC): `planning.data.gov.uk` — REST API, free, updated regularly
- **INSPIRE datasets** from individual LPAs — bulk shapefiles downloadable per LPA

**Key endpoint:**
```
GET https://www.planning.data.gov.uk/entity.json?dataset=planning-application&geometry_reference=E07000105
```

**Data quality:** Variable by LPA. London boroughs and large urban authorities have good digital records to ~2010. Smaller rural LPAs may have patchy pre-2015 digitisation.

**How to use in RealHQ:**
- Pull all planning applications within 500m of an asset address (spatial query via UPRN or postcode)
- Surface: pending applications near the asset (e.g., competing retail permission next door), historic refusals, Article 4 Directions
- Flag: "2 planning applications within 200m in last 24 months" as a risk/opportunity signal

---

### 2. planning.data.gov.uk (DLUHC Planning Data Platform)

**What it contains:**
- Planning applications (as above, but also Conservation Areas, Listed Buildings, Article 4 Directions, Tree Preservation Orders, Flood Risk Zones, SSSI, AONB boundaries)
- All data is GeoJSON accessible via REST API
- Datasets include: article-4-direction, brownfield-land, conservation-area, development-policy-document, flood-risk-zone, heritage-at-risk, listed-building, local-plan, national-park

**Access method:**
- Free REST API. No auth required for most datasets.
- Documentation: `https://www.planning.data.gov.uk/docs`
- Coverage: England only. Some datasets have full national coverage; others are LPA-dependent.

**Key datasets for CRE:**
```
GET https://www.planning.data.gov.uk/entity.json?dataset=conservation-area&point=LONGITUDE,LATITUDE
GET https://www.planning.data.gov.uk/entity.json?dataset=listed-building&point=LONGITUDE,LATITUDE
GET https://www.planning.data.gov.uk/entity.json?dataset=article-4-direction&point=LONGITUDE,LATITUDE
GET https://www.planning.data.gov.uk/entity.json?dataset=flood-risk-zone&point=LONGITUDE,LATITUDE
```

**How to use in RealHQ:**
- Automatic constraint detection on asset upload: "This asset is within a Conservation Area — permitted development rights may be restricted"
- Listed building status flag with grade (I, II*, II) — significant impact on capex budgeting
- Article 4 Directions: specific restrictions on change of use; critical for office-to-residential or industrial-to-mixed conversions
- Flood risk zone overlay: risk-flag for insurance, compliance, and future valuation

---

### 3. Land Registry Price Paid / INSPIRE (HMLR)

**What it contains:**
- All registered property transactions in England and Wales since 1995
- Sale price, date, property type (commercial flag from category), address, tenure (freehold/leasehold)
- Does NOT include: off-market transactions, share sales (company acquisition of SPV), or non-registered properties

**Access method:**
- Bulk download: `https://www.gov.uk/government/collections/price-paid-data`
- Also accessible via SPARQL endpoint and direct HTTP download (CSV)
- Commercial transactions are flagged but less reliably categorised than residential

**How to use in RealHQ:**
- AVM calibration: use nearby commercial transactions as comparables for valuation
- Ownership change signal: if a neighbouring asset sold recently, it may trigger planning applications or site assemblies nearby
- Yield calculation: transaction price ÷ known rent income = implied cap rate

---

### 4. Valuation Office Agency (VOA)

**What it contains:**
- Non-Domestic Rates (NDR) data: Rateable Value, property description, hereditament address
- All commercial properties in England and Wales
- Updated on each revaluation cycle (most recent: 1 April 2023 from 2021 rental evidence)

**Access method:**
- Open dataset: `https://www.gov.uk/guidance/find-a-business-rates-valuation`
- Bulk download available via `https://www.gov.uk/government/statistical-data-sets/non-domestic-rating-stock-of-properties-england`
- API: VOA does not provide a formal REST API but the bulk dataset is regularly updated CSV

**How to use in RealHQ:**
- Cross-reference rateable value against passing rent (RV is typically 60-80% of passing rent for well-let commercial)
- Flag if RV is disproportionately high relative to passing rent — rates overpayment risk
- Identify SBRR (Small Business Rates Relief) eligibility for tenants — relevant for lease negotiations on smaller units
- Appeals data: an asset with a pending RV appeal may see its rates liability materially change

---

### 5. OS Data Hub (Ordnance Survey)

**What it contains:**
- AddressBase Premium: UPRN (Unique Property Reference Number) for every addressable location in GB
- OS MasterMap Topography: building footprints, site boundaries, roads, topology
- OS Zoomstack: basemap data
- Open Roads, Open Names

**Access method:**
- OS Data Hub: `https://osdatahub.os.uk/` — free tier available (5k API calls/day on OS Places API)
- OS Places API: address lookup, UPRN resolution, proximity search
- MasterMap requires paid licence (OS Partner / PSMA)

**How to use in RealHQ:**
- UPRN as the master property identifier — link planning, VOA, and Land Registry data on a single canonical ID
- Building footprint from MasterMap → calculate roof area for solar opportunity sizing
- Site boundary data → accurate sqft / site area for benchmarking

---

## Tier 2: LPA-Level Sources (London / SE England Focus)

### 6. London Planning Application Search (GLA / individual borough portals)

**What it contains:**
- Full planning application history for all 33 London boroughs
- GLA (Greater London Authority) handles strategic applications (>200 units, major commercial)
- Each borough runs its own portal (many use Idox / Uniform / MasterGov systems)

**Access:**
- No single London-wide API. Borough portals are Idox-based — HTML scraping required for most
- GLA planning: `https://www.london.gov.uk/programmes-strategies/planning/planning-applications-and-decisions`
- **PlanX** (used by Southwark, Camden, others): open source planning tool with structured data

**Relevant for SE England (Wave 1 prospect geography):**
- Dartford: Dartford Borough Council — uses Idox portal
- Thurrock: Thurrock Council — Idox
- Basildon: Basildon Borough Council — Idox
- Medway: Medway Council — Idox
- Gravesend: Gravesham Borough Council — Idox

**Idox scraping pattern:**
```
https://planning.dartford.gov.uk/planning/search-applications?
  searchType=Application&
  searchText=[ADDRESS|POSTCODE]&
  dateType=DC_Validated&
  dateStart=01/01/2020
```

---

### 7. Environment Agency Flood Map for Planning

**What it contains:**
- Flood zones 1, 2, 3 (England) — risk of flooding from rivers and sea
- Surface water flood risk
- Reservoir flood risk areas
- Historic flood outlines

**Access:**
- WMS (Web Map Service) and WFS (Web Feature Service) — free, no auth
- `https://environment.data.gov.uk/arcgis/rest/services/EA/FloodMapForPlanningRiversAndSeaFloodZone3/FeatureServer/0/query`

**How to use in RealHQ:**
- Flood zone flag on any asset — insurance implication, MEES/planning risk
- Flood zone 3 = significant: typically requires Sequential and Exception Tests for new development
- Key for SE UK (Dartford, Gravesend, Thurrock are all in Thames flood corridor)

---

## Tier 3: Third-Party Aggregators

### 8. Nimbus Maps / Searchland / LandInsight

**What they contain:**
- Aggregated planning history, land ownership, constraints, comparable transactions
- Best-in-class UI/UX for planning intelligence; proprietary enrichment on top of public data
- Nimbus: strongest for CRE and development site analysis in SE England

**Access:**
- Subscription API (Nimbus: `https://developer.nimbusinfrastructure.com/`)
- LandInsight: API available for enterprise customers
- Searchland: API available, strong on off-market and agricultural land

**Commercial use case:**
- For RealHQ Wave 2, Nimbus Maps API is the most credible single-source option for planning constraint and comparable data if building from scratch is not viable
- Cost: Nimbus API pricing is volume-based, approximately £500-2,000/month for a startup tier
- Risk: dependency on a third party who is also a CRE product — potential future conflict

### 9. CoStar / EGi (Estates Gazette Intelligence)

**What they contain:**
- Comprehensive UK commercial comparable transactions, asking rents, available space
- CoStar: dominant in institutional CRE; very expensive but best data quality
- EGi: Estates Gazette transaction database — slightly cheaper, CRE focused

**Access:**
- Both are paid subscription data providers with no public API
- CoStar: enterprise licence required (~£15-40k/year for a startup)
- EGi: more accessible pricing for smaller firms
- Neither provides a developer API suitable for automated product integration without enterprise agreement

---

## Recommended Implementation Sequence for Wave 2

| Phase | Data Source | What to build | Effort |
|---|---|---|---|
| **Wave 2.0** | planning.data.gov.uk | Conservation area, listed building, Article 4, flood zone flags on asset profile | Low (free API) |
| **Wave 2.0** | VOA bulk data | Rateable value display + rates overpayment flag | Low (bulk CSV) |
| **Wave 2.1** | OS Places API | UPRN resolution on address entry — powers all downstream lookups | Low (free tier) |
| **Wave 2.1** | Environment Agency WFS | Flood zone visual + risk flag | Low (free) |
| **Wave 2.2** | Idox scraping (SE England LPAs) | Planning application history within 500m of each asset | Medium |
| **Wave 2.3** | Land Registry bulk download | Nearby commercial transactions for AVM calibration | Medium |
| **Wave 2.4** | Nimbus Maps API | Full planning intelligence package (paid, reduces build) | Low-Medium (paid) |
| **Future** | CoStar/EGi | Market rent comparables — requires enterprise agreement | High effort + cost |

---

## Key Technical Notes

**UPRN as the master join key:**
Every UK property has a UPRN. This is the canonical identifier that connects AddressBase (OS), Land Registry, VOA, planning data, and flood risk datasets. RealHQ should resolve UPRN on every property address entry — this unlocks all downstream data joins.

**Geometry-based queries:**
Most planning.data.gov.uk queries accept a `point=` parameter (WGS84 longitude,latitude) or a geometry/UPRN. Use postcode → centroid lat/lng for initial queries; resolve to exact UPRN for production.

**Data freshness:**
- planning.data.gov.uk: updated weekly
- VOA: updated per revaluation cycle (next: 2026)
- Land Registry: updated monthly (bulk) or near-real-time (INSPIRE)
- Environment Agency flood maps: updated annually or post-major-flood event

**England-only note:**
planning.data.gov.uk and VOA cover England and Wales. Scotland has its own planning portal (ePlanning.scot) and Assessors' Portal for rates. Northern Ireland: Planning Portal NI. Any UK-wide ambition needs separate integrations for devolved jurisdictions.

---

*Prepared by Head of Real Estate & Commercial | March 2026*
*Sources: DLUHC, MHCLG, HMLR, VOA, OS, Environment Agency, Nimbus Maps documentation*
