# Wave 2 Energy — Engineering Handoff

**Issue:** PRO-512
**Date:** 2026-03-22
**Author:** Head of Product
**For:** Founding Engineer
**Status:** Ready to build

---

## What this document covers

Wave 2 energy adds three features on top of the existing energy page (tariff comparison + bill upload):

1. **HVAC Anomaly Detection** — bill-level and smart-meter anomaly feed, ranked by annual saving
2. **Solar Opportunity Card** — Google Solar API assessment, ROI calc, installer quotes
3. **Energy Switching Execution** — Octopus SME API switch, HH-meter guard, FL market guard

The existing energy page (`/energy`) already has:
- `PolicyUploadWidget` for bill upload
- `EnergyQuote` table in Prisma
- Tariff comparison UI (live quotes panel, confirm switch modal)
- Market rate vs your rate PageHero
- `meterType: "hh" | "sme"` on static asset data

What's missing from the DB, API, and UI is documented below.

---

## 1. Prisma schema additions

Add these four models to `prisma/schema.prisma`. Follow the same pattern as `WorkOrder`.

### 1a. `EnergyRead` — half-hourly consumption data

```prisma
model EnergyRead {
  id          String   @id @default(cuid())
  userId      String
  assetId     String
  meterId     String
  readAt      DateTime
  kwh         Float
  source      String   // "smart_meter" | "bms" | "submeter" | "manual"
  createdAt   DateTime @default(now())

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId, readAt(sort: Desc)])
}
```

Add `energyReads EnergyRead[]` to `User` and `UserAsset` models.

### 1b. `EnergyAnomaly` — detected anomalies

```prisma
model EnergyAnomaly {
  id               String   @id @default(cuid())
  userId           String
  assetId          String
  anomalyType      String   // "overnight_hvac" | "weekend_spike" | "demand_charge" | "hvac_inefficiency" | "tariff_mismatch" | "yoy_spike"
  detectedAt       DateTime @default(now())
  detectionBasis   String   @db.Text    // human-readable explanation
  annualSavingGbp  Float?
  calculationDetail Json?               // { excessKwh, rateUsed, multiplier }
  probableCause    String?
  status           String   @default("open")  // "open" | "actioned" | "resolved" | "dismissed"
  actionTaken      String?
  resolvedAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
}
```

Add `energyAnomalies EnergyAnomaly[]` to `User` and `UserAsset` models.

### 1c. `SolarAssessment` — Google Solar API result

```prisma
model SolarAssessment {
  id                      String   @id @default(cuid())
  userId                  String
  assetId                 String   @unique
  assessedAt              DateTime @default(now())
  roofAreaSqm             Float?
  panelCountEstimate       Int?
  annualGenKwh            Float?
  googleSolarRaw          Json?               // full API response
  currentUnitRateP        Float?              // pence per kWh
  segExportRateP          Float?              // smart export rate
  selfConsumptionSavingGbp Float?
  exportIncomeGbp         Float?
  installCostGbp          Float?
  paybackYears            Float?
  epcImprovementBands      Int?
  status                  String   @default("viable")  // "viable" | "not_viable" | "installed" | "pending"
  notViableReason         String?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset             UserAsset         @relation(fields: [assetId], references: [id], onDelete: Cascade)
  solarQuoteRequests SolarQuoteRequest[]
}
```

### 1d. `SolarQuoteRequest` — installer quote requests

```prisma
model SolarQuoteRequest {
  id              String   @id @default(cuid())
  userId          String
  assetId         String
  assessmentId    String
  requestedAt     DateTime @default(now())
  status          String   @default("pending")  // "pending" | "quotes_received" | "approved" | "rejected"
  approvedQuoteId String?
  createdAt       DateTime @default(now())

  user       User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset      UserAsset       @relation(fields: [assetId], references: [id], onDelete: Cascade)
  assessment SolarAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
}
```

Add relations to `User` and `UserAsset` for both.

### 1e. `meterType` on `UserAsset`

Add to the `UserAsset` model:

```prisma
meterType  String?  // "hh" | "sme" — extracted from MPAN profile class on bill upload
```

This replaces the static `meterType` currently hardcoded in `src/lib/data/se-logistics.ts`. On bill upload, extract the MPAN profile class:
- Profile class `00` → set `meterType = "hh"` (half-hourly metered — large site, no auto-switch)
- All others → set `meterType = "sme"`

---

## 2. API routes to add

### `GET /api/user/energy-anomalies`

Returns anomalies for the authenticated user, scoped to `portfolioId` if provided.

```ts
// Query params: portfolioId?, assetId?, status? (default: "open")
// Response:
{
  anomalies: {
    id: string
    assetId: string
    assetName: string
    anomalyType: string
    detectionBasis: string
    annualSavingGbp: number | null
    calculationDetail: { excessKwh: number; rateUsed: number; multiplier: number } | null
    probableCause: string | null
    status: "open" | "actioned" | "resolved" | "dismissed"
    detectedAt: string
  }[]
}
```

Detection logic runs on bill upload (via existing PDF pipeline). Trigger `detectAnomalies(assetId)` after bill extraction completes.

**Bill-level anomaly types (no smart meter needed — run immediately on upload):**

| Type | Detection | Formula |
|------|-----------|---------|
| `tariff_mismatch` | Unit rate > 130% of `benchmarkRate` from EIA/Ofgem | `(actualRate - benchmarkRate) × annualKwh` |
| `yoy_spike` | Year-on-year kWh increase > 20% (requires 2+ bills) | `(currentKwh - priorKwh) × currentRate` |
| `hvac_inefficiency` | kWh/sqft > 130% of EPC benchmark for asset type | `(actual - benchmark) × sqft × rate` |

**Smart meter anomaly types (only when `EnergyRead` records exist):**

| Type | Detection | Formula |
|------|-----------|---------|
| `overnight_hvac` | Half-hourly reads 11pm–5am > 15% of daily peak | `(overnightKwh - expectedBaseline) × rate × 365` |
| `weekend_spike` | Weekend kWh ≥ weekday kWh | `weekendExcess × rate × 52` |
| `demand_charge` | Peak half-hourly read triggering demand charge tier | `currentDemandCharge - reducedPeakScenario` |

### `PATCH /api/user/energy-anomalies/[anomalyId]`

Update anomaly status: `"dismissed"`, `"actioned"`, `"resolved"`.

```ts
// Body: { status: string; actionTaken?: string }
// Response: { success: true }
```

### `GET /api/user/solar-assessment`

Returns solar assessment for a given asset. If no assessment exists, triggers a Google Solar API call.

```ts
// Query: assetId
// Response:
{
  assessment: {
    id: string
    status: "viable" | "not_viable" | "installed" | "pending"
    roofAreaSqm: number | null
    panelCountEstimate: number | null
    annualGenKwh: number | null
    selfConsumptionSavingGbp: number | null
    exportIncomeGbp: number | null
    installCostGbp: number | null
    paybackYears: number | null
    epcImprovementBands: number | null
    notViableReason: string | null
  } | null
}
```

**Google Solar API integration:**

```ts
// If GOOGLE_SOLAR_API_KEY is set in env:
const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=MEDIUM&key=${process.env.GOOGLE_SOLAR_API_KEY}`

// Extract from response:
// solarPotential.maxArrayPanelsCount → panelCountEstimate
// solarPotential.maxArrayAreaMeters2 → roofAreaSqm
// solarPotential.maxSunshineHoursPerYear × panelCountEstimate × 0.4kW → annualGenKwh (approx)
// Use roofSolarPanels array for more accurate estimate

// If key not set: create SolarAssessment with status = "pending", skip API call
// If API returns low suitability: status = "not_viable", set notViableReason
```

Cache the result in `SolarAssessment` — do not re-call if assessment exists and `assessedAt` is within 90 days.

### `POST /api/user/solar-assessment/[assetId]/quote-request`

Triggers installer quote request for a given asset.

```ts
// Body: {}
// Creates SolarQuoteRequest record, sends email notification to RealHQ admin
// Response: { success: true; requestId: string }
```

---

## 3. UI additions to `/energy`

Add three new sections below the existing Live Tariff Comparison panel:

### 3a. HVAC Anomaly Feed

```
Section header: "Anomalies" with badge showing count of open anomalies

If anomalies.length === 0 and hasBills:
  → Show: "No anomalies detected in current bill data. Connect a smart meter for real-time monitoring."

If anomalies.length === 0 and !hasBills:
  → Show: "Upload an energy bill to enable anomaly detection."

Each anomaly card:
  ┌─────────────────────────────────────────────────────┐
  │ [TYPE BADGE]   Asset name · Detected date           │
  │                                                     │
  │ [Detection basis — one sentence]                    │
  │                                                     │
  │ £X,XXX/yr saving                                    │
  │ Calculation: X,XXX kWh excess × Xp/kWh × 365 days │
  │                                                     │
  │ Probable cause: [text]                              │
  │                                                     │
  │ [Fix — Schedule via BMS]  [Get quotes]  [Dismiss]   │
  └─────────────────────────────────────────────────────┘
```

Anomaly type badge colours (use existing spec colour system):
- `overnight_hvac`, `weekend_spike`, `demand_charge`, `hvac_inefficiency` → COST SAVING blue `#EEF2FE`
- `tariff_mismatch`, `yoy_spike` → COST SAVING blue

"Fix — Schedule via BMS": CTA only shown if `bms_connection` exists for asset. Otherwise show "Get quotes" only.

"Dismiss" → PATCH anomaly to `dismissed`. Card fades out immediately.

### 3b. Solar Opportunity Card

```
Section: "Upgrade Opportunities"

Solar card (shown when assessment.status === "viable"):
  ┌─────────────────────────────────────────────────────┐
  │ ☀ Solar Assessment · [Asset name]                   │
  │                                                     │
  │ Roof area: X sqm  ·  ~X panels  ·  X,XXX kWh/yr   │
  │                                                     │
  │ £X,XXX/yr self-consumption saving                   │
  │ £XXX/yr smart export income (SEG)                   │
  │ Payback: X.X years  ·  EPC improvement: +X bands    │
  │                                                     │
  │ [Get installer quotes →]                             │
  └─────────────────────────────────────────────────────┘

If status === "not_viable":
  Show collapsed note: "Solar: not viable at this address — [notViableReason]"

If status === "pending" or assessment === null:
  Show loading skeleton in place of card (don't show error, don't show empty)
```

### 3c. Consumption Heatmap

```
Section: "Consumption"

If no EnergyRead records for asset:
  → Show: "Connect a smart meter or upload a bill to see half-hourly consumption"
  → Show "Upload bill" CTA (same as existing PolicyUploadWidget trigger)

If EnergyRead records exist:
  → Show 7 × 24 heatmap grid (days of week vs hours)
  → Each cell: coloured by kWh intensity (light → dark blue)
  → Hover: show exact kWh for that slot
```

Heatmap component: `src/components/ui/EnergyHeatmap.tsx`. Build as a standalone component, data prop: `EnergyRead[]`.

---

## 4. Bill upload pipeline updates

When a utility bill finishes extraction (`/api/documents/[docId]/extract` webhook or completion handler):

1. If MPAN found in extracted data → parse profile class → set `asset.meterType`
2. Trigger `detectAnomalies(assetId)` — creates `EnergyAnomaly` records if any are found
3. If `SolarAssessment` doesn't exist for asset → trigger `GET /api/user/solar-assessment?assetId=...` in background

---

## 5. Meter type guard (CRITICAL — do not break this)

The existing energy page already enforces:
- `canSwitch = isGBP` — FL properties can't switch suppliers
- `meterType === "hh"` → show "Large-site bespoke tender" instead of Octopus CTA

When `meterType` is stored in DB (step 1e above), replace the static check with a DB lookup. Guard logic:

```ts
// In energy page + /api/energy/quotes GET:
if (asset.market === 'fl') {
  // Hide tariff switching section. Show solar/HVAC only.
  return { canSwitch: false, reason: 'fl_regulated_monopoly' }
}
if (asset.meterType === 'hh') {
  // Don't call Octopus API. Show bespoke tender CTA.
  return { canSwitch: false, reason: 'hh_metered' }
}
// SME UK asset — proceed with Octopus API call
```

---

## 6. Acceptance criteria

- [ ] Upload a utility bill → anomaly detection runs within 60 seconds of extraction → at least one anomaly card appears if data supports it. All figures derive from the uploaded bill — no hardcoded values.
- [ ] `tariff_mismatch` anomaly detected when unit rate > 130% of Ofgem/EIA benchmark. Saving calculation shows kWh figure, rate used, and multiplier.
- [ ] For any FL market property, the tariff switching section is hidden and solar + HVAC sections remain visible.
- [ ] Upload a bill for an HH-metered property (MPAN profile class `00`) → `meterType = "hh"` stored → "Switch" CTA not shown → "Large-site bespoke tender" message shown instead.
- [ ] `GET /api/user/solar-assessment?assetId=X` → calls Google Solar API if `GOOGLE_SOLAR_API_KEY` set → caches result in `SolarAssessment` → subsequent calls return cached result without re-calling API.
- [ ] If `GOOGLE_SOLAR_API_KEY` not set → solar card shows loading/pending state, not error, not blank.
- [ ] All anomaly cards: dismiss → card removed immediately. Status updated in DB.
- [ ] HVAC anomaly feed ranked by `annualSavingGbp` descending.
- [ ] Consumption heatmap shows empty state prompt when no `EnergyRead` records exist. No illustrative data.

---

## 7. What to stub

These require board/API access and should show clean pending states only:

| Feature | Stub state | Blocker |
|---------|-----------|---------|
| Smart meter half-hourly reads | "Connect smart meter — [Setup guide]" CTA. Heatmap shows empty state. | DCC / n3rgy authorisation |
| BMS schedule push | "Fix via BMS" CTA hidden. Show "Get quotes" only. | Per-installation BMS API |
| MCS installer API | On "Get quotes" tap: create `SolarQuoteRequest` and send email to RealHQ admin for manual follow-up | MCS API commercial access |
| Octopus smart export rates | Default to Ofgem SEG reference rate (5.5p/kWh) if Octopus API not returning live rate | None — use fallback |
| EDF / British Gas / E.ON switching | Show Octopus-only comparison. Footer: "More suppliers coming soon." | Board: commercial API access |

---

## 8. Files to edit

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `EnergyRead`, `EnergyAnomaly`, `SolarAssessment`, `SolarQuoteRequest` models; add `meterType` to `UserAsset` |
| `src/app/energy/page.tsx` | Add anomaly feed section, solar card section, heatmap section |
| `src/app/api/user/energy-anomalies/route.ts` | New: GET anomalies |
| `src/app/api/user/energy-anomalies/[anomalyId]/route.ts` | New: PATCH anomaly status |
| `src/app/api/user/solar-assessment/route.ts` | New: GET assessment (triggers Solar API) |
| `src/app/api/user/solar-assessment/[assetId]/quote-request/route.ts` | New: POST quote request |
| `src/components/ui/EnergyHeatmap.tsx` | New: 7×24 heatmap component |
| `src/lib/energy/detectAnomalies.ts` | New: anomaly detection logic (pure function, takes bill data + reads) |
| `src/lib/energy/googleSolar.ts` | New: Google Solar API client |

---

## 9. Environment variables needed

| Variable | Used for | Urgency |
|----------|---------|---------|
| `GOOGLE_SOLAR_API_KEY` | Solar card | High — stub gracefully if missing |
| `OCTOPUS_API_KEY` | Tariff comparison + switch | High |
| `DCC_API_KEY` | Smart meter reads | Low — stub until board acts |

---

## Priority build order

1. **Prisma migrations** — schema additions (no UI impact, safe to ship first)
2. **Bill pipeline: meterType extraction** — extract MPAN profile class, store `meterType`
3. **Anomaly detection lib** — `src/lib/energy/detectAnomalies.ts` (pure function, testable)
4. **Anomaly API** — `GET /api/user/energy-anomalies` + `PATCH` for status
5. **Anomaly feed UI** — new section on energy page
6. **Solar API client** — `src/lib/energy/googleSolar.ts` with graceful no-key handling
7. **Solar assessment API** — `GET /api/user/solar-assessment`
8. **Solar card UI** — upgrade opportunities section on energy page
9. **Heatmap component** — `EnergyHeatmap.tsx` + consumption section (empty state only until smart meter)
