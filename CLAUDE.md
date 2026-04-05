# RealHQ — Engineering Rules

> **STOP. Read this ENTIRE file before doing anything.**
> **Read DECISIONS.md next.**
> **Read CODE_INVENTORY.md before writing any code.**
> **RESTYLE. REWIRE. EXTEND. Never rebuild what already works.**
>
> ## ⚠️ DATABASE — READ THIS FIRST
>
> **Production database is Supabase. NOT Neon. Never use Neon.**
>
> - `DATABASE_URL` → Supabase transaction pooler (port 6543) — use for all app queries
> - - `DIRECT_URL` → Supabase direct connection (port 5432) — use ONLY for `prisma migrate deploy`
>   - - Host: `aws-1-eu-west-1.pooler.supabase.com` (pooler) / `db.okyqtkmfxuyjilmxgrcy.supabase.co` (direct)
>     - - Database name: `postgres` (not `neondb`)
>       - - Never hardcode connection strings — always use env vars
- Never reference `.neon.tech` anywhere — the migration is complete
- - Never drop or modify Neon DB — it is decommissioned
  - - `prisma migrate deploy` runs at build time — if it fails, the Vercel build fails

## ⚠️ MIGRATIONS — BUILD-CRITICAL RULE

**Never create migrations that break the build.** Prisma migrations run at Vercel build time:
- `npx tsc --noEmit` MUST pass before pushing any code
- All TypeScript errors block the build
- Missing API routes referenced in code will cause type generation failures
- If you create a schema change, always scaffold the corresponding API routes
- All functions called in pages/routes must be defined before use (no undefined functions or variables)
- All Prisma models referenced must be defined in the schema; run `npx prisma generate` after schema changes

Rule: Every schema migration MUST have stub API route handlers for any new entities/endpoints, or update existing routes to match schema changes. Run `npx tsc --noEmit` to verify before committing.

## ⚠️ DEMO MODE — PERMANENT RULE — DO NOT BREAK

All feature pages must work without authentication. Demo data shows for unauthenticated users.

- middleware.ts PROTECTED_PREFIXES must ONLY contain /settings, /account, /admin — never feature pages
- Never return 401 or 500 from API routes — return empty JSON when no session
- Never wrap feature pages in auth redirects
- The FL Mixed Portfolio demo data is permanent and must survive all changes

Routes that MUST work without signin:
/dashboard /insurance /energy /rent-clock /scout /assets /planning /financing
/hold-sell /tenants /transactions /income /financials /compliance /work-orders /properties

VERIFICATION:
- https://propra-app-orcin.vercel.app/insurance must load and show 5 policy rows
- No signin redirect, no 500 error

## WARNING — IGNORE OLD DOCS

The docs/ folder contains 30+ wave-2-*.md files. THESE ARE OUTDATED AND SCHEDULED FOR DELETION. DO NOT READ THEM. DO NOT REFERENCE THEM. DO NOT USE THEIR FORMAT.

The ONLY authority files are:
- DECISIONS.md (repo root) — product rules
- CLAUDE.md (repo root) — this file, engineering rules
- CODE_INVENTORY.md (repo root) — maps ALL existing code
- docs/designs/ — pixel-perfect build targets

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

**Current pages (no v2):** compliance-design.html, energy-design.html, rent-clock-design.html, utility-pages-design.html (Documents + Ask + Portal only), missing-pages-design.html

**Original approved:** landingv3.html, dashboard-revised.html, onboarding-design.html, upload-schedule-design.html, search-company-design.html, document-progress-design.html, property-detail-design.html, signup-design.html, signin-design.html, insurance-design.html, insurance-flows-design.html, property-level-design.html

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
4. After merge: wait 2–3 minutes then load https://propra-app-orcin.vercel.app and verify your changes are LIVE. If the page is broken or changes don't appear, investigate and fix before moving on.
5. Never push directly to main.
6. If Vercel build fails, check the build logs, fix the errors, push again. Repeat until build succeeds and site loads.

## ⚠️ DEFINITION OF DONE — ALL 4 STEPS REQUIRED

A ticket is NOT done until ALL of the following are true:
1. **Code written** — .tsx/.ts files created at the correct paths
2. **TypeScript compiles** — `npx tsc --noEmit` passes with zero errors
3. **Merged to main** — PR reviewed and merged, CI green
4. **Deployed and verified live** — https://propra-app-orcin.vercel.app shows the change

**Do not mark a ticket Done without completing Step 4.** Merging to main is not enough — confirm the Vercel deployment succeeded and the feature is visible on the production URL.

## Production
Production URL: https://propra-app-orcin.vercel.app
Verify all deploys against this URL. Do NOT use propra.vercel.app or propra-app.vercel.app — those are not this project.

## ⚠️ CORRECT WORKING DIRECTORY

**Always work from `/Users/ianbaron/Documents/projects/propra-app`** — this is the live GitHub-connected repo.

Do NOT use `/Users/ianbaron/Documents/projects/propra` — that directory is not a git repository and is disconnected from GitHub. Deploying from it will push stale/wrong code to production.
