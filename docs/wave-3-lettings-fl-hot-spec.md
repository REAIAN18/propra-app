# FL Lettings — Heads of Terms Specification
**Wave 3 Sprint 1 RE Commercial Supplement**
**Author:** Head of Real Estate & Commercial
**Date:** 2026-03-24
**Feeds into:** `docs/wave-3-sprint-1-brief.md` Feature 2 (Lettings Workflow)

---

## Purpose

The Sprint 1 brief's Claude HoT prompt uses UK commercial format (12-clause FRI/LTA 1954 structure). This supplement defines the FL-specific HoT structure for US NNN leases, so the `POST /api/user/lettings/:id/hot` route can produce jurisdiction-appropriate documents based on `asset.country`.

---

## Jurisdiction detection logic

```typescript
const isUK = asset.country === "UK";
// Use UK HoT prompt for UK assets, FL/US HoT prompt for US assets
```

---

## FL NNN Lease — Standard HoT Clauses

Florida commercial leases are almost universally NNN (Triple Net): tenant pays base rent plus all operating expenses (taxes, insurance, maintenance). This is the opposite of UK gross leases where the landlord bears most outgoings.

**Standard FL commercial NNN HoT — 12 clauses:**

| Clause | FL content |
|--------|------------|
| 1. Parties | Landlord entity (name + FL address), Tenant entity (name + state of incorporation), Guarantor if covenant grade C/D |
| 2. Premises | Address, sqft, unit reference, use class (FL zoning: commercial/industrial/retail), ADA compliance note |
| 3. Term | Commencement date, expiry date, option to renew (common in FL: one 5-yr renewal option) |
| 4. Base Rent | Annual NNN rent, monthly payment, first-year rate, annual escalator (typically 3% CPI-linked) |
| 5. NNN / Operating Expenses | Tenant pays: property taxes (FL ad valorem), insurance (landlord policy premium pass-through), CAM (common area maintenance), utilities. Estimated annual NNN amount disclosed at signing |
| 6. Security Deposit | Typically 1–2 months' base rent. May be replaced by LOC (Letter of Credit) for strong covenants |
| 7. Permitted Use | Specific use permitted (e.g. "General warehousing and distribution — no outdoor storage") |
| 8. Improvements / Build-Out | Tenant improvement allowance (if any) — amount per sqft, completion timeline |
| 9. Assignment and Subletting | Landlord consent required (not unreasonably withheld); no change of use without consent |
| 10. Insurance Requirements | Tenant to maintain: CGL $1M/$2M aggregate, Workers Comp statutory, Business Interruption. Landlord named as additional insured |
| 11. Renewal Option | One option to renew at market rent (appraised or agreed), 12 months' prior notice required |
| 12. Conditions / SNDA | Subject to: satisfactory credit check, lender SNDA approval if mortgaged, FL DBPR licence if applicable to use |

---

## Claude prompt — FL NNN HoT

Add this as the US/FL branch in `POST /api/user/lettings/:id/hot`:

```
You are a commercial real estate attorney drafting Heads of Terms for a new Florida NNN commercial lease.

Asset: {assetName}, {assetType}, {location}, Florida
Tenant: {companyName} (Covenant/credit grade: {covenantGrade})
Agreed base rent: ${agreedRent}/yr NNN
Lease term: {agreedTermYears} years from {commencementDate}
Break clause: {breakClause or "None"}
Rent-free / tenant improvement allowance: {rentFreeMonths} months free rent {or "$X/sqft TI allowance" or "None"}
Escalation: 3% per annum unless otherwise specified

Draft a complete Heads of Terms in standard Florida NNN commercial lease format with these clauses:
1. Parties (Landlord, Tenant, Guarantor if covenant grade C or D)
2. Premises (address, sqft, use class, ADA compliance acknowledgment)
3. Term and commencement date (include renewal option if term ≥3 years)
4. Base rent and annual escalation schedule
5. NNN pass-throughs (estimated annual property taxes, insurance, CAM — note these are estimates, subject to annual reconciliation)
6. Security deposit (standard 1-2 months base rent; suggest LOC if D covenant grade)
7. Permitted use (specific — not "general commercial")
8. Tenant improvement allowance / rent-free period (if applicable)
9. Assignment and subletting (landlord consent required, not unreasonably withheld)
10. Insurance requirements (CGL minimums, landlord as additional insured)
11. Renewal option (if applicable — one 5-yr option at market rent with 12 months notice)
12. Conditions (credit approval, lender SNDA if applicable, subject to contract)

Format as a numbered list. Use "Landlord" and "Tenant" throughout (not party names).
Flag items requiring completion before execution with [COMPLETE BEFORE EXECUTION].
Note: These are Heads of Terms only — not a binding lease. Full lease to be drafted by Tenant's attorney.
```

---

## NNN estimate calculation for demos

When generating a FL HoT, the NNN pass-through estimate should be included in the draft. Use these FL market benchmarks:

| Expense | Estimate | Basis |
|---------|---------|-------|
| Property taxes (ad valorem) | $0.50–$1.20/sqft/yr | FL mill rate by county — Miami-Dade ~$1.00–$1.20/sqft, Tampa/Hillsborough ~$0.70–$0.90/sqft |
| Insurance pass-through | $0.80–$2.50/sqft/yr | Varies by asset type and wind zone — see FL insurance benchmarks doc |
| CAM (common area) | $1.00–$3.50/sqft/yr | Office/retail higher; single-tenant industrial near zero |

**Example for Tampa Industrial (fl-003 demo asset):**
- Base rent: $17/sqft NNN
- NNN pass-through estimate: taxes $0.80 + insurance $1.00 + CAM $0.20 = $2.00/sqft
- Total gross equivalent: ~$19/sqft
- Monthly check to tenant: base rent + NNN actual = variable

---

## FL-specific HoT talking points for demo calls

When demonstrating the Lettings feature to FL prospects:

> "When you have a vacant unit — say Broward Medical Supplies leaves and you have 7,000 sqft to re-let in Fort Lauderdale — you add the enquiry, the platform checks the prospective tenant's credit, and generates the Heads of Terms. For a Florida NNN lease, that includes your base rent, the NNN pass-through estimate for taxes, insurance and CAM, the standard 3% escalator, and a renewal option if the term is 3+ years. Your attorney still reviews it and drafts the formal lease — but you start from a properly structured HoT rather than a blank page or an email thread."

**Commission hook:**
> "We earn 10% of the first year's contracted rent. On a Fort Lauderdale flex unit at $25/sqft on 7,000 sqft — that's $175,000 annual rent, $17,500 to RealHQ. The rest is yours."

---

## FL lease type coverage

| Asset type | Typical FL lease structure | HoT notes |
|---|---|---|
| Industrial/Warehouse | Single-tenant NNN, 3–10 year terms | Annual 3% escalator standard; renewal option common |
| Flex (light industrial/office) | NNN or Modified Gross | TI allowance varies $10–$40/sqft depending on fit-out required |
| Retail (NNN inline) | Pure NNN, 5–10 yr base terms | Co-tenancy clauses common in anchored centers — include if applicable |
| Multi-tenant office | Modified Gross or NNN — varies | Separate metering + utilities reconciliation if NNN |

---

## Security of tenure note (critical)

UK leases have LTA 1954 security of tenure — tenants get an automatic right to renew unless the landlord serves a valid Section 25 Notice.

**Florida has no equivalent.** When the lease expires in FL, it expires. There is no statutory right to renew. This is why the renewal *option* clause in the HoT is an important selling point for FL commercial tenants — it's a contractual right, not a statutory one.

Engineering note: the "LTA 1954 — contracted out or not" clause in the UK HoT prompt has **no FL equivalent** — omit this clause from the US branch. Do not include any reference to LTA 1954 in FL HoTs.

---

*Supplement to `docs/wave-3-sprint-1-brief.md` | March 2026 | For CTO and FSE attention*
