# RealHQ Wave 3 — Sprint 4 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html §10 (Tenant Portal), §11 (Legal Automation), Addendum v3.1 §8
**Wave 3 triage:** `docs/wave-3-triage.md` — T3-3 (Tenant Portal), T3-4 (Legal Document Automation)
**Prerequisite:** Wave 3 Sprint 3 complete. Wave 2 tenant intelligence testing passed (PRO-572).
**Target:** 4-week sprint (Tenant Portal is larger scope), FSE + FE + separate subdomain/auth work

---

## Product Decisions — Finalized

Sprint 4 can proceed with the following finalized technical decisions.

### Decision 1: Payment processor — GoCardless only

**Options:**

| Option | Best for | UK support | US support | Fee | Setup complexity |
|--------|----------|-----------|-----------|-----|-----------------|
| **GoCardless** | UK bank transfer (ACH/BACS) recurring rent | ✅ Native | 🟡 US via ACH, limited | 1.15% + £0.20 | Low — designed for recurring payments |
| **Stripe** | Card + bank, global, best DX | ✅ | ✅ | 1.4% + 20p (EU cards), 2.9% + 30¢ (US) | Medium — requires Stripe Connect for multi-user |
| **Both** | Route UK rent to GoCardless, US to Stripe | ✅ | ✅ | Per above | High |

**Final decision:** Sprint 4 will use **GoCardless only**. Rationale:
1. The first Tenant Portal users will be SE UK industrial/logistics — GoCardless is native there
2. GoCardless is simpler to integrate (no complex auth flow for card storage)
3. US rent payments via Stripe can be added in Sprint 5 when FL user base grows
4. GoCardless `GOCARDLESS_ACCESS_TOKEN` is already in the optional env var list — board awareness exists

Stripe integration deferred to Sprint 5.

### Decision 2: Tenant Portal URL — `/portal` subdirectory

**Options:**

| Option | URL | Pros | Cons |
|--------|-----|------|------|
| **Separate subdomain** | `portal.realhq.co` | Clean UX, separate Vercel project, no auth bleed | Needs DNS setup, second Vercel deploy |
| **Subdirectory** | `realhq.co/portal` | Single deploy, shared auth, simpler ops | Route conflicts with owner app possible |
| **Separate domain** | `tenants.realhq.co` | Brand-distinct | Same as subdomain, no real advantage |

**Final decision:** Sprint 4 will use **subdirectory** (`/portal`) architecture. Rationale:
1. Zero additional DNS / Vercel setup — ships faster
2. Can move to subdomain in Sprint 5 once tenant auth patterns are proven
3. Tenants access via magic link (no account) — they never see the owner's dashboard, just their own portal section

Migration to `portal.realhq.co` subdomain deferred to Sprint 5 if UX benefits warrant the migration effort.

---

## Feature 1: Tenant Portal (T3-3)

### What it builds

A tenant-facing section of RealHQ at `/portal` (or `portal.realhq.co`). Tenants receive a magic link when their landlord invites them. They can:
- View their lease summary (rent, expiry, break clauses)
- Pay rent via GoCardless bank debit
- Submit maintenance requests (→ auto-creates work order)
- Access their documents (lease PDF, rent statements)
- Communicate with their landlord (simple message thread)

Tenant data is already materialised (Wave 2 `Tenant`/`Lease` models). This sprint surfaces it to the tenant directly.

### Tenant authentication — magic link

Tenants do not create passwords. They receive a magic link email that logs them into their portal session. Links expire after 24 hours.

**Flow:**
1. Owner clicks "Invite tenant" on tenants page (calls `POST /api/user/tenants/:leaseId/portal-invite`)
2. RealHQ sends magic link email to tenant's email address (from `Tenant.email`)
3. Tenant clicks link → session created → redirected to `/portal/[tenantToken]`
4. Portal shows their lease, rent due, maintenance history

**No new user accounts.** Tenants are not `User` records. They are `Tenant` records with an email. Portal session is a short-lived JWT stored in a cookie, scoped to `tenantId`.

### New schema additions

```prisma
// Add to existing Tenant model:
model Tenant {
  // ... existing fields ...
  email                String?
  portalEnabled        Boolean  @default(false)
  portalInvitedAt      DateTime?
  maintenanceRequests  MaintenanceRequest[]
  rentPayments         RentPayment[]
  messages             TenantMessage[]
}

model MaintenanceRequest {
  id          String    @id @default(cuid())
  tenantId    String
  assetId     String
  description String
  urgency     String    @default("routine") // "urgent" | "routine" | "low"
  status      String    @default("open")   // "open" | "in_progress" | "complete"
  workOrderId String?   // FK to WorkOrder once created
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
}

model RentPayment {
  id               String    @id @default(cuid())
  tenantId         String
  leaseId          String
  amountPence      Int       // pence/cents to avoid float precision issues
  currency         String    @default("GBP")
  periodStart      DateTime
  periodEnd        DateTime
  dueDate          DateTime
  status           String    @default("pending") // "pending" | "processing" | "paid" | "failed" | "overdue"
  gocardlessId     String?   // GoCardless payment/mandate ID
  paidAt           DateTime?
  createdAt        DateTime  @default(now())
  tenant           Tenant    @relation(fields: [tenantId], references: [id])
}

model TenantMessage {
  id          String   @id @default(cuid())
  tenantId    String
  fromTenant  Boolean  @default(true) // true = tenant sent, false = landlord sent
  body        String
  readAt      DateTime?
  createdAt   DateTime @default(now())
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
}
```

### New API routes

#### `POST /api/user/tenants/:leaseId/portal-invite`
Sends a magic link invite to the tenant.

```typescript
// Requires: Tenant.email to be set
// Creates a signed JWT with { tenantId, leaseId, exp: +24h }
// Sends email via Resend: "Your RealHQ tenant portal is ready"
// Sets Tenant.portalEnabled = true, portalInvitedAt = now()
```

#### `GET /api/portal/[token]` (tenant-facing, no owner auth)
Validates portal token, returns tenant + lease data for the portal session.

```typescript
// Returns:
{
  tenant: { name, email, leaseId },
  lease: { property, rent, expiry, breakDate, leaseType },
  nextRentDue: RentPayment | null,
  recentMaintenance: MaintenanceRequest[],
  documents: { name, url }[], // lease PDF + rent statements
}
```

#### `POST /api/portal/[token]/maintenance`
Tenant submits a maintenance request.

```typescript
// Body: { description: string, urgency: "urgent" | "routine" | "low" }
// Creates MaintenanceRequest record
// If urgency === "urgent": sends Resend alert to landlord immediately
// Background: auto-creates a draft WorkOrder for the landlord to review
```

#### `POST /api/portal/[token]/payment/setup`
Sets up a GoCardless Direct Debit mandate for rent payment.

```typescript
// Calls GoCardless /mandates API
// Creates redirect flow: tenant redirected to GoCardless to authorise mandate
// On return: mandate created, stored as gocardlessId on RentPayment
```

**GoCardless integration pattern:**

```typescript
// src/lib/gocardless.ts
import GoCardless from 'gocardless-nodejs';

const client = new GoCardless(process.env.GOCARDLESS_ACCESS_TOKEN, {
  environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
});

export async function createRedirectFlow(tenantName: string, returnUrl: string) {
  return client.redirectFlows.create({
    description: 'RealHQ Rent Payment',
    session_token: crypto.randomUUID(),
    success_redirect_url: returnUrl,
    prefilled_customer: { given_name: tenantName },
  });
}

export async function completeMandate(redirectFlowId: string, sessionToken: string) {
  return client.redirectFlows.complete(redirectFlowId, {
    session_token: sessionToken,
  });
}

export async function createPayment(mandateId: string, amountPence: number, currency: string, description: string) {
  return client.payments.create({
    amount: amountPence,
    currency,
    description,
    links: { mandate: mandateId },
  });
}
```

#### `GET /api/portal/[token]/payment/callback`
GoCardless redirect returns here. Completes the mandate setup.

#### `POST /api/portal/[token]/messages`
Tenant sends a message to landlord.

#### `GET /api/portal/[token]/messages`
Returns message thread between tenant and landlord.

#### `POST /api/user/tenants/:leaseId/messages` (owner-side)
Owner replies to tenant message.

### Webhook: GoCardless payment events

```typescript
// POST /api/webhooks/gocardless
// Processes: payment_paid, payment_failed, mandate_cancelled
// Updates RentPayment.status on payment_paid → "paid", paidAt = now()
// Sends email to tenant on payment_failed: "Rent payment failed — please retry"
// Sends email to landlord on payment_paid: "Rent received — £X from [tenant]"
```

### FE: Tenant Portal pages

**`/portal` (root — tenant authentication)**
- Shows a "Your portal link has expired" message for invalid/expired tokens
- Redirects valid tokens to `/portal/dashboard`

**`/portal/dashboard`**
- Tenant name + property address
- Rent card: next payment amount, due date, "Pay rent" / "Set up direct debit" CTA
- Lease summary: expiry date, break option, rent review date
- Recent messages (latest 3) + "View all →" link
- Maintenance shortcut: "Report an issue →"

**`/portal/lease`**
- Full lease terms (type, sqft, use class, permitted use, restrictions)
- Lease document download (if uploaded by landlord)
- Rent schedule (increases, review dates)

**`/portal/maintenance`**
- Maintenance request form (description textarea + urgency selector)
- History of past requests with status badges

**`/portal/messages`**
- Simple message thread UI (like a chat, not email)
- Text input at bottom, message bubbles above
- Landlord messages shown on left; tenant messages on right

**`/portal/payments`**
- Payment history table (amount, period, status, paid date)
- "Set up direct debit" CTA if no mandate
- "View statement" — generates a simple rent statement PDF

### Owner-side additions

**Tenants page:** Add "Invite to portal →" button per tenant row (visible when `Tenant.email` is set). Shows "Portal active" badge when `portalEnabled = true`.

**Work Orders:** When a `MaintenanceRequest` is created from the portal with `urgency === "urgent"`, a draft work order is auto-created and appears in the work orders list with a "From tenant request" badge.

**Messages:** Add a "Messages" indicator in the TopBar notification area when unread `TenantMessage` records exist.

### Acceptance criteria

- [ ] `POST /api/user/tenants/:leaseId/portal-invite` sends magic link email, sets `portalEnabled = true`
- [ ] `GET /api/portal/[token]` validates token, returns lease + tenant data without owner auth
- [ ] Token-based session is scoped to the specific tenant — cannot access other tenants' data
- [ ] `POST /api/portal/[token]/maintenance` creates `MaintenanceRequest`; urgent requests send Resend alert to landlord
- [ ] `POST /api/portal/[token]/payment/setup` initiates GoCardless redirect flow
- [ ] GoCardless callback creates mandate record; payment can be created
- [ ] `/portal/dashboard` renders correctly with real lease data
- [ ] `/portal/maintenance` form submits maintenance request
- [ ] Portal works without GoCardless configured — rent payment section shows "Direct debit not available — contact landlord"
- [ ] Magic link expires after 24 hours — expired link shows expiry message, not broken page
- [ ] Tenants page: "Invite to portal →" button visible; sends invite email
- [ ] Work Orders: urgent maintenance request auto-creates draft work order

### Commission

**GoCardless fee pass-through:** 1.15% + £0.20 per transaction. This is infrastructure cost, not a commission. The strategic value is data: knowing that rent was collected, and when.

**Retention value:** Tenants using the portal reduce landlord admin (fewer WhatsApp/email rent queries, maintenance tracking, statement requests). This is positioning value that reduces churn.

---

## Feature 2: Legal Document Automation (T3-4)

### What it builds

AI-drafting of 4 statutory/formal legal documents that arise from active tenant situations. These are distinct from the AI renewal letters (Wave 2) — they are more formal documents with specific legal requirements.

**Documents in scope for Sprint 4:**

| Document | When needed | Commission |
|----------|-------------|-----------|
| Section 25 Notice (LTA 1954) | Landlord opposing lease renewal or offering new terms | £250 flat fee per notice drafted |
| Licence to Assign | Tenant requests to assign lease to new occupier | £200 flat fee per licence |
| Licence to Underlet | Tenant requests to sublet to sub-tenant | £200 flat fee per licence |
| Deed of Variation | Parties agree to change existing lease terms | £300 flat fee per deed |

**Not in scope (Sprint 5):** Section 26 response, formal SDLT return, TR1/AP1 HMLR forms. These require more complex legal inputs.

**Important caveat in UI:** All drafted documents must show: *"This document has been drafted by AI for your review. It should be reviewed by a solicitor before service or execution. RealHQ is not a firm of solicitors."*

### New routes

#### `POST /api/user/legal/documents`
Creates a legal document record and triggers AI drafting.

```typescript
// Body
{
  type: "section_25" | "licence_to_assign" | "licence_to_underlet" | "deed_of_variation";
  leaseId: string;
  params: Section25Params | LicenceToAssignParams | LicenceToUnderletParams | DeedOfVariationParams;
}

// Response
{
  document: {
    id: string;
    type: string;
    body: string;   // AI-drafted HTML/markdown
    status: "draft" | "under_review" | "approved" | "served";
    createdAt: string;
  }
  commission: { amount: number; category: "legal_document" }
}
```

**Type-specific params:**

```typescript
// Section 25 Notice
interface Section25Params {
  noticeType: "opposed" | "unopposed"; // s.25(6) opposed or s.25(7) unopposed
  proposedTerminationDate: string;     // ISO date — must be ≥6 months from service
  groundsOfOpposition?: string[];      // If opposed: specify grounds (a-g)
  proposedNewTerms?: string;           // If unopposed: outline new lease terms
}

// Licence to Assign
interface LicenceToAssignParams {
  assigneeName: string;         // proposed new occupier
  assigneeCompanyNo?: string;   // for Companies House check
  licenceConditions?: string;   // any special conditions on the assignment
}

// Licence to Underlet
interface LicenceToUnderletParams {
  subTenantName: string;
  subLetArea: string;          // description of sub-let area
  subLetRent: number;          // annual sub-let rent
  subLetTerm: string;          // e.g. "3 years from 1 April 2026"
}

// Deed of Variation
interface DeedOfVariationParams {
  variationType: string;       // e.g. "Rent increase to £XXX from [date]"
  variationDetails: string;    // full description of what is being varied
  effectiveDate: string;       // ISO date
}
```

#### `GET /api/user/legal/documents`
Returns all legal documents for the user, ordered by creation date.

#### `PATCH /api/user/legal/documents/:docId`
Update document status (`draft` → `under_review` → `approved` → `served`).

#### `POST /api/user/legal/documents/:docId/regenerate`
Re-generates the AI draft (if user wants to tweak the inputs).

### Prisma model

```prisma
model LegalDocument {
  id          String    @id @default(cuid())
  userId      String
  leaseId     String?
  type        String    // "section_25" | "licence_to_assign" | "licence_to_underlet" | "deed_of_variation"
  params      Json      // type-specific params stored as JSON
  body        String    @db.Text  // AI-drafted document body (markdown/HTML)
  status      String    @default("draft") // "draft" | "under_review" | "approved" | "served"
  servedAt    DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id])
  commission  Commission?
}
```

### Claude prompts by document type

**Section 25 Notice (opposed):**
```
Draft a Section 25 Notice under the Landlord and Tenant Act 1954 opposing renewal.

Landlord: {landlordName} of {landlordAddress}
Tenant: {tenantName}
Property: {propertyAddress}
Current lease expiry: {currentExpiry}
Proposed termination date: {terminationDate}
Grounds of opposition: {grounds}

Draft the notice in standard form complying with LTA 1954 s.25. Include:
1. Parties and property description
2. Notice of termination (s.25(1))
3. Statement of opposition and statutory grounds (s.25(6))
4. Information about tenant's right to apply to court for a new tenancy (s.40)
5. Service date and method of service fields (to be completed on service)

Use plain, formal English. Use "the Landlord" and "the Tenant" throughout.
Flag any fields that require completion before service with [COMPLETE BEFORE SERVICE].
```

**Licence to Assign:**
```
Draft a Licence to Assign for a commercial lease.

Landlord: {landlordName}
Current Tenant (Assignor): {assignorName}
Proposed New Tenant (Assignee): {assigneeName}
Property: {propertyAddress}
Lease date: {leaseDate}
Lease term: {leaseTerm}
Current passing rent: {sym}{rent}/yr

Covenant grade of assignee: {covenantGrade} (Companies House assessment)
Licence conditions: {conditions or "None specified — standard conditions apply"}

Draft a Licence to Assign in standard form including:
1. Recitals (identifying parties and original lease)
2. Licence to assign (the consent)
3. Assignee's direct covenant with landlord (direct covenant to observe lease terms)
4. Guarantor clause (if covenant grade is C or D: include assignor as guarantor for one year post-assignment)
5. Costs clause
6. Execution blocks for all parties

Use plain English. Flag fields requiring completion with [COMPLETE BEFORE EXECUTION].
```

### FE: Legal documents tab on Tenants page

Add a "Legal" tab to the Tenants page alongside the existing Tenants/Lettings tabs.

**Legal documents list:**
- Shows all `LegalDocument` records, grouped by lease
- Per-document row: type label, lease (asset + tenant), status badge, created date, "View →" link
- "New document →" button → opens a type-selector modal

**Document creation modal:**
- Step 1: Select document type (4 options with descriptions)
- Step 2: Select which lease it applies to (dropdown of active leases)
- Step 3: Type-specific form (params — e.g. for Section 25: termination date, notice type, grounds)
- Step 4: "Generate document →" → shows loading state, then redirects to document preview

**Document preview page: `/legal/[documentId]`**
- Full AI-drafted document rendered in a document-style container (white card, A4 proportions)
- Legal disclaimer prominently shown
- Status badge + "Update status" dropdown
- "Copy to clipboard" button
- "Download PDF" → calls brochure-style Puppeteer PDF generation (reuse from Sprint 3)
- Commission disclosure: "RealHQ fee: £XXX for this document"

### Commission model

Commission recorded on document creation (not on service — we earn on drafting, not on whether it's used):

```typescript
const LEGAL_FEES: Record<string, number> = {
  section_25: 250,
  licence_to_assign: 200,
  licence_to_underlet: 200,
  deed_of_variation: 300,
};
// Create Commission record at document creation, status: "confirmed"
```

### Acceptance criteria

- [ ] `POST /api/user/legal/documents` creates a `LegalDocument` and returns AI-drafted body
- [ ] Section 25 draft references correct landlord, tenant, property, and termination date
- [ ] Licence to Assign includes direct covenant and (if C/D covenant grade) guarantor clause
- [ ] `PATCH /api/user/legal/documents/:docId` transitions status correctly
- [ ] Commission record created at document creation — correct amount per type
- [ ] Legal tab on Tenants page shows document list
- [ ] Document creation modal — 4-step flow — submits correctly for all 4 types
- [ ] Document preview page renders with legal disclaimer prominently shown
- [ ] "Download PDF" generates correct PDF (reuses Sprint 3 brochure/Puppeteer)
- [ ] UK-only feature — route returns 403 for US portfolio users (LTA 1954 is England/Wales only)

---

## Schema additions summary

```prisma
// New models
model MaintenanceRequest { ... }
model RentPayment         { ... }
model TenantMessage       { ... }
model LegalDocument       { ... }

// Fields added to existing models
// Tenant: email, portalEnabled, portalInvitedAt (new fields)
// Commission: category adds "legal_document" value

// Portal session is JWT-based — no new table needed
```

Migration file: `prisma/migrations/20260324_wave3_tenant_portal/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| Tenant Portal: schema + migration | 0.5 days | FSE | CEO decision on GoCardless |
| Tenant Portal: magic link auth (JWT) | 1 day | FSE | Schema done |
| Tenant Portal: portal-invite route | 0.5 days | FSE | Auth done |
| Tenant Portal: `/api/portal/[token]` routes (5) | 2 days | FSE | Auth done |
| Tenant Portal: GoCardless integration | 1 day | FSE | `GOCARDLESS_ACCESS_TOKEN` set |
| Tenant Portal: GoCardless webhook | 0.5 days | FSE | Integration done |
| Tenant Portal: FE portal pages (4 pages) | 3 days | FE | BE routes done |
| Tenant Portal: Owner-side additions (invite button, work order auto-create) | 1 day | FE | Routes done |
| Legal Docs: schema + migration | 0.5 days | FSE | None |
| Legal Docs: 4 BE routes | 1.5 days | FSE | Schema done |
| Legal Docs: 4 Claude prompts | 1 day | FSE | Routes done |
| Legal Docs: FE Legal tab + creation modal | 2 days | FE | BE routes done |
| Legal Docs: Document preview page + PDF | 1 day | FE | Sprint 3 Puppeteer done |
| **Total** | **~16 days (~4 weeks)** | FSE + FE | CEO decisions |

---

## What this sprint does NOT include

- Full DocuSign lease signing (Sprint 5)
- Rent collection analytics (requires 3+ months of RentPayment data)
- Tenant credit/reference checking via Experian/Equifax (Sprint 5 — commercial credit check API)
- Section 26 notice (tenant's request for new tenancy) — Sprint 5
- GoCardless for US / Stripe integration — Sprint 5
- Portfolio-level rent collection dashboard — Sprint 5 (needs MonthlyFinancial data from Sprint 2)
- Third-party access to Transaction Room (Sprint 5)

---

## Revenue summary for Sprint 4

| Feature | Revenue model | Est. per customer |
|---------|--------------|-------------------|
| GoCardless rent collection | 1.15% + £0.20 per payment pass-through | ~£450/yr on £35k/month rent |
| Legal document drafting | £200–£300 flat fee per document | £200–600 per event |
| Tenant portal (retention) | No direct commission — reduces churn | ~£2k ARR retained per customer |

---

*Sprint 4 target: 4 weeks after Sprint 3 complete · Owner: FSE + FE · CEO approval required on payment processor and portal URL before sprint begins*
