# PRO-825: DealScope — Rebuild from Design File

**Status:** Ready to build
**Priority:** HIGH
**Design file:** `docs/designs/dealscope-design.html` (2,795 lines — 6 screens, all flows)
**Specs:** `docs/DEALSCOPE-SPEC.md`, `docs/DEALSCOPE-UK.md`, `docs/DEALSCOPE-WORKFLOW.md`

---

## CRITICAL — READ BEFORE STARTING

1. **DELETE everything at `src/app/dealscope/` and `src/app/api/dealscope/`** — the previous build was wrong. It built a manual lookup tool. DealScope is an automated intelligence platform.
2. **Open `docs/designs/dealscope-design.html` in a browser.** That is what you are building. Pixel-match it.
3. **Read DECISIONS.md and CODE_INVENTORY.md** before writing any code.
4. **Do NOT invent features, layouts, or flows that aren't in the design file.**

---

## WHAT TO BUILD

6 pages. Build them in this order. Each page MUST match the corresponding screen in the design file.

### Page 1: Portfolio Heatmap (`/dealscope`)
- Screen 1 in design file
- Map with coloured pins (hot/warm/watch)
- KPI strip above map
- Signal feed sidebar
- Source filter bar
- This is the MAIN page — what users see first

### Page 2: Property Dossier (`/dealscope/[propertyId]`)
- Screen 2 in design file
- Tabbed: Overview, Valuation, Opportunity, Risk, Owner, Comps
- Auto-populated from public data APIs
- Signal badges + timeline
- This is the HERO screen — spend the most time here

### Page 3: Owner Profile (`/dealscope/owners/[ownerId]`)
- Screen 3 in design file
- Company details from Companies House
- Portfolio map (all properties this owner holds)
- Financial health indicators
- Outreach history

### Page 4: Approach Wizard (`/dealscope/[propertyId]/approach`)
- Screen 4 in design file
- Step-by-step: select type → Claude generates letter → preview → choose channel → send
- Claude generates personalised approach letter using property + owner context

### Page 5: Negotiation Dashboard (`/dealscope/[propertyId]/negotiate`)
- Screen 5 in design file
- Comparable evidence pack
- Offer calculator with sliders
- Leverage assessment
- DD checklist (pre-populated)

### Page 6: Pipeline CRM (`/dealscope/pipeline`)
- Screen 6 in design file
- Kanban: Identified → Researched → Approached → Negotiating → Under Offer → Completing
- Property cards with score, owner status, last action

---

## API ROUTES NEEDED

Keep these minimal. Wire to the design, don't over-engineer.

| Route | Purpose |
|-------|---------|
| `GET /api/dealscope/properties` | List scored properties with signals |
| `GET /api/dealscope/properties/[id]` | Full property dossier data |
| `GET /api/dealscope/properties/[id]/signals` | Signal history for property |
| `GET /api/dealscope/properties/[id]/comps` | Comparable transactions |
| `GET /api/dealscope/owners/[id]` | Owner profile + portfolio |
| `POST /api/dealscope/properties/[id]/approach` | Generate + send approach letter |
| `GET /api/dealscope/pipeline` | Pipeline stages with counts |
| `PATCH /api/dealscope/pipeline/[id]` | Move property between stages |
| `POST /api/dealscope/enrich` | Enrich a property from public data (keep existing) |

---

## WHAT NOT TO DO

- Do NOT build a "paste an address" lookup tool. That's not DealScope.
- Do NOT create new component libraries. Use existing RealHQ components (RESTYLE for DealScope branding).
- Do NOT spend time on scraper infrastructure. Use demo data for now. The scrapers come later.
- Do NOT merge to main until `npx tsc --noEmit && npm run lint` passes.
- Do NOT skip reading the design file.

---

## DEMO DATA

Use the sample property from the design file for demo/fallback data:
- Meridian Business Park, Unit 7, Rochester, Kent ME2 4LR
- Industrial/warehouse, 8,200 sqft, built 1992, EPC D
- Owner: Meridian Property Holdings Ltd — IN ADMINISTRATION
- Administrator: Begbies Traynor
- Charges: NatWest £480k (2008) + Octopus Real Estate £350k bridging (2024)
- Estimated value: £700k–£820k
- Suggested offer: £480k–£560k

Plus 10–15 more demo properties at varying score levels (hot/warm/watch/cold) to populate the map and pipeline.

---

## ACCEPTANCE CRITERIA

- [ ] All 6 pages render matching the design file
- [ ] Property dossier has all 6 tabs with data
- [ ] Approach wizard generates letter via Claude
- [ ] Pipeline kanban works (drag between stages)
- [ ] Demo data populates all screens
- [ ] Dark theme matches RealHQ design system
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
