# Wave 2 — Work Orders Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-22
**Status:** Ready to build
**Revenue:** 3% of job value on completion (via Commission record)
**Sources:** RealHQ-Spec-v3.2 Section 6, wave-2-commission-model.md

---

## Overview

Wave 1 Work Orders covers: create a draft, attach a scope of works, send to tender, receive quotes, award to a contractor. The status pipeline is built: `draft → tendered → quotes_received → awarded → in_progress → complete`.

Wave 2 adds:

1. **AI scope generation** — generate a structured scope of works from a one-line description using Claude
2. **Managed contractor panel** — seeded network by region + trade type, with ratings and history
3. **Job progress tracking** — milestone updates (photos/notes) while `in_progress`
4. **Completion sign-off** — invoice upload + evidence photos; triggers payment and commission
5. **GoCardless payment** — DD payment to contractor on completion
6. **Commission trigger** — 3% of job value → `Commission` record on mark-complete
7. **Contractor rating** — post-completion rating updates contractor panel record

---

## What's already built (Wave 1)

- `WorkOrder` model: draft, tendered, quotes_received, awarded, in_progress, complete
- `TenderQuote` model: contractorName, price, warranty, timeline, rating, notes, awarded
- `GET/POST /api/user/work-orders` — list and create
- `POST /api/user/work-orders/:id/tender` — send to tender
- `GET/POST /api/user/work-orders/:id/quotes` — list and add quotes
- `POST /api/user/work-orders/:id/award` — award to contractor, set status to `awarded`
- Work orders page — full pipeline UI with benchmark comparison, quote table, tender flow

---

## What needs to be built (Wave 2)

---

## 1. Prisma schema additions

### `Contractor` — managed contractor panel

```prisma
model Contractor {
  id               String   @id @default(cuid())
  name             String
  tradingName      String?
  email            String?
  phone            String?
  region           String   // "se_uk" | "midlands" | "north_uk" | "fl_us" | "tx_us" | "ca_us"
  tradeTypes       String[] // ["HVAC", "ELECTRICAL", "PLUMBING", "ROOFING", ...]
  tenderCategories String[] // ["MAINTENANCE", "COMPLIANCE", "CAPITAL_WORKS", "GREEN_ESG"]
  accreditations   String[] // ["Gas Safe", "NICEIC", "REFCOM", "NAPIT", "CHAS", ...]
  insuranceCoverage Float?   // £ PL insurance limit
  companyRegNo     String?  // Companies House / EIN
  averageRating    Float    @default(0)
  completedJobs    Int      @default(0)
  currency         String   @default("GBP")
  status           String   @default("active") // "active" | "paused" | "removed"
  notes            String?  @db.Text
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  quotes       TenderQuote[]
  completions  WorkOrderCompletion[]
}
```

Add `contractorId String?` and `contractor Contractor? @relation(...)` to `TenderQuote`.

### `WorkOrderMilestone` — job progress tracking

```prisma
model WorkOrderMilestone {
  id           String   @id @default(cuid())
  workOrderId  String
  userId       String
  type         String   // "started" | "update" | "issue" | "complete"
  note         String   @db.Text
  photoUrls    String[] // S3 keys
  reportedAt   DateTime @default(now())

  workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add `milestones WorkOrderMilestone[]` to `WorkOrder` and `User`.

### `WorkOrderCompletion` — sign-off record

```prisma
model WorkOrderCompletion {
  id             String   @id @default(cuid())
  workOrderId    String   @unique
  contractorId   String?
  invoiceDocId   String?  // FK to Document
  finalCost      Float
  evidenceUrls   String[] // S3 keys for completion photos
  clientRating   Float?   // 1–5 star rating by owner-operator
  clientNote     String?  @db.Text
  commissionId   String?  // FK to Commission record
  paymentRef     String?  // GoCardless payment ID
  paymentStatus  String   @default("pending") // "pending" | "processing" | "paid" | "failed"
  completedAt    DateTime @default(now())
  createdAt      DateTime @default(now())

  workOrder    WorkOrder    @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  contractor   Contractor?  @relation(fields: [contractorId], references: [id], onDelete: SetNull)
}
```

Add `completion WorkOrderCompletion?` to `WorkOrder`.

### Schema additions to existing models

```prisma
// WorkOrder — add:
  contractorId    String?  // awarded contractor FK (resolves from TenderQuote.contractorId)
  finalCost       Float?   // set on completion
  completionId    String?

// TenderQuote — add:
  contractorId    String?  // FK to Contractor if from panel
  contractor      Contractor? @relation(...)
```

---

## 2. New API routes

### `POST /api/user/work-orders/:id/scope`

Generate a structured scope of works from a plain description using Claude.

```ts
// Body: { description: string; jobType: string; assetType?: string; sqft?: number }
// Response: { scopeOfWorks: string }
```

**Claude prompt:**

```
You are a commercial property works manager. Generate a formal scope of works for the following job.

Job type: {jobType}
Description: {description}
Asset type: {assetType ?? "commercial property"}
{sqft ? `Floor area: ${sqft.toLocaleString()} sqft` : ""}

Write a structured scope of works suitable for tendering to contractors. Include:
1. Works description (what is to be done)
2. Standards and specifications (relevant UK/US standards)
3. Access requirements
4. Health & safety considerations
5. Completion criteria (how the client will judge completion)
6. Warranty expectation (minimum)

Professional tone. Maximum 400 words. No prices or timelines — those come from contractors.
```

This endpoint saves the result directly to `workOrder.scopeOfWorks` if the work order is in `draft` status, then returns it.

### `GET /api/user/contractors`

Returns the contractor panel filtered by region and/or trade type.

```ts
// Query: ?region=se_uk&tradeType=HVAC&category=MAINTENANCE
// Response: { contractors: Contractor[] }
```

Uses `region` from the user's assets or explicit query param. Does not expose PII to client — email/phone only returned if the contractor has been awarded a job by this user.

### `POST /api/user/work-orders/:id/tender` (update — add contractor panel distribution)

Existing route: sends tender notification (currently a no-op). **Wave 2 enhancement:**

When tendered, query `Contractor` panel for matching `region` + `tradeTypes` overlap with `tenderCategory`. For each matched contractor (up to 5):
1. Send email via Resend: `lib/email.ts` `sendContractorTenderInvite(contractor, workOrder)`
2. Optionally create a pre-populated `TenderQuote` record with `contractorId` set and `price = null` (pending response)

Email template includes: job type, asset postcode/area, scope of works summary, deadline to submit quote, a one-click link to submit a quote (token-authenticated URL).

### `GET /api/tender/respond/:token` + `POST /api/tender/respond/:token`

Public (no auth) contractor quote submission endpoint. Token encodes `{ workOrderId, contractorId }` signed with `TENDER_SECRET`.

```ts
// GET: returns job summary for contractor to review
// POST body: { price: number; warranty?: string; timeline?: string; notes?: string }
// Creates TenderQuote, updates WorkOrder status to "quotes_received" if first quote
```

### `POST /api/user/work-orders/:id/start`

Moves status from `awarded` → `in_progress`. Records a `WorkOrderMilestone` of type `started`.

```ts
// Body: { note?: string }
// Response: { order: WorkOrder }
```

### `POST /api/user/work-orders/:id/milestone`

Adds a progress update while `in_progress`. Accepts text note + optional photo uploads.

```ts
// Body: multipart/form-data
//   note: string
//   type: "update" | "issue"
//   photos?: File[]  (up to 5)
// Process:
//   1. Upload photos to S3 at work-orders/{orderId}/milestones/{uuid}.*
//   2. Create WorkOrderMilestone record
// Response: { milestone: WorkOrderMilestone }
```

### `POST /api/user/work-orders/:id/complete`

The central completion endpoint. Moves status `in_progress` → `complete`.

```ts
// Body: multipart/form-data
//   finalCost: number         (actual invoiced cost — may differ from quoted)
//   invoicePdf?: File         (contractor invoice)
//   photos?: File[]           (completion evidence, up to 10)
//   clientRating?: number     (1–5)
//   clientNote?: string

// Process (in transaction):
// 1. Upload invoice + photos to S3
// 2. Create Document record for invoice (type = "work_order_invoice")
// 3. Create WorkOrderCompletion record
// 4. Update WorkOrder: status = "complete", finalCost = finalCost
// 5. Create Commission record:
//      category = "work_order"
//      sourceId = workOrder.id
//      commissionRate = 0.03
//      commissionValue = finalCost * 0.03
//      status = "confirmed"
// 6. If clientRating set and contractor found:
//      update Contractor.averageRating (rolling average), Contractor.completedJobs++
// 7. If GoCardless configured: initiate DD payment for finalCost to contractor

// Response: { order: WorkOrder; commission: Commission }
```

### `GET /api/user/work-orders/:id/milestones`

Returns all milestones for a work order (progress timeline).

```ts
// Response: { milestones: WorkOrderMilestone[] }
```

---

## 3. Commission model

`Commission` category for work orders: `"work_order"`. Rate: **3%** of `finalCost`.

```ts
// Created by /complete endpoint:
await prisma.commission.create({
  data: {
    userId,
    assetId: order.assetId,
    category: "work_order",
    sourceId: order.id,
    annualSaving: 0,            // not applicable for one-time job
    commissionRate: 0.03,
    commissionValue: finalCost * 0.03,
    status: "confirmed",
    placedAt: new Date(),
  },
});
```

**Note:** `annualSaving = 0` for work orders — this is a transaction fee, not a recurring saving. The commission dashboard (if built in Wave 3) should handle both types.

---

## 4. Contractor panel seed data

Seed file: `prisma/seeds/contractors.ts`

Seeded with 10–15 contractors per target region, covering all `tenderCategories`. Used in development and for the demo environment. Production: contractors self-register or are added by the RealHQ team.

```ts
const SE_UK_CONTRACTORS = [
  {
    name: "Apex FM Ltd",
    region: "se_uk",
    tradeTypes: ["HVAC", "MECHANICAL"],
    tenderCategories: ["MAINTENANCE", "COMPLIANCE"],
    accreditations: ["Gas Safe", "REFCOM", "CHAS"],
    insuranceCoverage: 5_000_000,
    averageRating: 4.7,
    completedJobs: 84,
  },
  {
    name: "Greenfield Electrical",
    region: "se_uk",
    tradeTypes: ["ELECTRICAL"],
    tenderCategories: ["MAINTENANCE", "COMPLIANCE", "CAPITAL_WORKS"],
    accreditations: ["NICEIC", "NAPIT"],
    insuranceCoverage: 2_000_000,
    averageRating: 4.9,
    completedJobs: 127,
  },
  {
    name: "Southern Roofing Group",
    region: "se_uk",
    tradeTypes: ["ROOFING", "WATERPROOFING"],
    tenderCategories: ["CAPITAL_WORKS", "MAINTENANCE"],
    accreditations: ["NFRC", "CHAS"],
    insuranceCoverage: 10_000_000,
    averageRating: 4.6,
    completedJobs: 41,
  },
  {
    name: "EcoWorks Ltd",
    region: "se_uk",
    tradeTypes: ["SOLAR", "EV_CHARGING", "INSULATION"],
    tenderCategories: ["GREEN_ESG", "CAPITAL_WORKS"],
    accreditations: ["MCS", "RECC", "NAPIT"],
    insuranceCoverage: 5_000_000,
    averageRating: 4.8,
    completedJobs: 63,
  },
  // … + 4 more SE UK, plus 5 FL US contractors
];
```

Florida (US) equivalents: HVAC (AHRI certified), Electrical (FL licensed), Roofing (FL contractor license), Solar (NABCEP).

---

## 5. GoCardless payment integration

**When:** On `POST /api/user/work-orders/:id/complete`, if `GOCARDLESS_ACCESS_TOKEN` is in env.

**Flow:**
1. Look up contractor's bank details (stored on `Contractor.bankDetails` — encrypted, added at onboarding)
2. Create a GoCardless payment: `POST /payments` with `amount` (in pence), `currency`, `description: "Work Order ${id}: ${jobType}"`
3. Store `paymentRef` in `WorkOrderCompletion.paymentRef`
4. Set `paymentStatus = "processing"`
5. Webhook `POST /api/webhooks/gocardless` handles `payment_paid_out` event → update to `"paid"`

**Wave 2 scope:** Build the payment creation call and webhook handler. Contractor bank detail capture is Wave 3 (requires contractor onboarding portal).

**Wave 2 fallback (no GoCardless key):** Skip payment, set `paymentStatus = "pending"`, completion still records commission.

---

## 6. Email templates (Resend)

### `sendContractorTenderInvite(contractor, workOrder)`

Subject: `New tender opportunity: ${workOrder.jobType} — ${assetAreaName}`

Body:
```
Hi ${contractor.name},

RealHQ has a new tender opportunity matching your trade profile.

Job type:      ${workOrder.jobType}
Location:      ${assetPostcode} area
Category:      ${workOrder.tenderCategory}
Scope summary: ${scopeOfWorks.substring(0, 200)}…

Deadline to submit quote: ${deadlineDate} (3 working days from now)

[Submit your quote →] https://app.realhq.co.uk/tender/respond/${token}

This invitation was sent because your profile matches this job type and region.
To opt out of future invitations, reply to this email.
```

### `sendWorkOrderComplete(userId, workOrder, commission)`

Notifies the owner-operator on completion. Includes job summary, final cost vs benchmark, commission confirmation.

---

## 7. UI changes to Work Orders page

### 7a. Scope generation button

On new work order form, after `description` field:
- **[Generate scope →]** button calls `POST /api/user/work-orders/:id/scope` or (for new orders not yet saved) calls the endpoint with a temporary payload
- Show loading state "Generating scope…" (2–4 seconds)
- Populate `scopeOfWorks` textarea with the generated text, which the user can edit

### 7b. Expanded order panel — progress timeline

When `status = "in_progress"`, show a vertical timeline of `WorkOrderMilestone` records below the order details. Each milestone shows: type badge, note, timestamp, and thumbnail photos.

**Add milestone button:** Opens a form with note + photo upload. Fires `POST /api/user/work-orders/:id/milestone`.

### 7c. Completion flow

When `status = "in_progress"`, show a **Complete job** CTA button. Opens a modal:

```
┌────────────────────────────────────────────────────────────┐
│ Mark Job Complete                                           │
│                                                             │
│ Final cost:   [_______________]  (quoted: £2,400)           │
│ Invoice:      [Upload PDF]                                  │
│ Photos:       [Upload up to 10 photos]                      │
│                                                             │
│ Rate contractor: ★★★★☆                                      │
│ Note: [_______________]                                     │
│                                                             │
│                    [Confirm completion]                     │
│                                                             │
│ Commission: 3% of final cost. £72 will be invoiced          │
│ by RealHQ on completion.                                    │
└────────────────────────────────────────────────────────────┘
```

On confirm: `POST /api/user/work-orders/:id/complete`. On success, show a green confirmation card with commission amount.

### 7d. Contractor panel tab

New tab on Work Orders page: **Contractors**.

Shows the regional contractor panel in a table:
- Name, trade types, accreditations, avg rating (stars), completed jobs, status badge
- Filter by trade type + category
- Source from `GET /api/user/contractors`

Allows user to browse available contractors before creating a work order. In Wave 3, users can add preferred contractors directly.

### 7e. Work Order status — in_progress enhancement

Currently `in_progress` shows a static amber badge. Wave 2 enhancement: show days elapsed since `awarded` date, and milestone count (e.g. "Day 12 · 3 updates").

---

## 8. Prisma summary — additions

```prisma
// New models:
Contractor
WorkOrderMilestone
WorkOrderCompletion

// Updates to WorkOrder:
  contractorId  String?
  finalCost     Float?
  milestones    WorkOrderMilestone[]
  completion    WorkOrderCompletion?

// Updates to TenderQuote:
  contractorId  String?
  contractor    Contractor? @relation(...)

// Updates to Commission:
  // category field: add "work_order" as valid value
```

---

## 9. Environment variables needed

| Variable | Feature | Urgency |
|----------|---------|---------|
| `GOCARDLESS_ACCESS_TOKEN` | Contractor payment on completion | Medium — fallback skips payment |
| `GOCARDLESS_WEBHOOK_SECRET` | Payment status webhook | Medium |
| `TENDER_SECRET` | Sign contractor quote-response tokens | **High** — needed before tendering live |
| `RESEND_API_KEY` | Email to contractors | Already needed for other flows |

---

## 10. Acceptance criteria

- [ ] `POST /api/user/work-orders/:id/scope` with a one-line description returns a structured scope of works in <6 seconds. Result is saved to `workOrder.scopeOfWorks`.
- [ ] Work Orders page "Generate scope" button populates the scope textarea without navigating away. User can edit before saving.
- [ ] `GET /api/user/contractors` returns seeded contractors filtered by region. Email/phone not exposed for non-awarded contractors.
- [ ] `POST /api/user/work-orders/:id/tender` (enhanced) emails matched contractors from the panel using Resend. Token-authenticated quote URL generated and included in email.
- [ ] `POST /api/tender/respond/:token` allows a contractor to submit a quote without a user account. Creates `TenderQuote` linked to `contractorId`. Moves order to `quotes_received`.
- [ ] `POST /api/user/work-orders/:id/start` moves `awarded → in_progress` and creates a `started` milestone.
- [ ] `POST /api/user/work-orders/:id/milestone` accepts note + up to 5 photos, stores photos in S3, creates `WorkOrderMilestone`. Returns milestone with `photoUrls`.
- [ ] `POST /api/user/work-orders/:id/complete` creates `WorkOrderCompletion`, sets `WorkOrder.status = "complete"`, creates `Commission` record with `category = "work_order"`, `commissionRate = 0.03`, `commissionValue = finalCost * 0.03`.
- [ ] Commission is only created once per work order. Duplicate calls to `/complete` on an already-complete order return 400.
- [ ] If `clientRating` provided: `Contractor.averageRating` updated (rolling average), `Contractor.completedJobs` incremented.
- [ ] Completion modal in UI shows commission amount (3% of final cost) before user confirms, so there are no surprises.
- [ ] Work Orders page Contractors tab renders seeded contractors filtered by user's asset region.

---

## 11. Build order

1. **Prisma migration** — `Contractor`, `WorkOrderMilestone`, `WorkOrderCompletion` + field additions
2. **Contractor seed data** — `prisma/seeds/contractors.ts` for SE UK + FL US
3. **Scope generation** — `POST /scope` + Claude integration + "Generate scope" button in UI
4. **`GET /api/user/contractors`** + Contractors tab in Work Orders page
5. **Tender panel distribution** — update `/tender` route to email matched contractors, generate tokens
6. **`POST /api/tender/respond/:token`** — public contractor quote submission
7. **Start + milestone routes** — `/start`, `/milestone` + progress timeline in UI
8. **Completion route** — `/complete` + Commission creation + completion modal in UI
9. **GoCardless payment** — payment creation + webhook handler (if `GOCARDLESS_ACCESS_TOKEN` set)
10. **Contractor rating update** — on completion, roll average rating on `Contractor` record
