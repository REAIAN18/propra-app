# RealHQ — Every Remaining Page (Complete Status)

> **PURPOSE:** Definitive list of every page, its design status, build status, and what's needed.
> Nothing is left out. Hand this to the next session.

---

## STATUS KEY
- ✅ DESIGN COMPLETE — ready for agent to build
- ⚠️ DESIGN THIN — needs v2 redesign before building
- 🔧 MINOR GAPS — buildable but needs fixes noted below
- 🏗️ BUILD STARTED — design exists, some code exists
- ❌ NOT DESIGNED — needs design from scratch

---

## PAGES WITH COMPLETE DESIGNS (ready to build)

### 1. Energy (/energy)
**Design:** `energy-design.html` (1,585 lines) ✅
**Ticket:** PRO-693
**Flows:** 8 — tariff review, solar PPA, demand analysis, LED/HVAC audit, rebate check, bill upload+extraction, supplier switch (deregulated), anomaly investigation
**Backend:** energy-quotes.ts, /api/user/energy-summary, /api/energy/quotes, EnergyQuote+EnergyRead+EnergyAnomaly+SolarAssessment models, 2 crons
**Status:** Ready to build. Agent has full spec.

### 2. Compliance (/compliance)
**Design:** `compliance-design.html` (894 lines) ✅
**Ticket:** PRO-694
**Flows:** 5 — renew certificate, upload+extraction, fine exposure detail, mark as renewed, reminder preferences
**Backend:** ComplianceCertificate model, 4 API routes, compliance-reminders cron, all working
**Status:** Ready to build. Backend 80% done.

### 3. Rent Clock (/rent-clock)
**Design:** `rent-clock-design.html` (670 lines) ✅
**Ticket:** PRO-695
**Flows:** 4 — rent review wizard (evidence→draft→send→track→outcome), notice generation, market evidence search, break clause detail
**Backend:** RentReviewEvent+RenewalCorrespondence models, 6 rent-review routes (list, create, draft via Claude, send via Resend, HoTs, complete), rent-review-triggers cron
**Status:** Ready to build. BUT has 4 critical infra gaps (see PRO-695): PDF generation broken, tenant email not guaranteed, email tracking not wired, renewal letter no PDF output.

### 4. Scout v2 / Acquisition Intelligence (/scout)
**Design:** `scout-v2-design.html` (629 lines) ✅
**Ticket:** PRO-696 (needs updating to reference v2)
**Sections:** Strategy definition bar, 6-source deal feed with returns strip, portfolio fit comparison, full underwriting (10-year DCF + sliders), deal finance (capital stack + indicative debt + lender panel), equity raise (3 structures + investor list + IM/teaser), express interest workflow
**Backend:** 7 scout routes, ScoutDeal+ScoutReaction+ScoutUnderwriting+ScoutLOI models, hold-sell-model.ts for DCF, brochure.ts for IM generation, scout-benchmarks.ts for market data
**New models needed:** AcquisitionStrategy, DealFinanceModel, InvestorContact, InvestorOutreach
**New templates needed:** type:"teaser" in brochure-template.ts
**Status:** Ready to build. Biggest new backend work is the 4 new models + teaser template.

### 5. Financials v2 (/assets/[id]?tab=financials)
**Design:** `financials-v2-design.html` (342 lines) ✅
**Ticket:** PRO-696
**Sections:** NOI waterfall, budget vs actual with variance bars, rent collection tracking (paid/late/overdue per tenant), 12-month cash flow forecast, capex planning linked to work orders, debt + refinance modelling
**Backend:** MonthlyFinancial model, NOI bridge route, monthly-financial routes, financing-summary, macro/sofr, NOIBridge+RefinanceWidget components (RESTYLE)
**New models needed:** FinancialBudget, CapexPlan
**Status:** Ready to build.

### 6. Documents (/documents)
**Design:** in `utility-pages-design.html` ✅
**Ticket:** PRO-696
**Sections:** Full document library, type filter tabs (All/Leases/Energy/Insurance/Compliance/Financial), extraction status per doc, upload zone with auto-categorisation
**Backend:** Document+DocumentExtract models, /api/user/documents, textract.ts, document-parser.ts, useUserDocuments hook, PolicyUploadWidget+LeaseUploadModal components (RESTYLE)
**Status:** Ready to build. Straightforward.

### 7. Ask RealHQ (/ask)
**Design:** in `utility-pages-design.html` ✅
**Ticket:** PRO-696
**Sections:** Chat interface, suggested questions from portfolio state, portfolio-aware responses, links to other pages from conversation
**Backend:** /api/ask (749 lines — full AI assistant), /api/user/ask-context (gathers portfolio), AskPanel component (245 lines — RESTYLE)
**Status:** Ready to build. Mostly RESTYLE of existing AskPanel.

### 8. Portal Viewer (/portal/[id])
**Design:** in `utility-pages-design.html` ✅
**Ticket:** PRO-696
**Sections:** Public page (no auth), NDA gate, document listing, view tracking, expiry
**Backend:** TransactionRoom+TransactionDocument+NDASignature models, nda-template.ts, transaction routes
**New backend needed:** Public route GET /api/portal/[id] (no auth), view logging, NDA verification
**Status:** Ready to build. Only genuinely new backend route in the whole product.

---

## PAGES WITH THIN DESIGNS (need v2 redesign before building)

### 9. Ancillary Income (/income) ⚠️
**Current design:** `income-design.html` (393 lines) — too thin
**Ticket:** PRO-695
**What exists:** Basic list of 3 opportunity types with static income numbers, activate/dismiss flows
**What's missing:**
- Calculation methodology — user can't see how $21k/yr solar was derived. Need: roof area × system size × generation × PPA rate = income. Show the maths like Scout v2 shows underwriting.
- Opportunity types too limited — only EV charging, solar, 5G mast. Need to add: parking revenue (paid parking, valet), naming/signage rights, vending machines, telecoms equipment rooms, advertising billboards, roof space rental (beyond solar), shared amenities, co-working conversion, storage rental, laundry facilities, ATM placement
- Custom opportunities — user should be able to add "I know I can get $15k/yr from a billboard here"
- Comparable evidence — "similar properties earn $X from this" (like Scout v2 has for deals)
- Activation detail — current is just status badge. Need: timeline, contacts engaged, quotes received, agreements drafted, installation scheduled, go-live date
- Post-live tracking — income performance vs estimate, monthly actuals, renewal dates
- Portfolio dashboard — total ancillary income by type across all assets, bar chart
- Learning loop depth — when user dismisses, show "you've dismissed 3 solar opportunities — we'll stop suggesting solar unless something changes"
**Existing code:** opportunity.ts (278 lines), /api/user/income-opportunities (OPP_BY_TYPE lookup), /api/user/income-opportunities/activate, IncomeActivation model, useIncomeOpportunities hook
**Action:** Redesign as income-v2-design.html with same depth as Scout v2

### 10. Transactions / Pipeline (/transactions) ⚠️
**Current design:** in `scout-transactions-design.html` — too thin
**Ticket:** PRO-696
**What exists:** Milestone progress bar, NDA status badge, document room list, basic per-transaction cards
**What's missing:**
- Stage checklists — what tasks are expected at each milestone? (NDA stage: draft NDA, send, track signature. DD stage: order title search, order environmental, instruct surveyor, review lease schedule, etc.)
- Party management — who's involved? Buyer/seller/solicitor/surveyor/lender/broker. Contact details, roles, assignments per task
- Cost tracking — legal fees, survey costs, stamp duty/transfer tax, agent commission, lender arrangement fee. Budget vs actual per line item
- Conveyancing checklist — searches ordered/received, enquiries raised/answered, title issues flagged, conditions precedent tracker
- Timeline view — expected vs actual dates per milestone, Gantt-style or swimlane
- Communication log — notes, emails, key decisions per stage. Who said what when.
- Document expectations — at each stage, show which documents are expected vs received (e.g. DD stage expects: title register ✓, environmental report ✓, survey ❌ awaiting, lease abstracts ✓)
- Financial summary per transaction — purchase price, costs, total outlay, funding source (links to Scout v2 deal finance)
- Counterparty portal — what the other side sees (links to Portal Viewer design)
**Existing code:** TransactionRoom+TransactionDocument+TransactionMilestone+NDASignature models, 6 transaction routes, nda-template.ts
**Action:** Redesign as transactions-v2-design.html

### 11. Work Orders (/work-orders) ⚠️
**Current design:** in `utility-pages-design.html` — too thin
**Ticket:** PRO-696
**What exists:** Pipeline stages, basic work order list with status/budget/dates
**What's missing:**
- Scope generation preview — the AI generates a scope of works via /api/user/work-orders/preview/scope. What does this look like? Show the actual generated scope document with sections, line items, specifications
- Tender comparison — side-by-side view of quotes from multiple contractors. Columns: contractor name, price, timeline, availability, past rating, notes. "Cheapest" vs "Best value" vs "Fastest" tags
- Contractor response page — what does the page at /api/tender/respond/[token] look like? This is a public page (no auth) where contractors submit their bid. Needs: job description, scope, location, deadline, bid form (price, timeline, method statement, availability)
- Milestone payment schedule — link payments to milestones. Release 30% on start, 30% at midpoint, 40% on completion. Track paid vs outstanding
- Photo evidence — before/after/during photos for work verification. Upload from site, tagged to milestone
- Contractor ratings — after completion, rate contractor (1-5 stars, would you use again, any issues). Feeds into future recommendations
- Budget tracking — per work order: estimated vs quoted vs actual. Variance. Change orders.
- Work order detail page — the full lifecycle view for a single order: scope → tenders → awarded → milestones → completion → final account
- Recurring maintenance — schedule repeating work orders (annual HVAC service, quarterly fire alarm test)
**Existing code:** WorkOrder+WorkOrderMilestone+WorkOrderCompletion+TenderQuote+Contractor models, 12 API routes (create, scope, tender, quotes, bids, award, start, milestone, complete, preview), sendContractorTenderInvite+sendWorkOrderComplete emails
**Action:** Redesign as work-orders-v2-design.html

---

## PAGES WITH MINOR GAPS (buildable, fix during build)

### 12. Hold vs Sell (/hold-sell) 🔧
**Design:** `hold-sell-design.html` (493 lines)
**Ticket:** PRO-695
**What's solid:** Per-asset DCF comparison, recommendation badges, scenario builder with sliders, sensitivity grid, report generation
**Minor gaps to fix during build:**
- Sell decision should link to creating a disposal TransactionRoom → "List this property" button
- Tax implications — add a section showing: US 1031 exchange eligibility (defer capital gains by reinvesting), UK CGT calculation (gain × rate, annual exemption, taper relief). This is informational, not advice — "consult your tax advisor" caveat
- Data source transparency — which inputs are from AVM (auto), from leases (extracted), or from user assumptions (manual). Use EST/verified badges
- Market timing indicator — "is now a good time to sell?" based on cap rate trends, rate environment, days on market in your submarket
- Portfolio ranking — "if you could only sell one asset, which?" Rank all assets by sell-advantage (sell NPV − hold NPV)

### 13. Planning (/assets/[id]?tab=planning) 🔧
**Design:** in `property-level-design.html`
**Ticket:** PRO-696
**What's solid:** Application feed with AI impact badges (positive/negative/neutral), dev potential assessment with value uplift
**Minor gaps to fix during build:**
- AI classification explanation — when user clicks an application, show WHY RealHQ classified it as positive/negative. The reasoning from planning-classifier.ts (Claude) should be displayed: "Classified as NEGATIVE because: competing use (office), within 0.2 miles, 120 units adds supply to your submarket"
- Map view — applications shown on a map relative to the user's property. Distance circles. This is a nice-to-have but makes the data much more tangible
- Dev potential report — dev-potential.ts generates an assessment but the UI just shows a summary card. Add a "Full report" click-through showing: planning policy analysis, comparable developments, cost estimate, timeline, risk factors
- Objection letters — for negative applications, offer "Draft objection letter" (same Claude draft pattern as rent review letters)

### 14. Financing portfolio page (/financing) 🔧
**Design:** in `utility-pages-design.html`
**Ticket:** PRO-696
**What's solid:** Portfolio debt overview, per-property debt rows, rate environment (live SOFR), refinance opportunities
**Minor gaps to fix during build:**
- Loan covenant monitoring — LTV and DSCR per property. Alert when approaching covenant breach. "Coral Gables LTV is 62% — 3% from your 65% covenant"
- Maturity calendar — when does each loan expire? Timeline view. "Tampa matures Sep 2027 — 18 months. Start refinance conversations now."
- Rate change alerts — when SOFR moves, show impact on your debt service. "SOFR up 25bps → your annual debt service increases $24k across portfolio"
- Lender relationship tracker — which lenders you've used, their terms, contact details, last interaction. Not a CRM — just enough to know who to call for the next deal
- Note: Deal-level finance is now in Scout v2 (capital stack, indicative terms, lender panel). This page is PORTFOLIO-level only.

### 15. Tenants (/assets/[id]?tab=tenants) 🔧
**Design:** in `property-level-design.html`
**Ticket:** PRO-696
**What's solid:** Tenant schedule with covenant scores, engagement tracker, letting pipeline, lease upload
**Minor gaps to fix during build:**
- Tenant detail page — clicking a tenant row should show: full lease terms, payment history (graph), all correspondence, engagement timeline, covenant check detail (UK: Companies House data, US: credit check)
- Payment history graph — 12-month bar chart of payments (paid on time, late, missed). Visual pattern of reliability
- Arrears management — if a tenant is in arrears, what actions? Send reminder, formal demand letter, instruct solicitor. Escalation path
- Lease abstract — extracted lease terms in structured format (rent, reviews, breaks, alienation, repair obligations, service charge cap). From document-parser.ts extraction

---

## INFRASTRUCTURE GAPS (affect all pages)

These were identified in PRO-695 and need fixing before any page with PDF/email features is complete:

1. **PDF generation broken** — `@sparticuz/chromium` + `puppeteer-core` not in package.json. Every "Download PDF" button silently fails. Fix: install deps or switch to lighter library.

2. **Renewal letter has no PDF output** — /rent-reviews/[id]/send is email only. Need: POST /api/user/rent-reviews/[id]/pdf route.

3. **Tenant email not guaranteed** — Tenant.email is optional. Send flow needs: pre-fill if known, prompt if missing, save back, offer PDF/print alternative.

4. **Email open/bounce tracking not wired** — RenewalCorrespondence has deliveredAt/openedAt fields but nothing writes to them. Resend webhook handler is frozen. Need: store Resend message ID at send time, rewrite webhook to process events, notify on bounces.

5. **Resend message ID not stored** — send route doesn't capture the Resend response ID. Needed for webhook matching.

---

## NEW MODELS NEEDED (across all pages)

| Model | Purpose | Which page |
|-------|---------|-----------|
| AcquisitionStrategy | User's target deal criteria | Scout v2 |
| DealFinanceModel | Per-deal capital stack + debt terms | Scout v2 |
| InvestorContact | Potential co-investors/JV partners | Scout v2 |
| InvestorOutreach | IM/teaser sent to investors + open tracking | Scout v2 |
| FinancialBudget | Annual budget per asset for variance | Financials v2 |
| CapexPlan | Scheduled capital works + value impact | Financials v2 |

## NEW TEMPLATES NEEDED

| Template | Purpose | Extends |
|----------|---------|---------|
| type:"teaser" | 2-page investment teaser | brochure-template.ts |
| type:"management_accounts" | Monthly management accounts | brochure-template.ts |
| type:"lender_pack" | Lender pack (compliance+financial+lease) | brochure-template.ts |
| renderLetterPDF() | Renewal letter as PDF download | New function, uses brochure pipeline |

---

## BUILD ORDER RECOMMENDATION

**Phase 1 — Fix infrastructure (enables everything else):**
- Install PDF dependencies (or switch library)
- Wire Resend webhook handler
- Add tenant email capture flow
- Create letter PDF route

**Phase 2 — Build complete designs (no redesign needed):**
1. Energy (PRO-693) — largest, most complex
2. Compliance (PRO-694) — backend mostly done
3. Rent Clock (PRO-695) — depends on Phase 1 fixes
4. Documents — simple, high-value (unlocks extraction everywhere)
5. Ask RealHQ — mostly RESTYLE of AskPanel
6. Portal Viewer — only new public route

**Phase 3 — Build designs with minor gaps (fix during build):**
7. Hold vs Sell + Financials v2 — can build together, share DCF logic
8. Tenants + Planning — property-level tabs, build together
9. Financing portfolio — extends existing RefinanceWidget

**Phase 4 — Redesign then build (need v2 designs first):**
10. Income v2 — redesign, then build
11. Transactions v2 — redesign, then build
12. Work Orders v2 — redesign, then build
13. Scout v2 — largest, build after Transactions (pipeline feeds into it)

**Phase 5 — New features from Scout v2:**
14. Deal finance + capital stack
15. Equity raise + investor management
16. IM + teaser generation
