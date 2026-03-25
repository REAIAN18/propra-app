# PRO-613 — Dashboard: Per-Asset Properties Grid with Opportunity Badges

**Author:** Head of Product
**Date:** 2026-03-23
**Status:** Spec — ready for FE implementation
**Spec ref:** RealHQ-Spec-v3.2.html §5.3 item 5 + §5.4 badge colour rules

---

## What this builds

A properties grid on the dashboard (`/dashboard`) showing one card per asset, 3 cards across. Each card shows a satellite thumbnail, asset name/location, and inline opportunity badges for cost saving, income uplift, and urgent compliance items specific to that asset.

This replaces/supplements the current horizontal satellite thumbnail strip (line 688-701 of `src/app/dashboard/page.tsx`) — the thumbnail strip shows property images only. The new grid adds actionable intelligence per property in one glance.

---

## Spec §5.4 badge colour rules

| Category | Badge bg | Badge text | Left border |
|----------|----------|------------|-------------|
| COST SAVING | `#EEF2FE` | `#1647E8` | `2px solid #1647E8` |
| INCOME UPLIFT | `#E8F5EE` | `#0A8A4C` | `2px solid #0A8A4C` |
| CAM RECOVERY | `#FEF6E8` | `#F5A94A` | `2px solid #F5A94A` |
| VALUE ADD | `#F5F0FF` | `#6B21A8` | `2px solid #6B21A8` |
| URGENT | `#FDECEA` | `#D93025` | `2px solid #D93025` |

---

## Data inputs (all available on `portfolio.assets`)

Confirmed against `src/app/api/portfolios/user/route.ts` response shape:
- `insurancePremium`, `marketInsurance` → insurance saving per asset ✅
- `energyCost`, `marketEnergyCost` → energy saving per asset ✅
- `passingRent`, `marketERV` → rent uplift per asset ✅ (both are **annual** figures)
- `occupancy` → vacancy badge if < 90% (defaults to 95 if null) ✅
- `additionalIncomeOpportunities[]` → income opportunities with `{ annualIncome, status }` ✅
- `satelliteUrl` → property thumbnail ✅
- `compliance[]` → **always `[]`** in current route. Compliance badges (urgent items) will show nothing until the portfolio route loads compliance data. **Wave 3 item (T3-17) — skip for now.**

No new API calls, no new routes. All data is fetched in the existing `GET /api/portfolios/user` call.

---

## UI Layout

### Section placement

Add as a new section **between** the satellite thumbnail strip and the KPI strip, or replace the thumbnail strip entirely (preferred — avoids duplication).

Preferred placement: immediately below the hero/narrative block, before "Portfolio summary" section label.

```
[Hero / Narrative block]
[Properties Grid — 3 across]         ← NEW
[Portfolio summary]
[KPI strip]
[Section 2: Unactioned opportunity / cards]
...
```

### Grid layout

```
display: grid
gridTemplateColumns: repeat(3, 1fr)   ← desktop
gap: 12
padding: 0 18px 12px
```

Responsive: on narrow viewports (`< 768px`) collapse to 1 column.

### Per-asset card structure

```
┌─────────────────────────────────────────────────────────┐
│ [Satellite thumbnail 100% width × 72px, rounded top]    │
├─────────────────────────────────────────────────────────┤
│ Asset name (12px bold, truncated)                       │
│ Location · Asset type (10px, grey)                      │
│                                                         │
│ [BADGE1] [BADGE2] [BADGE3]  (flex wrap, gap 4)          │
│                                                         │
│                              View asset →               │
└─────────────────────────────────────────────────────────┘
```

Card styles:
- `backgroundColor: "#fff"`
- `border: "0.5px solid #E5E7EB"`
- `borderRadius: 10`
- `overflow: hidden`

Thumbnail:
- `height: 72px`
- `width: 100%`
- `objectFit: cover`
- If no `satelliteUrl`: show a grey placeholder with asset initial

"View asset →" link: `href={/assets/${a.id}}`, `fontSize: 10.5`, `fontWeight: 600`, `color: "#1647E8"`, right-aligned.

---

## Badge generation logic

For each asset, generate up to 4 badges. Show the top 3 by annual value if more than 3 apply. Badges are single-line, small caps (8–9px).

```ts
function getAssetBadges(a: PortfolioAsset): AssetBadge[] {
  const badges: AssetBadge[] = [];

  // Insurance saving (both fields defaulted to 0 in portfolios/user route)
  const insuranceSaving = Math.max(0, (a.insurancePremium ?? 0) - (a.marketInsurance ?? 0));
  if (insuranceSaving > 200) {
    badges.push({
      category: "cost_saving",
      label: `Save ${fmtShort(insuranceSaving)}/yr`,
      annualValue: insuranceSaving,
      href: "/insurance",
    });
  }

  // Energy saving (both fields defaulted to 0 in portfolios/user route)
  const energySaving = Math.max(0, (a.energyCost ?? 0) - (a.marketEnergyCost ?? 0));
  if (energySaving > 200) {
    badges.push({
      category: "cost_saving",
      label: `${fmtShort(energySaving)}/yr energy`,
      annualValue: energySaving,
      href: "/energy",
    });
  }

  // Rent uplift
  // passingRent and marketERV are both annual figures (confirmed from schema + AVM lib usage)
  const rentUplift = Math.max(0, (a.marketERV ?? 0) - (a.passingRent ?? 0));
  if (rentUplift > 500) {
    badges.push({
      category: "income_uplift",
      label: `${fmtShort(rentUplift)}/yr rent uplift`,
      annualValue: rentUplift,
      href: "/rent-clock",
    });
  }

  // Ancillary income (5G, solar, EV, parking)
  // Field: additionalIncomeOpportunities[].annualIncome (not annualValue)
  const ancillary = (a.additionalIncomeOpportunities ?? [])
    .filter(i => i.status !== "active")
    .reduce((s, i) => s + (i.annualIncome ?? 0), 0);
  if (ancillary > 500) {
    badges.push({
      category: "income_uplift",
      label: `${fmtShort(ancillary)}/yr ancillary`,
      annualValue: ancillary,
      href: "/income",
    });
  }

  // Vacancy
  if ((a.occupancy ?? 95) < 90) {
    badges.push({
      category: "urgent",
      label: "Vacant suite",
      annualValue: 0,
      href: `/assets/${a.id}`,
    });
  }

  // Compliance urgent
  // NOTE: a.compliance is always [] in current portfolios/user route.
  // Compliance badges will be inert until Wave 3 (T3-17) adds structured compliance records.
  const urgentCompliance = (a.compliance ?? []).filter((c: { status: string }) => c.status === "overdue" || c.status === "due_soon").length;
  if (urgentCompliance > 0) {
    badges.push({
      category: "urgent",
      label: `${urgentCompliance} compliance`,
      annualValue: 0,
      href: "/compliance",
    });
  }

  // Sort: urgent first, then by annual value descending. Show max 3.
  return badges
    .sort((a, b) => {
      if (a.category === "urgent" && b.category !== "urgent") return -1;
      if (b.category === "urgent" && a.category !== "urgent") return 1;
      return b.annualValue - a.annualValue;
    })
    .slice(0, 3);
}
```

---

## Badge component

```tsx
const BADGE_STYLE: Record<AssetBadgeCategory, { bg: string; color: string; border: string }> = {
  cost_saving:   { bg: "#EEF2FE", color: "#1647E8", border: "#1647E8" },
  income_uplift: { bg: "#E8F5EE", color: "#0A8A4C", border: "#0A8A4C" },
  cam_recovery:  { bg: "#FEF6E8", color: "#F5A94A", border: "#F5A94A" },
  value_add:     { bg: "#F5F0FF", color: "#6B21A8", border: "#6B21A8" },
  urgent:        { bg: "#FDECEA", color: "#D93025", border: "#D93025" },
};

function AssetOpportunityBadge({ category, label }: { category: AssetBadgeCategory; label: string }) {
  const s = BADGE_STYLE[category];
  return (
    <span
      style={{
        fontSize: 8.5,
        fontWeight: 700,
        padding: "2px 5px",
        borderRadius: 3,
        backgroundColor: s.bg,
        color: s.color,
        borderLeft: `2px solid ${s.border}`,
        whiteSpace: "nowrap",
        letterSpacing: "0.03em",
      }}
    >
      {label.toUpperCase()}
    </span>
  );
}
```

---

## Go criteria

- [ ] Properties grid renders below narrative block, 3 cards across on desktop
- [ ] Each card shows satellite thumbnail (or grey placeholder if none)
- [ ] Each card shows up to 3 opportunity badges using spec §5.4 colour rules
- [ ] "View asset →" links to `/assets/:id` for each card
- [ ] Badges show correct per-asset data — insurance saving on Card A ≠ Card B unless they truly have the same saving
- [ ] No hardcoded or illustrative values — zero badges shown if no opportunity exceeds threshold
- [ ] Grid collapses to 1 column on mobile (< 768px)
- [ ] Empty state: if an asset has no opportunities, card shows "No open opportunities" in grey text (no badges)

---

## Scope notes

- FE-only change — no new API route, no schema change
- All badge data computed client-side from existing `portfolio.assets` structure
- The existing satellite thumbnail strip (line 688-701, `src/app/dashboard/page.tsx`) should be **removed** once this grid is live — it's redundant
- `fmtShort` = existing `fmt()` helper already in dashboard page

---

---

## Part 2: Occupancy Breakdown Donut (§5.3 item 6, analytics row right 40%)

**Spec ref:** RealHQ-Spec-v3.2.html §5.3 item 6 — "Occupancy breakdown donut (right 40%)"
**Triage:** Wave 2 — all occupancy state data is derivable from Wave 2 tenant materialisation (`Tenant`, `Lease` models). No new API route. No schema change.

### What it shows

A donut chart with 4 segments + legend. Total sqft in the centre. Each segment shows sqft.

| Segment | Colour | Logic |
|---------|--------|-------|
| Occupied | `#0A8A4C` (green) | Asset has ≥1 lease with `leaseStatus = "active"` AND `daysToExpiry > 90` |
| Notice given | `#F5A94A` (amber) | `leaseStatus = "expiring_soon"` OR (`leaseStatus = "active"` AND `daysToExpiry ≤ 90`) |
| In negotiation | `#3B82F6` (blue) | Lease has an active `TenantEngagement` with `actionType = "engage_renewal"` AND `status ≠ "complete"` |
| Vacant | `#D93025` (red) | Asset has no lease records in the tenants response |

### Data source

Compute from `portfolio.assets` + the Wave 2 tenant data from `GET /api/user/tenants`.

**API response shape (per `src/app/api/user/tenants/route.ts`):** Each item in `tenants[]` has:
`id` (leaseId), `assetId`, `leaseStatus` (`"active" | "expiring_soon" | "expired" | "vacant"`), `daysToExpiry` (number | null), `sqft`.

**Backend addition required for "In negotiation" segment:** The current tenants route does not return `TenantEngagement` data. To enable the "In negotiation" segment, the tenants route must include the latest engagement per lease in its Prisma query:

```ts
// Add to the `include` block in /api/user/tenants/route.ts:
engagements: {
  where: { actionType: 'engage_renewal' },
  orderBy: { createdAt: 'desc' },
  take: 1,
  select: { actionType: true, status: true },
},
```

Then surface it as `engagements: { actionType: string; status: string }[]` in the response item.

This is a **minor BE addition** (2–3 lines in the Prisma query + mapping). Not a schema change.

```ts
// Pseudo-code: derive occupancy breakdown from portfolio + tenants data
// Assumes tenants route includes `engagements` as described above
const breakdown = portfolio.assets.reduce((acc, asset) => {
  const assetLeases = tenants.filter(t => t.assetId === asset.id);
  const sqft = asset.sqft ?? 0;

  if (assetLeases.length === 0) {
    acc.vacant += sqft;
    return acc;
  }

  const active = assetLeases.find(t => t.leaseStatus === 'active' && (t.daysToExpiry ?? 999) > 90);
  const inNegotiation = assetLeases.find(t =>
    t.engagements?.some(e => e.actionType === 'engage_renewal' && e.status !== 'complete')
  );
  const expiring = assetLeases.find(t =>
    t.leaseStatus === 'expiring_soon' ||
    (t.leaseStatus === 'active' && (t.daysToExpiry ?? 999) <= 90)
  );

  if (active && !inNegotiation) acc.occupied += sqft;
  else if (inNegotiation)       acc.inNegotiation += sqft;
  else if (expiring)            acc.notice += sqft;
  else                          acc.vacant += sqft;
  return acc;
}, { occupied: 0, notice: 0, inNegotiation: 0, vacant: 0 });
```

### Fallback

If tenant data hasn't loaded or all assets lack sqft data: show a simple "Occupancy data loading" placeholder — not a broken chart, not an error.

### Acceptance criteria

- [ ] Donut renders with correct 4 segments using spec colours
- [ ] Centre shows total sqft (formatted with commas, e.g. "185,000 sqft")
- [ ] Legend labels show segment name + sqft + % of total
- [ ] Chart uses real tenant data — not illustrative percentages
- [ ] If no tenants are materialised: shows placeholder, not 100% vacant incorrectly
- [ ] Responsive: shrinks gracefully on mobile (min 200px width)

---

## Part 3: Portfolio Value Score (§5.3 item 7, analytics row left 60%)

**Spec ref:** RealHQ-Dashboard-v3-FINAL.html prototype — circular progress "73/100" composite score with Income, Cost, Growth sub-scores
**Triage:** Wave 2 — all three sub-score inputs derivable from `portfolio.assets` (UserAsset fields). No new API route. No schema change. Pure FE.

### What it shows

A circular progress indicator (0–100) with a composite score and three horizontal sub-score bars:

| Sub-score | Colour | What it measures |
|-----------|--------|-----------------|
| Income Score | `#0A8A4C` | Rent / market rent ratio + occupancy |
| Cost Score | `#1647E8` | Overpayment reduction vs market (insurance + energy) |
| Growth Score | `#6B21A8` | Planning opportunity + AVM trend signal |

Overall score = weighted average: Income 40%, Cost 35%, Growth 25%.

### Score computation

**Portfolio route field verification (confirmed against `src/app/api/portfolios/user/route.ts`):**
- ✅ `passingRent` — in response
- ✅ `marketERV` — in response
- ✅ `occupancy` (defaults to 95 if null) — in response
- ✅ `insurancePremium`, `marketInsurance`, `energyCost`, `marketEnergyCost` — in response
- ✅ `valuationGBP` / `valuationUSD` — AVM-derived, in response
- ❌ `planningImpactSignal` — NOT currently in response. **Requires one-field addition to `GET /api/portfolios/user`.**

**One-line BE addition to `src/app/api/portfolios/user/route.ts`:**
Add `planningImpactSignal: a.planningImpactSignal ?? null` to the asset mapping object. No schema change (field already exists on `UserAsset`).

```ts
// Field names match GET /api/portfolios/user response:
// passingRent | marketERV | occupancy | insurancePremium | marketInsurance
// energyCost | marketEnergyCost | valuationGBP | valuationUSD | planningImpactSignal

function computePortfolioValueScore(portfolio: PortfolioData): {
  overall: number;
  income: number;
  cost: number;
  growth: number;
} {
  const assets = portfolio.assets;
  if (!assets.length) return { overall: 0, income: 0, cost: 0, growth: 0 };

  // Income score: avg(passingRent / marketERV) × occupancy weight
  // Range: 0–100. 100 = all assets at market rent, 100% occupied
  const income = Math.round(
    assets.reduce((sum, a) => {
      const marketRent = a.marketERV ?? 0;
      const passingRent = a.passingRent ?? 0;
      const rentRatio = marketRent > 0 ? Math.min(1, passingRent / marketRent) : 1;
      const occupancyWeight = (a.occupancy ?? 100) / 100;
      return sum + rentRatio * occupancyWeight * 100;
    }, 0) / assets.length
  );

  // Cost score: 100 = no overpayment. Scaled by % of market benchmark achieved
  // Uses insurance + energy overpayment vs total cost
  const cost = Math.round(
    assets.reduce((sum, a) => {
      const insuranceOverpay = Math.max(0, (a.insurancePremium ?? 0) - (a.marketInsurance ?? 0));
      const energyOverpay = Math.max(0, (a.energyCost ?? 0) - (a.marketEnergyCost ?? 0));
      const totalActual = (a.insurancePremium ?? 0) + (a.energyCost ?? 0);
      if (totalActual === 0) return sum + 100;
      const overpayRatio = (insuranceOverpay + energyOverpay) / totalActual;
      return sum + Math.round((1 - Math.min(1, overpayRatio)) * 100);
    }, 0) / assets.length
  );

  // Growth score: AVM presence + planning signal
  // planningImpactSignal: "positive" | "neutral" | "negative" | null
  // 100 = positive signal + AVM available. 0 = negative signal + no AVM.
  // Uses valuationGBP/USD (AVM-derived) as proxy for avmValue availability.
  const growth = Math.round(
    assets.reduce((sum, a) => {
      const hasPositivePlanning = a.planningImpactSignal === 'positive' ? 20 : 0;
      const hasAvm = ((a.valuationGBP ?? a.valuationUSD ?? 0) > 0) ? 40 : 0;
      // Base 40 unless signal is actively negative
      const noNegativeSignal = a.planningImpactSignal !== 'negative' ? 40 : 0;
      return sum + hasPositivePlanning + hasAvm + noNegativeSignal;
    }, 0) / assets.length
  );

  const overall = Math.round(income * 0.40 + cost * 0.35 + growth * 0.25);
  return { overall, income, cost, growth };
}
```

### UI layout

Prototype layout: circular gauge (left ~50%) + 3 sub-score bars (right ~50%), contained within the analytics row left-60% panel.

```
┌───────────────────────────────────────────────────────────┐
│  ◯ 73                   Income Score      ████████░  71   │
│  /100                   Cost Score        ███████░░  68   │
│  Portfolio              Growth Score      ████████░  80   │
│  Value Score                                               │
└───────────────────────────────────────────────────────────┘
```

Circular gauge:
- SVG circle, stroke-dasharray driven by score (0–100 → 0–circumference)
- Stroke colour: `#1647E8` (blue) 0–49, `#F5A94A` (amber) 50–69, `#0A8A4C` (green) 70–100
- Centre text: score (large, bold) + "/100" (small, grey) + "Portfolio\nValue Score" (10px, grey below)

Sub-score bars:
- Each bar: label (10px, grey) + filled track + score (10px, right-aligned)
- Bar fill colours per table above
- Track: `#F3F4F6`, filled portion: sub-score colour
- Bar height: 6px, `borderRadius: 3`

### Fallback

If portfolio data hasn't loaded: show grey circular placeholder, no sub-scores visible.

### Notes

- Growth score will improve as PRO-604 (dev potential) and AVM (PRO-570) are activated post-migration
- Score is informational — not commission-bearing. No CTA on this component.
- Do NOT show a numerical breakdown of how the score was calculated in the UI — just the scores.

### Acceptance criteria

- [ ] Circular gauge renders with correct colour band (blue/amber/green) based on overall score
- [ ] Score uses real portfolio data — not hardcoded 73
- [ ] Three sub-score bars render with correct colours and real computed values
- [ ] If portfolio not yet loaded: shows grey placeholder, not 0/100
- [ ] Score recalculates when portfolio data refreshes (no stale state)
- [ ] Component is responsive: stacks vertically on mobile (< 768px)

---

## Part 4: Expanded KPI Strip (8 tiles)

**Spec ref:** RealHQ-Dashboard-v3-FINAL.html prototype — 8-tile KPI strip
**Current spec:** §5.3 lists 5 KPI tiles. Prototype has 8. Three additional tiles are FE-computable from existing Wave 2 data.
**Triage:** Wave 2 — all 8 tiles computable from `portfolio.assets` + Wave 1 data.

### Full 8-tile set

Confirmed against `src/app/api/portfolios/user/route.ts` response fields.

| Tile | Label | Formula | Field / Source |
|------|-------|---------|--------|
| 1 | Portfolio Value | Sum of `valuationGBP` or `valuationUSD` per asset | `portfolio.assets[].valuationGBP` (or `.valuationUSD`) |
| 2 | Gross Monthly Rent | Sum of `passingRent` / 12 (passingRent is annual) | `portfolio.assets[].passingRent` |
| 3 | NOI | Sum of `netIncome` / 12 (netIncome is annual) | `portfolio.assets[].netIncome` |
| 4 | Occupancy | Weighted avg `occupancy` by `sqft` | `portfolio.assets[].occupancy`, `.sqft` |
| 5 | Total Sq Footage | Sum of `sqft` | `portfolio.assets[].sqft` |
| 6 | Avg NOI Yield | (Sum of annual `netIncome` / Sum of `valuationGBP/USD`) × 100 | Derived from tiles 3 + 1 inputs |
| 7 | Costs Saved YTD | `savedYTD` from commissions summary | **`GET /api/commissions/summary`** — returns `{ savedYTD, actionCount }` |
| 8 | Unactioned Opportunity | `response.totalValueGbp` — pre-computed sum, no client-side reduction needed | `GET /api/user/action-queue` — reuse TopBar fetch |

### Tile 7 — Costs Saved YTD

Source: **`GET /api/commissions/summary`** — already built (`src/app/api/commissions/summary/route.ts`). Returns `{ savedYTD: number, actionCount: number }`. Filters by `status IN ('confirmed', 'invoiced', 'paid')` and `placedAt >= year start`.

This is a **separate fetch** (not in `GET /api/portfolios/user`). Add it to the dashboard data loading alongside the portfolio fetch. Response will be `{ savedYTD: 0, actionCount: 0 }` for users with no confirmed commissions — show this as "£0" with "No savings actioned yet" subtext.

### Tile 8 — Unactioned Opportunity

Source: **`GET /api/user/action-queue`** (already fetched for TopBar badge). Use `response.totalValueGbp` directly — the server pre-computes this. Do NOT reduce `items[].annualValue` client-side. Do NOT make a second fetch.

Confirmed field name: `totalValueGbp` (not `totalValueGbpSum` or derived — it's the top-level response property per `src/app/api/user/action-queue/route.ts` line 260).

### Layout

KPI strip: `display: flex`, `gap: 8`, `overflowX: auto` (scroll on mobile). Each tile: `minWidth: 140px`.

Tile structure (unchanged from Wave 1 KPI tiles — match existing style exactly).

### Acceptance criteria

- [ ] All 8 tiles render with real computed data
- [ ] Tile 5 (Total Sq Footage) formats with commas (e.g. "185,000 sqft")
- [ ] Tile 6 (Avg NOI Yield) shows as percentage to 1dp (e.g. "6.2%")
- [ ] Tile 7 (Costs Saved YTD) fetches from `GET /api/commissions/summary` and shows `savedYTD` value; shows £0 + "No savings actioned yet" if `savedYTD === 0`
- [ ] Tile 8 (Unactioned Opportunity) reuses action queue fetch — no duplicate API call
- [ ] Strip scrolls horizontally on mobile without wrapping

---

*Spec: docs/wave-2-dashboard-properties-grid-handoff.md | PRO-613 | FE task | Wave 2 dashboard sprint*
