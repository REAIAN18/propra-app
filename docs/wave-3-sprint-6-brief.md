# RealHQ Wave 3 — Sprint 6 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html, Addendum v3.1, wave-3-triage.md
**Prerequisite:** Wave 3 Sprint 5 complete (Monthly P&L + Health Score + Contractor Panel live)
**Target:** 4-week sprint (FSE + FE + data complexity)

---

## Sprint 6 Scope — Two Major Features

Sprint 6 delivers two high-complexity, high-value features that close critical gaps in the portfolio intelligence platform:

1. **CAM Recovery Detection (T3-6)** — Automatically identifies service charge over/under-recovery from lease schedules
2. **Carbon Reporting Panel (T3-12)** — kgCO2e/sqft tracking + CRREM pathway comparison for net zero alignment

Both features require sophisticated data extraction and industry-specific calculation logic.

---

## Feature 1: CAM Recovery Detection (T3-6)

### What it builds

Automated detection of Common Area Maintenance (CAM) service charge recovery issues:

- **Under-recovered charges:** Service charge items landlord is entitled to recover per the lease but hasn't billed to tenants
- **Over-recovered charges:** Charges billed that exceed lease cap or aren't recoverable per lease terms
- **Cap exposure:** Charges approaching lease-specified caps (e.g., "service charge capped at 110% of Year 1 baseline")
- **Reconciliation statements:** Auto-generated annual reconciliation comparing budgeted vs actual CAM

**Revenue impact:** Identifies £10k–£50k/year under-recovery per multi-let asset. No direct commission — this is a retention and positioning feature that reduces leakage.

### Why now (Sprint 6)

Sprint 2 delivered `MonthlyFinancial` model. Sprint 4 delivered Tenant Intelligence with lease materialisation. Sprint 5 added Monthly P&L panel with CAM as a placeholder. All foundational data is now live.

**Complexity driver:** CAM schedules are complex lease clauses requiring careful extraction. Example lease clause:

> "The Tenant shall pay a service charge comprising a fair proportion (determined by the Landlord acting reasonably) of the costs incurred by the Landlord in the repair, maintenance, insurance, and management of the Property, capped at 110% of the baseline service charge (£8,500 per annum indexed by RPI)."

The AI must extract:
- What's recoverable (repair, maintenance, insurance, management)
- What's excluded (e.g., structural repairs may be landlord-only)
- Cap mechanism (110% of baseline, RPI-indexed)
- Baseline amount (£8,500/yr)
- Apportionment method (fair proportion, sqft-based, fixed %)

### New schema additions

```prisma
model ServiceChargeSchedule {
  id                    String    @id @default(cuid())
  leaseId               String    @unique
  recoverableItems      Json      // array of recoverable cost categories
  excludedItems         Json?     // array of explicitly excluded items
  apportionmentMethod   String    // "sqft" | "fair_proportion" | "fixed_percent" | "equal_share"
  apportionmentPercent  Decimal?  @db.Decimal(5,2)  // if fixed_percent
  capMechanism          String?   // "percentage_of_baseline" | "fixed_amount" | "rpi_indexed" | null
  capBaselineAmount     Int?      // pence, if cap exists
  capPercentage         Decimal?  @db.Decimal(5,2)  // e.g., 110.00 for 110%
  indexationMethod      String?   // "rpi" | "cpi" | "fixed" | null
  reviewFrequency       String?   // "annual" | "triennial" | "quinquennial"
  sweepingUpProvision   Boolean   @default(false)  // can landlord recover uncapped shortfall later?
  extractedAt           DateTime  @default(now())
  lease                 Lease     @relation(fields: [leaseId], references: [id])
}

model CamRecoveryIssue {
  id                String    @id @default(cuid())
  assetId           String
  leaseId           String
  issueType         String    // "under_recovered" | "over_recovered" | "approaching_cap" | "non_recoverable_billed"
  description       String    @db.Text  // AI-generated explanation
  affectedYear      Int       // financial year
  amountPence       Int       // exposure amount
  recommendation    String    @db.Text  // what to do
  status            String    @default("open")  // "open" | "acknowledged" | "resolved"
  acknowledgedAt    DateTime?
  createdAt         DateTime  @default(now())
  asset             UserAsset @relation(fields: [assetId], references: [id])
  lease             Lease     @relation(fields: [leaseId], references: [id])
}

model CamReconciliation {
  id                String    @id @default(cuid())
  leaseId           String
  reconciliationYear Int
  budgetedAmount    Int       // pence, budgeted service charge for the year
  actualAmount      Int       // pence, actual costs incurred
  billedAmount      Int       // pence, amount billed to tenant
  recoveryRate      Decimal   @db.Decimal(5,2)  // % recovered
  underRecovery     Int       // pence, shortfall
  status            String    @default("draft")  // "draft" | "issued" | "disputed" | "settled"
  issuedAt          DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  lease             Lease     @relation(fields: [leaseId], references: [id])
}

// Add to existing Lease model:
model Lease {
  // ... existing fields ...
  serviceChargeSchedule  ServiceChargeSchedule?
  camRecoveryIssues      CamRecoveryIssue[]
  camReconciliations     CamReconciliation[]
}
```

### Lease clause extraction — AI prompt

When a lease is uploaded, extract the service charge schedule:

```
You are a commercial lease analyst. Extract the service charge (CAM) terms from the lease document.

Lease text: {leaseText}

Extract and structure the following:

1. **Recoverable items**: List all cost categories the landlord can recover (e.g., repair, maintenance, insurance, utilities, management fees, rates).

2. **Excluded items**: List any items explicitly excluded from recovery (e.g., "structural repairs", "capital improvements", "landlord's legal costs").

3. **Apportionment method**: How is the tenant's share calculated?
   - "sqft": Tenant's floor area / total lettable area
   - "fair_proportion": Landlord determines reasonably
   - "fixed_percent": Stated percentage (extract the %)
   - "equal_share": Split equally among all tenants

4. **Cap mechanism**: Is there a cap on service charge increases?
   - "percentage_of_baseline": Capped at X% of baseline (extract baseline amount and %)
   - "fixed_amount": Fixed annual cap (extract amount)
   - "rpi_indexed": Baseline indexed by RPI
   - null: No cap

5. **Indexation**: How does the service charge increase over time? (RPI, CPI, fixed %, none)

6. **Review frequency**: Annual, triennial, quinquennial, or ad-hoc?

7. **Sweeping up provision**: Can the landlord recover cumulative shortfalls in later years if actual costs exceed capped amount? (yes/no)

Return JSON:
{
  "recoverableItems": ["repair", "maintenance", "insurance", "utilities", "management", "rates"],
  "excludedItems": ["structural_repairs", "capital_improvements"],
  "apportionmentMethod": "sqft",
  "apportionmentPercent": null,
  "capMechanism": "percentage_of_baseline",
  "capBaselineAmount": 850000,  // pence
  "capPercentage": 110.00,
  "indexationMethod": "rpi",
  "reviewFrequency": "annual",
  "sweepingUpProvision": false
}
```

### CAM issue detection logic

Run monthly via cron (or on-demand via button):

```typescript
// src/lib/cam-detection.ts

export async function detectCamIssues(leaseId: string, year: number) {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: { serviceChargeSchedule: true, asset: true },
  });

  if (!lease.serviceChargeSchedule) {
    return { issues: [], reason: "No service charge schedule extracted" };
  }

  const schedule = lease.serviceChargeSchedule;
  const issues: CamRecoveryIssue[] = [];

  // Get actual costs for the year from MonthlyFinancial
  const actualCosts = await getAnnualCosts(lease.assetId, year);

  // Get billed amount from Tenant records (if tracked)
  const billedAmount = await getBilledServiceCharge(leaseId, year);

  // Issue 1: Under-recovery
  const recoverableTotal = calculateRecoverableAmount(actualCosts, schedule);
  if (billedAmount < recoverableTotal) {
    issues.push({
      issueType: "under_recovered",
      description: `Service charge under-recovered by £${((recoverableTotal - billedAmount) / 100).toFixed(2)}. Actual recoverable costs: £${(recoverableTotal / 100).toFixed(2)}, billed: £${(billedAmount / 100).toFixed(2)}.`,
      amountPence: recoverableTotal - billedAmount,
      recommendation: "Issue service charge demand for shortfall or adjust next year's budget.",
    });
  }

  // Issue 2: Over-recovery (exceeds cap)
  if (schedule.capMechanism && schedule.capBaselineAmount) {
    const capAmount = calculateCapAmount(schedule, year);
    if (billedAmount > capAmount) {
      issues.push({
        issueType: "over_recovered",
        description: `Service charge billed (£${(billedAmount / 100).toFixed(2)}) exceeds lease cap (£${(capAmount / 100).toFixed(2)}).`,
        amountPence: billedAmount - capAmount,
        recommendation: "Refund excess or risk tenant dispute. Review lease cap terms.",
      });
    }
  }

  // Issue 3: Approaching cap (within 5% of cap)
  if (schedule.capMechanism && schedule.capBaselineAmount) {
    const capAmount = calculateCapAmount(schedule, year);
    const utilizationPercent = (billedAmount / capAmount) * 100;
    if (utilizationPercent > 95 && utilizationPercent <= 100) {
      issues.push({
        issueType: "approaching_cap",
        description: `Service charge is ${utilizationPercent.toFixed(1)}% of lease cap. Limited headroom for cost increases.`,
        amountPence: capAmount - billedAmount,
        recommendation: "Consider renegotiating cap at next rent review or flag cost control measures.",
      });
    }
  }

  // Issue 4: Non-recoverable items billed
  const nonRecoverableItems = findNonRecoverableCosts(actualCosts, schedule);
  if (nonRecoverableItems.total > 0) {
    issues.push({
      issueType: "non_recoverable_billed",
      description: `£${(nonRecoverableItems.total / 100).toFixed(2)} of billed costs are not recoverable per lease (e.g., ${nonRecoverableItems.items.join(", ")}).`,
      amountPence: nonRecoverableItems.total,
      recommendation: "Exclude these items from next service charge demand or risk tenant challenge.",
    });
  }

  return { issues, recoverableTotal, billedAmount, actualCosts };
}
```

### New API routes

#### `POST /api/user/cam/detect`
Triggers CAM issue detection for a lease or all leases.

```typescript
// Body: { leaseId?: string, year?: number }  // defaults to current year, all leases
// Response:
{
  issues: CamRecoveryIssue[],
  summary: {
    totalUnderRecovery: 25000,  // pence
    totalOverRecovery: 0,
    affectedLeases: 3
  }
}
```

#### `GET /api/user/cam/issues`
Returns all open CAM recovery issues across the portfolio.

#### `PATCH /api/user/cam/issues/:id/acknowledge`
Marks an issue as acknowledged (landlord is aware, will handle).

#### `POST /api/user/cam/reconciliation`
Generates an annual service charge reconciliation statement for a lease.

```typescript
// Body:
{
  leaseId: string;
  year: number;
  budgetedAmount: number;  // pence, what was budgeted at year start
  actualAmount: number;  // pence, actual costs incurred
  billedAmount: number;  // pence, what was billed to tenant
}

// Creates CamReconciliation record
// Returns PDF reconciliation statement (via Puppeteer, similar to brochure)
```

#### `GET /api/user/cam/reconciliation/:id/pdf`
Downloads reconciliation statement PDF.

### FE: CAM Recovery Screen (`/cam-recovery`)

New screen in the main navigation (Platform section).

**Sections:**

1. **Recovery Issues (top)** — Card grid showing open issues
   - Per-issue card: issue type badge, property name, amount, recommendation, "Acknowledge →" button
   - Colour-coded: red for over-recovery, amber for under-recovery, blue for approaching cap

2. **Recovery Rate by Property** — Table showing all multi-let assets
   - Columns: Property, Budgeted CAM, Actual CAM, Billed, Recovery %, Shortfall, Action
   - Sortable by recovery rate (worst first)

3. **Annual Reconciliations** — List of issued reconciliations
   - Per-row: Lease (property + tenant), Year, Billed, Actual, Status, "Download PDF →"
   - "Generate reconciliation →" button opens modal

**Reconciliation modal:**
- Select lease + year
- Input budgeted, actual, and billed amounts (pre-filled from MonthlyFinancial if available)
- "Generate statement →" creates PDF

### Integration with Sprint 5 features

**Monthly P&L Panel (Sprint 5):** CAM recoveries line now shows real data from `CamReconciliation.billedAmount` (was placeholder in Sprint 5).

**Portfolio Health Score (Sprint 5):** "CAM accuracy" bar now active, calculated as:
```
CAM accuracy % = (Total billed - Total over/under-recovery issues) / Total billed × 100
```

### Acceptance criteria

- [ ] AI prompt extracts service charge schedule from uploaded lease
- [ ] `ServiceChargeSchedule` record created with correct cap, apportionment, and recoverable items
- [ ] `POST /api/user/cam/detect` identifies under-recovery, over-recovery, approaching cap, and non-recoverable items
- [ ] CAM issues appear on `/cam-recovery` screen
- [ ] Recovery rate table shows correct calculation per property
- [ ] Annual reconciliation PDF generates with landlord + tenant details, budgeted vs actual breakdown
- [ ] Sprint 5 Monthly P&L panel CAM line updates with real data
- [ ] Sprint 5 Portfolio Health Score "CAM accuracy" bar activates

---

## Feature 2: Carbon Reporting Panel (T3-12)

### What it builds

Per-property carbon emissions tracking with net zero pathway comparison. Per Spec v3.2 Section 8 energy acceptance criteria.

**Metrics:**
- **kgCO2e/sqft** — Carbon intensity per square foot (Scope 1 + 2 emissions)
- **Total annual CO2** — Portfolio-level emissions (tonnes CO2e/year)
- **CRREM pathway comparison** — Is the property on track for 1.5°C/2°C net zero targets?
- **Decarbonisation recommendations** — AI-generated actions to reduce carbon (e.g., "Replace gas boiler with heat pump: -45 tCO2e/yr")

**Positioning:** Supports ESG reporting for institutional landlords. Enables carbon-linked financing (green loans with lower rates for low-carbon assets).

### Why now (Sprint 6)

Wave 2 Energy Intelligence delivered kWh anomaly detection and tariff switching. That focused on cost. Carbon adds the emissions layer.

**Data requirement:** Accurate carbon calculation requires complete utility data (electricity AND gas AND any district heating). By Sprint 6, most users will have uploaded multiple utility bills (6+ months of data).

**Regulatory tailwind:** UK Energy Savings Opportunity Scheme (ESOS) Phase 3 (2023) requires large businesses to report energy use and carbon. SECR (Streamlined Energy and Carbon Reporting) mandates quoted companies and large unquoted companies to disclose Scope 1 + 2 emissions. This feature enables compliance.

### New schema additions

```prisma
model CarbonReport {
  id                      String    @id @default(cuid())
  assetId                 String
  reportYear              Int       // calendar year
  electricityKwh          Decimal   @db.Decimal(12,2)
  gasKwh                  Decimal?  @db.Decimal(12,2)
  districtHeatingKwh      Decimal?  @db.Decimal(12,2)
  scope1EmissionsTco2e    Decimal   @db.Decimal(10,2)  // tonnes CO2e (gas + on-site fuels)
  scope2EmissionsTco2e    Decimal   @db.Decimal(10,2)  // tonnes CO2e (electricity)
  totalEmissionsTco2e     Decimal   @db.Decimal(10,2)  // scope1 + scope2
  intensityKgco2eSqft     Decimal   @db.Decimal(6,2)   // kgCO2e per sqft
  crremPathwayYear        Int?      // CRREM pathway year (e.g., 2030 for 1.5°C)
  crremTargetIntensity    Decimal?  @db.Decimal(6,2)   // kgCO2e/sqft target for asset type
  alignmentStatus         String?   // "on_track" | "at_risk" | "failing" | "no_pathway_data"
  gapToTarget             Decimal?  @db.Decimal(6,2)   // kgCO2e/sqft gap
  recommendations         Json?     // AI-generated decarbonisation actions
  createdAt               DateTime  @default(now())
  asset                   UserAsset @relation(fields: [assetId], references: [id])

  @@unique([assetId, reportYear])
}

// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  carbonReports  CarbonReport[]
}
```

### Carbon calculation methodology

**UK DEFRA Conversion Factors 2024** (updated annually):

```typescript
// src/lib/carbon-calculation.ts

const CONVERSION_FACTORS_2024 = {
  // Electricity: UK grid intensity (kgCO2e/kWh) — Scope 2
  electricity: {
    ukGrid: 0.207,  // 2024 UK average
    renewable: 0.0,  // if 100% renewable tariff
  },
  // Gas: natural gas (kgCO2e/kWh) — Scope 1
  gas: {
    naturalGas: 0.183,  // 2024 DEFRA factor
  },
  // District heating — Scope 1 or 2 depending on source
  districtHeating: {
    default: 0.15,  // varies by supplier
  },
};

export function calculateCarbonEmissions(data: {
  electricityKwh: number;
  gasKwh?: number;
  districtHeatingKwh?: number;
  renewableElectricityPercent?: number;  // 0-100
}) {
  const renewableFactor = (data.renewableElectricityPercent || 0) / 100;
  const gridFactor = CONVERSION_FACTORS_2024.electricity.ukGrid * (1 - renewableFactor);

  const scope2Emissions = (data.electricityKwh * gridFactor) / 1000;  // tonnes CO2e

  const scope1Emissions =
    ((data.gasKwh || 0) * CONVERSION_FACTORS_2024.gas.naturalGas +
      (data.districtHeatingKwh || 0) * CONVERSION_FACTORS_2024.districtHeating.default) /
    1000;

  const totalEmissions = scope1Emissions + scope2Emissions;

  return {
    scope1EmissionsTco2e: scope1Emissions,
    scope2EmissionsTco2e: scope2Emissions,
    totalEmissionsTco2e: totalEmissions,
  };
}
```

### CRREM pathway data

**CRREM (Carbon Risk Real Estate Monitor):** EU-funded project providing science-based decarbonisation pathways for real estate aligned with Paris Agreement 1.5°C and 2°C targets.

**Data source:** CRREM publishes annual intensity targets (kgCO2e/sqm) by property type, geography, and pathway year. Available at https://www.crrem.eu/pathways/ (free download, Excel format).

**Implementation:**
1. Download CRREM 2024 pathways (UK, Office/Industrial/Retail/Multifamily)
2. Store as reference table in `src/lib/data/crrem-pathways.ts`
3. Match asset type + current year → lookup target intensity
4. Compare actual intensity vs target → determine alignment status

```typescript
// src/lib/data/crrem-pathways.ts

export const CRREM_PATHWAYS_UK_2024 = {
  office: {
    2024: 32.5,  // kgCO2e/sqm
    2025: 30.8,
    2026: 29.1,
    2030: 22.0,
    2035: 14.5,
    2040: 7.2,
    2050: 0.0,
  },
  industrial: {
    2024: 28.0,
    2025: 26.5,
    2030: 19.0,
    2040: 6.0,
    2050: 0.0,
  },
  retail: {
    2024: 35.0,
    2030: 24.0,
    2040: 8.5,
    2050: 0.0,
  },
};

export function getCrremTarget(assetType: string, year: number): number | null {
  const pathway = CRREM_PATHWAYS_UK_2024[assetType.toLowerCase()];
  if (!pathway) return null;
  return pathway[year] || null;
}
```

### AI decarbonisation recommendations

When a carbon report is generated, Claude suggests reduction actions:

```
You are a net zero real estate consultant. Analyse the carbon emissions for this property and recommend specific decarbonisation actions.

Property: {propertyType}, {sqft} sqft
Annual emissions: {totalEmissionsTco2e} tCO2e
- Scope 1 (gas): {scope1} tCO2e
- Scope 2 (electricity): {scope2} tCO2e

Current intensity: {intensityKgco2eSqft} kgCO2e/sqft
CRREM 2030 target: {crremTarget} kgCO2e/sqft
Gap to target: {gap} kgCO2e/sqft

Recommend 3-5 specific actions to reduce emissions, prioritised by ROI and feasibility. For each action:
- Action name (e.g., "Install rooftop solar PV")
- Estimated annual carbon saving (tCO2e/yr)
- Estimated cost (£)
- Payback period (years)
- Notes (any caveats, e.g., "Requires planning consent for listed building")

Return JSON array:
[
  {
    "action": "Replace gas boiler with air source heat pump",
    "carbonSavingTco2e": 45.2,
    "costGbp": 85000,
    "paybackYears": 8.5,
    "notes": "Eligible for £25k BUS grant (Boiler Upgrade Scheme). Requires 3-phase electrical supply."
  },
  ...
]
```

### New API routes

#### `POST /api/user/carbon/report`
Generates a carbon report for an asset for a given year.

```typescript
// Body: { assetId: string, year: number }
// Aggregates utility data from MonthlyFinancial or uploaded bills
// Calculates emissions using DEFRA factors
// Looks up CRREM target
// Generates AI recommendations
// Creates CarbonReport record
```

#### `GET /api/user/carbon/reports`
Returns carbon reports for all assets (latest year per asset).

#### `GET /api/user/carbon/portfolio-summary`
Portfolio-level carbon summary.

```typescript
// Response:
{
  totalEmissionsTco2e: 450.5,  // portfolio total
  averageIntensityKgco2eSqft: 28.3,
  assetsOnTrack: 8,  // aligned with CRREM 2030
  assetsAtRisk: 3,
  assetsFailing: 1,
  portfolioAlignmentStatus: "at_risk"  // majority status
}
```

### FE: Carbon Reporting Panel (Energy screen addition)

**Location:** Add "Carbon" tab to existing `/energy` screen (alongside "Tariff", "Anomalies", "Solar").

**Sections:**

1. **Portfolio Carbon Summary (top card)**
   - Total emissions: 450.5 tCO2e/yr
   - Average intensity: 28.3 kgCO2e/sqft
   - CRREM 2030 target: 22.0 kgCO2e/sqft (for office assets)
   - Gap: 6.3 kgCO2e/sqft
   - Alignment status badge: "At risk" (amber)

2. **Per-Property Carbon Table**
   - Columns: Property, Type, Total tCO2e, Intensity, CRREM Target, Gap, Status
   - Status badges: "On track" (green), "At risk" (amber), "Failing" (red), "No data" (grey)
   - Sortable by gap (worst first)
   - "View report →" link per row

3. **Property Carbon Report Detail Page (`/energy/carbon/:assetId`)**
   - Year-on-year emissions chart (if multiple years of data)
   - Scope 1 vs Scope 2 breakdown (donut chart)
   - CRREM pathway chart: actual intensity vs target pathway line (2024–2050)
   - Decarbonisation recommendations section:
     - Per-action card: action name, carbon saving, cost, payback, notes
     - "Create work order →" button (pre-fills work order with action details)

### Integration with existing features

**Energy screen (Wave 2):** Carbon tab complements cost-focused tariff/anomaly tabs. User sees both financial and environmental impact.

**Work Orders:** Decarbonisation recommendations link to work order creation — carbon reduction becomes actionable.

**Marketing Brochure (Sprint 3):** Add carbon intensity to brochure KPIs (positions low-carbon assets for ESG-focused buyers).

### Acceptance criteria

- [ ] `POST /api/user/carbon/report` aggregates utility data and calculates Scope 1 + 2 emissions
- [ ] DEFRA 2024 conversion factors applied correctly
- [ ] CRREM pathway lookup works for UK office/industrial/retail assets
- [ ] Alignment status correctly determined (on track / at risk / failing)
- [ ] AI generates 3-5 decarbonisation recommendations per property
- [ ] Carbon tab renders on `/energy` screen
- [ ] Portfolio summary shows total emissions and alignment status
- [ ] Per-property carbon report page shows CRREM pathway chart
- [ ] "Create work order" button pre-fills from recommendation
- [ ] Carbon data exports to CSV (for SECR compliance reporting)

---

## Schema additions summary

```prisma
// New models
model ServiceChargeSchedule { ... }
model CamRecoveryIssue { ... }
model CamReconciliation { ... }
model CarbonReport { ... }

// Relations added to existing models
// Lease: serviceChargeSchedule, camRecoveryIssues, camReconciliations
// UserAsset: carbonReports
```

Migration file: `prisma/migrations/20260324_wave3_sprint6/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| CAM: schema + migration | 0.5 days | FSE | None |
| CAM: AI lease clause extraction prompt | 1 day | FSE | Schema done |
| CAM: Detection logic (under/over/cap/non-recoverable) | 2 days | FSE | Extraction done |
| CAM: `/api/user/cam/*` routes (4 routes) | 1.5 days | FSE | Detection logic done |
| CAM: FE `/cam-recovery` screen | 2 days | FE | BE routes done |
| CAM: Reconciliation PDF generation | 1 day | FSE | Puppeteer from Sprint 3 |
| Carbon: schema + migration | 0.5 days | FSE | None |
| Carbon: DEFRA + CRREM calculation logic | 1 day | FSE | Schema done |
| Carbon: AI decarbonisation recommendations | 1 day | FSE | Calculation done |
| Carbon: `/api/user/carbon/*` routes (3 routes) | 1 day | FSE | Calculation done |
| Carbon: FE Carbon tab + report detail page | 2 days | FE | BE routes done |
| Carbon: CRREM pathway chart component | 1 day | FE | Report page done |
| Integration: Sprint 5 P&L CAM update | 0.5 days | FSE | CAM routes done |
| Integration: Sprint 5 Health Score CAM bar | 0.5 days | FE | CAM routes done |
| **Total** | **~16 days (~4 weeks)** | FSE + FE | Sprints 1-5 complete |

---

## What this sprint does NOT include

- **Scope 3 emissions** (embodied carbon, tenant energy use, construction materials) — post-Sprint 6
- **Live CRREM API integration** (currently uses static reference table) — CRREM doesn't offer a public API; manual update of reference table annually
- **Carbon offset marketplace integration** (e.g., Patch, Cloverly) — post-Sprint 6
- **PAS 2080 compliance** (carbon management in infrastructure) — niche, post-Sprint 6
- **GRESB/TCFD reporting templates** (institutional ESG reporting frameworks) — post-Sprint 6
- **CAM dispute resolution workflow** (tenant challenges service charge) — post-Sprint 6
- **Service charge budget approval workflow** (multi-tenant approval) — post-Sprint 6

---

## Revenue impact

| Feature | Revenue model | Impact |
|---------|--------------|--------|
| CAM Recovery Detection | No direct revenue — leakage reduction | Value: £10k–£50k/yr under-recovery identified per multi-let asset. Retention feature. |
| Carbon Reporting | No direct revenue — ESG compliance enabler | Positioning: enables carbon-linked financing (green loans ~0.25% rate reduction). Institutional investor requirement. |

Sprint 6 is **operational intelligence and compliance** — high retention value, critical for institutional landlords, positions RealHQ as ESG-ready platform.

---

*Sprint 6 target: 4 weeks after Sprint 5 complete · Owner: FSE + FE · CTO approval required on DEFRA conversion factor annual updates*
