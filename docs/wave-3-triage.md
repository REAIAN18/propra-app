# Wave 3 — Feature Triage
**Author:** Head of Product
**Date:** 2026-03-23
**Purpose:** Documents everything in the product spec that has been consciously deferred to Wave 3. These are real, valuable features — they are not dropped, just sequenced.

**What Wave 3 is NOT:** a backlog dump. Every item below has been reviewed and has a reason for being Wave 3 rather than Wave 2.

---

## Why these are Wave 3, not Wave 2

The rule used to classify a feature as Wave 3:

1. **Requires Wave 2 data to be valuable.** Features that aggregate or act on Wave 2 outputs (e.g. Transaction Room needs a fully underwritten acquisition from Scout; Project Intelligence needs Work Orders history).
2. **New user persona.** Features serving tenants (Tenant Portal) or conveyancers (SearchFlow) require a separate product surface — they shouldn't delay the core owner-operator product.
3. **High integration complexity, low revenue leverage.** HMLR form generation, BCIS, Section 25 notices — valuable but technically heavy and serving edge cases for the median Wave 2 user.
4. **Commission model unclear.** Features where the revenue pathway is still being validated (CAM Recovery, refinance DIP).

---

## Wave 3 Feature List

### T3-1: Transaction Room
**What:** A deal room for buy/sell transactions — document vault, milestone tracking (offer → exchange → completion), NDA workflow, offer management (track multiple offers, counter-offer, best & final), communication log.

**Why Wave 3:** Requires completed Scout acquisition pipeline (Wave 2). Without Wave 2 Scout underwriting and LOI, there is no deal to manage in a transaction room. Build the deal origination first, then the deal execution layer.

**Estimated scope:** ~3 weeks (FE + FSE), DocuSign NDA flow, S3 document vault, milestone state machine.

---

### T3-2: Project Intelligence
**What:** Full construction project management — CapEx planning, budget vs actual P&L, contractor benchmarking via BCIS, programme tracking (Gantt), defects tracker with photo upload, EPC improvement pathway per asset.

**Why Wave 3:** Requires Work Orders history (Wave 2) to be meaningful. A Gantt chart with no prior work order data is empty. Additionally: BCIS API access requires enterprise subscription (~£3k/yr) — needs CEO budget approval.

**Estimated scope:** ~4 weeks (FE + FSE), BCIS integration, Gantt component, photo upload to S3.

---

### T3-3: Tenant Portal
**What:** Tenant-facing application at a separate subdomain (portal.realhq.co). Rent payment via GoCardless/Stripe, maintenance request creation → work order automation, document access (lease, statements), digital lease signing (DocuSign), rent account statement.

**Why Wave 3:** Separate product. Requires Tenant Intelligence Wave 2 (real `Tenant`/`Lease` records) to be live first. Also requires owner sign-off on which tenants get portal access. Cannot be built before owner-side tenant data is real (Wave 2 Sprint 2).

**Estimated scope:** ~4 weeks (separate Next.js app or /portal subdomain), Stripe/GoCardless integration, magic-link auth for tenants.

**Revenue path:** GoCardless fee 1.15% + £0.20/transaction on rent payments. Secondary: reduces owner admin time (positioning value, not direct commission).

---

### T3-4: Legal Document Automation
**What:** Auto-drafting of formal legal documents from template: Section 25 notice (landlord's offer to renew), Section 26 response (landlord's counter to tenant's request), Licence to Assign, Licence to Underlet, Deed of Variation.

**Why Wave 3:** Requires Tenant Intelligence + Rent Review (Wave 2) data to be meaningful. The AI drafting is low-difficulty but the review/sign workflow needs a proper document state machine (review → solicitor review → sign → execute). Rushing this without the Wave 2 foundation produces legally questionable output.

**Note:** Rent review renewal letters (Claude-generated, non-statutory) ARE in Wave 2. Section 25 notices (statutory form, require specific legal content) are Wave 3.

---

### T3-5: Conveyancing Integration (SearchFlow/InfoTrack/HMLR)
**What:** Automated property search ordering — Local Authority, Water, Environmental, Land Registry Title, Chancel, Mining. Also: HMLR AP1/TR1 form generation, digital submission via HMLR portal.

**Why Wave 3:** Primarily needed for acquisition completions (after Transaction Room is built). High integration complexity for a niche workflow. Only relevant for users who have progressed from Scout LOI → Transaction Room → exchange — a very small subset of Wave 2 users.

**Estimated scope:** ~2 weeks, SearchFlow/InfoTrack API, £40–£80/search pass-through cost (board decision needed on margin model).

---

### T3-6: CAM Recovery Detection
**What:** Automatically identifies service charge items billed to tenants but not recoverable under the lease; items under-recovered against cap; generates reconciliation statement. Alerts owner when CAM exposure > £X.

**Why Wave 3:** Requires full `Lease` data with service charge schedules (Wave 2 Tenant Intelligence materialises basic lease terms, not full CAM schedules). CAM schedules are complex lease documents requiring separate extraction logic. Also: primarily relevant for multi-let assets with shared areas — niche within the Wave 2 user set.

---

### T3-7: Refinance DIP (Full Automation)
**What:** Automated Decision in Principle request to lender panel — structured application from existing property data, pre-vetted lender submission, DIP response tracking, full mortgage facilitation through to digital completion.

**Why Wave 3:** The `/refinance` page and SOFR/SONIA rate display already exist (Wave 1). The gap is the lender panel API integrations (each lender has different API specs). Needs CEO/board approval on broker credentials and FCA regulatory position before automating DIP submissions. This is a regulated activity.

**Commission:** ~0.5–1% of loan value (procuration fee). Significant revenue but requires FCA authorisation review.

---

### T3-8: Planning Application Submission
**What:** Full submission of planning applications via Planning Portal API — not just monitoring incoming applications, but submitting applications for change of use, permitted development, advertisement consent on behalf of owners.

**Why Wave 3:** Planning monitoring (Wave 2) is read-only and free. Submission requires: planning consultant review, certificate of lawfulness assessment, fee payment (£206–£462 per application), LPA-specific requirements. Cannot be automated without human review step for each application — which violates the Wave 2 "no human in loop" rule until AI confidence is validated on real applications.

**Path to Wave 3:** Run Wave 2 planning monitoring for 6 months, build training data on AI classification accuracy, then move to submission automation with confidence threshold gate.

---

### T3-9: 5G/Solar Revenue Share Agreements
**What:** Auto-generation of revenue share agreements for 5G mast installation (CTIL/EE/Vodafone APIs) and rooftop solar installation (Google Solar → installer quote → revenue share contract). Application auto-submitted to telecoms provider or solar installer.

**Why Wave 3:** Solar opportunity card and ROI assessment ARE in Wave 2 (Energy handoff). The gap is the contract generation and submission automation. Wave 2 ends at "Request quotes CTA" — Wave 3 is the automatic submission and contract execution. Google Solar API needed first (Sprint 2 env var).

---

### T3-10: Contractor Panel Management (Full Automation)
**What:** Automated Companies House verification for contractors, employer's liability insurance verification via API, RAMS template library, self-serve contractor application portal, automated vetting status updates.

**Why Wave 3:** Wave 2 Work Orders uses a curated seeded contractor panel (15–20 contractors, manually verified). Full automated panel onboarding is a Wave 3 feature — it's operational infrastructure that doesn't directly earn revenue. Wave 2 seeded panel is sufficient for first 50 work orders.

---

### T3-11: Revenue vs NOI 12-Month Chart (Dashboard)
**What:** A 12-month bar/line combo chart on the dashboard showing Gross Revenue vs Net Operating Income side by side, month by month. Per Spec v3.2 Section 5.3 item 6 — part of the "Three-column analytics row." The occupancy donut in the same row is **Wave 2** (see `docs/wave-2-dashboard-properties-grid-handoff.md` — FE-only, all data available from tenant materialisation).

**Why Wave 3:** Requires 12 months of historical financial data that doesn't exist yet. RealHQ is pre-revenue for most users at Wave 2 launch — there is no `RevenueRecord` or monthly ledger table in the Wave 2 schema. Building a chart with no real data would violate Spec Rule 3 (no illustrative/hardcoded figures). Wave 3 path: add a `MonthlyFinancial` model tracking gross revenue, opex, NOI per asset per month; backfill from document extraction; render chart once ≥3 months of real data exist for a user.

**Current state:** Dashboard has Geographic Spread, Asset Class Mix, and Top Assets by NOI Yield charts — all built from real static property data. The NOI yield chart partially substitutes for the revenue trend, but does not show time-series data.

**Estimated scope:** ~1 week (schema + backfill migration + chart component). Unblocked once first users have 3+ months of transaction history.

---

### T3-12: Carbon Reporting Panel (Energy Screen)
**What:** Per-property carbon reporting showing kgCO2e/sqft vs asset class benchmark, annual total CO2 emissions from energy consumption, and a CRREM (Carbon Risk Real Estate Monitor) pathway comparison showing whether the property is on track for net zero carbon targets. Per Spec v3.2 Section 8 energy acceptance criteria.

**Why Wave 3:** Two blockers:

1. **CRREM pathway data:** CRREM provides annual carbon intensity benchmarks by property type and geography for alignment with 1.5°C/2°C pathways. This requires CRREM data licence or manual reference tables, plus a methodology decision on Scope 1/2/3 boundary. The Wave 2 energy handoff focuses on cost saving (kWh × rate × anomaly); carbon accounting adds a separate calculation layer.

2. **Data quality requirement:** Accurate kgCO2e calculation requires complete energy data (kWh for electricity AND gas AND any district heating). Most Wave 2 users will only have one utility bill type at launch. A partial carbon figure with missing fuel types could mislead (e.g., showing only electricity emissions as total emissions). CRREM pathway comparison would be meaningless with incomplete data.

**Wave 2 partial implementation:** The energy handoff already detects kWh anomalies. A simple kgCO2e/sqft estimate can be added to the energy screen using UK Grid Intensity (`~0.207 kgCO2e/kWh` for electricity, `~0.183 kgCO2e/kWh` for gas from DEFRA conversion factors) once sufficient bill data exists. This is a 1-hour addition to the energy handoff — but it should NOT be labelled "CRREM-aligned" until proper CRREM data is integrated.

**Wave 3 path:** Add `carbonIntensityKgCO2eSqft` to `EnergyAnomaly` or new `CarbonReport` model; integrate CRREM benchmark tables; render CRREM pathway chart (actual vs pathway by year to 2050).

---

### T3-13: Monthly Cashflow P&L Panel (Dashboard)
**What:** Right-column dashboard card showing current month cashflow vs budget. Line items: Base rental income (+), CAM recoveries (+), Parking & misc (+), Maintenance & repairs (-), Management fees (-), Insurance (-), net NOI at bottom. Green for income lines, red for cost lines. Per Spec v3.2 Section 5.1 design pattern 3.

**Why Wave 3:** Requires complete line-item financial tracking including:
- **CAM recoveries:** Wave 3 — CAM recovery engine not yet built
- **Parking & misc income:** not tracked in any existing model
- **Management fees:** not tracked
- Budget comparison requires a `BudgetLine` or `MonthlyBudget` model (doesn't exist)

Wave 2 has partial data (maintenance costs from Work Orders, insurance from Wave 1) but a P&L panel with missing lines would mislead — NOI would be artificially high or low. Better to defer until the data set is complete.

**Wave 2 partial coverage:** The NOI Bridge widget (`/api/user/noi-bridge`) already shows some P&L breakdown. That partially substitutes.

**Wave 3 path:** Add `MonthlyFinancial` model (see T3-11), `MonthlyBudget` model, CAM recovery tracking; wire all sources into the P&L panel.

**Estimated scope:** ~2 weeks (CAM + budget schema + P&L component). Depends on T3-11 `MonthlyFinancial` model.

---

### T3-14: Portfolio Health Score Panel (Dashboard)
**What:** Right-column dashboard panel with 5 colour-coded horizontal progress bars: Rent collection %, Maintenance SLA %, Tenant satisfaction %, CAM accuracy %, Insurance compliance %. Each bar green/amber/red. Failing bars are CTAs — click to navigate to the relevant screen. Per Spec v3.2 Section 5.1 design pattern 2.

**Why Wave 3:** Four of the five bars need data that doesn't exist until Wave 3:

| Bar | Data required | Available |
|-----|---------------|-----------|
| Rent collection % | Payment history per tenant | Wave 3 — GoCardless direct debit data |
| Maintenance SLA % | Work order raised-to-closed time vs target | **Wave 2 ✓** — Work Order milestones exist |
| Tenant satisfaction % | Portal feedback / survey responses | Wave 3 — Tenant Portal (T3-3) |
| CAM accuracy % | Expected vs recovered CAM charges | Wave 3 — CAM Recovery engine |
| Insurance compliance % | Policy upload + EPC status | **Wave 1 ✓** |

Building a panel with 3 of 5 bars as "N/A" or "Data unavailable" is worse UX than deferring. The panel should launch with all 5 bars populated.

**Wave 2 substitution:** Maintenance SLA % and Insurance compliance % are available and can be surfaced as individual KPI tiles rather than a health panel.

**Wave 3 path:** Add rent payment model (GoCardless webhook → ledger), tenant satisfaction (portal rating), CAM accuracy tracking; then render the 5-bar health panel.

**Estimated scope:** ~1 week FE + depends on T3-3 and CAM engine completion.

---

### T3-15: Lettings / Tenant Find Workflow

**What:** End-to-end workflow for filling vacant units with new tenants: vacancy flag on dashboard when a lease expires or is surrendered, property marketing (Rightmove Commercial/CoStar listing export or internal brochure), applicant tracking, reference checking via Companies House + D&B Hoovers, new-letting Heads of Terms generation via Claude, commission trigger (10% of first year's rent) on HoT signing. Per RealHQ-BuildOrder-CEO-v1.html and Addendum v3.1.

**Why Wave 3:** Wave 2 tenant intelligence manages EXISTING tenants (health scores, covenant grades, renewal letters). Finding NEW tenants for vacant units requires:
1. **Property marketing integration** — Rightmove Commercial, CoStar, or internal brochure export
2. **Applicant management** — tracking applicants, D&B Hoovers or Companies House verification for new tenants
3. **New-letting HoT generation** — distinct from renewal HoT (PRO-574 handles renewals only; new-letting terms differ: incentive packages, new SDLT exposure, different negotiation dynamics)
4. **Commission workflow** — 10% trigger on new HoT agreed (not on existing rent increased)

**Wave 2 substitution:** Rent review automation (PRO-574) handles the renewal case for existing tenants. Vacancy tracking is visible from Rent Clock + tenant health data showing expired/expiring leases.

**Commission:** 10% of first year's contracted rent. Joint agent split: net 2.5–5% where agent introduces. Per `docs/wave-2-commission-model.md` Wave 3 section.

**Estimated scope:** ~3 weeks (lettings workflow + new HoT template + commission trigger). Depends on property marketing integration decisions.

---

### T3-16: Ask RealHQ AI (Conversational Portfolio Assistant)

**What:** Conversational AI interface embedded in the dashboard sidebar (prototype label "Ask RealHQ AI" in the Platform section). Owner types a natural-language question about their portfolio ("What's my best-performing asset?", "Which leases expire in the next 6 months?", "How much could I save on energy across all assets?") and receives an AI-generated answer with links to relevant screens. Per RealHQ-BuildOrder-CEO-v1.html — listed as "Wave 4" conversational layer.

**Why Wave 3 (not Wave 2):** The conversational assistant is only useful once Wave 2 data is live. Asking "What's my NOI yield?" requires AVM + rent data. Asking about planning requires live planning feed. The assistant quality is proportional to the data richness behind it. Launching a conversational AI on Wave 1 data only would produce shallow, underwhelming answers that damage trust.

**Technical requirements:**
- Claude API prompt construction with full portfolio context (assets, tenants, leases, work orders, action queue)
- Context size management — large portfolios can exceed Claude's effective context window; requires smart summarisation
- Route: `POST /api/user/ask` — accepts `{ question: string }`, returns `{ answer: string, sources: ContextLink[] }`
- Streaming response (server-sent events) for natural feel
- Auth: user-scoped — no cross-user data leakage

**Wave 2 partial substitution:** Action Queue provides a ranked list of "what to do next" without requiring a question. This covers the core "what should I focus on?" use case for Wave 2.

**Wave 3 path:** After Wave 2 data layer is live, build `POST /api/user/ask` with full portfolio context injection. Add chat UI component to dashboard sidebar.

**Commission:** None directly. Retention and engagement driver — reduces churn, not a direct revenue line.

**Estimated scope:** ~1 week (API route + streaming + chat component). Depends on Wave 2 data being live.

---

### T3-17: Tax & Compliance Certificate Tracking

**What:** Dashboard sidebar section ("Operations" in prototype) tracking compliance certificate status per asset: EPC, Fire Safety Risk Assessment, Gas Safe certificate, Electrical Installation Condition Report (EICR), Asbestos Management Survey, Legionella Risk Assessment. Each certificate shows current status (valid / expiring / expired / missing), expiry date, and a CTA to upload a renewal or raise a Work Order.

**Why Wave 3:** Wave 1 already tracks `complianceItems[]` on `UserAsset` as a JSON array from document extraction. This covers the basic compliance badge in Wave 2 (urgent compliance count shown in action queue and per-asset cards). A dedicated compliance certificate tracking screen with per-certificate detail requires:

1. **Structured certificate model** — `ComplianceCertificate` table with `type`, `expiryDate`, `documentId`, `status` fields. Currently compliance data lives in a JSON blob.
2. **Document-to-certificate mapping** — When a user uploads an EPC or gas certificate, the extraction pipeline must classify it as the correct certificate type and create/update the structured record. The extraction pipeline (Wave 2 documents route) extracts text but does not yet write structured compliance records.
3. **Renewal reminders** — Cron to alert owners 90/30 days before expiry (similar to tenant engagement cron). Adds another cron endpoint.
4. **Work Order integration** — "Raise a Work Order" CTA pre-fills the brief with certificate type, asset, and regulatory requirement.

The Wave 2 `complianceItems[]` JSON blob is sufficient for the urgency badge use case. A full structured certificate tracker with document upload and renewal cron is Wave 3 scope.

**Wave 2 substitution:** Compliance urgency badge in action queue + per-asset card badge shows count of overdue/due-soon compliance items. This surfaces the urgency without requiring the full structured model.

**Wave 3 path:** Add `ComplianceCertificate` model to schema. Update document extraction to classify and write compliance records. Add compliance cron. Build compliance tracker page at `/compliance` (already linked from action queue items). Add sidebar section with per-certificate status.

**Commission:** None directly. Reduces liability exposure for clients — positioning value.

**Estimated scope:** ~2 weeks (schema + extraction update + cron + UI). Depends on document extraction classification update.

---

### T3-18: Marketing Brochure Generator
**What:** 60-second branded PDF generation for a property or acquisition. One click assembles: satellite image + boundary, asset summary (type, sqft, location, EPC), financial summary (passing rent, NOI, yield), key lease details, AI-drafted investment narrative, comparables summary. Output: A4 PDF in RealHQ brand, downloadable and shareable.

**Why it was missed:** Listed as Wave 2 in `RealHQ-BuildOrder-CEO-v1.html` ("Marketing Brochure Generator (60-second PDF generation)") but was not included in any Wave 2 engineering handoff. Gap identified during Wave 3 spec review.

**Why it belongs in Wave 3 now:** All data inputs are available from Wave 2 (AVM, lease data, property details, satellite images). The feature is low-dependency and high demo value. It complements the Transaction Room (T3-1) — a brochure is the first document shared when a deal is initiated.

**Tech approach:**
- `POST /api/user/assets/:id/brochure` — Claude drafts the investment narrative, assembles data, returns HTML/PDF
- PDF generation: `@react-pdf/renderer` or `puppeteer` headless Chrome (puppeteer preferred — WYSIWYG from HTML template)
- Data sources: `GET /api/portfolios/user` (asset financials) + satellite URL + AVM data
- Template: A4, RealHQ brand, two-page maximum

**Commission:** None direct. Deal facilitation tool — reduces time to LOI for Scout acquisitions. Positions RealHQ as the professional layer between owner and market.

**Estimated scope:** ~1 week (Claude narrative + PDF template + route + FE button). Low risk — all data inputs already available.

---

## What this means for Wave 2 scope

Wave 2 is not made smaller by this triage — it's made cleaner. The 9 Wave 2 feature areas (Energy, Work Orders, Scout, Tenant Intelligence, Rent Review, AVM, Hold vs Sell, Planning Intelligence, Action Queue) are the right scope. Everything above can wait without reducing Wave 2 revenue potential.

Wave 2 commission-earning features at launch:
- Insurance: 15% year-1 saving (already live)
- Energy: 10% year-1 saving (already live)
- Work Orders: 3% of job cost (Sprint 2)
- Rent Review: 8% of annual uplift (Sprint 3)

Wave 3 adds additional commission streams:
- Conveyancing searches: margin on search fees
- Refinance DIP: 0.5–1% procuration fee
- Tenant Portal rent payments: 1.15% GoCardless fee

---

## Sprint Planning Summary (updated 2026-03-24)

| Sprint | Features | Issues | Status |
|--------|---------|--------|--------|
| Sprint 1 | T3-16 Ask RealHQ AI + T3-15 Lettings Workflow | PRO-650, PRO-651 | Specced — `docs/wave-3-sprint-1-brief.md` |
| Sprint 2 | T3-17 Compliance Certificate Tracking + T3-11 MonthlyFinancial + Revenue Chart | PRO-652, PRO-653 | Specced — `docs/wave-3-sprint-2-brief.md` |
| Sprint 3 | T3-1 Transaction Room + T3-18 Marketing Brochure Generator | PRO-656, PRO-655 | Specced — `docs/wave-3-sprint-3-brief.md` |
| Sprint 4 | T3-3 Tenant Portal + T3-4 Legal Document Automation | PRO-657, PRO-658 | Specced — `docs/wave-3-sprint-4-brief.md`. **Blocked on CEO decisions**: payment processor + portal URL |
| Sprint 5+ | T3-2 Project Intelligence, T3-6 CAM Recovery, T3-7 Refinance DIP, T3-8 Planning Submission, T3-9 5G/Solar contracts, T3-12 Carbon Reporting, T3-13 Cashflow P&L, T3-14 Portfolio Health Panel, T3-5 Conveyancing | — | Backlog |

---

## Review cadence

This document should be reviewed at the end of each Wave 2 sprint. If a Wave 3 feature becomes unblocked earlier than expected (e.g. if Transaction Room blockers resolve faster), it can be pulled forward. Otherwise: Wave 2 first.
