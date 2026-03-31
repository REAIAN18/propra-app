# DealScope Build Spec: Final Infrastructure Update

> **Amends DEALSCOPE-BUILD-SPEC.md + ADDENDUM.** Covers: token economy, currency/cross-market, image classification, owner intelligence, and API enrichment detail.

---

## B1. TOKEN ECONOMY

### B1.1 Architecture principle
The entire product is built around a single concept: **credits.** Every action that costs compute, API calls, or AI inference deducts credits from the user's balance. The user never sees "credits" or "tokens" in the UI initially — they just use the product. When they run low, a soft prompt appears. This is invisible infrastructure until monetisation is activated.

### B1.2 What's free (unlimited)

| Feature | Why free |
|---------|---------|
| Home page, source counts, mandate list | Read-only, cached data |
| Search & filter results | Database queries (cheap) |
| Address lookup + geocoding | Google Geocoding is ~$0.005 per call |
| Basic property card view in results | Already enriched data |
| Pipeline kanban (view/move/notes) | CRUD operations |
| Alert feed (view/read/dismiss) | Read-only |
| Settings & preferences | CRUD |
| Onboarding | One-time |

### B1.3 What costs credits

| Action | Credits | Why |
|--------|---------|-----|
| **Full enrichment** (new property) | 5 | Calls 10 external APIs (EPC, LR, CH, Gazette, Planning, HE, EA, Google ×2, AVM) |
| **Re-enrich** (refresh stale data) | 3 | Subset of APIs |
| **AI analysis summary** | 2 | Claude API call |
| **AI letter generation** | 2 | Claude API call |
| **AI letter regeneration** | 1 | Claude API (shorter prompt) |
| **Comparable sales lookup** | 1 | LR API or bulk data query |
| **Rental evidence lookup** | 1 | Market data query |
| **Market intelligence** (full tab) | 2 | Multiple data aggregations |
| **PDF generation** (any type) | 2 | Puppeteer render + storage |
| **XLSX generation** (any type) | 1 | Server compute |
| **Watchlist add** | 0 | Free — but watch alerts cost credits when they fire |
| **Watch alert fired** | 1 | Re-checks property data sources |
| **Mandate alert check** | 0.5 | Per property matched (cron job) |
| **PDF extraction** (upload) | 2 | Claude AI extraction |
| **Bulk approach** (per letter) | 3 | AI gen + send + tracking |

### B1.4 Credit tiers

| Tier | Credits/month | Price | Target user |
|------|--------------|-------|-------------|
| Free | 50 | £0 | Tryout — ~10 full enrichments |
| Starter | 300 | £29/mo | Individual investor — ~60 enrichments |
| Pro | 1,500 | £99/mo | Active acquirer — ~300 enrichments |
| Team | 5,000 | £249/mo | Small team / agent |
| Enterprise | Unlimited | Custom | Fund / institutional |
| Top-up | +100 credits | £15 one-off | Any tier |

### B1.5 Database models

```prisma
model CreditBalance {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  balance     Float    @default(50)  // current balance
  tier        String   @default("free") // "free" | "starter" | "pro" | "team" | "enterprise"
  monthlyAllowance Float @default(50)
  resetDate   DateTime // next monthly reset
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CreditTransaction {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Float    // negative = deduction, positive = top-up/reset
  action      String   // "enrich" | "ai_analysis" | "letter_gen" | "comps" | "pdf" | "xlsx" | "watch_alert" | "mandate_alert" | "monthly_reset" | "topup" | "upgrade"
  propertyId  String?  // which property this was for
  metadata    Json?    // {enrichSources: [...], letterType: "admin", pdfType: "memo"}
  balanceAfter Float   // balance after this transaction
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}

model CreditTopUp {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Float    // credits purchased
  pricePaid   Float    // in user's currency
  currency    String   // "GBP" | "USD"
  stripeId    String?  // Stripe payment intent ID
  createdAt   DateTime @default(now())
}
```

### B1.6 Implementation pattern

Every credit-consuming function calls a middleware:

```typescript
// lib/credits.ts
export async function useCredits(
  userId: string,
  amount: number,
  action: string,
  propertyId?: string,
  metadata?: Record<string, unknown>
): Promise<{ ok: boolean; balance: number; insufficient?: boolean }> {
  const balance = await prisma.creditBalance.findUnique({ where: { userId } });
  if (!balance) return { ok: false, balance: 0, insufficient: true };

  // Enterprise = unlimited
  if (balance.tier === "enterprise") {
    await logTransaction(userId, -amount, action, propertyId, metadata, balance.balance);
    return { ok: true, balance: balance.balance };
  }

  if (balance.balance < amount) {
    return { ok: false, balance: balance.balance, insufficient: true };
  }

  const updated = await prisma.creditBalance.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });

  await logTransaction(userId, -amount, action, propertyId, metadata, updated.balance);
  return { ok: true, balance: updated.balance };
}
```

Every API route that costs credits wraps the call:

```typescript
// In any credit-consuming route:
const credit = await useCredits(session.user.id, 5, "enrich", propertyId);
if (!credit.ok) {
  return NextResponse.json(
    { error: "insufficient_credits", balance: credit.balance },
    { status: 402 }
  );
}
// ... proceed with enrichment
```

### B1.7 UI handling (soft, not blocking)

When credits are low (< 20% of monthly allowance), show a subtle indicator in the sidebar rail — a small meter or number. No hard blocks until balance hits 0.

When balance is 0 and user tries a credit action:
- Don't show an error page
- Show a friendly modal: "You've used all your credits this month. Your allowance resets on [date], or you can top up now."
- Offer: "Top up 100 credits (£15)" button + "Upgrade plan" link
- Let them continue browsing/searching (free actions) without interruption

**Never mention "tokens" in the UI. Use "credits" or just don't name it — "You've reached your monthly limit."**

---

## B2. CURRENCY & CROSS-MARKET

### B2.1 Architecture

Currency is a user preference stored on the User model. It affects display only — all internal storage is in the property's native currency.

```prisma
// Add to User model:
  preferredCurrency  String  @default("GBP")  // "GBP" | "USD" | "EUR"
  preferredUnits     String  @default("sqft") // "sqft" | "sqm"
  marketFocus        String  @default("UK")   // "UK" | "US" | "both"
```

### B2.2 How it works

**Storage:** Every monetary value in the database stores in the property's native currency. ScoutDeal already has a `currency` field ("GBP" | "USD").

**Display:** A utility function formats for the user's preference:

```typescript
// lib/currency.ts
const RATES: Record<string, number> = { GBP: 1, USD: 1.27, EUR: 1.17 };

export function formatPrice(
  amount: number,
  storedCurrency: string,
  displayCurrency: string
): string {
  const converted = amount * (RATES[displayCurrency] / RATES[storedCurrency]);
  const symbol = { GBP: "£", USD: "$", EUR: "€" }[displayCurrency] || "£";
  if (converted >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
  if (converted >= 1_000) return `${symbol}${Math.round(converted / 1_000)}k`;
  return `${symbol}${Math.round(converted)}`;
}
```

**FX rates:** Store in MacroRate model (already exists). Update daily from FRED or ECB.

### B2.3 Cross-market toggle

A simple toggle in Settings (already designed) and a small indicator in the sidebar when viewing a property in a different currency than its native one:

```
Viewing in £ GBP · Property listed in $ USD · Rate: 1.27
```

### B2.4 Market-specific differences

| Feature | UK | US |
|---------|----|----|
| Title system | Land Registry (title number) | County recorder (deed) |
| Company register | Companies House | Sunbiz (FL), SoS (other states) |
| Planning | planning.data.gov.uk | County planning portal |
| EPC equivalent | EPC register | Energy audit (varies by state) |
| Flood data | Environment Agency | FEMA flood maps |
| Tax on purchase | SDLT | Transfer tax (varies by state) |
| Lease structure | FRI / IRI | NNN / Modified Gross |
| Yield convention | Net initial yield | Cap rate |

**Implementation:** The enrichment pipeline routes to different data sources based on the property's country/region. `enrich-asset.ts` already detects UK vs US via postcode regex. `company-intelligence.ts` already routes UK→CH, FL→Sunbiz.

For the dossier tabs, use conditional rendering: show "SDLT" in cost breakdown for UK, "Transfer tax" for US. Show "EPC rating" for UK, "Energy audit" for US. The data fields are the same — just the labels change.

---

## B3. IMAGE CLASSIFICATION & DOCUMENT INTELLIGENCE

### B3.1 The problem

The current enrichment creates one satellite image URL from Google. The mockups show 9 different image types (satellite, street view, front elevation, rear, interior, floor plan, site plan, EPC cert, title plan). Where do these come from?

### B3.2 Image sources

| Image type | Source | How to get it | Classification |
|-----------|--------|--------------|----------------|
| **Satellite** | Google Static Maps API | Already built — `enrich-asset.ts` constructs URL from lat/lng | Automatic |
| **Street View** | Google Street View Static API | Construct URL: `https://maps.googleapis.com/maps/api/streetview?location={lat},{lng}&size=600x400&key={key}` | Automatic |
| **EPC certificate** | EPC register | `epc.opendatacommunities.org` returns certificate PDF URL for each EPC. Download + store. | Automatic (API provides it) |
| **Title plan** | Land Registry | Title plan is a purchased document (~£3). Returns PDF with boundary map. | Automatic (API provides it) |
| **Brochure photos** | Uploaded PDF / listing URL | Extract images from PDF pages using `pdf-to-img` or similar | Needs classification |
| **Floor plans** | Uploaded PDF / listing URL | Extract from PDF | Needs classification |
| **Site plans** | Uploaded PDF / listing URL | Extract from PDF | Needs classification |

### B3.3 Image classification pipeline

When a PDF brochure is uploaded or a listing URL is scraped, we extract all images and need to classify them:

```typescript
// lib/image-classifier.ts
export type ImageCategory =
  | "exterior_front"
  | "exterior_rear"
  | "exterior_aerial"
  | "interior"
  | "floor_plan"
  | "site_plan"
  | "epc_certificate"
  | "title_plan"
  | "location_map"
  | "unknown";

export async function classifyImage(
  imageBase64: string,
  contextHint?: string // "page 3 of brochure", "from rightmove listing"
): Promise<{ category: ImageCategory; confidence: number }> {
  // Use Claude Vision API
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
        { type: "text", text: `Classify this image of a commercial property. Reply with ONLY one of: exterior_front, exterior_rear, exterior_aerial, interior, floor_plan, site_plan, epc_certificate, title_plan, location_map, unknown. Then a confidence 0-1.` }
      ]
    }]
  });
  // Parse response...
}
```

**Cost:** 1 credit per image classified (covers the Claude Vision call). Typically 4-6 images per brochure = 4-6 credits.

### B3.4 Image storage model

```prisma
model PropertyImage {
  id          String   @id @default(cuid())
  propertyId  String
  property    ScoutDeal @relation(fields: [propertyId], references: [id])
  category    String   // ImageCategory
  source      String   // "google_satellite" | "google_streetview" | "epc_register" | "land_registry" | "brochure_extract" | "listing_scrape" | "user_upload"
  url         String   // S3/Supabase storage URL or Google API URL
  thumbnailUrl String?
  width       Int?
  height      Int?
  confidence  Float?   // classification confidence 0-1
  pageNumber  Int?     // if from PDF, which page
  createdAt   DateTime @default(now())

  @@index([propertyId])
}
```

### B3.5 Auto-generated images (always available)

For every enriched property, these are generated automatically (no upload needed):

1. **Satellite:** Google Static Maps — `zoom=18, maptype=satellite, size=600x400`
2. **Street View:** Google Street View Static — `size=600x400, heading=auto`
3. **Location map:** Google Static Maps — `zoom=15, maptype=roadmap` with a marker

Cost: Google Maps API — $7 per 1000 calls for satellite + street view combined. Included in the 5-credit enrichment cost.

### B3.6 From uploaded PDFs

When a brochure PDF is uploaded:
1. `document-parser.ts` extracts text (already built)
2. `pdf-to-img` (or Puppeteer page.screenshot per page) extracts page images
3. Each extracted image → `classifyImage()` via Claude Vision
4. Classified images stored in `PropertyImage` with category + source
5. Images shown in dossier gallery grouped by category

### B3.7 From listing URLs

When a Rightmove/Zoopla/auction URL is pasted:
1. Fetch page HTML
2. Extract `<img>` URLs from listing (selector-based per site)
3. Download images
4. Classify via Claude Vision
5. Store in `PropertyImage`

---

## B4. OWNER INTELLIGENCE DEPTH

### B4.1 Current state

The Ownership tab shows basic Companies House data. But a deal decision needs more: who is behind this company, what else do they own, are they in trouble elsewhere, do they have a pattern of selling at this stage?

### B4.2 Expanded owner intelligence model

```prisma
model OwnerProfile {
  id              String   @id @default(cuid())
  propertyId      String
  property        ScoutDeal @relation(fields: [propertyId], references: [id])

  // Company basics (from Companies House)
  companyName     String?
  companyNumber   String?
  companyStatus   String?  // "active" | "in_administration" | "dissolved" | "liquidation"
  incorporatedDate DateTime?
  sicCodes        String[] // ["68100", "68209"]
  registeredAddress String?

  // Administration / insolvency
  adminName       String?  // IP name: "Begbies Traynor"
  adminFirm       String?
  adminAppointedDate DateTime?
  ipNumber        String?  // Insolvency practitioner number

  // Directors
  directors       Json     // [{name, role, appointedDate, resignedDate, nationality, dob, otherDirectorships, disqualified}]
  activeDirectors Int      @default(0)
  resignedDirectors Int    @default(0)

  // Charges
  charges         Json     // [{lender, amount, dateCreated, type, satisfied}]
  totalDebt       Float?
  chargeCount     Int      @default(0)

  // Filing status
  lastAccountsFiled DateTime?
  accountsOverdue  Boolean  @default(false)
  lastConfirmationStmt DateTime?
  confirmationOverdue Boolean @default(false)

  // CCJs
  ccjCount        Int      @default(0)
  ccjTotal        Float?

  // Gazette notices
  gazetteNotices  Json     // [{date, type, description, url}]

  // Portfolio (other properties from CCOD)
  otherProperties Json     // [{address, titleNumber, tenure, estValue}]
  portfolioCount  Int      @default(0)
  portfolioEstValue Float?

  // Behavioural signals
  ownerType       String?  // "company" | "individual" | "trust" | "overseas" | "council"
  yearsOwned      Float?
  acquisitionPrice Float?
  disposalPattern String?  // "holder" | "active_trader" | "distressed_seller" | "first_time_seller"

  // Contact
  contactAddress  String?
  contactEmail    String?  // from CH correspondence address
  agentName       String?  // if agent is involved
  agentEmail      String?
  agentPhone      String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([propertyId])
  @@index([companyNumber])
}
```

### B4.3 Owner intelligence sources

| Data point | Source | API |
|-----------|--------|-----|
| Company basics | Companies House | `api.company-information.service.gov.uk/company/{number}` |
| Directors + other directorships | Companies House | `/company/{number}/officers` + `/officers/{id}/appointments` |
| Charges | Companies House | `/company/{number}/charges` |
| Filing history | Companies House | `/company/{number}/filing-history` |
| Insolvency details | Companies House | `/company/{number}/insolvency` |
| Gazette notices | London Gazette API | `thegazette.co.uk/notice?company-number={number}` |
| Other properties (CCOD) | Land Registry CCOD | Bulk data match on company name/number |
| CCJs | Registry Trust (paid) | ~£5 per search (future integration) |
| Individual owner | Land Registry title register | Purchased title (~£3) reveals individual names |
| Overseas entities | Companies House overseas register | `/company/{number}` where jurisdiction is foreign |

### B4.4 Owner-level deal signals

The owner profile generates deal-relevant signals:

| Signal | What it means | Score impact |
|--------|--------------|-------------|
| In administration | Administrator controls disposal | +2.0 |
| All directors resigned | No active management | +0.5 |
| Accounts 12m+ overdue | Financial distress | +0.5 |
| Charges exceed property value | Lender may accept shortfall | +1.0 |
| Multiple properties in admin | Portfolio disposal opportunity | +0.5 |
| Overseas entity | May have limited UK engagement | +0.3 |
| Dissolved company | Property may be bona vacantia | +1.0 |
| Active trader pattern | May respond quickly to offers | +0.3 |
| Long-term holder (10yr+) | May be emotionally attached | −0.3 |

---

## B5. ENRICHMENT API DETAIL

### B5.1 Full enrichment pipeline (what happens when you analyse a property)

```
Input (address/URL/PDF)
    │
    ├── 1. Geocode (enrich-asset.ts)
    │       Google Geocoding → lat/lng, postcode, formatted address
    │       Fallback: Nominatim OSM
    │       Cost: ~$0.005
    │
    ├── 2. EPC (dealscope-epc.ts)
    │       epc.opendatacommunities.org → rating, floor area, recommendations
    │       Also returns certificate PDF URL → auto-download as PropertyImage
    │       Cost: free
    │
    ├── 3. Land Registry — Price Paid (land-registry.ts)
    │       landregistry.data.gov.uk → sales history, prices, buyers
    │       Returns: [{date, price, buyer, type}]
    │       Cost: free
    │
    ├── 4. Land Registry — Title (if purchased)
    │       use.landregistry.gov.uk → title number, tenure, charges, covenants
    │       Returns title plan PDF → auto-store as PropertyImage
    │       Cost: ~£3 per title
    │       Credits: included in enrichment (5 credits)
    │
    ├── 5. Companies House (dealscope-companies-house.ts)
    │       api.company-information.service.gov.uk
    │       → company profile, officers, charges, filing history, insolvency
    │       Rate limit: 600/5min
    │       Cost: free
    │
    ├── 6. London Gazette (dealscope-gazette.ts)
    │       thegazette.co.uk → insolvency notices, winding up orders
    │       Cost: free
    │
    ├── 7. Planning (planning-feed.ts)
    │       planning.data.gov.uk → applications within radius
    │       planning-classifier.ts classifies type + normalises status
    │       dev-potential.ts assesses PD rights
    │       Cost: free
    │
    ├── 8. Historic England
    │       historicengland.org.uk → listed building check, conservation area
    │       Cost: free
    │
    ├── 9. Environment Agency
    │       environment.data.gov.uk → flood risk zones
    │       Cost: free
    │
    ├── 10. Google Images
    │        Static Maps API → satellite image
    │        Street View API → street-level image
    │        Cost: ~$0.007 per pair
    │
    ├── 11. AVM (avm.ts)
    │        3 valuation methods: comps, income cap, replacement cost
    │        Uses scout-benchmarks.ts for market yields
    │        Saves to PropertyValuation model
    │
    ├── 12. Returns (scout-returns.ts + hold-sell-model.ts)
    │        3 scenarios: hold, MEES upgrade, refurb+sell
    │        Saves to HoldSellScenario model
    │
    └── 13. AI Summary (Claude)
            Generate narrative analysis from all collected data
            Cost: ~$0.01 per summary
```

**Total API cost per enrichment: ~£2.50–3.50** (mostly Land Registry title if purchased)
**Total credits charged: 5**

### B5.2 Parallel execution

Sources 2-10 should execute in parallel (they're independent). Enrich returns partial data as each source completes, and the dossier renders progressively:

```typescript
const results = await Promise.allSettled([
  enrichEPC(postcode),
  enrichLandRegistry(address),
  enrichCompaniesHouse(ownerName),
  enrichGazette(companyNumber),
  enrichPlanning(lat, lng),
  enrichHistoricEngland(lat, lng),
  enrichEnvironmentAgency(lat, lng),
  enrichGoogleImages(lat, lng),
]);
// Each settled result updates the ScoutDeal record
// Frontend polls or uses SSE for progressive rendering
```

### B5.3 URL extraction pipeline

When user pastes a listing URL:

```
URL input
    │
    ├── Detect site: Rightmove / Zoopla / OnTheMarket / Auction house / Other
    │
    ├── Fetch page HTML (server-side to avoid CORS)
    │
    ├── Site-specific selectors extract:
    │   ├── Address
    │   ├── Price / guide price
    │   ├── Property type
    │   ├── Size (sqft/sqm)
    │   ├── Description text
    │   ├── Agent name + contact
    │   ├── Image URLs (all listing photos)
    │   └── Brochure PDF URL (if available)
    │
    ├── Download + classify images → PropertyImage
    │
    ├── If brochure PDF found → extract floor plans + site plans
    │
    └── Feed extracted address into standard enrichment pipeline
```

### B5.4 PDF extraction pipeline

When user uploads a brochure/catalogue:

```
PDF upload
    │
    ├── document-parser.ts → extract all text
    │
    ├── pdf-to-img → extract page images
    │
    ├── Claude AI → identify:
    │   ├── Property address(es)
    │   ├── Price / guide price
    │   ├── Property type + size
    │   ├── Auction lot number + date (if auction catalogue)
    │   └── Agent details
    │
    ├── Classify extracted images → PropertyImage
    │   ├── Floor plans (vector diagrams, room labels)
    │   ├── Site plans (boundary lines, compass)
    │   ├── Photos (exterior/interior)
    │   └── Maps (location context)
    │
    ├── If multiple addresses found (auction catalogue):
    │   └── Show disambiguation: "We found 6 properties in this catalogue. Which one?"
    │
    └── Feed confirmed address into enrichment pipeline
```

---

## B6. COMPLETE FILE INVENTORY

All output files for the DealScope build:

| File | Type | What it covers |
|------|------|---------------|
| `DEALSCOPE-BUILD-SPEC.md` | Spec | Master build spec: routes, APIs, models, components, build order |
| `DEALSCOPE-BUILD-SPEC-ADDENDUM.md` | Spec | Corrections: discovered infrastructure, Market tab, friendly errors |
| `DEALSCOPE-BUILD-SPEC-FINAL.md` | Spec | **This file.** Token economy, currency, images, owner intel, API detail |
| `DEALSCOPE-GAP-ANALYSIS.md` | Analysis | Code audit + what's built vs needed |
| `DEALSCOPE-DESIGN-INVENTORY.md` | Checklist | ~160 designs catalogued |
| `dealscope-v6.html` | Design | Reference product mockup (full product) |
| `batch1a-home-search-states.html` | Design | 17 states: Home, Search, Address, Company, Enrichment, Onboarding 1-3 |
| `batch1b-dossier-full.html` | Design | 8 states: Full dossier (7 tabs + partial data) |
| `batch1c-pipeline-alerts-settings.html` | Design | 8 states: Pipeline, Alerts, Settings |
| `batch2-actions-exports.html` | Design | 13 states: Modals, PDFs, toasts, confirmations |
| `batch3-5-remaining.html` | Design | 17 states: Errors (old), Onboarding 4-5, Emails, Advanced |
| `batch-updates-market-errors.html` | Design | 5 states: Friendly errors, Market Intelligence tab, Full downloads |

**Read order for a new developer:**
1. `DEALSCOPE-BUILD-SPEC.md` (master)
2. `DEALSCOPE-BUILD-SPEC-ADDENDUM.md` (corrections)
3. This file (`DEALSCOPE-BUILD-SPEC-FINAL.md`) (infrastructure)
4. `dealscope-v6.html` (see what we're building)
5. Design batch files (reference for every state)
6. `DEALSCOPE-GAP-ANALYSIS.md` (understand existing code)

---

*This completes the DealScope specification. Three spec documents + one gap analysis + one design inventory + seven design HTML files = everything needed to build the product.*
