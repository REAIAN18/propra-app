# RealHQ — Engineering Rules

> **STOP. Read this ENTIRE file before doing anything.**
> **Read DECISIONS.md next.**
> **Read CODE_INVENTORY.md before writing any code.**
> **RESTYLE. REWIRE. EXTEND. Never rebuild what already works.**

## WARNING — IGNORE OLD DOCS

The docs/ folder contains 30+ wave-2-*.md files. THESE ARE OUTDATED AND SCHEDULED FOR DELETION. DO NOT READ THEM. DO NOT REFERENCE THEM. DO NOT USE THEIR FORMAT.

The ONLY authority files are:
- DECISIONS.md (repo root) — product rules
- CLAUDE.md (repo root) — this file, engineering rules
- CODE_INVENTORY.md (repo root) — maps ALL existing code
- docs/designs/*-design.html — pixel-perfect build targets

Everything else in docs/ is legacy. Ignore it completely.

## Existing Codebase

23 lib files, 70+ API routes, 21 UI components, 6 hooks, 32 pages, 54 Prisma models, 30 email functions, 8 cron jobs. All in CODE_INVENTORY.md.

Before creating any new file, check CODE_INVENTORY.md. If similar exists: import and extend. If component looks wrong: restyle, don't duplicate. If API returns data: wire new UI to it.

## Design Files (docs/designs/)

**Active v2 designs (use these, they supersede earlier versions):**
- scout-v2-design.html (supersedes scout-deep-design.html)
- financials-v2-design.html
- income-v2-design.html (supersedes income-design.html)
- transactions-v2-design.html
- work-orders-v2-design.html
- hold-sell-v2-design.html (supersedes hold-sell-design.html)
- planning-v2-design.html
- financing-v2-design.html
- tenants-v2-design.html

**Current pages (no v2):** compliance-design.html, energy-design.html, rent-clock-design.html, utility-pages-design.html (Documents + Ask + Portal only)

**Original approved:** landing-design.html, dashboard-design.html, onboarding-design.html, upload-schedule-design.html, search-company-design.html, document-progress-design.html, property-detail-design.html, signup-design.html, signin-design.html, insurance-design.html, insurance-flows-design.html, connected-system-design.html, property-level-design.html

**RULE:** If a v2 file exists, ALWAYS use it. Never build from the file it supersedes.

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
2. npx tsc --noEmit && npm run lint — FIX ALL ERRORS before pushing. Do not push code that fails type-check.
3. Push branch. Merge to main only after CI passes.
4. After merge: check Vercel dashboard or wait 2 minutes then load https://propra-app-orcin.vercel.app — if the page is broken, YOU fix it immediately. Do not move to next ticket.
5. Never push directly to main.
6. If Vercel build fails, check the build logs, fix the errors, push again. Repeat until build succeeds and site loads.

## Production
Production URL: https://propra-app-orcin.vercel.app
Verify all deploys against this URL. Do NOT use propra.vercel.app or propra-app.vercel.app — those are not this project.
