# DealScope: Complete Design Inventory

Every screen, modal, state, export, and action result that needs a design.

---

## 1. HOME PAGE

### 1.1 States
- [ ] **Empty state** — new user, no mandates, no alerts, no history
- [ ] **Active state** — mandates with counts, alerts feed, pipeline snapshot (current mockup)
- [ ] **Loading state** — skeleton while data loads

### 1.2 Input bar actions
- [ ] **Address entered** → transition to Address Results page
- [ ] **URL pasted** → loading spinner in input → transition to Dossier (enrichment)
- [ ] **Company name entered** → transition to Company Results page
- [ ] **PDF dropped** → upload progress bar → extraction status → transition to Dossier
- [ ] **Text pasted** (modal or expanded area) → address extraction → transition to Dossier

### 1.3 Modals from home
- [ ] **Create mandate modal** — name, client (optional), criteria wizard (source, asset class, location, price, size, EPC, yield, signals)
- [ ] **Edit mandate modal** — same as create, pre-filled
- [ ] **Delete mandate confirmation**

---

## 2. SEARCH PAGE

### 2.1 States
- [ ] **Initial state** — no source selected, empty results area with prompt
- [ ] **Filtered state** — source(s) selected, results showing (current mockup)
- [ ] **No results state** — filters too narrow, "No properties match. Try broadening your search."
- [ ] **Loading state** — skeleton cards while results load

### 2.2 Source cards
- [ ] **Unselected state**
- [ ] **Selected state** (one or multiple)
- [ ] **Hover state**

### 2.3 Result card actions
- [ ] **Hover state** — border glow, slight lift
- [ ] **Click** → navigates to Dossier
- [ ] **Right-click / long-press context menu** — "Open dossier", "Add to pipeline", "Watch", "Save", "Dismiss"
- [ ] **Bulk select mode** — checkboxes appear, bulk action bar at bottom ("Add 5 to pipeline", "Export 5 as CSV")

### 2.4 Filter interactions
- [ ] **Chip toggle** — active/inactive states
- [ ] **Range slider** — thumb position, value label updates
- [ ] **Location text input** — autocomplete dropdown with postcode/town suggestions
- [ ] **EPC F-G chip** — red-tinted active state (danger signal)

### 2.5 Save as mandate
- [ ] **Form state** — name field, client field, save buttons
- [ ] **Success toast** — "Mandate saved. Alerts enabled."
- [ ] **Mandate created** → appears on home page

### 2.6 Sort options
- [ ] **Active sort chip** — highlighted state for Relevance/Price/Score/Newest

### 2.7 Export
- [ ] **Export CSV** — download triggered, toast confirmation

---

## 3. ADDRESS RESULTS PAGE

### 3.1 States
- [ ] **Property found in database** — highlighted match card + nearby results (current mockup)
- [ ] **Property NOT in database** — "Not tracked. Analyse now?" card + nearby results
- [ ] **No nearby results** — match card only, "No tracked properties nearby"
- [ ] **Multiple matches** — ambiguous address, "Did you mean?" with options
- [ ] **Loading state** — geocoding spinner, then results populate

### 3.2 Actions
- [ ] **"Open dossier" button** → navigates to existing property dossier
- [ ] **"Analyse this property" button** → triggers enrichment → loading → Dossier
- [ ] **Nearby result click** → navigates to that property's dossier
- [ ] **"Show more nearby" link** → expanded results

---

## 4. COMPANY RESULTS PAGE

- [ ] **Company found** — company profile card (name, number, status, directors) + all properties owned by this company
- [ ] **Company not found** — "No company found for [query]. Try a different name or company number."
- [ ] **Multiple companies** — disambiguation list ("Did you mean?")
- [ ] **Company with multiple properties** — list of all properties with signal badges, ability to bulk-add to pipeline

---

## 5. DOSSIER PAGE

### 5.1 Header
- [ ] **Image gallery** — hero image with thumbnail strip below
- [ ] **Thumbnail click** → hero image swaps
- [ ] **"+3 more" thumbnail** → opens full gallery modal
- [ ] **Gallery modal** — full-screen lightbox with left/right navigation, download buttons per image
- [ ] **Property not enriched yet** — loading state with progress indicators per data source ("EPC ✓, Land Registry ✓, Companies House loading...")

### 5.2 Summary panel
- [ ] **Score ring** — green (7+), amber (5-7), red (<5) with glow
- [ ] **No score yet** — gray ring with "Analysing..."

### 5.3 Action buttons
- [ ] **"Approach Owner" click** → scrolls to Approach tab or opens approach modal
- [ ] **"+ Pipeline" click** → stage selection dropdown → toast "Added to pipeline (Identified)"
- [ ] **Pipeline stage dropdown** — Identified / Researched / Approached / Negotiating / Under Offer / Completing
- [ ] **"Watch" click** → watch reason modal → toast "Added to watchlist"
- [ ] **Watch reason modal** — "Monitoring price", "Awaiting admin resolution", "Auction approaching", "Custom reason"
- [ ] **"Export PDF" click** → PDF generation loading → download triggered
- [ ] **"Download .xlsx" click** → spreadsheet generation → download triggered

### 5.4 Tab: Property
- [ ] **Full state** — AI summary, image gallery, specs, EPC details (current mockup)
- [ ] **Partial data** — some fields show "Data unavailable" or "Requires manual input"
- [ ] **Image gallery** — satellite, street view, brochure photos, floor plans, site plans, EPC cert, title plan
- [ ] **Each image** — hover shows download button
- [ ] **Floor plan extracted from PDF** — labeled "Extracted from brochure"
- [ ] **EPC upgrade recommendations** — expandable detail per recommendation

### 5.5 Tab: Planning
- [ ] **Full state** — zone info, restrictions, planning history table (current mockup)
- [ ] **Planning application click** → expands with full description, officer notes, decision reason
- [ ] **"Nearby" planning apps** — distinguished from "This property" applications
- [ ] **Permitted development rights** — expandable analysis card
- [ ] **No planning data** — "No planning history found. This property may pre-date digital records."

### 5.6 Tab: Title & Legal
- [ ] **Full state** — title details, heritage/protection, sales history table (current mockup)
- [ ] **Sales history chart** — price over time line chart (optional, alongside table)
- [ ] **Title plan image** — downloadable, with boundary highlighted
- [ ] **Charges detail** — expandable per charge (lender, amount, date, satisfaction status)
- [ ] **Covenants** — expandable with full covenant text
- [ ] **No title data** — "Title not registered digitally. Contact Land Registry for paper title."

### 5.7 Tab: Environmental
- [ ] **Full state** — flood risk, ground conditions, risk bars (current mockup)
- [ ] **Flood zone map** — embedded or linked to EA flood map
- [ ] **Contamination detail** — expandable with source, remediation estimate
- [ ] **Phase 1 recommendation card** — cost estimate, recommended providers
- [ ] **No environmental data** — "Environmental data unavailable for this location."

### 5.8 Tab: Ownership
- [ ] **Full state** — company profile, charges, directors, other properties (current mockup)
- [ ] **Director click** → expands with other directorships, appointment dates, nationality
- [ ] **Other property click** → navigates to that property's dossier
- [ ] **"Approach all 3 properties" button** — for portfolio/bulk deal
- [ ] **Gazette notices** — expandable list of insolvency notices
- [ ] **No ownership data** — "Owner not identified. Property may be individually owned."

### 5.9 Tab: Financials
- [ ] **Valuation cards** — 3 methods with confidence indicators (current mockup)
- [ ] **Scenario tabs** — Hold as-is / MEES upgrade + let / Refurb + sell
- [ ] **Scenario detail** — full P&L: purchase, SDLT, acquisition costs, annual rent, voids, costs, financing, exit value, profit, IRR, equity multiple
- [ ] **Sliders** — purchase price, rent growth, exit yield, LTV, interest rate, hold period
- [ ] **Slider interaction** — all financials recalculate live as slider moves
- [ ] **Comparable sales table** — sortable by price, date, distance, £/sqft
- [ ] **Downloads section** — xlsx financial model, xlsx comps pack, PDF investment memo, PDF evidence pack
- [ ] **Download click** → loading state → download triggered → toast
- [ ] **"Generate" click (for PDFs)** → generation progress → preview modal → download
- [ ] **Cost breakdown** — acquisition costs, holding costs (annual), refurb costs (if applicable), exit costs
- [ ] **Elevate integration card** — "Annual costs: £X. Elevate can reduce by Y%. [Open Elevate]"

### 5.10 Tab: Approach
- [ ] **Approach type cards** — Administrator, Lender, Director, Bulk deal (current mockup)
- [ ] **Type selection** → letter regenerates for that recipient
- [ ] **Tone chips** — Formal / Direct / Consultative
- [ ] **Tone change** → letter regenerates
- [ ] **Channel chips** — Post + PDF / Email / Phone script
- [ ] **Channel change** → updates delivery summary
- [ ] **Letter preview** — scrollable, editable
- [ ] **"Edit" click** → letter becomes editable textarea
- [ ] **"Regenerate" click** → loading spinner → new letter appears
- [ ] **"Send & Track" click** → confirmation modal → sending state → success toast
- [ ] **Send confirmation modal** — summary (property, recipient, type, offer range, channel), "Confirm send" / "Cancel"
- [ ] **Post-send state** — "Sent via [channel] on [date]. Follow-up set for [date]. [View in pipeline]"
- [ ] **DD checklist** — checkboxes, remaining cost total
- [ ] **DD checkbox click** → marks done, updates remaining cost
- [ ] **Negotiation leverage** — buyer vs seller cards
- [ ] **Offer calculator** — sliders for price, deposit, completion timeline
- [ ] **"Generate offer letter" button** → separate formal offer letter (distinct from approach letter)

---

## 6. PIPELINE PAGE

### 6.1 States
- [ ] **Empty state** — no deals in pipeline, "Add your first deal from search or dossier"
- [ ] **Active state** — kanban with cards (current mockup)
- [ ] **Filtered by mandate** — chip selection filters cards

### 6.2 Kanban interactions
- [ ] **Card hover** — lift + border glow
- [ ] **Card click** → navigates to dossier
- [ ] **Card drag** → moves between columns (stage change)
- [ ] **Card drop** → stage update toast, timestamp logged
- [ ] **Card context menu** (right-click) — "Open dossier", "Change stage", "Log response", "Set follow-up", "Archive", "Remove"

### 6.3 Card detail modal (click on card)
- [ ] **Quick view** — property summary, current stage, last activity, next action
- [ ] **Stage history timeline** — when it moved through each stage
- [ ] **Notes section** — add/view notes per deal
- [ ] **Response log** — "Interested" / "Not interested" / "Maybe" / "No response" buttons
- [ ] **Follow-up date picker** — set next action date
- [ ] **Approach history** — letters sent, dates, channels, responses

### 6.4 Pipeline controls
- [ ] **Mandate filter chips** — All / SE Industrial / London Office / etc.
- [ ] **"Bulk approach" button** → select multiple cards → batch approach modal
- [ ] **Batch approach modal** — "Send approach letter to 5 properties. Approach type: [auto-detect per property]. Channel: [select]. Confirm."
- [ ] **Pipeline analytics** — total value, conversion rate, avg days per stage, velocity
- [ ] **Analytics expanded view** — charts for conversion funnel, time-in-stage distribution

### 6.5 Export
- [ ] **Export pipeline as CSV** — all deals with stages, dates, values
- [ ] **Export pipeline as PDF report** — formatted pipeline summary for stakeholders

---

## 7. ALERTS PAGE

### 7.1 States
- [ ] **Empty state** — no alerts, "Set up mandates to receive alerts"
- [ ] **Active state** — alert feed with filter chips (current mockup)
- [ ] **All read state** — no unread indicators

### 7.2 Alert interactions
- [ ] **Alert click** → navigates to relevant dossier
- [ ] **Alert hover** — subtle highlight
- [ ] **Swipe/dismiss** — archives alert
- [ ] **"Snooze" action** — snooze for 1 day / 3 days / 1 week
- [ ] **"Mark as read" per alert**
- [ ] **"Mark all read" button**

### 7.3 Alert types (each needs distinct visual treatment)
- [ ] **New signal match** — red icon, property card inline
- [ ] **Price change** — amber icon with direction arrow (↓ or ↑)
- [ ] **Status change** — amber icon, "Company X changed status"
- [ ] **Deadline approaching** — amber icon with countdown ("5 days")
- [ ] **Portfolio opportunity** — green icon, diversification context
- [ ] **Follow-up due** — blue icon, "Approached X days ago, no response"
- [ ] **Deal completed** — green icon, celebration state

### 7.4 Alert settings (inline or link to Settings)
- [ ] **Filter by type** — chips for each alert type
- [ ] **Filter by mandate** — "Show only SE Industrial alerts"

---

## 8. SETTINGS PAGE

### 8.1 Default criteria section
- [ ] **Asset class chips** — toggle on/off
- [ ] **Location chips** — toggle on/off
- [ ] **Signal chips** — toggle on/off
- [ ] **Exclude chips** — red-tinted, toggle on/off
- [ ] **Price range sliders**
- [ ] **Yield range sliders**

### 8.2 Alert settings section
- [ ] **In-app toggle**
- [ ] **Email digest** — Daily / Weekly / Off chips
- [ ] **Urgent push toggle** — for auction deadlines, admin filings
- [ ] **Min score slider** — 0-10 with value display
- [ ] **Email preview** — "Here's what your daily digest will look like"

### 8.3 Portfolio section
- [ ] **Portfolio table** — property, type, location, value
- [ ] **"+ Add property" button** → add property modal
- [ ] **Add property modal** — address input, type dropdown, value field, or "Import from Elevate"
- [ ] **"Sync from Elevate" button** → loading → success toast with count
- [ ] **Edit property row** → inline edit or modal
- [ ] **Delete property** → confirmation
- [ ] **Portfolio health summary** — concentration chart, diversification score

### 8.4 Profile section
- [ ] **User name, email, company**
- [ ] **Approach letter defaults** — default signatory name, company name, contact details
- [ ] **Currency preference** — GBP / USD
- [ ] **Region preference** — UK / US / Both

### 8.5 Mandate management section
- [ ] **List of all mandates** — with edit/delete/pause
- [ ] **Mandate detail** — criteria summary, match count, alert frequency, client name
- [ ] **Pause/resume mandate toggle**

---

## 9. EXPORTS & GENERATED DOCUMENTS

### 9.1 Investment memo (PDF)
- [ ] **Page 1: Executive summary** — property photo, address, key metrics, opportunity score, narrative, recommendation (Proceed / Pass / More analysis)
- [ ] **Page 2: Financial analysis** — valuation (3 methods), scenario summary (3 paths), cost breakdown
- [ ] **Page 3: Risk assessment** — risk matrix bars, key concerns, mitigants
- [ ] **Page 4: Market context** — comparable sales table, market position, rent gap analysis
- [ ] **Appendix** — full data tables, data source citations
- [ ] **Cover page** — DealScope branding, property address, date, analyst name
- [ ] **PDF generation loading state** — progress bar
- [ ] **PDF preview modal** — scrollable preview before download

### 9.2 Financial model (Excel)
- [ ] **Tab 1: Summary** — key inputs, key outputs, 3 scenarios side-by-side
- [ ] **Tab 2: Assumptions** — all editable inputs with current values
- [ ] **Tab 3: Cash flow** — 5-year (or custom) annual cash flow projection
- [ ] **Tab 4: Sensitivity analysis** — purchase price vs exit yield matrix
- [ ] **Tab 5: Comps** — comparable transactions data
- [ ] **Tab 6: Costs** — acquisition, holding, refurb, exit cost breakdown
- [ ] **Formatting** — RealHQ branding, purple header row, JetBrains Mono for numbers
- [ ] **Download triggered** — toast confirmation

### 9.3 Comparable sales pack (Excel)
- [ ] **Tab 1: Comparable transactions** — full table with all fields
- [ ] **Tab 2: Analysis** — average £/sqft, trend, confidence score
- [ ] **Tab 3: Map data** — lat/lng for each comp (for user's own mapping)

### 9.4 Evidence pack (PDF)
- [ ] **For attaching to approach letters**
- [ ] **Contents:** comparable sales (8+), valuation summary (3 methods), market analysis, property photos, specs
- [ ] **Professional formatting** — suitable for sending to administrators/agents

### 9.5 Approach letter (PDF / email)
- [ ] **Letter formatted as printable PDF** — letterhead, formal layout, signatory block
- [ ] **Email version** — plain text or HTML email body
- [ ] **Phone script version** — bullet points, key talking points, objection handling

### 9.6 Offer letter (PDF)
- [ ] **Formal offer document** — different from approach letter
- [ ] **Contents:** offer price, deposit, completion timeline, conditions, expiry date
- [ ] **Legal disclaimer**

### 9.7 Pipeline report (PDF)
- [ ] **Monthly pipeline summary** — for fund managers / stakeholders
- [ ] **Contents:** deal count by stage, total pipeline value, conversion rate, velocity, top deals by score
- [ ] **Chart:** conversion funnel visualisation

### 9.8 CSV exports
- [ ] **Search results CSV** — all visible results with all fields
- [ ] **Pipeline CSV** — all pipeline deals with stages, dates, values
- [ ] **Alerts CSV** — alert history

---

## 10. MODALS & OVERLAYS

### 10.1 Confirmation modals
- [ ] **Send approach letter** — summary of what's being sent, to whom, via what channel
- [ ] **Remove from pipeline** — "Are you sure? This can't be undone."
- [ ] **Delete mandate** — "This will stop all alerts for this search."
- [ ] **Archive deal** — "Move to archive? You can restore later."

### 10.2 Input modals
- [ ] **Create mandate** — full criteria wizard (could be multi-step)
- [ ] **Add property to portfolio** — address, type, value
- [ ] **Add note to pipeline deal** — textarea + save
- [ ] **Log response** — status dropdown + notes + follow-up date
- [ ] **Set follow-up reminder** — date picker + note
- [ ] **Watch property** — reason selection

### 10.3 Preview modals
- [ ] **PDF preview** — investment memo, evidence pack, offer letter — scrollable before download
- [ ] **Image lightbox** — full-screen gallery with navigation
- [ ] **Comparable detail** — click a comp row → modal with full property details for that comp

### 10.4 Status modals
- [ ] **Enrichment progress** — "Analysing property... EPC ✓ Land Registry ✓ Companies House ◐ Planning ○ Environment ○"
- [ ] **PDF generation progress** — "Generating investment memo... Page 1 ✓ Page 2 ✓ Page 3 ◐"
- [ ] **Bulk action progress** — "Sending approach letters... 3/5 complete"

---

## 11. TOAST NOTIFICATIONS

- [ ] **Success:** "Property added to pipeline (Identified)"
- [ ] **Success:** "Mandate saved. Alerts enabled."
- [ ] **Success:** "Approach letter sent via email. Follow-up set for 7 Apr."
- [ ] **Success:** "Financial model downloaded."
- [ ] **Success:** "Investment memo generated."
- [ ] **Warning:** "EPC data unavailable for this property."
- [ ] **Warning:** "Companies House rate limit reached. Retrying in 30s."
- [ ] **Error:** "Failed to enrich property. Please try again."
- [ ] **Info:** "3 new alerts since you last logged in."

---

## 12. ONBOARDING (first-time user)

- [ ] **Step 1: Welcome** — "DealScope finds opportunities in UK commercial property. Let's set up your preferences."
- [ ] **Step 2: Asset classes** — "What property types do you look at?" (chip selection)
- [ ] **Step 3: Locations** — "Where do you invest?" (chip selection + postcode input)
- [ ] **Step 4: Signals** — "What signals matter to you?" (chip selection with explanations)
- [ ] **Step 5: Portfolio** — "Add your existing properties (optional)" — address input or Elevate sync
- [ ] **Step 6: First mandate** — "Create your first saved search?" — auto-populated from steps 2-4
- [ ] **Completion** — "You're set up. Here's your home page."

---

## 13. EMAIL TEMPLATES

- [ ] **Daily alert digest** — summary of new alerts, top matches, deadline reminders
- [ ] **Weekly alert digest** — weekly summary with mandate performance
- [ ] **Urgent alert** — single high-priority alert (auction deadline, admin filing)
- [ ] **Approach letter sent confirmation** — "Your letter to [recipient] was sent via [channel]"
- [ ] **Response received** — "A recipient responded to your approach"
- [ ] **Welcome email** — account created, getting started guide
- [ ] **Mandate match** — "Your mandate [name] has [X] new matches"

---

## 14. EDGE CASES & ERROR STATES

- [ ] **No internet** — offline banner at top of page
- [ ] **API timeout** — "Data source temporarily unavailable. Showing cached data."
- [ ] **Rate limited** — "Too many requests. Please wait X seconds."
- [ ] **Property not found** — "We couldn't find this address. Check spelling or try a postcode."
- [ ] **PDF extraction failed** — "Couldn't extract address from this document. Please enter manually."
- [ ] **URL extraction failed** — "Couldn't read this URL. The site may be blocking access."
- [ ] **Ambiguous address** — "Multiple matches found. Did you mean: [list]"
- [ ] **Incomplete enrichment** — "Some data sources unavailable. Showing partial analysis." (with indicators per source)
- [ ] **Session expired** — login redirect
- [ ] **Permission denied** — "You don't have access to this mandate." (multi-user scenario)

---

## SUMMARY COUNT

| Category | Designs needed |
|----------|---------------|
| Home page states & modals | 8 |
| Search page states & interactions | 12 |
| Address results states | 5 |
| Company results states | 4 |
| Dossier tabs & sub-states | 42 |
| Pipeline states & interactions | 12 |
| Alerts states & types | 11 |
| Settings sections | 8 |
| Export documents (PDF/Excel) | 11 |
| Modals & overlays | 14 |
| Toast notifications | 9 |
| Onboarding flow | 7 |
| Email templates | 7 |
| Error & edge cases | 10 |
| **Total** | **~160 designs** |

---

## RECOMMENDED BUILD ORDER

**Batch 1 — Core flow (what the mockup already covers, needs refinement):**
1. Home page (active state)
2. Search page (filtered state)
3. Address results (found + nearby)
4. Dossier — all 7 tabs (full state)
5. Pipeline (active state)
6. Alerts (active state)
7. Settings (all sections)

**Batch 2 — Actions & exports:**
8. Send approach confirmation modal
9. Add to pipeline dropdown
10. Investment memo PDF design
11. Financial model Excel design
12. Evidence pack PDF design
13. Watch property modal
14. Log response modal

**Batch 3 — Empty & error states:**
15. Home empty state
16. Search no results
17. Enrichment progress modal
18. Partial data states in dossier
19. Toast notification designs
20. Error states

**Batch 4 — Onboarding & email:**
21. Onboarding wizard (6 steps)
22. Email digest template
23. Urgent alert email
24. Company results page

**Batch 5 — Advanced interactions:**
25. Bulk select mode in search
26. Batch approach modal
27. Pipeline analytics view
28. Card detail modal
29. Image lightbox gallery
30. PDF preview modal
