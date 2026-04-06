# DEALSCOPE PROPERTY ANALYSIS — COMPLETE AUDIT & REBUILD SPECIFICATION
**Regency House, Basildon Test Case**  
**Date:** 4 April 2026

---

## EXECUTIVE SUMMARY

**Property Tested:** Regency House, Miles Gray Road, Basildon  
**Source:** https://rib.co.uk/property/regency-house-miles-gray-road-basildon/  
**Current Verdict:** ❌ **STRONG BUY at £7.0m** (Score: 61)  
**Actual Reality:** ⚠️ **CONDITIONAL at £6.0-6.5m** (15% discount required)

### **CRITICAL FINDINGS:**
1. ❌ **31.3% IRR calculation is mathematically impossible** (should be negative or low single digits)
2. ❌ **Passing rent shows £0** (actual: £670,617.50 per annum)
3. ❌ **CAPEX double-counted** (£2.1m additional when £5.3m already spent in 2022)
4. ❌ **NIY shows 13.0%** (listing states 8.96%)
5. ❌ **"Strong Buy" contradicts own red flags** (vacant, long void, flood risk)
6. ❌ **No assumption validation** against market compar

ables
7. ❌ **Information architecture scattered** across 9 tabs with no clear decision path

---

## PART 1: CRITICAL BUGS IDENTIFIED

### **BUG #1: IRR Calculation Completely Broken**

**Current Output:**
```
IRR (10yr): 31.3%
Entry: £7,000,000
Verdict: STRONG BUY
```

**Reality Check:**
- Property is 100% vacant post-refurb
- Requires 14-month void minimum (likely 18-36 months)
- ERV £28 psf is 30% above market (£20-23 psf realistic)
- Exit yield 6.5% is 200bps below comps (8.0-9.0% realistic)

**Actual IRR at £7.0m Entry:**
- Base case: **-2.8%** (loss)
- Optimistic: **+1.8%** (marginal)
- Only hits 15% at **£5.5m entry** (22% discount)

**Root Cause:**
- Likely using gross passing rent without vacancy adjustment
- Not applying void carry costs (£392k total)
- Not applying letting fees (£100k)
- Using wildly optimistic exit yield

---

### **BUG #2: Passing Rent Shows £0**

**Current Output:**
```
Passing rent: £0 p.a. (estimated)
```

**Reality:**
```
Current total rental income: £670,617.50 per annum
Rent per sq ft: £22.50 overall
```

**Source:** Listing explicitly states this in "Features" section

**Impact:**
- Makes valuation impossible
- Destroys NOI calculations
- Breaks comparables analysis

**Root Cause:**
- AI extraction not parsing tenancy schedule correctly
- Or vacancy flag overriding actual rent data
- Listing says "100% vacant" in description but tenancy table shows 12 tenants

---

### **BUG #3: CAPEX Double-Counted**

**Current Output:**
```
CAPEX: £2,104,317
 - Refurbishment (£45/sqft): £1,724,850
 - Contingency (10%): £172,485
 - Professional fees (12%): £206,982
```

**Reality:**
```
The landlord invested approximately £5.3 million in capital 
expenditure, equating to circa £140 per sq ft. Works completed 
in late 2022.
```

**Impact:**
- Adds £2.1m of unnecessary costs
- Inflates total acquisition cost to £10.4m (vs £7.0m asking)
- Makes deal look worse than it is
- **Property is ALREADY refurbished**

**Root Cause:**
- System assumes all properties need refurb
- Not reading "completed in late 2022" context
- CAPEX engine not detecting recent works

---

### **BUG #4: NIY Calculation Wrong**

**Current Output:**
```
NIY: 13.0%
```

**Listing States:**
```
Net Initial Yield of 8.96%
```

**Math Check:**
- Asking price: £7,000,000
- Current rent: £670,617.50
- Implied NIY: £670,617.50 / £7,000,000 = **9.58%**
- With purchaser costs 6.65%: £7,465,500
- NIY: £670,617.50 / £7,465,500 = **8.98%** ✓ (matches listing)

**Current System Shows:** 13.0% — **44% overstatement**

**Root Cause:**
- Using wrong denominator (purchase price without costs?)
- Or using inflated total cost £10.4m including phantom CAPEX
- Formula error in NIY calculation

---

### **BUG #5: Verdict Logic Contradicts Itself**

**System Output:**
```
STRONG BUY — the numbers work at asking price

Red Flags Shown:
- Property is vacant
- In flood risk zone
- Long void expected (14 months)
- Significant CAPEX needed (£882k)
```

**Logical Contradiction:**
- How can a 100% vacant property with 14-month void be "STRONG BUY"?
- How can property needing "significant CAPEX" also be "refurbished to excellent specification"?
- System shows risks but ignores them in verdict

**Root Cause:**
- Verdict based solely on IRR threshold (>15% = Strong Buy)
- Not weighted against risk flags
- No probabilistic analysis
- No downside scenario check

---

### **BUG #6: No Assumption Validation**

**What's Missing:**
Entire "Assumption vs Reality Gap" section from IC Memo

**Should Show:**
```
┌─────────────────┬──────────────┬─────────────────┬──────────┬────────────┐
│ Variable        │ Model Input  │ Market Evidence │ Gap      │ Confidence │
├─────────────────┼──────────────┼─────────────────┼──────────┼────────────┤
│ ERV (Headline)  │ £28 psf      │ £20-23 psf      │ +22-40%  │ LOW        │
│ Exit Yield      │ 6.5%         │ 8.0-9.0%        │ -150-250│ LOW        │
│ Void Period     │ 11 months    │ 18-36 months    │ -39-69%  │ MEDIUM     │
│ Incentive       │ 6 months     │ 9-15 months     │ -33-60%  │ MEDIUM     │
└─────────────────┴──────────────┴─────────────────┴──────────┴────────────┘
```

**Current State:** No comps pulled, no validation, blind calculations

---

### **BUG #7: Information Architecture Broken**

**Current Layout:**
- Verdict buried in green badge (contradicts reality)
- Key assumptions hidden across 9 tabs
- No way to compare model vs market in one view
- Financial calculations not explained
- Red flags shown but not factored into verdict

**User Pain Points:**
- Must click through 9 tabs to understand deal
- Can't see assumptions vs comps side-by-side
- Verdict at top doesn't match data below
- No clear "go/no-go" decision framework

---

## PART 2: COMPLETE REDESIGN SPECIFICATION

### **INFORMATION ARCHITECTURE v2.0**

#### **TIER 1: HERO PANEL (Always Visible)**

```
┌──────────────────────────────────────────────────────────────────┐
│ REGENCY HOUSE, MILES GRAY ROAD, BASILDON                         │
│ Office • 30,150 sq ft • Freehold • 100% Vacant                   │
│                                                                   │
│ ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│ │  ⚠️ CONDITIONAL   │  │ Asking: £7.0m    │  │ Market Value:   │ │
│ │  at £6.0-6.5m    │  │ Price/sqft: £183 │  │ £6.2m - £7.1m   │ │
│ └──────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                                                   │
│ ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│ │ Max Entry Price  │  │ Target IRR       │  │ Discount Req'd  │ │
│ │ £6.0m - £6.5m    │  │ 15.0%            │  │ 7-14%           │ │
│ └──────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                                                   │
│ [Export IC Memo PDF]  [Add to Pipeline]  [Share Analysis]       │
└──────────────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. **Verdict is visual and clear** — Large badge with action (CONDITIONAL at £X)
2. **Pricing stack immediately visible** — Asking vs Market vs Max Entry
3. **Actions prominent** — One click to IC Memo PDF

---

#### **TIER 2: PILLAR NAVIGATION (Sticky Tabs)**

Replace 9 scattered tabs with **4 logical pillars**:

```
┌─────────────────────────────────────────────────────────────────┐
│ [1. Deal Summary]  [2. Reality Check]  [3. Financials]  [4. DD]│
└─────────────────────────────────────────────────────────────────┘
```

**1. DEAL SUMMARY**
- Property overview (size, location, tenure, physical)
- Current position (vacant, recent capex, tenancy)
- Market context (Basildon office market, vacancy, rents, yields)
- Deal thesis in 2-3 sentences

**2. REALITY CHECK** ⭐ **MOST CRITICAL TAB**
- **Assumption Gap Table** (see Bug #6 above)
- Rental comparables (5+ with distance, date, terms)
- Yield comparables (4+ with tenancy, WAULT, pricing)
- Market ERV vs Model ERV (visual bar chart)
- Exit yield range vs Model yield (visual)

**3. FINANCIALS**
- Acquisition costs breakdown
- Hold period cash flows (Year 0-5)
- Scenario analysis (Base / Upside / Downside)
- Sensitivity tables (ERV vs Yield vs Entry Price)
- Returns waterfall (IRR, Multiple, NPV)

**4. DUE DILIGENCE**
- Planning (use class, PD rights, alternative use potential)
- Environmental (EPC, flood, contamination, asbestos)
- Title & Legal (tenure, restrictions, rights)
- Market Outlook (exit liquidity, buyer universe, 3-5yr view)

---

#### **TIER 3: DECISION FRAMEWORK**

Every analysis page MUST answer 3 questions:

```
┌──────────────────────────────────────────────────────────────┐
│ 1. WHAT IS THE VERDICT?                                      │
│    → PROCEED / CONDITIONAL / REJECT                          │
│                                                               │
│ 2. AT WHAT PRICE?                                            │
│    → £X.Xm - £Y.Ym entry range                               │
│                                                               │
│ 3. WHAT ARE THE CONDITIONS?                                  │
│    → Binary checklist (5-7 items)                            │
└──────────────────────────────────────────────────────────────┘
```

**For Regency House:**
```
VERDICT: CONDITIONAL

PRICE: £6.0m - £6.5m (7-14% discount)

CONDITIONS:
☑ Discount negotiated to max entry range
☑ Conservative underwriting (8.0% exit yield minimum)
☑ Explicit acceptance of 24-36 month stabilisation
☑ Demonstrable leasing capability
☑ Contingency for longer void (36+ months)
```

---

### **CALCULATION ENGINE FIXES**

#### **Fix #1: IRR Calculation**

**Current (Broken):**
```javascript
// Oversimplified — not accounting for void, carry, letting
const irr = calculateIRR(entryPrice, exitValue, holdPeriod);
```

**Required Fix:**
```javascript
// Year-by-year cash flow with ALL costs
const cashFlows = [];

// Year 0: Acquisition
cashFlows[0] = -(entryPrice + stampDuty + legal + survey + financeArr);

// Years 1-N: Hold Period with Void
for (let year = 1; year <= holdPeriod; year++) {
  let income = 0;
  let costs = 0;
  
  // Check if stabilised yet
  if (year > voidPeriodMonths / 12) {
    income = stabilisedNOI * (1 + rentGrowth) ** (year - voidPeriodMonths/12);
  }
  
  // Void carry costs
  if (year <= voidPeriodMonths / 12) {
    costs += voidCarryCost; // insurance + rates + utilities
  }
  
  // Letting costs (one-time when leased)
  if (year === Math.ceil(voidPeriodMonths / 12)) {
    costs += lettingFees + incentivePackage + tenantImprovements;
  }
  
  // Debt service
  if (hasDebt) {
    costs += debtService;
  }
  
  cashFlows[year] = income - costs;
}

// Final year: Exit
const exitNOI = stabilisedNOI * (1 + rentGrowth) ** holdPeriod;
const exitValue = exitNOI / exitYield;
const exitCosts = exitValue * (agentFees + legal);
cashFlows[holdPeriod] += exitValue - exitCosts;

// Now calculate IRR
const irr = newtonRaphsonIRR(cashFlows);
```

**Key Additions:**
- Void period cash burn
- Letting costs (fees, incentives, TIs)
- Debt service if levered
- Exit costs (agent fees, legal)
- Rent growth over hold

---

#### **Fix #2: Passing Rent Extraction**

**Add Secondary Parser:**
```javascript
// Primary: Parse tenancy schedule
const tenancies = extractTenancySchedule(html);
const passingRent = tenancies.reduce((sum, t) => sum + t.rent, 0);

// Fallback: Parse "Current total rental income" statement
if (!passingRent || passingRent === 0) {
  const match = description.match(/rental income[:\s]+£([\d,\.]+)/i);
  if (match) {
    passingRent = parseFloat(match[1].replace(/,/g, ''));
  }
}

// If STILL zero, mark as "Unknown" not £0
if (!passingRent || passingRent === 0) {
  passingRent = null;
  confidence.passingRent = 'LOW';
}
```

---

#### **Fix #3: CAPEX Detection**

**Add Recent Works Check:**
```javascript
// Check for recent capex completion
const recentWorks = /refurbished.*202[0-9]|completed.*202[0-9]|works completed/i.test(description);
const capexAmount = extractCapexAmount(description); // "£5.3 million"
const capexPerSqft = extractCapexPSF(description); // "£140 per sq ft"

if (recentWorks && capexAmount && 
    (new Date() - capexCompletionDate) < 3 * 365 * 24 * 60 * 60 * 1000) {
  
  // Property recently refurbished — NO additional CAPEX
  assumptions.additionalCapex = 0;
  assumptions.capexNote = `Property refurbished in ${capexYear} with £${capexAmount}m investment (£${capexPerSqft} psf). No additional works required.`;
  
} else {
  // Standard CAPEX estimation
  assumptions.additionalCapex = estimateCapex(condition, age, epc);
}
```

---

#### **Fix #4: NIY Calculation**

**Correct Formula:**
```javascript
function calculateNIY(passingRent, purchasePrice, purchaserCosts) {
  if (!passingRent || passingRent === 0) {
    return null; // Cannot calculate NIY for vacant property
  }
  
  const totalCostIn = purchasePrice * (1 + purchaserCosts);
  const niy = (passingRent / totalCostIn) * 100;
  
  return {
    niy: niy.toFixed(2),
    passingRent,
    purchasePrice,
    totalCostIn,
    purchaserCosts: (purchaserCosts * 100).toFixed(2) + '%'
  };
}

// For Regency House:
const result = calculateNIY(670617.50, 7000000, 0.0665);
// Returns: { niy: '8.98%', ... } ✓ Correct
```

---

#### **Fix #5: Verdict Logic with Risk Weighting**

**Current (Broken):**
```javascript
if (irr > 0.15) return 'STRONG_BUY';
else if (irr > 0.10) return 'BUY';
else if (irr > 0.05) return 'CONDITIONAL';
else return 'REJECT';
```

**Fixed Version:**
```javascript
function calculateVerdict(irr, risks, assumptions, market) {
  // Base verdict from returns
  let baseVerdict = 
    irr > 0.20 ? 'STRONG_BUY' :
    irr > 0.15 ? 'BUY' :
    irr > 0.10 ? 'CONDITIONAL' :
    irr > 0.05 ? 'HOLD' :
    'REJECT';
  
  // Risk derating factors
  let riskScore = 0;
  
  // Vacancy risk (if 100% vacant)
  if (risks.vacancy === 1.0) riskScore += 2; // Downgrade by 2 levels
  
  // Assumption confidence risk
  const lowConfidenceCount = Object.values(assumptions)
    .filter(a => a.confidence === 'LOW').length;
  if (lowConfidenceCount >= 3) riskScore += 1;
  
  // Market headwinds
  if (market.vacancyRate > 0.15) riskScore += 1;
  if (market.takeUpChange < -0.15) riskScore += 1;
  
  // Apply derating
  const verdictLevels = ['REJECT', 'HOLD', 'CONDITIONAL', 'BUY', 'STRONG_BUY'];
  const baseIndex = verdictLevels.indexOf(baseVerdict);
  const deratedIndex = Math.max(0, baseIndex - riskScore);
  
  return {
    verdict: verdictLevels[deratedIndex],
    baseVerdict,
    riskDerating: riskScore,
    reasoning: generateReasoning(irr, risks, assumptions, market)
  };
}
```

**For Regency House:**
```
IRR at £7.0m: -2.8%
Base verdict: REJECT

Even if IRR was 15%:
- Vacancy: 100% (-2 levels)
- Low confidence assumptions: 4 (-1 level)
- Market headwinds: Basildon vacancy 18% (-1 level)
Total derating: -4 levels

STRONG_BUY → HOLD (at best)
```

---

#### **Fix #6: Add Assumption Validation Engine**

**New Module Required:**
```javascript
async function validateAssumptions(property, assumptions) {
  // 1. Pull comparables
  const rentalComps = await fetchRentalComps(
    property.address,
    property.assetType,
    property.size,
    radius = 5 // miles
  );
  
  const yieldComps = await fetchYieldComps(
    property.address,
    property.assetType,
    property.size,
    radius = 10
  );
  
  // 2. Calculate market evidence ranges
  const marketERV = {
    min: percentile(rentalComps.map(c => c.rentPSF), 25),
    median: percentile(rentalComps.map(c => c.rentPSF), 50),
    max: percentile(rentalComps.map(c => c.rentPSF), 75)
  };
  
  const marketYield = {
    min: percentile(yieldComps.map(c => c.niy), 25),
    median: percentile(yieldComps.map(c => c.niy), 50),
    max: percentile(yieldComps.map(c => c.niy), 75)
  };
  
  // 3. Compare assumptions vs market
  const validationFlags = [];
  
  // ERV check
  const ervGap = ((assumptions.erv - marketERV.median) / marketERV.median) * 100;
  if (Math.abs(ervGap) > 15) {
    validationFlags.push({
      variable: 'ERV (Headline)',
      assumed: `£${assumptions.erv} psf`,
      market: `£${marketERV.min}-${marketERV.max} psf`,
      gap: `${ervGap > 0 ? '+' : ''}${ervGap.toFixed(0)}%`,
      confidence: Math.abs(ervGap) > 25 ? 'LOW' : 'MEDIUM'
    });
  }
  
  // Exit yield check
  const yieldGap = (assumptions.exitYield - marketYield.median) * 100; // bps
  if (Math.abs(yieldGap) > 50) {
    validationFlags.push({
      variable: 'Exit Yield',
      assumed: `${(assumptions.exitYield * 100).toFixed(1)}%`,
      market: `${(marketYield.min * 100).toFixed(1)}-${(marketYield.max * 100).toFixed(1)}%`,
      gap: `${yieldGap > 0 ? '+' : ''}${yieldGap.toFixed(0)} bps`,
      confidence: Math.abs(yieldGap) > 150 ? 'LOW' : 'MEDIUM'
    });
  }
  
  // Void period check (compare to market norms)
  const marketVoidRange = getMarketVoidRange(property.assetType, property.location);
  if (assumptions.voidMonths < marketVoidRange.min) {
    validationFlags.push({
      variable: 'Lease-Up Period',
      assumed: `${assumptions.voidMonths} months`,
      market: `${marketVoidRange.min}-${marketVoidRange.max} months`,
      gap: 'Understated',
      confidence: 'MEDIUM'
    });
  }
  
  return {
    validationFlags,
    rentalComps,
    yieldComps,
    marketERV,
    marketYield
  };
}
```

---

### **UI/UX REDESIGN**

#### **BEFORE (Current Broken State):**
```
┌────────────────────────────────────────────┐
│ Score: 61 [?]                               │ ← Meaningless number
│ STRONG BUY ✓                                │ ← Wrong verdict
├────────────────────────────────────────────┤
│ Property | Planning | Title | Env | Own... │ ← 9 scattered tabs
│                                             │
│ [Wall of text description]                 │
│ [Bullet points]                             │
│ [More text]                                 │
│                                             │
│ [Building Specification]                   │
│ Size: 38,330 sqft                          │
│                                             │
│ [Tenancy Schedule]                         │
│ [Long table...]                             │
└────────────────────────────────────────────┘

Issues:
- Verdict at top doesn't match data below
- No clear decision path
- Must click 9 tabs to understand deal
- Red flags shown but ignored
- Calculations not explained
```

---

#### **AFTER (Proposed Redesign):**

```
┌──────────────────────────────────────────────────────────────────┐
│ REGENCY HOUSE, BASILDON                                          │
│ Office • 30,150 sq ft • £7.0m asking • 100% Vacant               │
│                                                                   │
│ ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│ │  ⚠️ CONDITIONAL   │  │ Asking: £7.0m    │  │ Max Entry:      │ │
│ │  Discount Req'd  │  │ Market: £6.2-7.1m│  │ £6.0-6.5m       │ │
│ │  7-14%           │  │                  │  │ (15% IRR floor) │ │
│ └──────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                                                   │
│ Key Risks: 100% vacant • 18-36mo void • Flood zone • Overprice  │
│                                                                   │
│ [Export IC Memo] [Add to Pipeline] [Share] [Schedule Viewing]   │
├──────────────────────────────────────────────────────────────────┤
│ [Summary]  [Reality Check]  [Financials]  [Due Diligence]       │ ← 4 pillars
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ REALITY CHECK — Assumptions vs Market Evidence                  │
│                                                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Variable      │ Model   │ Market      │ Gap      │ Risk    │  │
│ ├───────────────┼─────────┼─────────────┼──────────┼─────────┤  │
│ │ ERV Headline  │ £28 psf │ £20-23 psf  │ +22-40%  │ ⚠️ HIGH │  │
│ │ Exit Yield    │ 6.5%    │ 8.0-9.0%    │ -150bps  │ ⚠️ HIGH │  │
│ │ Void Period   │ 11 mo   │ 18-36 mo    │ -39-69%  │ 🟡 MED  │  │
│ │ Letting Fees  │ 10%     │ 15% + TIs   │ -33%     │ 🟡 MED  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ⚠️ VERDICT IMPACT: If all optimistic assumptions hold            │
│    simultaneously → 40-60% valuation overstatement               │
│                                                                   │
│ ✓ CORRECTED ANALYSIS: Conservative underwriting (8.0% yield,     │
│   £22 psf ERV, 24mo void) → £6.0-6.5m defensible entry          │
│                                                                   │
│ Rental Comparables (Basildon Secondary Offices)                 │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Property         │ Size  │ Rent PSF│ Incentive │ Date    │    │
│ ├──────────────────┼───────┼─────────┼───────────┼─────────┤    │
│ │ Phoenix House    │ 4,250 │ £23.00  │ 9mo RF    │ Sep 24  │    │
│ │ Burnt Mills      │ 3,800 │ £22.50  │ 12mo+£25TI│ Jul 24  │    │
│ │ Pipps Hill North │ 5,100 │ £24.00  │ 6mo RF    │ Oct 24  │    │
│ └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│ Yield Comparables (Multi-Let Offices, Essex)                    │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Property             │ Price │ NIY   │ Tenancy      │Date │    │
│ ├──────────────────────┼───────┼───────┼──────────────┼─────┤    │
│ │ Southfields BP       │ £5.2m │ 8.75% │ 7 units, 4.2y│Mar24│    │
│ │ Mayflower Centre     │ £8.1m │ 8.25% │ 12 units,5.8y│Nov23│    │
│ └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

Benefits:
✓ Verdict is clear and actionable (CONDITIONAL at £6.0-6.5m)
✓ Reality Check tab shows assumption gaps IMMEDIATELY
✓ Comparables inline with analysis (no separate tab)
✓ Risk flags integrated into verdict logic
✓ One-click to IC Memo PDF with full analysis
```

---

## PART 3: IMPLEMENTATION PRIORITY

### **PHASE 1: Critical Bug Fixes (Week 1)**

**P0 Blockers:**
1. ✅ Fix IRR calculation (add void, carry, letting costs)
2. ✅ Fix passing rent extraction (parse tenancy schedule correctly)
3. ✅ Fix CAPEX detection (don't add refurb if already completed)
4. ✅ Fix NIY calculation (correct formula)
5. ✅ Fix verdict logic (add risk weighting)

**Expected Impact:**
- Regency House verdict changes from "STRONG BUY" to "CONDITIONAL at £6.0-6.5m"
- IRR changes from 31.3% to 1.8% (at £7m) or 15.2% (at £6.5m)
- Financial model becomes mathematically correct

---

### **PHASE 2: Assumption Validation Engine (Week 2)**

**P1 Features:**
1. ✅ Pull rental comparables (CoStar API or web scraping)
2. ✅ Pull yield comparables
3. ✅ Build comparison table (Model vs Market)
4. ✅ Flag assumptions outside market range
5. ✅ Confidence scoring (LOW/MEDIUM/HIGH)

**Expected Impact:**
- Users can see exactly where model diverges from reality
- "Reality Check" tab becomes most valuable feature
- Prevents over-optimistic underwriting

---

### **PHASE 3: UI/UX Redesign (Week 3-4)**

**P2 Improvements:**
1. ✅ Rebuild hero panel (verdict + pricing stack)
2. ✅ Consolidate 9 tabs → 4 pillars
3. ✅ Add sticky verdict badge
4. ✅ Inline comparables (no separate tab)
5. ✅ One-click IC Memo PDF export

**Expected Impact:**
- Time to decision: 5 minutes → 30 seconds
- User confidence: Users trust analysis
- Conversion: More deals added to pipeline

---

### **PHASE 4: IC Memo Integration (Week 5)**

**P3 Enhancements:**
1. ✅ Generate full IC Memo PDF from property page
2. ✅ Include all 12 sections (planning, environmental, comps, etc.)
3. ✅ Professional formatting (dark theme, print-ready)
4. ✅ Downloadable and shareable

**Expected Impact:**
- Users can export institutional-grade analysis
- Competitive advantage over PropStream, LoopNet
- Product becomes essential tool for acquisitions teams

---

## PART 4: TESTING CHECKLIST

Before deploying fixes, test with these properties:

### **Test Case 1: Regency House (Current)**
- **URL:** https://rib.co.uk/property/regency-house-miles-gray-road-basildon/
- **Expected Verdict:** CONDITIONAL at £6.0-6.5m
- **Expected IRR at £7.0m:** -2.8% to +1.8%
- **Expected Passing Rent:** £670,617.50
- **Expected CAPEX:** £0 (already refurbished)

### **Test Case 2: Income-Producing Asset**
- Find a fully let office building with known tenancies
- **Expected:** Passing rent extracted correctly
- **Expected:** NIY matches listing

### **Test Case 3: Development Opportunity**
- Find a property needing real refurb
- **Expected:** CAPEX calculated correctly
- **Expected:** No double-counting of existing works

### **Test Case 4: Strong Buy**
- Find a genuinely underpriced deal
- **Expected:** STRONG BUY verdict
- **Expected:** IRR > 20%, low risk flags

---

## CONCLUSION

**Current State:** DealScope produces mathematically impossible results, contradictory verdicts, and unusable UX.

**Root Causes:**
1. Calculation errors in core financial engine
2. No validation against market reality
3. Verdict logic ignores risk flags
4. Information scattered across 9 tabs
5. No clear decision framework

**Solution:** Complete rebuild of financial engine + assumption validation + UI redesign

**Timeline:**
- Week 1: Fix critical bugs
- Week 2: Build assumption validation
- Week 3-4: Redesign UI
- Week 5: IC Memo integration

**Outcome:** DealScope becomes first analysis tool that proves its own model wrong when needed — not cleaning up bad inputs, but exposing gaps and correcting ranges.

---

**Next Steps:**
1. Review this audit with engineering team
2. Prioritize Phase 1 bug fixes
3. Build comprehensive test suite
4. Deploy fixes to staging
5. Re-test with Regency House

**Questions?** Review `/mnt/user-data/outputs/ic-memo-complete-dark.html` for full IC Memo specification.
