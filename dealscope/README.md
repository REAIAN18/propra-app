# DealScope Build Package

## Start here

1. **Open `CTO-BUILD-TICKET.docx`** — the master ticket with sprint breakdown
2. **Open `designs/00-reference-product.html`** in a browser — see the full product
3. **Read specs in order:** BUILD-SPEC.md → ADDENDUM.md → FINAL.md

## File structure

```
CTO-BUILD-TICKET.docx              ← Master ticket for CTO (start here)
README.md                          ← This file

specs/  (5 documents)
  DEALSCOPE-BUILD-SPEC.md           ← Master spec (routes, APIs, models, components)
  DEALSCOPE-BUILD-SPEC-ADDENDUM.md  ← Corrections (discovered infrastructure, Market tab)
  DEALSCOPE-BUILD-SPEC-FINAL.md     ← Token economy, currency, images, owner intel
  DEALSCOPE-GAP-ANALYSIS.md         ← Code audit of existing repo
  DEALSCOPE-DESIGN-INVENTORY.md     ← Checklist of all designs

designs/  (8 HTML files — open in browser, use navigator bar at top)
  00-reference-product.html         ← Full product in one file (start here)
  01-home-search-states.html        ← 17 states: Home, Search, Address, Company
  02-dossier-full.html              ← 8 states: Dossier (8 tabs + partial data)
  03-pipeline-alerts-settings.html  ← 8 states: Pipeline, Alerts, Settings
  04-actions-exports.html           ← 13 states: Modals, PDF previews, toasts
  05-onboarding-email-advanced.html ← 17 states: Onboarding, Emails, Advanced
  06-market-intelligence-errors.html← 5 states: Market tab, friendly errors
  07-gap-fills.html                 ← 18 states: Score variants, no-data tabs,
                                      input/drag states, letter edit, post-send,
                                      excel specs, phone script, all missing emails
```

## Totals

- 16 files in this package
- 86 individual design states across 8 HTML files
- 5 specification documents
- 1 CTO build ticket (Word doc with sprint breakdown)
- 8 new pages at /scope/*
- 19 API endpoints
- 6 new Prisma models + 8 extended
- 15 export document types
- 25 reusable React components

## Build rules

1. Design files are the source of truth for UI
2. Written specs describe data flow and architecture
3. If they conflict, the design files win
4. Every state in the navigator bar must be built
5. Do NOT invent UI that isn't in the designs
6. Do NOT break existing /scout, /dealscope, /elevate routes
7. Build everything at /scope/*

## Repository

GitHub: REAIAN18/propra-app
Branch: create feature/dealscope-v2 from main
