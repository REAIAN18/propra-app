# RealHQ — Engineering Rules

> **Read DECISIONS.md first.** It overrides everything else.
> **Read CODE_INVENTORY.md before writing any code.** It maps every existing file.
> **RESTYLE. REWIRE. EXTEND. Never rebuild what already works.**

## Existing Codebase

23 lib files, 70+ API routes, 21 components, 6 hooks, 32 pages, 54 models, 30 email templates, 8 cron jobs. All in CODE_INVENTORY.md.

Before creating any new file, check CODE_INVENTORY.md. If similar exists: import + extend. If component looks wrong: restyle. If API returns data: wire new UI to it.

## Design References (docs/designs/)

- landing-design.html — / (page.tsx)
- dashboard-design.html — /dashboard
- onboarding-design.html — /onboarding (type address)
- upload-schedule-design.html — /onboarding (bulk import)
- search-company-design.html — /onboarding (company search)
- document-progress-design.html — document extraction progress
- property-detail-design.html — /assets/[id]
- signup-design.html — /signup
- signin-design.html — /signin
- insurance-design.html — /insurance
- insurance-flows-design.html — insurance bind/adjust/dismiss
- connected-system-design.html — architecture reference
- scout-deep-design.html — Scout deep design
- deep-product-design.html — all modules deep design

## Build Rules Per Page

### Landing (/) — reuse PortfolioCalculator (RESTYLE), router.push, Links, /api/contact
### Dashboard — reuse usePortfolio, /api/portfolios/user, /api/dashboard/summary, PageHero, G2NComparisonCard, MetricCard, ActionAlert (all RESTYLE). Add: /api/scout/deals, /api/user/transactions, /api/macro/sofr
### Onboarding — reuse /api/property/autocomplete, /api/property/lookup, /api/property/satellite, enrich-asset.ts. For schedule: document-parser.ts, textract.ts. For company: attom.ts
### Property Detail — reuse usePortfolio, /api/user/assets, /api/property/satellite, all module APIs. Hub page with tabs.
### Insurance — reuse coverforce.ts, insurance-risk.ts, /api/user/insurance-summary, /api/quotes/bind, PolicyUploadWidget, sendInsuranceBoundEmail(). DO NOT rebuild quoting pipeline.
### Documents — reuse textract.ts, document-parser.ts, /api/user/leases/materialise, LeaseUploadModal
### Signup/Signin — reuse /api/auth/[...nextauth], /api/signup

## Layout Decision

AppShell (251 lines) — RESTYLE to dark theme. Changes it once = reskins every page.
TopBar (362 lines) — RESTYLE. Keep breadcrumbs + action buttons.
NavContext — USE AS-IS.

## CSS

THREE colour systems in globals.css. USE ONLY the new dark theme:
ADD: --bg:#09090b --s1:#111116 --s2:#18181f --bdr:#252533 --tx:#e4e4ec --tx2:#8888a0 --tx3:#555568 --acc:#7c6af0 --grn:#34d399 --red:#f87171 --amb:#fbbf24
DO NOT USE: --color-* (legacy) or --rhq-* (light theme)

## Fonts

Instrument Serif (display numbers), DM Sans (body), JetBrains Mono (data/labels). Add to layout.tsx via Google Fonts or next/font.

## Architecture

5 systems, not 16 pages:
1. Property Profile — enrich-asset.ts, attom.ts, avm.ts, /api/property/*. Models: UserAsset, AssetValuation
2. Document Generator — document-parser.ts, textract.ts, brochure.ts. Models: Document, DocumentExtract
3. Portal System — models exist: TransactionRoom, NDASignature. UI not built yet.
4. Action Engine — coverforce.ts, energy-quotes.ts, email.ts, /api/quotes/bind
5. Learning Loop — ScoutReaction model, opportunity.ts, tenant-health.ts

## File Ownership

Frontend: src/app/*/page.tsx, src/components/*, globals.css, public/*, brand/*
Backend: src/app/api/*, src/lib/*, prisma/schema.prisma, scripts/*
Infra: vercel.json, .github/*, package.json, tsconfig.json

## Workflow

1. Feature branch from main
2. npx tsc --noEmit && npm run lint
3. Push branch. Infra merges after QA.
4. Never push directly to main.

## Problem-Solving

1. Read the full error before acting
2. One change at a time
3. Two attempts max — then pivot
4. Never create EMERGENCY tickets
