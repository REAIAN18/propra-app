# Arca — Wave 1 Reply Playbook
**For: Ian Baron | Wave 1 FL outreach replies**
Prepared: 2026-03-19

---

## How to use this

When a prospect replies to a Wave 1 email, match their reply to one of the four scenarios below and send the corresponding response — edited as needed to reflect the specific prospect/asset. Goal in every case: **get a 20-minute call booked, nothing more.**

---

## Scenario 1 — Positive reply
*"Interesting, tell me more" / "How does this work?" / "What would you need from me?"*

**What they want:** A bit more substance before committing time. Low bar — they're already interested.

**Your goal:** Book the call. Give one personalised insight to show you've done your homework. Don't explain the whole model.

---

**Template:**

> [First name],
>
> Glad it landed. Here's the quick version: before the call I pull what I can on your portfolio — insurance exposure by asset type, energy tariff vs current market, any rent roll gaps — so we're not starting from scratch. For [asset type / location], the most common gap I find is [insurance/energy — pick the pain-point you led with]. On a portfolio your size, that's typically [dollar range from outreach email].
>
> 20 minutes is genuinely enough to tell you whether there's something here or not. If there isn't, I'll say so.
>
> Here's my calendar: https://cal.com/arcahq/portfolio-review
>
> Ian

**Personalisation notes:**
- Swap in the specific asset type and dollar range from the original email you sent
- "Insurance exposure" for medical/office/South FL prospects; "energy tariff" for industrial/TECO/FPL/Duke territory
- If you know the portfolio size precisely, reference it ("across your 14 assets" vs "a portfolio your size")

---

## Scenario 2 — Question / Sceptic reply
*"How do you know what we pay?" / "Where does your data come from?" / "What do you actually do?"*

**What they want:** Credibility. They're not hostile — they're testing whether you're real.

**Your goal:** Short, confident answer. No jargon. Redirect to the call.

---

**Template:**

> [First name],
>
> Fair question. We don't need anything sensitive from you for the initial call — no bills, no contracts. We pull from live market data: carrier panels for insurance, published commercial tariffs for energy, county property appraiser records for portfolio structure. The benchmarks I cite are based on what's actually available in your market right now, not industry averages.
>
> If the numbers look interesting after 20 minutes, then we'd ask to see the actual policies/contracts to quantify the gap properly. That's the point where you decide whether to go further.
>
> Happy to explain more on a call — here's a time: https://cal.com/arcahq/portfolio-review
>
> Ian

**Use when:** Prospect pushes back on the data claims, questions your process, or asks "how does this actually work" in a slightly sceptical tone. The call is the right next step — offer to keep it to 20 minutes and tell them you'll have data on their specific portfolio ready before you dial.

---

## Scenario 3 — Soft no
*"Not the right time" / "Things are busy right now" / "Maybe later this year"*

**What they want:** To defer without having to explain themselves. They're not hostile.

**Your goal:** Stay warm. Plant a 90-day seed. Don't chase.

---

**Template:**

> [First name],
>
> Completely understand — no pressure. I'll check back in around [month — 90 days out]. If anything moves before then on your end, you've got my details.
>
> Ian

**Notes:**
- Keep it to 2-3 sentences. Do not re-pitch.
- Add them to the pipeline tracker with status `warm_90d` and a follow-up date
- Set a reminder to re-contact at 90 days with a fresh, updated number (e.g. updated market data for their region/asset type)
- If they gave a specific reason ("we've just done a refinancing", "lease renewal coming up"), note it — that context is gold for the follow-up

---

## Scenario 4 — Hard no / Unsubscribe
*"Please remove me from your list" / "Not interested, don't contact again" / "We handle this internally"*

**What they want:** To be left alone. Respect it immediately.

**Your goal:** Clean exit. No burn, no argument.

---

**Template:**

> [First name],
>
> Understood — removing you now. Thanks for your time.
>
> Ian

**Notes:**
- Mark them `do_not_contact` in the pipeline tracker immediately
- No follow-up, no 90-day ping, no LinkedIn after this
- If they said "we handle this internally" specifically, that's a genuine objection (not necessarily a forever no) — mark them `dnc_internal` so you know the distinction if they resurface later

---

## Quick-reference decision tree

```
Reply received
│
├── Positive / curious → Scenario 1 (book the call, 1 personalised insight)
│
├── Question / sceptic → Scenario 2 (credibility answer, redirect to call)
│
├── Soft no / defer → Scenario 3 (gracious 2-liner, 90-day seed)
│
└── Hard no / remove → Scenario 4 (clean 2-liner, mark DNC)
```

---

## Pipeline tracker updates (required after every reply)

Open `sales-materials/gtm/prospects-fl.csv` and update:
- `status` column: `replied_positive` / `replied_question` / `warm_90d` / `do_not_contact`
- `notes` column: one-line summary of what they said and what you sent back
- `follow_up_date` column: set for Scenario 3 (90 days out); blank for Scenario 4

---

*All outreach is from Ian Baron, Arca. Commission-only model — no fees unless savings are delivered.*
