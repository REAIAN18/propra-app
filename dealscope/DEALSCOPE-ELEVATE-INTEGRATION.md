# DealScope + Elevate Integration

## Two Products, One Ecosystem

```
DEALSCOPE                          ELEVATE
Find → Analyse → Transact          Reduce → Optimise → Grow
(Property acquisition workflow)    (Cost/efficiency optimization)
```

**DealScope:** "Should I buy this property? How much will I make?"
**Elevate:** "How much will it cost to own? How can I improve returns?"

---

## Integration Points

### 1. DealScope Analyse → Elevate Entry Point

In DealScope's **Full Dossier** tab, under "Property Details":

```
Annual operating costs: £150k
├─ Energy: £45k
├─ Insurance: £35k
├─ Rates: £40k
├─ Maintenance: £20k
└─ Other: £10k

[Elevate] Can reduce and optimise these costs
↓ Opens Elevate with this property pre-loaded
```

**User journey:**
1. DealScope: Analyse property (valuation, scenarios, risks)
2. See: "Annual costs £150k"
3. Click: "Optimise with Elevate"
4. Elevate: Shows Reduce opportunities (cut energy 20%, insurance 15%)
5. Back to DealScope: Updated scenarios with lower costs
6. DealScope: Revised IRR now 8.5% (was 8.2%)

---

### 2. DealScope Underwrite → Elevate Cost Reduction

In DealScope's **Underwrite** scenarios:

```
Scenario 1: Owner-occupy
├─ Purchase: £11.5M
├─ Annual costs: £150k ← [Elevate: Reduce to £120k]
├─ Exit (10yr): £14M–£15M
└─ IRR: 6.8%

If you reduce costs via Elevate:
├─ Annual costs: £120k (was £150k)
├─ Exit now: £14.5M–£15.5M (lower opex = higher value)
└─ Revised IRR: 7.4% (was 6.8%)
```

**User journey:**
1. DealScope: Model scenario (6.8% IRR with £150k costs)
2. Click: "What if we optimise costs?"
3. Elevate: Shows cost reduction (£30k/yr savings)
4. DealScope: Auto-recalculates with new costs
5. New IRR: 7.4% (0.6% uplift from cost reduction)

---

### 3. Elevate Insights → DealScope Pipeline

User in Elevate, looking at their portfolio of properties:

```
Property 1: Good for Elevate optimisation
├─ Current costs: £150k
├─ Elevate potential: -£30k/yr (20% reduction)
├─ Value uplift: +£600k (capitalized at 5% yield)
└─ [View in DealScope] — shows property in context of portfolio

Property 2: Good acquisition target (low operating risk)
├─ Current costs: £80k
├─ Elevate potential: -£5k/yr (low hanging fruit)
└─ [View in DealScope] — compare with other opportunities
```

**User journey:**
1. Elevate: Analysing portfolio
2. See: "Property X has £600k value uplift from cost reduction"
3. Click: "View in DealScope"
4. DealScope: Shows property with updated economics
5. Compare: "Property X (£600k uplift) vs Property Y (£400k uplift)"
6. Decide: "Property X is better target"

---

## Data Integration

### Property Record (Single Source of Truth)

```
Property {
  // DealScope data
  address: "...",
  lat, lng,
  epc_rating, year_built, building_size_sqft,
  valuation_low, valuation_mid, valuation_high,
  current_rent, market_rent,
  owner, tenant, lease_terms,
  
  // Elevate data
  annual_energy_cost: 45000,
  annual_insurance_cost: 35000,
  annual_rates_cost: 40000,
  annual_maintenance_cost: 20000,
  other_costs: 10000,
  total_annual_operating_cost: 150000,
  
  // Elevate analysis
  energy_efficiency_potential: -8000/yr,
  insurance_optimization_potential: -5000/yr,
  maintenance_efficiency_potential: -3000/yr,
  rates_challenge_potential: -2000/yr,
  total_cost_reduction_potential: -18000/yr,
  
  // DealScope scenarios (with Elevate applied)
  scenario_1_base_costs: 150000,
  scenario_1_optimized_costs: 132000, // with Elevate
  scenario_1_base_irr: 6.8,
  scenario_1_optimized_irr: 7.2, // with Elevate
}
```

---

## UI Integration

### DealScope: Analyse Tab

```
Property Details
├─ Type, size, tenure, age, energy rating
├─ Current owner, tenant, lease terms
├─ Annual costs breakdown
│  ├─ Energy: £45k [Elevate: Can reduce to £37k]
│  ├─ Insurance: £35k [Elevate: Can reduce to £30k]
│  ├─ Rates: £40k [Elevate: Can reduce to £38k]
│  ├─ Maintenance: £20k [Elevate: Can optimize]
│  └─ Total: £150k [Elevate: Can reduce to £132k (-12%)]
│
└─ [Open Elevate] Button
   └─ Opens Elevate modal/page with this property
      └─ Shows detailed cost reduction analysis
```

### DealScope: Underwrite Tab

```
Scenario 1: Owner-occupy

Assumptions
├─ Purchase price: £11.5M [slider]
├─ Capex: £150k [slider]
├─ Annual costs: £150k
│  └─ [Elevate: Reduce to £132k?] [Yes/No]
├─ Financing: 50% LTV @ 5.5% [slider]
└─ Holding period: 10 years [slider]

Results
├─ Annual profit: £X
├─ Exit value (10yr): £14M–£15M
│  └─ If optimized: £14.5M–£15.5M (Elevate)
├─ Total profit: £2.5M–£3.5M
│  └─ If optimized: £2.8M–£3.8M (Elevate)
├─ IRR: 6.8%
│  └─ If optimized: 7.2% (Elevate)
└─ [Learn how Elevate achieves this cost reduction]
```

---

## API Integration

### DealScope APIs (existing)

- POST /api/dealscope/enrich
- POST /api/dealscope/valuations
- POST /api/dealscope/scenarios
- POST /api/dealscope/letter

### New: Cross-Product APIs

- **GET /api/dealscope/property/[id]/elevate-potential**
  - Input: property_id
  - Returns: { energySavings, insuranceSavings, rateSavings, maintenanceSavings, totalPotential }
  - Used by: DealScope UI to show "can reduce to £132k"

- **GET /api/elevate/property/[id]/dealscope-context**
  - Input: property_id
  - Returns: { dealscope_valuation, dealscope_scenarios, dealscope_irr, dealscope_risks }
  - Used by: Elevate UI to show "this property is worth X, buying at Y valuation"

- **POST /api/dealscope/scenarios/with-elevate**
  - Input: property_id, scenario, apply_elevate_optimization
  - Returns: updated scenario with costs reduced, IRR recalculated
  - Used by: DealScope underwrite to show "if you apply Elevate"

---

## User Workflows

### Workflow 1: "Should I buy this property?"

```
1. DealScope: Paste address
2. See: Headline card + dossier
3. See: Annual costs £150k
4. Click: "What if I optimise costs?"
5. Elevate: Cost reduction analysis (save £18k/yr)
6. Back to DealScope
7. Underwrite: Revised IRR 7.2% (was 6.8%)
8. Decision: "Yes, worth pursuing. Will implement Elevate post-acquisition."
```

### Workflow 2: "Comparing two properties"

```
1. DealScope: Analysed Property A and Property B
2. Kanban: Both in "Analysed" stage
3. Compare view:
   ├─ Property A: 6.8% IRR + Elevate potential (save £18k/yr) = 7.2% effective
   ├─ Property B: 7.5% IRR + Elevate potential (save £8k/yr) = 7.7% effective
4. Decision: "Property B better, even with less Elevate potential"
5. Pursue Property B
```

### Workflow 3: "Optimising portfolio"

```
1. DealScape: Pipeline with 5 properties in "Negotiating" stage
2. Elevate: Open each property
3. See: "Property X can save £25k/yr via Elevate"
4. Back to DealScope
5. Revised economics: Property X now 8.2% IRR (was 7.1%)
6. Prioritise: "Close Property X first (best post-acquisition upside)"
```

---

## Messaging

### In DealScope:

> "**Annual costs: £150k**
> 
> These operating costs directly impact your returns. **Elevate can help reduce these costs by up to 12%**, improving your IRR from 6.8% to 7.2%.
> 
> [Open Elevate] [Learn more]"

### In Elevate:

> "**Property: 179 Harrow Road**
> 
> DealScope valuation: £12.5M
> DealScope acquisition scenario: 6.8% IRR
> 
> **Cost reduction opportunities:**
> - Energy: Save £8k/yr (18% reduction)
> - Insurance: Save £5k/yr (14% reduction)
> - Rates: Save £2k/yr (5% reduction)
> 
> **Impact on DealScope returns:**
> - New annual costs: £132k (was £150k)
> - New IRR: 7.2% (was 6.8%)
> 
> [View in DealScope] [Review scenarios]"

---

## Why This Works

1. **Seamless workflow:** User doesn't leave the analysis process
2. **Real impact:** Shows cost reduction actually improves returns
3. **Network effects:** More properties in DealScope = more Elevate opportunities; more Elevate optimizations = better DealScope returns
4. **Positioning:** DealScope = "Should I buy this?", Elevate = "How do I maximize returns?"
5. **Retention:** User uses both products for complete due diligence

---

## Implementation Priority

### MVP (This Week)
- DealScope Analyse shows annual costs breakdown
- Link to "Open Elevate"
- Basic integration (just link, no data sync yet)

### Phase 2 (Weeks 3–4)
- GET /api/dealscope/property/[id]/elevate-potential
- DealScope shows "can reduce to £132k" estimate
- Elevate shows DealScope context

### Phase 3 (Month 2)
- POST /api/dealscope/scenarios/with-elevate
- Underwrite shows revised scenarios with Elevate applied
- Compare view in DealScope pipeline

---

## Key Insight

**This is how RealHQ products talk to each other.**

DealScope says: "Here's a property worth pursuing."
Elevate says: "Here's how to improve the returns on that property."
Finance (later) says: "Here's how to finance that property."
Insurance (later) says: "Here's how to insure that property."

Each product focuses on one question. Together, they answer: "Should I buy this property, and how do I maximize returns?"
