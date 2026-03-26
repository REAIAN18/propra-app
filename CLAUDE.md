# RealHQ — Engineering Rules

> **Read DECISIONS.md first.** It overrides everything else.
> **Read CODE_INVENTORY.md before writing any code.** It maps every existing file. USE what exists.
> **RESTYLE. REWIRE. EXTEND. Never rebuild what already works.**

## CRITICAL: Use Existing Code

There are 23 library files, 25 API routes, 21 UI components, 6 hooks, and 32 page routes already built. Many have working API integrations (CoverForce, Land Registry, Resend, energy quotes, document parsing, planning feeds, SOFR rates, tenant health scoring, hold-sell modelling).

Before creating any new file, check CODE_INVENTORY.md. If something similar exists, import it and extend it. If a component exists but looks wrong, restyle it — don't create a duplicate. If an API route returns data, wire the new UI to it — don't create a new endpoint.

## Design References

- connected-system-design.html — product architecture
- scout-deep-design.html — interaction pattern every view should follow
- dashboard-design.html — approved dashboard layout
- landing-design.html — approved landing page

All in docs/designs/. These are the pixel-perfect build targets.

## The Product Architecture

RealHQ is NOT 16 separate pages. It is 5 systems:

1. **Property Profile** — central entity. Source, confidence, timestamp on every data point.
2. **Document Generator** — profile data + audience template + Claude narrative = PDF + portal + Excel.
3. **Portal System** — every property has a URL. Different audiences see different views.
4. **Action Engine** — Resend, CoverForce, DocuSign, Claude, Google APIs. Already integrated in src/lib/.
5. **Learning Loop** — every interaction improves the next recommendation.

## Autonomy

Agents make implementation decisions. Only escalate when you need credentials or DECISIONS.md doesn't cover something.

## File Ownership

| Owner | Files |
|-------|-------|
| **Frontend** | src/app/*/page.tsx, src/components/*, globals.css, public/*, brand/* |
| **Backend** | src/app/api/*, src/lib/*, prisma/schema.prisma, scripts/* |
| **Infra** | vercel.json, .github/*, package.json, tsconfig.json |

## Workflow

1. Feature branch from main
2. npx tsc --noEmit && npm run lint — fix ALL errors
3. Push branch. Infra merges after QA passes.
4. **Never push directly to main.**

## Design System

Instrument Serif for display numbers. DM Sans for body. JetBrains Mono for data.
Colour coding: amber=warning, red=act now, green=positive.
Dark theme: --bg: #09090b, --acc: #7c6af0, --grn: #34d399, --red: #f87171, --amb: #fbbf24.

### Dashboard Rules
- Hierarchy: Greeting → KPIs → G2N → Actions → Risk alerts → Insight → Portfolio → Grow → Financing (collapsible)
- EST tags on all estimated numbers
- Benchmarks: green=outperforming, amber=below, red=costs above market
- Deal Finder: always show match reason text
- Transactions: progress bar + % + next action
- Energy: "optimisation" for regulated markets, "switching" only for deregulated
- Portal sharing prompt before Portfolio section

## Deploy

Only Infra merges + deploys. Verify on live URL after every deploy. Rollback if broken.

## Problem-Solving

1. Read the full error before acting
2. One change at a time
3. Two attempts max on same approach — then pivot
4. Never create EMERGENCY tickets
