# RealHQ AVM Methodology — FL Portfolio Validation
**Automated Valuation Model: Comparable Sales Analysis & Cap Rate Calibration**
*Prepared by Head of Real Estate & Commercial | Q1 2026*

---

## Purpose

This document validates the RealHQ AVM methodology against actual FL CRE transaction evidence. It identifies where demo portfolio valuations diverge from market-supportable positions, corrects them, and documents the methodology RealHQ uses to produce defensible automated valuations.

---

## RealHQ AVM Methodology — Overview

RealHQ's commercial AVM uses an income capitalisation approach as the primary method, with a capital value per sqft cross-check as a secondary method:

```
1. Net Operating Income (NOI) estimation
   = Gross rent roll
   − Vacancy allowance (market-based by submarket and asset type)
   − Operating expenses (benchmarked by lease structure and asset type)
   + Ancillary income (solar, EV, mast — probability-weighted)

2. Capitalisation rate selection
   = Base cap rate for asset type × location premium/discount
   × WAULT adjustment (short WAULT = yield premium)
   × Covenant quality adjustment
   × Physical condition / EPC adjustment

3. Indicated Value = NOI ÷ Capitalisation Rate

4. Cross-check: Capital value per sqft vs comparable transactions
   = If ÷/sqft diverges >20% from comparable sales range → flag for review
```

---

## FL Cap Rate Reference (Q1 2026)

*Sources: CBRE US Cap Rate Survey H2 2024; JLL Office Outlook Q4 2024; Marcus & Millichap FL market reports; CoStar FL comparable transaction data.*

| Asset Class | Core FL (Miami/Tampa/Orlando) | Secondary FL | Notes |
|---|---|---|---|
| Office Class A | 6.5–7.5% | 7.5–8.5% | Strong covenants, long WAULT only |
| Office Class B | 7.0–8.5% | 8.5–10.0% | Weak demand, elevated vacancy nationally |
| Office Class B (Brickell/South Beach) | 6.0–7.0% | — | Boutique exception; finance/tech tenants |
| Retail NNN (urban, strong location) | 5.0–5.8% | 5.8–6.8% | Food/bev, fitness tenants driving demand |
| Retail NNN (suburban/neighborhood) | 6.0–7.5% | 7.0–8.5% | Weakening for weak anchors |
| Industrial (SE FL) | 5.0–5.8% | 5.5–6.5% | Still tight; supply normalising |
| Industrial (Tampa/I-75) | 5.5–6.5% | 6.0–7.0% | Moderate growth; new supply arrived |
| Flex (multi-tenant, Broward/Miami-Dade) | 6.0–7.0% | 6.5–7.5% | Demand solid |
| Flex (Orlando/Central FL) | 6.5–7.5% | 7.0–8.0% | Slightly softer |

**Key context — FL office market 2024–2025:**
The national office downturn has been less severe in Florida than gateway cities, but Class B multi-tenant suburban office is under meaningful pressure:
- Miami-Dade Class B vacancy: 18–24%
- Orlando Class B vacancy: 20–26%
- Cap rates have expanded 150–200bps since 2021 peak for FL Class B

Any valuation for FL Class B office at sub-7% cap rate will be challenged immediately.

---

## FL Comparable Sales — Capital Value per Sqft (Q2–Q4 2024)

| Asset Type | Location | Size | Sale Price | $/sqft | Cap Rate | Date |
|---|---|---|---|---|---|---|
| Class B Office | Coral Gables | 38,000 sqft | $7.8M | $205 | 7.8% | Q3 2024 |
| Class B Office | Coral Gables | 52,000 sqft | $11.2M | $215 | 8.1% | Q2 2024 |
| Class B Office | Brickell | 28,000 sqft | $8.4M | $300 | 6.5% | Q4 2024 |
| Class B Office | Orlando (Orange Co) | 30,000 sqft | $5.1M | $170 | 8.2% | Q3 2024 |
| Class B Office | Orlando (suburban) | 45,000 sqft | $6.8M | $151 | 8.8% | Q2 2024 |
| Retail NNN (urban) | Brickell | 8,400 sqft | $7.2M | $857 | 5.1% | Q4 2024 |
| Retail NNN (urban) | South Beach | 6,200 sqft | $5.8M | $935 | 5.3% | Q3 2024 |
| Industrial | Hillsborough Co. | 32,000 sqft | $5.9M | $184 | 5.8% | Q4 2024 |
| Industrial | Hillsborough Co. | 25,000 sqft | $4.4M | $176 | 5.9% | Q3 2024 |
| Flex | Broward Co. | 20,000 sqft | $4.2M | $210 | 6.6% | Q4 2024 |
| Flex | Broward Co. | 16,500 sqft | $3.5M | $212 | 6.8% | Q2 2024 |

---

## Portfolio Audit — Implied Cap Rate vs Market

| Asset | Net Income | Current Value | Implied Cap Rate | Market Range | Assessment |
|---|---|---|---|---|---|
| Coral Gables Office (fl-001) | $742,500 | $14.2M | **5.23%** | 7.0–8.5% | **Overstated ~$4.4M** |
| Brickell Retail (fl-002) | $497,000 | $9.4M | 5.29% | 5.0–5.8% | ✓ Defensible |
| Tampa Industrial (fl-003) | $294,000 | $5.6M | 5.25% | 5.5–6.5% | Marginally tight |
| Orlando Office (fl-004) | $476,160 | $9.6M | **4.96%** | 7.5–8.5% | **Overstated ~$3.8M** |
| Fort Lauderdale Flex (fl-005) | $277,200 | $4.5M | 6.16% | 6.0–7.0% | ✓ Defensible |

---

## Corrected Valuations

### fl-001: Coral Gables Office Park
**Issue:** 5.23% cap rate. Coral Gables Class B trades at 7.0–8.5%. Comparables: $205–$215/sqft. Current $316/sqft is roughly 48% above comparable sales evidence.

- Income cap at 7.6% (88% occupancy warrants slight yield premium vs fully-let)
- Cross-check: $9.8M ÷ 45,000 = $218/sqft — aligns with Coral Gables comparables + modest premium for location quality
- **Corrected: $9,800,000** (7.6% NIY)

### fl-002: Brickell Retail Center
No correction. 5.29% NIY within the 5.0–5.8% range for Brickell urban NNN. $783/sqft is below comparables ($857–$935/sqft), which is appropriate given Coastal Pharmacy at $62 vs $72 ERV. Reversionary value (renewal at market) would support $10.0–10.5M.

### fl-003: Tampa Industrial Park
**Issue:** 5.25% implied cap rate vs 5.5–6.5% market. Gulf Coast Logistics FRI lease to 2029 with below-ERV rent ($14 vs $17) supports slightly tighter yield, but comparables show $176–$184/sqft vs current $200/sqft.

- Income cap at 5.65% (below-ERV lease = reversionary upside mitigates yield premium)
- Cross-check: $5.2M ÷ 28,000 = $186/sqft — within comparables range
- **Corrected: $5,200,000** (5.65% NIY)

### fl-004: Orlando Business Center
**Issue:** Most significant error. 4.96% cap rate for Class B multi-tenant Orlando office with 18% vacancy. Comparable sales show $151–$170/sqft at 8.2–8.8%. Current $300/sqft is approximately double comparable evidence.

- Income cap at 7.94% (82% occupancy, multiple near-term lease expirations, saturated suburban office market)
- Cross-check: $6.0M ÷ 32,000 = $188/sqft — slight premium to comparables, reflecting 18% reversionary upside if fully let
- **Corrected: $6,000,000** (7.94% NIY)

### fl-005: Fort Lauderdale Flex
No correction. 6.16% within the 6.0–7.0% range. $250/sqft consistent with Broward comparables ($210–$212/sqft, modest premium for SunCoast Tech's longer lease to 2028 and 92% occupancy).

---

## Revised Portfolio Summary

| Asset | Old Value | New Value | Change | Corrected Cap Rate | $/sqft |
|---|---|---|---|---|---|
| Coral Gables Office | $14,200,000 | $9,800,000 | −$4,400,000 | 7.6% | $218 |
| Brickell Retail | $9,400,000 | $9,400,000 | — | 5.3% | $783 |
| Tampa Industrial | $5,600,000 | $5,200,000 | −$400,000 | 5.65% | $186 |
| Orlando Office | $9,600,000 | $6,000,000 | −$3,600,000 | 7.94% | $188 |
| Fort Lauderdale Flex | $4,500,000 | $4,500,000 | — | 6.2% | $250 |
| **Total** | **$43,300,000** | **$34,900,000** | **−$8,400,000** | | |

---

## Why Corrected Data Makes the Demo Stronger

**1. Coral Gables: the reversionary value story**
At $9.8M (corrected), with three leases expiring 2027 at $25–$26/sqft vs ERV $29: if re-let at market, gross income = $1.305M, net ~$915k, capitalised at 7.6% = **$12.0M**. The gap between current ($9.8M) and reversionary ($12.0M) is $2.2M upside that RealHQ identifies and tracks.

**2. Orlando: filling one vacant floor is the most valuable thing this owner can do**
5,760 sqft vacant at $27 ERV = $155k additional NOI. At 7.94% cap rate, that's **$1.95M of latent value**. RealHQ surfaces this and tells the owner which tenants in the submarket are actively looking.

**3. Tampa Industrial: the 2029 renewal window**
$14/sqft passing vs $17 ERV — a 21% gap locked in until 2029. At renewal, additional NOI = $84k/year, which at 5.65% adds **$1.49M of value**. RealHQ flags the re-gearing opportunity 18–24 months out.

---

## AVM Methodology Limitations

RealHQ should be transparent about AVM limitations when asked:

1. **No inspection data** — AVM assumes market-average condition. Deferred maintenance or structural issues will cause overvaluation.
2. **Transaction data lag** — FL commercial data has a 60–90 day lag. Fast-moving markets may not be reflected.
3. **Effective rent opacity** — FL retail effective rents (with landlord contributions, rent-free periods) may not be fully captured in asking rent databases.
4. **Special-use properties** — Cold storage, data centres, medical fit-out require manual input; income capitalisation approach will misvalue these.

**The right framing for prospects:** *"RealHQ's AVM gives you a market-calibrated starting point in seconds. It replaces the broker opinion you waited 3 weeks for. A formal MAI appraisal is still required for financing — but for portfolio management, asset review, and negotiation prep, our AVM is faster and more consistent than any manual process."*

---

*Prepared by Head of Real Estate & Commercial | March 2026*
*Sources: CBRE Cap Rate Survey H2 2024, JLL FL Office Outlook Q4 2024, Marcus & Millichap FL Market Reports Q4 2024, CoStar/LoopNet comparable transaction data*
