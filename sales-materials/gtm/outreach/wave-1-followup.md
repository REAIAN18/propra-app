# Arca — Wave 1 Follow-up Emails
**7-Day (Email 2) and 14-Day (Email 3) — Non-Responder Sequence**
Prepared: 2026-03-19 | From: Ian Baron | Template for all 10 Wave 1 prospects

---

## Overview

~70% of cold email prospects will not reply to Email 1. These two follow-ups are designed to double total reply rate without being needy or repetitive.

**Cadence:**
- Day 0: Email 1 (wave-1-emails.md)
- Day 3: LinkedIn DM (fl-owner-operator-sequence.md)
- Day 7: Email 2 — this file
- Day 14: Email 3 — this file (final)

**Personalization variables** are in [brackets]. Choose the appropriate **Hook Variant** based on the prospect's pain-point lead (insurance or energy) from wave-1-emails.md.

---

## EMAIL 2 — Day 7 Follow-up

**Subject:** Re: [original subject line]

---

[First name],

Circling back on this — one thing I didn't mention in my last note: [INSERT HOOK VARIANT BELOW].

[Insert 1-sentence elaboration from variant.]

Worth 20 minutes if that's relevant to your portfolio: https://cal.com/arcahq/portfolio-review

Ian Baron
Arca

---

### Hook Variant A — Insurance lead (use for prospects 1, 4, 6, 7, 10)

> One thing I didn't mention: the biggest savings on FL commercial portfolios in the last 12 months have actually been on the flood and wind components — not the main property policy. That's where rates have moved most sharply post-hurricane season, and most individual policy holders haven't captured it yet.

**Elaboration:** On a portfolio consolidated onto a single carrier schedule, the flood/wind differential alone is often worth 20–25% of the total insurance line.

**Full paragraph for copy-paste:**

> Circling back on this — one thing I didn't mention in my last note: the biggest savings on FL commercial portfolios in the last 12 months have actually been on the flood and wind components, not the main property policy. That's where rates have shifted most sharply post-hurricane season, and most individual policy holders are still on pre-adjustment pricing. On a consolidated portfolio placement, the flood/wind differential alone is often 20–25% of the total insurance line.

---

### Hook Variant B — Energy lead (use for prospects 2, 3, 5, 8, 9)

> One thing I didn't mention: the gap between legacy commercial energy rates and current market is wider than it was six months ago — utility cost pressures are pushing operators to switch faster, and the saving percentage has been creeping up into Q1 2026. The switch window is still 3–4 weeks; the case for doing it now is stronger.

**Elaboration:** For FPL and Duke Energy Florida territory operators on 2021–2022 contracts, current benchmarks are running 18–22% better than locked rates — up from 15–18% at the same time last year.

**Full paragraph for copy-paste:**

> Circling back on this — one thing I didn't mention in my last note: the gap between legacy commercial energy rates and current market is wider than it was six months ago. For FPL and Duke Energy FL operators still on 2021–2022 contracts, current benchmarks are running 18–22% better than locked rates — up from 15–18% at this time last year. The switch is still 3–4 weeks. The case for doing it now is stronger than it was.

---

### Personalisation Notes (Email 2)

| Prospect | Hook Variant | Subject line from Email 1 |
|---|---|---|
| 1 — Remington Properties | A — Insurance | Your insurance schedule, Naples/Fort Myers portfolio |
| 2 — Sarasota Industrial | B — Energy | Your energy contract, Sarasota industrial |
| 3 — Redfearn Capital | B — Energy | Operating costs on the Tampa acquisition |
| 4 — Shelbourne Global | A — Insurance | South FL portfolio — what the insurance market looks like right now |
| 5 — Tampa commercial | B — Energy | Your energy bill, Tampa commercial |
| 6 — Miami-Dade commercial | A — Insurance | Your insurance renewals, Miami portfolio |
| 7 — Broward commercial | A — Insurance | Broward commercial — what the benchmarks show |
| 8 — Fort Myers industrial | B — Energy | Your energy contract, Fort Myers industrial |
| 9 — Orlando I-4 industrial | B — Energy | Your energy bill, I-4 industrial |
| 10 — Jacksonville/BOMA FL | A — Insurance | Your operating costs, Jacksonville commercial |

---

## EMAIL 3 — Day 14 Final ("Last one from me")

**Subject:** Last note from me

---

[First name],

Last one from me — don't want to be a nuisance.

If the timing isn't right or this isn't on your radar, completely fine. You've got my details if anything changes — new acquisition, upcoming renewal, or you just want a look at the numbers.

Good luck with the portfolio.

Ian Baron
Arca

---

### Notes on Email 3

- **Do not** offer a new meeting link in Email 3. No CTA — keeps it clean, not desperate.
- **Do not** recap what Arca does again. They've read it twice. Trust the prior context.
- **Do not** use "just" or "sorry" — keeps it confident.
- Subject line "Last note from me" is deliberately plain and honest. It signals respect for their time and typically gets higher open rates than follow-up subject lines that try to re-hook.
- This email closes the door on the outbound sequence on a warm note. Prospects who are genuinely interested but not ready now may reach out directly later.

---

## Execution Checklist

- [ ] Send Email 2 on Day 7 (7 days after Email 1 send date — check prospects-fl.csv `touch_1_date`)
- [ ] Personalise: paste correct Hook Variant paragraph, verify subject line matches Email 1
- [ ] Update `touch_2_sent` and `touch_2_date` columns in `sales-materials/gtm/prospects-fl.csv`
- [ ] Send Email 3 on Day 14 if still no response after Email 2
- [ ] Update `touch_3_sent` and `touch_3_date` in CSV
- [ ] After Day 14: move non-responders to `status = cold` in CSV — do not contact again unless they engage
