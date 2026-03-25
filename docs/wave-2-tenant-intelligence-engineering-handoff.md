# Wave 2 — Tenant Intelligence Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-22
**Status:** Ready to build
**Revenue:** Feeds rent review commission (8% of uplift — see `wave-2-rent-review-automation.md`); tenant find advisory fee (Wave 3)
**Sources:** RealHQ-Spec-v3.2 Section 4, wave-2-rent-review-automation.md

---

## Overview

Wave 1 Tenant Intelligence has a page, a health score function, and engagement action endpoints — but:

- **The tenants page shows zero real data for real users.** It reads from `portfolioData.assets[].leases` (demo data only). Real users who upload lease PDFs have their data in `Document.extractedData` JSON but it never reaches the tenants page.
- **Engagement actions do nothing.** Clicking "Engage Renewal" creates a `TenantEngagementAction` record. No letter is generated, no email is sent, nothing happens.
- **Payment history is static.** The `PaymentSparkline` component renders 12 hardcoded green bars. There is no payment tracking in the DB.
- **Health score is one-dimensional.** It only uses days-to-expiry. No payment history, no covenant quality, no sector health.

Wave 2 fixes all of this:

1. **`Tenant` and `Lease` Prisma models** — first-class relational records populated from uploaded PDFs
2. **`GET /api/user/tenants`** — new route that reads from `Tenant` / `Lease` models; falls back to `lease-summary` parsing for users without structured records
3. **Engagement letter generation** — Claude writes a professional renewal or relet letter; owner reviews and confirms sending
4. **`TenantPayment` model** — payment history tracking (manual entry Wave 2, GoCardless import Wave 3)
5. **Health score v2** — composite of days-to-expiry (40%), payment history (30%), covenant quality (20%), sector health (10%)
6. **Companies House covenant check** — automated tenant company financial health lookup for UK tenants
7. **Automated engagement cron** — `POST /api/cron/tenant-engagement-triggers` at 18m/12m/6m/3m horizons
8. **Tenants page wired to real DB data** — renders `Tenant`/`Lease` records, not demo portfolio data

**Relationship to rent review spec:** The `wave-2-rent-review-automation.md` spec covers the high-value RealHQ advisory service (ERV research, leverage scoring, HoT generation, 8% commission). Tenant Intelligence Wave 2 covers the owner's day-to-day tenant management tools. When a lease expires within 18 months, the cron in this spec creates a `TenantEngagementAction`; the rent review cron (separate) creates a `RentReviewEvent`. Both can run independently.

---

## What's already built (Wave 1)

- Tenants page (`/tenants`) — health score bars, renewal probability, payment sparkline (static), engagement action buttons
- `TenantEngagementAction` model — records `engage_renewal` / `relet` / `review_break` by leaseRef + userId
- `POST /api/user/tenants/[leaseRef]/engage-renewal` — creates `TenantEngagementAction`, returns action record
- `POST /api/user/tenants/[leaseRef]/relet` — same pattern
- `POST /api/user/tenants/[leaseRef]/review-break` — same pattern
- `GET /api/user/tenants/actions` — returns list of actioned leaseRefs
- `GET /api/user/lease-summary` — reads `Document.extractedData` JSON, computes WAULT + rentAtRisk (but not called by tenants page)

---

## Critical problem: tenants page is not wired to real data

The tenants page calls `usePortfolio(portfolioId)` and calls `buildTenants(portfolio)`. For real users with `portfolioId === "user"`, `portfolio.assets` is empty (no leases in the user portfolio object). The page shows an empty state or falls through to demo data.

**The fix is two steps:**
1. Build `GET /api/user/tenants` that returns real tenant/lease data from the DB
2. Add a `useRealTenants` hook that calls this route, and use it in the page when `portfolioId === "user"`

---

## 1. Prisma schema additions

### `Tenant` — structured tenant record

```prisma
model Tenant {
  id              String   @id @default(cuid())
  userId          String
  assetId         String?  // may span multiple assets (rare)
  name            String
  companyRegNo    String?  // Companies House / EIN
  contactEmail    String?
  contactName     String?
  contactPhone    String?
  sector          String?  // "logistics" | "manufacturing" | "retail" | "office" | "industrial" | "other"
  covenantGrade   String?  // "strong" | "satisfactory" | "weak" | "unknown"
  covenantScore   Float?   // 0–100 from Companies House financial data
  covenantCheckedAt DateTime?
  notes           String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset   UserAsset? @relation(fields: [assetId], references: [id], onDelete: SetNull)
  leases  Lease[]
  payments TenantPayment[]
  engagements TenantEngagement[]
}
```

### `Lease` — structured lease record

```prisma
model Lease {
  id              String   @id @default(cuid())
  userId          String
  tenantId        String
  assetId         String
  documentId      String?  // source Document if parsed from PDF

  // Core lease terms
  leaseRef        String?  // internal ref or document ref
  sqft            Int
  passingRent     Float    // annual, £/$
  rentPerSqft     Float?   // derived: passingRent / sqft
  startDate       DateTime?
  expiryDate      DateTime?
  breakDate       DateTime?
  reviewDate      DateTime?
  tenureType      String   @default("leasehold") // "leasehold" | "freehold"
  currency        String   @default("GBP")

  // Computed / enriched
  daysToExpiry    Int?     // refreshed by cron
  status          String   @default("active")
  // "active" | "expiring_soon" | "expired" | "vacant" | "surrendered"
  waultContribution Float?  // sqft × daysToExpiry / totalSqft (for WAULT)

  // Market data
  marketERVPerSqft Float?   // from UserAsset.marketRentSqft or CoStar
  revertPotential Float?   // (marketERV - passingRent/sqft) × sqft = uplift headroom

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  asset     UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  document  Document? @relation(fields: [documentId], references: [id], onDelete: SetNull)
  payments  TenantPayment[]
  engagements TenantEngagement[]
}
```

Add `leases Lease[]` and `tenants Tenant[]` to `UserAsset` and `User`.

### `TenantPayment` — payment history

```prisma
model TenantPayment {
  id          String   @id @default(cuid())
  userId      String
  tenantId    String
  leaseId     String
  periodStart DateTime
  periodEnd   DateTime
  amountDue   Float
  amountPaid  Float    @default(0)
  paidAt      DateTime?
  status      String   @default("due")
  // "due" | "paid" | "late" | "partial" | "missed"
  lateDays    Int?     // days late if status = "late"
  notes       String?
  createdAt   DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lease  Lease  @relation(fields: [leaseId], references: [id], onDelete: Cascade)

  @@index([leaseId])
}
```

### `TenantEngagement` — replaces `TenantEngagementAction`

```prisma
model TenantEngagement {
  id           String   @id @default(cuid())
  userId       String
  tenantId     String?
  leaseId      String?
  leaseRef     String?  // backward compat with Wave 1 TenantEngagementAction.leaseRef
  actionType   String
  // "engage_renewal" | "relet" | "review_break" | "rent_review" | "chase_payment"
  status       String   @default("requested")
  // "requested" | "letter_drafted" | "letter_sent" | "responded" | "completed" | "cancelled"
  letterBody   String?  @db.Text     // Claude-generated letter
  letterSubject String?
  sentAt       DateTime?
  respondedAt  DateTime?
  requestedAt  DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: SetNull)
  lease  Lease?  @relation(fields: [leaseId], references: [id], onDelete: SetNull)
}
```

Keep `TenantEngagementAction` model but deprecate. New code uses `TenantEngagement`. Old action routes continue to write to `TenantEngagementAction` for backward compat.

Add `engagements TenantEngagement[]` to `User`.

---

## 2. Data population — from uploaded PDFs to structured records

When a lease PDF is processed (existing flow: `Document` → Textract → Claude extraction → `document.extractedData` JSON), Wave 2 adds a step: **materialise into `Tenant` + `Lease` records**.

### `POST /api/user/leases/materialise`

Called after document extraction completes. Also callable on demand by user.

```ts
// Body: { documentId?: string }  // if omitted, process all unprocessed lease docs
// Process:
// 1. Find all lease/rent_roll Documents with status="done" for the user
// 2. For each Document, if no Lease.documentId matches: create Tenant + Lease records
// 3. Tenant: upsert by (userId, name) — avoid creating duplicate tenant records
// 4. Lease: upsert by (userId, assetId, documentId)
// Response: { tenantsCreated: N, leasesCreated: N }

async function materialiseLease(doc: Document, userId: string) {
  const data = doc.extractedData as Record<string, unknown>;

  if (doc.documentType === "rent_roll") {
    const properties = (data.properties as Record<string, unknown>[]) ?? [];
    for (const p of properties) {
      if ((p.tenant as string) === "Vacant") continue;

      // Find linked asset by address match
      const asset = await findAssetByAddress(userId, p.address as string);

      const tenant = await prisma.tenant.upsert({
        where: { /* userId + name composite */ },
        create: {
          userId,
          assetId: asset?.id,
          name: p.tenant as string,
          sector: inferSector(p.tenant as string),
        },
        update: {},
      });

      await prisma.lease.upsert({
        where: { /* userId + documentId + index */ },
        create: {
          userId,
          tenantId: tenant.id,
          assetId: asset?.id ?? "",
          documentId: doc.id,
          sqft: Number(p.sqft) || 0,
          passingRent: Number(p.passingRent) || 0,
          rentPerSqft: Number(p.sqft) > 0 ? Number(p.passingRent) / Number(p.sqft) : null,
          expiryDate: p.leaseExpiry ? new Date(p.leaseExpiry as string) : null,
          breakDate: p.breakDate ? new Date(p.breakDate as string) : null,
          currency: asset?.country === "UK" ? "GBP" : "USD",
          status: deriveLeaseStatus(p.leaseExpiry as string),
        },
        update: { /* update rent, dates if changed */ },
      });
    }
  } else {
    // Single lease_agreement — similar pattern
  }
}
```

### Call `materialise` automatically

Hook into the document processing completion. After `document.status = "done"` is set, call `materialiseLease`. Options:
- In the existing document extraction route, after update
- Or: check `Lease.documentId IS NULL` for done documents on page load (lazy materialisation)

**Recommendation:** Lazy — call `materialise` at the start of `GET /api/user/tenants` if any `Document` type lease/rent_roll has `status=done` but no corresponding `Lease.documentId`.

---

## 3. New API routes

### `GET /api/user/tenants`

The core new route. Returns structured tenant/lease data for the tenants page.

```ts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ tenants: [] });

  // Lazy materialisation: check for unprocessed lease documents
  await materialisePendingLeases(session.user.id);

  const leases = await prisma.lease.findMany({
    where: { userId: session.user.id },
    include: {
      tenant: true,
      asset: { select: { name: true, location: true, marketRentSqft: true, country: true } },
      payments: {
        orderBy: { periodStart: "desc" },
        take: 12,  // last 12 payment periods for sparkline
      },
    },
    orderBy: { daysToExpiry: "asc" },
  });

  const today = new Date();
  const result = leases.map((lease) => {
    const daysToExpiry = lease.expiryDate
      ? Math.floor((lease.expiryDate.getTime() - today.getTime()) / 86_400_000)
      : null;
    const score = calculateHealthScore(lease, lease.tenant, lease.payments);
    const revertPotential = lease.asset.marketRentSqft && lease.rentPerSqft
      ? (lease.asset.marketRentSqft - lease.rentPerSqft) * lease.sqft
      : null;

    return {
      id: lease.id,
      leaseRef: lease.leaseRef ?? lease.id,
      tenant: lease.tenant.name,
      tenantId: lease.tenantId,
      assetId: lease.assetId,
      assetName: lease.asset.name,
      sqft: lease.sqft,
      rentPerSqft: lease.rentPerSqft ?? 0,
      annualRent: lease.passingRent,
      startDate: lease.startDate?.toISOString().split("T")[0] ?? null,
      expiryDate: lease.expiryDate?.toISOString().split("T")[0] ?? null,
      breakDate: lease.breakDate?.toISOString().split("T")[0] ?? null,
      reviewDate: lease.reviewDate?.toISOString().split("T")[0] ?? null,
      daysToExpiry,
      leaseStatus: deriveLeaseStatus(lease.expiryDate),
      healthScore: score,
      renewalProbability: calculateRenewalProbability(daysToExpiry, score),
      covenantGrade: lease.tenant.covenantGrade ?? "unknown",
      revertPotential,
      currency: lease.currency,
      sym: lease.currency === "GBP" ? "£" : "$",
      paymentHistory: lease.payments.map(p => ({
        period: p.periodStart.toISOString().split("T")[0],
        status: p.status,
      })),
    };
  });

  // Aggregate metrics
  const occupied = result.filter(l => l.leaseStatus !== "vacant" && l.sqft > 0 && l.daysToExpiry !== null && l.daysToExpiry > 0);
  const waultNum = occupied.reduce((s, l) => s + l.sqft * (l.daysToExpiry ?? 0), 0);
  const waultDen = occupied.reduce((s, l) => s + l.sqft, 0);
  const wault = waultDen > 0 ? Math.round((waultNum / waultDen / 365) * 10) / 10 : 0;
  const rentAtRisk = result
    .filter(l => l.daysToExpiry !== null && l.daysToExpiry <= 365)
    .reduce((s, l) => s + l.annualRent, 0);

  return NextResponse.json({ tenants: result, wault, rentAtRisk });
}
```

### `POST /api/user/tenants/[leaseRef]/engage-renewal` (enhance existing)

Existing route creates `TenantEngagementAction`. Wave 2 enhancement: **generate a renewal letter via Claude** and store as `TenantEngagement.letterBody`.

```ts
// Body: { tone?: "formal" | "friendly" }
// Process:
// 1. Create TenantEngagement (new model) with status = "requested"
// 2. Also create TenantEngagementAction (backward compat)
// 3. Call Claude to draft letter
// 4. Update TenantEngagement: letterBody, status = "letter_drafted"
// Response: { engagement: TenantEngagement; letter: string }
```

**Claude renewal letter prompt:**

```
You are a commercial property manager writing on behalf of a property owner.
Draft a professional letter to a commercial tenant regarding lease renewal.

Tenant: {tenantName}
Property: {propertyAddress}
Current annual rent: {sym}{passingRent}
Current sqft: {sqft} sqft
Lease expiry: {expiryDate} ({daysToExpiry} days)
{breakDate ? `Break clause: ${breakDate}` : ""}
{revertPotential > 0 ? `Market ERV indicates ${sym}${Math.round(revertPotential).toLocaleString()} renewal uplift headroom` : ""}
Tone: {tone ?? "professional and positive"}

Write a {tone ?? "formal"} letter:
1. Open: acknowledge the upcoming expiry; note the positive relationship
2. Propose: suggest a renewal discussion; offer a meeting
3. Headline: if revert potential is positive, reference that market conditions support a review
4. Close: sign-off from owner with placeholder signature block
Do not mention RealHQ. Write as if directly from the landlord.
Maximum 250 words. UK English.
```

### `POST /api/user/tenants/[leaseId]/letter/send`

Confirms the owner has reviewed the letter and sends it.

```ts
// Body: { engagementId: string; emailOverride?: string }
// Process:
// 1. Look up TenantEngagement.letterBody
// 2. Look up Tenant.contactEmail (or emailOverride)
// 3. Send via Resend with letterBody as HTML
// 4. Update TenantEngagement: status = "letter_sent", sentAt = now()
// Response: { sent: true; sentTo: string }
```

### `POST /api/user/tenants/[leaseRef]/relet` (enhance existing)

Same pattern as engage-renewal but for relet/tenant find:

```ts
// Generates a relet brief: target tenant profile, rent ask, incentive package
// Claude prompt: "Write a commercial property relet brief for marketing to prospective tenants"
// Creates TenantEngagement with actionType = "relet"
```

### `POST /api/user/tenants/[leaseId]/payments`

Add a payment record manually (Wave 2 — GoCardless auto-import is Wave 3).

```ts
// Body: { periodStart: string; periodEnd: string; amountDue: number; amountPaid: number; paidAt?: string; status: string }
// Creates TenantPayment record
// Response: { payment: TenantPayment }
```

### `GET /api/user/tenants/[leaseId]/payments`

Returns payment history for a lease.

```ts
// Response: { payments: TenantPayment[]; summary: { onTime: N; late: N; missed: N } }
```

---

## 4. Health score v2

Replace the single-dimension `healthScore(daysToExpiry, status)` function in `src/lib/tenant-health.ts`.

```ts
interface HealthScoreInputs {
  daysToExpiry: number | null
  leaseStatus: string
  payments: { status: string }[]  // last 12 periods
  covenantGrade: "strong" | "satisfactory" | "weak" | "unknown"
  sector: string | null           // for sector health weighting
}

export function calculateHealthScore(inputs: HealthScoreInputs): number {
  if (inputs.leaseStatus === "expired") return 0;
  if (inputs.daysToExpiry === null) return 60;  // no expiry data = moderate

  // Component 1: Days to expiry (40% weight, max 40 points)
  const expiryScore =
    inputs.daysToExpiry < 90   ? 5  :
    inputs.daysToExpiry < 180  ? 15 :
    inputs.daysToExpiry < 365  ? 25 :
    inputs.daysToExpiry < 730  ? 35 : 40;

  // Component 2: Payment history (30% weight, max 30 points)
  const recent = inputs.payments.slice(0, 12);
  const onTime = recent.filter(p => p.status === "paid").length;
  const late   = recent.filter(p => p.status === "late").length;
  const missed = recent.filter(p => p.status === "missed").length;
  const total  = recent.length;
  const paymentScore = total === 0
    ? 20  // no history — neutral
    : Math.round(30 * (onTime / total) - (5 * missed / total));

  // Component 3: Covenant quality (20% weight, max 20 points)
  const covenantScore =
    inputs.covenantGrade === "strong"        ? 20 :
    inputs.covenantGrade === "satisfactory"  ? 14 :
    inputs.covenantGrade === "weak"          ? 5  : 10; // unknown = 10

  // Component 4: Sector health (10% weight, max 10 points)
  const sectorScore = getSectorHealthScore(inputs.sector);

  return Math.min(100, Math.max(0, expiryScore + paymentScore + covenantScore + sectorScore));
}

function getSectorHealthScore(sector: string | null): number {
  const scores: Record<string, number> = {
    logistics:      10,   // strong SE UK / FL demand
    manufacturing:  8,
    industrial:     9,
    office:         6,    // hybrid working pressures
    retail:         4,    // structural headwinds
    flex:           8,
    other:          6,
  };
  return scores[sector ?? "other"] ?? 6;
}
```

---

## 5. Companies House covenant check (UK)

Run after `Tenant` record is created if tenant has no `covenantGrade`.

```ts
// src/lib/covenant-check.ts

export async function checkCovenantUK(tenantName: string): Promise<{
  grade: "strong" | "satisfactory" | "weak" | "unknown"
  score: number
  companyNo?: string
}> {
  if (!process.env.COMPANIES_HOUSE_API_KEY) {
    return { grade: "unknown", score: 50 };
  }

  // Step 1: Search for company
  const searchRes = await fetch(
    `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(tenantName)}&items_per_page=3`,
    { headers: { Authorization: `Basic ${btoa(process.env.COMPANIES_HOUSE_API_KEY + ":")}` } }
  );
  const searchData = await searchRes.json();
  const company = searchData.items?.[0];
  if (!company) return { grade: "unknown", score: 50 };

  // Step 2: Get company profile
  const profileRes = await fetch(
    `https://api.company-information.service.gov.uk/company/${company.company_number}`,
    { headers: { Authorization: `Basic ${btoa(process.env.COMPANIES_HOUSE_API_KEY + ":")}` } }
  );
  const profile = await profileRes.json();

  // Step 3: Score based on status + accounts
  const isActive = profile.company_status === "active";
  const accountsFiledRecently = profile.accounts?.next_due
    ? new Date(profile.accounts.next_due) > new Date(Date.now() - 365 * 24 * 3600 * 1000)
    : false;
  const hasConfirmationStatement = profile.confirmation_statement?.last_made_up_to != null;

  const score =
    !isActive             ? 20 :
    !accountsFiledRecently ? 55 :
    !hasConfirmationStatement ? 65 :
    80;

  const grade =
    score >= 75 ? "strong" :
    score >= 55 ? "satisfactory" :
    "weak";

  return { grade, score, companyNo: company.company_number };
}
```

Call `checkCovenantUK` in the `materialiseLease` function after creating a `Tenant` record. For US tenants, skip covenant check (no equivalent free API).

---

## 6. Automated engagement cron — `POST /api/cron/tenant-engagement-triggers`

Daily cron. Finds leases reaching 18m, 12m, 6m, 3m horizons and creates engagement prompts.

```ts
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const horizons = [
    { months: 18, label: "18 months" },
    { months: 12, label: "12 months" },
    { months:  6, label: "6 months"  },
    { months:  3, label: "3 months"  },
  ];

  let triggered = 0;

  for (const horizon of horizons) {
    const cutoffMin = new Date(today);
    cutoffMin.setMonth(cutoffMin.getMonth() + horizon.months - 1);
    const cutoffMax = new Date(today);
    cutoffMax.setMonth(cutoffMax.getMonth() + horizon.months + 1);

    const leases = await prisma.lease.findMany({
      where: {
        expiryDate: { gte: cutoffMin, lte: cutoffMax },
        status: { in: ["active", "expiring_soon"] },
      },
      include: { tenant: true, asset: { select: { name: true } }, user: { select: { email: true } } },
    });

    for (const lease of leases) {
      // Don't trigger if we already created an engagement for this horizon
      const alreadyTriggered = await prisma.tenantEngagement.findFirst({
        where: {
          leaseId: lease.id,
          actionType: "engage_renewal",
          requestedAt: { gte: new Date(today.getTime() - 30 * 24 * 3600 * 1000) },
        },
      });
      if (alreadyTriggered) continue;

      // Create engagement record + draft letter via Claude
      const engagement = await prisma.tenantEngagement.create({
        data: {
          userId: lease.userId,
          tenantId: lease.tenantId,
          leaseId: lease.id,
          leaseRef: lease.leaseRef ?? lease.id,
          actionType: "engage_renewal",
          status: "requested",
        },
      });

      // Generate letter (fire and forget — update in background)
      generateEngagementLetter(engagement.id, lease).catch(console.error);

      // Notify owner
      await sendTenantEngagementAlert(
        lease.user.email,
        lease.tenant.name,
        lease.asset.name,
        horizon.label,
        engagement.id
      );

      triggered++;
    }
  }

  return NextResponse.json({ triggered });
}
```

---

## 7. Tenants page — wire to real data

### New hook: `useRealTenants`

```ts
// src/hooks/useRealTenants.ts
export function useRealTenants() {
  const [data, setData] = useState<{ tenants: TenantRow[]; wault: number; rentAtRisk: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/tenants")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { tenants: data?.tenants ?? [], wault: data?.wault ?? 0, rentAtRisk: data?.rentAtRisk ?? 0, loading };
}
```

### Update `tenants/page.tsx`

When `portfolioId === "user"`:
- Call `useRealTenants()` instead of `usePortfolio` + `buildTenants`
- If `tenants.length === 0 && !loading`: show "Upload your lease documents to get started" with a link to `/documents`
- If `tenants.length > 0`: render the existing `TenantRow` components mapped from real `TenantRow` data

The `TenantRow` component interface is already compatible — just ensure the API response maps to the same `TenantRow` shape.

### Payment sparkline — wire to real data

Replace the static bars in `PaymentSparkline` with real `paymentHistory` from the API:

```tsx
function PaymentSparkline({ paymentHistory }: { paymentHistory: { status: string }[] }) {
  const bars = paymentHistory.length > 0 ? paymentHistory : Array.from({ length: 12 }, () => ({ status: "paid" }));
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((p, i) => (
        <div key={i} className="w-2 rounded-sm"
          style={{
            height: "100%",
            backgroundColor: p.status === "paid" ? "#0A8A4C" : p.status === "late" ? "#F5A94A" : "#DC2626",
            opacity: 0.7 + i * 0.025,
          }}
        />
      ))}
    </div>
  );
}
```

### Engagement action — show letter

When the user clicks "Engage Renewal", the action now returns a `letter` string. Display it in a modal:

```
┌────────────────────────────────────────────────────────────┐
│ Renewal Letter — {tenantName}                               │
│                                                             │
│ [Claude-generated letter in a read-only textarea]          │
│                                                             │
│ Send to: [{tenant.contactEmail}]   (editable)              │
│                                                             │
│    [Copy letter]    [Send via RealHQ →]    [Close]         │
└────────────────────────────────────────────────────────────┘
```

**[Send via RealHQ →]** calls `POST /api/user/tenants/[leaseId]/letter/send`. Shows "Sent ✓" on success.

---

## 8. Environment variables needed

| Variable | Feature | Urgency |
|----------|---------|---------|
| `COMPANIES_HOUSE_API_KEY` | UK tenant covenant check | Medium — free API, easy to get |
| `ANTHROPIC_API_KEY` | Letter generation | Already needed for other flows |
| `RESEND_API_KEY` | Send engagement emails | Already needed |
| `CRON_SECRET` | Engagement trigger cron | Already needed |

---

## 9. Acceptance criteria

- [ ] `GET /api/user/tenants` returns real lease data for users who have uploaded lease PDFs. Returns correct `tenant`, `sqft`, `passingRent`, `daysToExpiry`, `leaseStatus`, `paymentHistory`.
- [ ] Tenants page for `portfolioId === "user"` calls `useRealTenants`, not `buildTenants`. Shows real data, not empty state.
- [ ] If user has no uploaded leases, tenants page shows "Upload your lease documents to get started" with link to `/documents`.
- [ ] `POST /engage-renewal` returns `{ engagement, letter }` where `letter` is a Claude-generated renewal letter (< 250 words). Letter does not mention RealHQ. Written in UK English (UK assets) or US English (US assets).
- [ ] Renewal letter modal renders with editable send-to email field. "Send via RealHQ →" calls `/letter/send` and shows confirmation.
- [ ] Health score is composite: expiry + payment history + covenant + sector. Tenant with 3 missed payments in last 12 months scores materially lower than a tenant with 12 on-time payments, even with the same days-to-expiry.
- [ ] Covenant check runs on `Tenant` creation for UK tenants. `covenantGrade` is populated within the cron run if `COMPANIES_HOUSE_API_KEY` is set. Runs silently (no user action needed).
- [ ] `PaymentSparkline` renders real payment history bars (green=paid, amber=late, red=missed). Falls back to 12 green bars if no payment history.
- [ ] Engagement cron creates `TenantEngagement` records for leases at 18m/12m/6m/3m horizons. Does not create duplicates within 30-day windows. Sends alert email to owner.
- [ ] `Lease` records are created from `Document.extractedData` via lazy materialisation on `GET /api/user/tenants`. No manual admin action required.

---

## 10. Build order

1. **Prisma migration** — `Tenant`, `Lease`, `TenantPayment`, `TenantEngagement` models + `UserAsset` + `User` relations
2. **`src/lib/tenant-health.ts`** — health score v2 composite function
3. **`materialiseLease()`** in `src/lib/tenant-materialise.ts` — JSON → `Tenant` + `Lease` records
4. **`GET /api/user/tenants`** — reads `Lease` table, lazy materialises, returns `TenantRow[]` + metrics
5. **`useRealTenants` hook** — wraps the new route
6. **Wire tenants page** — `portfolioId === "user"` uses `useRealTenants`, not `buildTenants`; update `PaymentSparkline`
7. **`POST /engage-renewal` enhancement** — Claude letter generation, returns letter in response, stores to `TenantEngagement`
8. **Renewal letter modal** in tenants page + `POST /letter/send`
9. **Covenant check** — `src/lib/covenant-check.ts` + call from `materialiseLease`
10. **Payment routes** — `POST + GET /api/user/tenants/[leaseId]/payments`
11. **Engagement cron** — `POST /api/cron/tenant-engagement-triggers`
