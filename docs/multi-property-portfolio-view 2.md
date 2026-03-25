# RealHQ Multi-Property Portfolio View Spec

**Status:** Draft
**Date:** 2026-03-21
**Author:** Head of Product
**Sources:** RealHQ-Spec-v3.2, Addendum v3.1 (Section G, K), BuildOrder v1.0
**Target user:** Owner with 5–15 commercial assets

---

## Problem statement

A user with 5+ properties cannot manage their portfolio from a single-property view. They need:
1. A single screen that shows the health of all assets at a glance
2. The ability to rank and filter properties by any metric (saving opportunity, yield, risk, occupancy)
3. Aggregate portfolio KPIs — not per-property repeated 5 times
4. A map that shows all assets with layer overlays (planning, flood, EPC)
5. A way to act on portfolio-wide issues (e.g. consolidate insurance, bulk tariff switch)

---

## Screen inventory (portfolio layer)

| Route | Screen | Description |
|-------|--------|-------------|
| `/dashboard` | Portfolio Dashboard | Primary landing — all assets, KPIs, opportunity feed |
| `/properties` | All Properties | Grid/list view with filtering and sorting |
| `/map` | Mapping & Site View | Interactive multi-layer map of all portfolio assets |
| `/analytics` | Portfolio Analytics | Charts — value history, NOI trend, benchmarking |
| `/energy` | Energy Intelligence | Portfolio-level energy (covers all properties) |

---

## 1. Portfolio Dashboard (`/dashboard`)

### Page header
`"Portfolio Dashboard" + "Florida Commercial · 8 Properties · Refreshed just now"`

### KPI strip (8 tiles, always visible)

Wave 2 expands from 5 to 8 tiles. All 8 computable from `portfolio.assets` + action queue data.

| Tile | KPI | Source | Format |
|------|-----|--------|--------|
| 1 | Portfolio Value | AVM × all properties | £X.XXM |
| 2 | Gross Monthly Rent | Rent roll (lease data) | £X,XXX |
| 3 | Net Operating Income | Gross rent − opex | £X,XXX |
| 4 | Occupancy Rate | Occupied sqft / total sqft | XX% |
| 5 | Total Sq Footage | Sum of `sqft` across all assets | XXX,XXX sqft |
| 6 | Avg NOI Yield | (Annual NOI / Portfolio Value) × 100 | X.X% |
| 7 | Costs Saved YTD | Commission records (insurance + energy, current calendar year) | £X,XXX |
| 8 | Unactioned Opportunity | `response.totalValueGbp` from `GET /api/user/action-queue` | £XX,XXX |

KPIs update on dashboard load. "Refreshed just now" timestamp shown. Full tile spec: `docs/wave-2-dashboard-properties-grid-handoff.md` Part 4.

### NOI Optimisation Bridge (most important panel)

Stacks every open opportunity as an incremental bar contributing to Monthly NOI:

```
Current Monthly NOI:        £487,300

+ Energy: tariff switch          £ 1,840/mo
+ Energy: HVAC overnight waste   £   920/mo
+ Rent uplift: Unit 3            £ 1,200/mo
+ CAM recovery: Bldg A           £   580/mo
+ Insurance consolidation        £   644/mo
─────────────────────────────────────────
Projected Monthly NOI:      £502,484 (+£15,184)

Implied portfolio value uplift at 6.5% cap rate: +£2.80M
```

Each bar is clickable → takes user to the relevant action.
Completed actions turn green and remain in the bridge (showing value already captured).

### Properties grid

Cards in a 3-column grid. Each card:
- Property name (bold) + address sub-label
- 2×2 metric grid: Passing Rent / sqft / Occupancy / NOI Yield
- Status dot (bottom-left): Occupied / Partially Vacant / Suite Vacant
- Opportunity badge (bottom-right): highest-value open opportunity, colour-coded by category

Category colours:
- HVAC saving → orange
- Rent uplift → blue
- CAM recovery → teal
- Value add → purple
- Insurance → green

Card click → property detail.

### Portfolio Health Score (right panel)

Horizontal progress bars, colour-coded (green/amber/red):
- Rent collection %
- Maintenance SLA %
- Tenant satisfaction % (if portal is live)
- CAM accuracy %
- Insurance compliance %

Failing bars are calls to action. Click bar → relevant screen.

### Market Benchmarking panel (right panel)

Portfolio vs FL commercial median (or SE UK, depending on market), current quarter:

| Metric | Portfolio | Market | Status |
|--------|-----------|--------|--------|
| Cap Rate | 6.8% | 6.5% | Above mkt |
| NOI Margin | 68% | 71% | Below mkt |
| Occupancy | 91% | 88% | Strong |
| Rent per sqft | £9.40 | £11.20 | Underperforming |
| OpEx per sqft | £4.20 | £3.80 | Overspending |
| DSCR | 1.42 | 1.35 | Strong |
| Insurance per sqft | £0.82 | £0.64 | Overspending |

Below the table: 6-month NOI trend mini line chart.

### Refinance Centre table (inline)

| Property | Current Rate | Market Rate | Balance | DSCR | Annual Saving | Action |
|---------|-------------|-------------|---------|------|---------------|--------|
| Unit 4 | 6.2% | 5.1% | £1.8M | 1.31 | £19,800 | **Refi** (green) |
| Lakeside | 5.8% | 5.1% | £2.4M | 1.58 | £16,800 | Hold (amber) |

### Acquisition Pipeline (inline — 2 deal cards)

One off-market, one on-market.
Each card: Deal fit rating, asking price, cap rate, NOI, occupancy, brief underwriting summary.
Subtitle: "400+ listings screened daily against your criteria."

### Revenue vs NOI chart

Bar chart (Gross Revenue) overlaid with line chart (NOI) — 12 months.
Period toggle: 12M / YTD / Q.
Large total revenue figure above chart.

### Occupancy breakdown donut

Donut with legend: Occupied (green), Vacant (red), Notice given (amber), In negotiation (blue).
Total sqft in centre. Sqft labels per segment.

---

## 2. All Properties (`/properties`)

### Layout options
Toggle: Grid (default) / List

**Grid:** Same cards as dashboard grid, 3-column.
**List:** Sortable table — Property / Address / sqft / Passing Rent / Occupancy / NOI Yield / Top Opportunity / Status

### Sorting options
- By opportunity value (default — highest saving first)
- By passing rent
- By occupancy rate
- By lease expiry proximity
- By portfolio value (AVM)

### Filtering
- Property type (retail / industrial / office / mixed-use)
- Status (fully occupied / partially vacant / vacant)
- Market / geography
- Opportunity category (energy / rent uplift / insurance / planning / maintenance)

### Actions from list
- "+ Add Property" (top right)
- Bulk select → "Analyse selected"
- Bulk select → "Export rent roll"

---

## 3. Mapping & Site View (`/map`)

### Default view

All portfolio assets shown as pins on a satellite base map. User zooms in to see detail.

Property pins: colour-coded by opportunity count (green=no issues, amber=1–2 opportunities, red=3+ opportunities).

Click pin → mini card with: property name, top opportunity, "View property" link.

### Layer toggles (toggleable, off by default except satellite)

| Layer | What it shows | Data source |
|-------|--------------|-------------|
| Satellite base | High-resolution aerial | Google Maps Platform / Mapbox Satellite |
| Property boundary | Red boundary polygon of registered title | HM Land Registry / OS NGD / Regrid (US) |
| Planning | Application pins (approved=green/refused=red/pending=amber), conservation areas, listed buildings | Planning Portal API + Historic England API + LPA GIS |
| Flood risk | Flood zone overlay with risk bands | Environment Agency API (UK) / FEMA API (US) |
| EPC heat map | EPC band colour overlay | EPC Register API |
| Comparable properties | Recent sales and lettings nearby | CoStar/EGi (UK) / LoopNet (US) |
| Transport | Train stations, major roads, bus stops | Google Maps Platform |

### Map controls
- Radius from selected property: 0.25mi / 0.5mi / 1mi
- "What's in this area?": RealHQ summary of planning activity, demand signals, and transport changes within radius
- Property detail drawer (slides from right on pin click): full mini-dashboard for that property

### Multi-property selection
Draw a boundary on map → select all properties within it → "Bulk action" options:
- Export selected properties
- Analyse selected
- Generate portfolio report for selected

---

## 4. Portfolio Analytics (`/analytics`)

### Portfolio value history
AVM per property × all properties, monthly. Line chart showing total portfolio value over time. Each property as a segment (stacked area chart optional).

### NOI trend
12-month NOI line chart. Compare to same period last year.

### Rent per sqft vs benchmark
Bar chart: each property vs market rate. Properties below benchmark highlighted in amber.

### Occupancy trend
Monthly occupancy % for portfolio. Drilldown per property.

### Energy performance
kWh/sqft per property vs benchmark bar chart. Ranked worst to best.

### Report generation
"Generate portfolio report" → PDF export: cover page, KPI summary, per-property one-pagers, market benchmarking table. Branded. Under 60 seconds.

---

## 5. Portfolio-level energy screen (`/energy`)

### Page header
`"Energy Intelligence — 8 properties · 2,847,000 kWh/yr · £12,400 above benchmark"`

### Portfolio energy score
Circular gauge 0–100 (weighted across all properties by sqft). Colour: green ≥75, amber 50–74, red <50.

### Per-property energy cards (ranked by saving opportunity)
Each card: kWh/sqft vs benchmark bar, tariff vs market, anomaly count badge, top saving headline.
Click → property-level energy screen.

### Portfolio-wide actions
- "Switch all eligible tariffs" → runs supplier API comparison for all properties simultaneously. Shows portfolio saving. Owner confirms bulk switch.
- "Run HVAC anomaly scan" → re-runs anomaly detection across all connected smart meters and BMS.

---

## Behaviour at 5+ properties (specific design decisions)

### Problem: Dashboard becomes a wall of text at 10 properties

**Solution:** Dashboard always shows portfolio-level KPIs first. Property grid is collapsed to "see all 10 properties" with only the top 3 shown by opportunity value. User expands or goes to /properties for the full list.

### Problem: Opportunity feed is overwhelming at 10+ items

**Solution:** Opportunity feed limited to top 5 on dashboard, ranked by annual saving. "See all X opportunities" link → /analytics. Each opportunity links to the relevant property and screen.

### Problem: User doesn't know which property to act on first

**Solution:** Every list and grid defaults to "sort by opportunity value" — the property where RealHQ has identified the largest uncaptured saving is always first. Clear.

### Problem: Bulk actions are needed but rare

**Solution:** Bulk actions are available on /properties via checkbox selection. Not shown by default — accessed via "Select multiple" mode to avoid accidental bulk operations.

---

## Acceptance criteria

- [ ] A user with 8 properties sees a KPI strip at the top of the dashboard showing all 8 tiles: Portfolio Value, Gross Monthly Rent, NOI, Occupancy Rate, Total Sq Footage, Avg NOI Yield, Costs Saved YTD, and Unactioned Opportunity. All figures are live from the data pipeline — no illustrative totals.
- [ ] NOI Optimisation Bridge shows all open opportunities as a stacked bar, building from current to projected monthly NOI. Each bar links to the relevant action screen. The implied portfolio value uplift is calculated at the current market cap rate (not a hardcoded rate).
- [ ] Properties grid on /properties is sortable by: opportunity value, passing rent, occupancy rate, lease expiry proximity, and AVM value. Default sort is opportunity value (highest first).
- [ ] Map view shows all portfolio assets as pins on a satellite base map. Flood risk layer can be toggled and shows Environment Agency (UK) or FEMA (US) flood zone data for the area surrounding each property. Layer shows within 5 seconds of toggle.
- [ ] Portfolio benchmarking panel shows at least 5 metrics (cap rate, occupancy, rent/sqft, opex/sqft, insurance/sqft) compared to market median for the portfolio's primary geography. Data sourced from MSCI/IPD (UK) or CoStar (US) — not illustrative. Source and date shown.
- [ ] "Generate portfolio report" produces a downloadable PDF within 60 seconds. PDF includes: KPI summary, per-property one-pager (address, AVM, passing rent, occupancy, top opportunity), and market benchmarking table. No illustrative figures.
- [ ] Bulk tariff switch: "Switch all eligible tariffs" on the energy screen shows how many properties have a better rate available and the total portfolio annual saving. Owner confirms → switch is executed via supplier API for all confirmed properties. Each switch is logged individually in the commission tracker.
- [ ] At 10+ properties, the dashboard property grid shows the top 3 properties (by opportunity value) and a "See all 10 properties" link. The full grid is available at /properties. The dashboard does not show all 10 cards by default.

---

## Dependencies

| Dependency | Required for | Status |
|-----------|-------------|--------|
| AVM (ATTOM/CoStar) | Portfolio Value KPI, Refinance table, NOI bridge value calculation | Wave 5 |
| Smart meter / BMS APIs | Portfolio energy score, anomaly scan | Wave 2 |
| Market benchmarking data (MSCI/IPD or CoStar) | Benchmarking panel | Board to procure |
| CoStar API | Comparable properties map layer, rent benchmarking | Board to procure |
| OS NGD / Land Registry boundary data | Property boundary map layer | OS commercial licence |
| Google Maps Platform | Satellite base, Street View | Existing Wave 1 dependency |
