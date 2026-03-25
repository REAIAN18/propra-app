# RealHQ Wave 3 — Sprint 3 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html §9 (Transaction Room), RealHQ-BuildOrder-CEO-v1.html Wave 2 (Brochure), Addendum v3.1 §6 (deal execution)
**Wave 3 triage:** `docs/wave-3-triage.md` — T3-1 (Transaction Room), T3-18 (Marketing Brochure Generator)
**Prerequisite:** Wave 3 Sprint 2 complete. Wave 2 Scout testing passed (PRO-570 AVM, Scout LOI workflow verified).
**Target:** 3-week sprint, FSE + FE

---

## Sprint Goal

Deliver the deal execution layer for Acquisitions Scout. A user who has run underwriting and generated a LOI now needs: (a) a professional marketing document to share with sellers and co-investors, and (b) a structured deal room to manage the transaction from LOI to completion.

These two features are the direct sequel to Scout Wave 2. Without them, a LOI sits in a void — there's nowhere to attach NDAs, share documents, or track milestones. Sprint 3 closes that gap.

---

## Why these two features together

| Feature | Why Sprint 3 |
|---------|--------------|
| Transaction Room (T3-1) | Scout LOI (Wave 2) is the deal-initiation trigger. Once a LOI is sent, the next step is a data room with NDA, document vault, and milestone tracking. Transaction Room is the direct follow-on to Scout. Cannot build this meaningfully until Scout LOI is live and tested (Wave 2 testing gate). |
| Marketing Brochure Generator (T3-18) | Was specified as Wave 2 in the CEO build order but missed from all Wave 2 handoffs. All data inputs are now available (AVM, satellite, lease data). Compact scope (~1 week). Pairs naturally with Transaction Room — the brochure is the first document that goes into the deal room. |

---

## Feature 1: Marketing Brochure Generator (T3-18)

### What it builds

One-click generation of a branded A4 PDF for any asset or acquisition deal. Assembles real property data, AI-drafted investment narrative, and financial summary into a professional document suitable for sharing with co-investors, lenders, or counterparties.

**User journeys:**
1. **Sell-side:** Owner selects an asset from `/assets/:id` → "Generate brochure" → 60-second PDF with financials, lease summary, investment thesis
2. **Buy-side:** User has a Scout deal → "Generate IM" → acquisition investment memo with cap rate, DSCR, underwriting summary
3. **Refinance prep:** User generating a lender pack for a refinance application

### New route

#### `POST /api/user/assets/:id/brochure`
Generates a PDF brochure for the asset.

```typescript
// Body (all optional — defaults to full brochure)
{
  type?: "brochure" | "investment_memo";  // default: "brochure"
  includeFinancials?: boolean;             // default: true
  includeLeaseSchedule?: boolean;          // default: true (omit if vacant)
  recipientName?: string;                  // personalise "Prepared for: [name]"
  confidential?: boolean;                  // adds "STRICTLY CONFIDENTIAL" watermark
}

// Response
{
  pdfUrl: string;      // signed S3 URL (or data URI if S3 not configured)
  htmlPreview: string; // HTML string for preview before PDF generation
  generatedAt: string;
}
```

**No new Prisma model needed for MVP.** Generated brochures are not stored — they are generated on demand and returned as a PDF URL or inline data URI. If S3 is configured (`AWS_S3_BUCKET`), upload and return a signed URL (valid 1 hour). If not configured, return a base64 data URI for immediate download.

### PDF generation approach

Use **`puppeteer`** (headless Chrome) for PDF generation — produces pixel-perfect output from HTML/CSS and handles complex layouts better than `@react-pdf/renderer`.

```typescript
// src/lib/brochure.ts
import puppeteer from 'puppeteer';
import { renderBrochureHTML } from './brochure-template';

export async function generateBrochurePDF(data: BrochureData): Promise<Buffer> {
  const html = renderBrochureHTML(data);
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
  });
  await browser.close();
  return pdf;
}
```

**Note on Vercel:** Puppeteer does not run on Vercel serverless due to the Chromium binary size. Use `@sparticuz/chromium` (Vercel-compatible Chromium) + `puppeteer-core`:

```typescript
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

**Alternative if @sparticuz/chromium has issues:** Use `html-pdf-node` (wkhtmltopdf wrapper) or generate a `data:text/html` download with `window.print()` CSS media query — simpler but less reliable cross-browser. Recommend `@sparticuz/chromium` as the primary approach.

**Package additions:**
```bash
npm install @sparticuz/chromium puppeteer-core
```

### Brochure template

**Template: `src/lib/brochure-template.ts`**

Returns HTML string with inline CSS. Two pages maximum:

**Page 1 — Hero + summary:**
```
┌───────────────────────────────────────────────┐
│ [Satellite image, full width, 180px tall]      │
│                                                 │
│ ASSET NAME                                      │
│ Location · Asset type · EPC rating              │
│                                                 │
│ ┌─────────┬─────────┬─────────┬─────────┐      │
│ │ Asking  │ NOI     │ Yield   │ Sqft    │      │
│ │ £X.XM   │ £XXXk   │ X.X%   │ XX,XXX  │      │
│ └─────────┴─────────┴─────────┴─────────┘      │
│                                                 │
│ INVESTMENT NARRATIVE (AI-generated, 3-4 lines) │
│                                                 │
│ Prepared by RealHQ · [Date] · [Confidential?]  │
└───────────────────────────────────────────────┘
```

**Page 2 — Financial detail + lease schedule:**
```
┌───────────────────────────────────────────────┐
│ FINANCIAL SUMMARY                               │
│ ┌──────────────────────────────────────────┐   │
│ │ Gross Revenue  │ £XXX,XXX               │   │
│ │ Operating Costs│ £XX,XXX                │   │
│ │ NOI            │ £XXX,XXX               │   │
│ │ Initial Yield  │ X.X%                   │   │
│ │ Cap Rate       │ X.X% vs X.X% market    │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ LEASE SCHEDULE                                  │
│ Tenant · Expiry · Rent (£/sqft)                │
│ [rows per lease]                                │
│                                                 │
│ LOCATION + CONNECTIVITY                         │
│ [Asset location paragraph, 2-3 lines]           │
└───────────────────────────────────────────────┘
```

### AI investment narrative

Claude Haiku (fast, cost-effective for document generation):

```typescript
// Prompt
const narrativePrompt = `
Write a 3-4 sentence commercial property investment narrative for a marketing brochure.
Be factual, professional, and concise. Do not use clichés like "stunning" or "superb".

Asset: ${assetName}, ${assetType}, ${location}
Size: ${sqft.toLocaleString()} sqft
Passing rent: ${sym}${fmt(passingRent)}/yr
Market ERV: ${sym}${fmt(marketERV)}/yr (${rentUpliftPct > 0 ? `${rentUpliftPct}% below market — uplift opportunity` : 'at market rate'})
NOI yield: ${yield.toFixed(1)}%
Key tenant(s): ${tenantNames}
Lease expiry: ${expiryStr}
Planning: ${planningSignal}

Write from the perspective of presenting this asset to a potential investor.
`;
```

### FE: Brochure generation button

**Asset detail page (`/assets/:id`):** Add "Generate brochure →" button in the asset header actions row (alongside "Run AVM" and "Register sell interest"). Clicking calls `POST /api/user/assets/:id/brochure`, shows loading state ("Generating PDF…"), then triggers a file download (`application/pdf`, filename `{AssetName}-RealHQ-Brochure.pdf`).

**Scout deal panel:** Add "Generate IM →" button (Investment Memorandum variant) after the underwriting section, when `pipelineStage` is set. Calls the brochure route with `type: "investment_memo"`.

### Acceptance criteria

- [ ] `POST /api/user/assets/:id/brochure` returns a PDF (either as base64 data URI or S3 signed URL)
- [ ] PDF contains real asset data — not placeholder values
- [ ] AI narrative is generated by Claude and references the specific asset (name, type, rent, yield)
- [ ] PDF is valid A4 format, renders correctly in browser PDF viewer
- [ ] Two-page maximum — no overflow onto page 3
- [ ] "Generate brochure →" button on `/assets/:id` triggers download
- [ ] "Generate IM →" button on Scout deal panel triggers download with `type: "investment_memo"`
- [ ] Loading state shown during generation (Puppeteer may take 8–12 seconds)
- [ ] If asset has no satellite image, shows grey placeholder on page 1 (does not break)
- [ ] If `confidential: true`, "STRICTLY CONFIDENTIAL" watermark applied diagonally

### Commission

None direct. Deal facilitation. Reduces time between "interested" and "offer submitted" — qualitative retention and conversion value.

### Env vars needed

- `ANTHROPIC_API_KEY` — already in production
- `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — optional (falls back to data URI if absent)

---

## Feature 2: Transaction Room (T3-1)

### What it builds

A structured deal room for managing commercial property transactions from LOI to completion. Covers buy-side acquisitions (from Scout) and sell-side disposals. Contains: NDA workflow, document vault, milestone tracker, offer management, communication log.

### Why now

The Scout Wave 2 pipeline (Screening → LOI → Due Diligence → Exchange → Complete) already exists as a `pipelineStage` field on `ScoutDeal`. The Transaction Room is the content layer that fills each of those stages with real documents, milestones, and counterparty communication. Without it, `pipelineStage = "due_diligence"` means nothing — there's nowhere to put the due diligence documents.

### Data model

```prisma
model TransactionRoom {
  id           String    @id @default(cuid())
  userId       String
  dealId       String?   @unique  // FK to ScoutDeal (buy-side)
  assetId      String?            // FK to UserAsset (sell-side, when listing own asset)
  type         String             // "acquisition" | "disposal"
  status       String    @default("active") // "active" | "exchanged" | "completed" | "withdrawn"
  askingPrice  Float?
  agreedPrice  Float?
  buyer        String?   // counterparty name
  seller       String?
  solicitorRef String?   // solicitor reference number
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  user         User      @relation(fields: [userId], references: [id])
  deal         ScoutDeal? @relation(fields: [dealId], references: [id])
  asset        UserAsset? @relation(fields: [assetId], references: [id])
  documents    TransactionDocument[]
  milestones   TransactionMilestone[]
  ndaSignature NDASignature?
}

model TransactionDocument {
  id            String   @id @default(cuid())
  roomId        String
  documentId    String?  // FK to Document (if uploaded via existing document system)
  name          String
  category      String   // "nda" | "title_register" | "searches" | "survey" | "contracts" | "enquiries" | "finance" | "other"
  uploadedBy    String   // "owner" | "counterparty" | "solicitor"
  confidential  Boolean  @default(false)
  uploadedAt    DateTime @default(now())
  room          TransactionRoom @relation(fields: [roomId], references: [id])
}

model TransactionMilestone {
  id          String    @id @default(cuid())
  roomId      String
  stage       String    // "nda_signed" | "heads_agreed" | "instructed_solicitor" | "searches_ordered" | "survey_instructed" | "contracts_exchanged" | "completion"
  status      String    @default("pending") // "pending" | "in_progress" | "complete"
  completedAt DateTime?
  notes       String?
  room        TransactionRoom @relation(fields: [roomId], references: [id])
}

model NDASignature {
  id           String   @id @default(cuid())
  roomId       String   @unique
  signerName   String
  signerEmail  String
  signedAt     DateTime?
  docusignId   String?  // DocuSign envelope ID
  status       String   @default("pending") // "pending" | "sent" | "signed" | "declined"
  room         TransactionRoom @relation(fields: [roomId], references: [id])
}
```

### New API routes

#### `POST /api/user/transactions`
Creates a new transaction room. Can be linked to a Scout deal (buy-side) or initiated fresh for a disposal.

```typescript
// Body
{
  type: "acquisition" | "disposal";
  dealId?: string;      // link to ScoutDeal (buy-side)
  assetId?: string;     // link to UserAsset (sell-side)
  askingPrice?: number;
  counterparty?: string; // buyer or seller name
}

// Response
{ room: TransactionRoom & { milestones: TransactionMilestone[] } }
```

Auto-creates the standard milestone set on room creation:
- NDA signed
- Heads of Terms agreed
- Solicitors instructed
- Searches ordered
- Survey / structural report instructed
- Contracts exchanged
- Completion

#### `GET /api/user/transactions`
Lists all transaction rooms for the user.

#### `GET /api/user/transactions/:roomId`
Returns full room detail including documents, milestones, NDA status.

#### `PATCH /api/user/transactions/:roomId`
Update room status, agreed price, solicitor reference.

#### `POST /api/user/transactions/:roomId/documents`
Upload a document to the deal room. Multipart form-data → S3 (or local fallback). Creates `TransactionDocument` record.

#### `POST /api/user/transactions/:roomId/nda`
Initiates NDA workflow.

```typescript
// Body
{
  signerName: string;
  signerEmail: string;
  useDocusign?: boolean;  // if false: just record as manually signed
}
```

**DocuSign integration:**
- If `DOCUSIGN_INTEGRATION_KEY` env var is set: Create DocuSign envelope with NDA template, send to `signerEmail`, store `docusignId`
- If not set: Record NDA as "manually agreed" — signer name + email stored, `status = "signed"` immediately (manual process)

DocuSign is optional and gated behind env var. MVP works without it.

**NDA template:** A standard 3-clause mutual NDA template stored as an inline string in the route (`src/lib/nda-template.ts`). No external template storage needed for MVP.

#### `PATCH /api/user/transactions/:roomId/milestones/:milestoneId`
Mark a milestone complete/in-progress.

```typescript
{ status: "in_progress" | "complete"; notes?: string; completedAt?: string }
```

#### `POST /api/user/transactions/:roomId/scout-link`
Links an existing Scout deal to a transaction room (for deals where the room was created before the deal was underwritten).

### FE: Transaction Room UI

**Entry points:**
1. **From Scout:** When `pipelineStage === "loi"` or `"due_diligence"`, show "Open deal room →" button in the DealPanel. Creates room if none exists for this deal, then navigates to `/transactions/:roomId`.
2. **From Asset detail:** On the Hold/Sell section when `recommendation === "sell"` — "Open transaction room →" (creates a disposal room linked to the asset).
3. **Navigation:** Add "Transactions" to the app navigation (AppShell sidebar), shows count badge when active rooms exist.

**Transaction room page: `/transactions/[roomId]/page.tsx`**

New page with 4 sections:

**Section 1: Deal header**
- Asset/deal name, type badge (Acquisition/Disposal), status badge
- Key figures: Asking price, Agreed price (when set), counterparty name
- "Update" button → modal to set agreed price, solicitor reference

**Section 2: Milestone tracker**
- Horizontal pipeline: 7 milestones, each showing pending/in-progress/complete state
- Each milestone: click to mark complete (with optional notes)
- Milestone dates shown when complete
- Visual progress: left-to-right flow with connecting line, colour-coded (grey→blue→green)

**Section 3: Document vault**
- Categorised document list: NDA, Title, Searches, Survey, Contracts, Enquiries, Finance, Other
- Upload button per category → opens document upload modal
- Each document row: name, category badge, uploaded date, uploaded by, download link
- "Confidential" toggle on upload (hides document from counterparty view in future portal)

**Section 4: NDA workflow**
- If `ndaSignature` is null: "Send NDA →" button — opens modal asking for signer name + email
- If `ndaSignature.status === "pending"` or `"sent"`: "NDA pending — sent to {email}" + "Resend" link
- If `ndaSignature.status === "signed"`: Green "NDA signed ✓ — {signerName} on {date}" badge
- If DocuSign not configured: Show "NDA" as a document to upload manually (upload an executed NDA PDF and mark as signed)

**Transaction list page: `/transactions/page.tsx`**
- Lists all transaction rooms: deal/asset name, type, status, milestone progress bar, counterparty
- "Create new" button → modal (type: acquisition/disposal, asset selector, asking price)

### Acceptance criteria

- [ ] `POST /api/user/transactions` creates a `TransactionRoom` with 7 standard milestones auto-created
- [ ] `GET /api/user/transactions/:roomId` returns full room with milestones, documents, NDA status
- [ ] `PATCH /api/user/transactions/:roomId/milestones/:id` marks milestone complete
- [ ] `POST /api/user/transactions/:roomId/documents` uploads a document and creates `TransactionDocument` record
- [ ] `POST /api/user/transactions/:roomId/nda` creates `NDASignature` record; if DocuSign configured, sends envelope
- [ ] Scout page: "Open deal room →" button visible for deals at `loi` or `due_diligence` stage
- [ ] `/transactions/:roomId` renders all 4 sections (header, milestones, vault, NDA)
- [ ] Milestone completion updates UI without page reload
- [ ] Document upload works without S3 configured (local fallback)
- [ ] `/transactions` lists all rooms with correct status and milestone progress
- [ ] Navigation item "Transactions" added to AppShell with active-room count badge
- [ ] NDA workflow functions without DocuSign (manual upload path)

### Commission

**0.25% of deal value** (transaction management fee) — triggered when `status` is set to `"completed"` and `agreedPrice` is set.

> **Schema note:** Commission model uses `annualSaving`, `commissionRate`, `commissionValue` (Float fields). Does NOT have `amount`, `currency`, or `description` fields. See Sprint 1 brief for the canonical field reference.

```typescript
// On PATCH /api/user/transactions/:roomId with { status: "completed", agreedPrice: X }
// NOTE: Commission model uses annualSaving/commissionRate/commissionValue — NOT amount/currency/description
await prisma.commission.create({
  data: {
    userId,
    assetId: assetId ?? undefined,
    category: "transaction",
    annualSaving: agreedPrice,                    // deal value (basis for commission calculation)
    commissionRate: 0.0025,                       // 0.25% of deal value
    commissionValue: Math.round(agreedPrice * 0.0025),
    status: "confirmed",
    placedAt: new Date(),
  }
});
```

At £4M deal value: **£10,000 commission**. At £2M: £5,000.

### Env vars needed

- `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — for document storage (local fallback if absent)
- `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_PRIVATE_KEY` — for NDA e-signing (optional, manual upload path available if absent)

---

## Schema additions summary

```prisma
// New models
model TransactionRoom         { ... }
model TransactionDocument     { ... }
model TransactionMilestone    { ... }
model NDASignature            { ... }

// No new fields on existing models
// ScoutDeal gets optional TransactionRoom relation (one-to-one via dealId FK)
// Commission.category adds "transaction" value
```

Migration file: `prisma/migrations/20260324_wave3_transaction_room/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| Brochure: Puppeteer + brochure-template.ts | 1 day | FSE | npm install @sparticuz/chromium |
| Brochure: `POST /api/user/assets/:id/brochure` route | 0.5 days | FSE | Template done |
| Brochure: Claude narrative + data assembly | 0.5 days | FSE | Route done |
| Brochure: FE button (asset detail + scout panel) | 0.5 days | FE | Route done |
| Transaction Room: schema + migration | 0.5 days | FSE | None |
| Transaction Room: 6 BE routes | 2 days | FSE | Schema done |
| Transaction Room: NDA template + DocuSign gate | 1 day | FSE | Routes done |
| Transaction Room: `/transactions/[roomId]` page | 2 days | FE | BE routes done |
| Transaction Room: `/transactions` list page | 0.5 days | FE | BE routes done |
| Transaction Room: Scout + Asset detail entry points | 0.5 days | FE | Pages done |
| Commission record on completion | 0.5 days | FSE | Routes done |
| **Total** | **~9 days** | FSE + FE | — |

---

## What this sprint does NOT include

- Tenant Portal (T3-3) — moved to Sprint 4. Requires separate subdomain setup, GoCardless/Stripe decision, Wave 2 tenant testing complete
- Full DocuSign integration for HoT/lease signing — MVP uses manual upload path; full DocuSign is Sprint 4
- HMLR / conveyancing search integration (T3-5) — Sprint 5
- Third-party counterparty access to the deal room — Sprint 4 (requires auth for non-RealHQ users)

---

## Notes

**Document storage:** Sprint 3 MVP can store documents as database records pointing to S3 or as local file references if `AWS_S3_BUCKET` is not set. Do not block the Transaction Room launch on S3 configuration — the room is functional without cloud storage for early testing.

**DocuSign:** The NDA workflow should work without DocuSign credentials. When `DOCUSIGN_INTEGRATION_KEY` is not set, the NDA flow falls back to: "Upload executed NDA PDF" → document vault, mark NDA as "manually signed". This covers 100% of the workflow value without requiring board action on DocuSign setup.

---

*Sprint 3 target: 10 working days after Sprint 2 complete · Owner: FSE + FE · Approver: CEO*
