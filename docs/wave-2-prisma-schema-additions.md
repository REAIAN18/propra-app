# Wave 2 — Prisma Schema Additions
**Author:** Head of Product
**Date:** 2026-03-23
**For:** CTO (PRO-563)
**Purpose:** Reference only — schema was applied piecemeal via individual migration files (2026-03-22/23). PRO-563 is closed.

> **⚠️ STATUS: APPLIED.** All Wave 2 models listed here have been migrated to Neon via `20260322_add_*` and `20260323_wave2_*` migration files. `prisma/schema.prisma` is the source of truth. Do not run `npx prisma migrate dev --name wave2-all-models` — it would generate a no-op or conflict.
>
> **One remaining gap:** `insuranceRiskScore`, `insuranceRiskFactors`, `insuranceRoadmap`, `insuranceRiskAssessedAt` on `UserAsset` (PRO-610) are in `schema.prisma` but have no migration file. Apply when PRO-610 is ready: `npx prisma db push` or write a targeted migration.

---

## Reference — Applied Schema

---

## Section A — UserAsset field additions

Add these fields to the existing `model UserAsset` block, before the `createdAt` field:

```prisma
  // Energy Wave 2
  meterType            String?   // "hh" | "sme" — half-hourly or SME meter

  // Planning Intelligence
  planningImpactSignal String?   // "positive" | "neutral" | "negative" — latest signal
  planningLastFetched  DateTime? // when live feed last ran for this asset

  // AVM
  avmValue             Float?    // latest automated valuation (£/$)
  avmDate              DateTime? // when avmValue was last calculated
  avmConfidence        Float?    // 0.0–1.0 confidence score

  // Scout pipeline
  pipelineStage        String?   // "review" | "underwritten" | "offer_made" | "closed_won" | "closed_lost"
  pipelineUpdatedAt    DateTime?
  brochureDocId        String?   // FK to Document (brochure/OM upload)
  tenantCount          Int?      // number of active leases (denormalised for dashboard)
  wault                Float?    // weighted average unexpired lease term (years)
  region               String?   // "se_uk" | "fl_us" — for avm.ts getFallbackCapRate

  // Dev Potential (PRO-604) — see docs/wave-2-planning-dev-potential-handoff.md
  siteCoveragePct           Float?    // site coverage %, used to assess air rights and excess land
  pdRights                  String?   // "clear" | "restricted" | "none" | "check_required"
  pdRightsDetail            String?   // Claude narrative on PDR eligibility
  changeOfUsePotential      String?   // "high" | "medium" | "low" | "none"
  changeOfUseDetail         String?   // Claude narrative on change of use options
  airRightsPotential        String?   // "high" | "medium" | "low" | "none"
  airRightsDetail           String?   // Claude narrative on air rights/upper floor development
  devPotentialAssessedAt    DateTime? // when dev potential was last calculated (30-day cache)

  // Insurance Risk Scorecard (PRO-610) — see docs/wave-2-insurance-premium-reduction-handoff.md
  insuranceRiskScore        Float?    // 0–100 composite risk score (lower = better)
  insuranceRiskFactors      Json?     // InsuranceRiskFactor[] — array of scored factors
  insuranceRoadmap          Json?     // InsuranceRoadmapAction[] — sorted by ROI (annualSaving/costLow)
  insuranceRiskAssessedAt   DateTime? // when risk was last scored (30-day cache)
```

Also add these relations at the end of the UserAsset relations block:

```prisma
  energyReads         EnergyRead[]
  energyAnomalies     EnergyAnomaly[]
  solarAssessments    SolarAssessment[]
  planningApplications PlanningApplication[]
  valuations          AssetValuation[]
  tenants             Tenant[]
  leases              Lease[]
  rentReviewEvents    RentReviewEvent[]
  holdSellScenarios   HoldSellScenario[]
  sellEnquiries       SellEnquiry[]
```

---

## Section B — ScoutDeal field additions

Add these fields to the existing `model ScoutDeal` block, before `createdAt`:

```prisma
  // Pipeline tracking
  pipelineStage        String?   // "review" | "underwritten" | "offer_made" | "closed_won" | "closed_lost"
  pipelineUpdatedAt    DateTime?
  brochureDocId        String?   // uploaded OM/brochure Document id
  region               String?   // "se_uk" | "fl_us" — for benchmarks
```

Also add relations:

```prisma
  underwritings ScoutUnderwriting[]
  lois          ScoutLOI[]
  comparables   ScoutComparable[]
```

---

## Section C — TenderQuote field additions

Add these fields to the existing `model TenderQuote` block, before `createdAt`:

```prisma
  tenderToken   String?   @unique  // token for contractor to respond without session auth
  contractorId  String?            // FK to Contractor.id (no relation constraint — soft link)
```

---

## Section D — All 20 new models

Paste this entire block at the end of `schema.prisma`:

```prisma
// ─── WAVE 2: ENERGY ────────────────────────────────────────────────────────

model EnergyRead {
  id          String   @id @default(cuid())
  assetId     String
  userId      String
  periodStart DateTime
  periodEnd   DateTime
  kwh         Float
  cost        Float
  meterType   String   @default("sme")  // "hh" | "sme"
  invoiceRef  String?
  createdAt   DateTime @default(now())

  asset  UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user   User      @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@index([assetId])
}

model EnergyAnomaly {
  id                  String   @id @default(cuid())
  assetId             String
  userId              String
  energyReadId        String?
  type                String   // "consumption_spike" | "hh_drift" | "baseline_change"
  detectedAt          DateTime @default(now())
  estimatedAnnualCost Float?   // annual cost of anomaly (£/$)
  status              String   @default("open")  // "open" | "investigating" | "resolved"
  notes               String?

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@index([assetId, status])
}

model SolarAssessment {
  id                   String   @id @default(cuid())
  assetId              String
  userId               String
  yearlyEnergyDcKwh    Float    // annual solar generation potential (kWh)
  roofSegmentCount     Int?
  carbonOffsetKg       Float?
  installationSizeKw   Float?
  estimatedInstallCost Float?   // £/$
  paybackYears         Float?
  irr10yr              Float?   // 10-year IRR from calculateIRR()
  assessedAt           DateTime @default(now())

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@index([assetId])
}

model SolarQuoteRequest {
  id          String   @id @default(cuid())
  assetId     String
  userId      String
  assessmentId String?
  status      String   @default("requested")  // "requested" | "quoted" | "instructed" | "complete"
  createdAt   DateTime @default(now())

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId],  references: [id], onDelete: Cascade)
}


// ─── WAVE 2: TENANT INTELLIGENCE ───────────────────────────────────────────

model Tenant {
  id              String   @id @default(cuid())
  assetId         String
  userId          String
  name            String
  companyNumber   String?  // Companies House registration number
  covenantScore   Float?   // 0–100 from covenant check
  covenantCheckedAt DateTime?
  sector          String?  // "industrial" | "logistics" | "office" | "retail" | "food_bev" | "leisure"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  asset       UserAsset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user        User         @relation(fields: [userId],  references: [id], onDelete: Cascade)
  leases      Lease[]
  payments    TenantPayment[]
  engagements TenantEngagement[]

  @@index([assetId])
}

model Lease {
  id               String   @id @default(cuid())
  tenantId         String
  assetId          String
  userId           String
  documentId       String?  // source Document.id (lease PDF)
  leaseRef         String?  // synthetic or extracted reference
  leaseStart       DateTime?
  leaseExpiry      DateTime?
  annualRent       Float?
  sqft             Int?
  reviewClause     String?  // "upward_only_5yr" | "RPI_linked" | etc.
  breakClause      String?  // "2028-06-01" or "mutual_break_2027"
  insideAct1954    Boolean  @default(true)  // LTA 1954 security of tenure
  healthScore      Int?     // 0–100 composite score
  healthCheckedAt  DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  asset           UserAsset       @relation(fields: [assetId],  references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId],   references: [id], onDelete: Cascade)
  payments        TenantPayment[]
  engagements     TenantEngagement[]
  rentReviewEvents RentReviewEvent[]

  @@index([assetId])
  @@index([tenantId])
}

model TenantPayment {
  id          String   @id @default(cuid())
  tenantId    String
  leaseId     String
  userId      String
  amount      Float
  dueDate     DateTime
  paidDate    DateTime?
  status      String   @default("pending")  // "pending" | "paid" | "late" | "missed"
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lease  Lease  @relation(fields: [leaseId],  references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId],   references: [id], onDelete: Cascade)

  @@index([leaseId])
}

model TenantEngagement {
  id           String   @id @default(cuid())
  tenantId     String
  leaseId      String
  userId       String
  actionType   String   // "engage_renewal" | "serve_review" | "send_letter"
  letterDraft  String?  @db.Text  // Claude-generated letter markdown
  emailSentAt  DateTime?          // when sent to owner (owner reviews first)
  status       String   @default("draft")  // "draft" | "sent" | "responded" | "complete"
  createdAt    DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lease  Lease  @relation(fields: [leaseId],  references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId],   references: [id], onDelete: Cascade)

  @@index([leaseId])
}


// ─── WAVE 2: PLANNING INTELLIGENCE ─────────────────────────────────────────

model PlanningApplication {
  id              String   @id @default(cuid())
  assetId         String
  userId          String
  reference       String   // planning application reference number (upsert key)
  description     String   @db.Text
  applicant       String?
  applicationType String?  // "full" | "outline" | "permitted_dev" | "change_of_use" | "advertisement"
  status          String   @default("pending")  // "submitted" | "pending" | "approved" | "refused" | "withdrawn"
  receivedDate    DateTime?
  decisionDate    DateTime?
  impactLevel     String   @default("unknown")  // "positive" | "neutral" | "negative" | "unknown"
  impactRationale String?  // Claude Haiku classification rationale
  source          String   @default("planning_data_gov")  // "planning_data_gov" | "legacy_json"
  acked           Boolean  @default(false)  // owner acknowledged this application
  ackedAt         DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@unique([assetId, reference])
  @@index([assetId, impactLevel])
}


// ─── WAVE 2: AVM ────────────────────────────────────────────────────────────

model AssetValuation {
  id             String   @id @default(cuid())
  assetId        String
  userId         String
  avmValue       Float
  confidence     Float    // 0.0–1.0
  method         String   // "income_cap_only" | "psf_only" | "income_cap_blend"
  incomeCapValue Float?
  psfValue       Float?
  capRateUsed    Float?
  ervPsf         Float?
  compsCount     Int      @default(0)
  currency       String   @default("GBP")
  calculatedAt   DateTime @default(now())

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@index([assetId])
}


// ─── WAVE 2: RENT REVIEW ────────────────────────────────────────────────────

model RentReviewEvent {
  id          String   @id @default(cuid())
  leaseId     String
  assetId     String
  userId      String
  stage       String   // "18m_alert" | "12m_draft" | "6m_reminder" | "3m_urgent" | "letter_sent" | "complete"
  priority    String   @default("medium")  // "low" | "medium" | "high" | "critical"
  reviewDate  DateTime?  // target review date (from lease review clause)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  lease           Lease                  @relation(fields: [leaseId],  references: [id], onDelete: Cascade)
  asset           UserAsset              @relation(fields: [assetId],  references: [id], onDelete: Cascade)
  user            User                   @relation(fields: [userId],   references: [id], onDelete: Cascade)
  correspondence  RenewalCorrespondence[]

  @@index([leaseId])
  @@index([assetId, stage])
}

model RenewalCorrespondence {
  id              String   @id @default(cuid())
  rentReviewEventId String
  userId          String
  letterMarkdown  String   @db.Text  // Claude-generated letter
  proposedRent    Float?
  sentAt          DateTime?
  tenantResponseAt DateTime?
  agreedRent      Float?
  docuSignEnvelopeId String?  // DocuSign Heads of Terms envelope
  signingUrl      String?
  status          String   @default("draft")  // "draft" | "sent" | "agreed" | "complete"
  createdAt       DateTime @default(now())

  rentReviewEvent RentReviewEvent @relation(fields: [rentReviewEventId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([rentReviewEventId])
}


// ─── WAVE 2: HOLD VS SELL ───────────────────────────────────────────────────

model HoldSellScenario {
  id               String   @id @default(cuid())
  assetId          String
  userId           String
  holdIRR          Float?   // 10-year DCF IRR
  holdNPV          Float?   // NPV at 8% discount rate
  equityMultiple   Float?
  sellProceeds     Float?   // net after fees + CGT
  sellNPV          Float?   // immediate sell NPV
  recommendation   String?  // "strong_hold" | "hold" | "sell" | "needs_review"
  confidence       Float?   // 0.4–0.9
  userAssumptions  Json?    // { rentGrowthPct, exitYieldPct, annualCapexPct, holdPeriodYears, mortgageBalance, cgtRatePct }
  calculatedAt     DateTime @default(now())
  updatedAt        DateTime @updatedAt

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@index([assetId])
}

model SellEnquiry {
  id        String   @id @default(cuid())
  assetId   String
  userId    String
  notes     String?  @db.Text
  status    String   @default("open")  // "open" | "appraising" | "listed" | "sold" | "withdrawn"
  createdAt DateTime @default(now())

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId],  references: [id], onDelete: Cascade)
}


// ─── WAVE 2: SCOUT ──────────────────────────────────────────────────────────

model ScoutUnderwriting {
  id                String   @id @default(cuid())
  dealId            String
  userId            String
  askingPrice       Float?
  estimatedNOI      Float?
  estimatedCapRate  Float?
  occupancyRate     Float?   @default(0.95)
  ltvPct            Float?   @default(0.65)
  interestRatePct   Float?   @default(0.055)
  loanTermYears     Int?     @default(25)
  annualDebtService Float?
  dscr              Float?   // debt service coverage ratio
  equity            Float?   // required equity at LTV
  irr5yr            Float?   // 5-year IRR from calculateIRR()
  recommendation    String?  // "strong_buy" | "buy" | "pass" | "needs_review"
  region            String?  // "se_uk" | "fl_us"
  assetType         String?
  calculatedAt      DateTime @default(now())

  deal ScoutDeal @relation(fields: [dealId], references: [id], onDelete: Cascade)
  user User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([dealId])
}

model ScoutLOI {
  id             String   @id @default(cuid())
  dealId         String
  userId         String
  underwritingId String?  // linked ScoutUnderwriting
  offerPrice     Float
  depositAmount  Float
  draftMarkdown  String   @db.Text  // Claude-generated LOI
  status         String   @default("draft")  // "draft" | "sent" | "accepted" | "withdrawn"
  createdAt      DateTime @default(now())

  deal ScoutDeal @relation(fields: [dealId], references: [id], onDelete: Cascade)
  user User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([dealId])
}

model ScoutComparable {
  id            String   @id @default(cuid())
  dealId        String
  address       String
  sqft          Int?
  salePrice     Float?
  saleDate      String?  // YYYY-MM-DD
  pricePerSqft  Float?
  capRate       Float?
  source        String   @default("attom")  // "attom" | "land_registry" | "manual"
  fetchedAt     DateTime @default(now())

  deal ScoutDeal @relation(fields: [dealId], references: [id], onDelete: Cascade)

  @@index([dealId])
}


// ─── WAVE 2: WORK ORDERS ────────────────────────────────────────────────────

model Contractor {
  id          String   @id @default(cuid())
  name        String
  region      String   // "se_uk" | "fl_us"
  trades      String[] // ["HVAC", "Electrical", "Roofing", ...]
  email       String
  phone       String?
  rating      Float    @default(4.0)
  jobCount    Int      @default(0)
  verified    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([region])
}

model WorkOrderMilestone {
  id          String   @id @default(cuid())
  workOrderId String
  title       String
  description String?
  dueDate     DateTime?
  completedAt DateTime?
  status      String   @default("pending")  // "pending" | "in_progress" | "complete"
  createdAt   DateTime @default(now())

  workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)

  @@index([workOrderId])
}

model WorkOrderCompletion {
  id           String   @id @default(cuid())
  workOrderId  String   @unique
  contractorId String?
  finalCost    Float
  completionNotes String? @db.Text
  contractorRatingGiven Float?
  goCardlessPaymentId   String?
  completedAt  DateTime @default(now())

  workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
}
```

---

## UserAsset relations summary (final state after Wave 2)

After this migration, `model UserAsset` should have these relation fields (some already exist, new ones in **bold**):

```prisma
  user              User              @relation(...)
  sourceDocument    Document?         @relation(...)
  insuranceQuotes   InsuranceQuote[]
  energyQuotes      EnergyQuote[]
  commissions       Commission[]
  comparables       PropertyComparable[]
  workOrders        WorkOrder[]
  incomeActivations IncomeActivation[]
  // Wave 2 additions:
  energyReads         EnergyRead[]
  energyAnomalies     EnergyAnomaly[]
  solarAssessments    SolarAssessment[]
  planningApplications PlanningApplication[]
  valuations          AssetValuation[]
  tenants             Tenant[]
  leases              Lease[]
  rentReviewEvents    RentReviewEvent[]
  holdSellScenarios   HoldSellScenario[]
  sellEnquiries       SellEnquiry[]
```

---

## WorkOrder additions

After Wave 2 migration, `model WorkOrder` needs these new fields (add before `createdAt`):

```prisma
  aiScopeJson   Json?     // Claude-generated scope { scopeSummary, lineItems, totalEstimate, tradeRequired, urgency }
  tenderTokens  Json?     // { contractorId: token } map for tender distribution
  agreedPrice   Float?    // price agreed after bid selection
  contractorId  String?   // winning contractor (FK to Contractor.id — soft link)
  finalCost     Float?    // actual final cost on completion
```

Also add relation:

```prisma
  milestones    WorkOrderMilestone[]
  completion    WorkOrderCompletion?
```
