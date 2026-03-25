# Wave 2 — AVM (Automated Valuation Model) Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-23
**Status:** Ready to build
**Revenue:** Direct: none (AVM is a trust-building tool). Indirect: enables every downstream commission (rent review, hold/sell, work orders, insurance benchmarking)
**Sources:** RealHQ-Spec-v3.2 Section 9, docs/wave-2-avm-validation.md, wave-2-hold-vs-sell-engineering-handoff.md

---

## Overview

A strong AVM foundation already exists:

| Component | Status |
|-----------|--------|
| `PropertyComparable` model (ATTOM data) | ✓ Built |
| `UserAsset.marketCapRate` + `marketRentSqft` | ✓ Fields exist |
| `GET /api/market/benchmarks` — static cap rates + ERV by class | ✓ Built |
| `GET /api/market/attom-benchmarks` — live ATTOM comps aggregate | ✓ Built |
| `src/lib/attom.ts` — ATTOM comparable fetch on US asset creation | ✓ Built |

**What's missing:**

- **No `AssetValuation` model** — valuations are computed inline ad-hoc in each route; nothing is stored or tracked over time
- **No per-asset valuation endpoint** — `GET /api/user/assets/:id/valuation` does not exist
- **No portfolio valuation endpoint** — dashboard shows no per-asset AVM total
- **No UK comparable data source** — `PropertyComparable` table only contains ATTOM (US) data; UK assets have no comparable sales backing
- **No valuation history** — no way to see how an asset's AVM has changed over quarters
- **No confidence score surfaced to the user** — the hold/sell and NOI bridge routes compute values from incomplete data without signalling uncertainty

Wave 2 adds all of these.

---

## What's already built (relevant to AVM)

- `PropertyComparable` — `assetId`, `attomId`, `address`, `sqft`, `saleAmount`, `saleDate`, `pricePerSqft`, `source = "attom"`
- `fetchAttomComparables(assetId, address)` — called on US asset creation; silently no-ops if `ATTOM_API_KEY` absent
- `GET /api/market/attom-benchmarks` — aggregates `PropertyComparable` rows into median price/sqft + derived ERV for FL
- `GET /api/market/benchmarks` — static quarterly benchmark table for SE UK and FL by asset class
- `UserAsset.marketCapRate` — stored on the asset; used in Hold vs Sell and NOI Bridge inline calculations
- `UserAsset.marketRentSqft` — stored on the asset
- `UserAsset.netIncome`, `grossIncome`, `passingRent`, `sqft` — core income inputs

---

## 1. Prisma schema additions

### `AssetValuation` — stored AVM result per asset

```prisma
model AssetValuation {
  id              String   @id @default(cuid())
  userId          String
  assetId         String

  // Primary method: income capitalisation
  noiEstimate     Float?   // Net Operating Income used, £/$
  capRateUsed     Float?   // cap rate applied (decimal, e.g. 0.055)
  capRateSource   String?  // "user_asset" | "attom_comps" | "market_benchmark" | "user_entered"
  incomeCapValue  Float?   // = noiEstimate / capRateUsed

  // Secondary method: capital value per sqft
  pricePerSqft    Float?   // median from PropertyComparable or benchmark
  sqftValue       Float?   // = pricePerSqft × sqft
  compsUsed       Int      @default(0)  // number of comparable sales used

  // Blended AVM
  avmValue        Float?   // weighted blend of incomeCapValue + sqftValue
  avmLow          Float?   // 15th-percentile estimate (or incomeCapValue × 0.92)
  avmHigh         Float?   // 85th-percentile estimate (or incomeCapValue × 1.08)
  confidenceScore Float?   // 0–1: 1.0 = full income + live comps, 0.3 = benchmark only

  // Attribution
  method          String   // "income_cap" | "psf_only" | "blended" | "insufficient_data"
  dataSource      String   // human-readable data attribution string
  notes           String?  @db.Text  // e.g. "EPC E penalty applied"

  // Deltas (compared to previous valuation)
  previousValue   Float?
  changeAbsolute  Float?
  changePct       Float?

  valuedAt        DateTime @default(now())
  createdAt       DateTime @default(now())

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@index([userId, valuedAt])
}
```

Add `valuations AssetValuation[]` to `UserAsset` and `User`.

### Add quick-lookup fields to `UserAsset`

```prisma
// Add to UserAsset:
  avmValue        Float?    // most recent AVM — updated on each revaluation
  avmDate         DateTime? // when avmValue was last computed
  avmConfidence   Float?    // 0–1, from most recent AssetValuation.confidenceScore
```

These mirror the latest `AssetValuation` row for fast retrieval in portfolio lists.

---

## 2. AVM calculation model

All logic in `src/lib/avm.ts`. Pure TypeScript — no external dependencies beyond Prisma.

### Primary method: income capitalisation

```ts
interface IncomeCapInputs {
  netIncome: number | null        // from UserAsset.netIncome (annual NOI)
  grossIncome: number | null      // fallback if netIncome null
  passingRent: number | null      // fallback: lease rent roll
  opexRatio: number               // default 0.30 for gross leases; 0.12 for NNN/FRI
  marketCapRate: number | null    // from UserAsset.marketCapRate
  fallbackCapRate: number         // from market/benchmarks static table
  sqft: number | null
  epcRating: string | null        // applies EPC penalty for UK assets
  wault: number | null            // WAULT penalty for short leases
}

interface IncomeCapResult {
  noiUsed: number
  capRateUsed: number
  capRateSource: string
  value: number
  adjustments: { label: string; bps: number }[]
}

export function calculateIncomeCap(inputs: IncomeCapInputs): IncomeCapResult | null {
  // Step 1: derive best NOI estimate
  const noi =
    inputs.netIncome ??
    (inputs.grossIncome ? inputs.grossIncome * (1 - inputs.opexRatio) : null) ??
    (inputs.passingRent ? inputs.passingRent * (1 - inputs.opexRatio) : null);

  if (!noi || noi <= 0) return null;

  // Step 2: select cap rate
  const baseCapRate = inputs.marketCapRate ?? inputs.fallbackCapRate;
  let adjustedCapRate = baseCapRate;
  const adjustments: { label: string; bps: number }[] = [];

  // WAULT adjustment: short WAULT → yield premium (higher cap rate = lower value)
  if (inputs.wault !== null) {
    const waultAdj =
      inputs.wault < 2  ? 75   :   // +75bps for <2yr WAULT
      inputs.wault < 4  ? 40   :   // +40bps for 2–4yr WAULT
      inputs.wault < 7  ? 15   :   // +15bps for 4–7yr WAULT
      0;
    if (waultAdj > 0) {
      adjustedCapRate += waultAdj / 10_000;
      adjustments.push({ label: `Short WAULT (${inputs.wault?.toFixed(1)}yr)`, bps: waultAdj });
    }
  }

  // EPC adjustment: UK assets with poor EPC ratings trade at a yield premium
  if (inputs.epcRating) {
    const epcAdj: Record<string, number> = { A: -10, B: -5, C: 0, D: 15, E: 35, F: 60, G: 90 };
    const bps = epcAdj[inputs.epcRating.toUpperCase()] ?? 0;
    if (bps !== 0) {
      adjustedCapRate += bps / 10_000;
      adjustments.push({ label: `EPC ${inputs.epcRating.toUpperCase()} rating`, bps });
    }
  }

  const capRateSource = inputs.marketCapRate
    ? "user_asset"
    : "market_benchmark";

  return {
    noiUsed: noi,
    capRateUsed: adjustedCapRate,
    capRateSource,
    value: noi / adjustedCapRate,
    adjustments,
  };
}
```

### Secondary method: capital value per sqft

```ts
interface PsfInputs {
  sqft: number
  pricePerSqft: number | null     // from ATTOM (US) or Land Registry (UK)
  p25PricePsf: number | null
  p75PricePsf: number | null
}

export function calculatePsfValue(inputs: PsfInputs): { mid: number; low: number; high: number } | null {
  if (!inputs.pricePerSqft || inputs.sqft <= 0) return null;
  return {
    mid:  inputs.sqft * inputs.pricePerSqft,
    low:  inputs.sqft * (inputs.p25PricePsf ?? inputs.pricePerSqft * 0.88),
    high: inputs.sqft * (inputs.p75PricePsf ?? inputs.pricePerSqft * 1.12),
  };
}
```

### Blended AVM

```ts
export function blendValuation(
  incomeCap: IncomeCapResult | null,
  psf: { mid: number; low: number; high: number } | null,
  compsCount: number,
): {
  avmValue: number | null
  avmLow: number | null
  avmHigh: number | null
  confidenceScore: number
  method: string
  dataSource: string
} {
  if (!incomeCap && !psf) {
    return { avmValue: null, avmLow: null, avmHigh: null,
             confidenceScore: 0, method: "insufficient_data", dataSource: "Insufficient data" };
  }

  if (incomeCap && psf && compsCount >= 3) {
    // Blend: 70% income cap, 30% psf when both available and ≥3 comps
    const avmValue = incomeCap.value * 0.7 + psf.mid * 0.3;
    // Range: blend ranges weighted same
    const avmLow  = (incomeCap.value * 0.92) * 0.7 + psf.low * 0.3;
    const avmHigh = (incomeCap.value * 1.08) * 0.7 + psf.high * 0.3;
    return {
      avmValue, avmLow, avmHigh,
      confidenceScore: Math.min(0.9, 0.6 + compsCount * 0.03),
      method: "blended",
      dataSource: `Income capitalisation (${(incomeCap.capRateUsed * 100).toFixed(2)}% cap rate) blended with ${compsCount} comparable sales`,
    };
  }

  if (incomeCap) {
    // Income cap only — confident if cap rate is from user's own asset data
    const score = incomeCap.capRateSource === "user_asset" ? 0.65 : 0.45;
    return {
      avmValue: incomeCap.value,
      avmLow: incomeCap.value * 0.90,
      avmHigh: incomeCap.value * 1.10,
      confidenceScore: score,
      method: "income_cap",
      dataSource: `Income capitalisation at ${(incomeCap.capRateUsed * 100).toFixed(2)}% cap rate (${incomeCap.capRateSource})`,
    };
  }

  // PSF only
  return {
    avmValue: psf!.mid,
    avmLow: psf!.low,
    avmHigh: psf!.high,
    confidenceScore: Math.min(0.5, 0.25 + compsCount * 0.05),
    method: "psf_only",
    dataSource: `Capital value per sqft from ${compsCount} comparable sales`,
  };
}
```

---

## 3. New API routes

### `GET /api/user/assets/:id/valuation`

Computes (or returns cached) AVM for a single asset. Stores result to `AssetValuation`.

```ts
// Response:
{
  assetId: string
  assetName: string
  avmValue: number | null
  avmLow: number | null
  avmHigh: number | null
  confidenceScore: number        // 0–1
  method: string                 // "blended" | "income_cap" | "psf_only" | "insufficient_data"
  dataSource: string             // data attribution
  capRateUsed: number | null
  capRateSource: string | null
  noiUsed: number | null
  adjustments: { label: string; bps: number }[]
  compsUsed: number
  pricePerSqft: number | null    // median from comps
  previousValue: number | null
  changePct: number | null
  valuedAt: string               // ISO timestamp
  currency: "GBP" | "USD"
}
```

**Caching:** If the most recent `AssetValuation` for this asset is < 7 days old, return it without recalculating. If `?refresh=true` query param: force recalculation regardless.

**Implementation sketch:**

```ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assetId } = await params;
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "true";

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    include: {
      comparables: { orderBy: { saleDate: "desc" }, take: 10 },
      valuations: { orderBy: { valuedAt: "desc" }, take: 2 },
    },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const latest = asset.valuations[0];
  const isFresh = latest && !forceRefresh &&
    (Date.now() - latest.valuedAt.getTime() < 7 * 24 * 3600 * 1000);

  if (isFresh) return NextResponse.json(mapValuationToResponse(asset, latest));

  // Recalculate
  const fallbackCapRate = getFallbackCapRate(asset.assetType, asset.country);
  const wault = await computeWAULT(session.user.id, assetId);  // from Lease table if available

  const incomeCap = calculateIncomeCap({
    netIncome: asset.netIncome,
    grossIncome: asset.grossIncome,
    passingRent: asset.passingRent,
    opexRatio: deriveOpExRatio(asset.assetType),
    marketCapRate: asset.marketCapRate,
    fallbackCapRate,
    sqft: asset.sqft,
    epcRating: asset.epcRating,
    wault,
  });

  const compPrices = asset.comparables
    .map(c => c.pricePerSqft)
    .filter((v): v is number => v !== null && v > 0);

  const psf = asset.sqft && compPrices.length >= 2
    ? calculatePsfValue({
        sqft: asset.sqft,
        pricePerSqft: median(compPrices),
        p25PricePsf: percentile(compPrices, 25),
        p75PricePsf: percentile(compPrices, 75),
      })
    : null;

  const blend = blendValuation(incomeCap, psf, compPrices.length);

  // Store result
  const saved = await prisma.assetValuation.create({
    data: {
      userId: session.user.id,
      assetId,
      noiEstimate: incomeCap?.noiUsed ?? null,
      capRateUsed: incomeCap?.capRateUsed ?? null,
      capRateSource: incomeCap?.capRateSource ?? null,
      incomeCapValue: incomeCap?.value ?? null,
      pricePerSqft: compPrices.length ? median(compPrices) : null,
      sqftValue: psf?.mid ?? null,
      compsUsed: compPrices.length,
      avmValue: blend.avmValue,
      avmLow: blend.avmLow,
      avmHigh: blend.avmHigh,
      confidenceScore: blend.confidenceScore,
      method: blend.method,
      dataSource: blend.dataSource,
      previousValue: latest?.avmValue ?? null,
      changeAbsolute: blend.avmValue && latest?.avmValue
        ? blend.avmValue - latest.avmValue : null,
      changePct: blend.avmValue && latest?.avmValue
        ? (blend.avmValue - latest.avmValue) / latest.avmValue : null,
    },
  });

  // Update quick-lookup on UserAsset
  await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      avmValue: blend.avmValue,
      avmDate: new Date(),
      avmConfidence: blend.confidenceScore,
    },
  });

  return NextResponse.json(mapValuationToResponse(asset, saved));
}
```

### `GET /api/user/portfolio/valuation`

Returns summed portfolio valuation across all assets, with per-asset breakdown.

```ts
// Response:
{
  totalValue: number | null
  currency: "GBP" | "USD"
  confidenceScore: number       // weighted average confidence
  assetsValued: number          // count with non-null avmValue
  assetsTotal: number
  breakdown: {
    assetId: string
    assetName: string
    avmValue: number | null
    avmLow: number | null
    avmHigh: number | null
    confidenceScore: number | null
    method: string | null
    changePct: number | null
  }[]
}
```

**Implementation:** Calls `GET /api/user/assets/:id/valuation` logic (or reads `UserAsset.avmValue` if fresh) for each asset in parallel, sums.

### `GET /api/user/assets/:id/valuation/history`

Returns time-series of `AssetValuation` records for charting.

```ts
// Query: ?months=12 (default 12)
// Response: { history: { valuedAt: string; avmValue: number; confidenceScore: number }[] }
```

---

## 4. UK comparable data — Land Registry

The US path uses ATTOM. For UK assets, comparable sales must come from HM Land Registry (free, government API).

### `GET https://landregistry.data.gov.uk/data/ppi/transaction-record.json`

Price Paid Index — all residential and commercial property transactions in England & Wales.

**For commercial use (limited):** The Land Registry PPD covers all transactions but does not distinguish commercial from residential in the same way. Commercial transactions are included but lack asset-type metadata. For Wave 2, use as a price-per-sqft reference filtered to the correct postcode sector.

```ts
// src/lib/land-registry.ts

export async function fetchLandRegistryComps(
  assetId: string,
  postcode: string,
  sqft: number | null,
): Promise<void> {
  // Only run if no existing UK comps for this asset
  const existing = await prisma.propertyComparable.count({
    where: { assetId, source: "land_registry" },
  });
  if (existing > 0) return;

  // Postcode sector = first 3–4 chars of postcode (e.g. "TN24" from "TN24 0AB")
  const sector = postcode.replace(/\s+/g, "").slice(0, -2);

  // Land Registry SPARQL endpoint
  const query = encodeURIComponent(`
    SELECT ?address ?pricePaid ?date ?type WHERE {
      ?trans a <http://landregistry.data.gov.uk/def/ppi/TransactionRecord> ;
        <http://landregistry.data.gov.uk/def/ppi/pricePaid> ?pricePaid ;
        <http://landregistry.data.gov.uk/def/ppi/transactionDate> ?date ;
        <http://landregistry.data.gov.uk/def/ppi/propertyAddress> ?addr .
      ?addr <http://landregistry.data.gov.uk/def/common/postcode> ?postcode .
      FILTER(STRSTARTS(?postcode, "${sector}"))
      FILTER(?date > "2022-01-01"^^xsd:date)
    } LIMIT 20
  `);

  const url = `https://landregistry.data.gov.uk/landregistry/query?query=${query}&output=json`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return;
    const data = await res.json();
    const bindings = data?.results?.bindings ?? [];

    for (const b of bindings) {
      const saleAmount = parseFloat(b.pricePaid?.value ?? "0");
      const saleDate = b.date?.value?.slice(0, 10) ?? null;
      const address = b.address?.value ?? "";
      // pricePerSqft: only calculable if we know sqft from comparable
      // For Wave 2: store saleAmount without psf; derive psf in aggregate
      if (saleAmount > 50_000) {
        await prisma.propertyComparable.upsert({
          where: { assetId_source_address: { assetId, source: "land_registry", address } },
          create: {
            assetId,
            address,
            saleAmount,
            saleDate,
            pricePerSqft: null,   // no sqft in LR data — use saleAmount in aggregate
            source: "land_registry",
          },
          update: { saleAmount, saleDate },
        });
      }
    }
  } catch (err) {
    console.error("[land-registry] fetch error:", err);
  }
}
```

**Wave 2 limitation:** Land Registry PPD does not include sqft for commercial properties. `pricePerSqft` will be null. The AVM PSF method will not work for UK assets in Wave 2. The income capitalisation method is the primary (and sole reliable) method for UK. This is expected and acceptable — UK commercial valuations are almost always income-cap based.

**Wave 3 path:** CoStar UK API provides full comparable sale data with sqft and cap rates for institutional subscribers (£12–20k/yr). Budget discussion needed before procurement.

### Add unique constraint for land registry comps

```prisma
// PropertyComparable — add:
  @@unique([assetId, source, address])  // prevent duplicates for land registry
```

---

## 5. Confidence score interpretation (for UI)

| Score | Label | Colour | Meaning |
|-------|-------|--------|---------|
| 0.80–1.00 | High confidence | Green `#0A8A4C` | Full income data + ≥3 live comps |
| 0.60–0.79 | Moderate | Amber `#F5A94A` | Income data present; cap rate from user asset |
| 0.40–0.59 | Estimated | Blue `#1647E8` | Market benchmark cap rate; limited comps |
| 0.00–0.39 | Indicative only | Gray `#9CA3AF` | Insufficient data; PSF only from few comps |

---

## 6. UI integration points

### 6a. Dashboard KPI strip — Portfolio Value tile

The dashboard KPI strip currently shows portfolio value derived inline. Replace with:

```ts
// Call GET /api/user/portfolio/valuation on dashboard load
// Display: £{total}M or "Valuation pending"
// Sub-text: "{N} assets valued · Avg confidence: {pct}%"
// On click: navigate to /valuations (new page, Wave 3) or expand modal
```

### 6b. Property detail page — Valuation card

On each property's detail view, add a **Valuation** card:

```
┌─────────────────────────────────────────────────────┐
│ AUTOMATED VALUATION                                  │
│                                                      │
│  £1.42M                          Confidence: ●●●○○  │
│  Range: £1.30M – £1.56M                 Moderate     │
│                                                      │
│  Cap rate applied:  5.75%  (SE UK Industrial)        │
│  NOI used:          £81,700 / yr                     │
│  Adjustments:       +15bps WAULT <4yr                │
│  3 comparable sales used                             │
│                                                      │
│  Last valued: 3 days ago  [Refresh →]                │
└─────────────────────────────────────────────────────┘
```

### 6c. Hold vs Sell — use AVM as estimated value

The `hold-sell-scenarios` route currently computes `estimatedValue = netIncome / capRate` inline. Wave 2: call `UserAsset.avmValue` if populated and fresh. Fall back to inline calculation if not.

```ts
// In hold-sell-scenarios route:
const estimatedValue = asset.avmValue
  ?? (annualIncome && capRate ? annualIncome / capRate : null);
```

### 6d. Scout underwriting — market cap rate cross-check

The Scout underwriting module (specced separately) uses `MARKET_CAP_RATES` from `scout-benchmarks.ts`. In Wave 2, this data should be sourced from `GET /api/market/benchmarks` — single source of truth. Update `calculateUnderwriting()` to call the benchmarks endpoint rather than the static table.

---

## 7. `getFallbackCapRate` — unified function

Consolidate the fallback cap rate logic used across Hold vs Sell, Scout underwriting, and AVM into a single function in `src/lib/avm.ts`:

```ts
// Asset types → normalised key
const CAP_RATES: Record<string, Record<string, number>> = {
  uk: {
    industrial:  0.0525, warehouse:   0.0525, logistics:   0.0525,
    office:      0.0575, retail:      0.065,  flex:        0.060,
    mixed:       0.0575, commercial:  0.0575,
  },
  us: {
    industrial:  0.060,  warehouse:   0.060,  logistics:   0.058,
    office:      0.0725, retail:      0.065,  flex:        0.065,
    mixed:       0.065,  commercial:  0.065,
  },
};

export function getFallbackCapRate(assetType: string | null, country: string | null): number {
  const region = (country ?? "").toUpperCase() === "UK" ? "uk" : "us";
  const type = (assetType ?? "").toLowerCase().replace(/[^a-z]/g, "");
  for (const key of Object.keys(CAP_RATES[region])) {
    if (type.includes(key)) return CAP_RATES[region][key];
  }
  return CAP_RATES[region].mixed;
}
```

Import this in: `hold-sell-scenarios/route.ts`, `src/lib/hold-sell-model.ts` (from Wave 2 Hold vs Sell spec), Scout underwriting module.

---

## 8. Environment variables

| Variable | Feature | Urgency |
|----------|---------|---------|
| `ATTOM_API_KEY` | US comparable sales (already integrated) | Medium — fallback is static |
| `COSTAR_API_KEY` | UK comparable sales (Wave 3) | Low — Land Registry covers Wave 2 |

---

## 9. Acceptance criteria

- [ ] `GET /api/user/assets/:id/valuation` returns `avmValue`, `avmLow`, `avmHigh`, `confidenceScore`, `method`, `dataSource` for an asset with `netIncome` + `marketCapRate` populated. Stores result to `AssetValuation`.
- [ ] Second call within 7 days returns cached result (same `AssetValuation.id`). `?refresh=true` forces recalculation.
- [ ] `UserAsset.avmValue` and `avmDate` are updated on each recalculation.
- [ ] For assets with `epcRating = "E"`, `capRateUsed` is 35bps higher than `marketCapRate`. Adjustment appears in `adjustments` array.
- [ ] For assets with WAULT < 2yr, `capRateUsed` is 75bps higher than base. Adjustment appears in `adjustments` array.
- [ ] US assets with ≥3 ATTOM comparables use blended method (70% income cap, 30% PSF). `method = "blended"`, `confidenceScore >= 0.6`.
- [ ] UK assets use income cap only (no PSF). `method = "income_cap"`. `pricePerSqft = null` acceptable.
- [ ] `GET /api/user/portfolio/valuation` returns sum of all per-asset AVM values, count of valued assets, weighted confidence score.
- [ ] Dashboard portfolio value KPI tile reads from `UserAsset.avmValue` sum (not inline calc). Shows "Valuation pending" when no `avmValue` populated.
- [ ] `hold-sell-scenarios` route uses `UserAsset.avmValue` as `estimatedValue` when available and fresh (< 7 days). Falls back to inline `netIncome / capRate`.
- [ ] `getFallbackCapRate()` is the single source of truth used in AVM, Hold vs Sell, and Scout underwriting. No other route hard-codes cap rates.
- [ ] `GET /api/user/assets/:id/valuation/history` returns chronological `AssetValuation` records for the asset.

---

## 10. Build order

1. **Prisma migration** — `AssetValuation` model + `UserAsset.avmValue / avmDate / avmConfidence` + `PropertyComparable` unique constraint for land registry
2. **`src/lib/avm.ts`** — `calculateIncomeCap`, `calculatePsfValue`, `blendValuation`, `getFallbackCapRate`, `median`, `percentile`
3. **`src/lib/land-registry.ts`** — Land Registry SPARQL fetch + upsert into `PropertyComparable` for UK assets
4. **`GET /api/user/assets/:id/valuation`** — core route: fetch asset + comps → calculate → store → return
5. **`GET /api/user/assets/:id/valuation/history`** — time-series endpoint
6. **`GET /api/user/portfolio/valuation`** — aggregate across all assets
7. **Trigger `fetchLandRegistryComps`** on UK asset creation (same pattern as `fetchAttomComparables` for US)
8. **Update `hold-sell-scenarios` route** — use `UserAsset.avmValue` when fresh
9. **Update dashboard KPI strip** — read from portfolio valuation endpoint
10. **Add Valuation card to property detail page** — confidence dots, range, cap rate breakdown, [Refresh] button
