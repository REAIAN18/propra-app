# avm.ts — self-test block (P0-3 acceptance test)

Run with: `npx ts-node --project tsconfig.json src/lib/avm.ts` or paste into a test file.

```ts
// ts-node smoke test for src/lib/avm.ts
// Matches acceptance test P0-3 in wave-2-sprint-acceptance-tests.md

import {
  calculateIncomeCap,
  blendValuation,
  getFallbackCapRate,
  calculateNPV,
  calculateIRR,
  median,
  percentile,
} from "./src/lib/avm";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  PASS: ${msg}`);
}
function approxEq(a: number, b: number, tol = 0.001) {
  return Math.abs(a - b) < tol;
}

// ── getFallbackCapRate ─────────────────────────────────────────────────────
assert(getFallbackCapRate("warehouse", "UK")       === 0.0525, "UK warehouse cap rate");
assert(getFallbackCapRate("industrial", "UK")      === 0.0525, "UK industrial cap rate");
assert(getFallbackCapRate("office", "UK")          === 0.0575, "UK office cap rate");
assert(getFallbackCapRate("industrial", "US")      === 0.060,  "US industrial cap rate");
assert(getFallbackCapRate(null, "UK")              === 0.0575, "UK null→mixed cap rate");

// ── calculateIncomeCap ─────────────────────────────────────────────────────
// Base: £81,700 NOI / 5.75% = £1,420,869.57 (UK office, no adjustments)
const baseCap = calculateIncomeCap({
  netIncome: 81_700,
  grossIncome: null,
  passingRent: null,
  opexRatio: 0.12,
  marketCapRate: 0.0575,
  fallbackCapRate: 0.0575,
  sqft: null,
  epcRating: null,
  wault: null,
});
assert(baseCap !== null, "base income cap returns result");
assert(approxEq(baseCap!.value, 81_700 / 0.0575, 1), "base cap value ≈ £1.42M");
assert(baseCap!.adjustments.length === 0, "no adjustments on clean asset");
assert(baseCap!.capRateSource === "user_asset", "cap rate source = user_asset");

// EPC E penalty: +35bps
const epcE = calculateIncomeCap({
  netIncome: 81_700,
  grossIncome: null,
  passingRent: null,
  opexRatio: 0.12,
  marketCapRate: 0.0575,
  fallbackCapRate: 0.0575,
  sqft: null,
  epcRating: "E",
  wault: null,
});
assert(epcE !== null, "EPC E returns result");
assert(approxEq(epcE!.capRateUsed, 0.0575 + 0.0035), "EPC E adds 35bps");
assert(epcE!.adjustments.some((a) => a.label.includes("EPC E")), "EPC E in adjustments");

// Short WAULT penalty: <2yr = +75bps
const shortWault = calculateIncomeCap({
  netIncome: 81_700,
  grossIncome: null,
  passingRent: null,
  opexRatio: 0.12,
  marketCapRate: 0.0575,
  fallbackCapRate: 0.0575,
  sqft: null,
  epcRating: null,
  wault: 1.5,
});
assert(shortWault !== null, "short WAULT returns result");
assert(approxEq(shortWault!.capRateUsed, 0.0575 + 0.0075), "WAULT <2yr adds 75bps");

// Null income → null result
const noIncome = calculateIncomeCap({
  netIncome: null,
  grossIncome: null,
  passingRent: null,
  opexRatio: 0.30,
  marketCapRate: null,
  fallbackCapRate: 0.0575,
  sqft: null,
  epcRating: null,
  wault: null,
});
assert(noIncome === null, "null income returns null");

// ── blendValuation ─────────────────────────────────────────────────────────
const blend = blendValuation(baseCap, null, 0);
assert(blend.method === "income_cap", "no PSF → income_cap method");
assert(blend.avmValue !== null, "blend returns value");

const noDataBlend = blendValuation(null, null, 0);
assert(noDataBlend.method === "insufficient_data", "no data → insufficient_data");
assert(noDataBlend.avmValue === null, "insufficient_data → null value");

// ── median / percentile ────────────────────────────────────────────────────
assert(median([1, 2, 3]) === 2, "median of [1,2,3] = 2");
assert(median([1, 3]) === 2, "median of [1,3] = 2");
assert(median([]) === null, "median of [] = null");
assert(percentile([1, 2, 3, 4], 25) !== null, "p25 returns value");

// ── calculateNPV ──────────────────────────────────────────────────────────
// Simple: invest £100 at t=0, receive £110 at t=1 at 10% → NPV = 0
const npv = calculateNPV([-100, 110], 0.10);
assert(approxEq(npv, 0, 0.001), "NPV of [-100, 110] at 10% ≈ 0");

// ── calculateIRR ──────────────────────────────────────────────────────────
// Known IRR: invest £100, receive £110 at t=1 → IRR = 10%
const irr = calculateIRR([-100, 110]);
assert(approxEq(irr, 0.10, 0.0001), "IRR of [-100, 110] ≈ 10%");

// Multi-year IRR
const irr2 = calculateIRR([-1_000_000, 60_000, 60_000, 60_000, 60_000, 60_000, 60_000, 60_000, 60_000, 60_000, 1_150_000]);
assert(!isNaN(irr2), "10-year hold IRR converges");
assert(irr2 > 0.05 && irr2 < 0.10, "10-year hold IRR in plausible range");

console.log("\n✓ All avm.ts assertions passed.");
```

## Expected output

```
  PASS: UK warehouse cap rate
  PASS: UK industrial cap rate
  PASS: UK office cap rate
  PASS: US industrial cap rate
  PASS: UK null→mixed cap rate
  PASS: base income cap returns result
  PASS: base cap value ≈ £1.42M
  PASS: no adjustments on clean asset
  PASS: cap rate source = user_asset
  PASS: EPC E returns result
  PASS: EPC E adds 35bps
  PASS: EPC E in adjustments
  PASS: short WAULT returns result
  PASS: WAULT <2yr adds 75bps
  PASS: null income returns null
  PASS: no PSF → income_cap method
  PASS: blend returns value
  PASS: no data → insufficient_data
  PASS: insufficient_data → null value
  PASS: median of [1,2,3] = 2
  PASS: median of [1,3] = 2
  PASS: median of [] = null
  PASS: p25 returns value
  PASS: NPV of [-100, 110] at 10% ≈ 0
  PASS: IRR of [-100, 110] ≈ 10%
  PASS: 10-year hold IRR converges
  PASS: 10-year hold IRR in plausible range

✓ All avm.ts assertions passed.
```
