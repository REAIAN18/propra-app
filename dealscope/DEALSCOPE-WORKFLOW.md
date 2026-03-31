# DealScope — Post-Identification Workflow

> **Appendix to DEALSCOPE-SPEC.md + DEALSCOPE-UK.md**
> Finding the property is 20% of the value. This document covers the other 80%.

---

## THE JOURNEY

```
Signal Detected → Property Deep Analysis → Owner Identification → Approach Strategy → Negotiation → Deal
     (10%)              (25%)                    (20%)                (15%)            (20%)      (10%)
```

Most tools stop at signal detection. DealScope goes all the way to helping you close.

---

## STAGE 1: PROPERTY DEEP ANALYSIS

When DealScope flags a property, the user needs to know EVERYTHING about it before deciding whether to pursue. This isn't a listing page — it's an intelligence dossier.

### 1A. What Is This Property?

**Auto-assembled from public data (no manual research needed):**

| Data point | Source | How we get it |
|-----------|--------|--------------|
| Address, postcode, coordinates | CCOD / Land Registry | Bulk download, matched |
| Title number(s) | CCOD | Direct from dataset |
| Tenure (freehold/leasehold) | Land Registry title | £3 per title, or inferred from CCOD |
| Floor area (sqft/sqm) | Non-domestic EPC register | Free API. Floor area is a required field |
| Building type & use class | Non-domestic EPC + VOA rating list | Cross-reference EPC "property-type" with VOA description |
| Year built / age band | EPC data | "construction-age-band" field |
| Number of floors | EPC data | "floor-level" and "floor-area" by level |
| Energy rating (A–G) | EPC register | Direct lookup |
| Current heating type | EPC register | "main-heating-fuel", "main-heating-description" |
| CO2 emissions | EPC register | "co2-emissions-current" |
| Rateable value | VOA | Free lookup. Proxy for market rent |
| Last sale price + date | Land Registry Price Paid | Free download |
| All previous sale prices | Land Registry Price Paid (historical) | Full history since 1995 |
| Listed building status | Historic England | Free API |
| Conservation area | Local authority / planning.data.gov.uk | Free |
| Flood risk zone | Environment Agency | Free API |
| Contaminated land | Environment Agency | Free |
| MEES compliance risk | Derived: EPC rating F or G = illegal to let from 2027 without works | Calculated |
| Satellite image | Google Maps Static API | Free tier |
| Street view image | Google Street View API | Free tier |
| Nearby planning applications | planning.data.gov.uk | Free API, radius search |
| Nearby comparable sales | Land Registry Price Paid | Free, filtered by postcode sector + type |
| Business rates bill (estimated) | VOA rateable value × multiplier | Calculated |
| Area demographics | ONS Census 2021 | Free, by MSOA/LSOA |
| Local employment data | ONS BRES | Free |
| Transport accessibility | DfT / TfL PTAL | Free |
| Broadband speed | Ofcom Connected Nations | Free |
| Crime rate | Police.uk API | Free |

**This assembles automatically in <5 seconds per property.** The user sees a complete property profile without lifting a finger.

### 1B. What Could It Be Worth?

**Three valuations, triangulated:**

| Method | How | Confidence |
|--------|-----|-----------|
| **Comparable transactions** | Land Registry Price Paid: find 5–10 similar properties (same type, same area, sold in last 24 months). Calculate £/sqft range. Apply to this property's floor area. | High if comps exist |
| **Income capitalisation** | VOA rateable value ÷ assumed yield for this type/area (from scout-benchmarks.ts). Cross-ref with actual passing rent if known from lease data. | Medium — rateable value is a rent proxy, not actual rent |
| **Replacement cost** | EPC floor area × BCIS rebuild cost/sqft for this building type and region. Minus depreciation based on age. Add land value (derived from residential land values in area). | Low — floor, not ceiling |

**Output:** Estimated market value range (low–mid–high) with confidence score and methodology explanation.

**What to pay for it (not the same as what it's worth):**

| Scenario | Discount from market value | Logic |
|----------|---------------------------|-------|
| On-market, no distress | 0–5% below asking | Normal negotiation |
| On-market, stale (180+ days) | 10–20% below asking | Seller losing patience |
| Distressed — administration | 20–40% below market | Administrator wants quick sale for creditors |
| Distressed — receivership | 15–30% below market | Receiver must achieve "reasonable" price but is motivated |
| Absent owner — dissolved company | 30–50% below market | Bona vacantia or estate — no emotional attachment |
| Absent owner — overseas | 10–25% below market | Management burden, currency risk, regulatory hassle |
| Vacant 2+ years | 15–30% below market | Holding costs eating value, condition deteriorating |
| MEES non-compliant (F/G rating) | 10–20% below market | Buyer prices in upgrade cost (EPC recommendations give £ figure) |
| Probate / deceased estate | 10–20% below market | Executors want clean distribution, not maximum price |
| Tax lien / rates arrears | Varies | Arrears become buyer's liability — factor in |

**Output:** "Suggested offer range: £X–£Y" with reasoning.

### 1C. What Could It Become? (Opportunity Analysis)

**Claude AI analyses the property profile and generates:**

| Analysis | What it considers |
|----------|------------------|
| **Highest and best use** | Current use class vs permitted development rights. Could this office become residential? Could this warehouse become last-mile logistics? |
| **Permitted development potential** | Class MA (commercial to resi), Class E flexibility, prior approval requirements. Floor area limits, conservation area restrictions |
| **Planning uplift estimate** | If you get change of use: new value = residential sqft × local resi £/sqft. Minus conversion cost. Net uplift = opportunity |
| **Rent reversion** | Current rateable value vs market ERV for this type/area. If under-rented: uplift at next review |
| **Capex value-add** | EPC recommendations (from EPC data) with costs. Upgrade from F to C = unlocks letting + increases value |
| **Split/merge potential** | Could the building be split into smaller units (higher £/sqft)? Or merged with adjacent title? |
| **Ancillary income** | Solar potential (roof area from EPC × local solar yield), EV charging (parking from street view), telecoms (height/visibility) |

### 1D. Risk Assessment

| Risk | Source | Assessment |
|------|--------|-----------|
| **Flood risk** | Environment Agency API | Zone 1/2/3, surface water, historical flooding |
| **Contamination** | EA contaminated land register | Brownfield status, remediation needed |
| **Listed building** | Historic England | Grade I/II*/II — affects what you can do |
| **Conservation area** | planning.data.gov.uk | Restricts demolition, affects PD rights |
| **MEES risk** | EPC rating | F/G = currently unlettable. Cost to upgrade from EPC recommendations |
| **Structural** | Building age from EPC + type | Pre-1919 = potential structural issues. Flat roof = maintenance liability |
| **Tenant risk** | If occupied: Companies House check on tenant company | Covenant strength of sitting tenant |
| **Lease risk** | Lease data from Land Registry | Short remaining term = void risk. Upward-only = protected income |
| **Market risk** | Comparable sales trend (rising/falling) + vacancy rates in area | Is this market improving or declining? |
| **Environmental** | DESNZ energy data + flood + contamination composite | Overall environmental risk score |
| **Legal** | Title restrictions, covenants, charges, cautions from Land Registry | Encumbrances that affect value or use |

**Output:** Risk score 1–10 with breakdown. Red flags prominently displayed.

---

## STAGE 2: OWNER IDENTIFICATION & INTELLIGENCE

Finding WHO owns it and UNDERSTANDING their situation.

### 2A. Owner Identification Workflow

```
Property flagged
    │
    ├─ Is it on CCOD? (company-owned)
    │   ├─ YES → Company name + reg number known
    │   │   ├─ Companies House: status, directors, PSC, accounts, charges
    │   │   ├─ Director home addresses (from officer appointments — public)
    │   │   ├─ Director other appointments (what else do they own/run?)
    │   │   └─ Company group structure (parent company? subsidiaries?)
    │   └─ NO → Individually owned
    │       ├─ Land Registry title register (£3) → owner name + correspondence address
    │       ├─ Electoral roll lookup (owner name at correspondence address)
    │       ├─ 192.com / Companies House director search (is the individual a director?)
    │       └─ Probate search (have they died? → executors become the contact)
    │
    ├─ Is it on OCOD? (overseas company)
    │   ├─ YES → Overseas entity name + registered country
    │   │   ├─ Register of Overseas Entities (Companies House) → beneficial owners
    │   │   ├─ UK managing agent / service address (required by law)
    │   │   └─ Home jurisdiction company register (if accessible)
    │   └─ Often → managing agent in UK is the practical contact
    │
    └─ Is it unregistered?
        ├─ Council rates records (who pays business rates?)
        ├─ Utility connections (who pays?)
        └─ Adjacent title owners (might own this too)
```

### 2B. Owner Situation Assessment

**Once we know WHO, understand WHY they might sell:**

| Question | How to answer | Source |
|----------|--------------|-------|
| **Are they in financial trouble?** | Company accounts (declining turnover, rising debt, losses), charges register (bridging loans), CCJs, Gazette notices | Companies House, Gazette, court records |
| **Are they winding down?** | Company status (dissolution, striking off), director resignations, confirmation statement overdue | Companies House |
| **Did someone die?** | Director ceased date with no replacement, probate notices in Gazette, obituary search | Companies House, Gazette, obituaries |
| **Are they divorcing?** | Court records (not easily public in UK). Indirect: company restructuring, new charges, director changes at personal companies | Inferred |
| **Are they an accidental landlord?** | Individual owns one commercial property (not a portfolio). Inherited or bought decades ago. No other property interests. | CCOD (only one title), Companies House (no other property companies) |
| **Are they a tired landlord?** | Long hold (20+ years), no charge activity, property condition declining (street view), EPC rating poor (no upgrades) | CCOD + Price Paid + EPC + Street View |
| **Are they portfolio pruning?** | Company owns 10+ properties, recently sold some (check Price Paid for sales by same company name). This one doesn't fit the strategy. | CCOD + Price Paid cross-ref |
| **Are they a fund approaching exit?** | Company is a SPV (Ltd, LLP) with fund-like structure. Check PSC for fund name. Fund vintage from Companies House incorporation date. | Companies House |
| **What's their equity position?** | Property value estimate − outstanding charges (from charges register, if amount disclosed). If low/negative equity = trapped. If high equity = can afford to sell at discount. | Calculated |
| **How many properties do they own?** | Search CCOD for all titles registered to the same company/individual. Map the entire portfolio. | CCOD search |

**Output:** Owner profile card with situation assessment: "Company X owns this property and 4 others. Entered administration 3 weeks ago. Begbies Traynor appointed. Estimated property value £2.4M, outstanding charges £1.8M (from 2019 bridging loan via Octopus). Administrator will want to sell quickly to clear creditor claims."

### 2C. Portfolio Mapping

**If the owner has multiple properties, map all of them:**

Search CCOD for every title registered to the same company name or company number. Plot on a map. Show:
- Total portfolio value (estimated from comps)
- Total charges (from Companies House)
- Which properties are vacant (EPC/rates signals)
- Which properties have been recently sold (Price Paid)
- Portfolio concentration (all in one area = higher risk to owner)

**Why this matters:** If you're approaching an owner who has 8 properties and 3 are vacant, your negotiation position is stronger. You can offer to buy 2–3 at once at a portfolio discount. The owner gets liquidity across multiple assets. This is how institutional buyers think.

---

## STAGE 3: APPROACH STRATEGY

### 3A. Who To Contact

| Owner type | Best contact | Method |
|-----------|-------------|--------|
| Active UK company | Current directors (from Companies House officers endpoint) | Letter to registered office + personal address. Email if findable. |
| Company in administration | Appointed administrator (from Gazette/Companies House insolvency) | Direct to administrator's firm. They WANT to hear from buyers. |
| Company in receivership | LPA receiver (named in Companies House charges) | Direct to receiver. They have a duty to achieve best price but want speed. |
| Dissolved company (bona vacantia) | Treasury Solicitor's Department (BV division) | Apply to buy via gov.uk/government/organisations/bona-vacantia |
| Overseas entity | UK service address (from Register of Overseas Entities) or managing agent | Letter/email to UK address. Often a law firm or property manager. |
| Individual (alive) | Correspondence address from title register (£3 from Land Registry) | Handwritten letter (higher open rate than typed). Follow up by post. |
| Individual (deceased) | Executors (from probate records) or family (from electoral roll at last known address) | Sensitive approach. "We understand the estate includes [property]. We'd like to discuss." |
| Local authority | Estates department (published on council website) | Formal expression of interest. Often a tender process. |
| Charity | Trustees (from Charity Commission) | Must follow Charities Act s.119 — surveyor valuation required. Offer must be "best price reasonably obtainable." |

### 3B. Claude-Generated Approach Letters

**DealScope generates a personalised approach letter for every scenario:**

Inputs to Claude:
- Property address + description
- Owner name + company details
- Estimated value + suggested offer range
- Owner situation (distressed / absent / tired / portfolio pruning)
- Buyer profile (from RealHQ AcquisitionStrategy)
- Comparable evidence (recent sales nearby)

Output: Tailored letter that:
- Identifies the specific property (shows you've done homework)
- Acknowledges the owner's situation without being presumptuous
- States a credible offer range supported by evidence
- Highlights why you're a reliable buyer (cash, no chain, quick completion)
- Provides multiple response methods (phone, email, post)
- Doesn't look like spam (personalised, not template-y)

**Letter variants by scenario:**

| Scenario | Tone | Key message |
|----------|------|------------|
| Administrator | Professional, direct | "We're an active buyer in [area]. We understand [Company] is in administration. We'd like to submit an offer for [property]. We can complete in 28 days with cash." |
| Absent overseas owner | Respectful, problem-solving | "We notice you own [property] in [town]. Managing a UK commercial property from overseas can be complex. If you've considered simplifying your portfolio, we'd be interested in a confidential conversation." |
| Tired individual owner | Warm, empathetic | "We're investors in [town] and we've been admiring [property] for some time. If you ever consider selling, we'd love to have a no-obligation chat. No agents, no fees on your side." |
| Dissolved company | Factual, to former directors | "We understand [Company Ltd] previously owned [property] at [address]. As the company has been dissolved, we'd like to discuss the property's status and whether an acquisition might be arranged." |
| Probate estate | Sensitive, patient | "We write with respect regarding the estate of [name]. We understand [property] may form part of the estate. When the time is right, we'd welcome a conversation about a purchase at a fair price." |

### 3C. Multi-Channel Outreach

| Channel | When to use | Response rate |
|---------|------------|--------------|
| **Posted letter** (handwritten envelope) | First approach for individuals. Higher open rate. | 5–15% |
| **Posted letter** (typed, professional) | Administrators, receivers, corporates | 10–20% |
| **Email** (if found via Companies House / LinkedIn) | Follow-up to letter, or for tech-savvy owners | 3–8% |
| **Phone** (if number found) | After letter sent. Reference the letter. | 15–25% |
| **Agent introduction** (if property is listed with an agent) | If owner has an agent, go through them | Standard |
| **LinkedIn InMail** (directors) | Last resort for unresponsive owners | 2–5% |
| **Multiple rounds** | Send 3 letters over 6 months. Persistence works. | Cumulative 20–30% |

### 3D. CRM & Tracking

Every outreach tracked in DealScope:

```prisma
model OwnerOutreach {
  id            String    @id @default(cuid())
  propertyId    String
  ownerId       String
  channel       String    // "post" | "email" | "phone" | "linkedin" | "agent"
  templateUsed  String?   // which Claude letter variant
  content       String    @db.Text
  sentAt        DateTime
  deliveredAt   DateTime? // for email: Resend webhook
  openedAt      DateTime? // for email: Resend webhook
  responseAt    DateTime?
  responseType  String?   // "interested" | "not_now" | "not_selling" | "no_response"
  responseNotes String?   @db.Text
  followUpDate  DateTime?
  
  property      DealScopeProperty @relation(...)
  owner         DealScopeOwner @relation(...)
}
```

---

## STAGE 4: NEGOTIATION INTELLIGENCE

### 4A. Negotiation Position Assessment

**Before you make an offer, understand your leverage:**

| Factor | Favours buyer | Favours seller | Source |
|--------|--------------|---------------|--------|
| **Time pressure** | Administrator with creditor deadline. Receiver with 6-month mandate. Probate estate wanting to distribute. | Listed property with multiple viewings. Competitive bidding. | Gazette dates, listing activity |
| **Information asymmetry** | You know the market value (from comps). Seller may not (absent 20 years). | Seller has professional adviser (agent/receiver). | Your analysis vs their situation |
| **Condition discount** | Poor EPC (F/G) = £X upgrade needed. Deduct from value. | Seller has already upgraded. Good condition. | EPC recommendations with costs |
| **Legal issues** | Title restrictions, missing deeds, unregistered land = complexity. Seller wants someone who can handle it. | Clean title, no issues. | Title register |
| **Portfolio deal** | Offer to buy 3 properties = liquidity event for seller. Discount per unit. | Single trophy asset. Premium. | CCOD portfolio mapping |
| **Cash buyer** | No mortgage condition. Quick completion. Certainty. Worth 5–10% discount. | Buyer needs finance = slower, riskier for seller. | Your position |
| **Vacant possession** | Already vacant = no tenant to negotiate out. Clean transaction. | Occupied = income in place. Buyer pays premium for income. | Rates relief, EPC, street view |

### 4B. Comparable Evidence Pack

**Auto-generated for every property, ready to support your offer:**

- 5–10 comparable sales (Land Registry Price Paid, same type, same area, last 24 months)
- Average £/sqft achieved in comparable sales
- Trend analysis (are comps trending up or down?)
- Adjustment for this property's condition (EPC rating as proxy), size, tenure
- Formatted as a professional PDF (via brochure.ts pipeline) to accompany offer letter

### 4C. Offer Structuring

**DealScope suggests offer structure based on property + seller situation:**

| Situation | Suggested structure |
|-----------|-------------------|
| Standard purchase | Conditional offer with 28-day due diligence, 10% deposit, 90-day completion |
| Administration/receivership | Unconditional offer. Cash. 14-day completion. Higher chance of acceptance even at lower price. |
| Probate estate | Patient terms. 60–90 day completion. Respect the process. Offer to cover seller's legal costs. |
| Absent/tired owner | Exchange within 28 days. Pay their agent fees. Remove all friction. |
| Portfolio deal | Staged completion. Buy 2 now, option on remaining 3 within 6 months. Volume discount. |
| MEES non-compliant | Offer = market value minus EPC upgrade cost (from EPC recommendations). Evidence-based discount. |
| Occupied property | Offer based on passing rent capitalised at market yield. Tenant covenant check included in analysis. |

### 4D. Due Diligence Checklist (auto-populated)

When the seller says yes, DealScope generates a DD checklist pre-populated with everything it already knows:

**Already gathered (from public data):**
- ✅ Title register + plan (if purchased from LR)
- ✅ Company ownership + status
- ✅ Charges register (existing mortgages)
- ✅ EPC certificate + rating
- ✅ Flood risk assessment
- ✅ Contamination search
- ✅ Listed building / conservation area status
- ✅ Planning history (nearby applications)
- ✅ Comparable sales evidence
- ✅ Business rates / rateable value
- ✅ Company accounts (if corporate seller)

**Still needed (from seller/solicitor):**
- ☐ Full title documents + deeds
- ☐ Replies to CPSE (Commercial Property Standard Enquiries)
- ☐ Asbestos survey / management plan
- ☐ Fire risk assessment
- ☐ Building insurance details
- ☐ Service charge accounts (if multi-let)
- ☐ Tenant leases (if occupied)
- ☐ Planning consents / building regulations completion
- ☐ Environmental audit (if industrial/former industrial)
- ☐ Mechanical & electrical survey
- ☐ Building survey

**This feeds directly into RealHQ Transactions (transactions-v2-design.html)** — the DD checklist becomes the milestone tracker in the transaction room.

---

## STAGE 5: DEAL COMPLETION HANDOFF

When a deal reaches negotiation stage, DealScope hands off to RealHQ:

```
DealScope                          RealHQ
─────────                          ──────
Property profile  ───────────────→ Scout v2 deal card (pre-populated)
Owner intelligence ──────────────→ Transaction room (party details)
Valuation + comps ───────────────→ Underwriting (pre-filled assumptions)  
DD checklist ────────────────────→ Transaction milestones (pre-populated)
Approach letters ────────────────→ Document room (correspondence history)
Offer structure ─────────────────→ Deal finance (capital stack)
Risk assessment ─────────────────→ Property profile (risk tab)
```

The user never re-enters data. Everything DealScope discovered flows into RealHQ's transaction management.

---

## PRODUCT SCREENS (for design)

### Screen 1: Property Intelligence Dossier
Full-page property profile with all data from Stage 1. Tabs: Overview, Valuation, Opportunity, Risk, Owner, Comps. Auto-assembled. No manual entry.

### Screen 2: Owner Profile Card
Company/individual details, situation assessment, portfolio map, financial health indicators, contact details, outreach history.

### Screen 3: Approach Wizard
Select approach template → Claude generates personalised letter → preview → choose channel (post/email) → send → track.

### Screen 4: Negotiation Dashboard
Comparable evidence pack, offer calculator (sliders for price, terms, conditions), leverage assessment, DD checklist status.

### Screen 5: Pipeline / CRM
All properties being pursued. Stage: identified → researched → approached → in negotiation → under offer → completing. Kanban view.

### Screen 6: Portfolio Heatmap
Map of all flagged properties, colour-coded by score. Cluster analysis. Click any property → dossier.

---

## WHAT MAKES THIS "WOW"

1. **Zero research time.** Click a pin on the map → full intelligence dossier in 5 seconds. Floor area, value estimate, owner name, company status, charges, EPC, flood risk, comps, planning history. All from public data.

2. **Owner situation intelligence.** Not just "who owns it" but "why they might sell." Administration, dissolved company, absent owner, bridging loan stress, fund exit deadline. Scored and explained.

3. **AI-generated approach.** Claude writes a personalised letter for every owner scenario. Not a template — it references the specific property, the owner's situation, comparable evidence, and your buying credentials.

4. **Evidence-based offers.** Every offer backed by Land Registry comps, EPC condition data, and market benchmarks. Professional PDF comparable pack generated automatically.

5. **End-to-end.** Signal → research → approach → negotiate → complete. One platform. No spreadsheets, no manual research, no switching between Land Registry, Companies House, and Google Maps.

6. **Scales to portfolio.** Monitor 10,000 properties. Get alerts when signals change. Approach 50 owners in a week. Track everything in CRM. This is how institutional funds work — now available to anyone for £99/mo.
