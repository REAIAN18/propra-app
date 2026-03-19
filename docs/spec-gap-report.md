# Arca — Spec Gap Report
*Produced by CEO | 2026-03-18 | Against PRODUCT_BRIEF.md and demo*
*Live product: https://arcahq.ai*

---

## Summary

The MVP core is substantially built. 13 of 15 routes exist and are functional. The primary gaps are: a missing sign-up/conversion flow, a broken AI feature (missing API key), static demo data only (no live APIs), and several UX/polish gaps. The product is demo-ready but not yet customer-acquisition-ready.

**MVP Completeness: ~85%**

---

## Feature Status Table

### 4.1 Core Intelligence (MVP)

| Feature | Route | Status | Priority | Notes |
|---|---|---|---|---|
| G2N Benchmarking | `/dashboard` | ✅ Built | — | G2N ratio, benchmark delta, trend chart, opportunity buckets all present |
| Insurance placement | `/insurance` | ✅ Built | — | Overpay identified, Arca fee shown, retender flow mocked |
| Energy switching | `/energy` | ✅ Built | — | Overpay per asset, market benchmark, savings flow |
| Additional Income ID | `/income` | ✅ Built | — | 5G, EV, solar, parking opportunities listed per asset with status |
| Rent Clock | `/rent-clock` | 🟡 Partial | **P1** | ERV gap per asset ✓, countdown badges ✓, action buttons ✓ — **missing: 24-month portfolio timeline chart** |
| Hold vs Sell Analyser | `/hold-sell` | ✅ Built | — | Hold IRR vs Sell IRR, recommendation, rationale per asset |
| AI Acquisitions Scout | `/scout` | 🟡 Partial | **P2** | Screening/score view ✓ — **missing: full pipeline stages (LOI → DD → Exchange), Underwrite Tool** |
| Compliance tracker | `/compliance` | ✅ Built | — | Certificate expiry, fine exposure, status badges |
| Ask Arca AI | `/ask` | 🔴 Broken | **P1** | UI built, API route complete — **ANTHROPIC_API_KEY missing from Railway env vars → 500 in production** |
| Pricing | `/pricing` | ✅ Built | — | Pricing tiers, feature comparison, CTA to sign up |
| Audit | `/audit` | ✅ Built | — | Compliance audit summary, certificate status, risk exposure |
| Tenants | `/tenants` | ✅ Built | — | Tenant directory, lease terms, rent review schedule |
| Sign-up / onboarding | — | ❌ Missing | **P1** | No sign-up page, no user accounts, no auth. Visitors can only see demo data. This is the #1 conversion gap. |

---

## Priority 1 Gaps (Ship This Sprint)

### 1. Ask Arca broken in production
- **Issue:** `ANTHROPIC_API_KEY` not set in Railway environment
- **Fix:** Board adds env var to Railway dashboard (2 minutes) — see [PRO-54](/PRO/issues/PRO-54)
- **Impact:** Most differentiating feature shows error to every prospect who tries it

### 2. Zero-friction sign-up flow
- **Issue:** No `/signup` route, no user accounts, no way for a prospect to "start with my portfolio"
- **Fix:** PRO-8 (assigned to FSE) — sign-up page + demo portfolio seed + track sign-ups
- **Impact:** Without this, every prospect just sees demo data and has no path to onboarding
- **Required fields:** Name, email, company, ~portfolio size. No credit card. Show demo immediately after.
- **Spec note:** Goal is < 5 minutes from landing to first G2N insight

### 3. Rent Clock — 24-month timeline
- **Issue:** PRO-25 spec requires a 24-month portfolio-level lease event timeline (bar chart by month)
- **Fix:** Add timeline section to `/rent-clock/page.tsx` (the rest of the page is built)
- **Impact:** Missing the most visual/compelling part of the Rent Clock feature for demos

---

## Priority 2 Gaps (Next Sprint)

### 4. Scout — Pipeline Tracker
- **Issue:** Scout shows deals at screening/analysing/offer/passed but lacks the LOI → DD → Exchange workflow
- **Fix:** Add pipeline stage tabs and deal detail view with underwrite modeller (LTV, NOI, cap rate, IRR)
- **Impact:** Acquisitions-focused clients will find Scout thin

### 5. UX — Issue → Cost → Action pattern (all pages)
- **Issue:** Not every screen consistently follows the pattern. Some pages show data without clear action CTAs.
- **Fix:** PRO-26 (UX Designer) — audit every route and ensure each insight has a primary action button
- **Impact:** Conversion on demo calls — prospects need to see clear "Arca does this" buttons

### 6. User authentication
- **Issue:** No login/session management. Sign-up flow (PRO-8) will need this.
- **Fix:** Add NextAuth or similar. For MVP: email + magic link is sufficient.
- **Impact:** Required before any real customer can use the product with their own data

---

## Priority 3 Gaps (V1 — Weeks 3–6)

| Gap | Notes |
|---|---|
| Live data APIs (CoStar, LoopNet, EPCI, FEMA) | All data currently static in `/lib/data/`. V1 needs real market data. |
| Real insurance carrier placement | Currently mocked. Need carrier API or partner integration. |
| Energy supplier automation | Currently mocked. Need Octopus/EDF/British Gas API or manual flow. |
| Transaction Room | Not built. Needed for acquisitions advisory revenue stream. |
| Planning Intelligence | Not built. Tracks nearby planning apps, impact scoring. |
| Project Intelligence | Not built. Construction tracking, contractor tendering, materials. |
| Asset Financing & Refinancing | Not built. Loan modelling, refinancing analyser, lender tendering. |
| Work Orders & Operations | Not built. Maintenance/repair job management. |
| Opportunity Inbox | Not built. Inbound deal flow, off-market referrals. |

---

## Data Quality Issues

| Issue | Asset(s) | Suggested fix |
|---|---|---|
| All benchmarks are static estimates | All | Head of Real Estate (PRO-24) to validate and correct benchmark figures |
| Insurance overpay % may be optimistic for all asset types | FL Mixed | Differentiate by asset class — industrial vs office vs retail vs mixed |
| Energy figures should vary by kWh usage, not flat estimate | All | Add per-sqft energy intensity estimates |
| G2N benchmark (72%) is a single figure for all portfolios | All | Differentiate by market — FL industrial vs SE UK logistics G2N benchmarks differ significantly |

---

## UX Gaps (Flagged for UX Designer — PRO-26)

1. **Dashboard:** Opportunity buckets should have a "Start saving" CTA button in each card
2. **Insurance page:** No visual showing which carrier is proposed at what rate
3. **Energy page:** Missing comparison table (current tariff vs proposed tariff, side-by-side)
4. **Rent Clock:** Missing 24-month timeline. Action buttons on leases need a "Arca instructed ✓" confirmation state
5. **Scout:** Deal cards need an "Analyse" primary CTA that opens the underwrite tool
6. **Income page:** Probability bar on income opportunities looks good — add "Start negotiation" CTA
7. **Hold-Sell:** Recommendation badge and rationale are present but no "Instruct Arca to sell" CTA
8. **All pages:** Mobile (375px) — spot-check cards for text overflow and button tapability
9. **Sidebar:** Brand mark / logo area at top is minimal — add Arca wordmark properly

---

## Recommended Build Order (Top 10)

| # | Action | Owner | Impact |
|---|---|---|---|
| 1 | Add ANTHROPIC_API_KEY to Railway | Board | Fixes broken AI feature immediately |
| 2 | Build sign-up + onboarding flow | FSE (PRO-8) | Revenue gate — no path to onboarding without this |
| 3 | Add Rent Clock 24-month timeline | FSE (PRO-25) | Completes the Rent Clock feature |
| 4 | Full UX audit: Issue→Cost→Action on all pages | UX Designer (PRO-26) | Demo quality — this is what closes deals |
| 5 | Validate + correct all demo data | Head of RE (PRO-24) | Credibility with sophisticated CRE owners |
| 6 | Scout: add pipeline stages + underwrite modeller | FSE or Founding Eng | Acquisitions feature completeness |
| 7 | Authentication (NextAuth magic link) | FSE | Required for real customers |
| 8 | Dashboard: add "Top 3 actions" section | FSE | Board spec requirement |
| 9 | Insurance: carrier comparison table | FSE | Makes the savings story visual and concrete |
| 10 | Energy: side-by-side tariff comparison | FSE | Makes the savings story concrete |

---
*Next review: when PRO-24 (data validation) and PRO-26 (UX audit) complete.*
