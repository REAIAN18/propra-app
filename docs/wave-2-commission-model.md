# RealHQ Wave 2 Commission Model

**Status:** Draft
**Date:** 2026-03-21
**Author:** Head of Product
**Sources:** RealHQ-BuildOrder-CEO-v1.html, RealHQ-Spec-v3.2.html, Addendum v3.1

---

## Model summary

**Commission-only. Zero setup fees. Zero subscription fees.**

RealHQ earns when clients earn. Every commission is triggered by an executed action — not a recommendation, not a report, not a conversation.

Software executes → client benefits → RealHQ earns. If no action is taken, no commission is charged.

---

## Full commission schedule

### Wave 1 commissions (already live / in build)

| Service | Commission rate | Trigger | Example (UK) | Example (US) |
|---------|---------------|---------|------------|-------------|
| Insurance placement | 15% of year-1 saving | Policy placed via RealHQ + carrier API | £18k saving → **£2,700** | $34k saving → **$5,100** |

### Wave 2 commissions (new in Wave 2)

| Service | Commission rate | Trigger | Example (UK) | Example (US) |
|---------|---------------|---------|------------|-------------|
| Energy tariff switch | 10% of year-1 saving | Contract switched via supplier API | £52k saving → **£5,200** | $22k saving → **$2,200** |
| HVAC optimisation | 8% of annualised saving | BMS schedule change or contractor work executed | £12k saving → **£960** | — |
| Solar installation referral | 10% of first-year income (generation saving + export) | MCS installer appointed via RealHQ | £8k/yr income → **£800** | — |
| Work order / contractor tendering | 3% of contract value | Works instructed via contractor panel | £50k works → **£1,500** | $60k works → **$1,800** |
| Rent review uplift | 8% of annual uplift | New rent agreed at renewal (`PATCH /rent-reviews/:id/complete`) | £71k gap → **£5,680** | $80k gap → **$6,400** |
| Acquisitions advisory | 0.5–1% of deal value | Deal completed via RealHQ | £4M deal → **£20k–£40k** | $4M deal → **$20k–$40k** |

**Note on rent review:** The Wave 2 rent review cron (PRO-574) sends AI-drafted letters and generates DocuSign Heads of Terms. Commission is recorded when the owner confirms the new rent is agreed (`PATCH /rent-reviews/:id/complete` with `achievedRent`). Wave 2 captures the commission trigger — not just the letter generation. If the new rent is agreed outside the platform, owner manually logs it.

**Removed from Wave 2 vs earlier draft:** "Tenant find" (10% of first year's rent) and "Transaction management" (0.25% of deal value) were incorrectly listed as Wave 2 in an earlier draft. Both require features not built in Wave 2: Tenant find needs a lettings workflow (property marketing, viewings management, new-letting HoT — T3-15 in `docs/wave-3-triage.md`). Transaction management requires Transaction Room (T3-1). Both move to Wave 3+.

### Wave 3+ commissions (for context — not Wave 2)

| Service | Commission rate | Trigger | Example |
|---------|---------------|---------|---------|
| CAM recovery / service charge reconciliation | 8% of recovered amount | Recovery executed via tenant billing | £18k recovered → **£1,440** |
| Compliance certificate | £300–£500 fixed | Certificate ordered via panel | Per certificate |
| Ancillary income activation (5G, EV, solar) | 10% of first-year income | Income stream activated via RealHQ | £14k/yr 5G → **£1,400** |
| Refinance facilitation | 0.25% of loan value | Refinancing completed via lender panel | £5M loan → **£12,500** |
| Planning application | Fixed fee (per application) | Application submitted via RealHQ | TBD by tier |
| Grant application | % of grant awarded (success fee) | Grant confirmed | TBD |
| RICS valuation referral | Fixed referral fee | RICS valuer instructed via panel | £200–£500 per instruction |
| Solicitor referral | % of recovered arrears / transaction value | Solicitor instructed via RealHQ | TBD |
| Document generation | Fixed fee per document | Legal document generated | TBD |

---

## Unit economics: 10-asset UK portfolio

A representative 10-asset commercial portfolio in SE UK. This table shows illustrative steady-state annual commission across all waves — not Wave 2 only. Items marked * are Wave 3+ features not yet live.

| Category | Wave | Annual uplift for client | RealHQ commission |
|----------|------|------------------------|------------------|
| Insurance placement | Wave 1 | £18,000/yr saving | £2,700 |
| Energy tariff switches (4 SME-metered assets) | Wave 2 | £52,000/yr saving | £5,200 |
| HVAC optimisation (2 assets) | Wave 2 | £24,000/yr saving | £1,920 |
| Solar installation (1 asset) | Wave 2 | £14,000/yr income | £1,400 |
| Work orders (5 jobs avg £20k each) | Wave 2 | — | £3,000 |
| Rent review uplift (3 reviews actioned) | Wave 2 | £71,000/yr additional rent | £5,680 |
| Service charge reconciliation (2 tenants) | Wave 3+ | £18,000 recovered | £1,440 |
| Tenant find (1 vacancy filled) | Wave 3+ | £60,000 first year rent | £6,000 |
| Transaction management | Wave 3+ | — (per deal) | £10,000 per £4M deal |
| **Total (Wave 1+2 only)** | | **£179,000/yr client benefit** | **~£19,900/yr commission** |
| **Total (incl. Wave 3+)** | | **£257,000/yr client benefit** | **~£37,340/yr commission** |

Notes:
- "Energy tariff switches" applies to SME-metered assets only. HH-metered assets (large warehouses >100MWh/yr) require brokered tendering — commission model TBD.
- "Service charge reconciliation" is the correct UK term. CAM recovery is a US NNN lease concept — SE UK FRI leases use service charge, not CAM. Wave 3+.
- Rent review uplift is Wave 2 (PRO-574 built). Commission captured when owner confirms new rent agreed in platform.
- "Tenant find" and "Transaction management" moved from Wave 2 to Wave 3+ — no lettings or transaction room features built in Wave 2. See T3-15.

Client benefit-to-RealHQ-fee ratio: approximately 9:1. For every £1 paid to RealHQ, client receives £9 in value.

---

## How commissions are tracked in the product

**Tracking is built from Wave 1.** Every commission-earning action is recorded in the RealHQ platform at the moment it is executed. This serves two purposes:

1. **Client-facing:** Owner can see "RealHQ has earned £X on your behalf this year vs charged £Y" — transparency builds trust and demonstrates ROI.
2. **Business intelligence:** RealHQ can see which commission streams are performing, by client, by geography, by property type.

### Commission ledger (in product)

Accessible from dashboard → "RealHQ activity" or footer summary.

Each ledger entry:
- Date executed
- Commission type (insurance / energy / tenant find / contractor / etc.)
- Property involved
- Client saving or income generated (£/yr)
- RealHQ commission earned (£)
- Status: pending (action in progress) / confirmed (action complete) / paid

Dashboard summary tile: "RealHQ earned £27,340 for your portfolio this year."

---

## Wave 3: tenant find commission — detailed spec (deferred from Wave 2)

**Wave classification corrected:** Tenant find requires a lettings workflow not built in Wave 2 (property marketing, viewings management, new-letting HoT workflow). See `docs/wave-3-triage.md` T3-15. The commission model and calculation below remains valid for Wave 3 implementation.

### When it triggers

Trigger: heads of terms agreed for a new letting via RealHQ.

NOT triggered by: viewings, marketing material generation, or agent submissions. Only on heads of terms.

### Rate

10% of first year's contracted rent (default). Configurable per market (UK vs US may differ).

### Calculation example

Unit 3, Lakeside Industrial — 6,400 sqft. Agreed rent: £11.00/sqft/yr = £70,400/yr.

RealHQ commission: 10% × £70,400 = **£7,040**.

### Split (where agent is involved)

If RealHQ markets the property and a joint agent introduces the tenant:
- RealHQ earns 10% of first year's rent
- RealHQ pays the introducing agent their agreed fee from this (typically 5–7.5%)
- Net to RealHQ: 2.5–5% of first year's rent

This is standard practice in the market. The owner pays one fee (10%) regardless.

### Invoice timing

Commission invoice generated automatically when heads of terms are agreed in RealHQ. Payment terms: 30 days. If lease does not complete, commission is not payable (held until lease execution).

---

## Wave 2: work order commission — detailed spec

### When it triggers

Trigger: payment instruction generated (after owner approves completed works).

NOT triggered by: scope generation, contractor matching, or quote comparison.

### Rate

3% of contract value.

### Calculation examples

| Job | Contract value | Commission |
|-----|---------------|-----------|
| Roof repair | £25,000 | £750 |
| HVAC replacement | £85,000 | £2,550 |
| LED lighting upgrade | £42,000 | £1,260 |
| Full internal fit-out | £250,000 | £7,500 |

### Minimum threshold

No minimum contract value for commission calculation. Even a £500 emergency plumbing job earns £15. The value is in volume across the portfolio — not any individual job.

### Commission capture mechanism

When the owner approves completed works and payment is released via RealHQ:
1. RealHQ holds the payment temporarily (client's funds)
2. Deducts 3% commission
3. Releases balance to contractor
4. Records commission in the commission ledger

This requires RealHQ to be in the payment flow — a key product requirement. Payment should flow through RealHQ (Stripe Connect or similar), not directly client-to-contractor.

---

## Wave 2: rent review uplift commission — detailed spec

### When it triggers

Trigger: `PATCH /api/rent-reviews/:id/complete` — owner confirms new rent agreed.

NOT triggered by: cron letter generation, DocuSign Heads of Terms creation, or tenant acknowledgement of the letter. Only on confirmed new rent.

### Rate

8% of annualised rent uplift.

Annualised uplift = (achievedRent − currentRent) × 12.

### Calculation example

Unit 5, Southgate Logistics — 18,000 sqft warehouse. Review due: 2026-06-30.

- Current rent: £9.50/sqft/yr = £171,000/yr
- Achieved new rent: £11.20/sqft/yr = £201,600/yr
- Annualised uplift: £201,600 − £171,000 = **£30,600/yr**
- RealHQ commission: 8% × £30,600 = **£2,448**

### What counts as "agreed"

The commission is earned when the new rent is legally agreed — heads of terms accepted OR lease renewal executed. RealHQ captures this when the owner clicks "Confirm new rent agreed" in the platform and enters `achievedRent`.

If the review ends with no change (tenant holds at current rent), `achievedRent = currentRent` → uplift = £0 → commission = £0.

### Relationship to Wave 2 build

The Wave 2 rent review cron (PRO-574) handles:
1. Daily scan for leases with review date within 6 months
2. Claude-generated letter (AI draft, not formal legal notice)
3. DocuSign Heads of Terms (digital, not statutory Section 25)
4. Commission recorded when `PATCH /rent-reviews/:id/complete` fires

The Wave 2 automation does NOT handle statutory Section 25 notices — these are Wave 3 (Legal Document Automation, T3-4).

---

## Wave 2: energy switching commission — detailed spec

### When it triggers

Trigger: switch confirmation received from supplier API. The switch must actually execute — not just be initiated.

### Rate

10% of year-1 saving.

Year-1 saving = (current unit rate − new unit rate) × annual kWh + (current standing charge − new standing charge) × 365.

### Example calculation

|  | Current | New (Octopus) |
|--|---------|--------------|
| Unit rate | 28.4p/kWh | 21.2p/kWh |
| Standing charge | 60p/day | 45p/day |
| Annual consumption | 720,000 kWh | 720,000 kWh |

Year-1 saving: (0.284 − 0.212) × 720,000 + (0.60 − 0.45) × 365
= £51,840 + £54.75 = £51,895/yr

RealHQ commission: 10% × £51,895 = **£5,190**

### Commission source

Supplier API pays a broker fee to RealHQ on successful switch. This is the industry standard for energy broking. Alternatively, RealHQ marks up the tariff slightly and earns on the spread — model depends on supplier agreement.

### VAT / regulatory considerations

Energy broking in the UK is not an FCA-regulated activity. However, if RealHQ holds client funds for the switch process, payment services regulation may apply. Legal to confirm.

---

## What is NOT commissioned

| Service | Why |
|---------|-----|
| Ask RealHQ (portfolio chat) | Included — drives retention, not a revenue event |
| Dashboard and reporting | Included — core product |
| Document ingestion | Included — enables all commissioned services |
| Lease upload and extraction | Included — enables rent review, tenant find |
| Planning monitoring (nearby applications) | Included — enables planning application service |
| EPC and compliance monitoring | Included — enables compliance certificate ordering |
| Portfolio analytics and benchmarking | Included — demonstrates value, earns trust |

---

## Commission disclosure to clients

RealHQ discloses all commissions transparently in the product. The commission ledger shows what RealHQ earns on every action. This is not just a legal requirement (it is, for some services) — it is a product feature. Transparency is a differentiator.

Display: "RealHQ earned £5,190 from your energy switch with Octopus Energy. Your saving: £51,895/yr."

---

## Acceptance criteria

- [ ] Every commission-earning action (energy switch, tenant find completion, contractor payment, insurance placement) is recorded in the commission ledger at the moment of execution with: action type, property, date, client saving/income, commission amount.
- [ ] Commission ledger is accessible to the owner from the dashboard. Summary shown on dashboard: "RealHQ has earned £X for your portfolio this year."
- [ ] Energy switching commission is calculated from live figures: actual unit rate extracted from bill, actual new rate from supplier API, actual annual consumption from bill or smart meter. No hardcoded commission calculation.
- [ ] Tenant find commission is generated automatically when heads of terms are agreed in RealHQ. Invoice shows: unit, agreed rent, first year's rent total, commission rate (10%), commission amount. No manual calculation.
- [ ] Work order commission is deducted from payment before releasing to contractor. Ledger entry shows: job, contractor, contract value, commission (3%), amount released to contractor. Owner sees the deduction explicitly — not buried in a net payment.
- [ ] Commission disclosure is shown on every commissioned action, pre-execution. Example: before the tariff switch executes, the confirmation modal shows "RealHQ commission on this switch: £5,190 (10% of year-1 saving of £51,895)." Owner must see this before confirming.
