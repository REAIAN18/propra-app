# Prospecting Playbook — South East England Owner-Operators
**Goal:** 50 qualified names in the SE UK pipeline within 5 working days
**Target:** Owner-operators, 3–30 commercial assets, industrial / logistics / mixed-use, SE England
**Output:** Fill `sales-materials/gtm/prospects-seuk.csv`

---

## Source 1 — Companies House (Free, Public, Authoritative)
*Best free UK source. Property companies must file accounts showing asset values.*

**companieshouse.gov.uk → Advanced search:**

Search terms to try:
- "property investments" + registered in: Kent, Surrey, Essex, Hertfordshire, Sussex, Hampshire, Berkshire
- "commercial properties" + same counties
- "industrial estates" + SE counties
- "[county name] properties" (e.g. "Kent Properties Ltd", "Surrey Commercial")

**What to look for in filings:**
- Accounts showing fixed assets >£1m (suggests real portfolio)
- SIC code 68100 (buying/selling own real estate) or 68209 (other letting/operating)
- Director name = the owner (check for same director across multiple property companies — common structure)

**Director cross-reference trick:**
1. Find a property company with SIC 68100
2. Click the director's name
3. Companies House shows ALL companies they're a director of
4. Multiple 68100 companies = portfolio owner hiding assets across LLCs — exactly our target

**Time per prospect:** ~10–15 min
**Expected yield:** 15–20 names per hour of focused searching

---

## Source 2 — Land Registry (HMLR) — Title Ownership Data
*Definitive ownership. Requires small fee per title but worth it for validation.*

**HM Land Registry — Find a property:**
- search.gov.uk/search?keywords=land+registry or gov.uk/search-property-information
- Search by address → Owner name on title
- Title register costs £3 — worth it to confirm ownership before outreach

**INSPIRE polygon data (free bulk):**
- HMLR publishes commercial land ownership polygons (open data)
- HM Land Registry Use their Linked Data API or download from data.gov.uk
- Complex to process but gives bulk ownership mapping by area — useful if you have data skills

**Practical shortcut:**
- Use EGi (Estates Gazette interactive) if you have access — aggregates HMLR data with contact info
- Alternative: Nimbus Maps (nimbusmaps.co.uk) — paid, ~£200/month, shows commercial ownership by map, owner name, company — fastest tool for SE UK commercial prospecting

---

## Source 3 — LinkedIn Sales Navigator
*Validate identity, find email, understand investment focus*

**Search string 1 (SE UK industrial/logistics):**
```
Title: "director" OR "owner" OR "managing director" OR "founder" OR "principal"
Company: "properties" OR "property" OR "estates" OR "industrial" OR "commercial"
Location: Kent, Surrey, Essex, Hertfordshire, East Sussex, West Sussex, Hampshire, Berkshire, Oxfordshire
Seniority: Director, Owner, CXO
```

**Search string 2 (family office angle):**
```
Keywords: "commercial property" OR "industrial property" OR "property portfolio"
Location: South East England
Company headcount: 1–20
```

**Connection note:**
> Hi [Name] — I work with SE commercial property owners to find savings on insurance and energy, and income they haven't captured yet (5G, EV, solar). Commission-only. Happy to connect.

---

## Source 4 — EGi / CoStar UK
*Most accurate SE UK commercial database — requires subscription*

**EGi (Estates Gazette interactive):**
- egi.co.uk — industry standard for UK CRE professionals
- Owner search by county → filter private/unlisted
- Shows asset count, lease data, contact info
- ~£500/month but may have trial access via RICS membership

**CoStar UK:**
- costar.com/products/costar → UK commercial ownership
- Filter: SE England, private owner, 3+ assets, industrial/logistics/mixed-use
- Export CSV directly

**Alternative — cheaper:**
- Zoopla Commercial ownership search (limited but free)
- Property Week deal database (deal coverage → owner names)

---

## Source 5 — RICS, BPF and Chamber Directories
*Pre-qualified — these are people who take their property seriously*

**RICS (Royal Institution of Chartered Surveyors):**
- rics.org/find-a-member → filter by SE England, commercial property
- Members who hold commercial property (not just advisors) — look for "MRICS" with company names like "[Surname] Properties"

**British Property Federation:**
- bpf.org.uk/about-bpf/members
- Member list includes owner-operators alongside institutions
- Filter for SE-based private companies

**SE Chambers of Commerce:**
- Kent Invicta Chamber — kentinvictachamber.co.uk
- Surrey Chambers — surrey-chambers.co.uk
- Essex Chambers — essexchambers.co.uk
- Hertfordshire Chamber — hertschambers.co.uk
- Each publishes a member directory with company names — cross-reference with Companies House

---

## Source 6 — Trade Press Deal Coverage
*Identifies active owners — recent acquisition or disposal = high intent*

**Key UK CRE outlets:**
- Estates Gazette (egi.co.uk) — deal coverage, SE focus
- Property Week — propertyweek.com
- CoStar News UK — costar.com/news
- React News — react-news.co.uk (SE logistics/industrial specialist)
- The Negotiator — thenegotiator.co.uk

**Search terms:**
- "[county] industrial acquisition 2024 2025"
- "logistics park [SE county] sold"
- "private investor acquires [SE county] commercial"

**React News** is particularly valuable — covers SE logistics/industrial in detail and often names the private buyer.

---

## Qualification Criteria

**Green (high priority):**
- 5–15 assets
- Industrial, logistics, or mixed-use
- SE England geography (within M25 or M3/M4/M20/M23 corridors)
- Owner-managed or lightly managed
- Assets held 2+ years
- Lease expiries coming in next 18 months (from EGi data if available)

**Yellow:**
- 3–4 assets (quick case study)
- Out-of-London investor with SE assets
- Property company with active acquisition history (likely buying more — good for AI Scout upsell)

**Red:**
- PLC or listed REIT
- Single asset
- Pure residential
- Major PM firm as primary contact (not the owner)

---

## Email Sourcing (UK)

**Hunter.io** — enter company domain, returns likely email format
**RocketReach** — useful for UK directors
**Companies House** — registered office address often accepts post; sometimes email on confirmation statements
**LinkedIn** — message directly if email not findable
**Company website** → contact page (smaller operators often list director email directly)

---

## Week 1 Target

| Day | Task | Output |
|---|---|---|
| Day 1 | Companies House search (Kent + Surrey) + LinkedIn session | 15 names |
| Day 2 | Companies House (Essex + Herts + Sussex) + director cross-ref | 12 names |
| Day 3 | React News + Property Week deal scan + BPF/chamber lists | 10 names |
| Day 4 | EGi/CoStar pull if access available; LinkedIn session 2 | 10 names |
| Day 5 | Email finding + CSV cleanup | 47–50 names ready |

**First 10 emails out by end of Day 1.** Don't wait for a full list.

---

## Quick-Start: 10 Names in 60 Minutes (Day 1)

1. Go to companieshouse.gov.uk
2. Search: "industrial properties" → filter Active companies, SE England postcodes (TN, ME, CT, RH, GU, KT, RG, SL, HP, AL, SG, CM, CO, SS, RM)
3. Open first 20 results → check SIC code → click directors
4. Anyone with 3+ property companies under their name = prospect
5. Add to CSV
6. LinkedIn search for those names → connect + queue for Touch 1 email

You'll have 10–15 names within the hour.
