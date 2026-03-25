# Commercial Lease Review Checklist
**RealHQ Lease Intelligence — What to Extract from Every Uploaded Lease**
*Prepared by Head of Real Estate & Commercial | Q1 2026*

---

## Purpose

This document defines what RealHQ must identify, extract, and flag in any uploaded commercial lease. It serves two functions:

1. **Product spec** — what the lease extraction engine must parse and surface in the UI
2. **Ian's review guide** — what to check manually when reviewing a client's lease on a demo or discovery call

Covers UK commercial leases (FRI logistics/industrial, LTA 1954 regime) and US NNN commercial leases (FL retail, office, flex). Differences between the two regimes are called out explicitly.

---

## Section 1: Lease Identity (Extract First — Every Lease)

| Field | What to look for | Risk if missing |
|---|---|---|
| **Parties** | Full legal names of landlord and tenant. Note if tenant is an SPV — parent company guarantee matters | Cannot confirm who is on the hook for rent obligations |
| **Demise / Premises** | Exact definition of the premises (sqft, floor, unit reference). Cross-check against rent roll | Incorrect area = wrong rent/sqft = wrong benchmark comparison |
| **Term commencement date** | The date from which the term is calculated (often differs from access/completion date) | WAULT calculation will be wrong |
| **Contractual expiry date** | End of lease term — distinct from any holding-over provisions | Lease expiry alerts fire on wrong date |
| **Lease type** | FRI / NNN / Gross / Modified Gross / Internal Repairing | Determines which party bears which costs throughout |
| **Permitted use** | What the tenant is permitted to do with the premises | Affects re-letting options and planning implications |
| **Governing law** | UK (England & Wales, Scotland) or US state | Drives which regulatory regime applies (MEES, LTA 1954, etc.) |

---

## Section 2: Rent & Review (Must Extract)

| Field | What to look for | Red flags |
|---|---|---|
| **Passing rent** | Annual rent as a total and per sqft. Flag any rent-free periods still running | Rent-free running = gross income overstated if counted in rent roll |
| **Rent review dates** | Exact dates on which rent can be revised | Missed review = income foregone. Basildon Engineering's Jan 2023 review has been passed for 26 months |
| **Review mechanism** | Open market rental value / RPI / fixed uplift / stepped increase | Upward-only OMR clause is UK standard. RPI can go down. Fixed = predictable but may lag market |
| **Upward-only clause (UK)** | Almost universal in UK FRI leases | Assets with missed upward-only reviews are leaving money on the table |
| **Rent escalation (US NNN)** | Annual % increase built into the lease (standard: 2–3%/yr) | No escalation clause = flat real income over the full term |
| **CAM charges (US NNN)** | Common Area Maintenance charges: amount, basis, caps, exclusions | CAM reconciliation errors go undetected for years — most common revenue leakage in US retail |
| **Service charge (UK)** | Amount, basis, recoverable items, cap | Landlord must serve notices correctly or recovery is compromised |
| **VAT election (UK)** | Has landlord opted to tax? If yes, VAT is charged on rent | Affects investor holding cost and tenant cash position |

---

## Section 3: Break Clauses (Critical — Flag Immediately)

Break clauses are the highest single-risk item in any lease portfolio. An exercised break that was not anticipated can immediately destroy valuation. An untracked break that was not exercised is a missed confirmation of income security.

| Field | What to look for | Action |
|---|---|---|
| **Break date(s)** | Exact date(s). May be tenant-only, landlord-only, or mutual | Add to alert calendar with 6-month and 12-month lead |
| **Notice period** | Usually "not less than 6 months" written notice — strict compliance required | Calculate back from break date to get notice deadline |
| **Break conditions** | All sums paid / vacant possession / no material breach — all must be strictly met | If conditions not met, notice is invalid even if correctly served |
| **Break notice served?** | Check correspondence, not just the lease | No news is not good news — confirm status with landlord or solicitor |
| **Dilapidations on break** | Does exercising the break trigger a dilapidations liability? | Tenant may use dilapidations cost as a chip in break/surrender negotiations |
| **Break window type** | "On [date]" (fixed) vs "on or before [date]" (flexible) | Flexible break = more tenant-friendly; less income certainty for landlord |

**DHL Dartford worked example:** Break exercisable 31 May 2026. Notice period: not less than 6 months = notice deadline was ~30 November 2025. As of March 2026, DHL did not serve notice. Break has effectively lapsed — DHL is confirmed in occupation to June 2031. RealHQ should flag this as resolved, update the asset status, and recalculate Dartford's valuation upward from the break-risk discount.

---

## Section 4: Repair, Insurance & Outgoings

### Repairing Obligations

| Obligation | UK FRI Lease | US NNN Lease |
|---|---|---|
| Internal repairs | Tenant | Tenant |
| External repairs | Tenant | Tenant |
| Structure & frame | Tenant (FRI) or Landlord — check carefully | Landlord in most NNN |
| Roof | Tenant in FRI | Landlord in most NNN |
| Common areas | Landlord (via service charge) | Via CAM charges |
| Dilapidations / restoration | Scott Schedule / diminution cap | Restoration clause (US) |
| Schedule of condition | Was one annexed at lease start? | Limits tenant liability to condition at start |

**Critical flags:**
- No schedule of condition in an FRI lease of an older building = tenant fully liable for all dilapidations regardless of condition at commencement
- Structural exclusion from FRI obligations is unusual — limits landlord's ability to pass capex costs
- US NNN: "triple net" is not standardised. Review exactly which items are in and out of CAM

### Insurance Obligations

| Field | What to extract | Flag |
|---|---|---|
| **Who insures** | Landlord-placed vs tenant-placed | UK FRI: landlord typically places, tenant pays premium via service charge or direct clause |
| **Insured risks** | All-risk, flood, terrorism, subsidence, loss of rent | Missing risks = uninsured exposure — check annually |
| **Reinstatement value** | Agreed basis? Indexed? Last reviewed? | Out-of-date reinstatement = under-insurance — the most common insurance failure across portfolios |
| **Loss of rent cover** | Period of cover (UK: usually 2–3 years for logistics) | Under-insured loss of rent = landlord bears full void cost after a claim |
| **Tenant's right to approve insurer** | Rare in UK but present in some leases | Restricts landlord's ability to market-test the policy |

---

## Section 5: Assignment, Subletting & Change of Control

| Field | What to look for | Risk |
|---|---|---|
| **Assignment rights** | Landlord consent usually required — is it qualified (not unreasonably withheld) or absolute? | Absolute restriction = tenant cannot sell without landlord agreement (strong for landlord) |
| **AGA requirement (UK)** | Does assignor give an Authorised Guarantee Agreement? | AGA binds outgoing tenant for remainder of term if assignee defaults — standard in UK |
| **Subletting rights** | Whole or part? At no less than open market rent? | Subletting at below-market rent destroys ERV evidence for the whole building |
| **Permitted occupiers** | Group company sharing without assignment | Common but should be documented; unauthorised sharing = breach |
| **Change of control clause** | Does a change of ownership of the tenant trigger landlord consent? | Critical for PE-backed tenants and subsidiaries (DHL, XPO are Tesco subsidiary / GXO group entities) |

---

## Section 6: Termination, Renewal & Holding Over

| Topic | UK (LTA 1954) | US (FL — state law) |
|---|---|---|
| **Security of tenure** | Unless contracted out, tenant has statutory right to renew at market rent | No automatic right; lease terms govern |
| **LTA 1954 status** | Check if lease is "contracted out" (most modern UK commercial leases are) | N/A |
| **Holding over** | If not contracted out: tenancy continues on same terms until notices served correctly | FL: holdover clause typically sets rent at 150% of passing rent; month-to-month |
| **Landlord's right to oppose renewal** | LTA 1954 grounds A–H. Ground (f) = redevelopment; ground (g) = own occupation | N/A |

**Flag for every UK lease upload:**
- Whether LTA 1954 protection applies or has been excluded
- Whether the lease has expired and the tenant is holding over (ongoing at passing rent = income gap if ERV is higher)
- Whether a Section 25 / Section 26 notice has been served

---

## Section 7: MEES / EPC (UK Leases Only)

| Field | What to extract | Action |
|---|---|---|
| **EPC band** | A–G. Extract from EPC register reference in lease | Flag if Band E or below — at current minimum; will breach proposed 2027 Band D requirement |
| **Landlord access for improvements** | Does the lease allow landlord to access to carry out EPC works? | Without access rights, landlord cannot comply with MEES regardless of intent |
| **Green lease clauses** | ESG obligations on landlord or tenant | Increasingly present in institutional leases; affects future saleability |
| **Smart metering clause** | Right or requirement for smart meter installation | Required for energy benchmarking in the RealHQ energy intelligence feature |

---

## Section 8: Rent Deposit & Guarantees

| Field | What to look for | Risk if not tracked |
|---|---|---|
| **Rent deposit amount** | Usually 3–6 months' rent held as cash deposit | If not drawn promptly on default/insolvency it may be lost to administrator |
| **Draw-down conditions** | When and how can landlord access the deposit? | Conditions may be time-limited or require specific notice procedures |
| **Parent company guarantee (PCG)** | For SPV tenants, the PCG from a parent is the real covenant | DHL, XPO, Amazon are subsidiaries — the PCG holds the value |
| **Bank guarantee / LC** | Used instead of cash in many US leases | LC expiry must be tracked identically to a compliance certificate |
| **Personal guarantee** | For smaller tenants in FL retail/flex | Register against guarantor; monitor if possible |

---

## Section 9: RealHQ Extraction Priority Order

When a lease is uploaded, extract in this sequence:

| Priority | Field | Why this order |
|---|---|---|
| 1 | Expiry date | Foundation of all WAULT and alert logic |
| 2 | Break clause date + conditions | Highest immediate financial risk |
| 3 | Passing rent (total + per sqft) | Income benchmarking; ERV gap calculation |
| 4 | Rent review dates + mechanism | Income gap identification and action scheduling |
| 5 | Lease type (FRI / NNN / Gross) | Determines all cost allocation logic |
| 6 | Permitted use | Re-letting scenario modelling |
| 7 | Assignment / subletting rights | Covenant quality and exit options |
| 8 | Insurance obligations | Insurance benchmark comparison |
| 9 | EPC / MEES clauses (UK) | Compliance calendar and fine exposure |
| 10 | LTA 1954 status (UK) | Renewal risk flag |
| 11 | Guarantees and deposits | Covenant strength assessment |

---

## Section 10: Automatic Alert Rules

These conditions should trigger a flagged alert in the RealHQ dashboard when identified in any uploaded lease:

| Condition | Severity | Alert text |
|---|---|---|
| Break date ≤ 90 days | 🔴 Critical | "Break notice window may have closed — confirm DHL/[tenant] status immediately" |
| Break date ≤ 12 months | 🔴 Critical | "Break clause exercisable in [X] days — engage landlord/solicitor now" |
| Break date ≤ 24 months | 🟠 High | "Break clause in [X] months — add to lease management calendar" |
| Lease expiry ≤ 12 months | 🔴 Critical | "Lease expiring in [X] days — begin re-letting or renewal negotiations" |
| Lease expiry ≤ 24 months | 🟠 High | "Lease expiring in [X] months — [tenant] renewal window opening" |
| Rent review date passed, not actioned | 🔴 High | "Rent review [date] has passed without action — potential income foregone" |
| Passing rent ≥ 15% below ERV | 🟠 Medium | "Passing rent is [X]% below market ERV — renewal/re-gear opportunity" |
| Passing rent ≥ 25% below ERV | 🔴 High | "Significant reversionary gap: passing rent [X]% below ERV" |
| EPC Band E or below (UK) | 🟠 Medium | "EPC [Band] — at MEES minimum threshold; upgrade required before 2030" |
| Tenant SPV with no PCG recorded | 🟠 Medium | "Tenant is an SPV — no parent company guarantee on record" |
| Lease holding over (LTA 1954 applies) | 🟠 Medium | "Lease in statutory continuation — serve or respond to renewal notices" |

---

## Section 11: Demo Portfolio — Lease Issues Identified Using This Checklist

### SE UK Portfolio

| Asset | Tenant | Issue | Urgency |
|---|---|---|---|
| Dartford | DHL Supply Chain | Break May 2026: notice deadline passed ~Nov 2025. DHL did not serve notice — break has lapsed. Confirmed in occupation to Jun 2031. Update valuation upward. | Confirm in writing — HIGH |
| Basildon | Basildon Engineering | Rent review Jan 2023 — 26 months overdue. Passing £13/sqft vs ERV £16/sqft. Gap = £60k/yr income foregone. | Initiate immediately — HIGH |
| Gravesend | XPO Logistics | 289 days to expiry. No remaining break options. Needs re-letting now. | Begin re-letting — CRITICAL |
| Dartford | DHL Supply Chain | Passing £14/sqft vs ERV £18.50/sqft — 32% reversionary gap. | Flag for 2031 renewal prep |
| Thurrock | Amazon Logistics UK | Passing £15/sqft vs ERV £20.50/sqft — 37% reversionary gap. 2033 expiry. | Flag for mid-term re-gear conversation |

### FL Portfolio

| Asset | Tenant | Issue | Urgency |
|---|---|---|---|
| Brickell | Coastal Pharmacy | Lease expires Sep 2026 (167 days). At $62 vs ERV $72. | Renewal negotiations — CRITICAL |
| Fort Lauderdale | Broward Medical Supplies | Lease expires Oct 2026 (197 days). At $21 vs ERV $25. | Renewal negotiations — HIGH |
| Coral Gables | Meridian Legal LLP | Rent review Mar 2025 — confirm if actioned. At $26 vs ERV $29. | Confirm review — HIGH |
| Orlando | Vacant unit | 5,760 sqft vacant — $155k/yr income gap, $1.95M latent value at 7.94% cap rate | Active letting required — HIGH |
| Tampa | Gulf Coast Logistics | $14/sqft vs ERV $17 — 21% gap locked to 2029. | Flag for renewal prep 2027 |

---

*Prepared by Head of Real Estate & Commercial | March 2026*
*Applicable to: UK commercial leases (FRI, LTA 1954) and US commercial leases (NNN, FL state law)*
