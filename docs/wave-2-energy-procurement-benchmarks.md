# UK Commercial Energy Market — Tariff Switching Reference
**RealHQ Wave 2 Energy Intelligence: Real Estate & Commercial Input**
*Prepared by Head of Real Estate & Commercial | Q1 2026*

---

## Purpose

Engineering is building the tariff comparison and switching feature (Priority 1 in Wave 2 engineering handoff). This document provides the commercial real estate context needed to build it correctly:

1. How UK commercial energy procurement actually works
2. Which suppliers are relevant for SME commercial property owners
3. What "market rate" means in practice and how to present the comparison
4. Typical consumption profiles and bill structures by building type
5. Switching mechanics — notice periods, exit penalties, contract terms
6. What data to extract from an uploaded bill to run a comparison

---

## Part 1: How UK Commercial Energy Procurement Works

### The critical consumption tier distinction

| Tier | Annual consumption | Regulated? | Typical RealHQ assets |
|---|---|---|---|
| Micro-business | ≤100,000 kWh electricity | Yes — Ofgem protections apply | Small retail units, single-office tenants |
| SME / non-domestic | 100,000–500,000 kWh | Partially (UEA code) | Medium industrial, multi-unit estates |
| Half-hourly (HH) | >100kW max demand OR >500,000 kWh | No — fully deregulated, bespoke | Large logistics, big-box warehouse |

**Product implication:**
- Dartford (DHL, 85k sqft) and Thurrock (Amazon, 120k sqft) are almost certainly **HH-metered** — automated API switching is not appropriate; flag for broker tendering
- Basildon (multi-let, 45k sqft) and Medway (multi-let, 32k sqft) are likely **SME tier** — suitable for automated comparison
- Gravesend (XPO, 68k sqft) — borderline; depends on tenant's equipment load

### How UK commercial contracts are structured

**Fixed-term contracts (most common for SME):**
- 1, 2, or 3-year fixed price
- Unit rate (p/kWh) + standing charge (p/day) fixed for the term
- **The auto-rollover trap:** if owner does not serve notice within the 28–90-day renewal window, contract rolls to a "deemed" or "out-of-contract" rate that is typically 30–60% above the competitive market
- This is the primary cause of commercial energy overpayment

**Key components of a UK commercial electricity bill:**

| Line item | Typical range (Q1 2026) | Notes |
|---|---|---|
| Unit rate | 18–26p/kWh | The headline number for comparison |
| Standing charge | 30–80p/day | Fixed daily cost |
| Climate Change Levy (CCL) | 0.775p/kWh | Government environmental levy |
| DUoS charges | Usually embedded in unit rate (SME) | Distribution Use of System |
| Capacity charge | £5–25/kVA/month | HH-metered customers only |
| VAT | 20% on all | Standard |

**What RealHQ must extract from an uploaded bill:**
1. Unit rate (p/kWh) — current
2. Standing charge (p/day) — current
3. Contract end date / renewal date
4. Annual consumption (kWh) — on bill or derivable from period reads
5. Max demand (kW) — if HH metered
6. MPAN (Meter Point Administration Number) — required to execute a switch
7. Current supplier name

---

## Part 2: Suppliers and Market Rates (Q1 2026)

### Priority integration targets

| Supplier | API status | Use case |
|---|---|---|
| **Octopus Energy for Business** | Full API (Octopus Developer Hub) — free sandbox | Primary integration target for Wave 2 |
| **EDF Business** | Broker/UEA access | Large commercial, 3yr+ contracts |
| **British Gas Business** | Partial API | Multi-site portfolios |
| **E.ON Next Business** | Partial API | Industrial |
| **Total Energies** | Broker | Large SME/commercial |

### Current market rates (Q1 2026 — indicative)

| Contract type | Unit rate | Standing charge |
|---|---|---|
| Octopus 12-month fixed (SME, SE England) | 18–22p/kWh | 40–65p/day |
| EDF 24-month fixed (SME) | 19–23p/kWh | 38–62p/day |
| Deemed / out-of-contract | 28–40p/kWh | 60–120p/day |
| Legacy auto-renewed (2022–2023 era) | 24–32p/kWh | 55–95p/day |

### The overpay scenario in numbers (demo-ready)

A 45,000 sqft warehouse consuming 900,000 kWh/year:
- Legacy auto-renewed at 28p/kWh: **£252,000/yr**
- New Octopus 12-month fixed at 20p/kWh: **£180,000/yr**
- **Saving: £72,000/yr** → RealHQ commission at 10% = **£7,200**

---

## Part 3: Consumption Profiles by Building Type

Engineering needs these for: (a) estimating consumption when bill data is incomplete, (b) HVAC anomaly benchmarks.

| Building type | kWh/sqft/year | Key drivers |
|---|---|---|
| UK logistics/warehouse (ambient) | 8–14 | Lighting, dock equipment, EV charging |
| UK logistics/warehouse (cold store) | 30–60 | Refrigeration compressors |
| UK multi-let industrial | 12–18 | Varies by tenant mix |
| UK office (1990s–2010s vintage) | 18–28 | HVAC dominant |
| UK office (post-2015, good EPC) | 12–18 | LED, efficient HVAC |
| UK retail (standard) | 20–30 | HVAC, lighting, refrigeration |
| UK retail (food/bev heavy) | 35–55 | Commercial kitchen equipment |
| UK flex (office + light industrial) | 15–22 | Mixed |

### HVAC anomaly thresholds

| Anomaly type | Detection rule | Saving formula |
|---|---|---|
| Overnight waste (11pm–5am) | Overnight reads >10% of daytime peak for an empty building | (Overnight kWh − expected 10% baseline) × unit rate × 365 |
| Weekend spike | Weekend consumption ≥70% of weekday for empty buildings | (Weekend excess kWh) × unit rate × 52 |
| Seasonal spike (un-normalised) | Winter kWh/sqft >2× summer kWh/sqft | Flag for degree-day normalisation before raising |

**Important:** Normalise against Met Office degree-days before flagging winter consumption anomalies. Free degree-day data available for 17 UK stations at vesma.com — sufficient precision for this use case.

---

## Part 4: Switching Mechanics

### Step-by-step switch process

1. Identify contract end date and renewal window from extracted bill data
2. Check for exit penalties — calculate net saving after break fee
3. Run comparison via Octopus API (or broker for HH)
4. Owner signs Letter of Authority (LOA) — one page, authorises RealHQ to negotiate
5. Owner accepts new contract in RealHQ
6. 20-working-day objection period (current supplier — rare)
7. Transfer takes ~15 working days from acceptance
8. New supplier confirms supply start → commission trigger

### Renewal alert logic

| Trigger | Alert | Copy |
|---|---|---|
| 90 days before contract end | Amber | "Energy contract at [property] expires [date]. Start comparison now to avoid rollover." |
| 30 days before | Red | "Urgent: contract expires in [X] days. Switch now to avoid out-of-contract rates." |
| Contract already rolled over | Red | "You are on an out-of-contract rate. Switching now could save £[X]/yr." |

### Exit penalty calculation (always show net saving)

```
Year-1 net saving = Annual saving − Exit penalty
2-year net saving = (Annual saving × 2) − Exit penalty
```

Always show the time horizon. Exit fee is one-off; saving is recurring.

---

## Part 5: UK vs FL — Critical Product Difference

| | UK | Florida |
|---|---|---|
| Retail energy competition | ✅ Fully deregulated — switch supplier | ❌ Monopoly utility (FPL/Duke/TECO) — cannot switch |
| Automated switching | ✅ Via supplier API | ❌ Not possible |
| How to save (FL) | N/A — no switching | Solar ROI, HVAC efficiency, demand charge reduction |
| CTA on energy screen | "Switch supplier — save £X/yr" | "Solar opportunity — earn £X/yr" or "HVAC optimisation — save $X/yr" |

**Do not show a "Switch supplier" CTA for FL assets.** Show solar opportunity card and HVAC benchmark instead.

---

## Part 6: SE UK Portfolio — Switching Opportunity Sizing

| Asset | Est. kWh/yr | Current rate (est.) | Octopus rate | Annual saving | Commission (10%) | HH-metered? |
|---|---|---|---|---|---|---|
| Dartford (se-001) | 1,190,000 | 24p | 20p | **£47,600** | £4,760 | Probably — flag |
| Thurrock (se-002) | 1,680,000 | 25p | 20p | **£84,000** | £8,400 | Yes — broker |
| Basildon (se-003) | 650,000 | 24p | 19p | **£32,500** | £3,250 | No — SME |
| Medway (se-004) | 464,000 | 24p | 19p | **£23,200** | £2,320 | No — SME |
| Gravesend (se-005) | 952,000 | 24p | 19p | **£47,600** | £4,760 | Borderline |
| **Total** | **4,936,000** | | | **£234,900/yr** | **£23,490** | |

Basildon and Medway are the cleanest targets for the automated API switch flow. Dartford and Thurrock require HH broker tendering — stub this for now, show "Request brokerage" CTA instead.

---

## Part 7: Build vs Stub Summary for Engineering

| Feature | Action | Reason |
|---|---|---|
| Bill OCR: extract unit rate, standing charge, consumption, MPAN, contract end date | ✅ Build | Uses existing Wave 1 OCR pipeline |
| Tariff comparison via Octopus API | ✅ Build | Free sandbox available now |
| Net saving calculation (with exit fee shown) | ✅ Build | Pure calculation logic |
| Renewal alert (90-day / 30-day warnings) | ✅ Build | Uses contract end date extracted from bill |
| "You're on an out-of-contract rate" detection | ✅ Build | Compare extracted rate vs current Octopus market rate |
| Switch execution via Octopus API | ✅ Build for Octopus | Confirm commercial terms first |
| Tariff comparison via EDF / BG / EON | 🔶 Stub | APIs not confirmed — show "More quotes available soon" |
| HH-metered customer broker tendering | 🔶 Stub | Complex workflow — show "Request brokerage" CTA for HH assets |
| FL tariff switching | ❌ Do not build | FL is monopoly utility — show solar/HVAC instead |
| SMETS2/DCC smart meter integration | 🔶 Stub | Board action required for DCC authorisation |

---

*Prepared by Head of Real Estate & Commercial | March 2026*
*For: Engineering team — supports Wave 2 Priority 1 build (energy tariff comparison)*
