# PHASE 1: CRITICAL FIXES (WEEK 1-2)
**Priority: 🔴 BLOCKER — Must complete before any other work**

---

## OBJECTIVE

Fix all broken financial calculations so users can trust analysis results.

**Success Criteria:**
- [ ] IRR calculation mathematically correct
- [ ] Passing rent extracted accurately  
- [ ] CAPEX detection doesn't add phantom costs
- [ ] NIY matches listing values
- [ ] Equity multiples in realistic range (1.0-2.0x)
- [ ] Regency House test case passes

---

## BUG 1: IRR CALCULATION

### **Current State**
```typescript
// File: lib/dealscope/calculations.ts (or similar)
function calculateIRR(entryPrice, exitValue, years) {
  // Oversimplified - WRONG
  return ((exitValue - entryPrice) / years / entryPrice) * 100;
}
```

**Problem:** Shows 31.3% IRR when it should show 0.1-1.8%

### **Fix Required**
Replace entire IRR function with correct implementation from `documentation/03_FINANCIAL_ENGINE_SPEC.md` Part 1.

**Key Changes:**
1. Add void period cash flows
2. Add letting costs (fees + rent-free + TI)
3. Add exit costs (agent fees + legal)
4. Use Newton-Raphson method for accurate IRR

**Files to Modify:**
- `lib/dealscope/financial-calculations.ts` (or your equivalent)
- `api/dealscope/analyze/route.ts` (call new function)

**Test:**
```bash
npm test -- irr-calculation
```

Expected: Regency House at £7.0m entry = 0.1-1.8% IRR (not 31.3%)

---

## BUG 2: PASSING RENT EXTRACTION

### **Current State**
```typescript
// Extraction shows: £0 p.a.
// Actual value: £670,617.50
```

**Problem:** AI extraction not finding current rent in listing

### **Fix Required**

Add fallback extraction patterns:

```typescript
// File: lib/dealscope/extractors/rent-extractor.ts

async function extractPassingRent(listing: ListingData): Promise<number | null> {
  // Primary: Parse tenancy schedule
  const tenancies = await extractTenancySchedule(listing.html);
  if (tenancies.length > 0) {
    return tenancies.reduce((sum, t) => sum + t.rent, 0);
  }
  
  // Fallback 1: Look for explicit statement
  const patterns = [
    /current.*rental income[:\s]+£?([\d,\.]+)/i,
    /passing rent[:\s]+£?([\d,\.]+)/i,
    /total rent[:\s]+£?([\d,\.]+).*per annum/i
  ];
  
  for (const pattern of patterns) {
    const match = listing.description.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  
  // Fallback 2: Calculate from tenancy table
  if (listing.tenancyTable) {
    // Extract from HTML table
    const rents = extractRentsFromTable(listing.tenancyTable);
    if (rents.length > 0) {
      return rents.reduce((sum, r) => sum + r, 0);
    }
  }
  
  // If still null, mark as vacant (not £0)
  return null;
}
```

**Files to Modify:**
- `lib/dealscope/extractors/rent-extractor.ts`
- `lib/dealscope/enrichment/stage1.ts`

**Test:**
```bash
npm test -- rent-extraction
```

Expected: Regency House extracts £670,617.50 (not £0)

---

## BUG 3: PHANTOM CAPEX

### **Current State**
```typescript
// Always adds: £45/sqft * size
// Even for properties refurbished 2 years ago
```

**Problem:** Adds £2.1m CAPEX when property already had £5.3m spent in 2022

### **Fix Required**

Add refurbishment detection:

```typescript
// File: lib/dealscope/capex-estimator.ts

function estimateCAPEX(property: Property): {
  amount: number;
  reasoning: string;
} {
  // Check for recent refurbishment
  const refurbPatterns = [
    /refurbished.*(\d{4})/i,
    /works completed.*(\d{4})/i,
    /capital.*£([\d\.]+)m.*(\d{4})/i
  ];
  
  for (const pattern of refurbPatterns) {
    const match = property.description.match(pattern);
    if (match) {
      const year = parseInt(match[match.length - 1]);
      const yearsSince = new Date().getFullYear() - year;
      
      if (yearsSince <= 3) {
        return {
          amount: 0,
          reasoning: `Property refurbished in ${year} - no additional CAPEX required`
        };
      }
    }
  }
  
  // Estimate based on condition...
  return estimateByCondition(property);
}
```

**Files to Modify:**
- `lib/dealscope/capex-estimator.ts`
- `api/dealscope/analyze/route.ts`

**Test:**
Regency House should show £0 CAPEX (not £2.1m)

---

## BUG 4: NIY CALCULATION

### **Current State**
```typescript
const niy = passingRent / purchasePrice;
// Shows: 13.0%
```

**Problem:** Missing purchaser's costs in denominator

### **Fix Required**

```typescript
function calculateNIY(
  passingRent: number,
  purchasePrice: number
): number | null {
  if (!passingRent) return null;
  
  const purchasersCosts = 0.0665; // SDLT 5% + legal 1% + fees 0.665%
  const totalCostIn = purchasePrice * (1 + purchasersCosts);
  
  return (passingRent / totalCostIn) * 100;
}
```

**Files to Modify:**
- `lib/dealscope/yield-calculations.ts`

**Test:**
Regency House: £670,617.50 / £7,465,500 = 8.98% (not 13.0%)

---

## BUG 5: EQUITY MULTIPLE

### **Current State**
```typescript
const multiple = exitValue / purchasePrice;
// Shows: 8.85x
```

**Problem:** Should be exit / total cost in (not just purchase)

### **Fix Required**

```typescript
function calculateEquityMultiple(
  exitValue: number,
  totalCostIn: number // NOT just purchase price
): number {
  return exitValue / totalCostIn;
}

// totalCostIn includes:
// - Purchase price
// - SDLT, legal, survey
// - Void carry costs
// - Letting fees
// - Rent-free period
// - Tenant improvements
```

**Files to Modify:**
- `lib/dealscope/returns-calculations.ts`

**Test:**
Regency House: £8.29m / £8.27m = 1.00x (not 8.85x)

---

## IMPLEMENTATION CHECKLIST

### **Day 1-2: Setup**
- [ ] Create feature branch: `fix/critical-calculations`
- [ ] Review all 5 bugs
- [ ] Set up test suite with Regency House data

### **Day 3-5: IRR Fix**
- [ ] Implement corrected IRR function
- [ ] Add void period cash flows
- [ ] Add letting costs
- [ ] Add exit costs
- [ ] Test with Regency House
- [ ] Test with 3 other properties

### **Day 6-7: Rent Extraction**
- [ ] Add fallback patterns
- [ ] Test tenancy schedule parser
- [ ] Handle vacant properties correctly
- [ ] Test with 10 properties

### **Day 8-9: CAPEX Detection**
- [ ] Add refurbishment detection
- [ ] Test with recently refurbished properties
- [ ] Test with properties needing work
- [ ] Verify no false positives

### **Day 10: NIY & Multiple**
- [ ] Fix NIY formula
- [ ] Fix equity multiple calculation
- [ ] Test all scenarios

### **Day 11-12: Integration Testing**
- [ ] Run full test suite
- [ ] Test with 20 properties
- [ ] Document any edge cases
- [ ] Deploy to staging

### **Day 13-14: QA & Launch**
- [ ] QA team tests all scenarios
- [ ] Fix any issues found
- [ ] Deploy to production
- [ ] Monitor for issues

---

## TEST SUITE

Create `tests/phase1-critical-fixes.test.ts`:

```typescript
describe('Phase 1: Critical Fixes', () => {
  
  const regencyHouse = {
    url: 'https://rib.co.uk/property/regency-house...',
    expectedIRR: { min: 0.1, max: 1.8 },
    expectedPassingRent: 670617.50,
    expectedCAPEX: 0,
    expectedNIY: 8.98,
    expectedMultiple: 1.00
  };
  
  test('IRR is realistic', async () => {
    const analysis = await analyzeProperty(regencyHouse.url);
    expect(analysis.irr).toBeGreaterThanOrEqual(regencyHouse.expectedIRR.min);
    expect(analysis.irr).toBeLessThanOrEqual(regencyHouse.expectedIRR.max);
  });
  
  test('Passing rent extracted correctly', async () => {
    const analysis = await analyzeProperty(regencyHouse.url);
    expect(analysis.passingRent).toBeCloseTo(regencyHouse.expectedPassingRent, -2);
  });
  
  test('CAPEX not double-counted', async () => {
    const analysis = await analyzeProperty(regencyHouse.url);
    expect(analysis.capex).toBe(regencyHouse.expectedCAPEX);
  });
  
  test('NIY matches listing', async () => {
    const analysis = await analyzeProperty(regencyHouse.url);
    expect(analysis.niy).toBeCloseTo(regencyHouse.expectedNIY, 1);
  });
  
  test('Equity multiple is realistic', async () => {
    const analysis = await analyzeProperty(regencyHouse.url);
    expect(analysis.equityMultiple).toBeCloseTo(regencyHouse.expectedMultiple, 1);
  });
});
```

---

## DEPLOYMENT

### **Staging Deployment**
```bash
git checkout -b fix/critical-calculations
# Make all changes
git commit -m "fix: correct IRR, rent extraction, CAPEX, NIY, multiple"
git push origin fix/critical-calculations
# Create PR
# Deploy to staging
vercel deploy --env staging
```

### **Production Deployment**
After QA approval:
```bash
git checkout main
git merge fix/critical-calculations
git push origin main
vercel deploy --prod
```

---

## SUCCESS CRITERIA

**Phase 1 Complete When:**
- [ ] All 5 bugs fixed
- [ ] Regency House test passes
- [ ] 20 test properties analyzed successfully
- [ ] No calculation errors >5%
- [ ] Deployed to production
- [ ] User feedback positive

**Expected Impact:**
- Calculation accuracy: 35% → 95%
- User trust: Low → Medium
- Correction rate: 45% → 40%

**Ready for Phase 2:** Validation Engine (Week 3-4)
