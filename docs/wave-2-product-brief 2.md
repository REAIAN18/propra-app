# RealHQ Wave 2 Product Brief

**Status:** Draft
**Date:** 2026-03-21
**Author:** Head of Product
**Sources:** RealHQ-Spec-v3.2, Addendum v3.1, BuildOrder v1.0

---

## Purpose

This brief defines what changes between Wave 1 and Wave 2. It is the single reference for engineering on what to build next, what new screens to create, what new APIs to integrate, and what the user experience looks like when they return after Wave 1.

---

## Wave 1 recap (what is live)

| Feature | Status | Key capability |
|---------|--------|---------------|
| Dashboard | Live | Opportunity cards, KPIs, lease expiry tracker, deal scout cards (inline) |
| Property onboarding | Live | Address → 12+ APIs fire automatically (satellite, EPC, planning, flood, insurance) |
| Rent Clock | Live | Lease expiry countdowns, break dates, leverage scores |
| Insurance placement | Live | CoverForce integration — commercial insurance quotes and bind |
| Ask RealHQ | Live | Natural language queries against property data |
| Document ingestion | Live | Textract + Claude pipeline — lease, insurance, utility bills |
| First-use flow | Live | Guided onboarding — property add, document uploads, first analysis |

---

## Wave 2 scope

Wave 2 ships **Energy Intelligence** (full energy screen) and **Tenant Portal** (basic tenant-facing interface). These are the two features that begin generating recurring commission and recurring usage from tenants.

Wave 2 also includes: Acquisitions Scout deal cards (already on dashboard, now wired to live data), Hold vs Sell (scenario modelling), Marketing Brochure Generator, and Transaction Room. These are in the BuildOrder as Wave 2, but the energy and tenant portal are the highest-impact unlocks.

---

## New screens in Wave 2

### 1. Energy screen (/energy)

**Replaces:** Stub "Energy" card on dashboard with no live data.

**Sections:**
- **Utility switching:** tariff comparison card — current vs best available (Octopus/EDF/British Gas/E.ON APIs). "Switch" CTA executes via supplier API.
- **Anomaly feed:** all detected consumption anomalies ranked by annual saving. Each with detection basis, saving in £, probable cause, and action CTA.
- **Consumption heatmap:** half-hourly reads visualised (dark=high). Day-of-week and time-of-day breakdown.
- **Solar opportunity card:** Google Solar API result — roof area, annual generation estimate, payback period. "Get quotes" → MCS installer inquiry.
- **Upgrade opportunities:** LED, HVAC, Insulation — each as a card with cost, saving, payback, EPC improvement, "Get quotes" CTA.
- **Per-property energy cards:** kWh/sqft vs benchmark, tariff vs market, anomaly count badge.

**Entry points:** Sidebar nav → Energy; Dashboard opportunity card → Energy.

**Empty state:** "Connect smart meter or upload a utility bill to activate energy intelligence."

---

### 2. Tenant Portal (/portal — separate route or subdomain)

**New surface:** Tenant-facing. Not the owner dashboard. Tenants log in separately.

**Sections:**
- **Rent payment widget:** GoCardless direct debit or Stripe card. Payment confirms to RealHQ ledger automatically.
- **Maintenance requests:** tenant raises request → work order created → contractor assigned → automated status updates.
- **Documents tab:** lease PDF, rent statements, maintenance records — view and download.
- **Correspondence log:** all landlord–tenant correspondence via RealHQ (not personal email).
- **Rent account:** statement of account, payment history, arrears balance if any.
- **Document signing:** lease renewals, licences via DocuSign from within portal.

**Entry:** Tenant receives invite email with portal login link. Owner sends invite from tenant record in RealHQ.

---

### 3. Acquisitions Scout screen (/acquisitions)

**Replaces:** 2 inline dashboard deal cards → full pipeline view.

**Sections:**
- **Deal inbox:** deals ranked by mandate score with one-line underwriting summary per card.
- **Pipeline view:** kanban (Scouted → Interested → Under offer → Due diligence → Exchanged → Completed).
- **Mandate configuration:** set property type, geography, price range, yield target, WAULT preference.
- **Document upload:** upload brochure/IM → AI underwriting in 60 seconds.

---

### 4. Hold vs Sell modal (accessible from any property)

**New component:** accessible via "..." menu on property card or from Valuation screen.

- 4 scenario cards: Hold / Sell now / Sell after value-add / Refinance
- Each: total return, IRR, net proceeds
- AI recommendation with live data rationale
- Sensitivity table

---

### 5. Marketing Brochure Generator (accessible from any property)

**New action:** "Generate brochure" on property menu.

- Input: property selected, asking rent, agent notes (optional)
- Output: branded PDF (satellite image, financials, Investment narrative, comparables) in <60 seconds
- Downloadable, shareable link

---

### 6. Transaction Room (/transactions)

**New screen:** deal coordination hub.

- Deal overview: parties, asset, deal type, key dates, status
- Document vault: versioned, NDA-gated for buyers
- Milestone tracker: offer → heads → solicitors → searches → contract → exchange → completion
- NDA workflow: buyer receives link → signs via DocuSign → access granted automatically

---

## Dashboard changes in Wave 2

| Component | Wave 1 | Wave 2 |
|-----------|--------|--------|
| Energy card | Stub (no live data) | Live — shows top anomaly saving, tariff gap |
| Deal Scout cards | 2 cards (illustrative or limited data) | Live — wired to LoopNet/CoStar/Rightmove feeds |
| Tenant portal link | Not present | "Invite tenant" CTA on tenant records |
| Hold vs Sell | Not present | Accessible from property menu |
| Commission tracker | Not visible | "RealHQ earned: £X" total shown on dashboard |

---

## New APIs in Wave 2

| API | Feature | Market | Commercial agreement? |
|-----|---------|--------|----------------------|
| Octopus Energy API | Energy switching | UK | Public sandbox available |
| EDF Energy API | Energy switching | UK | May require agreement |
| British Gas API | Energy switching | UK | May require agreement |
| E.ON Next API | Energy switching | UK | May require agreement |
| DCC / n3rgy | Smart meter reads | UK | Requires DCC authorisation |
| Google Maps Solar API | Solar assessment | UK + US | Board to confirm key |
| Met Office API | Weather-normalised energy analysis | UK | Free |
| Elexon BMRS API | HH settlement data | UK | Free |
| MCS register | Solar installer lookup | UK | Free |
| BMS adapters (BACNET/Modbus) | HVAC scheduling | UK + US | Per-installation |
| GoCardless API | Tenant rent payment | UK | Sandbox available |
| Stripe API | Tenant rent payment (card fallback) | UK + US | Sandbox available |
| TrueLayer / Open Banking | Payment confirmation | UK | Sandbox available |
| DocuSign API | Tenant document signing | UK + US | Sandbox available |
| SendGrid / Resend | Tenant notification emails | Global | Available |
| CoStar API | Acquisitions deal feed + AVM | UK + US | Commercial licence — board action |
| LoopNet API | US deal feed | US | Part of CoStar licence |
| CREXI API | US deal feed | US | Available |
| ATTOM AVM API | US property valuation | US | Commercial subscription |

---

## What does NOT change in Wave 2

- Property onboarding flow — unchanged
- Rent Clock — already live, no changes in Wave 2
- Insurance — CoverForce integration already live
- Ask RealHQ — already live, no changes
- Document ingestion pipeline — already live, re-used by energy (utility bill OCR) and portal (lease extraction)

---

## Wave 2 API summary by category

| Category | APIs added in Wave 2 |
|---------|---------------------|
| Energy | 10 new APIs (supplier, smart meter, solar, weather, BMRS) |
| Tenant portal | 5 new APIs (GoCardless, Stripe, TrueLayer, DocuSign, SendGrid) |
| Acquisitions | 4 new APIs (CoStar, CREXI, ATTOM, LoopNet) |
| Total new | ~19 integrations |

---

## Revenue unlocked in Wave 2

| Feature | Revenue model | Timing |
|---------|--------------|--------|
| Energy switching | Supplier commission or markup per switch | Immediate on switch |
| Solar referral | % of install value from MCS installer | On installation |
| Tenant rent payment | GoCardless/Stripe processing margin | Monthly |
| Acquisitions (deal completion) | 0.5–1% of deal value | On deal completion |
| Transaction management | 0.25% of deal value | On completion |

---

## Engineering sequencing recommendation

1. **Energy screen** — highest volume, fastest to implement (supplier APIs are accessible, bill OCR pipeline exists from Wave 1). Start here.
2. **Tenant portal** — GoCardless and DocuSign sandboxes available without commercial agreements. Start in parallel with energy.
3. **Acquisitions Scout** — blocked on CoStar licence (board action). Start pipeline/underwriting model with CREXI while CoStar is being procured.
4. **Hold vs Sell** — depends on AVM (ATTOM/CoStar). Can start UI while API access is being confirmed.
5. **Marketing Brochure Generator** — fastest to build (Claude API + Google Maps already live). Good quick win.
6. **Transaction Room** — most complex (multi-party, NDA workflow, DocuSign). Start last in Wave 2.

---

## Board action items (Wave 2 blockers)

| Item | Urgency | Impact if delayed |
|------|---------|------------------|
| Google Solar API key | High | Blocks solar card on energy screen |
| EDF/British Gas/E.ON commercial API access | High | Energy switching shows only Octopus |
| DCC/n3rgy smart meter authorisation | High | No half-hourly data; anomaly detection degrades to bill-level only |
| CoStar API licence | High | Acquisitions Scout and AVM blocked |
| ATTOM AVM API subscription | Medium | US property valuations blocked |
| Creditsafe API account | Medium | Covenant monitoring (Wave 3) blocked |
