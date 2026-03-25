# RealHQ Wave 2 + Wave 3 Sprints 1–3 — Build Status

**Last updated:** 2026-03-24
**Author:** Head of Product
**For:** CTO + Engineering

---

## Wave 3 Sprint 3 — NEW (2026-03-24)

### ✅ Feature 1: Marketing Brochure Generator (T3-18)

| File | Status |
|------|--------|
| `src/lib/brochure-template.ts` | Complete — HTML/CSS A4 two-page template, AI narrative, KPI grid |
| `src/lib/brochure.ts` | Complete — PDF generator via @sparticuz/chromium + puppeteer-core, graceful no-op if not installed |
| `src/app/api/user/assets/[id]/brochure/route.ts` | Complete — Claude Haiku narrative, PDF/data-URI fallback |
| `src/app/assets/[id]/page.tsx` | Updated — "Generate brochure →" button in header actions |

### ✅ Feature 2: Transaction Room (T3-1)

| File | Status |
|------|--------|
| `prisma/schema.prisma` | Updated — TransactionRoom, TransactionDocument, TransactionMilestone, NDASignature models |
| `prisma/migrations/20260324_wave3_transaction_room/migration.sql` | Ready to apply |
| `src/lib/nda-template.ts` | Complete — 3-clause mutual NDA template |
| `src/app/api/user/transactions/route.ts` | Complete — GET list + POST create with 7 auto-milestones |
| `src/app/api/user/transactions/[roomId]/route.ts` | Complete — GET detail + PATCH update + 0.25% Commission on completion |
| `src/app/api/user/transactions/[roomId]/documents/route.ts` | Complete — POST document upload |
| `src/app/api/user/transactions/[roomId]/nda/route.ts` | Complete — POST NDA workflow, DocuSign-gated, manual fallback |
| `src/app/api/user/transactions/[roomId]/milestones/[milestoneId]/route.ts` | Complete — PATCH milestone status |
| `src/app/api/user/transactions/[roomId]/scout-link/route.ts` | Complete — POST link Scout deal to room |
| `src/app/transactions/page.tsx` | Complete — list + create modal, milestone progress bars |
| `src/app/transactions/[roomId]/page.tsx` | Complete — 4 sections: header, milestones, document vault, NDA workflow |
| `src/app/scout/page.tsx` | Updated — "Open deal room →" button when pipelineStage is set |
| `src/app/assets/[id]/page.tsx` | Updated — "Open transaction room →" button when recommendation === "sell" |
| `src/components/layout/Sidebar.tsx` | Updated — Transactions nav item added to Platform section |

**CTO actions needed:**
1. Apply `prisma/migrations/20260324_wave3_transaction_room/migration.sql`
2. (Optional) Install `@sparticuz/chromium` + `puppeteer-core` for server-side PDF generation. Falls back to HTML preview if not installed.
3. (Optional) Set `DOCUSIGN_INTEGRATION_KEY` + `DOCUSIGN_ACCOUNT_ID` + `DOCUSIGN_PRIVATE_KEY` for NDA e-signing. Falls back to manual upload path.

---

## Wave 3 Sprint 2 — NEW (2026-03-24)

### ✅ Feature 1: Compliance Certificate Tracking (T3-17)

| File | Status |
|------|--------|
| `prisma/schema.prisma` | Updated — `ComplianceCertificate` model added |
| `prisma/migrations/20260324_wave3_compliance_certs/migration.sql` | Ready to apply |
| `src/app/api/user/compliance/route.ts` | Complete — GET grouped by asset, expected cert types, missing detection |
| `src/app/api/user/compliance/[certId]/route.ts` | Complete — PATCH cert record |
| `src/app/api/user/compliance/renew/route.ts` | Updated — now writes `renewal_requested` to ComplianceCertificate |
| `src/app/api/cron/compliance-reminders/route.ts` | Complete — weekly reminders at 90/60/30 day windows |
| `prisma/scripts/migrate-compliance-to-certs.ts` | Complete — backfill from complianceItems JSON blob |

### ✅ Feature 2: MonthlyFinancial schema + Revenue vs NOI chart (T3-11)

| File | Status |
|------|--------|
| `prisma/schema.prisma` | Updated — `MonthlyFinancial` model added |
| `prisma/migrations/20260324_wave3_monthly_financial/migration.sql` | Ready to apply |
| `src/app/api/user/monthly-financial/route.ts` | Complete — GET aggregated monthly data |
| `src/app/api/user/monthly-financial/estimate/route.ts` | Complete — POST creates 12 estimated records |
| `src/app/api/user/work-orders/[orderId]/complete/route.ts` | Updated — upserts maintenanceCost into MonthlyFinancial |
| `src/components/ui/RevenueChart.tsx` | Complete — bar+line chart, placeholder when no data, estimated badge |
| `src/app/dashboard/page.tsx` | Updated — RevenueChart wired into section 4b |

**CTO actions needed:**
1. Apply `prisma/migrations/20260324_wave3_compliance_certs/migration.sql`
2. Apply `prisma/migrations/20260324_wave3_monthly_financial/migration.sql`
3. Run backfill: `npx ts-node --project tsconfig.json prisma/scripts/migrate-compliance-to-certs.ts`
4. Add Vercel Cron for `POST /api/cron/compliance-reminders` — weekly Sunday 08:00 UTC

---

## Wave 3 Sprint 1 — NEW (2026-03-24)

### ✅ Feature 1: Ask RealHQ AI (T3-16)

| File | Status |
|------|--------|
| `src/app/api/user/ask/route.ts` | Complete — SSE streaming, real portfolio data, source links |
| `src/components/ui/AskPanel.tsx` | Complete — streaming chat UI, suggestion chips, sources |
| `src/app/dashboard/page.tsx` | Updated — AskPanel wired into section 9b |

**Notes:** Auth-gated, uses real `prisma.userAsset` data (not static). Empty portfolio shows placeholder. `ANTHROPIC_API_KEY` required.

### ✅ Feature 2: Lettings Workflow (T3-15) — BE complete, FE entry point wired

| File | Status |
|------|--------|
| `prisma/schema.prisma` | Updated — `Letting`, `Enquiry` models added |
| `prisma/migrations/20260324_wave3_lettings/migration.sql` | Ready to apply |
| `src/app/api/user/lettings/route.ts` | Complete — GET list + POST create |
| `src/app/api/user/lettings/[lettingId]/route.ts` | Complete — PATCH status/agreedRent |
| `src/app/api/user/lettings/[lettingId]/enquiries/route.ts` | Complete — POST enquiry + CH covenant check |
| `src/app/api/user/lettings/[lettingId]/hot/route.ts` | Complete — POST HoT generation + 10% Commission |
| `src/app/tenants/page.tsx` | Updated — "Vacant Units" section + "Find tenant →" CTA |

**CTO action needed:** Apply `prisma/migrations/20260324_wave3_lettings/migration.sql` to Neon before lettings routes go live.

---

## Summary

All Wave 2 code is **complete and TypeScript-clean** as of 2026-03-24.

This includes all shared libs, all API routes, all FE page wiring, and all Wave 2 UI components. `npx tsc --noEmit` passes with zero errors.

**Schema migration status: ✅ LIVE** — All Wave 2 Prisma models applied via piecemeal migrations 2026-03-22/23. PRO-563 is closed.

⚠️ **One outstanding migration**: PRO-610 insurance risk fields (`insuranceRiskScore`, `insuranceRiskFactors`, `insuranceRoadmap`, `insuranceRiskAssessedAt` on `UserAsset`) — migration file is at `prisma/migrations/20260324_insurance_risk_scorecard/migration.sql`. CTO must apply this to Neon before the risk scorecard UI goes live.

**Remaining gates:** Feature testing (PRO-570/572/574/575) by CTO/FSE. All code is done — testing is the only blocker.

---

## Status by category

### ✅ Shared Libraries (src/lib/)

| File | Description | Status |
|------|-------------|--------|
| `src/lib/avm.ts` | Shared AVM math — income cap, PSF, blend, IRR | Complete |
| `src/lib/hold-sell-model.ts` | 10-year DCF: holdIRR, sellIRR, NPV, recommendation | Complete |
| `src/lib/land-registry.ts` | UK comparable sales via SPARQL (free, no key) | Complete |
| `src/lib/tenant-health.ts` | Health score v2: expiry + payment + covenant + sector | Complete |
| `src/lib/covenant-check.ts` | Companies House UK covenant grade | Complete |
| `src/lib/tenant-materialise.ts` | Lazy materialisation: Documents → Tenant + Lease | Complete |
| `src/lib/planning-classifier.ts` | Claude Haiku impact classification (raw fetch, not SDK) | Complete |
| `src/lib/planning-feed.ts` | UK planning.data.gov.uk + US Miami-Dade feed | Complete |
| `src/lib/data/scout-benchmarks.ts` | Cap rates, ERV, DSCR calc by submarket | Complete |

### ✅ API Routes

#### AVM / Portfolio
| Route | Description | Status |
|-------|-------------|--------|
| `GET /api/user/assets/:id/valuation` | Single asset AVM with 7-day cache | Complete |
| `GET /api/user/assets/:id/valuation/history` | Valuation time-series (up to 24 records) | Complete |
| `GET /api/user/portfolio/valuation` | Summed portfolio AVM (Dashboard KPI tile) | Complete |

#### Tenants
| Route | Description | Status |
|-------|-------------|--------|
| `GET /api/user/tenants` | Tenant list with health scores + lazy materialisation | Complete |
| `POST /api/user/leases/materialise` | On-demand lease materialisation from Documents | Complete |
| `POST /api/user/tenants/:leaseId/letter` | Generate + send renewal/rent review letter (Claude) | Complete |

#### Planning
| Route | Description | Status |
|-------|-------------|--------|
| `GET /api/user/planning` | Planning applications (Wave 2: reads from table, fallback to JSON) | Complete |
| `PATCH /api/user/planning/:id/ack` | Acknowledge planning alert | Complete |

#### Hold vs Sell
| Route | Description | Status |
|-------|-------------|--------|
| `GET /api/user/hold-sell-scenarios` | 10-year DCF scenarios (upgraded from Wave 1 approx) | Complete |

#### Scout
| Route | Description | Status |
|-------|-------------|--------|
| `POST /api/scout/deals/:dealId/underwrite` | Cap rate, DSCR, 5-yr IRR underwriting | Complete |
| `POST /api/scout/deals/:dealId/loi` | AI Letter of Intent generation (raw fetch, not SDK) | Complete |
| `PATCH /api/scout/deals/:dealId/pipeline` | Move deal through acquisition pipeline stages | Complete |
| `GET /api/scout/pipeline` | Full pipeline kanban view | Complete |

#### Work Orders (Wave 2 additions)
| Route | Description | Status |
|-------|-------------|--------|
| `POST /api/user/work-orders/:id/scope` | AI scope of works generation (Claude Sonnet) | Complete |
| `POST /api/user/work-orders/preview/scope` | Scope generation before order is saved | Complete |
| `GET /api/user/contractors` | Contractor panel with PII access control | Complete |
| `POST /api/user/work-orders/:id/start` | Awarded → In Progress + started milestone | Complete |
| `POST /api/user/work-orders/:id/milestone` | Progress update (Wave 2: text; Wave 3: + photos) | Complete |
| `GET /api/user/work-orders/:id/milestones` | Progress timeline for an order | Complete |
| `POST /api/user/work-orders/:id/complete` | Mark complete + Commission 3% + contractor rating | Complete |
| `GET /api/tender/respond/:token` | Public contractor quote review | Complete |
| `POST /api/tender/respond/:token` | Public contractor quote submission | Complete |

#### Rent Review
| Route | Description | Status |
|-------|-------------|--------|
| `GET /api/user/rent-reviews` | All active rent review events, ordered by expiry date | Complete |
| `GET /api/user/rent-reviews/:reviewId` | Single review event with correspondence history | Complete |
| `POST /api/user/rent-reviews/:reviewId/draft` | Generate renewal letter / Section 25 / HoT via Claude | Complete |
| `POST /api/user/rent-reviews/:reviewId/send` | Send approved draft via Resend, log correspondence | Complete |
| `POST /api/user/rent-reviews/:reviewId/hot` | Generate HoT + DocuSign envelope for e-signature | Complete |
| `PATCH /api/user/rent-reviews/:reviewId/complete` | Record agreed rent + trigger 8% Commission record | Complete |

#### Cron
| Route | Description | Status |
|-------|-------------|--------|
| `POST /api/cron/planning-monitor` | Daily: fetch new planning apps + classify + alert | Complete |
| `POST /api/cron/tenant-engagement-triggers` | Daily: scan leases for renewal trigger horizons | Complete |
| `POST /api/cron/rent-review-triggers` | Daily: create RentReviewEvent records at 18m/12m/6m/3m horizons | Complete |

### ✅ Email Templates (src/lib/email.ts)

- `sendPlanningStatusAlert` — planning impact alert
- `sendTenantEngagementAlert` — lease renewal horizon trigger
- `sendRentReviewAlert` — rent review trigger with uplift potential
- `sendContractorTenderInvite` — contractor tender invitation with token URL
- `sendWorkOrderComplete` — completion notification with commission amount

### ✅ UI Changes

| Page | Change | Status |
|------|--------|--------|
| Work Orders | "Generate scope →" button in BriefBuilder (calls Claude) | Complete |
| Work Orders | "Start job →" button for `awarded` orders | Complete |
| Work Orders | "Complete job" modal with final cost, rating, commission preview | Complete |
| Tenants | Data source updated from `/api/user/lease-summary` → `/api/user/tenants` | Complete |

### ✅ Data Migration Scripts

| Script | Description | Status |
|--------|-------------|--------|
| `prisma/scripts/migrate-planning-history.ts` | One-time: JSON blob → PlanningApplication records | Complete |
| `prisma/seeds/contractors.ts` | Seed: 10 SE UK + 5 FL US contractors | Complete |

---

## What the CTO needs to do — Feature testing unblocked

### 1. ~~Run the Wave 2 Prisma migration~~ — ✅ DONE

Wave 2 schema is already live in Neon via piecemeal migrations. No action needed.

⚠️ One exception: `insuranceRiskScore`/`insuranceRoadmap` fields for PRO-610 still need migration:
```bash
# Only when ready to start PRO-610:
npx prisma db push  # or write a targeted migration
```

### 2. Run contractor seed

```bash
npx ts-node --project tsconfig.json prisma/seeds/contractors.ts
```

### 3. Run planning history migration (after Prisma migration)

```bash
npx ts-node --project tsconfig.json prisma/scripts/migrate-planning-history.ts
```

### 4. Set environment variables

| Variable | Feature | Status |
|----------|---------|--------|
| `ANTHROPIC_API_KEY` | Claude scope/LOI/letter generation | Likely already set |
| `COMPANIES_HOUSE_API_KEY` | UK covenant check | Free, get from developer.company-information.service.gov.uk |
| `CRON_SECRET` | Secure cron endpoints | Generate any strong random string |
| `TENDER_SECRET` | Sign contractor quote-response tokens | Generate any strong random string |
| `GOCARDLESS_ACCESS_TOKEN` | Contractor payment (Wave 2 optional) | Skip for Wave 2 launch |

### 5. Configure cron jobs

Both cron routes require `POST` with `X-Cron-Secret: {CRON_SECRET}` header.

Recommended schedule:
- `POST /api/cron/planning-monitor` — daily at 06:00
- `POST /api/cron/tenant-engagement-triggers` — daily at 07:00
- `POST /api/cron/rent-review-triggers` — daily at 07:30

Configure via Vercel Cron (preferred) or cron-job.org.

---

## Sprint 4b/4c — ✅ All complete as of 2026-03-24

| Issue | Title | Status |
|-------|-------|--------|
| PRO-610 | Insurance Risk Scorecard + Premium Reduction Roadmap | ✅ Code done. Pending CTO migration: `prisma/migrations/20260324_insurance_risk_scorecard/migration.sql` |
| PRO-604 | Per-asset Development Potential (PDR, change of use, air rights) | ✅ Done |
| PRO-613 | Dashboard: Properties Grid + Occupancy Donut + Portfolio Value Score + 8-tile KPI Strip | ✅ Done — all 4 parts built |

### Additional FE gap-closing (2026-03-24)

All Wave 2 API routes that were missing FE wiring are now wired:

| Feature | Routes wired | Page |
|---------|-------------|------|
| NOI Bridge waterfall | `GET /api/user/noi-bridge` | Dashboard section 8b |
| Compliance renewal | `POST /api/user/compliance/renew` | `/compliance` |
| Contractor suggestions | `GET /api/user/contractors?trade=<type>` | Work Orders quote modal |
| Excel export links | `GET /api/user/export?type=noi\|lease-schedule\|hold-sell\|insurance` | `/report` |
| Portfolio AVM snapshot | `GET /api/user/portfolio/valuation` (direct Prisma) | `/portfolio-summary` |
| Rent review full workflow | `POST /api/user/rent-reviews/:id/draft`, `/hot`, `/send`, `PATCH /complete` | `/tenants` |
| Scout underwriting + LOI | `POST /api/scout/deals/:id/underwrite`, `/loi` | `/scout` |
| Asset valuation history | `GET /api/user/assets/:id/valuation/history` | `/assets/:id` |
| Dev potential | `GET /api/user/assets/:id/development-potential` | `/assets/:id` |
| Sell enquiry | `POST /api/user/assets/:id/sell-enquiry` | `/assets/:id` |
| Insurance bind | `POST /api/insurance/quotes/:id/bind` (gated on coverforceEnabled) | `/insurance` |

---

## TypeScript pre-migration errors (expected, will resolve)

All 62 TypeScript errors are Prisma schema errors — references to Wave 2 models that don't exist yet in `prisma/schema.prisma`. Examples:

- `Property 'avmValue' does not exist on type 'UserAsset'`
- `Property 'holdSellScenario' does not exist on type 'UserAsset'`
- `Property 'planningApplication' does not exist on type 'PrismaClient'`
- `Property 'scoutLOI' does not exist on type 'PrismaClient'`

All will resolve after step 1 above.

---

## Architecture decisions made

1. **No `@anthropic-ai/sdk`** — All Claude calls use raw `fetch("https://api.anthropic.com/v1/messages")` to match the existing codebase pattern. Do not add the SDK package.

2. **Pre-migration casts** — Wave 2 routes that reference new Prisma models use `(prisma as unknown as {...}).newModel.operation()` casts. This allows the routes to build now and type-check after migration.

3. **7-day AVM cache** — `UserAsset.avmValue` / `avmDate` are quick-lookup fields updated on each revaluation. Routes check staleness before recalculating.

4. **Lazy materialisation** — `GET /api/user/tenants` calls `materialisePendingLeases()` at request time. Fast no-op when nothing is pending. No background job needed for Wave 2.

5. **Commission pattern** — All commission records use `prisma.commission.create` (Wave 1 model already exists). The `category` field is extended with `"work_order"`.

6. **Contractor PII** — `GET /api/user/contractors` returns email/phone only for contractors the user has previously awarded a job to. This avoids exposing contractor PII before engagement.
