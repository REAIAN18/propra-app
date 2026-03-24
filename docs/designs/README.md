# RealHQ Design References

HTML mockups for each major page redesign. Open in a browser for visual reference.
These are design specs — not production code.

## Files

| File | Ticket | Page | Status |
|---|---|---|---|
| sidebar.html | PRO-633 | Sidebar navigation reorder | Ready |
| dashboard.html | PRO-628 | Main dashboard | Ready |
| add-property.html | PRO-641 | Add Property flow | Ready |
| landing.html | PRO-640 | Landing page | Ready |
| rent-clock.html | PRO-639 | Rent Clock | Ready |
| planning.html | PRO-638 | Planning page | Ready |
| energy.html | PRO-636 | Energy Optimisation | Ready |
| scout.html | PRO-625 | Acquisitions Scout | TODO |
| insurance.html | PRO-627 | Insurance Audit | TODO |
| property-dashboard.html | PRO-635 | Individual asset dashboard | TODO |
| engage-tenants.html | PRO-637 | Engage with Tenants | TODO |

## Global design rules (apply to ALL pages)

- **Primary green**: `#0A8A4C` — buttons, CTAs, active states
- **Dark green hero**: `#173404` — page hero sections
- **Font**: system-ui, then Geist
- **All values are ranges before upload** — never show assumed exact figures (e.g. "$78k–$98k/yr market range")
- **Never assume current premiums/spend** — show market benchmarks with "upload to confirm"
- **Every button must do something real** — or it must not exist
- **Brand rule**: "You approve. RealHQ executes." — never ask user to do the work
- **No "coming soon"** — remove placeholder rows entirely
- **No "commission"** — remove the word from all pages
- **Satellite images**: Google Maps Static API or Mapbox, zoom 18–19, top-down aerial
- **Building polygon**: OpenStreetMap Overpass API — if not found, show NO outline (wrong outline is worse than none)
- **Florida energy**: no supplier switching — tariff optimisation, solar PPA, demand reduction, retrofits, rebates only

## How to use

1. Open any HTML file in a browser
2. Read the yellow note box at the top — it contains the critical rules for that page
3. Build the production page to match the design exactly
4. Check colours, copy, badge labels, and section order
5. Every "Action →" button must link to a real page or trigger a real action
