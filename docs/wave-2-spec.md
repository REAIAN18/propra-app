# Wave 2 Spec: Energy Intelligence Features

**Issue:** PRO-376
**Status:** Draft
**Date:** 2026-03-21
**Sources:** RealHQ-Spec-v3.2.html, Propra-Addendum-v3.1-Full-Automation.html

---

## Overview

Three Wave 2 features extend RealHQ's energy intelligence from passive reporting to active automation:

1. **Energy Switching via Supplier APIs** — execute tariff switches without human intermediary
2. **HVAC Anomaly Detection** — ingest consumption data and surface costed waste patterns with remediation actions
3. **Solar via Google Solar API** — on-load rooftop solar assessment with ROI and installer procurement

All three share the same pattern: **Issue → Cost → RealHQ Action**.

---

## Priority Order

| Priority | Feature | Rationale |
|----------|---------|-----------|
| 1 | HVAC Anomaly Detection | Requires smart meter / bill data already ingested in Wave 1. Delivers immediate saving cards. Unlocks energy screen completeness. |
| 2 | Solar via Google Solar API | Stateless per-property call — no ongoing data dependency. High perceived value, zero-effort setup. |
| 3 | Energy Switching via Supplier APIs | Requires supplier API commercial agreements. More compliance surface area. Builds on tariff comparison already in spec. |

---

## Feature 1: HVAC Anomaly Detection

### What the owner sees

1. **Energy screen loads** — anomaly feed appears below the consumption heatmap, ranked by annual saving (highest first).
2. Each anomaly card shows:
   - Detection basis (e.g. "Overnight reads 11pm–5am are 22% of daytime peak — building should be empty")
   - Annual saving in £ with calculation shown (excess kWh × unit rate × days)
   - Probable cause (HVAC left running, misscheduled lighting, tenant misuse)
   - One-tap action CTA
3. Owner taps **"Fix — schedule via BMS"** → RealHQ pushes schedule change to BMS API. Confirmation in inbox.
4. Owner taps **"Get quotes"** (where physical remediation needed) → contractor panel opens, quotes generated automatically.
5. Consumption heatmap updates after fix is applied. Anomaly card moves to "Resolved" state.

### Anomaly types (from spec)

| Anomaly | Detection logic | Saving formula | Action |
|---------|----------------|----------------|--------|
| Overnight HVAC waste | Half-hourly reads >15% of peak between 11pm–5am | (Overnight kWh − expected baseline) × rate × 365 | Schedule HVAC off via BMS API or flag for manual scheduling |
| Weekend/bank holiday spike | Weekend consumption ≥ weekday consumption | Weekend excess kWh × rate × 52 | BMS schedule adjustment or tenant notification |
| Demand charge spike | Half-hourly peaks triggering demand charges on HH-metered tariffs | Current demand charge vs reduced-peak scenario | Load shifting recommendation with specific equipment and timing |
| HVAC age/inefficiency | kWh/sqft vs benchmark for asset type + building age + EPC | (Actual − benchmark kWh) × rate × annual hours | Full HVAC spec and automatic quotes via contractor panel |

### Data sources and API calls

| Source | Data | Trigger |
|--------|------|---------|
| Smart meter (SMETS2) | Half-hourly electricity reads | Continuous via DCC API or n3rgy |
| Utility bill OCR | kWh total, tariff, standing charge, billing period | On bill upload (existing Wave 1 pipeline) |
| BMS API (BACNET/Modbus) | HVAC run hours, zone temps, set points, occupancy schedules | Real-time where supported (Schneider EcoStruxure, Siemens Desigo, Honeywell, Johnson Controls) |
| Submetering (optional) | Per-floor or per-tenant consumption | Pulse meter API or CSV upload |
| Met Office API (UK) / NOAA API (US) | Degree day data for weather-normalised analysis | Daily |
| Elexon BMRS API (UK) | Half-hourly electricity settlement data for wholesale cost benchmarking | Daily |
| EPC register | Asset efficiency rating and floor area | On property creation (existing) |

### Database schema additions

```sql
-- Anomaly records
CREATE TABLE energy_anomalies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id),
  anomaly_type  TEXT NOT NULL, -- 'overnight_hvac', 'weekend_spike', 'demand_charge', 'hvac_inefficiency'
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  detection_basis TEXT NOT NULL,         -- human-readable explanation of detection logic
  annual_saving_gbp NUMERIC(10,2),       -- calculated saving in £
  calculation_detail JSONB,              -- kWh excess, rate used, multiplier
  probable_cause TEXT,
  status        TEXT NOT NULL DEFAULT 'open', -- 'open', 'actioned', 'resolved', 'dismissed'
  action_taken  TEXT,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Half-hourly consumption reads (if not already in schema)
CREATE TABLE energy_reads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id),
  meter_id      TEXT NOT NULL,
  read_at       TIMESTAMPTZ NOT NULL,
  kwh           NUMERIC(10,4) NOT NULL,
  source        TEXT NOT NULL, -- 'smart_meter', 'bms', 'submeter', 'manual'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON energy_reads (property_id, read_at DESC);

-- BMS connection config
CREATE TABLE bms_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id),
  vendor        TEXT NOT NULL, -- 'schneider', 'siemens', 'honeywell', 'johnson_controls'
  protocol      TEXT NOT NULL, -- 'bacnet', 'modbus'
  connection_config JSONB NOT NULL, -- endpoint, credentials (encrypted)
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'connected', 'error'
  last_synced_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Acceptance criteria

- [ ] Upload a utility bill for a test property — anomaly detection runs within 60 seconds of extraction completing. At least one anomaly card appears on the energy screen if the data supports one. No illustrative data — all figures derive from the uploaded bill.
- [ ] Connect a smart meter for a test property — half-hourly reads appear on the consumption heatmap within 5 minutes of connection. Overnight baseline anomaly is automatically detected if reads between 11pm–5am exceed 15% of daytime peak.
- [ ] Each anomaly card displays: detection basis, annual saving in £, probable cause, and one action CTA. The saving calculation must show the kWh figure, the unit rate used, and the annualisation factor.
- [ ] Tapping "Schedule via BMS" on an overnight HVAC anomaly sends a schedule change to the BMS API. A confirmation notification appears in the owner's inbox within 2 minutes.
- [ ] Anomaly feed is ranked by annual saving, highest first.
- [ ] Resolved anomalies move to a "Resolved" state and no longer appear in the active feed.
- [ ] If no smart meter or BMS is connected and only a manual annual kWh is available, the anomaly detection screen shows a prompt: "Connect smart meter for detailed anomaly detection — only annual waste estimates available from bill data." No false anomaly cards are generated.

---

## Feature 2: Solar via Google Solar API

### What the owner sees

1. **On property load** (or manual trigger from energy screen): RealHQ calls Google Solar API with the property address.
2. If solar is viable, a **Solar Opportunity card** appears in the "Upgrade Opportunities" section of the energy screen:
   - Roof area (from satellite data)
   - Estimated panel count
   - Annual generation estimate (kWh/yr)
   - Self-consumption saving (generation kWh × current unit rate)
   - Export income (if SEG-eligible, using live smart export rates from Octopus/OVO)
   - Install cost (from MCS installer panel — zero-upfront finance option shown where available)
   - Payback period in years
   - EPC improvement estimate
3. Owner taps **"Get installer quotes"** → RealHQ submits inquiry to MCS-registered installers via installer panel. Quotes returned within 24h.
4. Owner approves quote → RealHQ auto-generates revenue share/finance agreement.
5. On installation: generation data ingests via smart export meter. Solar card transitions to "Installed — tracking performance."

### Data sources and API calls

| Source | Data | Trigger |
|--------|------|---------|
| Google Maps Solar API | Roof area, panel count estimate, annual generation estimate (kWh/yr), orientation | On property address load — once per property, cached |
| OS Mapping / satellite | Roof aspect/orientation (supplementary) | Same as above |
| Utility bill / smart meter | Current unit rate, standing charge | Existing Wave 1 data |
| Octopus / OVO supplier APIs | Smart export guarantee (SEG) rates | On solar card display |
| Ofgem / DNO API | Grid connection capacity | On solar card display |
| MCS register | MCS-certified installer list for postcode | On "Get quotes" tap |

### Database schema additions

```sql
-- Solar assessments (one per property, refreshed periodically)
CREATE TABLE solar_assessments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL REFERENCES properties(id),
  assessed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  roof_area_sqm         NUMERIC(10,2),
  panel_count_estimate  INTEGER,
  annual_gen_kwh        NUMERIC(10,2),
  google_solar_raw      JSONB,              -- full API response, preserved for audit
  current_unit_rate_p   NUMERIC(6,4),       -- pence per kWh at time of assessment
  seg_export_rate_p     NUMERIC(6,4),       -- smart export rate at time of assessment
  self_consumption_saving_gbp NUMERIC(10,2),
  export_income_gbp     NUMERIC(10,2),
  install_cost_gbp      NUMERIC(10,2),
  payback_years         NUMERIC(5,2),
  epc_improvement_bands INTEGER,           -- number of EPC bands improvement estimated
  status                TEXT NOT NULL DEFAULT 'viable', -- 'viable', 'not_viable', 'installed'
  not_viable_reason     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

-- Installer quote requests
CREATE TABLE solar_quote_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id),
  assessment_id UUID NOT NULL REFERENCES solar_assessments(id),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'quotes_received', 'approved', 'rejected'
  approved_quote_id UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Acceptance criteria

- [ ] On loading any property with a valid UK or US address, the Google Solar API is called automatically. The result is cached — repeated page loads do not re-call the API.
- [ ] If solar is viable (API returns a positive result), a Solar Opportunity card appears on the energy screen within the "Upgrade Opportunities" section. The card must show: roof area (sqm), estimated annual generation (kWh/yr), self-consumption saving (£/yr), export income (£/yr), payback period (years), and EPC improvement.
- [ ] If solar is not viable (shading, roof too small, or API returns low suitability score), no card is shown. A "Solar: not viable at this address" note appears in a collapsed state for transparency.
- [ ] All financial figures on the solar card derive from live data: current unit rate from uploaded bill or smart meter, SEG rate from supplier API. No hardcoded illustrative figures.
- [ ] Tapping "Get installer quotes" submits an inquiry to at least one MCS-registered installer for the property postcode. A confirmation notification appears in the inbox.
- [ ] The solar card is not shown until the Google Solar API call completes. A loading state is displayed in its place.

---

## Feature 3: Energy Switching via Supplier APIs

> **Commercial constraint — read before building:**
> Tariff switching via supplier APIs applies only to **UK SME-metered assets** (MPAN profile class 01–08). Two constraints must be enforced at the product level:
>
> 1. **HH-metered assets (MPAN profile class 00):** Assets consuming >100MWh/yr (typically >10,000–15,000 sqft commercial) have bespoke HH contracts. These cannot be auto-switched via Octopus, EDF, British Gas, or E.ON consumer/SME APIs. Show a "large-site bespoke tender" message instead of the switching CTA. Full details in `docs/wave-2-energy-procurement-benchmarks.md`.
> 2. **Florida market assets:** FPL, Duke Energy, and TECO are regulated monopoly utilities. There is no competing supplier. The entire switching flow must be hidden for FL properties. Show solar/HVAC opportunities instead.

### What the owner sees

1. **On bill upload or smart meter connection**: RealHQ extracts current tariff (unit rate, standing charge, tariff type, **MPAN profile class**) and — for SME-metered UK assets only — calls Octopus, EDF, British Gas, and E.ON APIs for best available rate on same meter type and consumption profile.
2. **Tariff Comparison card** appears on energy screen within 30 seconds:
   - Current tariff and annual spend
   - Best available tariff (supplier, rate, standing charge, tariff type)
   - Annual saving in £ on same usage
   - If tariff mismatch detected (e.g. multi-rate tariff on flat-profile building): alternate tariff structure saving also shown
3. Owner reviews comparison. Taps **"Switch"**.
4. **Confirmation modal** shows: new supplier, new rate, switch effective date, any exit fees from current contract.
5. Owner confirms. RealHQ executes the switch via supplier API. No human in loop.
6. **"Switched"** confirmation card appears in inbox. Tariff data updates on next bill upload.

### Data sources and API calls

| Source | Data | Trigger |
|--------|------|---------|
| Utility bill OCR (Textract) | Current unit rate, standing charge, tariff type, meter MPAN/MPRN, account number | On bill upload |
| Smart meter (DCC/n3rgy) | Real-time half-hourly reads, consumption profile | On smart meter connection |
| Octopus Energy API | Live tariffs for meter type and consumption | On bill upload / daily refresh |
| EDF Energy API | Live tariffs | On bill upload / daily refresh |
| British Gas API | Live tariffs | On bill upload / daily refresh |
| E.ON Next API | Live tariffs | On bill upload / daily refresh |
| Elexon BMRS API | Wholesale cost reference | Background — for tariff type recommendation |

### Database schema additions

```sql
-- Tariff comparison results
CREATE TABLE tariff_comparisons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL REFERENCES properties(id),
  compared_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_unit_rate_p   NUMERIC(6,4) NOT NULL,
  current_standing_charge_p NUMERIC(6,4) NOT NULL,
  current_tariff_type   TEXT,             -- 'single_rate', 'multi_rate', 'economy_7', etc.
  current_supplier      TEXT,
  annual_kwh            NUMERIC(12,2),
  current_annual_spend_gbp NUMERIC(10,2),
  best_supplier         TEXT,
  best_unit_rate_p      NUMERIC(6,4),
  best_standing_charge_p NUMERIC(6,4),
  best_tariff_type      TEXT,
  best_annual_spend_gbp NUMERIC(10,2),
  annual_saving_gbp     NUMERIC(10,2),
  tariff_mismatch_detected BOOLEAN NOT NULL DEFAULT false,
  tariff_mismatch_saving_gbp NUMERIC(10,2),
  status                TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'switch_confirmed', 'switch_executed', 'dismissed'
  switch_executed_at    TIMESTAMPTZ,
  supplier_confirmation_ref TEXT,
  raw_api_responses     JSONB,            -- all four supplier responses preserved
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Switch execution log
CREATE TABLE tariff_switch_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id     UUID NOT NULL REFERENCES tariff_comparisons(id),
  property_id       UUID NOT NULL REFERENCES properties(id),
  initiated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  supplier          TEXT NOT NULL,
  api_request       JSONB,               -- request payload (redacted credentials)
  api_response      JSONB,               -- full response
  confirmation_ref  TEXT,
  status            TEXT NOT NULL,       -- 'success', 'failed', 'pending'
  error_detail      TEXT,
  completed_at      TIMESTAMPTZ
);
```

### Acceptance criteria

- [ ] Upload a utility bill for a UK SME-metered property — within 30 seconds, tariff is extracted (unit rate, standing charge, supplier, **MPAN profile class**) AND supplier API is called for all available suppliers (Octopus minimum; EDF/BG/EON if commercial access confirmed). Live tariff comparison card appears. No illustrative rates — all figures are live API responses or extracted from the uploaded document.
- [ ] Upload a utility bill for a HH-metered property (MPAN profile class `00`): supplier APIs are NOT called. "Switch" CTA is NOT shown. Card shows: "Large-site contract detected — bespoke tender available. Contact us to request quotes." This must pass even if the HH threshold is detected solely from profile class on the bill.
- [ ] For any FL market property, the tariff switching section is not rendered. The energy screen shows solar and HVAC sections only.
- [ ] Tariff comparison card shows: current annual spend, best available annual spend on same kWh, annual saving in £, and which supplier offers the best rate.
- [ ] If the consumption profile indicates a tariff mismatch (flat half-hourly profile on a multi-rate tariff), a separate "tariff type saving" figure is shown in addition to the supplier saving.
- [ ] Tapping "Switch" opens a confirmation modal showing new supplier, new rates, effective date, and any exit fee extracted from the current contract. The switch does not execute until the owner explicitly confirms.
- [ ] On confirmation, the switch API call is made to the winning supplier. A "Switched — confirmation ref: [ref]" notification appears in the inbox within 2 minutes.
- [ ] If any supplier API call fails, that supplier is excluded from the comparison with a visible note. The comparison still proceeds with available suppliers — it does not fail entirely.
- [ ] Switch execution is logged with full request/response payload for audit. The log is accessible to the owner on the property energy screen.

---

## Dependency flags

| Dependency | Status | Required action |
|-----------|--------|-----------------|
| Google Solar API key | Unknown — confirm if sandbox available | Board to confirm or procure API access |
| Octopus Energy API | Public sandbox available at api.octopus.energy | Engineering can begin without commercial agreement |
| EDF, British Gas, E.ON APIs | Commercial APIs — may require partnership agreement | Board to confirm commercial access path |
| Smart meter DCC/n3rgy access | Requires authorisation from energy supplier or DCC | Board to confirm UK DCC access or n3rgy partnership |
| MCS installer register | Public API via mcsgroup.org.uk | Engineering can access without commercial agreement |
| BMS API access | Per-installation — varies by vendor | Owner-provided credentials per property |

---

## Out of scope for Wave 2

- Gas switching (gas meter APIs not in scope — electricity only for Wave 2)
- Battery storage integration (future wave)
- PPA (Power Purchase Agreement) structuring
- Multi-site aggregate tariff negotiation
