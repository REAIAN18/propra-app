# Wave 2 — Revenue Projection Per Active Client
**Author:** Head of Product
**Date:** 2026-03-23
**Purpose:** What does each Wave 2 sprint earn per active client? What's the total annual commission at 10/25/50 clients?

---

## Model assumptions

**Client profile:** Owner-operator with 5–15 commercial assets, mixed SE UK logistics or FL commercial.
**Asset values:** £750k–£3M per asset (UK), $500k–$2.5M per asset (US).
**Rent rolls:** £60k–£200k annual rent per asset.
**Portfolio size used for base case:** 10 assets, avg £120k rent, avg £1.5M value (UK), $1M (US).

**Frequency assumptions (per client per year):**
- Work orders: 3–5 medium-sized jobs per portfolio per year
- Rent reviews: 1–2 leases reviewed per year (staggered 3–5 year review cycles)
- Insurance: 1 placement event per portfolio per year at renewal
- Energy: 1 switch event per portfolio per 2 years
- Scout acquisitions: 0.5 completions per client per year (ambitious but conservative for active acquirers)

---

## Revenue by feature at commission rates

### Already live (Wave 1 — baseline)

| Feature | Avg saving per event | Commission rate | Avg commission |
|---------|---------------------|-----------------|----------------|
| Insurance placement | £18k–£35k saving | 15% | **£2,700–£5,250/yr** |

Wave 1 annual run rate per active client: **£2,700–£5,250**

---

### Wave 2 Sprint 1–2 additions

#### Work Orders (Sprint 2 — 3% of contract value)
- Average work order value: £8,000–£25,000
- Jobs per portfolio per year: 4 (conservative)
- Annual contract value: £32k–£100k
- Commission at 3%: **£960–£3,000/yr per client**

*Examples:*
- HVAC replacement £18,000 → £540 commission
- Roof repair £12,000 → £360 commission
- Electrical rewire £8,000 → £240 commission
- 4 jobs averaging £15k: £1,800/yr

#### Energy Wave 2 (HVAC anomaly detection, solar)
Energy switch was Wave 1. Wave 2 adds:
- Solar installation referral: 10% of year-1 income — avg £800–£1,500 if assessed and 1 installation completes
- Conservative: 20% of clients proceed to solar in year 1 → £160–£300 expected value per client

---

### Wave 2 Sprint 3 additions

#### Rent Review Automation (Sprint 3 — 8% of annual uplift)
- Average rent uplift achievable: 8–15% of current rent
- Average lease at review: £80k annual rent
- Achievable uplift: £6,400–£12,000
- Commission at 8%: **£512–£960 per review**
- 2 reviews per portfolio per year: **£1,024–£1,920/yr per client**

*Examples:*
- SE UK logistics unit, £120k rent, 10% uplift = £12,000 uplift → **£960 commission**
- FL commercial unit, $100k rent, 12% uplift = $12,000 uplift → **$960 commission**

#### Scout Acquisitions (Sprint 1–2 full pipeline)
Underwriting and LOI are Sprint 1–2. Actual completions are Sprint 3+ (when full pipeline and transaction room mature).
- Conservative: 0.25 completions per active acquirer per year in Year 1
- Average deal size: £1.5M (UK), $1.2M (US)
- Commission at 0.5–1% on completion: **£7,500–£15,000 per deal**
- Expected value per client per year: **£1,875–£3,750** (at 0.25 completion rate)

Note: Scout is a high-variance, high-value commission line. One deal a year per active acquirer is transformative for unit economics.

---

## Annual commission per client — by sprint wave

| Revenue source | Available from | Annual per client |
|---------------|---------------|-------------------|
| Insurance placement | Now (Wave 1) | £2,700–£5,250 |
| Energy switch | Now (Wave 1) | £2,200–£5,200 every 2 yrs (£1,100–£2,600 annualised) |
| Work Orders (3%) | Sprint 2 | £960–£3,000 |
| Rent Review (8%) | Sprint 3 | £1,024–£1,920 |
| Scout acquisitions (0.5–1%) | Sprint 2–3 | £1,875–£3,750 (at 0.25 completion/yr) |
| **Wave 2 total (ex-Scout)** | Sprint 3 complete | **£7,784–£17,770/yr** |
| **Wave 2 total (inc-Scout)** | Sprint 3 complete | **£9,659–£21,520/yr** |

---

## Revenue unlock per sprint

### At Sprint 1 completion (Phase 0 + Scout underwriting)
- Work Orders backend spec'd but not billing yet
- Scout LOI live — shortens time-to-offer for acquisitions
- **Incremental revenue: £0 additional commission** (groundwork only)
- **Value:** faster deal velocity → Scout commission unlocked earlier

### At Sprint 2 completion (Work Orders billing, AVM, Tenant data live)
- Work Orders completion → Commission trigger live
- AVM running → Hold vs Sell more accurate
- Tenant data real → Rent Review prep begins
- **Incremental commission: +£960–£3,000/yr per client** (Work Orders alone)
- **Cumulative: £4,760–£13,850/yr per client** (Wave 1 + Work Orders)

### At Sprint 3 completion (Rent Review + Planning + Hold vs Sell DCF)
- Rent Review automation → 8% commission on uplifts
- Hold vs Sell full DCF → better sell recommendations → some Scout deals close
- **Incremental commission: +£2,049–£5,670/yr per client** (Rent Review + Scout start)
- **Cumulative: £6,809–£19,520/yr per client**

### At Sprint 4 completion (Action Queue live)
- Action Queue surfaces all opportunities proactively
- Increases conversion rate across all commission lines (estimated 20–30% uplift)
- Adjusted cumulative: **£8,170–£25,376/yr per client** (with 20% conversion uplift)

---

## Unit economics at scale

### Base case: No Scout completions

| Active clients | Sprint 2 complete | Sprint 3 complete | Sprint 4 complete |
|---------------|------------------|------------------|------------------|
| 10 | £47,600–£138,500 | £68,090–£195,200 | £81,700–£253,760 |
| 25 | £119,000–£346,250 | £170,225–£488,000 | £204,250–£634,400 |
| 50 | £238,000–£692,500 | £340,450–£976,000 | £408,500–£1,268,800 |
| 100 | £476,000–£1,385,000 | £680,900–£1,952,000 | £817,000–£2,537,600 |

### With Scout completions (0.25 completions/yr per active acquirer client)

Assuming 40% of clients are active acquirers (= 4/10, 10/25, 20/50, 40/100):

| Active clients | Additional Scout revenue | Total at Sprint 4 |
|---------------|------------------------|------------------|
| 10 | £7,500–£15,000 | £89,200–£268,760 |
| 25 | £18,750–£37,500 | £223,000–£671,900 |
| 50 | £37,500–£75,000 | £446,000–£1,343,800 |
| 100 | £75,000–£150,000 | £892,000–£2,687,600 |

---

## First commission milestones

| Milestone | What happens | When |
|-----------|-------------|------|
| First insurance commission | User uploads policy PDF + binds quote | Available now |
| First energy commission | User uploads energy bill + executes switch | Available now |
| First Work Orders commission | User raises WO → selects contractor → work completes | Sprint 2 (6–8 weeks) |
| First Rent Review commission | User sends review letter → tenant agrees uplift | Sprint 3 (10–14 weeks) |
| First Scout commission | User marks deal interested → underwrite → LOI → completes | Sprint 2–3 + deal timeline (~6 months realistically) |

---

## Key observations for CEO

1. **Wave 1 is sufficient to earn commission today.** Insurance is live. Energy is live. First commission = first user uploads a policy PDF. No Wave 2 needed.

2. **Work Orders is the highest-frequency commission in Wave 2.** More events per year than rent reviews, lower commission per event, but predictable. Sprint 2 is the most commercially important sprint.

3. **Rent Review is the highest-margin commission.** £512–£960 per event, 2/yr per client, nearly pure margin. Sprint 3 is the highest-leverage sprint for per-client LTV.

4. **Scout is the highest-ceiling commission.** One completion at £1.5M at 1% = £15,000 from a single transaction. But it's long-cycle (6+ months deal timeline) and low-frequency. Build it for LTV, not quarterly revenue.

5. **The Action Queue (Sprint 4) is a multiplier, not a commission line.** It increases conversion rates across all existing commission lines by surfacing the right opportunities at the right moment. Build it last but don't skip it.

6. **10 active clients at Sprint 3 complete = ~£68k–£195k annual revenue.** Midpoint: ~£130k. That's the target revenue floor for Wave 2 launch.

---

## Sensitivity: What if conversion rates are lower?

All estimates above assume clients act on recommendations. If only 50% of insurance overpays convert to placements:

| Scenario | Annual per client | 25-client run rate |
|----------|-----------------|------------------|
| Full conversion | £8,170–£25,376 | £204k–£634k |
| 50% conversion | £4,085–£12,688 | £102k–£317k |
| 25% conversion | £2,043–£6,344 | £51k–£159k |

Even at 25% conversion, 25 active clients generates £51k–£159k/yr. The economics work at very low conversion rates, which means the business model is robust to a poor product experience.
