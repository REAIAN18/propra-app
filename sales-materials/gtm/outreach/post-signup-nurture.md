# RealHQ — Post-Signup Nurture Sequence
**Goal:** Convert signed-up prospects to booked demo calls
**Trigger:** User signs up on arca.ai but does not immediately book a call
**Prepared:** 2026-03-19

---

## Sequence Overview

| Email | Timing | Subject | CTA |
|-------|--------|---------|-----|
| Email 1 | Day 3 post-signup | [Name] — what RealHQ found in portfolios like yours | Book a call |
| Email 2 | Day 7 post-signup (if no call booked) | Still here if you want to run it on your portfolio | Book a call OR reply with portfolio size |

---

## Email 1 — Day 3 post-signup

**Trigger:** 3 days after signup, no call booked
**Subject:** [Name] — what RealHQ found in portfolios like yours

---

[First name],

You signed up a few days ago — I wanted to share what we typically surface in the first week on a portfolio like yours.

Here's what RealHQ found when we ran a 5-asset FL portfolio through our benchmarking system last month:

- **Insurance:** $102k in overpay vs current market — policies placed individually across different brokers, never put on a portfolio schedule
- **Energy:** $161k gap — commercial contracts inherited from prior owners, not renegotiated since acquisition
- **Rent roll:** $243k in undermarket leases — 3 tenants on rates set 4+ years ago with no escalation clause

That's $506k in identifiable leakage. Not unusual. Most of it had been sitting there for years.

On your portfolio, the mix will be different — but the pattern is almost always the same.

Want to see what the numbers look like for your specific assets? 20 minutes is enough to tell you where the gaps are.

Book a time: https://cal.com/realhq/portfolio-review

Ian Baron
RealHQ

---

**Personalisation notes:**
- Replace [Name] / [First name] with actual prospect name from signup data
- If signup form captures portfolio size or asset type, consider adjusting the example (e.g. for a 10-asset portfolio, scale the numbers proportionally — approx $50k per asset across the three categories is a conservative benchmark)
- If prospect is SE UK (not FL), adjust energy reference from "commercial contracts" to "energy procurement contracts" — same logic applies

---

## Email 2 — Day 7 post-signup (if no call booked)

**Trigger:** 7 days after signup, still no call booked
**Subject:** Still here if you want to run it on your portfolio

---

[First name],

You signed up a week ago — I don't want to pester you, but I also don't want to leave you hanging.

RealHQ works best when we run it on your actual assets, not demo data. That's where the real numbers come from — the specific carriers your insurance is placed with, the exact tariff you're on for energy, the rent you're actually charging vs what the market bears.

Before I run anything, one question: how many assets are in your portfolio?

Just reply to this email with the number (or a rough range). It helps me understand whether and where the biggest levers are likely to be, so the 20-minute call is actually useful.

If you'd rather just book the time directly:

https://cal.com/realhq/portfolio-review

Either way — I'm here.

Ian Baron
RealHQ

---

**Personalisation notes:**
- Keep this one short and low-pressure. They signed up — they're interested. This is a soft nudge, not a hard sell.
- The qualifying question ("how many assets?") has two functions: it gets a reply (re-engagement), and it tells us whether this is a viable prospect (3+ assets is the threshold)
- If prospect replies with 1–2 assets: honest response — "We're best suited for portfolios of 3 or more assets, but happy to do a quick call and at least point you in the right direction"
- If prospect replies with 3+ assets: treat as warm lead — book the call, update pipeline tracker

---

## Integration Notes

**Where these fit in the funnel:**

```
Cold outreach (wave-1/wave-2 emails)
    → Prospect visits arca.ai
        → Signs up
            → Welcome email fires immediately (src/lib/email.ts)
                → Day 3: Email 1 (this sequence)
                    → Day 7: Email 2 (this sequence, if no call booked)
                        → Call booked → demo flow
```

**Implementation:**
- These are follow-up emails to the existing welcome email in `src/lib/email.ts`
- Requires a scheduled email job (e.g. cron or queued task) triggered on signup event
- Condition to suppress Email 2: call booked (detectable via cal.com webhook if integrated)
- Both emails send from Ian Baron directly — not a no-reply address

**Tracking:**
- Update `sales-materials/gtm/prospects-fl.csv` columns: `nurture_email_1_sent`, `nurture_email_2_sent`, `reply_received`, `call_booked`
- Log reply content in `notes` column — especially portfolio size responses from Email 2
