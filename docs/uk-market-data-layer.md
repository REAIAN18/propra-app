# UK Market Data Layer Spec: SE UK vs FL

**Status:** Draft
**Date:** 2026-03-21
**Author:** Head of Product
**Sources:** RealHQ-Spec-v3.2, Addendum v3.1, uk-planning-data-sources.md, fl-market-benchmarks.md
**Geography:** SE England (Kent, Essex, East London, Thames Estuary) vs Florida (primary Wave 1 market)

---

## Purpose

RealHQ is launching in SE UK as its second market after Florida. The product data layer is materially different: different APIs, different property registers, different lease structures, different regulatory frameworks. This doc specifies exactly what changes and what stays the same.

---

## Side-by-side: FL vs SE UK data layer

| Data category | Florida (Wave 1) | SE UK (Wave 2) | Shared? |
|---------------|-----------------|----------------|---------|
| Property identifier | Parcel number (per county) | UPRN (Unique Property Reference Number) | No |
| Title / ownership | County Property Appraiser website (per county) | HM Land Registry API | No |
| Valuation (AVM) | ATTOM AVM API | CoStar AVM (UK) | No |
| Comparable transactions | CoStar / LoopNet | Land Registry Price Paid + EGi | Partially (CoStar covers both) |
| Market rent data | CoStar / LoopNet / CREXI | CoStar / EGi / Rightmove Commercial | Partially (CoStar) |
| EPC / energy rating | No equivalent (FL has no EPC) | EPC Register API (MHCLG) | No |
| Planning permissions | County/municipal portals (no standard API) | planning.data.gov.uk + Idox LPA portals | No |
| Flood risk | FEMA National Flood Insurance API | Environment Agency WFS API | No |
| Rates / property tax | County Property Appraiser (per county) | VOA (Valuation Office Agency) — rateable value | No |
| Insurance data | CoverForce (US commercial insurance) | CoverForce (where available) / specialist UK brokers | Partially |
| Energy tariffs | FPL, Duke, TECO utility APIs **(usage/billing data only — tariff switching not possible; these are regulated monopoly utilities)** | Octopus, EDF, British Gas, E.ON switching APIs | No |
| Smart meter reads | Green Button Connect (per utility) | DCC / n3rgy (SMETS2) | No |
| Solar assessment | Google Solar API | Google Solar API | Yes |
| Contractor network | US contractor panel | UK contractor panel (Gas Safe, NICEIC, CHAS) | No |
| Legal templates | US jurisdiction (state-specific) | UK jurisdiction (JCT, CRAR, LTA 1954) | No |
| Lease structure | Gross / NNN / Modified Gross; $/sqft/yr | FRI or IRI; £/sqft/yr (or £/pa); service charge separately | No |
| Rent review mechanism | Annual CPI escalator typical | OMV / RPI / fixed uplift at set intervals | No |
| Tenant credit scoring | D&B Hoovers / Creditsafe | Companies House + Creditsafe + D&B Hoovers | Partially |
| Planning consent model | Zoning (by-right) | Development management (case-by-case) | No |

---

## FL-only features (not available in SE UK)

| Feature | Why FL-only |
|---------|------------|
| CAM reconciliation (NNN leases) | SE UK uses FRI leases — landlord rarely recovers operating costs via CAM. Service charge is different concept. |
| Per-county property appraiser data | No equivalent — UK uses national registers (HMLR, VOA, EPC) |
| FEMA flood zones by parcel | Environment Agency replaces this in UK |
| Green Button Connect energy data | DCC/n3rgy replaces this in UK |
| US state-specific legal templates | UK templates required (JCT, LTA 1954 statutory notices, CRAR) |

---

## SE UK-only features (not available in FL)

| Feature | Why UK-only |
|---------|------------|
| EPC rating and MEES compliance | FL has no energy performance certificate requirement |
| MEES deadline tracking (EPC E by 2025, EPC C target TBC) | UK regulatory requirement — affects lettability |
| Article 4 Direction detection | UK planning constraint on permitted development rights |
| Conservation area and listed building status | UK heritage designations — no US equivalent at this granularity |
| Rateable value / business rates | VOA rateable value + SBRR eligibility — UK-specific |
| Section 25 / section 26 notices (LTA 1954) | UK commercial lease renewal statutory framework |
| CRAR (Commercial Rent Arrears Recovery) | UK enforcement mechanism, replaces US pay-or-quit |
| DCC smart meter network | UK-specific smart meter infrastructure |
| Stamp Duty Land Tax (SDLT) calculation | UK transaction tax — FL uses documentary stamp tax (different rules) |

---

## SE UK API inventory

### Free / low-cost (build immediately)

| API | Data | Endpoint | Notes |
|-----|------|----------|-------|
| planning.data.gov.uk | Conservation areas, listed buildings, Article 4 directions, flood zones, brownfield land | `https://www.planning.data.gov.uk/entity.json?dataset=...&point=LNG,LAT` | Free, no auth, weekly updates |
| OS Places API | UPRN resolution, address lookup, proximity search | `https://api.os.uk/search/places/v1/` | Free tier: 5k calls/day |
| Environment Agency WFS | Flood zones 1/2/3, surface water, historic flood outlines | `https://environment.data.gov.uk/arcgis/rest/services/EA/...` | Free, WMS/WFS |
| EPC Register API | EPC band, sqft, construction, heating type, MEES status | `https://epc.opendatacommunities.org/api/v1/` | Free with registration |
| VOA bulk data | Rateable value, property description, hereditament address | Monthly CSV download from gov.uk | No real-time API — batch processing |
| Land Registry Price Paid | All registered transactions in England and Wales | `https://www.gov.uk/government/collections/price-paid-data` | Monthly bulk CSV |
| HM Land Registry INSPIRE | Registered title polygons (property boundaries) | WFS endpoint | Free |
| Companies House API | Company name, filings, accounts, director data, dissolution risk | `https://api.company-information.service.gov.uk/` | Free with registration |
| Bank of England base rate API | Daily base rate | Published on BoE website + API | Free |
| Met Office API | Weather data, degree days for energy normalisation | `https://api.met.office.gov.uk/` | Freemium |

### Commercial (board procurement needed)

| API | Data | Cost estimate | Priority |
|-----|------|--------------|----------|
| CoStar AVM (UK) | Automated valuation, comparable transactions, market rent | Enterprise licence (~£15–40k/yr) | High — shared with Acquisitions Scout |
| EGi (Estates Gazette) | UK commercial transaction database, actual achieved rents | ~£5–15k/yr | Medium |
| Rightmove Commercial API | Live asking rents and listings | Partnership agreement | Medium |
| Creditsafe API | UK business credit scores, CCJs, payment behaviour | Per-query or subscription | Medium |
| Nimbus Maps API | Aggregated planning intelligence, constraints, comparables | ~£500–2,000/mo startup tier | Medium — reduces build effort for planning layer |
| Idox API | LA planning decisions (alternative to scraping) | Commercial agreement | Low–Medium |
| OS MasterMap | Building footprints, site boundaries (for AVM, solar) | OS Partner licence | High |
| DCC / n3rgy | UK smart meter half-hourly reads (SMETS2) | DCC authorisation required | High |

---

## SE UK lease structure differences

This affects how the product displays data, calculates NOI, and handles rent review workflows.

### FL lease structure
- **Common types:** NNN (triple net) — tenant pays base rent + property taxes + insurance + maintenance. Modified Gross — some expenses included.
- **Rent quoted:** per sqft per year ($/sqft/yr)
- **Review:** annual CPI escalator or fixed % uplift baked into lease
- **CAM:** landlord recovers operating expenses via CAM charge reconciliation annually
- **Typical term:** 3–7 years

### SE UK lease structure
- **Common types:** FRI (Full Repairing and Insuring) — tenant responsible for all repairs and insurance. IRI (Internal Repairing and Insuring) — landlord handles external/structural.
- **Rent quoted:** per sqft per annum or as a total annual sum (£/pa or £/sqft/yr)
- **Service charge:** collected separately from rent — for multi-let buildings, covers shared costs (lifts, common areas, estate management). NOT the same as CAM — different legal basis.
- **Review:** OMV (Open Market Value) review every 5 years is most common in SE UK. RPI/CPI or fixed uplift used for smaller/shorter leases.
- **Typical term:** 5–15 years for industrial/office; shorter for retail. Longer than US equivalent.
- **Rent-free periods:** common at lease inception (typically 6–18 months on a 10-year lease)

### Product impact
- NOI calculation: FL — gross rent minus CAM admin costs; SE UK — gross rent is usually the NOI (FRI lease, no landlord expenses unless service charge shortfall)
- ERV display: both markets show £/sqft or $/sqft per year — consistent display
- Service charge: SE UK only — display service charge separately on rent roll. Show service charge surplus/deficit.
- Rent review: SE UK review workflow is OMV-based — needs CoStar/EGi comparable evidence for the new market rent. FL review is formula-based (CPI × passing rent) — simpler.

---

## SE UK planning system differences

### FL (zoning model)
- Land use determined by zoning district — by right. If the property is in a B2 industrial zone, you can use it as industrial without applying for permission.
- Variances required for changes outside zoning. Handled at county/municipal level.
- No national planning policy equivalent — state-level regulation varies.

### SE UK (development management model)
- **No by-right development** for most changes of use or physical extensions — an application is required.
- **Permitted Development (PD)** provides a limited set of rights that don't require full consent. These vary by use class, building type, and whether Article 4 Directions restrict them locally.
- **Use Classes Order (England):** Class E (commercial, service, office — now combined), Class B2 (general industrial), Class B8 (storage and distribution), Class C (residential), Sui Generis (special uses). Change of use between classes typically requires consent.
- **LPA (Local Planning Authority):** 317 LPAs in England, each with their own local plan policies and committee culture. Success probability for any application varies significantly by LPA.
- **NPPF (National Planning Policy Framework):** National policy overrides local policy in certain situations. AI needs to be able to apply NPPF tests.

### Product impact
- PD rights checklist: SE UK product must show what PD rights apply to each property (e.g. "Class MA: change from Class E to residential — prior approval required but no full permission"). No equivalent in FL.
- Planning likelihood scoring: SE UK needs LPA-level approval rate data and comparable decisions. FL needs zoning analysis and variance approval rates.
- Application workflow: SE UK submits via Planning Portal API. FL submits to municipal portals (no standard API — manual process or DocuSign-based submission).

---

## SE UK regulatory compliance differences

| Compliance area | FL | SE UK |
|----------------|-----|-------|
| EPC / energy certificate | Not required | Required on letting or sale — MEES: minimum EPC E for commercial lettings (from April 2023). EPC C target for all commercial by 2030 (proposed). |
| Asbestos survey | Not generally required pre-2000 buildings | Required for all non-domestic buildings pre-2000 (CAR 2012). Management plan required. |
| Fire risk assessment | Required by NFPA/state code | Required under Regulatory Reform (Fire Safety) Order 2005. Annual review for multi-occupied buildings. |
| Legionella risk assessment | Required per OSHA/state rules | Required under ACOP L8 (HSE). For water systems in multi-let buildings. |
| Electrical inspection (EICR) | Required per NFPA 70/state | Required — frequency depends on property type. Typically every 5 years for commercial. |
| Gas safety (CP12) | Varies by state | Required annually — Gas Safe registered engineer only. |

### Product impact
- Compliance calendar: SE UK has a materially longer list of compliance items than FL. MEES/EPC is unique to UK and high-stakes (unlettable if below EPC E).
- EPC integration: SE UK product must flag MEES risk proactively. "Your asset is currently EPC F — it cannot be legally let without improvement works. Estimated upgrade cost: £X."
- Gas Safe requirement: UK contractor panel must verify Gas Safe registration for all gas work (regulatory requirement, not optional).

---

## SE UK energy data differences

| Energy data point | FL | SE UK |
|------------------|-----|-------|
| Smart meter standard | Green Button Connect (utility-specific) | SMETS2 (national DCC network) |
| Smart meter reads | 15-min interval, per-utility API | 30-min (half-hourly) via DCC or n3rgy |
| Energy price | Fixed tariff per utility (FPL, Duke, TECO) — **no competition; regulated monopolies; switching not possible** | Octopus, EDF, British Gas, E.ON — competitive national market; switching via API |
| Base rate | SOFR (US benchmark) — not directly energy-related | No direct equivalent for energy — supplier rates set independently |
| Settlement data | FERC/NERC regional data | Elexon BMRS API — UK national grid half-hourly settlement |
| Solar export | FPL net metering / SECO | SEG (Smart Export Guarantee) — Octopus/OVO supplier APIs |
| Renewable certificates | RECs (Renewable Energy Certificates) | ROCs (Renewables Obligation Certificates) — now CfD for new schemes |

---

## SE UK benchmarking data (what to show in the product)

Key metrics for SE UK commercial property (wave 2 prospect geography):

### Industrial (SE England — Thames Gateway, M25 corridor)

| Metric | Range | Source |
|--------|-------|--------|
| Prime rent (Grade A logistics) | £18–£32/sqft/yr | CoStar / Savills |
| Secondary industrial | £10–£18/sqft/yr | CoStar / EGi |
| Vacancy rate | 2–5% (historically tight) | CBRE / Savills |
| Cap rate | 4.5–6.5% (prime–secondary) | MSCI IPD |
| Typical lease term | 10–20 years | Market standard |
| Rent review | OMV every 5 years | Market standard |

### Office (SE England — Croydon, Dartford, Maidstone)

| Metric | Range | Source |
|--------|-------|--------|
| Grade A (town centre) | £22–£35/sqft/yr | CoStar / Gerald Eve |
| Grade B (out of town) | £14–£22/sqft/yr | CoStar / EGi |
| Vacancy rate | 10–18% (post-pandemic pressure) | CBRE |
| Cap rate | 7.5–9.0% (risk premium over London) | MSCI IPD |
| Typical lease term | 5–10 years | Market standard |

### Retail (SE England — high streets, retail parks)

| Metric | Range | Source |
|--------|-------|--------|
| High street prime (SE town centres) | £25–£60/sqft/yr | CoStar |
| Retail parks / out-of-town | £20–£35/sqft/yr | CoStar |
| Vacancy rate | 12–20% (structural pressure) | PMA / CBRE |
| Cap rate | 6.5–9.0% | MSCI IPD |

---

## Implementation sequence (SE UK market data layer)

| Phase | Build | Effort | Dependency |
|-------|-------|--------|------------|
| 1 (immediate — free APIs) | UPRN resolution on address entry (OS Places API), EPC data pull, planning constraints (planning.data.gov.uk), flood zone overlay (EA WFS), Companies House tenant data | Low | None |
| 2 | VOA rateable value display + MEES/EPC compliance flag | Low | VOA bulk CSV |
| 3 | Land Registry comparables for AVM calibration | Medium | Land Registry bulk download |
| 4 | Idox/planning scraper for SE UK LPAs (Dartford, Thurrock, Basildon, Medway, Gravesham) | Medium | Engineering build |
| 5 | EGi API for market rent comparables | Medium | Commercial licence (board) |
| 6 | CoStar AVM (UK) for automated valuation | Low build, high cost | Board procurement |
| 7 | DCC / n3rgy smart meter reads | Low build | DCC authorisation (board) |

---

## Acceptance criteria (SE UK data layer)

- [ ] On entering a SE UK address, UPRN is resolved via OS Places API and stored as the canonical property identifier. All downstream lookups (planning, VOA, Land Registry) use UPRN as the join key.
- [ ] EPC data is pulled automatically for the property on address entry. EPC band is displayed with: rating (A–G), sqft, lodgement date, and MEES compliance status ("Compliant — EPC E" or "Non-compliant — EPC F. This property cannot be legally let without improvement.").
- [ ] Planning constraints are detected automatically on address entry: conservation area status, listed building status (grade if applicable), Article 4 directions, and flood zone (EA). Each constraint is shown with its source and date. Constraints are not shown as "pending" — they are resolved from the API at time of entry.
- [ ] Rateable value from VOA is displayed for the property. Rates overpayment flag is shown if rateable value is >20% above the ratio implied by passing rent (using the RV-to-rent ratio for comparable properties).
- [ ] For a SE UK tenant with a Companies House number, the covenant monitoring check runs daily. Filing events (overdue accounts, insolvency proceedings, director changes) are detected and surfaced within 24 hours.
- [ ] Rent review workflow generates an OMV-based notice, not a CPI escalation notice. The mechanism is determined from the lease review clause (extracted during document ingestion). UK and US properties use the correct jurisdiction-specific template.
- [ ] MEES compliance is displayed for every SE UK property on the property detail screen. Properties with EPC F or G rating show: "Non-compliant. Improvement works required before next letting. Estimated cost: £X (from BCIS). EPC improvement expected: X bands."
