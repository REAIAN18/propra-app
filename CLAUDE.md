# RealHQ — Engineering Rules

> ## 🚨 DEPLOYMENT FREEZE — ACTIVE (PRO-1010)
> **ALL DEPLOYMENTS ARE FROZEN. Board directive issued 2026-04-06.**
> - Do NOT run `vercel --prod` or any deploy command
> - Do NOT trigger GitHub Actions deploys
> - Do NOT push code intended for immediate deployment
> - Push code to main for review ONLY — it will NOT be deployed until freeze is lifted
> - **Only the board can lift this freeze.**

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

## ⚠️ CRITICAL: How to Review Design Files

Design files in `dealscope/designs/` are HTML files meant to be **VIEWED**, not read as code.

**WRONG WAY (What agents currently do):**
- ❌ Read the `.html` file using the Read tool
- ❌ Parse CSS variables and hex codes
- ❌ Try to reconstruct the visual design from HTML/CSS code
- ❌ Guess what it looks like without seeing it

**RIGHT WAY (What agents MUST do):**
- ✅ Open the design file in a browser: `file:///Users/ianbaron/Documents/projects/propra-app/dealscope/designs/02-dossier-full.html`
- ✅ Take a screenshot of the design file
- ✅ Open the live site in another tab
- ✅ Take a screenshot of the live site
- ✅ Compare the two screenshots side-by-side
- ✅ Verify they match visually

**Example Design Files:**
- `dealscope/designs/02-dossier-full.html` — Full property analysis page
- `dealscope/designs/03-list.html` — Property list view
- `dealscope/designs/04-card.html` — Property card component
- `dealscope/designs/05-hero.html` — Hero panel design
- `dealscope/designs/06-tabs.html` — Tab navigation design
- `dealscope/designs/07-financials.html` — Financials tab design
- `dealscope/designs/08-planning.html` — Planning tab design

**When Reviewing Tickets:**
1. Open the design file in browser (use `file://` URL)
2. Screenshot the design
3. Open the live site
4. Screenshot the live implementation
5. Compare visually — do they match?

**DO NOT:**
- Read HTML source and try to visualize it
- Parse CSS and guess colors/spacing
- Assume what it looks like from code

> **Design files are VISUAL references. LOOK at them, don't READ them.**

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

## ⚠️ DEPLOYMENT — CRITICAL RULES — FREEZE IN EFFECT

**🚨 DEPLOYMENT FREEZE ACTIVE (PRO-1010) — NO DEPLOYMENTS BY ANY MEANS.**

**NEVER run `vercel --prod`, `vercel deploy`, or any Vercel CLI deploy command.**

### Current deployment state (freeze active)
- **Git push to main** — does NOT auto-deploy (disabled)
- **GitHub Actions schedule** — paused, `workflow_dispatch` only
- **Manual CLI deploy** — FORBIDDEN
- **Who can deploy** — board only, by manually triggering GitHub Actions `workflow_dispatch`

### What agents must do
1. Push code to main (git push only)
2. TypeScript must compile — `npx tsc --noEmit` passes
3. **Do NOT run `vercel --prod`** — this wastes budget and creates duplicate deployments
4. For verification: check `vercel list --prod` to confirm your commit hash appears in the most recent Ready deployment

Running `vercel --prod` or `vercel deploy` is a **budget violation** — each deploy costs money and the board has explicitly forbidden excess deployments (PRO-1007).

## Workflow

1. Feature branch from main
2. `npx tsc --noEmit && npm run lint` — FIX ALL ERRORS before pushing. Do not push code that fails type-check.
3. Push branch. Merge to main only after CI passes.
4. After merge: your changes will be live on the next scheduled deploy (every 4h). Check `vercel list --prod` to confirm commit is deployed. Do NOT trigger a manual deploy.
5. Never push directly to main.
6. If the TypeScript build fails locally, fix it before pushing — do not rely on Vercel to catch errors.

## ⚠️ DEFINITION OF DONE — ALL 4 STEPS REQUIRED

A ticket is NOT done until ALL of the following are true:
1. **Code written** — .tsx/.ts files created at the correct paths
2. **TypeScript compiles** — `npx tsc --noEmit` passes with zero errors
3. **Merged to main** — PR reviewed and merged, CI green
4. **Verified on production** — run `vercel list --prod` and confirm your commit appears in a Ready deployment, then load https://propra-app-orcin.vercel.app to verify visually

**Do not mark a ticket Done without completing Step 4.** Do NOT run `vercel --prod` to force a deployment — wait for the scheduled deploy or ask the board to trigger a manual deploy via GitHub Actions.

## Production
Production URL: https://propra-app-orcin.vercel.app
Verify all deploys against this URL. Do NOT use propra.vercel.app or propra-app.vercel.app — those are not this project.

## ⚠️ CORRECT WORKING DIRECTORY

**Always work from `/Users/ianbaron/Documents/projects/propra-app`** — this is the live GitHub-connected repo.

Do NOT use `/Users/ianbaron/Documents/projects/propra` — that directory is not a git repository and is disconnected from GitHub. Deploying from it will push stale/wrong code to production.
