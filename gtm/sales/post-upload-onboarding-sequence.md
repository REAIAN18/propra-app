# RealHQ — Post-Upload Onboarding Email Sequence

**Goal:** Guide prospect from document upload through to acting on their first finding
**Trigger:** Prospect has signed up and uploaded at least one document
**Updated:** 2026-03-22

---

## Sequence Overview

| Email | Timing | Trigger | Subject | CTA |
|-------|--------|---------|---------|-----|
| Email 1 | Immediate | Document upload received | Your analysis is running | — (no action needed yet) |
| Email 2 | When ready | Analysis complete (platform event) | Your portfolio gaps are ready | View your dashboard |
| Email 3 | 24h after Email 2 | If not logged back in | One number you should see | View your dashboard |
| Email 4 | 7 days after Email 2 | If no action taken on any finding | Your biggest gap — are you actioning it? | View your dashboard |

---

## Email 1 — Upload confirmation (immediate)

**Trigger:** Fires the moment document upload completes
**From:** noreply@realhq.com (system confirmation — plain text)
**Subject:** Your documents are in — analysis has started

---

[First name],

Got them. Your documents are uploaded and the platform is running your analysis now.

You'll get an email the moment your portfolio gaps are ready to view. For most portfolios that's within the hour — complex cases can take a little longer.

Nothing to do on your end. The platform is working through it.

— RealHQ

---

**Notes:**
- Keep this extremely short — it's a receipt, not a pitch
- No CTA needed — they just uploaded, asking them to do more now is friction
- "Within the hour" is the correct timing framing — do not say "instantly" or imply a hard guarantee

---

## Email 2 — Analysis ready (platform event-triggered)

**Trigger:** Platform emits `analysis_complete` event for this user's portfolio
**From:** ian@realhq.com (personal send)
**Subject:** [First name] — your portfolio gaps are ready

---

[First name],

Your analysis is ready.

Here's what the platform found on your portfolio:

- **Insurance:** [insurance_finding — e.g. "£12,400 estimated overpay vs current market"]
- **Energy:** [energy_finding — e.g. "£8,200 gap vs live contract benchmarks"]
- **Rent roll:** [rent_finding — e.g. "2 leases undermarket, £14,600 combined uplift opportunity"]

These are estimates based on the documents you uploaded. The full breakdown — with the methodology and comparable data — is in your dashboard.

See your full analysis → https://realhq.com/dashboard

Commission-only. You pay nothing unless RealHQ delivers a confirmed saving or income.

Ian Baron
RealHQ

---

**Personalisation notes:**
- The three bullet findings are dynamically populated from the platform's analysis output
- If a category has no finding (e.g. no energy contract uploaded), omit that line entirely — do not write "Nothing found on energy" or leave a blank
- If all three findings are present, list all three — leads with insurance as it has the fastest payback cycle
- The dashboard link takes them directly into their analysis — not a generic homepage
- Do not add "book a call" — the findings are already in the dashboard. The CTA is "look at your numbers", not "talk to someone"

---

## Email 3 — 24-hour re-engagement (if not logged back in)

**Trigger:** 24 hours after Email 2, no dashboard login detected
**From:** ian@realhq.com
**Subject:** One number you should see

---

[First name],

Your portfolio analysis has been ready for 24 hours — I want to make sure you've seen the most important number in it.

Most portfolios I run through RealHQ have one gap that stands out. It's usually insurance — placed years ago, never competitively retenderered, and sitting well above current market rates.

Your dashboard shows where that gap is on your portfolio.

See your analysis → https://realhq.com/dashboard

No action required beyond looking. The platform does the work.

Ian Baron
RealHQ

---

**Notes:**
- This is a soft prompt, not a hard sell. They've already uploaded — they're warm. The job is to get them back to the dashboard.
- "One number" creates urgency without being aggressive — most people respond to a specific thing to look at
- If the platform can surface the single largest finding in the subject line (e.g. "£12,400 insurance overpay — are you actioning it?"), that variant will outperform the generic subject. Consider A/B testing once volume is sufficient.

---

## Email 4 — 7-day action prompt (if no finding actioned)

**Trigger:** 7 days after Email 2, at least one finding present, no action taken (no "accept" or "approve" event in platform)
**From:** ian@realhq.com
**Subject:** [First name] — your portfolio gap has been sitting there for a week

---

[First name],

Your analysis has been ready for a week. The gaps are still there.

I'm not going to oversell it — RealHQ earns nothing unless we deliver a saving or income. So the incentive is the same for both of us: you should act on this.

If you'd like me to look at your specific findings and flag where to start, reply to this email with any questions. Or go straight to your dashboard — everything you need to move forward is already there.

See your analysis → https://realhq.com/dashboard

If now isn't the right time, just say so. I won't chase.

Ian Baron
RealHQ

---

**Notes:**
- Tone here is direct and slightly challenging — intentionally. At 7 days with no action, soft nudges haven't worked.
- "I won't chase" — important line. It signals respect for their time and reduces pressure. Often gets replies.
- Do NOT add more CTAs. One link. One action. Anything else is noise.
- If prospect replies "not now": log in pipeline tracker, suppress this sequence, set a 90-day re-contact flag.

---

## Sequence Logic

```
Document upload
    → Email 1: immediate (receipt — no CTA)
        → Platform analysis completes
            → Email 2: analysis ready (dynamic findings — CTA: dashboard)
                → Login detected? → suppress Email 3
                    → Finding actioned? → suppress Email 4 → trigger commission flow
                → No login at 24h → Email 3 (soft re-engagement)
                    → Still no action at 7 days → Email 4 (direct challenge)
                        → Reply received → move to active pipeline, suppress further sequence
                        → No reply → sequence ends, 90-day re-contact flag
```

---

## Implementation Notes

- Emails 1–4 all send from `ian@realhq.com` except Email 1 (system receipt from `noreply@realhq.com`)
- Suppression logic requires platform events: `document_uploaded`, `analysis_complete`, `dashboard_login`, `finding_actioned`
- Dynamic finding variables in Email 2 must come from the analysis engine — do not substitute hardcoded or illustrative numbers
- Email 4 suppression: fire only if `analysis_complete` AND at least one finding with `status != actioned` AND no `finding_actioned` event within 7 days of `analysis_complete`

---

*RealHQ · realhq.com · ian@realhq.com*
*Commission-only. No invoice until you're ahead.*
