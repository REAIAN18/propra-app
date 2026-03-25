# RealHQ Wave 2 — Engineering Handoff Brief

**Date:** 2026-03-23 (revised — previous version had Wave 2 scope errors)
**Author:** Head of Product
**For:** Engineering team
**Status:** Ready to build — Prisma migration is the only blocker

---

## ⚠ Note on this document

This document was superseded by per-feature handoffs written 2026-03-21 through 2026-03-23. The **build order, feature scope, env vars, and schema additions below are the authoritative version.** The previous version of this document incorrectly included Tenant Portal and Marketing Brochure Generator as Wave 2 features (both are Wave 3 — see `docs/wave-3-triage.md`).

---

## What Wave 2 is

Wave 2 adds 9 feature areas to the Wave 1 platform, all commission-earning:

| Feature area | Commission model | Sprint |
|---|---|---|
| Energy intelligence (tariff, anomalies, solar) | 10% of year-1 saving | Wave 1 + Sprint 2 additions |
| Work Orders (AI scope, tender, milestone, completion) | 3% of job cost | Sprint 2 |
| Acquisitions Scout (underwriting, LOI, pipeline) | 0.5–1% on completion | Sprint 2 |
| Tenant Intelligence (health scores, covenant, materialisation) | Enables Rent Review | Sprint 2 |
| AVM / Portfolio Valuation (income cap + PSF blend) | Enables Hold vs Sell | Sprint 1 |
| Hold vs Sell (10-year DCF, IRR, recommendation) | Enables Scout | Sprint 2 |
| Rent Review Automation (draft letter, HoT, commission trigger) | 8% of annual uplift | Sprint 3 |
| Planning Intelligence (live feed, cron, dev potential) | Advisory CTA → Wave 3 fee | Sprint 3 |
| Action Queue (aggregated from all 9 sources) | Conversion multiplier | Sprint 4 |

**Wave 3 features NOT in Wave 2:** Tenant Portal, Transaction Room, Legal Document Automation, CAM Recovery, Refinance DIP automation, Marketing Brochure Generator. See `docs/wave-3-triage.md`.

---

## Critical blocker: Prisma migration

**Nothing works until this runs:**

```bash
npx prisma migrate dev --name wave-2
npx prisma generate
```

All Wave 2 code is written. 62 TypeScript errors are all schema errors — they resolve after this migration. See `docs/wave-2-prisma-schema-additions.md` for the exact models and fields to add.

After migration, run:
```bash
npx ts-node --project tsconfig.json prisma/seeds/contractors.ts
npx ts-node --project tsconfig.json prisma/scripts/migrate-planning-history.ts
```

---

## Critical commercial constraints — read before building

### 1. Half-hourly (HH) metered UK assets cannot auto-switch suppliers

UK commercial properties above ~100MWh/yr are HH-metered (MPAN profile class `00`). These accounts have bespoke contracts — they cannot be auto-switched via the Octopus consumer or SME API.

- **Dartford (DHL, 85k sqft)** and **Thurrock (Amazon, 120k sqft)**: HH-metered — do NOT show Switch CTA
- **Basildon, Medway, Gravesend**: SME-metered — standard Octopus API path
- Detection: extract MPAN profile class from bill. Class `00` = HH. All others = SME.
- HH assets: show "Large-site contract — bespoke tender available. [Request quotes]"

### 2. Florida assets: tariff switching is not possible

FPL (Florida Power & Light), Duke Energy, and TECO are regulated monopoly utilities. No competing supplier exists. For any FL market property, hide the tariff switching section entirely. Show consumption vs EIA benchmark, HVAC anomaly feed, solar card.

Full commercial context: `docs/wave-2-energy-procurement-benchmarks.md`

---

## Build order

**Start here (no migration needed):**
- PRO-613 — Dashboard UI sprint: 4 parts, all FE-only, can start now
  - Part 1: Properties grid (3-across asset cards with opportunity badges)
  - Part 2: Occupancy breakdown donut (4-segment sqft chart)
  - Part 3: Portfolio Value Score (circular gauge + Income/Cost/Growth sub-scores)
  - Part 4: Expanded KPI strip (8 tiles)
  Full spec: `docs/wave-2-dashboard-properties-grid-handoff.md` | Tests: AT-613-1 through AT-613-12

**After Prisma migration (start immediately):**
| Order | Feature | Owner | Spec | Paperclip |
|---|---|---|---|---|
| 1 | AVM / Portfolio Valuation | CTO | `docs/wave-2-avm-engineering-handoff.md` | PRO-570 |
| 2 | Tenant Intelligence | FSE | `docs/wave-2-tenant-intelligence-engineering-handoff.md` | PRO-572 |
| 3 | Work Orders Wave 2 | FE | `docs/wave-2-work-orders-engineering-handoff.md` | PRO-566/567/571 |
| 4 | Planning Intelligence | CTO | `docs/wave-2-planning-intelligence-engineering-handoff.md` | PRO-576/603 |
| 5 | Hold vs Sell DCF | CTO | `docs/wave-2-hold-vs-sell-engineering-handoff.md` | PRO-575 |
| 6 | Acquisitions Scout | FSE | `docs/wave-2-scout-engineering-handoff.md` | PRO-568/569/597 |
| 7 | Rent Review Automation | FSE | `docs/wave-2-rent-review-automation.md` | PRO-574 |
| 8 | Action Queue | FSE | `docs/wave-2-action-queue-spec.md` | PRO-577 |

**Sprint 4b additions (specced 2026-03-23):**
| Feature | Owner | Spec | Notes |
|---|---|---|---|
| Insurance Risk Scorecard + Roadmap | CTO | `docs/wave-2-insurance-premium-reduction-handoff.md` | PRO-610 — schema fields in prisma-schema-additions.md |
| Per-asset Dev Potential | CTO | `docs/wave-2-planning-dev-potential-handoff.md` | PRO-604 — add to same migration as PRO-563 |
| Dashboard UI sprint (grid + donut + value score + KPI strip) | FE | `docs/wave-2-dashboard-properties-grid-handoff.md` (Parts 1–4) | PRO-613 — FE only, start now |

---

## Per-feature handoff index

| Handoff doc | Feature |
|---|---|
| `docs/wave-2-avm-engineering-handoff.md` | AVM: income cap, PSF blend, 7-day cache, portfolio KPI tile |
| `docs/wave-2-hold-vs-sell-engineering-handoff.md` | Hold vs Sell: 10-year DCF, holdIRR, sellIRR, planning signal input |
| `docs/wave-2-tenant-intelligence-engineering-handoff.md` | Tenant Intelligence: lazy materialisation, health scores, covenant check |
| `docs/wave-2-work-orders-engineering-handoff.md` | Work Orders: AI scope, contractor tender, milestone, completion + 3% commission |
| `docs/wave-2-planning-intelligence-engineering-handoff.md` | Planning: live UK feed, Claude classifier, cron, status alerts |
| `docs/wave-2-planning-dev-potential-handoff.md` | Dev Potential: PDR, change of use, air rights per asset |
| `docs/wave-2-scout-engineering-handoff.md` | Scout: underwriting, LOI, pipeline kanban |
| `docs/wave-2-rent-review-automation.md` | Rent Review: leverage score, draft letter, HoT, DocuSign, 8% commission trigger |
| `docs/wave-2-energy-engineering-handoff.md` | Energy: tariff comparison, HH detection, FL market logic, anomalies, solar |
| `docs/wave-2-insurance-premium-reduction-handoff.md` | Insurance Risk Scorecard + Premium Reduction Roadmap |
| `docs/wave-2-action-queue-spec.md` | Action Queue: all 10 sources, scoring, urgency, TopBar badge |
| `docs/wave-2-dashboard-properties-grid-handoff.md` | Dashboard Properties Grid: 3-across cards with multi-category badges |

---

## Environment variables

See `docs/wave-2-env-var-gate.md` for complete list with generation instructions.

**Immediate (generate now — no commercial agreement needed):**
- `CRON_SECRET` — `openssl rand -hex 32` — required for planning cron + tenant engagement cron
- `TENDER_SECRET` — `openssl rand -hex 32` — required for contractor tender token signing

**Sprint 2 (get before Sprint 2 goes live):**
- `COMPANIES_HOUSE_API_KEY` — free, 5-min signup: developer.company-information.service.gov.uk
- `GOOGLE_SOLAR_API_KEY` — Google Cloud Console, Solar API, ~$0.005/asset lifetime

**Sprint 3 (before Rent Review goes live):**
- `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_BASE_URL`, `DOCUSIGN_PRIVATE_KEY`, `DOCUSIGN_USER_ID`

**Optional / Wave 3:**
- `GOCARDLESS_ACCESS_TOKEN` — skip for Wave 2 launch, commission still records without it
- CoStar/ATTOM/EDF/BG/EON APIs — not needed for Wave 2 launch (graceful fallbacks exist)

All env vars set in **Vercel** (not Railway — Railway is decommissioned). See CLAUDE.md.

---

## Schema additions

Full schema in `docs/wave-2-prisma-schema-additions.md`.

**New models (13):**
`AssetValuation`, `HoldSellScenario`, `Lease`, `Tenant`, `TenantEngagement`, `TenantLetter`, `PlanningApplication`, `ScoutUnderwriting`, `ScoutLOI`, `WorkOrderMilestone`, `WorkOrderCompletion`, `Contractor`, `Commission`

**New fields on `UserAsset`:**
`avmValue`, `avmDate`, `planningImpactSignal`, `planningLastFetched`, `siteCoveragePct`, `pdRights`, `pdRightsDetail`, `changeOfUsePotential`, `changeOfUseDetail`, `airRightsPotential`, `airRightsDetail`, `devPotentialAssessedAt`, `insuranceRiskScore`, `insuranceRiskFactors`, `insuranceRoadmap`, `insuranceRiskAssessedAt`

---

## Definition of done (applies to all Wave 2 features)

A feature is done when:
1. It shows **real data** from the correct named API or source — not illustrative, not hardcoded
2. The action it enables **actually executes end-to-end** — not a form submission to a human intermediary
3. The output **matches the screen layout in the spec exactly**
4. It has been **tested on a real document from a real client** — not demo data
5. All **acceptance criteria in the per-feature handoff doc are checkboxed green** — not estimated

Features with pending API access ship with a **clean pending state** — not an error, not blank. A pending state must show the expected value or benefit and explain what is missing.

---

## Board actions needed for Wave 2 launch

| Action | Feature | Priority |
|---|---|---|
| Generate + set `CRON_SECRET` in Vercel | Planning cron + tenant engagement cron | **High — do today** |
| Generate + set `TENDER_SECRET` in Vercel | Contractor tender token signing | **High — do today** |
| Configure cron endpoints on Vercel Cron | Planning monitor + tenant triggers | **High — same session** |
| Get `COMPANIES_HOUSE_API_KEY` (free) | UK tenant covenant check | High — before Sprint 2 |
| Get `GOOGLE_SOLAR_API_KEY` | Solar opportunity card | Medium — before Sprint 2 |

Full board action list with generation instructions: `docs/wave-2-env-var-gate.md`.

---

*Supersedes previous version of this doc. All per-feature specs are in the handoff docs indexed above. For build sequencing see `docs/wave-2-master-build-order.md`. For go/no-go checklist see `docs/wave-2-launch-readiness.md`.*
