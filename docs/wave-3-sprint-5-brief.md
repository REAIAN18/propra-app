# RealHQ Wave 3 — Sprint 5 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html, Addendum v3.1, wave-3-triage.md
**Prerequisite:** Wave 3 Sprint 4 complete (Tenant Portal + Legal Docs live)
**Target:** 3-week sprint (FSE + FE)

---

## Sprint 5 Scope — Three Features

Sprint 5 delivers three high-value features that are now unblocked by previous Wave 3 sprints:

1. **Monthly Cashflow P&L Panel (T3-13)** — Depends on `MonthlyFinancial` model from Sprint 2
2. **Portfolio Health Score Panel (T3-14)** — Depends on Tenant Portal rent payment data + Work Orders + Compliance from Sprints 1-4
3. **Contractor Panel Management (T3-10)** — Extends Wave 2 Work Orders with self-serve contractor onboarding

---

## Feature 1: Monthly Cashflow P&L Panel (T3-13)

### What it builds

A right-column dashboard card showing current month cashflow vs budget. Per Spec v3.2 Section 5.1 design pattern 3.

**Line items:**
- **Revenue (+)**
  - Base rental income (from `Lease.currentRent`)
  - Parking & misc income (new field: `MonthlyFinancial.parkingIncome`, `miscIncome`)
  - CAM recoveries (deferred to Sprint 6 — CAM Recovery engine)
- **Operating Expenses (-)**
  - Maintenance & repairs (from `WorkOrder.finalCost` where `completedAt` in month)
  - Management fees (new field: `UserAsset.managementFeePercent` × gross rent)
  - Insurance (from `InsurancePlacement.annualPremium / 12`)
  - Utilities (from `MonthlyFinancial.utilitiesCost`)
  - Property taxes (from `MonthlyFinancial.propertyTaxCost`)
- **Net Operating Income (NOI)** = Revenue - OpEx

**Budget comparison:** Each line shows actual vs budget (if `MonthlyBudget` record exists for the month). Green/red indicators show over/under performance.

### Why now (Sprint 5)

Sprint 2 delivered the `MonthlyFinancial` model. Sprint 3 completed Work Orders (maintenance cost tracking). Sprint 4 adds Tenant Portal (rent payment tracking). All required data sources now exist.

**Missing piece in Sprint 5:** CAM recoveries. This is deferred to Sprint 6 (T3-6 CAM Recovery engine). The P&L panel will show CAM as £0 with a "(CAM tracking coming soon)" note until Sprint 6.

### New schema additions

```prisma
// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  managementFeePercent  Decimal?  @db.Decimal(5,2)  // e.g., 5.50 for 5.5%
  monthlyBudgets        MonthlyBudget[]
}

// Add to existing MonthlyFinancial model (Sprint 2):
model MonthlyFinancial {
  // ... existing fields from Sprint 2 ...
  parkingIncome     Int?  @default(0)  // pence/cents
  miscIncome        Int?  @default(0)  // other income streams
  utilitiesCost     Int?  @default(0)  // pence/cents
  propertyTaxCost   Int?  @default(0)
}

model MonthlyBudget {
  id                  String    @id @default(cuid())
  assetId             String
  month               DateTime  // first day of the month
  budgetRentalIncome  Int       // pence/cents
  budgetMaintenanceCost Int
  budgetUtilitiesCost Int?
  budgetPropertyTaxCost Int?
  budgetManagementFee Int?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  asset               UserAsset @relation(fields: [assetId], references: [id])

  @@unique([assetId, month])
}
```

### New API routes

#### `GET /api/user/monthly-pl`
Returns current month P&L for all assets or a single asset.

```typescript
// Query params: ?month=2026-03 (optional, defaults to current month), ?assetId=xxx (optional)
// Response:
{
  month: "2026-03",
  assetId: "xxx",  // or null for portfolio aggregate
  revenue: {
    rentalIncome: 125000,  // pence
    parkingIncome: 5000,
    miscIncome: 2000,
    camRecoveries: 0,  // Sprint 6
    total: 132000
  },
  opex: {
    maintenance: 15000,
    managementFees: 6250,  // 5% of gross rent
    insurance: 8333,  // annualPremium / 12
    utilities: 12000,
    propertyTax: 10000,
    total: 51583
  },
  noi: 80417,  // revenue.total - opex.total
  budget: {  // null if no MonthlyBudget exists
    revenue: 130000,
    opex: 50000,
    noi: 80000
  },
  variance: {  // actual vs budget
    revenue: +2000,
    opex: -1583,  // negative = overspent
    noi: +417
  }
}
```

#### `POST /api/user/monthly-budget`
Creates or updates a monthly budget for an asset.

```typescript
// Body:
{
  assetId: string;
  month: string;  // YYYY-MM
  budgetRentalIncome: number;  // pence
  budgetMaintenanceCost: number;
  budgetUtilitiesCost?: number;
  budgetPropertyTaxCost?: number;
  budgetManagementFee?: number;
}
```

#### `PATCH /api/user/assets/:id/management-fee`
Sets the management fee percentage for an asset.

```typescript
// Body: { managementFeePercent: number }  // e.g., 5.50 for 5.5%
```

### FE: Monthly Cashflow P&L Panel

**Location:** Dashboard, right column, below Properties Grid (or replaces one of the existing right-column cards — CEO decision needed on placement).

**Design:**
- Card header: "Current Month Cashflow" with month label "March 2026"
- Two sections: Revenue (green header) and Operating Expenses (red header)
- Each line item: label, actual amount, budget amount (if exists), variance indicator (↑ green for revenue over budget, ↓ red for opex over budget)
- Bottom row: **Net Operating Income** in bold, with total variance vs budget
- "Set budget →" link opens budget modal

**Budget modal:**
- Form with inputs for each budget line item
- Month selector (defaults to current month)
- "Apply to future months" checkbox (copies budget to next 3/6/12 months)

### Acceptance criteria

- [ ] `GET /api/user/monthly-pl` aggregates revenue from `Lease`, `MonthlyFinancial`, `WorkOrder`, `InsurancePlacement` correctly
- [ ] P&L panel renders with real data for current month
- [ ] Budget modal creates `MonthlyBudget` record
- [ ] Variance indicators show correct direction (green for favorable, red for unfavorable)
- [ ] CAM recoveries line shows £0 with "(Coming soon)" note
- [ ] Management fee calculated correctly from `managementFeePercent` × gross rent
- [ ] Works for both single-asset and portfolio aggregate views

---

## Feature 2: Portfolio Health Score Panel (T3-14)

### What it builds

A right-column dashboard panel with 5 colour-coded horizontal progress bars showing key portfolio health metrics. Per Spec v3.2 Section 5.1 design pattern 2.

**The 5 bars:**

| Bar | Description | Data source | Available |
|-----|-------------|-------------|-----------|
| **Rent collection %** | % of due rent actually collected in last 30 days | `RentPayment` (Sprint 4) | ✅ Sprint 4 |
| **Maintenance SLA %** | % of work orders completed within target timeframe | `WorkOrder.startedAt` → `completedAt` vs SLA target | ✅ Wave 2 |
| **Tenant satisfaction %** | Average tenant rating from portal feedback | `TenantMessage.rating` (new field) | ✅ Sprint 4 + new |
| **CAM accuracy %** | % of CAM charges accurately recovered (no over/under) | CAM Recovery engine | ❌ Sprint 6 |
| **Insurance compliance %** | % of assets with valid, up-to-date insurance | `InsurancePlacement.expiryDate` vs today | ✅ Wave 1 |

**Sprint 5 status:** 4 of 5 bars can be built. CAM accuracy deferred to Sprint 6 — the panel will show "4 of 5 health checks active" until Sprint 6 completes.

### New schema additions

```prisma
// Add to existing TenantMessage model (Sprint 4):
model TenantMessage {
  // ... existing fields ...
  rating  Int?  // 1-5 star rating (optional, tenant can rate landlord response)
}

// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  workOrderSlaHours  Int  @default(72)  // default 72h (3 days) for routine work orders
}
```

### New API routes

#### `GET /api/user/portfolio-health`
Returns the 5 health scores for the portfolio.

```typescript
// Response:
{
  rentCollection: {
    score: 94,  // percentage
    details: "£94,000 collected of £100,000 due in last 30 days",
    status: "healthy"  // "healthy" | "warning" | "critical"
  },
  maintenanceSla: {
    score: 87,  // % completed within SLA
    details: "26 of 30 work orders completed within target timeframe",
    status: "healthy"
  },
  tenantSatisfaction: {
    score: 4.2,  // average rating out of 5
    details: "Based on 18 tenant ratings",
    status: "healthy"
  },
  camAccuracy: null,  // Sprint 6
  insuranceCompliance: {
    score: 100,
    details: "All 12 assets have valid insurance",
    status: "healthy"
  },
  overallHealth: 91  // average of available scores
}
```

**Status thresholds:**
- `healthy`: ≥ 80%
- `warning`: 60–79%
- `critical`: < 60%

### FE: Portfolio Health Score Panel

**Location:** Dashboard, right column.

**Design:**
- Card header: "Portfolio Health Score" with overall score (e.g., "91%") in large text
- 5 horizontal bars, each with:
  - Label (e.g., "Rent Collection")
  - Progress bar (colour-coded: green ≥80%, amber 60-79%, red <60%)
  - Score percentage
  - "(View details →)" link to relevant screen
- CAM accuracy bar shows "Coming soon" state with lock icon until Sprint 6

**Interactivity:**
- Click "Rent collection" → navigates to `/tenants` (filtered to recent payments)
- Click "Maintenance SLA" → navigates to `/work-orders` (filtered to SLA breaches)
- Click "Tenant satisfaction" → navigates to `/tenants` (filtered to low-rated messages)
- Click "Insurance compliance" → navigates to `/insurance`

### Acceptance criteria

- [ ] `GET /api/user/portfolio-health` calculates all 5 scores correctly
- [ ] Rent collection % aggregates from `RentPayment` records (Sprint 4)
- [ ] Maintenance SLA % compares `startedAt` → `completedAt` vs `workOrderSlaHours`
- [ ] Tenant satisfaction averages ratings from `TenantMessage.rating`
- [ ] Insurance compliance checks `InsurancePlacement.expiryDate` for all assets
- [ ] Panel renders with 4 active bars + 1 "Coming soon" placeholder
- [ ] Colour coding reflects thresholds (green/amber/red)
- [ ] Click-through navigation to detail screens works

---

## Feature 3: Contractor Panel Management — Self-Serve Onboarding (T3-10)

### What it builds

Automated contractor onboarding portal allowing contractors to apply to join the RealHQ contractor panel, with automatic verification via Companies House and insurance API checks.

**Wave 2 status:** Work Orders uses a curated seeded contractor panel (15-20 contractors, manually verified). This worked for initial work orders but doesn't scale beyond 50 work orders.

**Sprint 5:** Contractors can self-serve apply via `/contractor-apply` public page. Applications are auto-verified and added to the panel if checks pass.

### New schema additions

```prisma
model ContractorApplication {
  id                      String    @id @default(cuid())
  companyName             String
  contactName             String
  email                   String
  phone                   String
  companyRegistrationNo   String?   // UK: Companies House number, US: EIN
  tradeSpecialty          String    // "plumbing" | "electrical" | "hvac" | "roofing" | "general"
  serviceAreas            String[]  // postcodes or cities
  employersLiabilityInsuranceUrl String?  // S3 URL to uploaded certificate
  insuranceExpiryDate     DateTime?
  status                  String    @default("pending")  // "pending" | "verified" | "rejected"
  verifiedAt              DateTime?
  rejectionReason         String?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

// Add to existing Contractor model:
model Contractor {
  // ... existing fields ...
  applicationId   String?  @unique
  verifiedVia     String?  @default("manual")  // "manual" | "auto_verified"
}
```

### New API routes

#### `POST /api/contractor-apply` (public, no auth)
Contractor submits application.

```typescript
// Body:
{
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companyRegistrationNo?: string;
  tradeSpecialty: string;
  serviceAreas: string[];
  employersLiabilityInsuranceUrl?: string;  // S3 pre-signed upload
  insuranceExpiryDate?: string;
}

// Creates ContractorApplication record
// Triggers auto-verification:
// 1. UK: Companies House API check (existing lib)
// 2. Insurance expiry validation (must be > 90 days future)
// 3. Email validation (no disposable email domains)
// If all checks pass: creates Contractor record, status = "verified"
// If checks fail: status = "rejected", rejectionReason set
```

#### `GET /api/user/contractor-applications`
Returns pending contractor applications for manual review (owner-facing).

#### `PATCH /api/user/contractor-applications/:id/approve`
Manually approve a contractor application (creates `Contractor` record).

#### `PATCH /api/user/contractor-applications/:id/reject`
Reject application with reason.

### Auto-verification logic

```typescript
// src/lib/contractor-verification.ts

export async function autoVerifyContractor(application: ContractorApplication) {
  const checks = {
    companyHouseOk: false,
    insuranceOk: false,
    emailOk: false,
  };

  // Check 1: Companies House (UK only)
  if (application.companyRegistrationNo) {
    const chData = await checkCompaniesHouse(application.companyRegistrationNo);
    checks.companyHouseOk = chData?.status === "active";
  }

  // Check 2: Insurance expiry
  if (application.insuranceExpiryDate) {
    const daysUntilExpiry = differenceInDays(
      new Date(application.insuranceExpiryDate),
      new Date()
    );
    checks.insuranceOk = daysUntilExpiry > 90;
  }

  // Check 3: Email domain
  const disposableDomains = ["tempmail.com", "guerrillamail.com", "10minutemail.com"];
  const emailDomain = application.email.split("@")[1];
  checks.emailOk = !disposableDomains.includes(emailDomain);

  // All checks must pass for auto-verification
  const allPass = Object.values(checks).every(Boolean);

  return {
    verified: allPass,
    checks,
    rejectionReason: allPass ? null : buildRejectionReason(checks),
  };
}
```

### FE: Contractor Application Page (`/contractor-apply`)

**Public page** (no authentication required). Contractors access via link from RealHQ marketing or tender invites.

**Design:**
- Hero: "Join the RealHQ Contractor Panel"
- Subtitle: "Get matched with commercial property owners across the UK"
- Multi-step form:
  1. Company details (name, registration number, contact)
  2. Trade specialty + service areas
  3. Insurance certificate upload
- Auto-verification feedback: "Verifying your details..." → "Application approved!" or "Manual review required"

### Owner-facing: Contractor Applications Tab

**Location:** Add "Applications" tab to `/work-orders` page.

**Shows:**
- List of pending contractor applications
- Per-application: company name, trade, service areas, verification status
- "Approve" / "Reject" buttons for manual review cases
- Auto-approved applications show "Auto-verified ✓" badge

### Acceptance criteria

- [ ] `/contractor-apply` page accessible without auth
- [ ] `POST /api/contractor-apply` creates `ContractorApplication` record
- [ ] Auto-verification checks Companies House, insurance expiry, email domain
- [ ] Auto-approved applications create `Contractor` record immediately
- [ ] Manual review applications appear in owner's Applications tab
- [ ] Owner can approve/reject pending applications
- [ ] Approved contractors appear in contractor panel for work order tenders
- [ ] Email notification sent to contractor on approval/rejection

---

## Schema additions summary

```prisma
// New models
model MonthlyBudget { ... }
model ContractorApplication { ... }

// Fields added to existing models
// UserAsset: managementFeePercent, workOrderSlaHours, monthlyBudgets relation
// MonthlyFinancial: parkingIncome, miscIncome, utilitiesCost, propertyTaxCost
// TenantMessage: rating (1-5 stars)
// Contractor: applicationId, verifiedVia
```

Migration file: `prisma/migrations/20260324_wave3_sprint5/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| Monthly P&L: schema + migration | 0.5 days | FSE | None |
| Monthly P&L: `/api/user/monthly-pl` route | 1 day | FSE | Schema done |
| Monthly P&L: `/api/user/monthly-budget` route | 0.5 days | FSE | Schema done |
| Monthly P&L: FE panel + budget modal | 1.5 days | FE | BE routes done |
| Health Score: schema + migration | 0.5 days | FSE | None |
| Health Score: `/api/user/portfolio-health` route | 1.5 days | FSE | Schema done |
| Health Score: FE panel | 1 day | FE | BE route done |
| Contractor Panel: schema + migration | 0.5 days | FSE | None |
| Contractor Panel: auto-verification logic | 1 day | FSE | Schema done |
| Contractor Panel: `/api/contractor-apply` route | 1 day | FSE | Verification logic done |
| Contractor Panel: FE application page | 1.5 days | FE | BE route done |
| Contractor Panel: Owner applications tab | 1 day | FE | BE route done |
| **Total** | **~12 days (~3 weeks)** | FSE + FE | Sprints 1-4 complete |

---

## What this sprint does NOT include

- CAM Recovery engine (Sprint 6 — T3-6)
- Portfolio Health Score "CAM accuracy" bar (Sprint 6)
- Contractor rating/review system (post-Sprint 5 enhancement)
- Contractor payment automation via GoCardless (post-Sprint 5)
- RAMS (Risk Assessment Method Statement) template library (post-Sprint 5)
- Contractor insurance API verification (manual certificate upload only in Sprint 5)

---

## Revenue impact

| Feature | Revenue model | Impact |
|---------|---------------|--------|
| Monthly P&L Panel | No direct revenue — operational visibility feature | Retention value: better NOI tracking reduces churn |
| Portfolio Health Score | No direct revenue — diagnostic feature | Positioning: surfaces actionable insights that lead to work orders (3% commission) |
| Contractor Panel Management | No direct revenue — infrastructure | Scalability: unblocks work order growth beyond 50 orders |

Sprint 5 is primarily **infrastructure and UX polish** — enabling scale and better decision-making, rather than direct commission features.

---

*Sprint 5 target: 3 weeks after Sprint 4 complete · Owner: FSE + FE · CTO approval required on dashboard card placement for P&L panel*
