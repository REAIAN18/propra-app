# RealHQ — Engineering Rules

> **Read DECISIONS.md first.** It overrides everything else.
> **Read connected-system-design.html** for the product architecture.
> **Read scout-deep-design.html** for the interaction pattern every view should follow.
> **Read dashboard-design.html** for the approved dashboard layout.
> **Read landing-design.html** for the approved landing page.

## The Product Architecture

RealHQ is NOT 16 separate pages. It is 5 systems:

1. **Property Profile** — the central entity. Every piece of data has: source, confidence (verified/estimated/auto-fetched), timestamp. Everything reads from and writes to this.
2. **Document Generator** — one engine: profile data + audience template + Claude narrative → PDF + web portal + Excel. Used for: lender packs, insurance submissions, marketing brochures, investment memos, letting particulars, valuation briefs.
3. **Portal System** — every property has a URL. What's visible depends on who's looking (owner, lender, insurer, buyer, tenant). View tracking, NDA gating, commenting.
4. **Action Engine** — Resend (email), CoverForce (insurance), DocuSign (signing), Claude (extraction, analysis, drafting), Google (maps, solar, places).
5. **Learning Loop** — every interaction (thumbs up/down, document upload, action outcome) improves the next recommendation.

The "modules" (Dashboard, Insurance, Energy, Scout, etc.) are views — different configurations of which profile data to show, which template to use, which action to call.

## Autonomy

Agents make implementation decisions. Only escalate when you need credentials or DECISIONS.md doesn't cover something.

## File Ownership

| Owner | Files |
|-------|-------|
| **Frontend** | src/app/*/page.tsx, src/components/*, globals.css, public/*, brand/* |
| **Backend** | src/app/api/*, src/lib/*, prisma/schema.prisma, scripts/* |
| **Infra** | vercel.json, .github/*, package.json, package-lock.json, tsconfig.json |

## Workflow

1. Feature branch from main
2. npx tsc --noEmit && npm run lint — fix ALL errors
3. Push branch. Infra merges after QA passes.
4. **Never push directly to main.**

## Design System

/brand/design-system.md — Instrument Serif for display numbers. Colour coding: amber=warning, red=act now, green=positive. Never render raw ticket specs as page content.

### Dashboard Rules (from approved design)
- **Hierarchy:** Greeting → KPIs (4-cell strip) → Gross-to-Net card → Actions table → Risk alerts → Insight/recommendation → Portfolio (2-col) → Grow (2-col) → Financing (collapsible)
- **EST tags:** Every estimated number gets a visible EST badge
- **Benchmark colours:** Green with checkmark when outperforming. Amber when below. Red when significantly above market on costs.
- **Deal Finder cards:** Always show match reason text below the property type/cap rate line
- **Transactions:** Show progress bar + percentage + next action text
- **Market-aware copy:** Energy says "optimisation" for regulated markets, "switching" only for deregulated
- **Portal sharing:** Visible prompt before the Portfolio section

## Deploy

Only Infra merges + deploys. Verify on live URL after every deploy. Rollback immediately if broken. Done = works on production URL.

## Problem-Solving

1. Read the full error before acting
2. One change at a time
3. Two attempts max on same approach — then pivot
4. Never create EMERGENCY tickets — comment on existing
