# PRO-695: OPTIMISE Pages — Rent Clock + Income + Hold vs Sell

**Issue:** PRO-695
**Date:** 2026-03-27
**Author:** Head of Product
**Status:** Ready to build
**Design files:**
- `docs/designs/rent-clock-design.html` — main page + 4 flows
- `docs/designs/income-design.html` — main page + 3 flows
- `docs/designs/hold-sell-design.html` — main page + 3 flows
**Prerequisite:** AppShell restyle complete (dark theme must be live)
**Estimate:** Large — 3 pages, 10 flows total. But backend is mostly built for all three.

**Ownership (per CLAUDE.md):**
- **Full-Stack Agent (Frontend):** All 3 page.tsx files, components
- **Founding Agent (Backend):** Minor API extensions only
- **Both:** Read DECISIONS.md → CODE_INVENTORY.md → CLAUDE.md → all 3 design files before starting.

**Workflow:** Feature branch `feature/pro-695-optimise` → `npx tsc --noEmit && npm run lint` → push. Never push to main.

---

> **MANDATORY PRE-READ:** DECISIONS.md → CODE_INVENTORY.md → CLAUDE.md → design files.
> **RESTYLE. REWIRE. EXTEND.** The backend for all three pages is substantially built.

---

## 1. RENT CLOCK (/rent-clock)

### Existing code — DO NOT REBUILD
| What | Location | Status |
|------|----------|--------|
| `RentReviewEvent` model | prisma/schema.prisma | Complete — full status pipeline, ERV, leverage scoring |
| `RenewalCorrespondence` model | prisma/schema.prisma | Complete — letter types, send/open tracking |
| `GET /api/user/rent-reviews` | route.ts | Working — lists reviews with urgency scoring |
| `POST /api/user/rent-reviews` | route.ts | Working — creates review manually |
| `POST /api/user/rent-reviews/[id]/draft` | route.ts | Working — Claude generates renewal letter/section 25/HoTs |
| `POST /api/user/rent-reviews/[id]/send` | route.ts | Working — sends via Resend |
| `POST /api/user/rent-reviews/[id]/hot` | route.ts | Working — generates Heads of Terms |
| `POST /api/user/rent-reviews/[id]/complete` | route.ts | Working — records outcome with newRent |
| `/api/cron/rent-review-triggers` | route.ts | Working — creates events from lease expiry dates |
| `sendRentReviewAlert()` | email.ts | Working |
| `tenant-health.ts` | lib | Working — scoreTenantHealth(), assessLeaseRisk() |
| `usePortfolio` hook | hooks | Working — used across 9+ pages |

### What to build
**Page:** `/rent-clock/page.tsx` with:
- KPIs: Active leases, Reviews due, Reversionary gap (total uplift), Break clauses, WAULT
- Insight banner: biggest opportunity with gap amount → opens Flow 1
- Visual rent clock: circular/timeline with markers for each lease event (red=break, amber=review, green=expiry)
- Upcoming reviews list: sorted by urgency, showing tenant, type, days, passing rent, gap
- Rent vs market comparison: horizontal bar chart per tenant (passing vs ERV) with gap amount
- Active review progress tracker: shows pipeline status (pending→draft_sent→hot_signed→lease_renewed)

**Flows:**
- Flow 1: Rent review wizard (market evidence → generate letter via `/draft` → preview → send via `/send` → track → record outcome via `/complete`)
- Flow 2: Notice generation (renewal letter / section 25 / HoTs / break response — all via `/draft` with type param)
- Flow 3: Market evidence search (calls `/api/market/comparables`, user selects which to include in letter)
- Flow 4: Break clause detail (income at risk, retention options, counter-proposal draft)

**RESTYLE existing:** `MetricCard` (KPIs), `ActionAlert` (break clause alert), `DirectCallout` (insight), `SectionHeader`

### New files
| File | Purpose |
|------|---------|
| `src/app/rent-clock/page.tsx` | Main rent clock page |
| `src/hooks/useRentReviews.ts` | Fetches /api/user/rent-reviews (follow useIncomeOpportunities pattern) |
| `src/components/RentClock.tsx` | Visual clock component (circular with markers) |
| `src/components/RentVsMarket.tsx` | Horizontal bar comparison chart |

---

## 2. ANCILLARY INCOME (/income)

### Existing code — DO NOT REBUILD
| What | Location | Status |
|------|----------|--------|
| `opportunity.ts` | lib (278 lines) | Working — identifyOpportunities(), scoreOpportunity() |
| `GET /api/user/income-opportunities` | route.ts | Working — returns opportunities per asset by type (OPP_BY_TYPE lookup) |
| `POST /api/user/income-opportunities/activate` | route.ts | Working — creates IncomeActivation record |
| `GET /api/user/income-opportunities/activations` | route.ts | Working — lists activated opportunities |
| `IncomeActivation` model | prisma/schema.prisma | Complete — type, status (requested/in_progress/live/declined), annualIncome |
| `useIncomeOpportunities` hook | hooks | Working — fetches opportunities |
| `HoldSellRecommendation` component | components | RESTYLE for opportunity cards |

### What to build
**Page:** `/income/page.tsx` with:
- KPIs: Total opportunity (sum), Opportunity count, Activated count, Live income
- Insight banner: biggest single opportunity → opens Flow 2
- Opportunities grouped by property: card per opportunity (icon, type, description, annual income, effort level)
- Activated section: in-progress and live opportunities with status tracking

**Flows:**
- Flow 1: Opportunity detail (how the number was calculated, comparable evidence)
- Flow 2: Activate opportunity (what happens next → POST /activate → success)
- Flow 3: Dismiss with reason (learning loop — same pattern as insurance dismiss, stores reason for future scoring)

**RESTYLE existing:** `HoldSellRecommendation` (for opportunity cards), `MetricCard`, `DirectCallout`

### New files
| File | Purpose |
|------|---------|
| `src/app/income/page.tsx` | Main income opportunities page |
| `src/components/OpportunityCard.tsx` | Per-opportunity card with icon, income, effort (or restyle HoldSellRecommendation) |

---

## 3. HOLD VS SELL (/hold-sell)

### Existing code — DO NOT REBUILD
| What | Location | Status |
|------|----------|--------|
| `hold-sell-model.ts` | lib (325 lines) | Working — full 10-year DCF: calculateHoldScenario(), calculateSellScenario(), deriveRecommendation() |
| `avm.ts` | lib (463 lines) | Working — calculateNPV(), calculateIRR(), getFallbackCapRate() |
| `GET /api/user/hold-sell-scenarios` | route.ts | Working — returns per-asset analysis, caches for 7 days |
| `PATCH /api/user/hold-sell-scenarios/[id]/assumptions` | route.ts | Working — updates assumptions + triggers recalc |
| `HoldSellScenario` model | prisma/schema.prisma | Complete — all hold/sell outputs + user assumptions |
| `useHoldSellScenarios` hook | hooks | Working — { scenarios, loading, error } |
| `HoldSellRecommendation` component | components | RESTYLE for dark theme |
| `brochure.ts` + `brochure-template.ts` | lib | Working — PDF generation (use for investor report) |

### What to build
**Page:** `/hold-sell/page.tsx` with:
- Per-asset scenario cards: side-by-side Hold vs Sell with NPV, IRR, equity multiple, cash yield
- Recommendation badge per asset: STRONG HOLD / HOLD / SELL / NEEDS REVIEW with confidence score
- Summary table: all assets ranked by recommendation
- Portal hint for investor/advisor sharing

**Flows:**
- Flow 1: Scenario builder (sliders for all assumptions → live recalculation → PATCH /assumptions)
- Flow 2: Sensitivity analysis (grid: exit cap rate × rent growth → Hold IRR. Run calculateHoldScenario() with varied inputs)
- Flow 3: Generate investor report (select assets + sections → PDF via brochure.ts → share via portal)

**RESTYLE existing:** `HoldSellRecommendation` (dark theme), `MetricCard`, `BarChart` (for cash flow chart if needed)

### New files
| File | Purpose |
|------|---------|
| `src/app/hold-sell/page.tsx` | Main hold vs sell page |
| `src/components/ScenarioCard.tsx` | Per-asset hold vs sell comparison (or restyle HoldSellRecommendation) |
| `src/components/SensitivityGrid.tsx` | What-if grid component |
| `src/components/ScenarioSliders.tsx` | Assumption sliders with live recalculation |

---

## Acceptance criteria

### Rent Clock
- [ ] Visual rent clock renders with markers positioned by months-to-event
- [ ] Upcoming reviews sorted by urgency with gap amounts
- [ ] Rent vs market bar chart shows passing vs ERV per tenant
- [ ] Flow 1: Full wizard works end-to-end (evidence → draft → preview → send → track → outcome)
- [ ] Flow 1: Send step checks for tenant email — pre-fills if known, prompts if missing, saves back to Tenant
- [ ] Flow 1: "Download as PDF" works as alternative to email send (for tenants without email / postal service)
- [ ] Flow 4: Break clause shows income at risk with retention options

### Ancillary Income
- [ ] Opportunities grouped by property with correct income amounts from OPP_BY_TYPE
- [ ] Activated section shows status progression (requested → in_progress → live)
- [ ] Flow 2: Activate creates IncomeActivation record
- [ ] Flow 3: Dismiss stores reason (learning loop)

### Hold vs Sell
- [ ] Per-asset scenario cards show hold vs sell side-by-side with correct NPV/IRR
- [ ] Recommendation badges match deriveRecommendation() output
- [ ] Flow 1: Sliders update assumptions and trigger recalculation via PATCH
- [ ] Flow 2: Sensitivity grid shows IRR across cap rate × growth matrix
- [ ] Flow 3: Report generation creates downloadable PDF and/or portal link
- [ ] PDF download actually produces a file (not just HTML preview)

### Post-build (mandatory)
- [ ] Update `CLAUDE.md` Design Files list
- [ ] Update `CODE_INVENTORY.md` with new files
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] No duplicate components

---

## CRITICAL GAPS — Must fix during this build

### Gap 1: PDF generation is broken
`brochure.ts` uses `@sparticuz/chromium` + `puppeteer-core` but **neither package is in `package.json`**. The code silently fails and returns `null`. Every "Download PDF" and "Generate report" button across the entire product is broken.

**Fix:** Install the dependencies and verify PDF generation works on Vercel:
```bash
npm install @sparticuz/chromium puppeteer-core
```
Then test `generateBrochurePDF()` returns an actual Buffer, not null. The existing `/api/user/assets/[id]/brochure` route falls back to `htmlPreview` only — make sure `pdfUrl` is a real base64 data URI.

**Alternative if Chromium is too heavy for Vercel:** Replace with a lighter PDF library (`@react-pdf/renderer`, `pdf-lib`, or `jspdf`). The HTML template in `brochure-template.ts` (392 lines) would need converting, but it's a one-time effort. Decide which approach before building.

### Gap 2: Renewal letter has no PDF output
The send route (`/rent-reviews/[id]/send`) only sends email. There's no way to download the letter as a PDF for printing or posting. The rent clock design shows "Download as PDF" as an option.

**Fix:** Create a letter PDF route — either:
- Extend the brochure pipeline: create `renderLetterHTML(correspondence)` template → `generateBrochurePDF()` (once Gap 1 is fixed)
- Or use a simpler approach: the letter body is already Markdown → convert to styled HTML → use the same PDF pipeline

New route needed: `POST /api/user/rent-reviews/[id]/pdf` — takes the correspondence body and returns a downloadable PDF.

### Gap 3: Tenant email not guaranteed
`Tenant.email` is `String?` (optional). The send flow takes `recipientEmail` as a body param but doesn't look it up or validate it.

**Fix in the Rent Clock send flow (Flow 1):**
1. When user clicks "Send to tenant", check `Tenant.email` for this review's tenant
2. If email exists: pre-fill in the send form, allow editing
3. If email is missing: show input field — "Enter tenant's email to send"
4. On send: save the entered email back to the Tenant record (`PATCH /api/user/tenants/[id]` or inline update)
5. Always show alternatives: "Download as PDF" (Gap 2), "Copy to clipboard", "Print"

### Gap 4: Email open/bounce tracking not wired
`RenewalCorrespondence` has `deliveredAt` and `openedAt` fields but nothing writes to them. The Resend webhook handler at `/api/webhooks/resend` is frozen (just returns `{ received: true }`).

**Fix:**
1. Store Resend message ID at send time — update the `/send` route to capture and store the Resend response ID on the `RenewalCorrespondence` record (add `resendMessageId String?` to the model if needed)
2. Rewrite `/api/webhooks/resend` to:
   - Parse Resend webhook events (`email.delivered`, `email.opened`, `email.bounced`, `email.complained`)
   - Match by Resend message ID → find the `RenewalCorrespondence` record
   - Update `deliveredAt`, `openedAt` as appropriate
   - For bounces: update a status field and trigger a notification to the user ("Letter to Dr Chen bounced — check the email address")
3. Configure the webhook URL in Resend dashboard: `https://app.realhq.com/api/webhooks/resend`

---

## Notes

- **All three pages have working backends.** This is primarily frontend work — restyling existing components and wiring them to existing APIs. The agent should spend most of their time in components and page.tsx, not API routes.
- **EXCEPT the 4 gaps above.** These are backend fixes that affect the entire product, not just OPTIMISE pages. Fix them here because Rent Clock is the first page that needs working PDF download and email tracking.
- **Rent Clock is the most complex** — it has a multi-step wizard (Flow 1) with Claude-generated letters. Test the draft/send pipeline end-to-end, including the case where tenant email is missing.
- **Hold vs Sell needs live recalculation** — the scenario builder sliders should call calculateHoldScenario() client-side for instant feedback, then PATCH to save. Don't round-trip to the API on every slider move.
- **Income is the simplest** — it's essentially a list of opportunities with activate/dismiss actions. The backend is a static lookup (OPP_BY_TYPE) — no complex calculations.
- **Per DECISIONS.md — Voice:** "Direct. Specific. Confident." Don't say "you might want to consider selling" — say "Sell outperforms hold by $210k NPV. Retail headwinds + short WAULT + upcoming capex."
