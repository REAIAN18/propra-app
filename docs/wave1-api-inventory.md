# Wave 1 API Integration Inventory

**Author:** CTO
**Date:** 2026-03-21
**Purpose:** Identifies which APIs are live-callable today vs require commercial agreements, and documents the recommended integration path for each Wave 1 feature.

---

## Summary Table

| Feature | API | Accessible Today? | Auth Required | Status in Code |
|---|---|---|---|---|
| Insurance quotes | CoverForce | Yes (apply at coverforce.com) | API key — apply via hello@coverforce.com | PRO-334 building behind feature flag |
| Insurance quotes | Chubb Studio direct | No — partner agreement required | Enterprise contract | Wave 2+ |
| Insurance quotes | AIG direct | No — travel focus, commercial unclear | Enterprise contract | Wave 2+ |
| Insurance quotes | Travelers direct | No — partner agreement required | Enterprise contract | Wave 2+ |
| Energy (UK) | Octopus Energy REST API | Yes — public endpoints, no key for rates | None for public tariff data | Not yet wired |
| Energy (UK) | EDF / British Gas / E.ON | No — no public commercial API | Broker portal only | Benchmark only |
| Energy (FL) | EIA API | **Yes — ALREADY LIVE** | Free API key | ✅ Wired in `/api/cron/energy-rates` |
| Property EPC | MHCLG EPC API | **Yes — ALREADY LIVE** | None | ✅ Wired in `enrich-asset.ts` |
| Property satellite | Google Maps Static API | **Yes — ALREADY LIVE** | API key (paid) | ✅ Wired in `enrich-asset.ts` |
| Property geocode | Google Maps Geocoding | **Yes — ALREADY LIVE** | API key (paid) | ✅ Wired in `enrich-asset.ts` |
| Property planning | Planning Portal API | **Yes — ALREADY LIVE** | None | ✅ Wired in `enrich-asset.ts` |
| Property comparables (FL) | ATTOM Data | Free trial available | API key — free trial at attomdata.com | Not yet wired |
| Property comparables (UK) | CoStar | No — subscription $$$  | Commercial subscription | Wave 2+ |
| Refinance / SOFR | FRED API | **Yes — ALREADY LIVE** | Free API key | ✅ Wired in `/api/cron/sofr` + `/api/macro/sofr` |

---

## Insurance

### CoverForce (RECOMMENDED for Wave 1)

- **What it is:** Single API connecting 23 admitted + E&S carriers including Chubb, Liberty Mutual, Travelers, Hartford. Quote → pay → bind → certificate of insurance in one flow.
- **Access:** Apply at [coverforce.com/commercial-api](https://www.coverforce.com/commercial-api) or email hello@coverforce.com / (917) 905-6508. No public sandbox documented — credentials come post-application.
- **Cost model:** Revenue share / partner agreement. No upfront licensing fee for brokers.
- **Lines covered:** Workers' Comp, General Liability, BOP, Cyber, Commercial Property (E&S expansion ongoing per March 2026 announcement).
- **Integration path:** Single REST API, white-label iframe or full custom UI. Carrier credential management is handled by CoverForce.
- **Wave 1 plan:** PRO-334 (Founding Engineer) is already building the full client behind a `COVERFORCE_ENABLED` feature flag. Ready to flip on the moment `COVERFORCE_API_KEY` lands in Railway env vars.
- **Blocker:** CEO/Ian needs to apply at coverforce.com and receive API credentials (PRO-322).

### Direct carrier APIs (AIG, Chubb, Travelers, Lloyd's)

- **AIG:** Developer portal exists at developers.aig.com. Primary API offering is travel insurance. Commercial property quote API is not documented publicly — requires formal partnership agreement.
- **Chubb Studio:** REST API suite at studio.chubb.com covers full insurance lifecycle including quote/bind. Developer portal at developer.chubb.com (currently returning 503 intermittently). Requires enterprise partner onboarding — not self-serve.
- **Travelers:** Developer portal at developer.travelers.com exists but API access requires carrier partnership agreement. Not accessible without formal contract.
- **Lloyd's:** No public API. Requires Lloyd's market participant credentials (syndicate/coverholder relationship).
- **Decision:** Direct carrier APIs are Wave 2+ at earliest. CoverForce aggregates all of these behind one API and is the correct Wave 1 path.

---

## Energy

### Octopus Energy Business API (UK — RECOMMENDED for Wave 1)

- **What it is:** Public REST API at `docs.octopus.energy`. Returns live product and tariff data including unit rates.
- **Key endpoint (no auth required):**
  ```
  GET https://api.octopus.energy/v1/products/
  ```
  Filter by `is_business=true` to get commercial products.
  ```
  GET https://api.octopus.energy/v1/products/{product_code}/electricity-tariffs/{tariff_code}/standard-unit-rates/
  ```
  Returns unit rates in p/kWh without requiring a meter number or MPAN.
- **Auth:** None required for tariff rate lookups. API key (HTTP Basic Auth) only needed for account-specific data (meter readings, billing).
- **Limitation:** Only returns Octopus tariffs. Cannot query competitor rates via Octopus API.
- **Wave 1 plan:** Wire Octopus API to replace the hardcoded `SEUK_SUPPLIERS[0]` benchmark rate for Octopus. Other UK suppliers (EDF, British Gas, E.ON) remain as Ofgem benchmarks — they have no public APIs.
- **Action required:** Founding Engineer to wire `GET /v1/products/?is_business=true` to fetch live Octopus commercial tariff unit rate on demand or daily cron. No API key needed.

### EDF / British Gas / E.ON (UK)

- **Status:** No public commercial B2B quote APIs found. All operate via broker portals or direct sales teams.
- **Wave 1 decision:** Keep as Ofgem benchmark data (`SEUK_SUPPLIERS` array in `/api/quotes/energy/route.ts`). Mark clearly as `"dataSource": "benchmark"` — already implemented.

### EIA API (FL — ALREADY LIVE)

- **Status:** Fully implemented in `/src/app/api/cron/energy-rates/route.ts`.
- **Endpoint:** `https://api.eia.gov/v2/electricity/retail-prices/data/?facets[sectorName][]=commercial&facets[stateid][]=FL`
- **Series stored in DB:** `EIA_FL_ELEC_COMMERCIAL` in `macroRate` table.
- **Required env var:** `EIA_API_KEY` — free registration at eia.gov/opendata/register.php
- **Action:** Confirm `EIA_API_KEY` is set in Railway. Cron should be scheduled to run daily.

---

## Property Auto-fetch

### Already live (PRO-326, PRO-328)

All four core property enrichment calls are wired in `src/lib/enrich-asset.ts`:

1. **Google Maps Geocoding** — resolves address to lat/lng + formatted address. Required env var: `GOOGLE_MAPS_API_KEY`.
2. **Google Maps Static API** — fetches satellite image URL. Stored as `satelliteImageUrl` on `UserAsset`.
3. **MHCLG EPC Register API** — free, no auth, returns energy performance certificate data for UK properties.
4. **Planning Portal API** — returns planning application history for UK addresses.

### ATTOM Data (FL property comparables — NOT YET WIRED)

- **What it is:** US property data covering 150M+ properties. Characteristics, ownership, transaction history, neighbourhood data.
- **Access:** Free trial API key at [api.developer.attomdata.com](https://api.developer.attomdata.com). Paid from ~$95/month.
- **Use case:** FL comparable sales data for the Market Benchmarking panel. Wave 1 demo-quality substitute for CoStar.
- **Wave 1 plan:** Wire ATTOM trial key to `/api/property/lookup` for FL assets to return comparable sales. If trial limits hit before Wave 1 demo, use last-known ATTOM data cached in DB.
- **Action:** Engineering to obtain free trial key and implement `fetchAttomComparables(address)` in `enrich-asset.ts`.

### CoStar (UK + US ERV comparables)

- **Status:** Requires commercial subscription (thousands of dollars/month). Not accessible for Wave 1.
- **Wave 1 decision:** Dashboard ERV card shows `null` / empty state when no CoStar data is available. **Never show fabricated comparable rents.**
- **Wave 2:** Negotiate CoStar API access after first commission.

---

## Dashboard Macro Data

### FRED API / SOFR (ALREADY LIVE)

- **Status:** Fully implemented.
  - Cron: `/src/app/api/cron/sofr/route.ts` — daily fetch of SOFR series from FRED.
  - Serve: `/src/app/api/macro/sofr/route.ts` — returns latest stored rate.
- **Series:** `SOFR` (overnight), `SOFR30DAYAVG` (30-day average — preferred for refinance display).
- **Required env var:** `FRED_API_KEY` — free registration at fred.stlouisfed.org.
- **Action:** Confirm `FRED_API_KEY` is set in Railway. Cron scheduled.

---

## Required Railway Environment Variables (Wave 1)

| Variable | Purpose | How to get |
|---|---|---|
| `COVERFORCE_API_KEY` | Insurance quote-bind | Apply at coverforce.com/commercial-api — CEO action (PRO-322) |
| `COVERFORCE_ENABLED` | Feature flag | Set to `true` once API key confirmed working |
| `EIA_API_KEY` | FL commercial energy rates | Free at eia.gov/opendata/register.php |
| `FRED_API_KEY` | SOFR rate | Free at fred.stlouisfed.org |
| `GOOGLE_MAPS_API_KEY` | Satellite + geocode | Google Cloud Console — paid per call |
| `ATTOM_API_KEY` | FL property comparables | Free trial at api.developer.attomdata.com |

---

## Wave 1 API Gap Summary

| Feature | Gap | Resolution |
|---|---|---|
| Insurance live quotes | CoverForce creds not yet in Railway | CEO to apply at coverforce.com (PRO-322) |
| Energy UK live rates | Only Octopus has a public API; others are benchmark | Wire Octopus live; keep others as Ofgem benchmark |
| Energy FL live rates | EIA already wired | Confirm `EIA_API_KEY` in Railway |
| Property FL comparables | ATTOM not yet wired | Engineering to wire ATTOM trial key |
| SOFR rate | FRED already wired | Confirm `FRED_API_KEY` in Railway |
| Insurance ERV / CoStar | CoStar requires subscription | Wave 2+; show empty state in UI |
