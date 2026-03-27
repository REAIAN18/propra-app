# RealHQ — Engineering Rules

> **Read DECISIONS.md first.** It overrides everything else.
> **Read CODE_INVENTORY.md before writing any code.** It maps every existing file.
> **RESTYLE. REWIRE. EXTEND. Never rebuild what already works.**

## Existing Codebase

23 lib files, 70+ API routes, 21 UI components, 6 hooks, 32 pages, 54 Prisma models, 30 email functions, 8 cron jobs. All in CODE_INVENTORY.md.

Before creating any new file, check CODE_INVENTORY.md. If similar exists: import and extend. If component looks wrong: restyle, don't duplicate. If API returns data: wire new UI to it.

## Design Files (docs/designs/)

landing-design.html, dashboard-design.html, onboarding-design.html, upload-schedule-design.html, search-company-design.html, document-progress-design.html, property-detail-design.html, signup-design.html, signin-design.html, insurance-design.html, insurance-flows-design.html, connected-system-design.html, scout-deep-design.html, deep-product-design.html

## Architecture — 5 Systems

1. Property Profile — enrich-asset.ts, attom.ts, avm.ts, /api/property/*. Models: UserAsset, AssetValuation
2. Document Generator — document-parser.ts, textract.ts, brochure.ts. Models: Document, DocumentExtract
3. Portal System — TransactionRoom, NDASignature models (schema ready)
4. Action Engine — coverforce.ts, energy-quotes.ts, email.ts, /api/quotes/bind
5. Learning Loop — ScoutReaction model, opportunity.ts, tenant-health.ts

## Layout Decision

AppShell (251 lines) — RESTYLE to dark theme. Changes it once, reskins everything.
TopBar (362 lines) — RESTYLE to match design nav bars.
NavContext — USE AS-IS.

## CSS — Use ONLY the new dark theme

ADD: --bg:#09090b --s1:#111116 --s2:#18181f --acc:#7c6af0 --tx:#e4e4ec --grn:#34d399 --red:#f87171 --amb:#fbbf24
DO NOT USE: --color-* (legacy) or --rhq-* (light theme)

## Fonts

Instrument Serif (display), DM Sans (body), JetBrains Mono (data). Add to layout.tsx.

## File Ownership

Frontend: src/app/*/page.tsx, src/components/*, globals.css
Backend: src/app/api/*, src/lib/*, prisma/schema.prisma
Infra: vercel.json, .github/*, package.json, tsconfig.json

## Workflow

1. Feature branch from main
2. npx tsc --noEmit && npm run lint
3. Push branch. Infra merges after QA.
4. Never push directly to main.
