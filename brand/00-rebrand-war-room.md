# Rebrand War Room Brief
**Decision:** Propra → Arca
**Date:** 2026-03-18
**Status:** EXECUTE NOW — product goes live in days

---

## The Decision

The name is **Arca**. Primary domain is `arca.ai`.

This is not under review. The reasoning is in `01-naming.md`. The full brand system is in `03-brand-guidelines.md`. This document exists only to tell you what to do today.

---

## Day 1 Actions (Do These First)

### 1. Register domains — before anything else
| Domain | Action | Priority |
|---|---|---|
| `arca.ai` | Register immediately | **Critical — block everything else** |
| `getarca.com` | Register as redirect | High |
| `arcahq.com` | Register as defensive | Medium |
| `arca.com` | Check — likely taken, document status | Medium |

If `arca.ai` is unavailable: pivot to `getarca.com` as primary, register `arca.io` as backup. Do not pick a new name — work the domain, not the brand.

### 2. Trademark check — same day as domain
Search USPTO (Class 36, Class 42) and UK IPO for "Arca" in:
- Financial services / insurance (Class 36)
- Software / SaaS (Class 42)
- Real estate services (Class 37)

If clear: proceed. If conflicted in CRE specifically: escalate immediately. A conflicting filing in an unrelated sector (e.g. shipping) is not a blocker — document and proceed.

### 3. Codebase rename — today
27 references across 9 files. All are `Propra` → `Arca` substitutions. Run this or do them individually:

```bash
# Dry run first
grep -rn "Propra\|propra" src/ --include="*.ts" --include="*.tsx"

# Replace in source (macOS sed)
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/Propra/Arca/g; s/propra/arca/g'

# Update package.json name
sed -i '' 's/"name": "propra"/"name": "arca"/' package.json
```

**Files confirmed affected (27 instances):**

| File | Instances |
|---|---|
| `src/app/layout.tsx` | 1 — meta title |
| `src/app/page.tsx` | 4 — homepage hero and how-it-works copy |
| `src/components/layout/Sidebar.tsx` | 1 — nav wordmark |
| `src/app/energy/page.tsx` | 5 — benchmark labels, fee card, status copy |
| `src/app/insurance/page.tsx` | 6 — step descriptions, benchmark labels, fee card, status copy |
| `src/app/income/page.tsx` | 3 — fee card, scan prompt, progress label |
| `src/app/scout/page.tsx` | 3 — scan status, negotiation label, monitoring label |
| `src/app/compliance/page.tsx` | 2 — renewal status labels |
| `src/app/hold-sell/page.tsx` | 1 — analysis label |
| `package.json` | 1 — project name |

After rename, verify no `Propra` remains: `grep -r "Propra" src/`

### 4. Update meta and OG tags
In `layout.tsx`:
- Title: `"Arca — Every asset earning what it should."`
- Description: `"AI-powered portfolio intelligence for commercial owner-operators. Arca surfaces every gap in your portfolio and closes it. Commission-only."`
- OG image: create at 1200×630 — Vault background, arch mark, tagline in Instrument Serif

### 5. Email / communications
- Reserve `@arca.ai` for email (set up on domain registration)
- Check social handle availability: `@arcahq` or `@getarca` on LinkedIn and X
- Update any existing pitch deck, one-pager, or investor comms with the new name

---

## What Doesn't Change

- Colour palette: unchanged — Vault, Gain, Signal, Decision
- Typography: Instrument Serif + Geist — unchanged
- Product positioning: unchanged — commission-only, outcomes-first, owner-operator focus
- Feature names: G2N, Rent Clock, Hold vs Sell, Ask [Propra] AI → Ask Arca — all carry forward
- The hero line: **"Most property software tells you what's wrong. Arca fixes it."** — unchanged except the name

---

## Document Index

| Doc | Purpose | Status |
|---|---|---|
| `00-rebrand-war-room.md` | This file — execution brief | Active |
| `01-naming.md` | Name candidates, rationale, recommendation | **DECIDED: Arca** |
| `02-messaging.md` | Taglines, elevator pitch, value prop, feature copy, tone | Production-ready |
| `03-brand-guidelines.md` | Full visual identity system — logo, colour, type, motion | Production-ready |
| `04-competitive-differentiation.md` | Competitive map, battlecards, category creation strategy | Production-ready |

---

## If Something Breaks

**Domain `arca.ai` is taken:** Use `getarca.com` as primary. Still brand as Arca. Do not change the name.

**Trademark conflict in CRE:** If a direct CRE competitor holds "Arca" in Class 36/37/42, escalate to legal immediately. Fallback name: **Cairn** — see `01-naming.md` for full rationale.

**Team pushback on the name:** The decision is made. Direct to `01-naming.md` for reasoning. The product goes live in days — this is not the week for a naming committee.

---

*Questions go to brand lead. This document supersedes any prior name discussions. Arca is the name.*
