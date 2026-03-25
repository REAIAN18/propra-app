# RealHQ Wave 3 — Sprint 2 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html §7.4 (Compliance), §5.3 (Dashboard analytics), Addendum v3.1 §4
**Wave 3 triage:** `docs/wave-3-triage.md` — T3-17 (Compliance Certificate Tracking), T3-11 (Revenue vs NOI chart)
**Prerequisite:** Wave 3 Sprint 1 complete (PRO-650, PRO-651). Wave 2 testing gates passed (PRO-570, PRO-572, PRO-574, PRO-575).
**Target:** 2-week sprint, FSE + FE

---

## Sprint Goal

Replace the Wave 1 compliance JSON blob with a structured, per-certificate compliance model — making the `/compliance` page genuinely operational rather than illustrative. Simultaneously, lay the `MonthlyFinancial` data foundation so the Revenue vs NOI chart can render as soon as users have 3 months of history.

---

## Why these two, in Sprint 2

| Feature | Why Sprint 2 |
|---------|--------------|
| Compliance Certificate Tracking (T3-17) | The current `/compliance` page works from a `complianceItems[]` JSON blob — it cannot track per-certificate expiry dates, document attachments, or renewal workflow state. The Wave 2 `POST /api/user/compliance/renew` route is already wired to the FE but fires against an unstructured blob. A proper `ComplianceCertificate` model turns a cosmetic page into an operational tool. Unblocked. No dependency on Wave 2 testing. |
| MonthlyFinancial schema + Revenue chart (T3-11) | The Revenue vs NOI 12-month chart requires historical data that won't exist until 3 months after Wave 2 launch. Sprint 2 is the right time to build the schema and ingestion so data starts accruing immediately. The chart renders as soon as 3 months of data exist — likely Sprint 3 launch timing. |

---

## Feature 1: Compliance Certificate Tracking (T3-17)

### The problem with the current approach

The compliance page currently reads from `UserAsset.complianceItems` — a `Json?` field that holds an array of objects like `{ id, type, status, dueDate, fineExposure }`. This was correct for Wave 1 (fast to build, no schema overhead). It has three structural weaknesses:

1. **No document linkage.** You can't attach the actual certificate PDF to a compliance item stored in a JSON blob. There's no foreign key to `Document`.
2. **No renewal state machine.** A renewal request (from the Wave 2 `POST /api/user/compliance/renew` route) has nowhere to write its state — the blob can be updated but there's no proper audit trail.
3. **No cron renewal reminders.** A cron job can't efficiently query "which users have EPC certificates expiring in the next 90 days" from a JSON blob without a full table scan + JSON parse.

### New schema

```prisma
model ComplianceCertificate {
  id           String    @id @default(cuid())
  userId       String
  assetId      String
  type         String    // "epc" | "fire_risk" | "gas_safe" | "eicr" | "asbestos" | "legionella" | "insurance"
  status       String    @default("unknown") // "valid" | "expiring" | "expired" | "missing" | "renewal_requested"
  expiryDate   DateTime?
  issuedDate   DateTime?
  issuedBy     String?   // certifier/surveyor name
  referenceNo  String?
  documentId   String?   // FK to Document (optional — may not have upload yet)
  renewalNotes String?   // from POST /api/user/compliance/renew
  renewalRequestedAt DateTime?
  lastVerifiedAt DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  asset        UserAsset @relation(fields: [assetId], references: [id])
  user         User      @relation(fields: [userId], references: [id])
  document     Document? @relation(fields: [documentId], references: [id])
}
```

**Status transition model:**
```
unknown → [upload document] → valid
valid → [expiry date passes] → expiring (within 90 days) → expired
any → [renewal request] → renewal_requested → [new upload] → valid
```

**Certificate types per asset class (UK):**

> **FL/US assets:** Expected cert types differ by jurisdiction — see `docs/wave-3-sprint-2-fl-compliance-spec.md` for the FL cert type matrix and `getExpectedCertTypes()` implementation. Also includes the document classification prompt additions for FL cert types.

| Type | All assets | Industrial/Warehouse only | Annual | 5-year | 10-year |
|------|-----------|--------------------------|--------|--------|---------|
| EPC | ✓ | | | | ✓ (10yr) |
| Insurance certificate | ✓ | | ✓ | | |
| Fire risk assessment | ✓ | | | | ✓ (recommended annually review) |
| Gas Safe certificate | ✓ (if gas) | | ✓ | | |
| EICR | ✓ | | | ✓ | |
| Asbestos management | | ✓ | | | Review-based |
| Legionella risk | ✓ | | | ✓ | |

### New API routes

#### `GET /api/user/compliance`
Returns all `ComplianceCertificate` records for the user, grouped by asset.

```typescript
// Response
{
  assets: {
    assetId: string;
    assetName: string;
    certificates: {
      id: string;
      type: string;
      status: "valid" | "expiring" | "expired" | "missing" | "renewal_requested" | "unknown";
      expiryDate: string | null;
      daysToExpiry: number | null;
      documentId: string | null;
      renewalRequestedAt: string | null;
    }[];
    urgentCount: number;    // expired or expiring within 30 days
    missingCount: number;   // no record yet (type expected for this asset class)
  }[];
  totalUrgent: number;
  nextExpiry: string | null; // ISO date of soonest expiry
}
```

#### `PATCH /api/user/compliance/:certId`
Updates a certificate record — status, expiry date, issued-by, reference number.

```typescript
// Body (all optional)
{
  status?: "valid" | "expired" | "renewal_requested";
  expiryDate?: string;     // ISO date
  issuedDate?: string;     // ISO date
  issuedBy?: string;
  referenceNo?: string;
  documentId?: string;     // link to uploaded document
  renewalNotes?: string;
}
```

#### `POST /api/user/compliance/renew` (update existing Wave 2 route)
The Wave 2 renew route currently logs the renewal request but has nowhere to write structured state. After the schema migration:
- Look up or create the `ComplianceCertificate` record for the asset + certificate type
- Set `status = "renewal_requested"`, `renewalRequestedAt = now()`, `renewalNotes = notes`
- Return the updated certificate record

#### `POST /api/cron/compliance-reminders`
New cron job — runs weekly. Checks all certificates with `expiryDate` within 90, 60, or 30 days and sends email alert if not already alerted in that window.

```typescript
// Cron auth: X-Cron-Secret header (same pattern as existing crons)
// Sends email via Resend: "Certificate renewal reminder — [type] at [asset name] expires in N days"
// Deduplication: only alert once per (certId, daysWindow) — store sent flag
```

**Vercel Cron schedule:** weekly, Sunday 08:00 UTC (not daily — compliance windows are long enough that weekly alerts are appropriate).

### Document extraction integration

When a user uploads a document to `/documents`, the existing extraction pipeline (Claude-based) should attempt to classify it as a compliance certificate type. Add to `src/app/api/documents/parse-policy/route.ts` or a new `parse-compliance/route.ts`:

- If document classification returns `type: "epc"`, `"fire_risk"`, `"gas_safe"`, etc. — automatically create or update the corresponding `ComplianceCertificate` record
- Extract `expiryDate` from the document text (e.g. "Valid until 15 March 2028")
- Extract `issuedBy` if present
- Set `status = "valid"` (assuming a freshly uploaded certificate is valid unless expiry already passed)

**Classification prompt addition to document parser:**
```
Also determine if this document is a compliance certificate. If so, return:
{
  "isComplianceCert": true,
  "certType": "epc" | "fire_risk" | "gas_safe" | "eicr" | "asbestos" | "legionella" | "insurance",
  "expiryDate": "YYYY-MM-DD" (if found),
  "issuedDate": "YYYY-MM-DD" (if found),
  "issuedBy": string (if found),
  "referenceNo": string (if found)
}
If not a compliance certificate, return { "isComplianceCert": false }
```

### FE: Upgraded `/compliance` page

The current compliance page renders from the JSON blob. After this sprint:

1. **Data source change:** `GET /api/user/compliance` returns structured `ComplianceCertificate` records — replace the existing fallback logic with this primary source. Fall back to the JSON blob only if the new route returns no records (migration period).

2. **Per-certificate card layout:**
   - Certificate type badge (colour-coded by status)
   - Expiry date + days remaining
   - Document link (if `documentId` set) — opens document viewer
   - "Upload certificate" button (calls document upload → auto-creates/updates certificate record)
   - "Request renewal" button (calls `POST /api/user/compliance/renew`, transitions to `renewal_requested` state)
   - "Mark renewed" button (appears when `status = "renewal_requested"`) — opens mini-form to record new expiry date and optionally link a document

3. **Work Order CTA:** Add "Raise work order →" button for certificates where compliance failure typically requires a contractor (Gas Safe, EICR, Fire Risk). Pre-fills work order brief: `"Renew [certificate type] certificate at [asset name]"`.

4. **Missing certificates alert:** For each asset, compute expected certificates based on asset type. If `ComplianceCertificate` record doesn't exist for an expected type → show "No record" in amber with "Add →" CTA.

### Migration — backfilling from JSON blob

One-time migration script: `prisma/scripts/migrate-compliance-to-certs.ts`

```typescript
// For each UserAsset with non-null complianceItems JSON:
//   Parse complianceItems[].type, .status, .dueDate
//   Create ComplianceCertificate records for each item
//   Map: "insurance" → type: "insurance", "epc" → type: "epc", etc.
//   Set status from existing status field
//   Set expiryDate from dueDate
// Idempotent: use upsert on (assetId, type)
```

### Acceptance criteria

- [ ] `GET /api/user/compliance` returns `ComplianceCertificate` records for the requesting user's assets
- [ ] `PATCH /api/user/compliance/:certId` updates the certificate record and returns updated state
- [ ] `POST /api/user/compliance/renew` writes `status = "renewal_requested"` to the certificate record
- [ ] Document upload + parse: EPC/Gas Safe/EICR certificates are auto-classified and create `ComplianceCertificate` records
- [ ] `/compliance` page uses `GET /api/user/compliance` as primary data source
- [ ] Backfill migration creates `ComplianceCertificate` records from existing JSON blob data
- [ ] Cron: `POST /api/cron/compliance-reminders` sends Resend email for certificates expiring within 90 days
- [ ] "Raise work order →" CTA on Gas Safe / EICR / Fire Risk certificates pre-fills work order brief
- [ ] Missing certificates (expected but no record) shown as amber "No record" row per asset
- [ ] Status transitions correct: upload → valid; expiry passes → expiring → expired; renew request → renewal_requested; re-upload → valid

### Commission

None directly. Risk mitigation for clients — reduces legal liability exposure (EPC below E = lettings prohibition; no gas safe = criminal liability). Retention driver.

---

## Feature 2: MonthlyFinancial schema + Revenue vs NOI chart (T3-11)

### Why build the schema now

The Revenue vs NOI 12-month chart (Spec v3.2 §5.3 item 6) cannot render until users have 3+ months of transaction data. If we wait until users have the data before building the schema, we delay data accrual by one sprint. Building the schema in Sprint 2 means:

- Data starts accruing at Wave 3 Sprint 2 launch
- By Sprint 3 (4–6 weeks later), early users may have enough months for the chart to render
- The chart component can be built in Sprint 2, gated behind `hasMinData` (≥3 months)

### New schema

```prisma
model MonthlyFinancial {
  id              String    @id @default(cuid())
  userId          String
  assetId         String
  month           Int       // 1–12
  year            Int
  grossRevenue    Float     // sum of rent received + ancillary income
  operatingCosts  Float     // insurance + energy + work order costs for the month
  noi             Float     // grossRevenue - operatingCosts
  maintenanceCost Float     @default(0)  // from WorkOrder completions in month
  insuranceCost   Float     @default(0)  // from UserAsset.insurancePremium / 12
  energyCost      Float     @default(0)  // from UserAsset.energyCost / 12
  notes           String?
  source          String    @default("estimated") // "actual" | "estimated" | "extracted"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  asset           UserAsset @relation(fields: [assetId], references: [id])
  user            User      @relation(fields: [userId], references: [id])
  @@unique([assetId, month, year])
}
```

**Source field:**
- `"estimated"` — generated from current UserAsset financials (passingRent / 12, insurancePremium / 12, etc.)
- `"actual"` — recorded from a real transaction (GoCardless payment, manually confirmed)
- `"extracted"` — derived from uploaded bank statement or rent statement document

### Data ingestion paths

**Path 1: Estimated baseline (immediate)**
When a user signs up or adds an asset, generate estimated `MonthlyFinancial` records for the trailing 12 months using `passingRent / 12` as gross revenue, `(insurancePremium + energyCost) / 12` as opex, `netIncome / 12` as NOI. `source = "estimated"`.

```typescript
// POST /api/user/monthly-financial/estimate
// Body: { assetId: string }
// Creates 12 estimated monthly records for trailing 12 months
// Skips months that already have a record (idempotent)
```

**Path 2: Work Order completion (Sprint 2)**
When `POST /api/user/work-orders/:id/complete` fires, add the final job cost to `MonthlyFinancial.maintenanceCost` for the month/year of completion. Upsert on `(assetId, month, year)`.

**Path 3: Document extraction (future Sprint 3)**
When a rent statement or bank statement is uploaded, extract monthly rent income and reconcile against `MonthlyFinancial`. Upgrade `source` from `"estimated"` to `"extracted"` once real figures are confirmed.

### New API route

#### `GET /api/user/monthly-financial?months=12`
Returns the last N months of portfolio-level financial data, aggregated across all assets.

```typescript
// Response
{
  months: {
    month: number;
    year: number;
    label: string;    // "Jan 2026", "Feb 2026", etc.
    grossRevenue: number;
    noi: number;
    operatingCosts: number;
    hasRealData: boolean; // true if any asset has source = "actual" or "extracted"
  }[];
  hasMinData: boolean;   // true if ≥3 months of data exist
  dataQuality: "estimated" | "mixed" | "actual";
}
```

### FE: Revenue vs NOI Chart

**Location:** Third column of the analytics row (currently empty — the dashboard has Properties Grid + Portfolio Value Score + Occupancy Donut). Revenue chart occupies the third panel.

**Chart type:** Bar + line combo
- Bars (grey, width 60%): Gross Revenue per month
- Line (green `#0A8A4C`): NOI per month, dots on data points
- X-axis: last 12 months (abbreviated: "Jan", "Feb", etc.)
- Y-axis: currency (format with `fmt()` helper)
- Tooltip on hover: "Jan 2026 — Revenue: £X, NOI: £Y, Margin: Z%"

**Data quality gating:**
- If `hasMinData === false`: show placeholder card — "Revenue chart — Add 3 months of rent data to unlock" with grey chart outline
- If `dataQuality === "estimated"`: render chart with disclaimer badge "Based on estimated figures — upload rent statements to confirm"
- If `dataQuality === "actual"` or `"mixed"`: render chart without disclaimer

**No hardcoded or illustrative data.** If the chart can't render (no data), show the placeholder — do not show fake months.

### Acceptance criteria

- [ ] `MonthlyFinancial` model in schema with `@@unique([assetId, month, year])`
- [ ] `POST /api/user/monthly-financial/estimate` creates 12 estimated records for a given asset
- [ ] `GET /api/user/monthly-financial?months=12` returns portfolio-level aggregated monthly data
- [ ] Work order completion upserts `maintenanceCost` into the current month's `MonthlyFinancial` record
- [ ] Dashboard analytics row includes Revenue vs NOI chart panel
- [ ] Chart renders bar (revenue) + line (NOI) with correct data from the API
- [ ] `hasMinData === false` shows placeholder, not broken chart or zero-value chart
- [ ] `dataQuality === "estimated"` shows disclaimer badge
- [ ] X-axis labels are correct month/year abbreviations
- [ ] Chart does not render hardcoded or illustrative figures

---

## Schema additions summary

```prisma
// New models
model ComplianceCertificate { ... }  // replaces complianceItems[] JSON blob
model MonthlyFinancial       { ... }  // new time-series financial model

// No new fields on existing models
// UserAsset.complianceItems remains for migration period (deprecated, not removed)
```

Migration files:
- `prisma/migrations/20260324_wave3_compliance_certs/migration.sql`
- `prisma/migrations/20260324_wave3_monthly_financial/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| Compliance: schema + migration | 0.5 days | FSE | None |
| Compliance: 3 BE routes (GET, PATCH, renew update) | 1.5 days | FSE | Schema done |
| Compliance: cron reminders | 0.5 days | FSE | Schema done |
| Compliance: document parse → cert auto-create | 1 day | FSE | Schema done |
| Compliance: FE page upgrade | 2 days | FE | BE routes done |
| Compliance: backfill migration script | 0.5 days | FSE | Schema done |
| MonthlyFinancial: schema + estimate route | 0.5 days | FSE | None |
| MonthlyFinancial: GET route | 0.5 days | FSE | Schema done |
| MonthlyFinancial: work order completion upsert | 0.5 days | FSE | Schema done |
| MonthlyFinancial: dashboard chart component | 1.5 days | FE | BE route done |
| **Total** | **~9 days** | FSE + FE | — |

---

## What this sprint does NOT include

- GoCardless webhook → MonthlyFinancial actual revenue (Wave 3 Sprint 3 — needs Tenant Portal)
- Full CRREM carbon pathway chart (T3-12 — needs CRREM data licence)
- Monthly Cashflow P&L panel with budget comparison (T3-13 — needs MonthlyBudget model, CAM recovery data)
- CAM Recovery detection (T3-6 — needs full CAM schedule extraction)

---

## Data quality and trust

These two features directly affect data trust — a critical product concern.

**Compliance:** The current JSON blob can get out of sync with reality (a user uploads a new EPC but the blob still shows "due"). The new model with document linkage and status transitions eliminates this. A user who can see "EPC — valid until 2030 — Document attached ✓" trusts the product. A user who sees "EPC — due — Upload document" without a resolution path doesn't.

**Revenue chart:** Showing estimated figures as actual figures destroys trust when a client sees their "revenue" figure differs from their bank account. The `source` field and `dataQuality` gate are non-negotiable — the chart must be honest about what it knows.

---

*Sprint 2 target: 10 working days after Sprint 1 complete · Owner: FSE + FE · Approver: CEO*
