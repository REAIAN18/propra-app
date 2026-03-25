# Wave 2: Returning User Experience Spec

**Status:** Draft
**Date:** 2026-03-21
**Author:** Head of Product
**Sources:** RealHQ-Spec-v3.2, Addendum v3.1, BuildOrder v1.0

---

## Purpose

What does a user see on their second (and subsequent) logins in Wave 2? This spec defines the full returning user experience — from login to first meaningful action — distinguishing it from the first-use onboarding flow.

The returning user has already:
- Added at least one property
- Completed Wave 1 onboarding (uploaded a lease, bill, or insurance document)
- Seen the Wave 1 dashboard

---

## Design principles for returning users

1. **Never greet them with a blank screen.** The dashboard has live data from the moment they return. If something has changed since their last session, show it immediately.
2. **Lead with what has changed, not what is new.** The user doesn't care that Wave 2 features exist. They care that their rent is £1,840/yr above market and RealHQ just found a way to fix it.
3. **New features are revealed through data, not announcements.** The energy anomaly card doesn't say "NEW: HVAC detection." It says "Overnight HVAC waste detected — saving £8,200/yr available. Fix now."
4. **Action queue, not notification feed.** The user should never have to read through alerts to find what to do. The action queue is a prioritised to-do list where every item has a one-tap action.

---

## Second login flow

### Step 1 — Login

Standard email/password. No re-onboarding. No "Welcome back!" splash screen.

Lands directly on → Dashboard.

---

### Step 2 — Dashboard (what's new since last session)

**If this is their first Wave 2 login (Wave 2 just shipped):**

A slim banner at the top of the dashboard — not a modal, not a full screen:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RealHQ has been updated — energy intelligence is now live.
  We found 3 new opportunities across your portfolio.
  [See what's new →]                              [Dismiss]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Tapping "See what's new" scrolls to the opportunity feed — does NOT navigate away from the dashboard.

**The dashboard itself:**

Everything from Wave 1, plus:

- **Energy card is now live:** Was previously showing "Coming soon" or a pending state. Now shows the top energy opportunity (e.g. "Tariff overpayment: £2,840/yr — switch available").
- **NOI Bridge updated:** New energy and utility saving opportunities are now added as bars in the bridge. The total projected NOI uplift is higher than it was at last login.
- **Action queue badge:** Top-right of dashboard. Shows count of new actions since last login. Clicking opens the action queue drawer.

**The action queue drawer (slides in from right):**

Ordered by estimated value (highest first). Each item:
- Category icon (energy / rent / insurance / maintenance / compliance)
- One-line description of the issue
- Annual saving in £ or risk level
- "Act now" button → goes directly to the relevant action, pre-filled

Example queue on second login in Wave 2:
```
⚡ Tariff switch available — save £2,840/yr          [Switch now]
📊 HVAC overnight waste — £8,200/yr                  [Fix — schedule BMS]
☀️  Solar viable at Unit 4 — ROI 4.2 years           [Get quotes]
🏢 Lease expiry in 87 days — Unit 3, Lakeside        [Draft renewal]
📋 2 new planning applications within 0.5mi           [Review]
```

---

### Step 3 — First energy action (typical Wave 2 return)

On second login, the most likely first action is energy — because it's new and the numbers are large.

User taps energy card on dashboard → goes to `/energy` screen.

**Energy screen — what they see:**

The energy screen has data. Not "connect your meter" — because the onboarding flow already prompted a utility bill upload. The tariff comparison is already run.

> **⚠ Market-specific rendering rules — critical for correct UX:**
>
> The energy screen renders differently depending on meter type and market. Engineering must check `meter_type` and `market` on the property record before rendering any energy card:
>
> **UK SME-metered assets (MPAN profile class ≠ `00`):** Full tariff comparison card + Switch CTA (default layout below).
>
> **UK HH-metered assets (MPAN profile class `00` — e.g. large logistics: >100MWh/yr):** Do NOT show tariff comparison card or Switch CTA. Show instead: "Large-site contract — bespoke tender available. [Request tender]." Anomaly feed and solar card remain visible.
>
> **FL market assets (FPL / Duke Energy / TECO — regulated monopoly utilities):** Do NOT show tariff comparison card or Switch CTA at all. Show: consumption vs EIA benchmark, HVAC anomaly feed, demand charge reduction opportunities. Solar and EV cards remain visible.
>
> See `docs/wave-2-engineering-handoff.md` — Critical Commercial Constraints for full implementation detail.

**UK SME-metered layout (default):**
1. **Tariff comparison card (top):** "You're paying £0.28/kWh. Best available: £0.21/kWh (Octopus). Annual saving on current usage: £2,840." → "Switch" CTA.
2. **Anomaly feed:** Any anomalies detected from the uploaded bill data. Even without a smart meter, bill-level anomalies (e.g. year-on-year consumption spike, tariff mismatch) appear.
3. **Solar card (if applicable):** Google Solar API result loaded automatically. "Solar viable: 4.2yr ROI. 68,000 sqft roof."
4. **"Connect smart meter" nudge (if no smart meter):** Not as an empty state — as an upgrade prompt after the tariff comparison. "Connect your smart meter to detect 4 more anomaly types (HVAC scheduling, demand charges, overnight waste)." → guided connection flow.

---

### Step 4 — Tenant intelligence reveal (if tenant exists in rent roll)

If the user has tenants in their lease data (uploaded in Wave 1), the Tenants screen has upgraded from the Wave 1 static list. This is surfaced contextually on return — not via a banner.

**On the dashboard** (lease expiry tracker panel):
If any lease is within 180 days of expiry, a row in the tracker shows:
```
🏢 Unit 3, Lakeside — [Tenant name]  Lease expires 87 days
   Health score: 82/100  Covenant: Strong
   [Draft renewal letter →]
```
"Draft renewal letter →" launches the Wave 2 rent review flow — Claude generates the letter, DocuSign Heads of Terms are created.

**On the Tenants screen (`/tenants`):**
Each tenant now has a health score (covenant grade, payment history, sector risk, expiry urgency). For leases due for review:
```
📋 Rent review due: 2026-06-30
   Current rent: £171,000/yr · Market ERV: £201,600/yr
   Gap: +£30,600/yr uplift available
   [Start rent review]
```

**What is NOT in Wave 2:** Tenant portal (separate login for tenants to pay rent, raise maintenance requests). This is Wave 3 — see `docs/wave-3-triage.md` T3-3. Do not show "invite tenant" prompts in Wave 2.

---

### Step 5 — New feature discovery (progressive reveal)

Wave 2 features that require board-level API dependencies (CoStar, DCC smart meter) are shown in a "coming soon" state, not hidden. The user can see what is possible and what is pending.

**Example: Acquisitions Scout (if CoStar not yet live)**

On dashboard, deal cards show:
```
[Deal Scout — pending setup]
400+ listings screened daily against your acquisition criteria.
Full deal intelligence available when CoStar API is connected.
[Learn more]
```

Not "404 not found." Not a disabled button with no explanation. A clear pending state that communicates value and expected timeline.

**Example: Smart meter anomaly detection (if DCC not yet authorised)**

On energy screen, below the tariff comparison:
```
[Upgrade: Smart meter anomaly detection]
Connect your SMETS2 meter to detect: overnight HVAC waste,
weekend spikes, and demand charge avoidance.
Est. additional saving: £8,200/yr based on your building size.
[Connect smart meter] or [Remind me later]
```

---

## Subsequent logins (3rd, 4th, ongoing)

### What changes each session

The dashboard is not static. On each return:
- NOI bridge bars update as actions are completed (completed bars turn green)
- Action queue shows new items if anything has changed (new planning applications nearby, lease expiry countdown entered red zone, tariff has worsened, new anomaly detected)
- "Last refreshed: X minutes ago" timestamp on dashboard header

### What does NOT change

- Navigation structure — stable from Wave 1
- KPI strip — always visible, always live. Wave 2 expands to 8 tiles (adds: Total Sq Footage, Avg NOI Yield, Costs Saved YTD, Unactioned Opportunity)
- Properties grid — always present (user can sort and filter)
- Portfolio Value Score — circular gauge + Income/Cost/Growth sub-scores; updates on every dashboard load as portfolio data changes
- Occupancy breakdown donut — refreshes with tenant materialisation data

### Notification triggers (what emails are sent)

RealHQ sends email notifications (via Resend) for:
- High-priority: lease expiry entering 90-day window, covenant score drop >10 points, new planning application within 0.5mi
- Medium-priority: new tariff saving >£1,000/yr available, new anomaly detected, rent review due in 6 months
- Low-priority (weekly digest): portfolio summary — value change since last week, new opportunities found, completed actions

Email link → deep link to the relevant screen in RealHQ (not just the dashboard home).

---

## Returning user experience: edge cases

### User who hasn't logged in for 30+ days

Banner: "A lot has happened in 30 days. [X] new opportunities found, [Y] actions completed by RealHQ. [See full update →]"

Links to a digest view: what changed (opportunities found/resolved) in a simple timeline. Not a marketing email — a data summary.

### User with no actions to take (all opportunities resolved)

This is a success state. Dashboard shows:
```
✓ Portfolio in good shape. No urgent actions.
  All opportunities addressed. Next review: [date].
  Monitor: lease renewals in 14 months.
```

Not an empty screen. Not a prompt to "add more features." A clean confirmation that RealHQ has done its job.

### User who returns mid-deal (e.g. energy switch in progress)

Dashboard energy card shows deal status:
```
⚡ Tariff switch in progress — Octopus
   Switch initiated 3 days ago. Confirmation expected by [date].
   [View status →]
```

Not a new "switch" CTA. A status card that acknowledges the action is in flight.

---

## Acceptance criteria

- [ ] On second login (after Wave 1 onboarding), the user lands on the dashboard with live data. No "welcome back" splash, no re-onboarding, no loading spinner before the dashboard appears.
- [ ] If Wave 2 features have been added since last login, a single slim banner appears at the top of the dashboard. The banner is dismissable. It does not appear on subsequent logins after dismissal.
- [ ] Action queue drawer shows all open opportunities ranked by annual saving. Each item has a one-tap action button that goes directly to the relevant action (pre-filled). No navigation required to find the action.
- [ ] Energy screen shows live tariff comparison data on second login for UK SME-metered assets, assuming a utility bill was uploaded during Wave 1 onboarding. Screen is not empty and does not require a new document upload to show data.
- [ ] For UK HH-metered assets (MPAN profile class `00`), the energy screen does NOT show a tariff comparison card or Switch CTA. Shows "Large-site contract — bespoke tender available" instead. Anomaly feed and solar card still render.
- [ ] For FL market assets, the tariff comparison card and Switch CTA are hidden entirely. Screen shows consumption vs EIA benchmark, anomaly feed, and demand charge reduction opportunities.
- [ ] If tenants are present in the rent roll (from Wave 1 lease upload), the Tenants screen shows health scores and any upcoming lease expiries. Leases due for rent review show the current rent vs ERV gap and a "Start rent review" CTA. No tenant portal invite CTA in Wave 2 (that is Wave 3 T3-3).
- [ ] Features pending API access (e.g. CoStar not yet connected) are shown in a "coming soon" pending state with an estimated value and a clear explanation of what is blocking. They are NOT hidden and do NOT show an error state.
- [ ] A completed action (e.g. tariff switch confirmed) is shown as a green bar in the NOI bridge. The action does not reappear in the action queue. The bridge total updates to reflect the captured saving.
- [ ] Email notification is sent for a lease expiry entering the 90-day window. Email contains: tenant name, property, expiry date, days remaining, and a deep link directly to the Rent Clock card for that lease. No login required to read the email content — the urgency is clear from the email itself.
