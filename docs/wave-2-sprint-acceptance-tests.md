# Wave 2 — Sprint Acceptance Tests
**Author:** Head of Product
**Date:** 2026-03-23
**For:** CTO, Founding Engineer, Full-Stack Engineer
**Purpose:** Pass/fail acceptance tests for each sprint gate. When all tests in a sprint pass, the sprint is done. Not before.

---

## How to use this document

Each test is:
- **Input:** what to do
- **Expected:** what should happen
- **Pass/fail:** binary — no partial credit

Tests are ordered by dependency. Run Phase 0 tests before Phase 1. Run Phase 1 before Phase 2.

---

## Phase 0 Gate — Foundations (Sprint 1, CTO)

### P0-1: Prisma migrations complete (PRO-563)

```bash
npx prisma migrate dev --name wave2-foundations
npx prisma generate
```

**Expected:**
- Migration completes without errors
- TypeScript: `prisma.assetValuation` resolves to correct type
- TypeScript: `prisma.tenant` resolves to correct type
- TypeScript: `prisma.planningApplication` resolves to correct type
- TypeScript: `prisma.contractor` resolves to correct type
- TypeScript: `prisma.scoutUnderwriting` resolves to correct type
- TypeScript: `prisma.holdSellScenario` resolves to correct type
- Existing `UserAsset` queries still work (no destructive schema change)

**Quick smoke test:**
```typescript
// Run in prisma studio or ts-node
const count = await prisma.tenant.count(); // must not throw
const asset = await prisma.userAsset.findFirst();
console.assert(asset !== undefined); // must be truthy (existing data intact)
```

**Fail if:** any Prisma client type is `never` or throws at runtime.

---

### P0-2: Planning data migration complete (PRO-564)

```bash
npx ts-node scripts/migrate-planning-history.ts
```

**Expected:**
- Completes without uncaught errors
- Any `UserAsset` with non-null `planningHistory` has corresponding `PlanningApplication` records

**Quick smoke test:**
```typescript
const assetsWithHistory = await prisma.userAsset.findMany({
  where: { planningHistory: { not: null } }
});
for (const asset of assetsWithHistory) {
  const apps = await prisma.planningApplication.findMany({ where: { assetId: asset.id } });
  console.assert(apps.length > 0, `Asset ${asset.id} has planningHistory but no PlanningApplication records`);
}
```

**Idempotency test:** Run the script twice. Count of `PlanningApplication` records must be identical after second run (upsert, not insert).

**Fail if:** any asset with `planningHistory` has zero `PlanningApplication` records after migration.

---

### P0-3: src/lib/avm.ts functions correct (PRO-565)

```bash
npx ts-node -e "
import { getFallbackCapRate, calculateIRR, calculateNPV, calculateIncomeCap, blendValuation, median, percentile } from './src/lib/avm';

// Test 1: cap rate lookup
const r1 = getFallbackCapRate('se_uk', 'Industrial');
console.assert(r1 === 0.055, 'SE UK industrial cap rate must be 5.5%');

// Test 2: IRR calculation
const irr = calculateIRR([-100, 10, 10, 10, 10, 115]);
console.assert(irr !== null && Math.abs(irr - 0.10) < 0.01, 'IRR must be ~10%');

// Test 3: NPV at 8%
const npv = calculateNPV([-100, 110], 0.08);
console.assert(Math.abs(npv - 1.85) < 0.5, 'NPV must be ~1.85');

// Test 4: income cap with EPC G penalty (+90bps)
const baseVal = calculateIncomeCap(50000, 0.055);       // no EPC
const epcVal = calculateIncomeCap(50000, 0.055, 'G');   // EPC G penalty
console.assert(epcVal < baseVal, 'EPC G must reduce value');

// Test 5: WAULT adjustment (<2yr = +75bps)
const waultVal = calculateIncomeCap(50000, 0.055, undefined, 1.5);
console.assert(waultVal < baseVal, 'Short WAULT must reduce value');

// Test 6: blend (no comps → income cap only)
const blend = blendValuation(1000000, 900000, 0);
console.assert(blend.method === 'income_cap_only', 'Zero comps must use income cap only');

// Test 7: blend (≥3 comps → 70/30)
const blend2 = blendValuation(1000000, 900000, 3);
const expected = 1000000 * 0.7 + 900000 * 0.3;
console.assert(Math.abs(blend2.value - expected) < 100, '3+ comps must use 70/30 blend');

// Test 8: median
console.assert(median([1, 3, 5]) === 3);
console.assert(median([1, 2, 3, 4]) === 2.5);

// Test 9: percentile
console.assert(percentile([10, 20, 30, 40, 50], 25) === 20);

console.log('ALL P0-3 TESTS PASSED');
"
```

**Fail if:** any assertion fires.

---

## Phase 1 Gate — Parallel tracks (Sprint 1–2)

### P1-SCOUT-1: Scout underwriting route (PRO-568)

**Setup:** Need a `ScoutDeal` record in DB. Seed one if needed.

```bash
curl -X POST http://localhost:3000/api/scout/deals/[DEAL_ID]/underwrite \
  -H "Authorization: Bearer [user-session-cookie]"
```

**Expected response shape:**
```json
{
  "id": "uuid",
  "dealId": "...",
  "estimatedNOI": 95000,
  "estimatedCapRate": 0.055,
  "askingPrice": 1750000,
  "dscr": 1.24,
  "irr5yr": 0.118,
  "recommendation": "buy",
  "ltvPct": 0.65,
  "annualDebtService": 76563
}
```

**Pass criteria:**
- `dscr > 0` for any deal with `askingPrice > 0`
- `irr5yr` between 0 and 0.30 (realistic range)
- `recommendation` is one of: `strong_buy`, `buy`, `pass`, `needs_review`
- `ScoutUnderwriting` record created in DB
- `dscr = estimatedNOI / annualDebtService` (verify arithmetic manually for one deal)

**Fail if:** `dscr = 0`, `irr5yr` is null, or DB record not created.

---

### P1-SCOUT-2: Scout LOI generation (PRO-569)

**Setup:** Need a deal with a completed `ScoutUnderwriting` record.

```bash
curl -X POST http://localhost:3000/api/scout/deals/[DEAL_ID]/loi \
  -H "Authorization: Bearer [session]"
```

**Pass criteria:**
- Response includes `draftMarkdown` (non-empty string, >500 chars)
- `draftMarkdown` contains all 7 required clauses (search for: "Offer Price", "Deposit", "Due Diligence", "Financing", "Exclusivity", "Conditions", "Closing")
- `offerPrice < askingPrice` (discount applied — strong_buy: ×0.94, buy: ×0.90)
- `ScoutLOI` record created in DB with `status = "draft"`
- `GET /api/scout/deals/[DEAL_ID]/loi` returns same record

**Fail if:** markdown is empty, `offerPrice === askingPrice`, or DB record not created.

---

### P1-WORKORDERS-1: Contractor seed + GET (PRO-566)

```bash
npx ts-node prisma/seed-contractors.ts
curl http://localhost:3000/api/user/contractors?region=se_uk \
  -H "Authorization: Bearer [session]"
```

**Pass criteria:**
- `GET /contractors?region=se_uk` returns ≥5 contractors
- Each contractor has: `name`, `trades` (array), `rating` (number), `verified` (boolean)
- `GET /contractors?region=fl_us` returns different set (region filter works)

**Fail if:** fewer than 5 contractors returned, or UK and US results are identical.

---

### P1-WORKORDERS-2: AI scope generation (PRO-566)

```bash
curl -X POST http://localhost:3000/api/user/work-orders/[WO_ID]/scope \
  -H "Authorization: Bearer [session]" \
  -H "Content-Type: application/json" \
  -d '{"type": "HVAC", "description": "Unit 3 HVAC failed, needs replacement"}'
```

**Pass criteria:**
- Response includes `scopeSummary` (non-empty string)
- Response includes `lineItems` array with ≥2 items, each having `description` and `estimatedCost`
- `totalEstimate = sum(lineItems[].estimatedCost)` — verify arithmetic
- `tradeRequired` is non-empty
- `WorkOrder.aiScopeJson` updated in DB

**Fail if:** `lineItems` is empty, or `totalEstimate ≠ sum of line items`.

---

### P1-WORKORDERS-3: Tender distribution (PRO-567)

**Note:** Test using Resend sandbox mode — do not send to real addresses.

```bash
curl -X POST http://localhost:3000/api/user/work-orders/[WO_ID]/tender \
  -H "Authorization: Bearer [session]"
```

**Pass criteria:**
- Response: `{ sentTo: 3, contractors: ["Name 1", "Name 2", "Name 3"] }`
- `sentTo` = 3 (exactly 3 contractors selected per spec)
- Resend activity log shows 3 emails sent (check Resend dashboard → Emails)
- Each email's subject contains the work order scope summary
- Each email contains a unique response link (`/tender/respond/[token]`)

**Tender response test:**
```bash
# Extract a token from the email/DB
curl -X POST http://localhost:3000/api/tender/respond/[TOKEN] \
  -H "Content-Type: application/json" \
  -d '{"price": 3800, "timeline": "2 weeks", "notes": "Can start Monday"}'
```
- Returns `{ received: true }`
- `WorkOrderBid` record created in DB

**Invalid token test:**
```bash
curl -X POST http://localhost:3000/api/tender/respond/INVALID_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"price": 100, "timeline": "1 day"}'
```
- Must return 403 (not 200, not 404)

**Fail if:** fewer than 3 emails sent, or invalid token returns 200.

---

## Phase 2 Gate — Interdependent features (Sprint 2–3)

### P2-AVM-1: Per-asset valuation route (PRO-570)

**Setup:** Need a UK asset with a postcode and `annualRent` > 0.

```bash
curl http://localhost:3000/api/user/assets/[UK_ASSET_ID]/valuation \
  -H "Authorization: Bearer [session]"
```

**Pass criteria:**
- `avmValue > 0`
- `confidence` between 0 and 1
- `capRateUsed` matches `getFallbackCapRate()` for asset type (if no comps)
- `AssetValuation` record created in DB
- `UserAsset.avmValue` updated

**7-day cache test:**
```bash
# Call twice within 7 days — second call must return same `avmDate`
curl http://localhost:3000/api/user/assets/[ID]/valuation
curl http://localhost:3000/api/user/assets/[ID]/valuation
```
- `avmDate` identical on both calls (cache hit)

**Refresh test:**
```bash
curl "http://localhost:3000/api/user/assets/[ID]/valuation?refresh=true"
```
- New `AssetValuation` record created (check DB count increases)

**US asset test:** same route for a FL asset — must use ATTOM comps if available, `getFallbackCapRate` for fl_us if not.

**Fail if:** `avmValue = 0`, `confidence` outside 0–1, or refresh creates no new record.

---

### P2-TENANT-1: Real tenant data materialisation (PRO-572)

**Setup:** Need a real user with at least one uploaded lease PDF processed through Document pipeline.

```bash
curl http://localhost:3000/api/user/tenants \
  -H "Authorization: Bearer [REAL_USER_SESSION]"
```

**Pass criteria:**
- Returns tenant data derived from `Document.extractedData`, not from `flMixed`/`seLogistics` static data
- Each tenant has `healthScore` between 0 and 100 (not 0 — any active tenant must have score > 0)
- Response shape matches what `tenants/page.tsx` expects (no console errors in UI)

**Verify zero demo data leakage:**
```bash
# Real user session must not see "Thornton Logistics" or "Brooks Media" (FL demo tenants)
curl http://localhost:3000/api/user/tenants -H "Authorization: Bearer [REAL_USER]" | \
  grep -i "thornton\|brooks\|clearwater"
# must return no matches
```

**Fail if:** real user sees demo tenant names, or `healthScore = 0` for any tenant with an active lease.

---

### P2-TENANT-2: Renewal letter generation (PRO-572)

```bash
curl -X POST http://localhost:3000/api/user/tenants/[LEASE_REF]/engage-renewal \
  -H "Authorization: Bearer [session]"
```

**Pass criteria:**
- Response includes `letter` (non-empty markdown string, >300 chars)
- Letter contains tenant name (from `Tenant.name`)
- Letter contains current rent figure
- `TenantEngagement` record created in DB with `letterDraft` populated
- Resend activity log shows email to owner (NOT to tenant — owner reviews first)

**Fail if:** `letter` is empty string, or email sent to tenant address instead of owner.

---

### P2-RENTREVIEW-1: Cron trigger creates correct events (PRO-574)

**Setup:** Create a test `Lease` with `expiryDate = today + 360 days` (within 12-month horizon).

```bash
curl -X POST http://localhost:3000/api/cron/rent-review-triggers \
  -H "Authorization: Bearer [cron-secret]"
```

**Pass criteria:**
- `RentReviewEvent` created for the test lease with `horizon = "12m"`, `status = "pending"`
- No duplicate event if cron runs again (idempotency — unique on `[userId, leaseId, horizon]`)
- `RentReviewEvent` NOT created for lease with `expiryDate = today + 700 days` (outside 18m window)

**Letter generation test:**
```bash
curl -X POST http://localhost:3000/api/user/rent-reviews/[EVENT_ID]/draft \
  -H "Authorization: Bearer [session]"
```
- `RenewalCorrespondence.body` populated (>300 chars)
- Letter contains current rent figure from `RentReviewEvent.passingRent`

**Commission trigger test:**
```bash
curl -X PATCH http://localhost:3000/api/user/rent-reviews/[EVENT_ID]/complete \
  -H "Authorization: Bearer [session]" \
  -H "Content-Type: application/json" \
  -d '{"newRent": 110000}'
```
- `Commission` created with `commissionValue = (110000 - passingRent) × 0.08`
- `Commission.category = "rent_review"` (not `.type`)
- `Commission.annualSaving = uplift` (the annual rent increase amount)
- `RentReviewEvent.status` updated to `"lease_renewed"`
- `Lease.passingRent` updated to `110000` (if leaseId is set)

**Fail if:** commission = 8% of `newRent` instead of 8% of uplift. This is the most common implementation error.

---

### P2-HOLDSELL-1: Full DCF replaces simplified formula (PRO-575)

**Setup:** Need an asset with `avmValue` set (from P2-AVM-1).

```bash
curl http://localhost:3000/api/user/hold-sell-scenarios \
  -H "Authorization: Bearer [session]"
```

**Pass criteria:**
- Response includes `holdIRR` and `holdNPV` (non-zero)
- `holdIRR ≠ netYield + 0.015` (i.e. the old simplified formula — verify it's changed)
- Response includes `recommendation` with `confidence` between 0.4 and 0.9

**Assumptions override test:**
```bash
curl -X POST http://localhost:3000/api/user/hold-sell-scenarios/[ASSET_ID]/assumptions \
  -H "Authorization: Bearer [session]" \
  -H "Content-Type: application/json" \
  -d '{"rentGrowthPct": 0.05, "exitYieldPct": 0.05, "holdPeriodYears": 10}'

curl http://localhost:3000/api/user/hold-sell-scenarios \
  -H "Authorization: Bearer [session]"
```
- `holdIRR` must be different with 5% rent growth vs default (2%)
- Confirm: higher rent growth → higher IRR (directional sanity check)

**Fail if:** `holdIRR` unchanged when `rentGrowthPct` changes (model not live).

---

### P2-PLANNING-1: Live planning feed cron (PRO-576)

**Setup:** Need a UK asset with a valid postcode.

```bash
curl -X POST http://localhost:3000/api/cron/planning-monitor \
  -H "Authorization: Bearer [cron-secret]"
```

**Pass criteria:**
- At least 1 `PlanningApplication` record created for the UK test asset
- `impactLevel` is one of: `positive`, `neutral`, `negative`, `unknown` (not null)
- `rationale` field populated (non-empty)
- `GET /api/user/planning` returns `PlanningApplication` records (not the old JSON blob)

**Alert test:** Create a `PlanningApplication` manually with `impactLevel = "negative"`, `acked = false`. Run cron again — Resend activity log must show an alert email to the asset owner.

**Acknowledge test:**
```bash
curl -X PATCH http://localhost:3000/api/user/planning/[APP_ID]/ack \
  -H "Authorization: Bearer [session]"
```
- `PlanningApplication.acked = true` in DB
- Running `GET /api/user/planning` shows item no longer in unread list

**Fail if:** `GET /api/user/planning` still returns JSON blob (old implementation), or negative alert doesn't send email.

---

## Phase 3 Gate — Action Queue (Sprint 4)

### P3-AQ-1: API returns items from multiple sources

**Setup:** Need test user with: open insurance opportunity, ≥1 lease expiring within 12 months, ≥1 negative planning application (not acked).

```bash
curl http://localhost:3000/api/user/action-queue \
  -H "Authorization: Bearer [session]"
```

**Pass criteria:**
- Response includes items from ≥3 different `source` values
- Items sorted by `urgencyScore × annualValue` descending (verify: highest value item must be first)
- Response includes `totalAnnualValue` (sum of all item `annualValue`)
- Response includes `criticalCount` (count of items with `urgencyScore ≥ 8`)

**TopBar integration test:**
1. Open `/dashboard` in browser
2. TopBar badge must show count matching `items.length` from API
3. Click badge → `ActionQueueDrawer` opens
4. Drawer tabs filter correctly (urgent/savings/income)
5. Dismiss button on one item → item disappears → localStorage `realhq_dismissed_actions` updated

**Empty state test:** User with no open items sees "No urgent actions" state (not a blank screen, not an error).

**Fail if:** items from only 1 source, sorting wrong, or badge count ≠ API count.

---

## Commission audit — cross-sprint verification

Run at end of Sprint 4 before declaring Wave 2 done.

Check admin commission view shows records from each commission type:

| Commission type | Rate | Trigger |
|-----------------|------|---------|
| `insurance` | 15% of year-1 saving | Insurance placement complete |
| `energy` | 10% of year-1 saving | Energy switch executed |
| `work_order` | 3% of final cost | `POST /work-orders/:id/complete` |
| `rent_review` | 8% of annual uplift | `PATCH /rent-reviews/:id/complete` |
| `solar` | 10% of year-1 income | Solar installation confirmed |

**SQL verification:** (`category` is the field name — not `type`)
```sql
SELECT category, COUNT(*) as count, SUM("annualSaving") as total_saving, SUM("commissionValue") as total_commission
FROM "Commission"
GROUP BY category;
```

Every type that has gone through its completion flow must have ≥1 record. Amount = 0 for any type is a bug.

---

## Sprint 4b — Insurance Risk Scorecard + Roadmap (PRO-610)

*Acceptance tests for the Insurance Risk Scorecard and Premium Reduction Roadmap features.*

### AT-610-1: Risk scoring returns valid result

**Input:** `GET /api/user/insurance-risk/:assetId` for an asset with known `insurancePremium`, `epcRating`, `floodZone`, `assetType`.

**Expected:**
- Response contains `riskScore: number` (0–100)
- Response contains `factors: InsuranceRiskFactor[]` — at least 3 factors (EPC, flood, construction)
- Response contains `roadmap: InsuranceRoadmapAction[]` — at least 1 action
- First roadmap action has highest `annualSaving / max(costLow, 1)` ratio (sorted by ROI)
- `assessedAt` timestamp is set

**Pass:** all fields present, roadmap sorted correctly.
**Fail:** empty roadmap, null riskScore, unsorted roadmap.

### AT-610-2: 30-day cache is respected

**Input:** Call `GET /api/user/insurance-risk/:assetId` twice within 30 days for the same asset.

**Expected:**
- Second call returns same `assessedAt` timestamp as first call (cached, not recomputed)
- No second Claude API call is made

**Pass:** `assessedAt` identical on both calls.
**Fail:** `assessedAt` changes on second call.

### AT-610-3: Roadmap action status update

**Input:** `PATCH /api/user/insurance-risk/:assetId/action/:actionId` with `{ "status": "done" }`.

**Expected:**
- Returns updated roadmap with matching action `status: "done"`
- Subsequent `GET` still returns `status: "done"` for that action (persisted to `insuranceRoadmap` JSON)

**Pass:** status persists across calls.
**Fail:** status resets to default on next GET.

### AT-610-4: Action Queue includes insurance risk item

**Input:** `GET /api/user/action-queue` for a user where an asset has a populated `insuranceRoadmap` with top action `status !== "done"` and `annualSaving > 300`.

**Expected:**
- Response includes item with `type: "insurance_risk"`
- `annualValue` matches `roadmap[0].annualSaving` (field is `annualValue` not `annualValueGbp` per route implementation)
- `actionHref` is `/insurance#risk-roadmap`
- Item is NOT shown after top action is marked done

**Pass:** item appears with correct data; disappears after done.
**Fail:** item missing, wrong value, or persists after done.

---

## Sprint 4c — Dashboard Properties Grid (PRO-613)

*Acceptance tests for the per-asset properties grid with opportunity badges.*

### AT-613-1: Grid renders 3 across on desktop

**Input:** Navigate to `/dashboard` with ≥2 assets in portfolio.

**Expected:**
- Properties grid appears below narrative block, above KPI strip
- Cards are 3 per row at viewport width ≥ 768px
- Each card shows asset name, location, asset type
- No satellite thumbnail strip (old component removed)

**Pass:** 3-across grid, no thumbnail strip.
**Fail:** old thumbnail strip still shown; grid absent.

### AT-613-2: Opportunity badges use correct spec colours

**Input:** Asset with `insurancePremium > marketInsurance + 200` AND `currentRent < marketRent - 500/12`.

**Expected:**
- Card shows COST SAVING badge: `background #EEF2FE`, `color #1647E8`, `borderLeft 2px solid #1647E8`
- Card shows INCOME UPLIFT badge: `background #E8F5EE`, `color #0A8A4C`, `borderLeft 2px solid #0A8A4C`
- At most 3 badges per card

**Pass:** colours match spec §5.4 exactly; max 3 badges.
**Fail:** wrong colours; >3 badges; badges shown when saving below threshold.

### AT-613-3: No badges for zero-opportunity asset

**Input:** Asset where all badge thresholds are below minimum (insurance saving = 0, rent = market, no urgency).

**Expected:**
- Card shows "No open opportunities" in grey text (`#9CA3AF`)
- No badge elements rendered

**Pass:** empty state shown correctly.
**Fail:** zero-value badges shown; error state.

### AT-613-4: Grid collapses to 1 column on mobile

**Input:** Navigate to `/dashboard` with browser width < 768px (or DevTools mobile emulation).

**Expected:**
- Cards stack in a single column
- No horizontal scroll

**Pass:** single-column layout.
**Fail:** 3-across layout on mobile; horizontal overflow.

---

### AT-613-5: Occupancy donut renders with real data

**Input:** Dashboard loaded for a user with at least 3 assets and ≥1 materialised tenant.

**Expected:**
- Donut chart appears in analytics row (right 40%)
- At least 2 segments are non-zero (e.g. Occupied + Vacant)
- Centre shows total sqft as formatted number
- Segment colours match spec (green occupied, amber notice, blue negotiation, red vacant)

**Pass:** donut renders with correct colours and real sqft figures.
**Fail:** all segments equal (25% each), or 100% Occupied for assets with no tenants, or illustrative sqft values.

---

### AT-613-6: Occupancy donut placeholder on no tenant data

**Input:** Dashboard loaded for a fresh user with assets but no materialised tenants.

**Expected:**
- Donut area shows a placeholder ("Occupancy data loading" or similar) — not a broken chart
- No 100% Vacant misrepresentation

**Pass:** graceful placeholder, no crash.
**Fail:** broken chart, JavaScript error, or all assets incorrectly shown as vacant.

---

### AT-613-7: Portfolio Value Score renders with real score

**Input:** Dashboard loaded for a user with ≥1 asset that has `currentRent`, `marketRent`, and `sqft` populated.

**Expected:**
- Circular gauge renders with a computed overall score (0–100)
- Gauge stroke colour matches band: blue 0–49, amber 50–69, green 70–100
- Three sub-score bars (Income, Cost, Growth) render with real computed values
- No hardcoded "73" score

**Pass:** gauge + 3 sub-score bars shown; score changes based on asset data.
**Fail:** hardcoded score; score never changes between portfolios; gauge missing.

---

### AT-613-8: Portfolio Value Score falls back gracefully when data not loaded

**Input:** Dashboard before `portfolio` fetch resolves (simulate loading state).

**Expected:**
- Grey circular placeholder shown (no score number)
- No crash, no "NaN/100", no 0/100 shown prematurely

**Pass:** grey placeholder during load, real score after load.
**Fail:** flash of 0/100; NaN shown; JavaScript error.

---

### AT-613-9: Portfolio Value Score recalculates on data refresh

**Input:** Dashboard loaded; user adds a second asset with better rent vs market ratio; portfolio data refreshes.

**Expected:**
- Overall score and Income sub-score both increase to reflect improved portfolio
- No stale cached value shown after refresh

**Pass:** score updates on data change.
**Fail:** score frozen at initial value; requires page reload.

---

### AT-613-10: 8-tile KPI strip renders all tiles

**Input:** Dashboard loaded for a user with ≥1 asset, sqft populated, ≥1 action queue item open.

**Expected:**
- KPI strip shows all 8 tiles: Portfolio Value, Gross Monthly Rent, NOI, Occupancy, Total Sq Footage, Avg NOI Yield, Costs Saved YTD, Unactioned Opportunity
- No tile shows hardcoded illustrative numbers
- Tile 5 (Total Sq Footage) formats with commas (e.g. "12,500 sqft")
- Tile 6 (Avg NOI Yield) shows percentage to 1 decimal place (e.g. "6.2%")

**Pass:** all 8 tiles present with real data.
**Fail:** only 5 tiles shown; any tile shows hardcoded value; formatting missing.

---

### AT-613-11: Tile 7 (Costs Saved YTD) shows £0 for new user

**Input:** Dashboard loaded for a fresh user with no confirmed commissions (`GET /api/commissions/summary` returns `{ savedYTD: 0, actionCount: 0 }`).

**Expected:**
- Dashboard calls `GET /api/commissions/summary`
- Tile 7 shows "£0" (not blank, not hidden)
- Subtext "No savings actioned yet" shown below the value

**Pass:** £0 with subtext shown; correct API called.
**Fail:** tile hidden; blank; error state; any non-zero illustrative amount; API call missing.

---

### AT-613-12: Tile 8 (Unactioned Opportunity) reuses action queue fetch

**Input:** Dashboard network tab (DevTools) while loading.

**Expected:**
- Only one call to `GET /api/user/action-queue` — not two
- Tile 8 shows `response.totalValueGbp` from that response (NOT a client-side sum of `items[].annualValue`)
- Value matches `totalValueGbp` from the action queue response exactly

**Pass:** one API call; tile shows `totalValueGbp` value.
**Fail:** duplicate API calls; tile value computed by summing items (fragile); tile value mismatches `totalValueGbp`.

---

## Known failure modes — what to watch for

1. **Commission calculated on total, not uplift:** `POST /complete` must use `achievedRent - currentRent` × 8%, not `achievedRent` × 8%. This doubles the fee.
2. **IRR returns null for profitable investments:** Newton-Raphson requires initial cash flow to be negative. If equity sign is wrong, IRR = null. Check: `cashFlows[0]` must be `-equity` (negative).
3. **Demo data leaking:** real user sessions returning `flMixed`/`seLogistics` static data. Check every route returns empty array (not demo data) for fresh user with no documents.
4. **Planning cron creating duplicates:** must upsert on `reference` field, not insert. Check idempotency test in P0-2 above.
5. **Tender token reuse:** `POST /tender/respond/:token` must invalidate or single-use the token. A contractor must not be able to submit multiple bids on the same token.
