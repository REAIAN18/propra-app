# Wave 2 — Acquisitions Scout Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-22
**Status:** Ready to build
**Revenue:** Facilitated transaction (no direct commission in Wave 2 — relationship asset leading to future advisory)
**Sources:** RealHQ-Spec-v3.2 Section 7, wave-2-product-brief.md, wave-2-avm-validation.md

---

## Overview

The Wave 1 Scout is a deal feed with swipe UX and basic signal detection. Wave 2 adds:

1. **Automated underwriting** — cap rate, NOI, yield, DSCR, and IRR calculated on every deal, stored and displayed
2. **Brochure / OM ingestion** — PDF upload wired to Textract + structured number extraction
3. **LOI generator** — Claude-drafted Letter of Intent at one click when user marks "interested"
4. **Deal pipeline** — track deals through stages from Scout → Due Diligence → Offer → Under Offer → Completed
5. **Deal feed ingestion** — CREXI (US) and EIG/CoStar comparable alerts (UK) for automated `ScoutDeal` creation
6. **Comparable sales** — Land Registry (UK) and county assessor (US) recent transactions attached to each deal

This is a Wave 2 feature. It runs on top of the Wave 1 Scout feed, `ScoutDeal`, and `ScoutReaction` models already built.

---

## What's already built (Wave 1)

- `ScoutDeal` model — address, assetType, sqft, askingPrice, guidePrice, sourceTag, signals (lisPendens, insolvency, planning, solar, flood), signalCount
- `ScoutReaction` model — userId × dealId × reaction ("interested" | "passed")
- `GET /api/scout/deals` — returns active deals with user reactions merged
- `POST /api/scout/deals/[dealId]/react` — records swipe reaction
- Scout page — swipe mode (first 8), grid mode, expanded panel, headline insight engine
- "Upload brochure" button — **present in UI, not wired to any backend**

---

## What needs to be built (Wave 2)

---

## 1. Prisma schema additions

### `ScoutUnderwriting` — underwriting model per deal

```prisma
model ScoutUnderwriting {
  id             String   @id @default(cuid())
  dealId         String   @unique
  userId         String

  // Inputs (from brochure, user entry, or estimated)
  passedRentPa   Float?   // current passing rent if tenanted, £/yr
  vacancyRate    Float?   // % vacant (0–1)
  opexPct        Float?   // operating cost as % of gross rent (default 0.15)
  capexEstimate  Float?   // one-time capex if repositioning, £

  // Derived metrics
  noiGross       Float?   // passedRentPa * (1 - vacancyRate)
  noinet         Float?   // noiGross * (1 - opexPct)
  capRate        Float?   // noinet / askingPrice (or guidePrice)
  marketCapRate  Float?   // from SE UK benchmark table or CoStar submarket
  capRateGap     Float?   // capRate - marketCapRate (positive = undervalued)
  yieldOnCost    Float?   // noinet / (askingPrice + capexEstimate)
  grossYield     Float?   // passedRentPa / askingPrice
  dscr           Float?   // noinet / annualDebtService (assuming 65% LTV, 5.5% rate, 25yr)
  irr5yr         Float?   // 5-year IRR assuming rent growth 2.5%/yr + exit at current cap rate

  dataSource     String   // "brochure" | "estimated" | "user_entered"
  notes          String?  @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  deal ScoutDeal @relation(fields: [dealId], references: [id], onDelete: Cascade)
  user User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add `underwriting ScoutUnderwriting?` to `ScoutDeal` and `underwrites ScoutUnderwriting[]` to `User`.

### `ScoutLOI` — generated Letter of Intent

```prisma
model ScoutLOI {
  id              String   @id @default(cuid())
  userId          String
  dealId          String
  offerPrice      Float
  depositPct      Float    @default(0.1)   // 10% default
  conditionalDays Int      @default(28)    // due diligence period
  completionDays  Int      @default(90)    // completion target
  specialConditions String? @db.Text
  body            String   @db.Text        // Claude-generated LOI text
  status          String   @default("draft")  // "draft" | "sent" | "countered" | "accepted" | "rejected"
  sentAt          DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  deal ScoutDeal @relation(fields: [dealId], references: [id], onDelete: Cascade)
}
```

Add `lois ScoutLOI[]` to `ScoutDeal` and `User`.

### `ScoutComparable` — recent transactions for pricing context

```prisma
model ScoutComparable {
  id            String   @id @default(cuid())
  dealId        String
  address       String
  assetType     String
  sqft          Int?
  salePrice     Float
  saleDate      DateTime
  pricePerSqft  Float?
  capRateAtSale Float?
  source        String   // "land_registry" | "eig" | "costar" | "manual"
  sourceRef     String?  // e.g. title number, transaction ID
  currency      String   @default("GBP")
  createdAt     DateTime @default(now())

  deal ScoutDeal @relation(fields: [dealId], references: [id], onDelete: Cascade)
}
```

Add `comparables ScoutComparable[]` to `ScoutDeal`.

### Schema additions to `ScoutDeal`

```prisma
// Add these fields to existing ScoutDeal model:
  pipelineStage  String?   // null (not started) | "interested" | "due_diligence" | "offer_made" | "under_offer" | "completed" | "withdrawn"
  pipelineUpdatedAt DateTime?
  brochureDocId  String?   // FK to Document model if brochure uploaded
  region         String?   // "se_uk" | "midlands" | "north_uk" | "fl_us" | "tx_us" | "ca_us"
  postcode       String?
  epcRating      String?   // A–G
  tenureType     String?   // "freehold" | "long_leasehold" | "short_leasehold"
  tenantCount    Int?
  wault          Float?    // weighted average unexpired lease term (years)
```

---

## 2. New API routes

### `GET /api/scout/deals/[dealId]`

Returns full deal detail including underwriting, comparables, LOIs, and pipeline stage.

```ts
// Response:
{
  deal: ScoutDeal & {
    underwriting: ScoutUnderwriting | null
    comparables: ScoutComparable[]
    lois: ScoutLOI[]
    userReaction: "interested" | "passed" | null
    pipelineStage: string | null
  }
}
```

### `POST /api/scout/deals/[dealId]/underwrite`

Calculates or recalculates underwriting metrics. Accepts user overrides.

```ts
// Body:
{
  passedRentPa?: number    // override — if null, estimated from ERV × sqft × (1 - 0.10)
  vacancyRate?: number     // override, default 0.10
  opexPct?: number         // override, default 0.15
  capexEstimate?: number   // optional CapEx for repositioning
  dataSource?: "user_entered" | "brochure" | "estimated"
}
// Response: { underwriting: ScoutUnderwriting }
```

**Server-side calculation logic:**

```ts
function calculateUnderwriting(input: {
  askingPrice: number
  sqft: number | null
  passedRentPa: number | null
  vacancyRate: number       // default 0.10
  opexPct: number           // default 0.15
  capexEstimate: number     // default 0
  marketCapRate: number     // from benchmark table — see section 4
}): Partial<ScoutUnderwriting> {

  // Estimate rent if not provided
  const estRent = input.passedRentPa
    ?? (input.sqft ? input.sqft * getMarketERV(assetType, region) : null);

  if (!estRent) return { dataSource: "estimated" };

  const noiGross = estRent * (1 - input.vacancyRate);
  const noinet   = noiGross * (1 - input.opexPct);
  const capRate  = noinet / input.askingPrice;
  const yieldOnCost = noinet / (input.askingPrice + input.capexEstimate);
  const grossYield  = estRent / input.askingPrice;

  // DSCR: assume 65% LTV, 5.5% annual rate, 25yr term
  const loanAmount       = input.askingPrice * 0.65;
  const monthlyRate      = 0.055 / 12;
  const nPayments        = 25 * 12;
  const monthlyPayment   = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, nPayments))
                           / (Math.pow(1 + monthlyRate, nPayments) - 1);
  const annualDebtService = monthlyPayment * 12;
  const dscr = noinet / annualDebtService;

  // 5-yr IRR: rent grows 2.5%/yr, exit at marketCapRate
  const rentGrowth = 0.025;
  const cashFlows = [-input.askingPrice];
  for (let y = 1; y <= 5; y++) {
    const rentY = estRent * Math.pow(1 + rentGrowth, y);
    const noiY  = rentY * (1 - input.vacancyRate) * (1 - input.opexPct);
    const cf = y < 5
      ? noiY - annualDebtService
      : noiY - annualDebtService + (rentY * (1 - input.vacancyRate) * (1 - input.opexPct)) / input.marketCapRate;
    cashFlows.push(cf);
  }
  const irr5yr = calculateIRR(cashFlows); // Newton-Raphson

  return {
    noiGross, noinet, capRate, marketCapRate: input.marketCapRate,
    capRateGap: capRate - input.marketCapRate,
    yieldOnCost, grossYield, dscr, irr5yr,
    passedRentPa: estRent,
    dataSource: input.passedRentPa ? "user_entered" : "estimated",
  };
}
```

### `POST /api/scout/deals/[dealId]/loi`

Generates a Letter of Intent via Claude and stores it.

```ts
// Body:
{
  offerPrice: number
  depositPct?: number          // default 0.10
  conditionalDays?: number     // default 28
  completionDays?: number      // default 90
  specialConditions?: string
}
// Response: { loi: ScoutLOI }
```

**Claude prompt:**

```
Draft a commercial property Letter of Intent (LOI) from buyer to vendor.

Property: {address}
Asset type: {assetType}
Sqft: {sqft}
Offer price: {sym}{offerPrice}
Asking price: {sym}{askingPrice or guidePrice}
Deposit: {depositPct}% of purchase price on exchange
Due diligence period: {conditionalDays} days from acceptance
Target completion: {completionDays} days from exchange
{specialConditions ? "Special conditions: " + specialConditions : ""}
Underwriting summary: Cap rate {capRate}%, Gross yield {grossYield}%, DSCR {dscr}x

Write a professional, concise LOI. Buyer is an owner-operator acquiring for portfolio.
State clearly: offer price, deposit, DD period, conditions, completion timeline.
UK formal legal register. No fees, agents, or advisers mentioned.
Do not include RealHQ. Write as if directly from the buyer.
Close with signature block placeholders.
```

### `PATCH /api/scout/deals/[dealId]/pipeline`

Updates pipeline stage for a deal.

```ts
// Body: { stage: "interested" | "due_diligence" | "offer_made" | "under_offer" | "completed" | "withdrawn" }
// Response: { deal: { id, pipelineStage, pipelineUpdatedAt } }
```

### `POST /api/scout/deals/[dealId]/brochure`

Accepts PDF upload, runs AWS Textract, extracts financial numbers, stores as Document and triggers underwriting calculation.

```ts
// Body: multipart/form-data — file: PDF
// Process:
//   1. Upload to S3 (same pattern as lease upload)
//   2. Textract async job → extract text
//   3. Claude prompt to parse: "Extract from this property brochure:
//      - Asking price, guide price
//      - Passing rent (annual)
//      - Tenancy schedule (tenants, expiries, passing rents)
//      - WAULT
//      - Net initial yield quoted
//      - EPC rating
//      Return as JSON."
//   4. Patch ScoutDeal with extracted fields
//   5. POST to /underwrite with extracted passedRentPa
// Response: { documentId: string; extracted: {...} }
```

### `GET /api/scout/deals/[dealId]/comparables`

Returns comparable transactions, fetched lazily on deal expansion.

```ts
// If ScoutComparable records exist for dealId, return them.
// If not, fetch from Land Registry (UK) or static table, store, return.
// Response: { comparables: ScoutComparable[] }
```

### `GET /api/scout/pipeline`

Returns all deals the user has moved past "interested" stage — the active acquisition pipeline.

```ts
// Response:
{
  pipeline: {
    stage: string
    deals: {
      id: string
      address: string
      assetType: string
      offerPrice: number | null    // from most recent LOI
      askingPrice: number | null
      capRate: number | null
      dscr: number | null
      pipelineUpdatedAt: string
    }[]
  }[]
}
```

---

## 3. Deal feed ingestion — `POST /api/cron/scout-feed`

Daily cron. Pulls new deals from external sources and creates `ScoutDeal` records. Protected by `CRON_SECRET`.

### UK: EIG Auctions + CoStar comparable alerts

```ts
// If EIG_API_KEY in env:
// GET https://api.eigpropertyauctions.co.uk/v1/lots?region=south_east&assetType=industrial,warehouse
// Map fields → ScoutDeal:
//   address, sqft, guidePrice, auctionDate, sourceTag = "Auction"
//   signalCount: start at 1 (has auction date)
```

**EIG fallback (no API key):** Static seed data per region (already have SE UK logistics deals from `se-logistics.ts`) — skip new ingestion, leave existing demo data.

### UK: Land Registry "long hold" signals

```ts
// Once per week (Wednesday run):
// Query Land Registry title register for assets in target postcodes
// Flag assets with last transaction date > 10 years ago + asset type match
// Create ScoutDeal with sourceTag = "Pre-market", lastSaleYear, ownerName from Companies House
// signalCount: 2 (long hold + owner identified)
```

### US: CREXI feed

```ts
// If CREXI_API_KEY in env:
// GET https://api.crexi.com/v1/listings?property_types=industrial,flex&state=FL,TX&status=active
// Map fields → ScoutDeal:
//   address, sqft, askingPrice, assetType, currency = "USD"
//   sourceTag = "Pre-market" or "Auction" based on listing type
//   signalCount: count of available signals
```

### Signal enrichment on creation

After creating a `ScoutDeal`, run signal enrichment:

```ts
async function enrichScoutDeal(dealId: string) {
  const deal = await prisma.scoutDeal.findUnique({ where: { id: dealId } });
  let signalCount = 0;

  // 1. Companies House insolvency check (UK)
  if (deal.ownerName) {
    const insolvency = await checkCompaniesHouseInsolvency(deal.ownerName);
    if (insolvency) { signalCount++; /* update hasInsolvency */ }
  }

  // 2. Planning portal (UK) — within 0.25mi
  const planning = await checkPlanningApplications(deal.postcode);
  if (planning.length > 0) { signalCount++; /* update hasPlanningApplication */ }

  // 3. Solar estimate from EPC roof area (or sqft proxy)
  const solarEst = estimateSolarIncome(deal.sqft, deal.region);
  if (solarEst > 0) signalCount++;

  // 4. Flood zone check
  const flood = await checkFloodZone(deal.postcode);
  if (flood) signalCount++;

  // 5. Auction date signal
  if (deal.auctionDate) signalCount++;

  await prisma.scoutDeal.update({ where: { id: dealId }, data: { signalCount } });

  // 6. Create ScoutComparables from Land Registry within 0.5mi
  await fetchAndStoreComparables(dealId, deal.postcode, deal.assetType);
}
```

---

## 4. Market cap rate benchmarks

Used as `marketCapRate` in underwriting when CoStar submarket data is not available.

```ts
// src/lib/data/scout-benchmarks.ts
export const MARKET_CAP_RATES: Record<string, Record<string, number>> = {
  se_uk: {
    industrial:  0.055,  // 5.5% — SE UK logistics/warehouse
    warehouse:   0.055,
    office:      0.065,  // 6.5% — SE UK out-of-town office
    retail:      0.075,  // 7.5% — SE UK high street retail
    flex:        0.060,
    mixed:       0.060,
  },
  midlands: {
    industrial:  0.060,
    warehouse:   0.058,
    office:      0.075,
    retail:      0.080,
    flex:        0.065,
    mixed:       0.065,
  },
  fl_us: {
    industrial:  0.060,
    warehouse:   0.058,
    office:      0.070,
    retail:      0.065,
    flex:        0.062,
    mixed:       0.065,
  },
};

export const MARKET_ERV: Record<string, Record<string, number>> = {
  // £ per sqft per year
  se_uk: {
    industrial:  11.50,  // mid of £9.50–14.50 range
    warehouse:   11.50,
    office:      28.00,  // SE UK out-of-town
    retail:      35.00,  // zone A estimate
    flex:        14.00,
    mixed:       12.00,
  },
  fl_us: {
    industrial:  9.50,   // $ per sqft
    warehouse:   9.50,
    office:      22.00,
    retail:      28.00,
    flex:        12.00,
    mixed:       11.00,
  },
};
```

---

## 5. UI changes to Scout page (`/scout`)

### 5a. Expanded panel — wire brochure upload

The "Upload brochure or marketing pack" button (currently a no-op) should:
1. Open a file input accepting PDF
2. `POST /api/scout/deals/[dealId]/brochure` with the file
3. Show a loading state "Extracting numbers…" (≈5 seconds)
4. On success: refresh the expanded panel, show underwriting section

### 5b. Expanded panel — underwriting strip

Below the "Signals Found" section, add an **Underwriting** section:

```
┌──────────────────────────────────────────────────────┐
│ UNDERWRITING                                          │
│                                                       │
│ Cap rate         6.2%   vs. market 5.5% ↑ 70bps      │
│ Gross yield      7.1%                                  │
│ DSCR             1.24×  (65% LTV, 5.5%)               │
│ 5-yr IRR         12.4%                                 │
│                                                       │
│ [Adjust assumptions]         [Draft LOI →]            │
└──────────────────────────────────────────────────────┘
```

**Colour coding:**
- Cap rate above market: green `#0A8A4C` with up arrow
- Cap rate below market: amber `#F5A94A` with down arrow
- DSCR ≥ 1.20: green; 1.0–1.19: amber; < 1.0: red
- 5-yr IRR ≥ 12%: green; 8–11.9%: amber; < 8%: red

**[Adjust assumptions] button:** Opens a modal with sliders for passedRentPa, vacancyRate, opexPct, capexEstimate. On change, fires `POST /api/scout/deals/[dealId]/underwrite` and re-renders the strip inline.

**[Draft LOI →] button:**
- Opens LOI modal (see 5c)
- Only visible after "Interested" reaction

### 5c. LOI modal

Triggered by "Draft LOI →" button. Full-screen modal.

```
┌────────────────────────────────────────────────────────────┐
│ Draft Letter of Intent                                      │
│                                                             │
│ Offer price:    [_______________]  (asking: £1.25M)         │
│ Deposit:        [10%]                                       │
│ DD period:      [28 days]                                   │
│ Completion:     [90 days]                                   │
│ Special terms:  [_______________]                           │
│                                                             │
│                   [Generate LOI →]                         │
│                                                             │
│ ────────────────── GENERATED ──────────────────            │
│ [Claude-generated LOI text — editable textarea]            │
│                                                             │
│               [Copy]  [Download PDF]  [Mark as Sent]       │
└────────────────────────────────────────────────────────────┘
```

**Generate LOI →**: `POST /api/scout/deals/[dealId]/loi` — returns body, renders in textarea below.

**Mark as Sent**: `PATCH /api/scout/deals/[dealId]/loi/{loiId}` `{ status: "sent" }` + `PATCH /api/scout/deals/[dealId]/pipeline` `{ stage: "offer_made" }`.

### 5d. Pipeline tab

New tab on the Scout page: **Pipeline** (alongside the default feed).

Shows a Kanban-style column view of all deals the user has moved to pipeline stages:

```
Interested (3)  |  Due Diligence (1)  |  Offer Made (2)  |  Under Offer (1)  |  Completed (0)
```

Each column shows mini cards with address, asking price, and cap rate badge. Drag-and-drop optional (Wave 3); click card to open expanded panel.

Data source: `GET /api/scout/pipeline`.

### 5e. Comparables panel

In the expanded deal panel, add a **Comparable Transactions** accordion below the underwriting strip:

```
COMPARABLE TRANSACTIONS (3 found within 0.5mi, last 24 months)

Unit 4 Terminus Rd, Chichester    15,200 sqft  £2.1M   Jun 2024  £138/sqft
Unit 7 Terminus Rd, Chichester    12,000 sqft  £1.6M   Feb 2024  £133/sqft
Highfield Park, Southampton       20,400 sqft  £2.9M   Nov 2023  £142/sqft

Subject property implied value: £1.75M–£1.85M at comparable £/sqft
```

Data source: `GET /api/scout/deals/[dealId]/comparables` — lazy loaded on accordion expand.

---

## 6. Prisma full additions summary

```prisma
// Add to ScoutDeal:
  pipelineStage     String?
  pipelineUpdatedAt DateTime?
  brochureDocId     String?
  region            String?
  postcode          String?
  epcRating         String?
  tenureType        String?
  tenantCount       Int?
  wault             Float?
  underwriting      ScoutUnderwriting?
  lois              ScoutLOI[]
  comparables       ScoutComparable[]

// New models (see section 1):
  ScoutUnderwriting
  ScoutLOI
  ScoutComparable
```

---

## 7. Environment variables needed

| Variable | Feature | Urgency |
|----------|---------|---------|
| `EIG_API_KEY` | UK auction deal feed | Medium — fallback to demo data |
| `CREXI_API_KEY` | US deal feed | Medium — fallback to demo data |
| `CRON_SECRET` | Scout feed daily cron | Already needed |

---

## 8. Acceptance criteria

- [ ] Scout expanded panel shows underwriting strip (cap rate, gross yield, DSCR, 5-yr IRR) on all deals where sqft + askingPrice are present. Values derived from calculation, not hardcoded.
- [ ] Cap rate displayed with market benchmark comparison (e.g. "6.2% vs market 5.5%"). Market rate sourced from `scout-benchmarks.ts` by asset type + region.
- [ ] "Upload brochure" button in expanded panel wired: PDF upload → Textract → Claude extraction → underwriting recalculated. Extracted passedRentPa updates the underwriting strip within 15 seconds.
- [ ] "Draft LOI" button visible after "Interested" reaction. Clicking opens LOI modal. Completing modal + "Generate LOI" fires Claude prompt and renders LOI text in editable textarea. Generation < 10 seconds.
- [ ] LOI text does not mention RealHQ, adviser, or agent. Contains: address, offer price, deposit, DD period, completion timeline, buyer signature placeholder.
- [ ] "Mark as Sent" on LOI modal updates deal pipeline stage to `offer_made`.
- [ ] Pipeline tab renders all deals with stage ≠ null, grouped by stage column.
- [ ] Comparables accordion in expanded panel lazy-loads on click. Shows ≥ 1 comparable if within 0.5mi (UK deals). Shows implied value range if ≥ 2 comparables found.
- [ ] `POST /api/cron/scout-feed` with `CRON_SECRET` creates `ScoutDeal` records from EIG (UK) or CREXI (US) when API keys present. Does not create duplicates for the same address within 30 days.
- [ ] Running cron twice in the same day does NOT duplicate deals.

---

## 9. Priority build order

1. **Prisma migrations** — `ScoutUnderwriting`, `ScoutLOI`, `ScoutComparable` + `ScoutDeal` field additions
2. **`scout-benchmarks.ts`** — market cap rates + ERV table by region/type
3. **Underwriting calculation** — `POST /api/scout/deals/[dealId]/underwrite` + `calculateUnderwriting()` util
4. **Expanded panel — underwriting strip** — render in Scout page, "Adjust assumptions" modal
5. **LOI generation** — `POST /api/scout/deals/[dealId]/loi` (Claude) + LOI modal in UI
6. **Pipeline tab + `GET /api/scout/pipeline`** — Kanban view, `PATCH /pipeline` stage updates
7. **Brochure upload** — `POST /api/scout/deals/[dealId]/brochure` + Textract + Claude extraction, wire to panel
8. **Comparables** — `ScoutComparable` fetch + accordion in expanded panel
9. **Deal feed cron** — `POST /api/cron/scout-feed` (EIG/CREXI ingestion + signal enrichment)
10. **`GET /api/scout/deals/[dealId]`** — full detail endpoint used by expanded panel
