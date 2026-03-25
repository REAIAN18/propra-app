# RealHQ Wave 3 — Sprint 7 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html, Addendum v3.1, wave-3-triage.md
**Prerequisite:** Wave 3 Sprint 6 complete (CAM + Carbon live)
**Target:** 4-week sprint (FSE + FE + external API integrations)

---

## Sprint 7 Scope — Revenue Generation Features

Sprint 7 delivers two high-commission features that extend Wave 2 foundations into automated contract execution and application submission:

1. **5G/Solar Revenue Share Agreements (T3-9)** — Automated revenue share contract generation + application submission to telecoms/solar providers
2. **Planning Application Submission (T3-8)** — Submit planning applications via Planning Portal API (not just monitoring)

Both features move from "intelligence and recommendation" (Wave 2) to "execution and revenue" (Wave 3).

---

## Feature 1: 5G/Solar Revenue Share Agreements (T3-9)

### What it builds

Automated generation and submission of revenue share agreements for:

1. **5G mast installation** — CTIL (Cornerstone), EE, Vodafone, Three UK (rooftop/façade mast rental)
2. **Rooftop solar installation** — Google Solar API → installer quote → revenue share contract

**Wave 2 status:** Solar opportunity card (Google Solar API) and ROI assessment exist in Energy screen. Gap: contract generation and installer submission automation.

**Sprint 7:** Completes the workflow from "opportunity identified" → "contract signed" → "installation scheduled" → "commission earned."

### Revenue model

- **5G mast rental:** £5k–£15k/yr landlord income. **RealHQ commission:** 10% of Year 1 rental income (£500–£1,500 per installation).
- **Solar revenue share:** 15–25% of energy savings or Feed-in Tariff income. **RealHQ commission:** 5% of first-year solar income (~£200–£800 per installation depending on system size).

### Why now (Sprint 7)

Wave 2 Energy Intelligence identifies solar opportunity and calculates ROI. Sprint 7 adds the contract and submission layer.

5G mast opportunity assessment doesn't exist yet — Sprint 7 builds the full workflow (assessment → revenue share agreement → operator submission).

### New schema additions

```prisma
model RevenueShareOpportunity {
  id                  String    @id @default(cuid())
  assetId             String
  opportunityType     String    // "5g_mast" | "solar_pv" | "battery_storage"
  status              String    @default("identified")  // "identified" | "quote_requested" | "contract_drafted" | "signed" | "installation_scheduled" | "live" | "rejected"
  estimatedAnnualIncome Int     // pence, landlord's annual income
  estimatedPayback    Decimal?  @db.Decimal(5,2)  // years
  revenueSharePercent Decimal?  @db.Decimal(5,2)  // % of income to RealHQ (if applicable)
  providerName        String?   // e.g., "CTIL", "Octopus Energy Solar", "EDF Solar"
  providerApplicationId String? // external application/quote ID
  contractDocumentUrl String?   // S3 URL to signed contract
  installationDate    DateTime?
  commission          Commission?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  asset               UserAsset @relation(fields: [assetId], references: [id])
}

// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  roofCondition       String?   // "excellent" | "good" | "fair" | "poor" — affects solar feasibility
  roofMaterial        String?   // "flat_membrane" | "pitched_tile" | "metal" | "green_roof"
  roofArea            Decimal?  @db.Decimal(8,2)  // sqm
  heightAboveGround   Decimal?  @db.Decimal(6,2)  // metres (for 5G mast height requirement)
  revenueShareOpportunities RevenueShareOpportunity[]
}
```

### 5G mast opportunity assessment

**Eligibility criteria:**
- Building height ≥ 15m (5G requires elevated position for signal coverage)
- Roof access available
- Unobstructed view (no tall buildings blocking signal)
- Not in conservation area or listed building (planning restrictions)
- Landlord owns the freehold or has superior lease (can grant rights)

**API integration:** None for initial assessment (no public CTIL/EE API). Manual application submission via provider portals.

**Alternative approach (Sprint 7):** Email-based application. RealHQ drafts the site information pack → sends to provider → provider responds with rental offer.

```typescript
// src/lib/5g-assessment.ts

export async function assess5gMastFeasibility(asset: UserAsset) {
  const eligible = {
    heightOk: (asset.heightAboveGround || 0) >= 15,  // 15m+ for effective coverage
    roofAccessOk: asset.roofCondition !== "poor",
    planningOk: !asset.listedBuilding && !asset.conservationArea,
    ownershipOk: asset.tenureType === "freehold" || asset.leaseYearsRemaining > 20,
  };

  const allPass = Object.values(eligible).every(Boolean);

  if (!allPass) {
    return { feasible: false, reasons: buildRejectionReasons(eligible) };
  }

  // Estimate rental income (industry standard: £5k–£15k/yr depending on location and height)
  const estimatedRental = estimateMastRental(asset);

  return {
    feasible: true,
    estimatedAnnualIncome: estimatedRental,
    providers: ["CTIL", "Vodafone", "EE"],  // UK major operators
    nextSteps: "Submit site information pack to providers",
  };
}

function estimateMastRental(asset: UserAsset): number {
  const baseRental = 800000;  // £8,000/yr in pence
  const heightBonus = Math.max(0, (asset.heightAboveGround || 15) - 15) * 20000;  // +£200/m above 15m
  const urbanBonus = asset.location?.includes("London") ? 400000 : 0;  // +£4k for London
  return baseRental + heightBonus + urbanBonus;
}
```

### Revenue share agreement templates

#### Solar revenue share agreement (landlord ↔ RealHQ)

```
SOLAR REVENUE SHARE AGREEMENT

Between:
1. [Landlord Name] ("Landlord")
2. RealHQ Ltd ("RealHQ")

Property: [Address]

1. INSTALLATION
   RealHQ will procure installation of a [X]kWp solar PV system on the Property's rooftop at no upfront cost to the Landlord.

2. REVENUE SHARE
   The Landlord will receive [85]% of:
   - Energy bill savings (£/kWh reduction from grid import)
   - Export income (Smart Export Guarantee payments for surplus generation)

   RealHQ will receive [15]% as its share.

3. PAYMENTS
   Revenue share calculated quarterly. RealHQ will invoice the Landlord for RealHQ's share within 14 days of quarter-end.

4. TERM
   This agreement runs for [20] years from installation or until the Property is sold (whichever is earlier).

5. MAINTENANCE
   RealHQ is responsible for system maintenance and inverter replacement. Landlord grants roof access.

6. TERMINATION
   Either party may terminate with 90 days' notice after Year 5. If Landlord terminates, Landlord must buy out RealHQ's share at fair market value.

Signed: _______________  Date: _______________
```

**RealHQ commission model:** RealHQ doesn't take a % of landlord income directly. Instead:
- RealHQ earns a **£500–£1,500 placement fee** from the solar installer (standard solar broker commission)
- This is a one-time payment on installation completion
- Recorded as `Commission` with `category: "solar_placement"`

#### 5G mast revenue share agreement (landlord ↔ RealHQ)

```
5G MAST SITE AGREEMENT — INTERMEDIARY SHARE

Between:
1. [Landlord Name] ("Landlord")
2. RealHQ Ltd ("Intermediary")

Property: [Address]

1. MAST RENTAL
   The Landlord has entered into a Site Licence Agreement with [Operator Name] for installation of telecommunications equipment on the Property's rooftop.

   Annual rental: £[X] per annum, indexed by RPI.

2. INTERMEDIARY COMMISSION
   In consideration for RealHQ securing the mast rental agreement, the Landlord will pay RealHQ [10]% of the first year's rental income as a one-time commission.

   Commission amount: £[X * 0.10]

3. PAYMENT
   Payable within 30 days of the first rental payment being received by the Landlord from the Operator.

4. NO ONGOING SHARE
   This is a one-time commission. RealHQ has no ongoing claim to rental income in subsequent years.

Signed: _______________  Date: _______________
```

### Solar installer API integration

**Google Solar API** (Wave 2) provides ROI assessment. Sprint 7 adds installer quote automation.

**Installer partners:** Octopus Energy Solar, EDF Solar, British Gas Solar, Solarcentury (UK market leaders).

**No unified API:** Each installer has different quoting systems. Sprint 7 uses **email-based quote requests** rather than API integration.

**Workflow:**
1. RealHQ identifies solar opportunity (Google Solar API — existing)
2. User clicks "Request quotes →"
3. RealHQ sends site information pack to 3 installers via email
4. Installers respond with quotes (2–5 days)
5. RealHQ presents quotes in UI
6. User selects installer → RealHQ drafts revenue share agreement → DocuSign signature
7. Installer schedules installation → RealHQ earns placement fee on completion

### New API routes

#### `POST /api/user/revenue-share/assess-5g`
Assesses 5G mast feasibility for an asset.

```typescript
// Body: { assetId: string }
// Response:
{
  feasible: true,
  estimatedAnnualIncome: 1000000,  // £10,000/yr in pence
  providers: ["CTIL", "Vodafone", "EE"],
  nextSteps: "Submit site information pack"
}
```

#### `POST /api/user/revenue-share/request-5g-quotes`
Generates site information pack and emails to 5G operators.

```typescript
// Body: { assetId: string }
// Creates RevenueShareOpportunity record (type: "5g_mast", status: "quote_requested")
// Sends email to operators with site info (height, location, photos, landlord contact)
// Returns opportunityId
```

#### `POST /api/user/revenue-share/request-solar-quotes`
Sends solar site info pack to installer panel.

```typescript
// Body: { assetId: string }
// Creates RevenueShareOpportunity record (type: "solar_pv", status: "quote_requested")
// Sends email to 3 solar installers with Google Solar data + roof photos
// Returns opportunityId
```

#### `POST /api/user/revenue-share/:opportunityId/accept-quote`
Generates revenue share agreement and sends for DocuSign signature.

```typescript
// Body: { installerName: string, quoteAmount: number, revenueSharePercent: number }
// Generates revenue share agreement (solar or 5G template)
// Sends DocuSign envelope to landlord + RealHQ (2-party signature)
// Status → "contract_drafted"
```

#### `POST /api/user/revenue-share/:opportunityId/complete`
Marks installation complete and triggers commission.

```typescript
// Body: { installationDate: string, contractDocumentUrl: string }
// Creates Commission record (10% of Year 1 rental for 5G, £500–£1,500 placement fee for solar)
// Status → "live"
```

### FE: Revenue Share Opportunities

**Location:** Add "Revenue Share" tab to Energy screen (alongside Tariff, Anomalies, Solar, Carbon).

**Sections:**

1. **Opportunity Cards (top)**
   - Per-opportunity card: type (5G/Solar), property, estimated income, status badge
   - "Assess feasibility →" button for assets not yet assessed
   - "Request quotes →" button for feasible opportunities

2. **Active Contracts**
   - Table of signed revenue share agreements
   - Columns: Property, Type, Provider, Annual Income, Commission Earned, Status, Contract
   - "View contract →" downloads PDF

3. **5G Mast Feasibility Assessment Page (`/revenue-share/5g/:assetId`)**
   - Shows feasibility check results
   - If feasible: estimated rental income, provider list, "Request quotes →" CTA
   - If not feasible: rejection reasons (e.g., "Building height too low — 5G requires ≥15m")

4. **Solar Quote Comparison Page (`/revenue-share/solar/:opportunityId`)**
   - Shows 3 installer quotes side-by-side
   - Per-quote: installer name, system size (kWp), estimated annual savings, upfront cost, revenue share %, payback
   - "Accept quote →" button → triggers DocuSign revenue share agreement

### Acceptance criteria

- [ ] `POST /api/user/revenue-share/assess-5g` correctly assesses height, planning, ownership
- [ ] 5G rental estimate scales with building height and location (London premium)
- [ ] Site information pack email sent to CTIL/Vodafone/EE on quote request
- [ ] Solar quote request emails 3 installers with Google Solar data
- [ ] Revenue share agreement generated with correct % and terms
- [ ] DocuSign envelope sent for 2-party signature (landlord + RealHQ)
- [ ] Commission record created on installation completion
- [ ] Revenue Share tab renders on Energy screen
- [ ] Quote comparison page shows side-by-side installer quotes

---

## Feature 2: Planning Application Submission (T3-8)

### What it builds

Submit planning applications to Local Planning Authorities (LPAs) via Planning Portal API on behalf of property owners. Not just monitoring (Wave 2) — actual submission and fee payment.

**Application types in scope:**
1. **Change of use** (e.g., office → residential conversion under permitted development)
2. **Permitted development (PD) certificate** — confirms PD rights exist (no full planning permission required)
3. **Advertisement consent** — signage, hoardings
4. **Listed Building Consent** — alterations to listed buildings

**NOT in scope (too complex for Sprint 7):** Full planning permission applications (these require architect drawings, structural engineer reports, detailed design statements — too much human-in-loop).

### Revenue model

**RealHQ commission:** 15–20% of planning consultant equivalent fee.

Industry benchmark planning consultant fees:
- Change of use application: £1,500–£3,000
- PD certificate: £800–£1,200
- Advertisement consent: £600–£1,000
- Listed Building Consent: £2,000–£4,000

**RealHQ fee (15% model):**
- Change of use: £225–£450
- PD certificate: £120–£180
- Advertisement consent: £90–£150

**LPA statutory fees** (passed through to owner, not RealHQ revenue):
- Change of use: £206–£462 depending on floor area
- PD certificate: £100
- Advertisement consent: £132

### Why now (Sprint 7)

Wave 2 Planning Intelligence monitors nearby planning applications and classifies impact. Sprint 7 adds the submission capability.

**Critical dependency:** AI confidence threshold. Wave 2 planning monitoring has run for 6+ months (by Sprint 7), building training data on AI classification accuracy. Sprint 7 uses that data to validate whether AI can draft applications with <5% error rate.

**Human-in-loop safeguard:** All AI-drafted applications require owner review and approval before submission. RealHQ does NOT auto-submit without explicit owner confirmation.

### New schema additions

```prisma
model PlanningApplication {
  id                    String    @id @default(cuid())
  assetId               String
  applicationType       String    // "change_of_use" | "pd_certificate" | "advertisement_consent" | "listed_building_consent"
  status                String    @default("draft")  // "draft" | "owner_review" | "submitted" | "pending_lpa" | "approved" | "refused" | "withdrawn"
  proposedUse           String?   // e.g., "Residential (C3)" for change of use
  existingUse           String?
  statementOfNeed       String?   @db.Text  // AI-generated planning statement
  supportingDocuments   Json?     // array of S3 URLs (photos, plans, etc.)
  lpaName               String?   // Local Planning Authority
  lpaReferenceNo        String?   // LPA's application reference once submitted
  lpaPortalUrl          String?   // link to LPA planning portal page
  statutoryFee          Int?      // pence, LPA fee
  consultantFee         Int?      // pence, RealHQ fee
  submittedAt           DateTime?
  decidedAt             DateTime?
  decisionNotice        String?   @db.Text  // LPA decision text
  commission            Commission?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  asset                 UserAsset @relation(fields: [assetId], references: [id])
}

// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  planningApplications  PlanningApplication[]
}
```

### Planning Portal API integration

**UK Planning Portal:** https://www.planningportal.co.uk/ — national portal for submitting planning applications to all LPAs in England and Wales.

**API:** Planning Portal offers a commercial API for agents/consultants to submit applications programmatically. Requires:
- Business account with Planning Portal (£free, requires business verification)
- API key (issued to verified agents)
- Payment integration (Stripe/GoCardless for LPA fees)

**Sprint 7 implementation:**
1. RealHQ registers as agent with Planning Portal
2. Integrates Planning Portal API for submission
3. Passes through LPA statutory fees (no markup)
4. Charges RealHQ consultant fee separately (15% model)

### AI planning statement generation

**Example: Change of use (Office → Residential)**

```
You are a planning consultant drafting a change of use application. Generate a Planning Statement supporting the application.

Property: {address}
Existing use: {existingUse}
Proposed use: {proposedUse}
Local Plan policy: {localPlanPolicy} (fetched from LPA Local Plan)

Draft a Planning Statement (max 1,000 words) covering:
1. Site description and context
2. Proposed development (change of use details)
3. Planning policy compliance (cite relevant Local Plan policies and NPPF)
4. Justification for the change (housing need, economic benefits, sustainability)
5. Assessment of impacts (highways, amenity, design, heritage if applicable)
6. Conclusion

Use professional, formal tone. Cite National Planning Policy Framework (NPPF) paragraphs where relevant.

Return markdown.
```

### New API routes

#### `POST /api/user/planning/application`
Creates a planning application draft.

```typescript
// Body:
{
  assetId: string;
  applicationType: "change_of_use" | "pd_certificate" | "advertisement_consent" | "listed_building_consent";
  proposedUse?: string;
  existingUse?: string;
}

// AI generates planning statement
// Looks up LPA name from asset location
// Calculates statutory fee based on LPA fee schedule
// Creates PlanningApplication record (status: "draft")
```

#### `PATCH /api/user/planning/application/:id`
Updates application (owner can edit AI-generated statement).

#### `POST /api/user/planning/application/:id/submit`
Submits application to Planning Portal API.

```typescript
// Requires owner approval (status must be "owner_review" → "submitted")
// Sends to Planning Portal API
// Charges owner for LPA statutory fee + RealHQ consultant fee
// Updates status to "submitted", records lpaReferenceNo
// Creates Commission record
```

#### `GET /api/user/planning/application/:id/status`
Polls Planning Portal API for application status updates.

```typescript
// Returns: "pending_lpa" | "approved" | "refused" | "withdrawn"
// Updates PlanningApplication.status and decisionNotice when LPA decides
```

### Webhook: Planning Portal decision notifications

```typescript
// POST /api/webhooks/planning-portal
// Planning Portal sends webhook when LPA makes decision
// Updates PlanningApplication.status and decisionNotice
// Sends email to owner: "Your change of use application has been APPROVED"
```

### FE: Planning Application Workflow

**Location:** Add "Applications" tab to `/planning` screen (alongside "Nearby Applications" and "Development Potential").

**Sections:**

1. **Application List**
   - Table: Property, Type, Status, LPA Ref, Submitted Date, Decision
   - "New application →" button

2. **Application Creation Modal**
   - Step 1: Select property
   - Step 2: Select application type (4 options with descriptions)
   - Step 3: Input details (proposed use, existing use)
   - Step 4: "Generate draft →" → AI generates planning statement

3. **Application Review Page (`/planning/application/:id`)**
   - Shows AI-generated planning statement (editable textarea)
   - Supporting documents upload (photos, plans)
   - Fee breakdown: LPA statutory fee + RealHQ consultant fee
   - "Submit application →" button (requires owner confirmation modal)

4. **Application Tracking Page**
   - Shows LPA reference number + link to LPA planning portal
   - Status timeline: Submitted → Validated → Consultation → Decision
   - Decision notice (when decided)

### Safeguards and compliance

**Owner approval required:** RealHQ does NOT auto-submit applications. Every submission requires owner to click "Submit application →" after reviewing the AI-generated statement. Confirmation modal states:

> "By submitting this application, you confirm that the planning statement accurately represents your proposal. RealHQ is not a firm of planning consultants. We recommend professional review for complex applications."

**AI confidence threshold:** If AI-generated statement confidence score < 80%, show warning:

> "This application is complex. We recommend professional planning consultant review before submission."

**Liability disclaimer:** All application pages show footer:

> "RealHQ provides AI-assisted planning application drafting. We are not planning consultants. For complex applications, consult a chartered town planner (MRTPI)."

### Acceptance criteria

- [ ] `POST /api/user/planning/application` creates draft application and generates AI planning statement
- [ ] Planning statement cites relevant NPPF paragraphs and Local Plan policies
- [ ] LPA name and statutory fee looked up correctly from asset location
- [ ] `POST /api/user/planning/application/:id/submit` sends to Planning Portal API
- [ ] LPA reference number returned and stored on successful submission
- [ ] Commission record created (15% of consultant fee equivalent)
- [ ] Webhook processes Planning Portal decision notifications
- [ ] Applications tab renders on `/planning` screen
- [ ] Application review page shows editable AI statement
- [ ] Owner confirmation modal requires explicit approval before submission
- [ ] Decision notice displayed when LPA decides

---

## Schema additions summary

```prisma
// New models
model RevenueShareOpportunity { ... }
model PlanningApplication { ... }

// Fields added to existing models
// UserAsset: roofCondition, roofMaterial, roofArea, heightAboveGround, revenueShareOpportunities, planningApplications
```

Migration file: `prisma/migrations/20260324_wave3_sprint7/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| Revenue Share: schema + migration | 0.5 days | FSE | None |
| Revenue Share: 5G feasibility assessment | 1 day | FSE | Schema done |
| Revenue Share: Email quote request logic | 1 day | FSE | Assessment done |
| Revenue Share: Agreement templates | 1 day | FSE | None |
| Revenue Share: `/api/user/revenue-share/*` routes (5 routes) | 1.5 days | FSE | Templates done |
| Revenue Share: FE Revenue Share tab + pages | 2 days | FE | BE routes done |
| Planning: schema + migration | 0.5 days | FSE | None |
| Planning: AI planning statement generation | 1.5 days | FSE | Schema done |
| Planning: Planning Portal API integration | 2 days | FSE | Statement generation done |
| Planning: `/api/user/planning/application/*` routes (4 routes) | 1.5 days | FSE | API integration done |
| Planning: Webhook for decision notifications | 0.5 days | FSE | API integration done |
| Planning: FE Applications tab + workflow | 2.5 days | FE | BE routes done |
| Planning: Owner approval modal + disclaimers | 0.5 days | FE | Workflow done |
| **Total** | **~16 days (~4 weeks)** | FSE + FE | Sprints 1-6 complete |

---

## What this sprint does NOT include

- Full planning permission applications (require architect/engineer input — too complex)
- Section 106 agreements (developer contributions — niche, post-Sprint 7)
- Appeals process automation (planning refusal appeals — post-Sprint 7)
- Building Regulations approval (separate from planning — post-Sprint 7)
- Solar installer API integration (email-based quote requests only in Sprint 7)
- 5G operator API integration (manual application via email in Sprint 7)
- Battery storage revenue share (emerging market, post-Sprint 7)

---

## Revenue impact

| Feature | Revenue model | Est. per customer |
|---------|---------------|-------------------|
| 5G mast placement | 10% of Year 1 rental | £500–£1,500 per installation |
| Solar placement | £500–£1,500 placement fee from installer | £500–£1,500 per installation |
| Planning application submission | 15% of consultant fee equivalent | £90–£450 per application |

Sprint 7 is **revenue generation and automation** — moves from intelligence (Wave 2) to execution (Wave 3). High commission per transaction.

---

## External service requirements

**Required for Sprint 7:**
- Planning Portal business account + API key (free, requires business verification)
- DocuSign for revenue share agreements (already in use from Sprint 4)

**Optional (enhances but not blocking):**
- Google Solar API key (existing from Wave 2)
- Solar installer partnerships (Octopus Energy Solar, EDF Solar, British Gas Solar)

---

*Sprint 7 target: 4 weeks after Sprint 6 complete · Owner: FSE + FE · CEO approval required on Planning Portal business account registration + agent liability insurance*
