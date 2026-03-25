# Wave 2 — Action Queue Spec

**Author:** Head of Product
**Date:** 2026-03-22
**Status:** Ready to build
**Source:** docs/wave-2-returning-user-experience.md, RealHQ-Spec-v3.2

---

## What this replaces

The TopBar currently shows an "X Urgent" chip (red, links to `/compliance`). This only covers compliance + lease expiries + loan urgency. The Action Queue replaces this with a **comprehensive opportunity queue** across all categories, surfaced as a slide-in drawer.

```
BEFORE: [6 Urgent] → links to /compliance
AFTER:  [9 items · £47k/yr] → opens Action Queue drawer
```

---

## What the Action Queue is

A prioritised list of everything RealHQ has found across the whole product — one place, ranked by annual value. The owner answers "what should I do first?" in one click.

Not a notification feed. Not a compliance list. **Every identified saving, income, and risk in one ranked queue.**

---

## Entry point — TopBar badge

Replace the existing `{urgentCount} Urgent` chip with:

```tsx
// New badge — click opens drawer
<button onClick={() => setActionQueueOpen(true)}>
  <span className="pulse-dot" />
  {totalCount} items · {fmtCurrency(totalValue)}/yr
</button>
```

**Visual spec:**
- Background: `#F0F4FF` (light indigo — not red, this is opportunity not alarm)
- Text: `#1647E8`
- Border: `1px solid rgba(22, 71, 232, 0.2)`
- Pulse dot: 6px circle, `#1647E8`, CSS pulse animation (same as sidebar AI Insights badge)
- Show always (not just when urgent) — if no items yet, show "Analysing…"

**Urgent items remain red:** If any items have `urgency: "urgent"`, the badge turns red (`#FDECEA` bg, `#D93025` text). This preserves the alarm signal.

---

## Drawer component

**Placement:** Slides in from the right. Overlay with backdrop. Does not push main content.

**Width:** 400px desktop, full-width mobile.

**Header:**
```
RealHQ found X things across your portfolio
£X,XXX/yr of value identified
[×]
```

**Tabs (filter):**
```
All (9)  |  Urgent (2)  |  Savings (4)  |  Income (2)  |  Deals (1)
```

Tab counts update from the same data source. Default: All.

**Item list:** Scrollable. Each item is a card — see card spec below.

**Footer:** `"All insights update automatically as RealHQ monitors your portfolio."` — small grey text.

---

## Item card spec

```
┌─────────────────────────────────────────────────────┐
│ [CATEGORY BADGE]  [Asset name if per-asset]          │
│                                                      │
│ [One-line description of the finding]                │
│                                                      │
│ £X,XXX/yr  ·  [Time sensitivity label]              │
│                                                      │
│                      [Act now →]                     │
└─────────────────────────────────────────────────────┘
```

**Category badge colours** (from spec v3.2 section 5.4):
- COST SAVING (energy, insurance): `#EEF2FE` bg / `#1647E8` text
- INCOME UPLIFT (rent, solar, EV, 5G): `#E8F5EE` bg / `#0A8A4C` text
- URGENT / COMPLIANCE: `#FDECEA` bg / `#D93025` text
- REFINANCE / FINANCING: `#E6F7F6` bg / `#0D9488` text
- VALUE ADD (planning, repositioning): `#F5F0FF` bg / `#6B21A8` text

**Time sensitivity labels:**
- `"Act now"` — deadline within 30 days, or time-sensitive switch available
- `"This week"` — recommended action within 7 days
- `"This month"` — within 30 days
- `"No deadline"` — evergreen opportunity (shown as plain grey text, no urgency colour)

**"Act now →" button:**
- Closes the drawer
- Navigates to the specific page + section, pre-scrolled
- For multi-step flows (e.g. switch confirmation), opens the relevant modal directly

---

## Data sources per item type

### Insurance saving
- **Source:** `GET /api/user/insurance-summary` — `annualSaving`, `status`
- **Condition:** Show if `annualSaving > 0` and status is not `"switched"`
- **Description:** `"Insurance retender — £X,XXX/yr overpay identified"`
- **Link:** `/insurance` — scrolls to comparison panel
- **Category:** COST SAVING

### Energy tariff switch
- **Source:** `GET /api/user/energy-summary` — bills present + Octopus quote available
- **Condition:** Show if `canSwitch === true` and saving available
- **Description:** `"Tariff switch available — £X,XXX/yr saving vs [Supplier]"`
- **Link:** `/energy` — opens switch confirmation modal
- **Category:** COST SAVING

### Energy anomaly (HVAC waste etc.)
- **Source:** `GET /api/user/energy-anomalies?status=open` (Wave 2 — see energy handoff doc)
- **Condition:** Show each open anomaly as a separate item
- **Description:** anomaly.detectionBasis (one sentence)
- **Value:** anomaly.annualSavingGbp
- **Link:** `/energy#anomalies`
- **Category:** COST SAVING

### Solar opportunity
- **Source:** `GET /api/user/solar-assessment` (Wave 2)
- **Condition:** Show if status === "viable"
- **Description:** `"Solar viable at [Asset name] — £X,XXX/yr income + saving"`
- **Value:** selfConsumptionSavingGbp + exportIncomeGbp
- **Link:** `/energy#solar`
- **Category:** INCOME UPLIFT

### Lease expiry
- **Source:** computed from asset leases (already in `usePortfolio`)
- **Condition:** expiryDate within 180 days
- **Description:** `"Lease expiry — [Tenant], [Asset], [X] days"`
- **Link:** `/rent-clock`
- **Category:** URGENT (if ≤60 days), INCOME UPLIFT (if 61–180 days)

### Income opportunity (EV, solar, 5G, parking)
- **Source:** `GET /api/user/income-opportunities`
- **Condition:** status !== "activated"
- **Description:** `"[Opportunity type] — [Asset name], est. £X,XXX/yr"`
- **Link:** `/income`
- **Category:** INCOME UPLIFT

### Planning application nearby
- **Source:** `GET /api/user/planning` — nearby applications
- **Condition:** applications within 0.5mi with `impact !== "none"`
- **Description:** `"[X] planning applications within 0.5mi of [Asset name]"`
- **Link:** `/planning`
- **Category:** VALUE ADD

### Compliance deadline
- **Source:** asset compliance data
- **Condition:** status === "expiring_soon" or status === "expired"
- **Description:** `"[Certificate type] expiring — [Asset name], [X] days"`
- **Link:** `/compliance`
- **Category:** URGENT

### Financing risk
- **Source:** `GET /api/user/financing-summary` — loans
- **Condition:** daysToMaturity ≤ 90 OR icr < icrCovenant
- **Description:** `"Loan maturing in [X] days — [Asset name]"` / `"ICR covenant breach risk"`
- **Link:** `/hold-sell` (loan detail)
- **Category:** URGENT

### Insurance risk roadmap action (PRO-610)
- **Source:** `GET /api/user/insurance-risk/:assetId` — `roadmap[0]` (top ROI action after sorting by annualSaving/costLow)
- **Condition:** Show only if `roadmap` exists AND top action `status !== "done"` AND `annualSaving > 300`
- **Description:** `"[actionTitle] — [Asset name], saves £X/yr"` (e.g., "Security alarm — [Asset], saves £1,200/yr")
- **Value:** `roadmap[0].annualSaving`
- **Urgency:** `"this_month"` if ROI > 3 (annualSaving / max(costLow,1) > 3); otherwise `"no_deadline"`
- **Action label:** `"Review action →"` (type `decision_only` or `work_order`) / `"Raise work order →"` (type `work_order`)
- **Link:** `/insurance#risk-roadmap`
- **Category:** COST SAVING
- **Note:** One item per asset maximum. Only the #1 roadmap action per asset surfaces in the queue. Portfolio-level items (e.g. portfolio consolidation) use `assetName: null`.

---

## Ranking algorithm

Sort by: `urgencyScore × annualValue`

```ts
// Confirmed against src/app/api/user/action-queue/route.ts
function rankItem(urgency: string, value: number): number {
  const m: Record<string, number> = { urgent: 4, this_week: 2, this_month: 1.5, no_deadline: 1 };
  return value * (m[urgency] ?? 1);
}
```

Items with `urgency: "urgent"` OR `category: "urgent"` always appear above non-urgent items regardless of value (double sort key in route).

---

## API: `GET /api/user/action-queue`

Built. See `src/app/api/user/action-queue/route.ts`.

```ts
// Response (confirmed against route implementation):
{
  totalCount: number        // total items in ranked list
  totalValueGbp: number     // pre-computed sum of all annualValue — use this for TopBar badge + KPI Tile 8
  hasUrgent: boolean        // true if any item has urgency "urgent"
  criticalCount: number     // count of items with urgency === "urgent"
  items: {
    id: string               // unique, stable — used to dismiss in localStorage
    type: string             // currently wired: "insurance" | "energy_switch" | "income" | "rent_review" | "work_order" | "hold_sell" | "tenant" | "scout"
                             // planned (to add post-migration): "energy_anomaly" | "solar" | "planning" | "compliance" | "insurance_risk"
    category: string         // "cost_saving" | "income_uplift" | "urgent" | "refinance" | "value_add"
    title: string
    assetName: string | null
    annualValue: number | null   // NOTE: field is "annualValue" not "annualValueGbp"
    currencySym: string          // "£" or "$"
    urgency: string              // "urgent" | "this_week" | "this_month" | "no_deadline"
    actionLabel: string
    actionHref: string
    rank: number                 // pre-computed sort score (rankItem(urgency, annualValue))
  }[]
}
```

**Performance requirement:** Responds within 1.5 seconds. All sub-API calls are `Promise.all` parallel. No sequential calls.

**Dismissed items:** Store dismissed `id`s in `localStorage` (key: `realhq_dismissed_actions`). Filter them out client-side. Do not persist to DB (Wave 2 — DB version for Wave 4).

---

## Wave 2 first-login banner

Shown once per user when they first log in after Wave 2 is live. Uses `localStorage` key `realhq_wave2_banner_dismissed`.

```
┌─────────────────────────────────────────────────────────────────┐
│ RealHQ has been updated — energy intelligence is now live.       │
│ We found [X] new opportunities across your portfolio.           │
│                           [See what's new →]  [×]               │
└─────────────────────────────────────────────────────────────────┘
```

**Placement:** Below TopBar, above page content. Full-width. 44px height.
**Colours:** `#EEF2FE` bg / `#1647E8` text / `#C7D7FA` border.
**"See what's new →":** Opens Action Queue drawer.
**[×]:** Sets localStorage key, banner never shows again.
**Does NOT navigate away.** No full-page redirect.

---

## Component files to create

| File | Purpose |
|------|---------|
| `src/components/ui/ActionQueueDrawer.tsx` | Drawer component (full spec above) |
| `src/components/ui/Wave2Banner.tsx` | First-login slim banner |
| `src/app/api/user/action-queue/route.ts` | Aggregation API |

**Modified files:**

| File | Change |
|------|--------|
| `src/components/layout/TopBar.tsx` | Replace urgentCount chip with ActionQueue badge |
| `src/app/dashboard/page.tsx` | Import and render Wave2Banner, pass open/close state to drawer |

---

## Acceptance criteria

- [ ] Clicking the TopBar badge opens the drawer. Clicking outside or [×] closes it.
- [ ] Drawer shows items from at least 4 sources: compliance, lease expiry, financing, income opportunities (all from existing APIs — no new API dependency).
- [ ] Items ranked by urgency × annual value — urgent items always appear first.
- [ ] Each "Act now" button closes the drawer and navigates to the correct page/section.
- [ ] Dismiss (swipe left or [×] on card) removes item from list. Does not reappear on same session or next session (localStorage).
- [ ] Wave 2 banner appears once on first visit after Wave 2 launch. Does not reappear after dismiss.
- [ ] Badge shows red (`#FDECEA`) when any item has `urgency: "urgent"`. Blue (`#EEF2FE`) otherwise.
- [ ] `GET /api/user/action-queue` responds within 1.5 seconds using parallel sub-calls.
- [ ] No hardcoded annual values in the queue. All figures derive from live API data.
- [ ] Insurance risk roadmap items appear in queue when `insuranceRoadmap` is populated for an asset and the top action has not been marked done.
- [ ] Energy anomaly items appear in queue only after bill is uploaded (anomaly detected). Not shown before.
- [ ] Solar items appear only when `SolarAssessment.status === "viable"`. Not shown in pending/not_viable state.

---

## What to stub

Items from Wave 2 APIs (energy anomalies, solar) return empty arrays if those features haven't been built yet. The drawer renders correctly with only the Wave 1 data sources (compliance, leases, financing, income). It does not error or show empty state in Wave 1 mode.

Empty state (no items across all sources): `"No open actions right now — RealHQ is monitoring your portfolio."` with a pulsing indicator.
