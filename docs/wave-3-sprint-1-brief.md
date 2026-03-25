# RealHQ Wave 3 — Sprint 1 Product Brief

**Author:** Head of Product
**Date:** 2026-03-24
**Spec refs:** RealHQ-Spec-v3.2.html §6 (Ask), §5.5 (Lettings), Addendum v3.1 §7
**Wave 3 triage:** `docs/wave-3-triage.md`
**Target:** 2-week sprint, FSE + FE

---

## Sprint Goal

Ship two features that immediately increase the gap between RealHQ and any property management tool:

1. **Ask RealHQ AI** — a conversational AI panel using real user portfolio data (not demo data)
2. **Lettings Workflow** — end-to-end vacant unit → new tenant workflow with 10% commission trigger on new-letting HoT

Both are unblocked by Wave 2 completion. Both are high-leverage: Ask AI drives retention; Lettings is the highest-commission Wave 3 feature.

---

## Why these two, in Sprint 1

| Feature | Why Sprint 1 |
|---------|--------------|
| Ask RealHQ AI | `GET /api/user/ask-context` already builds full portfolio context. The upgrade is routing real user data into the existing `POST /api/ask` handler — estimated 1 day BE + 1 day FE. Very high retention impact. |
| Lettings | Wave 2 vacancy data is now live (tenant health scores, expiry tracking, vacant flags). The revenue case is clear: 10% of first year's contracted rent per letting. First 3 lettings recover the Wave 3 sprint cost entirely. |

---

## Feature 1: Ask RealHQ AI (T3-16)

### What it builds

A conversational AI panel embedded in the dashboard sidebar (currently labelled "Ask RealHQ AI" in the navigation). User types a natural-language question about their portfolio and gets an AI answer with links to relevant screens.

**Examples:**
- "What's my best-performing asset?" → ranks assets by NOI yield, links to asset detail
- "Which leases expire in the next 6 months?" → lists expiring leases, links to `/rent-clock`
- "How much could I save on energy?" → summarises energy saving, links to `/energy`
- "What's my total unactioned opportunity?" → pulls from action queue, links to `/dashboard`
- "Which property has the biggest rent uplift gap?" → compares ERV vs passing rent per asset

### Current state

- `POST /api/ask` exists but uses **static demo portfolio data** — it reads from `fl-mixed` or `se-logistics` static files, not the user's real data
- `GET /api/user/ask-context` is built and returns full real user portfolio context: assets, incomes, savings, opportunities, compliance, upcoming renewals
- There is no conversation UI — the existing `ask` endpoint is called from the portfolio demo only

### What to build

**BE: Upgrade `POST /api/ask` (or new `POST /api/user/ask`)**

Change the handler to:
1. Auth-gate the endpoint (session required)
2. Call `GET /api/user/ask-context` internally (or share the `buildAskContext()` function) to get the user's real portfolio summary
3. Build a Claude prompt with this context + the user's question
4. Stream the Claude response via server-sent events (SSE)

The existing `ask-context` route already produces a rich text summary including: per-asset financials, insurance savings, energy savings, rent gaps, compliance status, upcoming expirations, ancillary income opportunities. Use this as the system prompt context.

**Prompt structure:**
```
System: You are RealHQ's portfolio intelligence assistant. You have full access to this owner's commercial property portfolio data. Answer questions concisely and accurately. Always cite specific figures from the portfolio data. When a question can be answered by navigating to a specific screen, include the URL path.

Portfolio context:
{ask-context text output}

User question: {question}
```

**Route:** `POST /api/user/ask`
**Body:** `{ question: string }`
**Response:** `text/event-stream` — SSE stream of `{ delta: string }` chunks, then `{ done: true, sources: ContextLink[] }`

**Sources:** After the answer completes, return up to 3 source links:
```typescript
interface ContextLink {
  label: string;   // e.g. "Rent Clock", "Energy optimisation"
  href: string;    // e.g. "/rent-clock", "/energy"
}
```
Derive sources from which sections of the portfolio context were mentioned in the answer.

**Context size management:** The `ask-context` output is already token-efficient (text summary, not raw JSON). For portfolios >20 assets, truncate to top 10 by NOI yield for the per-asset detail section.

**FE: Ask panel in dashboard sidebar**

Add a collapsible panel (or modal trigger) in the dashboard. On the main dashboard, add a text input with the placeholder "Ask anything about your portfolio…" positioned after the action queue section (Section 9) or in the sidebar if the layout supports it.

- Input: single text field + submit button (or Enter key)
- Loading state: "Thinking…" spinner while SSE stream starts
- Response: render AI answer as markdown below the input (streaming — append deltas)
- Sources: show as small links below the answer once stream completes
- History: keep last 3 questions in state (no persistence needed in Sprint 1)
- Clear button: reset to empty state

**Auth guard:** If user is not a real user (demo portfolio), show "Add your first property to ask questions about your portfolio" placeholder instead of the input.

### Acceptance criteria

- [ ] `POST /api/user/ask` requires auth — 401 if unauthenticated
- [ ] Response uses real user portfolio data — not fl-mixed or se-logistics static files
- [ ] Answer is streamed via SSE — not a single blocking JSON response
- [ ] Asking "What's my total unactioned opportunity?" returns the correct figure from the user's action queue
- [ ] Asking "Which lease expires soonest?" returns the correct lease from the user's data
- [ ] Sources array includes 1–3 relevant navigation links
- [ ] Dashboard UI renders the Ask panel with streaming text
- [ ] Demo users see placeholder, not broken UI
- [ ] No cross-user data leakage — Claude only sees the requesting user's data

### Commission

None. Retention driver. Reduces churn.

### Env vars needed

`ANTHROPIC_API_KEY` — already in production.

---

## Feature 2: Lettings Workflow (T3-15)

### What it builds

End-to-end workflow for filling vacant commercial units with new tenants. Triggered when a lease expires or a unit is marked vacant. Covers: vacancy identification, applicant enquiry capture, Companies House tenant check, new-letting Heads of Terms generation via Claude, commission trigger (10% of first year's contracted rent) on HoT agreed.

**This is not the same as Rent Review.** Rent Review (Wave 2) handles renewing EXISTING tenants. Lettings handles finding NEW tenants for vacant units.

### Vacancy entry points

1. **From Tenants page:** when a lease shows `leaseStatus: "expired"` or `"vacant"` — "Find new tenant" CTA
2. **From Rent Clock:** when days-to-expiry reaches 0 — "Tenant departed — start letting" CTA
3. **From Asset detail:** "Find tenant →" button on vacant-unit assets

### New routes

#### `POST /api/user/lettings`
Creates a letting record for a vacant asset/unit.

```typescript
// Body
{
  assetId: string;
  unitRef?: string;        // for multi-let assets
  askingRent: number;      // annual, in asset currency
  leaseTermYears?: number; // target lease term
  useClass?: string;       // B8, E(g)(i), etc.
  notes?: string;
}

// Response
{
  letting: {
    id: string;
    assetId: string;
    status: "active" | "under_offer" | "let" | "withdrawn";
    createdAt: string;
    askingRent: number;
    enquiries: Enquiry[];
  }
}
```

**Prisma model:**
```prisma
model Letting {
  id              String    @id @default(cuid())
  userId          String
  assetId         String
  unitRef         String?
  status          String    @default("active")
  askingRent      Float
  leaseTermYears  Float?
  useClass        String?
  notes           String?
  agreedRent      Float?    // filled on HoT agreed
  agreedTermYears Float?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  asset           UserAsset @relation(fields: [assetId], references: [id])
  user            User      @relation(fields: [userId], references: [id])
  enquiries       Enquiry[]
  commission      Commission?
}

model Enquiry {
  id               String   @id @default(cuid())
  lettingId        String
  companyName      String
  contactName      String?
  email            String?
  phone            String?
  useCase          String?  // "Distribution hub", "Workshop", "Office" etc.
  covenantGrade    String?  // from Companies House check
  covenantCheckedAt DateTime?
  createdAt        DateTime @default(now())
  letting          Letting  @relation(fields: [lettingId], references: [id])
}
```

#### `POST /api/user/lettings/:lettingId/enquiries`
Records a prospective tenant enquiry and runs Companies House covenant check.

```typescript
// Body
{
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  useCase?: string;
  companiesHouseNumber?: string; // optional: if provided, skip Companies House search
}

// Response
{
  enquiry: {
    id: string;
    companyName: string;
    covenantGrade: string | null; // A/B/C/D from Companies House check
    covenantCheckedAt: string | null;
  }
}
```

Uses `src/lib/covenant-check.ts` (already built in Wave 2). Graceful fallback if `COMPANIES_HOUSE_API_KEY` is absent.

#### `POST /api/user/lettings/:lettingId/hot`
Generates new-letting Heads of Terms via Claude and triggers commission record on completion.

```typescript
// Body
{
  enquiryId: string;
  agreedRent: number;
  agreedTermYears: number;
  breakClause?: string;    // e.g. "Tenant break at year 3 with 6 months notice"
  rentFreeMonths?: number; // incentive package
  premiumLease?: boolean;  // landlord premium on below-market rent
}

// Response
{
  hot: {
    id: string;
    body: string; // AI-generated HoT as markdown
    lettingId: string;
    agreedRent: number;
  }
  commission: {
    amount: number;       // 10% of first year's contracted rent
    currency: string;
    category: "lettings";
  }
}
```

**Claude prompt for new-letting HoT:**
```
You are a commercial property lawyer drafting Heads of Terms for a new commercial lease.

Asset: {assetName}, {assetType}, {location}
Tenant: {companyName} (Covenant grade: {covenantGrade})
Agreed rent: {sym}{agreedRent}/yr
Lease term: {agreedTermYears} years
Break clause: {breakClause or "None"}
Rent-free: {rentFreeMonths} months (if any)

Draft a complete Heads of Terms in standard UK commercial property format with these clauses:
1. Parties (Landlord / Tenant / Guarantor if applicable)
2. Premises (address, use class)
3. Term and commencement
4. Rent and review schedule
5. Rent-free period (if applicable)
6. Permitted use and subletting
7. Service charge and outgoings
8. Break options
9. Security of tenure (LTA 1954 — contracted out or not)
10. Conditions (Board / SDLT / planning consent if required)
11. Costs (each party bears own costs unless otherwise agreed)
12. Subject to contract

Format as a numbered list. Flag any unusual terms in [REVIEW] tags.
```

**Commission record:**
```typescript
// NOTE: Commission model uses annualSaving/commissionRate/commissionValue — NOT amount/currency/description
await prisma.commission.create({
  data: {
    userId: session.user.id,
    assetId: assetId ?? undefined,
    category: "lettings",
    annualSaving: agreedRent,    // new rental income achieved
    commissionRate: 0.10,        // 10% of first year's rent
    commissionValue: Math.round(agreedRent * 0.10),
    status: "confirmed",
    placedAt: new Date(),
  }
});
```

#### `GET /api/user/lettings`
Returns all active lettings for the user, with enquiry count.

#### `PATCH /api/user/lettings/:lettingId`
Updates letting status (`active` → `under_offer` → `let` → `withdrawn`). Marks `agreedRent`, `agreedTermYears` when status → `let`.

### FE: Lettings UI

**Entry point:** Add "Find tenant →" CTA to the Tenants page for leases with `leaseStatus: "expired"` or `"vacant"`. When clicked, opens an "Activate letting" modal that calls `POST /api/user/lettings`.

**Lettings management panel:** On the Tenants page, add a collapsible "Vacant units" section above the tenant list when any asset has vacant status. Each row shows: asset name, asking rent, days vacant, enquiry count, current status badge. "Add enquiry" → opens a mini-form calling `POST /api/user/lettings/:id/enquiries`.

**HoT generation:** When an enquiry is selected and an asking rent is agreed, "Generate Heads of Terms" button calls `POST /api/user/lettings/:id/hot`. Renders draft HoT in a preview pane with "Download PDF" (print-to-PDF) and "Copy" buttons. Commission disclosure: "RealHQ earns 10% of first year's rent on completion: £X,XXX".

**Commission visibility:** When HoT is generated, show commission amount prominently alongside the HoT. This is the first screen in the product where the user sees what RealHQ earns — frame it clearly as a success/alignment moment, not a hidden fee.

### Acceptance criteria

- [ ] `POST /api/user/lettings` creates a `Letting` record, returns letting object
- [ ] `POST /api/user/lettings/:id/enquiries` creates an `Enquiry`, runs covenant check if `COMPANIES_HOUSE_API_KEY` set
- [ ] `POST /api/user/lettings/:id/hot` generates a 12-clause HoT via Claude, creates `Commission` record at 10%
- [ ] Commission amount is correct: 10% of `agreedRent` for one year
- [ ] HoT references the specific tenant, asset, agreed rent, and term
- [ ] Tenants page shows "Vacant units" section for users with expired/vacant leases
- [ ] "Find tenant →" CTA visible on expired-lease rows in the Tenants page
- [ ] HoT preview renders with copy button; commission disclosure visible
- [ ] No commission record created until HoT is generated (HoT = agreed intent signal)
- [ ] Letting status progresses: active → under offer → let (manual update via PATCH)

### Commission

**10% of first year's contracted rent** per new letting, triggered on HoT generation.
Example: £120,000/yr rent × 10% = **£12,000 commission per letting**.

This is the highest single-transaction commission in the Wave 2/3 product. First 3 lettings in the UK commercial market (average industrial/logistics rent ~£8–15/sqft) will generate £30–60k revenue.

### Env vars needed

- `ANTHROPIC_API_KEY` — already in production
- `COMPANIES_HOUSE_API_KEY` — free, needed for covenant check (graceful fallback if absent)
- `RESEND_API_KEY` — already in production, used for HoT delivery email (optional)

---

## Schema additions summary

```prisma
// New models
model Letting   { ... } // see above
model Enquiry   { ... } // see above

// No new fields on existing models needed
// Reuses: Commission.category = "lettings" (new category value)
// Reuses: covenant-check.ts, email.ts, Claude fetch pattern
```

Migration file: `prisma/migrations/20260324_wave3_lettings/migration.sql`

---

## Scope and sequencing

| Item | Estimate | Who | Dependency |
|------|----------|-----|------------|
| Ask AI: upgrade `POST /api/ask` to use real data | 1 day | FSE | None — `ask-context` already built |
| Ask AI: SSE streaming + FE panel | 1 day | FE | FSE route done |
| Lettings: schema + 4 BE routes | 2 days | FSE | None |
| Lettings: Tenants page UI (vacant section + HoT preview) | 2 days | FE | FSE routes done |
| Lettings: Companies House enquiry check | 0.5 days | FSE | `covenant-check.ts` already built |
| Total | **~6.5 days** | FSE + FE | — |

---

## What this sprint does NOT include

- Rightmove Commercial / CoStar listing export — Wave 3 Sprint 2. Platform decision and field spec written: `docs/wave-3-lettings-listing-export-spec.md`. Short answer: FL = CoStar/LoopNet (Rightmove is UK-only); MVP = listing export card, not API integration.
- Tenant application portal for inbound enquiries — Wave 3 Sprint 3
- Digital lease signing (DocuSign) — Wave 3 Sprint 3
- Full Transaction Room — Wave 3 Sprint 2 (once Scout testing complete)

---

## Go-live check

The Ask AI feature is safe to ship behind `isRealUser === true` check — demo users see placeholder.
The Lettings feature is safe to ship once schema migration runs — all existing data unaffected.

---

*Sprint 1 target: 10 working days from schema migration · Owner: FSE + FE · Approver: CEO*
