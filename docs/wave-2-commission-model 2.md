# RealHQ Wave 2 Commission Model

**Status:** Draft
**Date:** 2026-03-21
**Author:** Head of Product
**Sources:** RealHQ-BuildOrder-CEO-v1.html, Propra-Master-Spec-v3.html, Addendum v3.1

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
| Tenant find | 10% of first year's rent | Heads of terms agreed via RealHQ | £60k rent → **£6,000** | $80k rent → **$8,000** |
| Work order / contractor tendering | 3% of contract value | Works instructed via contractor panel | £50k works → **£1,500** | $60k works → **$1,800** |
| Acquisitions advisory | 0.5–1% of deal value | Deal completed via RealHQ | £4M deal → **£20k–£40k** | $4M deal → **$20k–$40k** |
| Transaction management | 0.25% of deal value | Sale or purchase managed to completion | £4M sale → **£10,000** | $4M sale → **$10,000** |

### Wave 3+ commissions (for context — not Wave 2)

| Service | Commission rate | Trigger | Example |
|---------|---------------|---------|---------|
| Rent uplift | 8% of annualised saving | New rent agreed at renewal via RealHQ | £71k gap closed → **£5,680** |
| CAM recovery | 8% of recovered amount | Recovery executed via tenant billing | £18k recovered → **£1,440** |
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

A representative 10-asset commercial portfolio in SE UK.

| Category | Annual uplift for client | RealHQ commission |
|----------|------------------------|------------------|
| Energy tariff switches (4 assets) | £52,000/yr saving | £5,200 |
| HVAC optimisation (2 assets) | £24,000/yr saving | £1,920 |
| Solar installation (1 asset) | £14,000/yr income | £1,400 |
| Insurance placement | £18,000/yr saving | £2,700 |
| Tenant find (1 vacancy filled) | £60,000 first year rent | £6,000 |
| Work orders (5 jobs avg £20k each) | — | £3,000 |
| Rent uplift (3 reviews actioned) | £71,000/yr additional rent | £5,680 |
| CAM recovery (2 tenants) | £18,000 recovered | £1,440 |
| **Total** | **£257,000/yr client benefit** | **~£27,340/yr commission** |

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

## Wave 2: tenant find commission — detailed spec

Tenant find is the highest-volume Wave 2 commission after energy switching.

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
