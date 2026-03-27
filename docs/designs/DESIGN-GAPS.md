# Design Gap Analysis — What Needs Rework

> Created: 2026-03-27
> Purpose: Captures all design gaps identified during this session.
> Next session: Use this to guide redesigns of thin pages.

---

## COMPLETED REDESIGNS (this session)

### Scout v2 → `scout-v2-design.html` (replaces Scout section of scout-transactions-design.html)
- Strategy definition bar
- 6 data sources (not just LoopNet)
- Returns strip on every deal (IRR, CoC, equity multiple, equity needed)
- Portfolio fit comparison
- Full underwriting with 10-year DCF + adjustable sliders
- Deal finance: capital stack, indicative debt terms, lender panel
- Equity raise: 3 structures (own/JV/LP-GP), investor list, IM/teaser generation
- Express interest workflow
- NEW MODELS: AcquisitionStrategy, DealFinanceModel, InvestorContact, InvestorOutreach

### Financials v2 → `financials-v2-design.html` (replaces Financials tab in property-level-design.html)
- Budget vs actual with variance bars
- Rent collection tracking (paid/late/overdue per tenant)
- 12-month cash flow forecast (revenue, opex, NOI, debt, capex, net cash)
- Capex planning linked to work orders
- Richer financing section with refinance modelling
- NEW MODELS: FinancialBudget, CapexPlan

---

## PAGES THAT ARE SOLID (no rework needed)

1. **Energy** — 1,585 lines, 8 flows, market logic, comprehensive
2. **Compliance** — 894 lines, 5 flows, fine exposure, all APIs mapped
3. **Rent Clock** — 670 lines, 4 flows, full review wizard
4. **Documents** — straightforward library, extraction pipeline
5. **Ask RealHQ** — chat interface, portfolio-aware, suggestions
6. **Portal Viewer** — NDA gate, clean public page

---

## PAGES THAT STILL NEED DEPTH (next session)

### Income (income-design.html) — needs rework
**Current state:** Basic list of opportunities with static income numbers.
**Gaps:**
- How are opportunity amounts calculated? Show the methodology
- What data sources prove the opportunity? Comparable evidence (like Scout v2 has)
- Opportunity types too limited — just EV, solar, 5G. Missing: parking revenue, naming rights, vending, telecoms, advertising, roof space rental, shared amenities, co-working conversion
- Can users add custom opportunities? (e.g. "I know I can get a billboard deal here")
- What does activation tracking look like in detail? Status progression with dates, contacts, quotes received
- What happens after "live"? Income tracking, performance vs estimate, renewal
- Learning loop needs depth — dismiss reasons should visibly affect future scoring
- Portfolio-level income dashboard (total across all assets, by type)

### Hold vs Sell (hold-sell-design.html) — minor gaps
**Current state:** Good DCF comparison but missing connections.
**Gaps:**
- Sell decision → should link to creating a disposal transaction room
- Tax implications — 1031 exchange modelling for US, CGT for UK
- What data feeds automatically vs manually? Make it clear
- Market timing indicator — is now a good time to sell based on rates + market?
- Comparison across portfolio — "if you could only sell one, which should it be?"

### Transactions (in scout-transactions-design.html) — needs depth
**Current state:** Basic milestone tracker + document room.
**Gaps:**
- What happens at each stage? Checklist of tasks per milestone
- Expected documents per stage (NDA stage: NDA. DD stage: title, searches, survey, enviro)
- Party management — who are the parties? Buyer, seller, solicitor, surveyor, lender
- Cost tracking — legal fees, survey costs, stamp duty, agent fees
- Conveyancing checklist — searches ordered, replies received, enquiries raised/answered
- Timeline view — expected vs actual dates per milestone
- Communication log — emails/notes per stage

### Work Orders (in utility-pages-design.html) — needs depth
**Current state:** Pipeline view + basic list.
**Gaps:**
- Scope generation preview — what does the AI-generated scope actually look like?
- Tender comparison view — side-by-side quotes from multiple contractors (price, timeline, reviews)
- How do contractors respond? What does the tender response page look like? (existing route: /api/tender/respond/[token])
- Milestone payment schedule — link payments to milestones, release on completion
- Photo evidence — before/after photos for completion verification
- Contractor ratings — after completion, rate the contractor (feeds future recommendations)
- Budget tracking — actual vs estimated per work order

### Planning (in property-level-design.html) — minor gaps
**Current state:** Application feed with impact badges + dev potential.
**Gaps:**
- AI classification explanation — why did RealHQ classify this as positive/negative?
- Object to negative applications — can RealHQ draft an objection letter?
- Map view — show applications geographically (not just a list)
- Dev potential report — what does the full report look like? (dev-potential.ts generates it but no UI shows it)
- Pre-application advice — for user's own development plans

### Financing (in utility-pages-design.html) — mostly replaced by Scout v2 deal finance
**Current state:** Portfolio debt overview. Now partially covered by Scout v2 capital stack.
**Gaps:**
- The portfolio-level financing page still needs: loan covenant monitoring (LTV and DSCR alerts), rate change alerts (SOFR moves → your debt service changes), maturity calendar (when do loans expire?), portfolio-level refinance opportunities
- Lender relationship management — which lenders you've used, their terms, contact details
- These are PORTFOLIO-level features. Scout v2 handles DEAL-level finance.

---

## NEW MODELS NEEDED (across all redesigns)

| Model | Purpose | Design file |
|-------|---------|-------------|
| AcquisitionStrategy | User's target criteria for deal scoring | scout-v2-design.html |
| DealFinanceModel | Per-deal capital stack + debt terms | scout-v2-design.html |
| InvestorContact | Potential co-investors/JV partners | scout-v2-design.html |
| InvestorOutreach | IM/teaser sent to investors, with open tracking | scout-v2-design.html |
| FinancialBudget | Annual budget per asset for variance tracking | financials-v2-design.html |
| CapexPlan | Scheduled capital works with value impact | financials-v2-design.html |

## NEW TEMPLATES NEEDED

| Template | Purpose | Extends |
|----------|---------|---------|
| type:"teaser" in brochure-template.ts | 2-page investment teaser | brochure-template.ts |
| type:"management_accounts" | Monthly/quarterly management accounts | brochure-template.ts |
| type:"lender_pack" | Lender pack (compliance + financial + lease) | brochure-template.ts |
| renderLetterPDF() | Renewal letter as downloadable PDF | NEW (extends brochure pipeline) |

---

## CRITICAL INFRASTRUCTURE GAPS (from PRO-695)

These affect multiple pages and need fixing before any page is truly complete:

1. **PDF generation broken** — `@sparticuz/chromium` + `puppeteer-core` not in package.json
2. **Renewal letter has no PDF output** — send route is email-only
3. **Tenant email not guaranteed** — Tenant.email is optional, no capture flow
4. **Email open/bounce tracking not wired** — webhook handler frozen
5. **Resend message ID not stored** — can't match webhook events to correspondence

---

## DESIGN FILE INVENTORY (current state)

### Approved (original 11)
landing-design.html, dashboard-design.html, onboarding-design.html, upload-schedule-design.html, search-company-design.html, document-progress-design.html, property-detail-design.html, signup-design.html, signin-design.html, insurance-design.html, insurance-flows-design.html

### Built this session (10 new + 2 redesigns)
energy-design.html, compliance-design.html, rent-clock-design.html, income-design.html, hold-sell-design.html, scout-transactions-design.html (Transactions page — keep), property-level-design.html (Tenants + Planning tabs — keep), utility-pages-design.html (Documents + Ask + Work Orders + Financing + Portal), scout-v2-design.html (REPLACES Scout section), financials-v2-design.html (REPLACES Financials tab)

### Still need redesign (next session)
income-design.html → Income v2
Transactions section of scout-transactions-design.html → Transactions v2
Work Orders section of utility-pages-design.html → Work Orders v2
