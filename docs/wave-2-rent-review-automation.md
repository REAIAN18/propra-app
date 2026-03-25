# Wave 2 — Rent Review & Lease Renewal Automation

**Author:** Head of Product
**Date:** 2026-03-22
**Status:** ✅ Built — schema live, all 7 routes implemented. Gate: PRO-574 testing.
**Revenue:** 8% of annualised rent uplift on completion
**Sources:** Addendum v3.1 Section D.3, RealHQ-Spec-v3.2, wave-2-commission-model.md

---

## Overview

When a lease is uploaded, RealHQ automatically identifies the ERV gap, calculates a leverage score, and creates a renewal workflow at the right moment. The owner's only job is to review and approve drafts. RealHQ handles the analysis, document generation, and dispatch.

This is a **Wave 2** revenue feature (Sprint 3). It runs on top of the Wave 1 lease extraction pipeline that is already built.

---

## What's already built (Wave 1)

- `GET /api/user/lease-summary` — extracts tenant, property, sqft, passing rent, expiry, break clause, status from uploaded PDFs
- `TenantEngagementAction` model — records `engage_renewal | relet | review_break` actions
- Rent Clock page — displays expiry countdown, ERV gap (static `marketERV` on asset), urgency badges
- `marketERV` field on `UserAsset` — static/estimated, not live CoStar data

---

## What needs to be built (Wave 2 — Sprint 3)

### Feature flow

```
Lease upload
    → (already) extraction of terms, expiry, passing rent
    → NEW: leverage score calculated + stored
    → NEW: renewal workflow triggered at correct horizon (18m/12m/6m/3m)
    → NEW: CoStar ERV pulled for live benchmark (UK) or ATTOM (US)
    → Owner reviews draft renewal letter
    → Owner approves → letter sent via RealHQ
    → Tenant responds → heads of terms drafted
    → Owner approves HoT → DocuSign sent
    → Lease signed → commission triggered (8% of annualised uplift)
```

---

## 1. Prisma schema additions

### `RentReviewEvent` — timeline triggers

```prisma
model RentReviewEvent {
  id           String   @id @default(cuid())
  userId       String
  assetId      String?
  leaseRef     String            // from lease-summary: docId or docId-N
  tenantName   String
  propertyAddress String?
  expiryDate   DateTime
  breakDate    DateTime?
  passingRent  Float             // annual, in portfolio currency
  sqft         Int?
  ervLive      Float?            // from CoStar/ATTOM — annual per sqft
  ervSource    String?           // "costar" | "attom" | "epc_register" | "manual"
  ervFetchedAt DateTime?
  gap          Float?            // (ervLive - passingRentPerSqft) * sqft — annual
  leverageScore Int?             // 0–10
  leverageExplanation String?   @db.Text
  horizon      String            // "18m" | "12m" | "6m" | "3m" — which trigger created this
  status       String   @default("pending")
  // pending | draft_sent | hot_drafted | hot_signed | lease_renewed | no_action | dismissed
  draftGeneratedAt DateTime?
  hotSignedAt  DateTime?
  leaseSigned  DateTime?
  newRent      Float?            // agreed rent at renewal
  commissionGbp Float?           // 8% of annualised uplift
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset UserAsset? @relation(fields: [assetId], references: [id], onDelete: SetNull)
  correspondences RenewalCorrespondence[]
}
```

Add `rentReviewEvents RentReviewEvent[]` to `User` and `UserAsset`.

### `RenewalCorrespondence` — correspondence log

```prisma
model RenewalCorrespondence {
  id          String   @id @default(cuid())
  reviewId    String
  type        String   // "renewal_letter" | "section_25" | "hot" | "response" | "reminder"
  direction   String   // "outbound" | "inbound"
  body        String   @db.Text
  sentAt      DateTime?
  deliveredAt DateTime?
  openedAt    DateTime?
  docusignEnvelopeId String?
  createdAt   DateTime @default(now())

  review RentReviewEvent @relation(fields: [reviewId], references: [id], onDelete: Cascade)
}
```

---

## 2. New API routes

### `GET /api/user/rent-reviews`

Returns all active rent review events for the user, ordered by expiry date ascending.
Optional query param: `?status=<value>` to filter by specific status.

### `POST /api/user/rent-reviews`

Manually creates a review event (for cases where cron has not yet run or FE needs to trigger one).

```ts
// Body: { leaseId: string; tenantName: string; expiryDate: string; passingRent: number; horizon: string;
//         propertyAddress?: string; assetId?: string; sqft?: number; breakDate?: string }
// Response: { review: RentReviewEvent }
```

```ts
// Query: portfolioId?, status? (default: returns all non-dismissed)
// Response:
{
  reviews: {
    id: string
    tenantName: string
    propertyAddress: string | null
    assetId: string | null
    expiryDate: string          // ISO date
    daysToExpiry: number
    breakDate: string | null
    passingRent: number         // annual
    ervLive: number | null
    gap: number | null          // annual uplift at ERV
    leverageScore: number | null
    leverageExplanation: string | null
    horizon: string
    status: string
    urgency: "urgent" | "soon" | "monitor"
  }[]
  totalGapGbp: number           // total portfolio ERV reversion
}
```

### `POST /api/user/rent-reviews/[reviewId]/draft`

Generates the renewal letter draft using Claude API.

```ts
// Body: { type: "renewal_letter" | "section_25" | "hot" }
// Response: { body: string; reviewId: string }
```

**Claude prompt (renewal letter):**
```
Generate a commercial lease renewal letter for:
- Tenant: {tenantName}
- Property: {propertyAddress}
- Current passing rent: {sym}{passingRent}/yr
- ERV based on comparable lettings: {sym}{ervLive * sqft}/yr
- Gap: {sym}{gap}/yr ({gapPct}% below market)
- Lease expiry: {expiryDate}
- Break clause: {breakDate or none}
- Leverage score: {leverageScore}/10 — {leverageExplanation}

Draft a professional commercial landlord renewal letter. Propose renewal at ERV.
Reference comparable evidence. State the landlord's intention clearly.
UK English, formal register. No fees or commission mentioned.
Do not include RealHQ in the letter — write as if from the landlord directly.
```

### `POST /api/user/rent-reviews/[reviewId]/send`

Sends the approved draft via Resend and records the correspondence event.

```ts
// Body: { type: string; body: string; recipientEmail: string; correspondenceId?: string }
// If correspondenceId provided: updates existing draft (sentAt = now) rather than creating new record
// Creates/updates RenewalCorrespondence, sends email via Resend, updates review status → "draft_sent"
// Requires RESEND_API_KEY — returns 500 if not set
// Response: { success: true; correspondenceId: string }
```

### `POST /api/user/rent-reviews/[reviewId]/hot`

Generates Heads of Terms document and creates DocuSign envelope for e-signature.

```ts
// Body: { agreedRent: number; newTerm: number; breakClause?: string; incentives?: string }
// Generates HoT PDF via template + Claude API narrative
// Creates DocuSign envelope → returns signing URL
// Response: { docusignUrl: string; envelopeId: string }
```

### `PATCH /api/user/rent-reviews/[reviewId]/complete`

Records final agreed rent and triggers commission record creation.

```ts
// Body: { newRent: number; signedDate?: string }   // signedDate optional, defaults to now
// Commission: (newRent - passingRent) * 0.08 → creates Commission record (category: "rent_review")
// Updates review status to "lease_renewed"
// Also updates Lease.passingRent to newRent (if leaseId exists on review event)
// Response: { success: true; commissionGbp: number; commissionId: string }
```

---

## 3. Timeline trigger: `POST /api/cron/rent-review-triggers`

Runs daily via cron. Scans all `leaseSummaries` from lease documents, creates `RentReviewEvent` records at the correct horizons.

**Trigger logic:**
```ts
const HORIZONS = [
  { label: "18m", days: 548, urgency: "monitor" },
  { label: "12m", days: 365, urgency: "monitor" },
  { label: "6m",  days: 180, urgency: "soon" },
  { label: "3m",  days: 90,  urgency: "urgent" },
];

// For each lease summary across all users:
// 1. Calculate daysToExpiry
// 2. For each horizon: if daysToExpiry <= horizon.days + 14 AND no existing event for this horizon
//    → create RentReviewEvent with that horizon label and urgency
// 3. Fetch CoStar/ATTOM ERV at creation time (see section 4)
// 4. Calculate leverage score (see section 5)
```

Cron route: `POST /api/cron/rent-review-triggers` — protected by `CRON_SECRET` header (same pattern as existing cron routes if any).

---

## 4. ERV data source

### UK assets: CoStar comparable lettings API

```ts
// If COSTAR_API_KEY in env:
const url = `https://api.costar.com/v1/comparables/lettings`
// Params: postcode, assetType, sqft range ±20%, lettings within 12 months
// Extract: median eff rent per sqft from 3+ comparables
// Store as ervLive, ervSource = "costar", ervFetchedAt = now()
```

### UK fallback (no CoStar): MSCI IPD index by sector/region

UK ERV benchmarks by sector (use as fallback until CoStar API acquired):
```
Industrial — SE UK (logistics/warehouse): £9.50–14.50/sqft (grade A: £12–14.50)
Industrial — SE UK (standard): £7.00–9.50/sqft
Office — City fringe: £45–65/sqft
Office — SE UK out-of-town: £22–35/sqft
Retail — SE High St: £20–50/sqft zone A
```

If no CoStar key: use these benchmarks by `asset.type` + region. Set `ervSource = "msci_benchmark"`.

### US assets: ATTOM AVM

```ts
// If ATTOM_API_KEY in env:
// ATTOM /property/rentrange endpoint → estimated rental value
// Store as ervLive, ervSource = "attom"
```

### US fallback: CoStar average rent by submarket (static table)

Use static lookup by `asset.address` → metro area → CoStar published average rent/sqft by asset type.

---

## 5. Leverage score calculation

Leverage score: 1–10. Shows how much negotiating power the landlord has at renewal.

> **Wave 2 implementation:** Cron uses a simplified 2-factor model (`daysToExpiry` + `ervGapPct`). The full 6-factor model below is the Wave 3 target once CoStar vacancy/sector data is available.

**Wave 2 (actual implementation in `/api/cron/rent-review-triggers`):**
```ts
// score = 5 baseline
// daysToExpiry < 90   → +3; < 180 → +2; < 365 → +1
// ervGapPct > 20%     → +2; > 10% → +1; < -5% → -1
// clamp 1–10
```

**Wave 3 target (full model):**
```ts
function calculateLeverageScore(input: {
  daysToExpiry: number
  tenantSectorHealth: number | null   // 0–10 from Companies House / news API
  marketVacancyRate: number | null    // % vacant in submarket
  tenantFloorAreaPct: number          // tenant's sqft as % of building
  breakClauseRemaining: boolean       // does tenant have an unexercised break?
  marketRentGrowthYoY: number | null  // CoStar rent growth in submarket
}): { score: number; explanation: string } {

  let score = 5; // neutral baseline

  // Time pressure — shorter time = more landlord leverage
  if (input.daysToExpiry < 90) score += 2;
  else if (input.daysToExpiry < 180) score += 1;
  else if (input.daysToExpiry > 365) score -= 1;

  // Market vacancy — low vacancy = more landlord leverage
  if (input.marketVacancyRate !== null) {
    if (input.marketVacancyRate < 5) score += 2;
    else if (input.marketVacancyRate < 10) score += 1;
    else if (input.marketVacancyRate > 15) score -= 1;
  }

  // Tenant size — large tenant = less leverage (harder to re-let)
  if (input.tenantFloorAreaPct > 80) score -= 1;
  if (input.tenantFloorAreaPct > 95) score -= 1;

  // Sector health — troubled tenant = less leverage
  if (input.tenantSectorHealth !== null) {
    if (input.tenantSectorHealth < 3) score -= 2;
    else if (input.tenantSectorHealth < 5) score -= 1;
  }

  // Break clause — tenant has exit = less leverage
  if (input.breakClauseRemaining) score -= 1;

  // Rent growth — positive growth = more landlord leverage
  if (input.marketRentGrowthYoY !== null && input.marketRentGrowthYoY > 3) score += 1;

  score = Math.max(1, Math.min(10, score));

  const explanation = generateExplanation(input, score);
  return { score, explanation };
}
```

**Explanation template:**
```
Score {n}/10: {Market vacancy X% in {submarket} — below average, alternatives limited for tenant.}
{Lease expires in {X} days — limited time for tenant to find alternative.}
{Tenant occupies {X}% of building — relocation would be operationally complex.}
```

Store `leverageScore` and `leverageExplanation` on `RentReviewEvent`.

---

## 6. Changes to existing pages

### Rent Clock page (`/rent-clock`)

Add "Draft renewal letter" button to each lease card that:
- Triggers `POST /api/user/rent-reviews/[reviewId]/draft`
- Shows the Claude-generated draft in a modal
- Provides "Edit" (textarea) + "Send to tenant" (calls `/send` API)

Show leverage score badge: `{score}/10` with colour band (green ≥7, amber 4–6, red ≤3). Tooltip shows `leverageExplanation`.

### Tenants page (`/tenants`)

Show renewal status per tenant:
- `"18 months to expiry — renewal workflow active"`
- `"Draft sent {date} — awaiting response"`
- `"Heads of Terms signed — awaiting lease"`
- `"Lease renewed — RealHQ earned {sym}X commission"`

---

## 7. Acceptance criteria

- [ ] Lease uploaded → within 60 seconds: `RentReviewEvent` created with `horizon = "18m"` if expiryDate is within 18 months. Leverage score calculated and stored.
- [ ] ERV stored as `ervLive` on event creation. Cron uses `asset.marketERV × sqft` (stored field, `ervSource = "asset_erv"`). CoStar/MSCI live fetch is Wave 3. `ervSource` identifies data origin. No hardcoded illustrative ERV.
- [ ] "Draft renewal letter" CTA on Rent Clock — generates letter via Claude in <15 seconds. Letter contains: tenant name, property, current rent, ERV, gap in £/yr, proposed new term. Does not mention RealHQ or fees.
- [ ] Sent letter creates `RenewalCorrespondence` record with timestamp. Appears in tenant's correspondence timeline.
- [ ] "Draft Heads of Terms" flow: owner enters agreed rent → HoT generated → DocuSign envelope created → signing link returned. DocuSign completion webhook updates review status to `hot_signed`.
- [ ] `/complete` endpoint called with new agreed rent → `Commission` record created: `(newRent - passingRent) × 0.08`, category `"rent_review"`. Visible in admin commissions panel.
- [ ] Daily cron (`/api/cron/rent-review-triggers`) creates events at correct horizons. Running cron twice in the same day does NOT create duplicate events for the same lease/horizon combination.
- [ ] Leverage score displayed on Rent Clock page with colour band. Tooltip shows the explanation (at minimum 2 contributing factors).
- [ ] Dismissed events (`PATCH status to "dismissed"`) do not reappear in the queue or Action Queue.

---

## 8. Environment variables needed

| Variable | Feature | Urgency |
|----------|---------|---------|
| `COSTAR_API_KEY` | UK ERV comparables | Medium — fallback to MSCI benchmarks |
| `ATTOM_API_KEY` | US ERV data | Medium — fallback to static table |
| `DOCUSIGN_INTEGRATION_KEY` | HoT e-signature | High |
| `DOCUSIGN_USER_ID` | HoT e-signature | High |
| `DOCUSIGN_PRIVATE_KEY` | HoT e-signature | High |
| `CRON_SECRET` | Daily trigger | Already needed |

---

## 9. Priority build order

1. **Prisma migrations** — `RentReviewEvent` + `RenewalCorrespondence` models
2. **Daily cron** — `POST /api/cron/rent-review-triggers` (creates events at correct horizons)
3. **ERV data pull** — CoStar or MSCI benchmark on event creation
4. **Leverage score** — calculate on event creation, store on model
5. **Draft generation API** — `POST /api/user/rent-reviews/[reviewId]/draft` (Claude)
6. **Send API** — `POST /api/user/rent-reviews/[reviewId]/send` (Resend)
7. **Rent Clock UI** — add leverage score badge + Draft letter CTA to existing cards
8. **HoT flow** — `POST /api/user/rent-reviews/[reviewId]/hot` (DocuSign)
9. **Complete + commission** — `PATCH /api/user/rent-reviews/[reviewId]/complete`
10. **Tenants page** — add renewal status column
