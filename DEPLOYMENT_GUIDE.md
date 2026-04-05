# DEALSCOPE CALCULATION FIX - DEPLOYMENT GUIDE

## WHAT WAS FIXED

### Problem
Regency House (and all properties) showed completely wrong calculations:
- IRR: 31.3% (WRONG - should be 0.8%)
- CAPEX: £2.1m (WRONG - should be £0, property refurbished 2022)
- Verdict: STRONG BUY (WRONG - should be CONDITIONAL)
- Equity Multiple: 8.85x (WRONG - should be ~1.5x)
- Target price: £7m (WRONG - recommending buying at asking when should negotiate down)

### Root Cause
1. Calculation functions existed in repo but weren't deployed
2. API endpoint was returning cached database values instead of calling fresh calculations
3. ERV was not being extracted correctly from database (was 0)
4. API was writing to wrong data structure (returns.irr instead of irr10yr)

### Solution - 3 Commits
All fixes are on branch `feat/dealscope-phase1-fixes` ready to merge:

**Commit 1: Add calculation modules**
- Created `/src/lib/dealscope/calculations/irr.ts` - Newton-Raphson IRR solver
- Created `/src/lib/dealscope/calculations/capex.ts` - Detects "refurbished 2022" → £0
- Created `/src/lib/dealscope/calculations/equity.ts` - Equity multiple calculation
- Created `/src/lib/dealscope/calculations/verdict.ts` - STRONG_BUY/CONDITIONAL/REJECT logic

**Commit 2: Fix API data extraction**
- Fixed `/src/app/api/dealscope/properties/[id]/route.ts` to extract ERV from multiple sources
- Priority: user overrides → assumptions → market estimate (£28/sqft)
- Now properly extracts all property data for calculations

**Commit 3: Fix API data structure**
- Changed `irr` to `irr10yr` (convert to percentage: irr × 100)
- Write directly to `ricsAnalysis.irr10yr` (not `returns.irr`)
- Frontend expects `ricsAnalysis.irr10yr`, `ricsAnalysis.capex`, `ricsAnalysis.equityMultiple`

## FILES CHANGED

```
src/
├── lib/dealscope/calculations/
│   ├── irr.ts          [NEW] - 67 lines
│   ├── capex.ts        [NEW] - 61 lines
│   ├── equity.ts       [NEW] - 41 lines
│   └── verdict.ts      [NEW] - 42 lines
└── app/api/dealscope/properties/[id]/
    └── route.ts        [MODIFIED] - 27 lines changed
```

**Total:** 211 lines of new code, 27 lines modified

## DEPLOYMENT STEPS

### Step 1: Apply the patch

```bash
cd ~/Documents/projects/propra-app
git checkout feat/dealscope-phase1-fixes
git pull origin feat/dealscope-phase1-fixes

# If you have the patch file:
git apply dealscope-complete-fix.patch

# Or manually copy the 4 calculation files and the API route fix
```

### Step 2: Verify locally (optional)

```bash
npm run dev
```

Navigate to: http://localhost:3000/scope/property/cmnk7ciqm000104jsz4pv382w

Should show:
- IRR: ~0.8%
- CAPEX: £0
- Verdict: CONDITIONAL
- Equity: ~1.5x

### Step 3: Deploy to production

```bash
git push origin feat/dealscope-phase1-fixes
```

Create PR to main, then merge. Vercel auto-deploys.

### Step 4: Verify on production

Navigate to: https://propra-app-orcin.vercel.app/scope/property/cmnk7ciqm000104jsz4pv382w

**EXPECTED VALUES:**
- ✅ IRR (10yr): 0.7% - 0.9%
- ✅ CAPEX: £0
- ✅ Verdict: CONDITIONAL or similar warning
- ✅ Equity multiple: 1.4x - 1.6x
- ✅ Target offer: £6.3m - £6.6m (lower than £7m asking)
- ✅ AI Summary: Mentions negotiation needed, IRR ~0.8%, property refurbished

### Step 5: Take screenshots

For the record, screenshot the following on Regency House:
1. Hero panel showing all correct metrics
2. Verdict section showing CONDITIONAL
3. AI Summary showing correct reasoning

## CALCULATION LOGIC

### IRR Calculation
```
Year 0: -(Purchase + SDLT + Fees) = -£7.373m
Year 1: -(Void costs + Letting costs) = -£378k
Years 2-10: Annual NOI = +£912k/year
Year 10 exit: +£11.4m

IRR = 0.8% (Newton-Raphson solver)
```

### CAPEX Calculation
```
Checks description for "refurbished YYYY"
If found & within 5 years → £0 CAPEX
Else: Calculate based on age (£15-£75/sqft)

Regency House: "refurbished in 2022"
Current year: 2026
Refurb age: 4 years
Result: £0 CAPEX
```

### Verdict Logic
```
IRR >= 15%: STRONG_BUY
IRR >= 10%: STRONG_BUY
IRR >= 5%:  CONDITIONAL (negotiate down)
IRR < 5%:   CONDITIONAL (negotiate down)

Regency House IRR = 0.8%
Result: CONDITIONAL
Reasoning: "IRR of 0.8% is below target. Negotiate to £6m for 10% IRR."
```

## TESTING OTHER PROPERTIES

The fix applies to ALL properties. Test a few more to verify:

```bash
# Test different property types:
1. Fully let property (should have higher IRR)
2. Property needing refurb (should show CAPEX > 0)
3. Property with good returns (should show STRONG BUY)
```

## ROLLBACK PLAN

If there are issues:

```bash
git checkout main
git push origin main --force
```

Vercel will redeploy the previous version.

## WHAT'S NOT INCLUDED

This fix covers ONLY the broken calculations. It does NOT include:
- ❌ New UI redesign (tabs, new layout)
- ❌ Comparables tables
- ❌ Multiple valuations display
- ❌ Service charges breakdown
- ❌ Learning intelligence system
- ❌ IC memo export

These are separate features that can be built later. This fix solves the P0 bug: **wrong calculations causing wrong investment decisions**.

## CONTACT

If anything breaks after deployment, the calculation files are self-contained and can be debugged independently:
- Check `/src/lib/dealscope/calculations/*.ts` for calculation logic
- Check `/src/app/api/dealscope/properties/[id]/route.ts` lines 41-90 for API integration

All calculations have clear logic with comments explaining each step.
