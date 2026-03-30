# DealScope UI Design Brief — Next Session

> **Hand this + DEALSCOPE-SPEC.md + DEALSCOPE-UK.md + DEALSCOPE-WORKFLOW.md to the next chat.**
> Clone repo: github.com/REAIAN18/propra-app (for design system tokens + existing patterns)

---

## WHAT TO BUILD

A complete HTML design file (`dealscope-design.html`) following the exact same pattern as the RealHQ designs in `docs/designs/`. Dark theme. Same CSS tokens. Same component patterns.

## DESIGN SYSTEM

From RealHQ (use these exact tokens — see any design file in docs/designs/ for full CSS):
- `--bg:#09090b` `--s1:#111116` `--s2:#18181f` `--acc:#7c6af0` `--tx:#e4e4ec` `--grn:#34d399` `--red:#f87171` `--amb:#fbbf24`
- Fonts: Instrument Serif (display), DM Sans (body), JetBrains Mono (data)
- Components: card, row, kpi, row-tag, insight banner, flow pages

## PAGES TO DESIGN (6 screens)

### Screen 1: Portfolio Heatmap (main dashboard — /dealscope)
- Map view showing all flagged properties as coloured pins (red=hot, amber=warm, blue=watch)
- Sidebar with filters: score range, signal type, property type, area, owner type
- KPIs above map: total properties tracked, HOT count, new signals today, outreach in progress
- Click a pin → opens Screen 2
- Source filter bar (Companies House, Gazette, Auction, Listing, Absent Owner, etc.)
- "New signals today" feed on the right side (live updates)

### Screen 2: Property Intelligence Dossier (/dealscope/[propertyId])
This is the hero screen. Everything about one property, auto-assembled.

**Tab: Overview**
- Property photo (Street View), address, type, floor area, EPC rating, year built
- Signal badges (what triggered this property: "ADMINISTRATION", "ABSENT OWNER", "LISTED AUCTION 14 APR")
- Signal timeline (when each signal was detected, chronological)
- Quick stats: estimated value range, suggested offer range, opportunity score

**Tab: Valuation**
- Three methods side by side: Comps, Income Cap, Replacement Cost
- Comparable transactions table (5-10 from Land Registry, with £/sqft, date, distance)
- "What to pay" section with scenario-based discounts
- Confidence score with methodology explanation

**Tab: Opportunity**
- Claude-generated analysis: highest and best use, PD rights, rent reversion potential, capex value-add, split/merge
- Numbers for each opportunity (e.g. "Convert to residential via Class MA: estimated value £2.8M vs current £1.6M = £1.2M uplift minus £400k conversion cost = £800k net opportunity")

**Tab: Risk**
- Risk matrix: flood, contamination, listed, conservation, MEES, structural, tenant, lease, market, legal
- Each risk scored with source and detail
- Overall risk score

**Tab: Owner**
- Owner profile card (company name, status, directors, portfolio size)
- Situation assessment ("In administration since 14 Mar. Begbies Traynor appointed. 3 bridging loans in 12 months.")
- Portfolio map (all properties this owner holds)
- Contact details (registered office, director addresses, managing agent)
- Outreach history (letters sent, responses)

**Tab: Comps**
- Full comparable sales table with map view
- Filter by type, date range, distance
- £/sqft trend chart

### Screen 3: Owner Profile (/dealscope/owners/[ownerId])
- Company/individual details from Companies House
- Financial health indicators (accounts, charges, CCJs)
- All properties they own (from CCOD) with value estimates
- Director network (other companies these directors run)
- Timeline of corporate events (administration, charge created, director resigned, etc.)
- Outreach history across all their properties

### Screen 4: Approach Wizard (flow — from property dossier)
Step 1: Select approach type (administrator, absent owner, tired landlord, probate, dissolved)
Step 2: Claude generates personalised letter — preview with property details, comps, offer range
Step 3: Choose channel (post, email, phone script)
Step 4: Confirm and send (or download letter for posting)
Step 5: Success — letter sent, follow-up date set, tracked in CRM

### Screen 5: Negotiation Dashboard (/dealscope/[propertyId]/negotiate)
- Comparable evidence pack (auto-generated, downloadable PDF)
- Offer calculator: sliders for price, deposit %, completion timeline, conditions
- Leverage assessment (what favours you, what favours seller)
- DD checklist (pre-populated from public data, remaining items listed)
- "Generate offer letter" button → Claude drafts formal offer

### Screen 6: Pipeline CRM (/dealscope/pipeline)
- Kanban: Identified → Researched → Approached → In Negotiation → Under Offer → Completing
- Each card shows: property thumbnail, address, score, owner status, last action, next step
- Filter by area, property type, score, outreach status
- Bulk actions: "Approach all warm properties in SE England"

## SPIN-OFF FLOWS TO INCLUDE

1. **Signal detail** — click a signal badge → shows source, date, raw data, confidence, link to source
2. **Portfolio mapping** — from owner profile, click "View all properties" → map + list of everything they own
3. **Comparable evidence PDF** — preview of the auto-generated PDF that accompanies offers
4. **Bulk approach** — select multiple properties → generate personalised letters for each → review → send all
5. **Alert configuration** — set up alerts: "Notify me when any industrial property in SE England scores >30"

## SAMPLE DATA TO USE

**Property:** Meridian Business Park, Unit 7, Rochester, Kent ME2 4LR
- Industrial/warehouse, 8,200 sqft, built 1992
- EPC rating D, rateable value £42,000
- Last sold 2008 for £620,000
- Owner: Meridian Property Holdings Ltd (Company No. 05847291)
- Company status: IN ADMINISTRATION (since 14 Mar 2026)
- Administrator: Begbies Traynor, Manchester
- Charges: 2 registered — NatWest (2008, £480k) + Octopus Real Estate (2024, £350k bridging)
- Director: James Mitchell, resigned 28 Feb 2026
- Flood risk: Zone 1 (low)
- Nearby comps: £85-£110/sqft for similar industrial in Medway
- Estimated value: £700k-£820k
- Suggested offer: £480k-£560k (administration discount 25-35%)
- Opportunity: MEES upgrade D→B = £35k cost, +£80k value. PD rights for flex use.

**Use this property as the example throughout all screens.**

## REFERENCES
- Read DEALSCOPE-SPEC.md for architecture + global data sources
- Read DEALSCOPE-UK.md for UK-specific data sources + wow signals
- Read DEALSCOPE-WORKFLOW.md for the complete post-identification workflow (this is what you're designing the UI for)
- Study energy-design.html or scout-v2-design.html for the design patterns, CSS, and flow page structure
- The design should feel like the same product family as RealHQ but with its own identity (DealScope branding, not RealHQ branding in the nav)
