# RealHQ Wave 3 — Sprint 8 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html, Addendum v3.1, wave-3-triage.md
**Prerequisite:** Wave 3 Sprint 7 complete (5G/Solar + Planning live)
**Target:** 5-week sprint (FSE + FE + complex integrations + regulatory compliance)

---

## Sprint 8 Scope — Enterprise-Grade Features

Sprint 8 delivers three sophisticated features serving institutional landlords and acquisition-focused users:

1. **Project Intelligence (T3-2)** — Full construction project management with BCIS cost benchmarking
2. **Conveyancing Integration (T3-5)** — Automated property searches and HMLR form generation for acquisitions
3. **Refinance DIP (T3-7)** — Automated Decision in Principle submissions to lender panel (FCA-regulated)

These features are complex, require enterprise API integrations, and serve advanced use cases.

---

## Feature 1: Project Intelligence (T3-2)

### What it builds

Full construction project management platform embedded in RealHQ:

- **CapEx planning:** Multi-year capital expenditure forecasting per asset
- **Project budget vs actual:** Track project costs against budget with variance alerts
- **BCIS cost benchmarking:** Compare contractor quotes against BCIS (Building Cost Information Service) industry benchmarks
- **Programme tracking:** Gantt chart view of project timelines
- **Defects tracker:** Photo upload, status tracking, contractor response management
- **EPC improvement pathway:** Track EPC upgrades (e.g., C → B target) via capital works

**Revenue model:** No direct commission. This is a **retention and positioning feature** for institutional landlords managing multi-million-pound refurbishments.

### Why now (Sprint 8)

Requires Work Orders history (Wave 2) to be meaningful. By Sprint 8, users have 6–12 months of work order data, making project cost benchmarking and variance analysis useful.

**BCIS dependency:** BCIS API access requires enterprise subscription (~£3,000/yr) — needs CEO budget approval.

### New schema additions

```prisma
model CapexProject {
  id                  String    @id @default(cuid())
  assetId             String
  projectName         String
  projectType         String    // "refurbishment" | "fit_out" | "extension" | "epc_upgrade" | "conversion"
  status              String    @default("planning")  // "planning" | "budgeting" | "tendering" | "in_progress" | "snagging" | "complete"
  budgetTotal         Int       // pence
  actualSpend         Int       @default(0)  // pence
  variance            Int       @default(0)  // budget - actual
  variancePercent     Decimal?  @db.Decimal(5,2)
  startDate           DateTime?
  targetCompletionDate DateTime?
  actualCompletionDate DateTime?
  programme           Json?     // Gantt chart data: array of { task, start, end, status, dependencies }
  epcTargetRating     String?   // "A" | "B" | "C" — target EPC after works
  workOrders          WorkOrder[]  // linked work orders
  defects             ProjectDefect[]
  milestones          ProjectMilestone[]
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  asset               UserAsset @relation(fields: [assetId], references: [id])
}

model ProjectMilestone {
  id          String      @id @default(cuid())
  projectId   String
  name        String      // e.g., "Strip-out complete", "Mechanical & Electrical first fix"
  targetDate  DateTime
  completedAt DateTime?
  status      String      @default("pending")  // "pending" | "in_progress" | "complete" | "delayed"
  createdAt   DateTime    @default(now())
  project     CapexProject @relation(fields: [projectId], references: [id])
}

model ProjectDefect {
  id              String      @id @default(cuid())
  projectId       String
  description     String      @db.Text
  severity        String      // "critical" | "major" | "minor"
  status          String      @default("open")  // "open" | "acknowledged" | "fixed" | "closed"
  raisedBy        String?     // user or contractor
  assignedTo      String?     // contractor ID
  photoUrls       String[]    // S3 URLs
  raisedAt        DateTime    @default(now())
  fixedAt         DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  project         CapexProject @relation(fields: [projectId], references: [id])
}

model BcisCostBenchmark {
  id                String    @id @default(cuid())
  workType          String    // e.g., "roofing_replacement", "hvac_install", "office_fit_out"
  bcisMedianCostPsf Decimal   @db.Decimal(8,2)  // £/sqft from BCIS
  bcisLowerQuartile Decimal   @db.Decimal(8,2)
  bcisUpperQuartile Decimal   @db.Decimal(8,2)
  region            String    // "London", "South East", "Midlands", etc.
  dataYear          Int       // BCIS data vintage year
  createdAt         DateTime  @default(now())
}

// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  capexProjects  CapexProject[]
}

// Add to existing WorkOrder model:
model WorkOrder {
  // ... existing fields ...
  capexProjectId  String?
  capexProject    CapexProject?  @relation(fields: [capexProjectId], references: [id])
}
```

### BCIS API integration

**BCIS (Building Cost Information Service):** RICS-accredited cost data service. Provides median, upper/lower quartile construction costs per work type, indexed by region.

**API:** BCIS offers a REST API for subscribers. Requires:
- BCIS Enterprise subscription (£3,000/yr)
- API key

**Sprint 8 implementation:**
1. Subscribe to BCIS (CEO approval needed)
2. Integrate BCIS API to fetch cost benchmarks by work type + region
3. Cache benchmarks in `BcisCostBenchmark` table (refresh quarterly)
4. Compare contractor quotes against BCIS median ± 15% tolerance

```typescript
// src/lib/bcis-integration.ts

export async function fetchBcisCostBenchmark(workType: string, region: string) {
  const response = await fetch(`https://api.bcis.co.uk/v1/costs`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.BCIS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      work_type: workType,
      region: region,
      year: new Date().getFullYear(),
    }),
  });

  const data = await response.json();

  return {
    median: data.median_cost_psf,
    lowerQuartile: data.lower_quartile,
    upperQuartile: data.upper_quartile,
  };
}

export function compareToBcis(quoteCostPsf: number, bcisMedian: number) {
  const variance = ((quoteCostPsf - bcisMedian) / bcisMedian) * 100;

  let status: "competitive" | "above_market" | "below_market";
  if (variance <= -10) status = "below_market";  // >10% below median
  else if (variance >= 15) status = "above_market";  // >15% above median
  else status = "competitive";

  return { variance, status };
}
```

### Gantt chart data structure

**Programme tracking:** Stored as JSON array in `CapexProject.programme`:

```json
[
  {
    "task": "Strip-out and demolition",
    "start": "2026-04-01",
    "end": "2026-04-14",
    "status": "complete",
    "dependencies": []
  },
  {
    "task": "M&E first fix",
    "start": "2026-04-15",
    "end": "2026-05-12",
    "status": "in_progress",
    "dependencies": ["Strip-out and demolition"]
  },
  {
    "task": "Plastering and decoration",
    "start": "2026-05-13",
    "end": "2026-06-10",
    "status": "pending",
    "dependencies": ["M&E first fix"]
  }
]
```

**FE rendering:** Use `react-gantt-chart` or similar library to visualize timeline.

### New API routes

#### `POST /api/user/capex/project`
Creates a new CapEx project.

```typescript
// Body:
{
  assetId: string;
  projectName: string;
  projectType: string;
  budgetTotal: number;  // pence
  startDate?: string;
  targetCompletionDate?: string;
  epcTargetRating?: string;
}
```

#### `GET /api/user/capex/projects`
Returns all CapEx projects for the user's portfolio.

#### `PATCH /api/user/capex/project/:id`
Updates project (budget, status, actual spend).

#### `POST /api/user/capex/project/:id/milestone`
Adds a project milestone.

#### `PATCH /api/user/capex/project/:id/milestone/:milestoneId`
Marks milestone complete.

#### `POST /api/user/capex/project/:id/defect`
Raises a defect (with photo upload to S3).

#### `PATCH /api/user/capex/project/:id/defect/:defectId`
Updates defect status (acknowledged → fixed → closed).

#### `GET /api/user/capex/bcis-benchmark`
Fetches BCIS cost benchmark for a work type.

```typescript
// Query: ?workType=roofing_replacement&region=South+East
// Returns: { median: 125.50, lowerQuartile: 98.00, upperQuartile: 142.00 }
```

### FE: Project Intelligence Screen (`/projects`)

New top-level screen in main navigation (Platform section).

**Sections:**

1. **Project Overview Dashboard (top)**
   - KPI tiles: Total CapEx Budget (portfolio), Actual Spend YTD, Variance %, Projects In Progress
   - "New project →" button

2. **Project List**
   - Table: Project Name, Property, Type, Budget, Actual, Variance %, Status, Completion Date
   - Sortable by variance (worst first)
   - "View project →" link per row

3. **Project Detail Page (`/projects/:id`)**
   - **Header:** Project name, property, status badge, budget vs actual bar chart
   - **Tab 1: Programme**
     - Gantt chart showing project timeline
     - Milestone list with completion status
     - "Add milestone →" button
   - **Tab 2: Budget & Costs**
     - Budget breakdown table (line items from linked work orders)
     - BCIS benchmark comparison per work type
     - Variance alerts (work orders >15% above BCIS median flagged red)
   - **Tab 3: Defects**
     - Defects list with severity badges, photos, status
     - "Raise defect →" button (opens modal with photo upload)
   - **Tab 4: EPC Pathway** (if epcTargetRating set)
     - Current EPC rating vs target
     - Upgrade actions required (from EPC assessor recommendations)
     - Progress towards target (% complete based on work orders)

### Acceptance criteria

- [ ] `POST /api/user/capex/project` creates CapEx project record
- [ ] Linked work orders aggregate into project actual spend
- [ ] Variance calculated correctly (budget - actual)
- [ ] BCIS API integration fetches median, LQ, UQ costs per work type + region
- [ ] BCIS comparison flags work orders >15% above median as "above market"
- [ ] Gantt chart renders correctly with task dependencies
- [ ] Milestone completion updates project progress %
- [ ] Defect photo upload to S3 works
- [ ] EPC pathway tab shows current vs target rating
- [ ] Projects screen shows portfolio-level CapEx summary

---

## Feature 2: Conveyancing Integration (T3-5)

### What it builds

Automated property search ordering and HMLR (HM Land Registry) form generation for acquisition completions.

**Property searches ordered:**
- Local Authority Search (LLC1 + CON29)
- Water & Drainage Search
- Environmental Search (contamination, flood, radon)
- Land Registry Title (Official Copies of Title + Title Plan)
- Chancel Repair Liability Search
- Mining Search (if in coal mining area)

**HMLR forms generated:**
- **AP1** (Application to change the register) — used for transfers, charges
- **TR1** (Transfer of whole) — legal transfer deed
- **DS1** (Discharge of registered charge) — mortgage discharge

**Revenue model:** £40–£80 pass-through cost per search set (paid to SearchFlow/InfoTrack). **RealHQ commission:** 10–15% margin on search cost = £4–£12 per search set. Not a major revenue feature — this is **operational support for Scout acquisitions** (Transaction Room → Exchange → Completion).

### Why now (Sprint 8)

Primarily needed after Transaction Room (Sprint 3) is live. Scout acquisitions progress: Scout → Underwriting → LOI → Transaction Room → Searches → Exchange → HMLR submission → Completion.

By Sprint 8, early adopters have deals in Transaction Room approaching exchange — conveyancing automation becomes critical path.

### New schema additions

```prisma
model PropertySearch {
  id                  String    @id @default(cuid())
  transactionRoomId   String?   // linked to acquisition Transaction Room
  assetId             String?   // or standalone for existing asset
  searchProvider      String    // "SearchFlow" | "InfoTrack"
  searchReference     String?   // provider's reference ID
  searchType          String    // "local_authority" | "water" | "environmental" | "title" | "chancel" | "mining"
  status              String    @default("ordered")  // "ordered" | "processing" | "complete" | "failed"
  cost                Int       // pence
  resultPdfUrl        String?   // S3 URL to search result PDF
  orderedAt           DateTime  @default(now())
  completedAt         DateTime?
  commission          Commission?
  asset               UserAsset? @relation(fields: [assetId], references: [id])
  transactionRoom     TransactionRoom? @relation(fields: [transactionRoomId], references: [id])
}

model HmlrForm {
  id                  String    @id @default(cuid())
  transactionRoomId   String
  formType            String    // "AP1" | "TR1" | "DS1"
  formData            Json      // structured data for form fields
  generatedPdfUrl     String?   // S3 URL to completed form PDF
  submittedToHmlr     Boolean   @default(false)
  hmlrReference       String?   // HMLR application reference
  status              String    @default("draft")  // "draft" | "ready_to_submit" | "submitted" | "registered"
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  transactionRoom     TransactionRoom @relation(fields: [transactionRoomId], references: [id])
}

// Add to existing TransactionRoom model (Sprint 3):
model TransactionRoom {
  // ... existing fields ...
  propertySearches  PropertySearch[]
  hmlrForms         HmlrForm[]
}

// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  propertySearches  PropertySearch[]
}
```

### SearchFlow API integration

**SearchFlow:** UK's largest property search provider. Offers API for ordering searches programmatically.

**API:** https://api.searchflow.co.uk/

**Requires:**
- SearchFlow business account (free registration)
- API key
- Payment method on file (searches billed monthly)

**Sprint 8 implementation:**

```typescript
// src/lib/searchflow-integration.ts

export async function orderSearchSet(property: {
  address: string;
  postcode: string;
  titleNumber?: string;
}) {
  const response = await fetch(`https://api.searchflow.co.uk/v1/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SEARCHFLOW_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_address: property.address,
      postcode: property.postcode,
      title_number: property.titleNumber,
      searches: [
        "local_authority",  // LLC1 + CON29
        "water_drainage",
        "environmental",
        "land_registry_title",
        "chancel",
      ],
      delivery_format: "pdf",
      callback_url: `${process.env.APP_URL}/api/webhooks/searchflow`,
    }),
  });

  const data = await response.json();

  return {
    searchReference: data.order_reference,
    estimatedCost: data.total_cost,  // pence
    estimatedDelivery: data.delivery_days,  // typically 5-10 working days
  };
}
```

### HMLR form generation — TR1 example

**TR1 (Transfer of whole):** Legal deed transferring property ownership from seller to buyer.

**AI prompt for TR1 generation:**

```
You are a conveyancing solicitor. Generate a TR1 (Transfer of whole) form for the following transaction.

Property: {address}
Title Number: {titleNumber}
Seller: {sellerName}, {sellerAddress}
Buyer: {buyerName}, {buyerAddress}
Consideration: £{purchasePrice}
Transfer date: {completionDate}

Complete all standard TR1 panels:
- Panel 1: Stamp Duty
- Panel 2: Property description
- Panel 3: Date
- Panel 4: Transferor (seller)
- Panel 5: Transferee (buyer)
- Panel 6: Consideration (purchase price)
- Panel 7: Transferee's intended address for service
- Panel 8: Declaration of trust (if applicable — not applicable for single buyer)
- Panel 9: Additional provisions (if any)
- Panel 10: Execution (signature blocks)

Return JSON with field values for each panel.
```

**Form rendering:** Use PDF generation (Puppeteer, similar to brochure/NDA) to render TR1 as official HMLR-compliant PDF.

### New API routes

#### `POST /api/user/conveyancing/search`
Orders a property search set.

```typescript
// Body:
{
  transactionRoomId?: string;
  assetId?: string;
  searches: ["local_authority", "water_drainage", "environmental", "title", "chancel"];
}

// Calls SearchFlow API
// Creates PropertySearch records (one per search type)
// Returns searchReference and estimated cost
```

#### `GET /api/user/conveyancing/search/:id`
Returns search status and result PDF (when complete).

#### `POST /api/user/conveyancing/hmlr-form`
Generates HMLR form (AP1, TR1, or DS1).

```typescript
// Body:
{
  transactionRoomId: string;
  formType: "AP1" | "TR1" | "DS1";
  formData: {
    sellerName: string;
    buyerName: string;
    purchasePrice: number;
    completionDate: string;
    // ... other form-specific fields
  };
}

// AI generates form data
// Renders PDF via Puppeteer
// Creates HmlrForm record
```

#### `POST /api/user/conveyancing/hmlr-form/:id/submit`
Submits HMLR form to Land Registry (via HMLR portal integration or manual submission).

**Note:** HMLR doesn't offer a public API for form submission. Sprint 8 implementation generates the PDF for manual upload to HMLR portal. Post-Sprint 8 enhancement: HMLR Business Gateway API (requires solicitor account).

### Webhook: SearchFlow completion notifications

```typescript
// POST /api/webhooks/searchflow
// SearchFlow sends webhook when search set is complete
// Downloads result PDFs, stores in S3
// Updates PropertySearch.status to "complete", sets resultPdfUrl
// Sends email to owner: "Property searches complete for [address]"
```

### FE: Conveyancing Tab (Transaction Room)

**Location:** Add "Conveyancing" tab to Transaction Room detail page (`/transactions/:id`).

**Sections:**

1. **Property Searches**
   - Table: Search Type, Provider, Status, Cost, Result
   - "Order searches →" button (opens search selection modal)
   - Per-search row: status badge, "Download result →" link (when complete)

2. **HMLR Forms**
   - List of generated forms: TR1, AP1, DS1
   - "Generate form →" button (opens form type selector)
   - Per-form: form type, status, "Download PDF →", "Submit to HMLR →"

3. **Search Selection Modal**
   - Checkboxes for each search type (Local Authority, Water, Environmental, Title, Chancel, Mining)
   - Cost estimate shown (£40–£80 total)
   - "Order searches →" button → calls SearchFlow API

4. **HMLR Form Generator Modal**
   - Step 1: Select form type (TR1, AP1, DS1)
   - Step 2: Input transaction details (seller, buyer, price, completion date)
   - Step 3: "Generate form →" → AI generates PDF
   - Step 4: Review PDF, "Download →" or "Submit to HMLR →"

### Acceptance criteria

- [ ] `POST /api/user/conveyancing/search` calls SearchFlow API and creates PropertySearch records
- [ ] SearchFlow webhook updates PropertySearch status on completion
- [ ] Search result PDFs downloaded and stored in S3
- [ ] `POST /api/user/conveyancing/hmlr-form` generates TR1/AP1/DS1 PDF
- [ ] HMLR forms comply with HM Land Registry format requirements
- [ ] Conveyancing tab renders in Transaction Room
- [ ] Search selection modal shows cost estimate
- [ ] HMLR form generator modal collects transaction details and generates PDF
- [ ] Commission recorded for search orders (10% margin on search cost)

---

## Feature 3: Refinance DIP (T3-7)

### What it builds

Automated Decision in Principle (DIP) submissions to lender panel for commercial mortgage refinancing.

**Workflow:**
1. User clicks "Refinance →" on asset page
2. RealHQ pre-fills application from existing property data (valuation, rent, EPC, insurance)
3. User reviews and confirms
4. RealHQ submits DIP to lender panel (5–10 lenders)
5. Lenders respond with indicative rate, LTV, term (typically within 48 hours)
6. User selects preferred lender → proceeds to full application (manual, outside RealHQ for now)
7. RealHQ earns procuration fee (~0.5–1% of loan value) on completion

**Revenue model:** **0.5–1% of loan value.** For a £2M refinance, RealHQ earns £10k–£20k. **This is the highest-commission feature in the entire product.**

**FCA regulatory status:** **This is a regulated activity.** Mortgage brokerage requires FCA authorisation or appointed representative (AR) status under a principal FCA-authorised firm.

**Sprint 8 scope:** Build the DIP submission workflow. **CEO must secure FCA authorisation or AR agreement before this feature goes live.**

### Why now (Sprint 8)

The `/refinance` page and SOFR/SONIA rate display already exist (Wave 1). The gap is lender panel API integration and DIP automation.

**Prerequisite:** Wave 2 AVM provides accurate property valuations. Sprint 8 uses that valuation as "estimated property value" in DIP applications.

### Lender panel integration

**UK commercial lenders with API/automated DIP:**
- Barclays Business Banking
- NatWest Business Banking
- Shawbrook Bank
- Octopus Real Estate
- Investec

**US commercial lenders:**
- Wells Fargo Commercial Banking
- JPMorgan Chase
- KeyBank
- PNC Bank

**API availability:** Most lenders do NOT offer public APIs for DIP submission. Sprint 8 uses **email-based DIP** (similar to Solar installer quotes in Sprint 7):
1. RealHQ generates structured DIP application (PDF)
2. Emails to lender panel
3. Lenders respond via email with indicative terms
4. RealHQ parses responses and presents in UI

**Post-Sprint 8 enhancement:** Direct API integration with lenders that offer it (requires individual lender partnerships).

### New schema additions

```prisma
model RefinanceApplication {
  id                    String    @id @default(cuid())
  assetId               String
  applicantName         String
  applicantCompanyNo    String?   // Companies House number
  loanAmount            Int       // pence
  loanPurpose           String    // "refinance" | "acquisition" | "development"
  propertyValue         Int       // pence (from AVM)
  ltv                   Decimal   @db.Decimal(5,2)  // loan-to-value %
  annualRent            Int?      // pence (for investment properties)
  epcRating             String?
  status                String    @default("draft")  // "draft" | "submitted" | "quotes_received" | "accepted" | "rejected"
  submittedAt           DateTime?
  lenderQuotes          LenderQuote[]
  selectedQuoteId       String?
  commission            Commission?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  asset                 UserAsset @relation(fields: [assetId], references: [id])
}

model LenderQuote {
  id                    String    @id @default(cuid())
  applicationId         String
  lenderName            String    // "Barclays", "NatWest", etc.
  indicativeRate        Decimal   @db.Decimal(5,2)  // % APR
  loanAmount            Int       // pence (may differ from requested if lender offers less)
  ltv                   Decimal   @db.Decimal(5,2)
  term                  Int       // months
  arrangementFee        Int?      // pence
  status                String    @default("pending")  // "pending" | "accepted" | "declined"
  validUntil            DateTime?
  quotePdfUrl           String?   // S3 URL to lender's quote PDF
  receivedAt            DateTime  @default(now())
  application           RefinanceApplication @relation(fields: [applicationId], references: [id])
}

// Add to existing UserAsset model:
model UserAsset {
  // ... existing fields ...
  refinanceApplications  RefinanceApplication[]
}
```

### DIP application PDF generation

**Structured DIP application sent to lenders:**

```
DECISION IN PRINCIPLE APPLICATION

Applicant Details:
- Name: [Company Name]
- Companies House No: [Number]
- Contact: [Email, Phone]

Property Details:
- Address: [Full address]
- Property type: [Office / Industrial / Retail]
- Estimated value: £[AVM value]
- EPC rating: [Rating]
- Tenure: [Freehold / Leasehold]
- Current tenancy: [Occupied / Vacant]
- Annual rent (if let): £[Rent]

Loan Request:
- Loan amount: £[Amount]
- LTV: [%]
- Loan purpose: [Refinance / Acquisition / Development]
- Preferred term: [Years]

Supporting Documents:
- Property valuation report (attached)
- Rental income statement (attached)
- Applicant accounts (attached)

Decision in principle requested by: [Date]
```

### New API routes

#### `POST /api/user/refinance/application`
Creates refinance application.

```typescript
// Body:
{
  assetId: string;
  applicantName: string;
  applicantCompanyNo?: string;
  loanAmount: number;  // pence
  loanPurpose: string;
}

// Pre-fills propertyValue from AVM
// Calculates LTV
// Creates RefinanceApplication record (status: "draft")
```

#### `POST /api/user/refinance/application/:id/submit`
Submits DIP to lender panel.

```typescript
// Generates DIP application PDF
// Emails to lender panel (5-10 lenders)
// Updates status to "submitted"
```

#### `POST /api/user/refinance/application/:id/quote`
Records a lender quote (manual entry or webhook from lender API).

```typescript
// Body:
{
  lenderName: string;
  indicativeRate: number;
  loanAmount: number;
  ltv: number;
  term: number;
  arrangementFee?: number;
}

// Creates LenderQuote record
```

#### `POST /api/user/refinance/application/:id/accept-quote`
Accepts a lender quote (proceeds to full application — outside RealHQ for now).

```typescript
// Body: { quoteId: string }
// Updates RefinanceApplication.selectedQuoteId
// Status → "accepted"
// Sends introduction email to lender with applicant contact details
// Creates Commission record (0.5-1% of loan value, status: "pending" — only confirmed on completion)
```

### FE: Refinance Workflow

**Location:** Enhance existing `/refinance` page (Wave 1) with DIP submission workflow.

**Current state (Wave 1):** Static SOFR/SONIA rate display.

**Sprint 8 additions:**

1. **Refinance Calculator (top section)**
   - Inputs: Loan amount, Term (years), LTV %
   - Shows: Estimated monthly payment at current SONIA +250bps
   - "Request lender quotes →" CTA

2. **Active Applications**
   - Table: Property, Loan Amount, LTV, Status, Quotes Received, Action
   - "New application →" button

3. **Application Detail Page (`/refinance/application/:id`)**
   - **Section 1: Application Summary**
     - Property, Loan amount, LTV, Status
   - **Section 2: Lender Quotes**
     - Table: Lender, Rate, Loan Amount, LTV, Term, Arrangement Fee, Action
     - Sortable by rate (lowest first)
     - "Accept quote →" button per row
   - **Section 3: Next Steps**
     - Once quote accepted: "Your lender introduction has been sent. [Lender] will contact you to proceed with full application."

### FCA compliance and disclaimers

**Every refinance page must show:**

> "RealHQ is [an appointed representative of / authorised by] the Financial Conduct Authority for mortgage brokerage. FCA Register No: [XXX]. Lender quotes are indicative only and subject to credit assessment. Your property may be repossessed if you do not keep up repayments on your mortgage."

**Pre-submission disclaimer modal:**

> "By submitting this Decision in Principle request, you authorise RealHQ to share your property and financial details with our lender panel. Lenders will perform soft credit checks. This will not affect your credit score. You are under no obligation to proceed with any quote received."

**Commission disclosure:**

> "RealHQ will earn a procuration fee of [0.5–1]% of the loan value if you proceed to completion with a lender introduced by RealHQ. This fee is paid by the lender and does not affect your loan rate."

### Acceptance criteria

- [ ] `POST /api/user/refinance/application` creates application with pre-filled AVM value
- [ ] DIP PDF generated with property, applicant, and loan details
- [ ] DIP submission emails lender panel
- [ ] Lender quotes recorded via `POST /api/user/refinance/application/:id/quote`
- [ ] Quote comparison table shows lowest rate first
- [ ] "Accept quote" creates Commission record (pending until completion)
- [ ] FCA disclaimer shown on all refinance pages
- [ ] Pre-submission disclaimer modal requires user confirmation
- [ ] Refinance workflow accessible from asset page "Refinance →" button

---

## Schema additions summary

```prisma
// New models
model CapexProject { ... }
model ProjectMilestone { ... }
model ProjectDefect { ... }
model BcisCostBenchmark { ... }
model PropertySearch { ... }
model HmlrForm { ... }
model RefinanceApplication { ... }
model LenderQuote { ... }

// Relations/fields added to existing models
// UserAsset: capexProjects, propertySearches, refinanceApplications
// WorkOrder: capexProjectId, capexProject
// TransactionRoom: propertySearches, hmlrForms
```

Migration file: `prisma/migrations/20260324_wave3_sprint8/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| Project Intelligence: schema + migration | 0.5 days | FSE | None |
| Project Intelligence: BCIS API integration | 2 days | FSE | BCIS subscription approved |
| Project Intelligence: `/api/user/capex/*` routes (7 routes) | 2 days | FSE | Schema done |
| Project Intelligence: FE Projects screen + Gantt | 3 days | FE | BE routes done |
| Conveyancing: schema + migration | 0.5 days | FSE | None |
| Conveyancing: SearchFlow API integration | 1.5 days | FSE | SearchFlow account created |
| Conveyancing: HMLR form generation (TR1/AP1/DS1) | 2 days | FSE | Schema done |
| Conveyancing: `/api/user/conveyancing/*` routes (4 routes) | 1.5 days | FSE | API integration done |
| Conveyancing: FE Conveyancing tab (Transaction Room) | 2 days | FE | BE routes done |
| Refinance: schema + migration | 0.5 days | FSE | None |
| Refinance: DIP PDF generation | 1 day | FSE | Schema done |
| Refinance: `/api/user/refinance/*` routes (4 routes) | 1.5 days | FSE | PDF generation done |
| Refinance: FE Refinance workflow + quote comparison | 2 days | FE | BE routes done |
| Refinance: FCA compliance disclaimers | 0.5 days | FE | Legal review |
| **Total** | **~20 days (~5 weeks)** | FSE + FE | Sprints 1-7 complete |

---

## What this sprint does NOT include

- **BCIS live API sync** (uses cached quarterly data in Sprint 8)
- **HMLR Business Gateway API** (manual form upload to HMLR portal in Sprint 8)
- **Full mortgage application processing** (DIP only — full application is outside RealHQ)
- **Lender direct API integration** (email-based quotes in Sprint 8)
- **Construction project approval workflow** (multi-party sign-off for large CapEx)
- **Defect dispute resolution** (contractor challenges defect claim)

---

## External service requirements

**Required for Sprint 8:**
- BCIS Enterprise subscription (£3,000/yr) — CEO approval needed
- SearchFlow business account + API key (free registration, pay-per-search)
- **FCA authorisation or AR status** for Refinance DIP — CEO must secure this before Refinance feature goes live

**Optional (enhances but not blocking):**
- HMLR Business Gateway account (solicitor-only, for direct form submission)
- Lender partnerships for direct API integration (Barclays, NatWest, Shawbrook)

---

## Revenue impact

| Feature | Revenue model | Est. per transaction |
|---------|---------------|---------------------|
| Project Intelligence | No direct revenue — retention feature | Institutional landlord retention value |
| Conveyancing | 10% margin on search cost | £4–£12 per search set |
| Refinance DIP | 0.5–1% of loan value | £10k–£20k per £2M refinance |

Sprint 8 is **enterprise-grade infrastructure + highest-commission feature (Refinance)**. Refinance alone can generate £10k–£20k per transaction.

---

*Sprint 8 target: 5 weeks after Sprint 7 complete · Owner: FSE + FE · CEO approval CRITICAL for BCIS subscription + FCA authorisation (Refinance)*
