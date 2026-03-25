# Wave 2 — Hold vs Sell Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-22
**Status:** Ready to build
**Revenue:** Advisory relationship (no direct commission in Wave 2); creates sell enquiry pipeline for Wave 3 transaction advisory
**Sources:** RealHQ-Spec-v3.2 Section 8, wave-2-product-brief.md, wave-2-avm-validation.md

---

## Overview

The Wave 1 Hold vs Sell page exists with a UI, a `useHoldSellScenarios` hook, and hero metrics. However:

- **The API route `/api/user/hold-sell-scenarios` does not exist** — the hook currently 404s for real users
- Scenarios are derived client-side using a simplified formula: `holdIRR = netYield + 2.5%`, `sellIRR = exitYield + 3.0%`
- There is no persistent model for scenarios — they are recalculated on every page load
- There are no user-adjustable assumptions
- There is no DCF model — only IRR comparison
- No "act on recommendation" flow — sell candidates have no CTA beyond a static label

Wave 2 adds:

1. **`GET /api/user/hold-sell-scenarios`** — the missing API route, using real DB data from `UserAsset`
2. **Proper 10-year DCF model** — NPV, IRR, equity multiple for both hold and sell scenarios
3. **AVM-linked market valuation** — uses `UserAsset.marketCapRate` and `marketRentSqft`, refreshable via revaluation
4. **Alternative deployment scenarios** — "sell and reinvest" NPV comparison with configurable redeployment yield
5. **User-adjustable assumptions** — rental growth, exit yield, hold period, capex
6. **`HoldSellScenario` model** — persist scenarios, avoid recalculating on every load
7. **Sell enquiry CTA** — owner-operator can flag an asset for potential sale; creates `SellEnquiry` record for RealHQ to follow up

---

## What's already built (Wave 1)

- Hold vs Sell page (`/hold-sell`) — hero metrics, asset cards, recommendation badges
- `useHoldSellScenarios` hook — calls `/api/user/hold-sell-scenarios` (returns 404), falls back to `deriveScenariosFromAssets` client-side
- `HoldSellRecommendation` component — "hold" / "sell" / "review" badge + rationale string
- `UserAsset.marketCapRate` — field exists, populated during onboarding
- `UserAsset.marketRentSqft` — field exists, populated during onboarding

---

## What needs to be built (Wave 2)

---

## 1. Prisma schema additions

### `HoldSellScenario` — stored scenario per asset

```prisma
model HoldSellScenario {
  id              String   @id @default(cuid())
  userId          String
  assetId         String   @unique  // one scenario per asset (refreshable)

  // Hold scenario inputs
  holdPeriodYears Int      @default(10)
  rentGrowthPct   Float    @default(0.025)  // 2.5% pa
  exitYield       Float?   // if null, use marketCapRate
  capexSchedule   Float    @default(0)      // annual capex as % of asset value
  vacancyAllowance Float   @default(0.05)   // 5% pa

  // Hold scenario outputs
  holdNPV         Float?
  holdIRR         Float?
  holdEquityMultiple Float?
  holdCashYield   Float?   // year-1 cash-on-cash (no leverage)

  // Sell scenario inputs
  estimatedSalePrice Float?
  sellingCostsPct Float   @default(0.02)   // 2% agent + legal
  redeploymentYield Float @default(0.06)  // assumed yield on reinvested capital

  // Sell scenario outputs
  sellNetProceeds Float?
  sellRedeployedNPV Float?
  sellIRR         Float?
  sellEquityMultiple Float?

  // Recommendation
  recommendation  String?  // "hold" | "sell" | "review"
  rationale       String?  @db.Text
  confidenceScore Float?   // 0–1, based on data completeness

  // Metadata
  lastCalculatedAt DateTime?
  dataSource       String   @default("estimated") // "estimated" | "avm" | "user_entered"
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
}
```

Add `holdSellScenario HoldSellScenario?` to `UserAsset`.
Add `holdSellScenarios HoldSellScenario[]` to `User`.

### `SellEnquiry` — flagged sell intent

```prisma
model SellEnquiry {
  id              String   @id @default(cuid())
  userId          String
  assetId         String
  targetPrice     Float?
  notes           String?  @db.Text
  status          String   @default("submitted") // "submitted" | "reviewing" | "listed" | "closed" | "withdrawn"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
}
```

Add `sellEnquiries SellEnquiry[]` to `UserAsset` and `User`.

---

## 2. DCF model

All calculations live in `src/lib/hold-sell-model.ts`. No external dependencies — pure TypeScript.

### Hold scenario NPV + IRR

```ts
interface HoldInputs {
  currentValue: number      // AVM or user-entered valuation, £
  passingRent: number       // annual passing rent, £
  marketERV: number         // market rental value, £ (for stabilised year)
  vacancyAllowance: number  // fraction (e.g. 0.05)
  opexPct: number           // operating costs as % of gross rent (default 0.15)
  rentGrowthPct: number     // annual rent growth (default 0.025)
  capexAnnual: number       // annual capex £ (default 0)
  exitYield: number         // cap rate at exit (default: marketCapRate)
  holdPeriodYears: number   // 5 or 10
  discountRate: number      // WACC / required return (default 0.08)
}

function calculateHoldScenario(inputs: HoldInputs): {
  cashFlows: number[]
  npv: number
  irr: number
  equityMultiple: number
  cashYield: number
} {
  const cashFlows: number[] = [-inputs.currentValue];  // initial equity outlay

  // Stabilise to ERV in year 1 (assume passing rent → ERV if below market)
  const baseRent = Math.max(inputs.passingRent, inputs.marketERV * 0.95);

  for (let y = 1; y <= inputs.holdPeriodYears; y++) {
    const rentY   = baseRent * Math.pow(1 + inputs.rentGrowthPct, y - 1);
    const netRentY = rentY * (1 - inputs.vacancyAllowance) * (1 - inputs.opexPct);
    const annualCF = netRentY - inputs.capexAnnual;

    if (y < inputs.holdPeriodYears) {
      cashFlows.push(annualCF);
    } else {
      // Exit in final year: terminal value = final year NOI / exitYield
      const exitNOI = rentY * (1 - inputs.vacancyAllowance) * (1 - inputs.opexPct);
      const terminalValue = exitNOI / inputs.exitYield;
      cashFlows.push(annualCF + terminalValue);
    }
  }

  const npv = calculateNPV(cashFlows, inputs.discountRate);
  const irr = calculateIRR(cashFlows);  // Newton-Raphson (see scout-engineering-handoff)
  const totalReturn = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const equityMultiple = totalReturn / inputs.currentValue;
  const cashYield = (cashFlows[1] / inputs.currentValue) * 100;  // yr-1 cash-on-cash

  return { cashFlows, npv, irr, equityMultiple, cashYield };
}
```

### Sell scenario NPV + IRR

```ts
interface SellInputs {
  currentValue: number
  estimatedSalePrice: number    // may differ from currentValue (negotiated uplift)
  sellingCostsPct: number       // 0.02 = 2% for agent + legal
  redeploymentYield: number     // 0.06 = 6% assumed yield on reinvested capital
  redeploymentGrowthPct: number // 0.025 growth on reinvested income
  holdPeriodYears: number       // comparison period (match hold scenario)
  discountRate: number
}

function calculateSellScenario(inputs: SellInputs): {
  netProceeds: number
  redeployedNPV: number
  irr: number
  equityMultiple: number
} {
  const netProceeds = inputs.estimatedSalePrice * (1 - inputs.sellingCostsPct);

  // Model reinvestment of proceeds at redeploymentYield
  const cashFlows: number[] = [-inputs.currentValue];  // original equity base for comparison
  const annualIncome = netProceeds * inputs.redeploymentYield;

  for (let y = 1; y <= inputs.holdPeriodYears; y++) {
    const incomeY = annualIncome * Math.pow(1 + inputs.redeploymentGrowthPct, y - 1);
    if (y < inputs.holdPeriodYears) {
      cashFlows.push(incomeY);
    } else {
      // Terminal value at same yield
      cashFlows.push(incomeY + netProceeds);
    }
  }

  const redeployedNPV = calculateNPV(cashFlows, inputs.discountRate);
  const irr = calculateIRR(cashFlows);
  const totalReturn = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const equityMultiple = totalReturn / inputs.currentValue;

  return { netProceeds, redeployedNPV, irr, equityMultiple };
}
```

### Recommendation logic

```ts
function deriveRecommendation(hold: HoldResult, sell: SellResult, asset: UserAsset): {
  recommendation: "hold" | "sell" | "review"
  rationale: string
  confidenceScore: number
} {
  // Confidence: 1.0 if AVM-sourced, 0.7 if estimated, 0.5 if no rent data
  const confidence =
    asset.marketCapRate && asset.passingRent ? 0.9 :
    asset.marketCapRate ? 0.7 :
    asset.netIncome ? 0.6 : 0.4;

  const irrGap = sell.irr - hold.irr;  // positive = sell is better
  const npvGap = sell.redeployedNPV - hold.npv;

  let recommendation: "hold" | "sell" | "review";

  if (irrGap > 0.02 && npvGap > 0) {
    recommendation = "sell";
  } else if (irrGap < -0.01 && hold.npv > sell.redeployedNPV) {
    recommendation = "hold";
  } else {
    recommendation = "review";
  }

  const rationale = {
    hold: `Hold IRR (${(hold.irr * 100).toFixed(1)}%) exceeds sell scenario (${(sell.irr * 100).toFixed(1)}%). Asset income growth and terminal value support continued ownership.`,
    sell: `Exit IRR (${(sell.irr * 100).toFixed(1)}%) exceeds hold IRR (${(hold.irr * 100).toFixed(1)}%) by ${(irrGap * 100).toFixed(1)}pp. Net proceeds of £${(sell.netProceeds / 1000).toFixed(0)}k redeployed at ${(sell.inputs.redeploymentYield * 100).toFixed(0)}% create superior risk-adjusted returns.`,
    review: `Hold and exit scenarios are comparable (IRR gap: ${(Math.abs(irrGap) * 100).toFixed(1)}pp). Recommend reviewing in 6 months or when a specific exit catalyst emerges.`,
  }[recommendation];

  return { recommendation, rationale, confidenceScore: confidence };
}
```

---

## 3. New API routes

### `GET /api/user/hold-sell-scenarios` — **THE CRITICAL MISSING ROUTE**

Returns hold vs sell analysis for all of the user's assets. This is called by the existing `useHoldSellScenarios` hook.

```ts
// Response shape (matches HoldSellScenarioResult in the hook):
{
  scenarios: {
    assetId: string
    assetName: string
    assetType: string
    location: string
    dataNeeded: boolean    // true if insufficient data to model
    holdIRR: number | null
    sellPrice: number | null
    sellIRR: number | null
    recommendation: "hold" | "sell" | "review" | null
    rationale: string | null
    estimatedValue: number | null
    // Wave 2 additions:
    holdNPV: number | null
    sellNPV: number | null
    holdEquityMultiple: number | null
    sellEquityMultiple: number | null
    confidenceScore: number | null
    lastCalculatedAt: string | null
  }[]
}
```

**Implementation:**

```ts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ scenarios: [] });

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    include: { holdSellScenario: true },
    orderBy: { createdAt: "asc" },
  });

  const scenarios = await Promise.all(assets.map(async (asset) => {
    // Determine market value
    const currentValue =
      asset.holdSellScenario?.estimatedSalePrice
      ?? (asset.netIncome && asset.marketCapRate
          ? asset.netIncome / asset.marketCapRate
          : null);

    const passingRent = asset.passingRent ?? asset.grossIncome ?? null;
    const marketERV   = asset.marketERV ?? (asset.marketRentSqft && asset.sqft
                          ? asset.marketRentSqft * asset.sqft : null);
    const marketCapRate = asset.marketCapRate ?? getDefaultCapRate(asset.assetType, asset.country);

    if (!currentValue || !passingRent) {
      return { assetId: asset.id, assetName: asset.name, assetType: asset.assetType,
               location: asset.location, dataNeeded: true,
               holdIRR: null, sellPrice: null, sellIRR: null,
               recommendation: null, rationale: null, estimatedValue: currentValue };
    }

    // Use stored scenario if fresh (< 7 days), otherwise recalculate
    const scenario = asset.holdSellScenario;
    const isFresh = scenario?.lastCalculatedAt
      && (Date.now() - scenario.lastCalculatedAt.getTime()) < 7 * 24 * 3600 * 1000;

    if (isFresh && scenario) {
      return mapScenarioToResult(asset, scenario);
    }

    // Recalculate
    const holdInputs: HoldInputs = {
      currentValue,
      passingRent,
      marketERV: marketERV ?? passingRent,
      vacancyAllowance: scenario?.vacancyAllowance ?? 0.05,
      opexPct: 0.15,
      rentGrowthPct: scenario?.rentGrowthPct ?? 0.025,
      capexAnnual: scenario?.capexSchedule ? currentValue * scenario.capexSchedule : 0,
      exitYield: scenario?.exitYield ?? marketCapRate,
      holdPeriodYears: scenario?.holdPeriodYears ?? 10,
      discountRate: 0.08,
    };

    const holdResult = calculateHoldScenario(holdInputs);
    const sellInputs: SellInputs = {
      currentValue,
      estimatedSalePrice: scenario?.estimatedSalePrice ?? currentValue * 1.03,
      sellingCostsPct: scenario?.sellingCostsPct ?? 0.02,
      redeploymentYield: scenario?.redeploymentYield ?? 0.06,
      redeploymentGrowthPct: 0.025,
      holdPeriodYears: holdInputs.holdPeriodYears,
      discountRate: 0.08,
    };

    const sellResult = calculateSellScenario(sellInputs);
    const { recommendation, rationale, confidenceScore } =
      deriveRecommendation(holdResult, sellResult, asset);

    // Upsert scenario record
    const saved = await prisma.holdSellScenario.upsert({
      where: { assetId: asset.id },
      create: {
        userId: session.user.id,
        assetId: asset.id,
        holdNPV: holdResult.npv,
        holdIRR: holdResult.irr,
        holdEquityMultiple: holdResult.equityMultiple,
        holdCashYield: holdResult.cashYield,
        sellNetProceeds: sellResult.netProceeds,
        sellRedeployedNPV: sellResult.redeployedNPV,
        sellIRR: sellResult.irr,
        sellEquityMultiple: sellResult.equityMultiple,
        recommendation,
        rationale,
        confidenceScore,
        lastCalculatedAt: new Date(),
        dataSource: "estimated",
        estimatedSalePrice: sellInputs.estimatedSalePrice,
      },
      update: {
        holdNPV: holdResult.npv,
        holdIRR: holdResult.irr,
        holdEquityMultiple: holdResult.equityMultiple,
        holdCashYield: holdResult.cashYield,
        sellNetProceeds: sellResult.netProceeds,
        sellRedeployedNPV: sellResult.redeployedNPV,
        sellIRR: sellResult.irr,
        sellEquityMultiple: sellResult.equityMultiple,
        recommendation,
        rationale,
        confidenceScore,
        lastCalculatedAt: new Date(),
      },
    });

    return mapScenarioToResult(asset, saved);
  }));

  return NextResponse.json({ scenarios });
}
```

### `POST /api/user/hold-sell-scenarios/:assetId/assumptions`

Allows the user to override default assumptions and recalculate.

```ts
// Body:
{
  holdPeriodYears?: number        // 5 or 10
  rentGrowthPct?: number          // e.g. 0.03 for 3%
  exitYield?: number              // e.g. 0.055 for 5.5%
  vacancyAllowance?: number       // e.g. 0.10 for 10%
  capexSchedule?: number          // e.g. 0.01 for 1% of value/yr
  estimatedSalePrice?: number     // user's target sale price
  redeploymentYield?: number      // assumed yield on reinvested capital
}
// Stores to HoldSellScenario, recalculates, returns updated scenario
// Response: { scenario: HoldSellScenarioResult }
```

### `POST /api/user/sell-enquiries`

Records the user's sell intent for a specific asset. Creates a `SellEnquiry` record.

```ts
// Body: { assetId: string; targetPrice?: number; notes?: string }
// Response: { enquiry: SellEnquiry }
// Side effect: sends internal notification email to RealHQ team
```

### `GET /api/user/sell-enquiries`

Returns the user's active sell enquiries.

```ts
// Response: { enquiries: (SellEnquiry & { asset: { name, location } })[] }
```

---

## 4. `getDefaultCapRate` fallback

When `UserAsset.marketCapRate` is null, fall back to static table — same as `scout-benchmarks.ts`:

```ts
// src/lib/hold-sell-model.ts
export function getDefaultCapRate(assetType: string, country: string | null): number {
  const region = country === "US" ? "fl_us" : "se_uk";
  return MARKET_CAP_RATES[region]?.[assetType.toLowerCase()] ?? 0.065;
}
```

---

## 5. UI changes to Hold vs Sell page

### 5a. Wire up real API data

The hook already calls the API. Once the route is built, the page renders real data without UI changes. Verify `deriveScenariosFromAssets` is only used for demo portfolios (not `portfolioId === "user"`). **This is the highest-priority item — critical fix first.**

### 5b. Asset card — Wave 2 enhancements

Each asset card currently shows: recommendation badge, sell price, hold IRR, sell IRR, rationale.

**Add:**
- NPV comparison row: `Hold NPV: £1.24M · Sell NPV: £1.18M` — displayed below IRR row
- Equity multiple: `Hold 1.8× · Sell 1.7×`
- Confidence indicator: small dot (green = high confidence, amber = estimated, red = insufficient data) next to recommendation badge

### 5c. Assumptions panel

Accordion below each asset card (collapsed by default). Shows current assumptions with edit capability:

```
─────────────────────────────────────────────
  ASSUMPTIONS                    [Edit]
  Hold period:      10 years
  Rent growth:       2.5% / yr
  Exit yield:        5.5%  (= market)
  Vacancy:           5.0%
  Annual capex:      £0
  Target sale price: £1.28M
  Redeployment rate: 6.0%
─────────────────────────────────────────────
```

**[Edit]** opens inline edit mode. On save, fires `POST /assumptions`. While recalculating, show a spinner over the card — response updates the card inline.

### 5d. Sell CTA

For assets with `recommendation === "sell"`:

Replace current static "Consider Sell" label with a CTA button:

```
[Flag for sale →]
```

Opens a confirmation modal:
```
┌────────────────────────────────────────────────────┐
│ Flag Ashford Industrial for potential sale          │
│                                                     │
│ Target price:  [£1,280,000]                         │
│ Notes:         [optional context for RealHQ team]   │
│                                                     │
│  RealHQ will review your portfolio and contact you  │
│  within 2 business days with comparable market data │
│  and an indicative valuation range.                 │
│                                                     │
│              [Confirm]  [Cancel]                    │
└────────────────────────────────────────────────────┘
```

On confirm: `POST /api/user/sell-enquiries`. Shows a success state on the card: "Sale enquiry submitted — RealHQ will be in touch."

### 5e. Summary bar — Wave 2 metrics

Current hero cells: Portfolio Hold Return, Best Exit Return, Assets Analysed, Recommended Exits.

**Add (as 5th cell on wide screens, or replace sub-text):**
- **Portfolio NPV:** total hold NPV across all assets
- **Capital at work:** sum of all estimated values

---

## 6. Prisma summary

```prisma
// New models:
HoldSellScenario   (one per UserAsset, upserted on recalculation)
SellEnquiry        (created by /sell-enquiries endpoint)

// Updates to UserAsset:
  holdSellScenario HoldSellScenario?
  sellEnquiries    SellEnquiry[]
```

---

## 7. Acceptance criteria

- [ ] `GET /api/user/hold-sell-scenarios` returns scenarios for all of the user's assets. No 404. For assets with `passingRent` + `marketCapRate`, returns `holdIRR`, `sellIRR`, `recommendation`, `rationale`. `dataNeeded: false`.
- [ ] For assets missing `passingRent` or `marketCapRate`, returns `dataNeeded: true` and all IRR/NPV fields as `null`.
- [ ] `HoldSellScenario` record is upserted on calculation. A second GET within 7 days uses the stored record and does NOT recalculate (reduces DB load).
- [ ] `POST /assumptions` with `{ rentGrowthPct: 0.04 }` recalculates and returns updated IRRs that differ from default. Assumption is persisted to `HoldSellScenario`.
- [ ] `POST /sell-enquiries` creates a `SellEnquiry` record with `status = "submitted"`. Returns 201.
- [ ] Hold vs Sell page for real users (not demo portfolios) calls the API and renders real data. `deriveScenariosFromAssets` is not called for `portfolioId === "user"`.
- [ ] Assumptions accordion renders current values. Edit mode allows changing `rentGrowthPct`, `exitYield`, `estimatedSalePrice`. Saving fires API and updates the card IRRs inline.
- [ ] "Flag for sale" modal on sell-recommended assets submits enquiry and shows confirmation state. Button replaced by "Enquiry submitted" on success.
- [ ] Confidence dots render on each card: green if `confidenceScore >= 0.8`, amber if `0.6–0.79`, red if `< 0.6`.
- [ ] `getDefaultCapRate` returns a non-null fallback for all asset types in both `se_uk` and `fl_us` regions.

---

## 8. Build order

1. **`src/lib/hold-sell-model.ts`** — pure DCF module: `calculateHoldScenario`, `calculateSellScenario`, `deriveRecommendation`, `getDefaultCapRate`, `calculateIRR`, `calculateNPV`
2. **Prisma migration** — `HoldSellScenario`, `SellEnquiry` models + `UserAsset` relations
3. **`GET /api/user/hold-sell-scenarios`** — THE critical missing route. Uses `hold-sell-model.ts`, upserts `HoldSellScenario`
4. **Verify hook + page** — confirm `useHoldSellScenarios` now resolves with real data; demo portfolio fallback still works
5. **`POST /api/user/hold-sell-scenarios/:assetId/assumptions`** — user overrides + recalculation
6. **`POST + GET /api/user/sell-enquiries`** — sell intent capture
7. **UI: assumptions accordion** — show/edit current inputs per asset card
8. **UI: NPV + equity multiple row** — add to each asset card
9. **UI: sell CTA modal** — "Flag for sale" → `POST /sell-enquiries`
10. **UI: hero enhancements** — portfolio NPV, capital at work cells
