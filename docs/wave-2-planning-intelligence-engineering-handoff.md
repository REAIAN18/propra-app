# Wave 2 — Planning Intelligence Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-22
**Status:** Ready to build
**Revenue:** Advisory relationship (no direct commission in Wave 2); Wave 3 planning submission service at fixed fee
**Sources:** RealHQ-Spec-v3.2 Section 5, wave-2-product-brief.md, docs/uk-planning-data-sources.md

---

## Overview

Wave 1 Planning Intelligence stores planning history as a JSON blob (`UserAsset.planningHistory`) patched manually via an admin API route. There is no live data source, no automated monitoring, and no proper relational model.

Wave 2 migrates to a proper data architecture and live UK data feeds:

1. **`PlanningApplication` Prisma model** — replaces the JSON blob; first-class relational records per asset
2. **UK live feed — `planning.data.gov.uk`** — daily cron pulls planning applications near each asset's postcode using the UK government Planning Data API (free, no key required)
3. **Impact classification via Claude** — automatic threat / opportunity / neutral scoring with rationale
4. **Proximity search** — applications within configurable radius (default 0.5 miles) of each asset
5. **US: county planning portals** — Miami-Dade + Broward county (FL) GIS/planning feeds for US assets
6. **Planning change alerts** — email notification when a nearby application status changes (approved/refused)
7. **Hold/Sell link** — planning applications automatically update `UserAsset.planningImpactSignal` for Hold vs Sell model
8. **Wave 3 stub: permitted development / change of use submission** — flagged CTA, not built in Wave 2

---

## What's already built (Wave 1)

- Planning page (`/planning`) — hero metrics, threats/opportunities, impact score bar, expanded detail panel
- `GET /api/user/planning` — returns `UserAsset.planningHistory` JSON blob per asset
- `PATCH /api/admin/assets/:id/planning` — admin replaces planning JSON blob
- `usePlanningData` hook — calls `/api/user/planning`
- `UserAsset.planningHistory` — `Json?` field, stores array of `PlanningEntry` objects

---

## Critical architectural problem to fix first

The current `PlanningEntry` structure is embedded JSON. It cannot be queried, indexed, or updated individually. Every write replaces the entire array.

**Migration plan (must be done before any live integration):**
1. Add `PlanningApplication` model to schema
2. Write migration script that reads `UserAsset.planningHistory` JSON → creates individual `PlanningApplication` records
3. Update `GET /api/user/planning` to read from `PlanningApplication` table instead of JSON field
4. Keep `UserAsset.planningHistory` field in place but stop writing to it (deprecate; remove in Wave 3)

---

## 1. Prisma schema additions

### `PlanningApplication` — first-class planning records

```prisma
model PlanningApplication {
  id               String   @id @default(cuid())
  assetId          String
  userId           String

  // Core application data
  refNumber        String               // LPA application reference
  description      String   @db.Text
  applicant        String?
  applicantAgent   String?
  applicationType  String               // "full" | "outline" | "prior_approval" | "lawful_development" | "change_of_use" | "advertisement" | "listed_building" | "other"
  status           String               // "In Application" | "Approved" | "Refused" | "Appeal" | "Withdrawn"
  submittedDate    DateTime?
  validDate        DateTime?
  decisionDate     DateTime?

  // Location
  siteAddress      String?
  postcode         String?
  distanceMetres   Float?               // distance from the UserAsset
  latitude         Float?
  longitude        Float?
  lpaCode          String?              // Local Planning Authority code (e.g. "E07000187")
  lpaName          String?              // e.g. "Ashford Borough Council"
  country          String   @default("UK")

  // Source tracking
  dataSource       String   @default("manual")  // "planning_data_gov_uk" | "miami_dade" | "broward" | "manual" | "admin"
  sourceRef        String?              // external ID from data source
  sourceUrl        String?              // link to LPA or data.gov.uk record

  // Impact classification (Claude-generated)
  impact           String?              // "threat" | "opportunity" | "neutral"
  impactScore      Float?               // 1–10
  impactRationale  String?  @db.Text
  holdSellLink     String?              // "sell" | "hold" | "monitor"
  classifiedAt     DateTime?

  // Alert tracking
  lastStatusSeen   String?              // previous status — triggers alert when changed
  alertSentAt      DateTime?
  alertAcked       Boolean  @default(false)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  asset UserAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([assetId, sourceRef])   // prevent duplicates from cron
  @@index([assetId])
  @@index([userId])
  @@index([status])
}
```

Add `planningApplications PlanningApplication[]` to `UserAsset` and `User`.

Also add to `UserAsset`:
```prisma
  planningImpactSignal  String?   // "threat" | "opportunity" | "neutral" | null
  planningLastFetched   DateTime? // last time the cron ran for this asset
```

---

## 2. New API routes

### `GET /api/user/planning` (update — migrate from JSON blob)

Keep the same URL and response shape so the existing hook works unchanged. Swap the data source:

```ts
// BEFORE (Wave 1):
planningHistory: Array.isArray(a.planningHistory) ? a.planningHistory as PlanningEntry[] : []

// AFTER (Wave 2):
const apps = await prisma.planningApplication.findMany({
  where: { assetId: a.id },
  orderBy: [{ impactScore: "desc" }, { submittedDate: "desc" }],
});
planningHistory: apps.map(mapAppToPlanningEntry)
```

**`mapAppToPlanningEntry`:** converts `PlanningApplication` to the existing `PlanningEntry` shape so the page component requires no changes:

```ts
function mapAppToPlanningEntry(app: PlanningApplication): PlanningEntry {
  return {
    id: app.id,
    refNumber: app.refNumber,
    description: app.description,
    applicant: app.applicant ?? undefined,
    type: app.applicationType,
    status: app.status,
    distanceFt: app.distanceMetres ? Math.round(app.distanceMetres * 3.28084) : undefined,
    impact: (app.impact ?? "neutral") as "threat" | "opportunity" | "neutral",
    impactScore: app.impactScore ?? 5,
    submittedDate: app.submittedDate?.toISOString().split("T")[0] ?? "",
    decisionDate: app.decisionDate?.toISOString().split("T")[0] ?? undefined,
    notes: app.impactRationale ?? "",
    holdSellLink: (app.holdSellLink ?? "monitor") as "sell" | "hold" | "monitor",
  };
}
```

### `POST /api/admin/planning/fetch/:assetId`

Admin-triggered manual fetch for a specific asset. Calls the live data API and creates/updates `PlanningApplication` records. Returns new applications found.

```ts
// Response: { found: number; created: number; updated: number; applications: PlanningApplication[] }
```

### `PATCH /api/user/planning/:applicationId/ack`

User acknowledges/dismisses a planning alert.

```ts
// Sets alertAcked = true, returns updated application
```

---

## 3. Live data integration

### 3a. UK — `planning.data.gov.uk` API

**Endpoint:** `https://www.planning.data.gov.uk/api/search/` (no API key required)

**Geospatial search by postcode:**

```ts
async function fetchUKPlanningApplications(postcode: string, radiusMetres = 800): Promise<RawPlanningApp[]> {
  // Step 1: geocode postcode → lat/lon via postcodes.io (free)
  const geo = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
  const { result } = await geo.json();
  const { latitude, longitude } = result;

  // Step 2: query planning.data.gov.uk for applications within radius
  const url = new URL("https://www.planning.data.gov.uk/api/search/");
  url.searchParams.set("dataset", "planning-application");
  url.searchParams.set("point", `POINT(${longitude} ${latitude})`);
  url.searchParams.set("radius", String(radiusMetres));
  url.searchParams.set("limit", "50");
  url.searchParams.set("field", "reference,description,status,start-date,end-date,geometry,site-address,applicant-name");

  const res = await fetch(url.toString());
  const data = await res.json();
  return data.entities ?? [];
}
```

**Note:** `planning.data.gov.uk` is a government open data platform aggregating LPA data. Coverage is improving but not yet 100% of UK LPAs. For LPAs not yet on the platform, fall back to direct LPA API or manual entry.

**LPA direct fallbacks** (high coverage for target postcodes):
- Ashford Borough: `https://www.ashford.gov.uk/planning-and-building/planning-and-building-applications/` (no API — use scraper pattern)
- Sevenoaks District: planning.sevenoaks.gov.uk
- Folkestone & Hythe: `https://www.folkestone-hythe.gov.uk/`

**Mapping to `PlanningApplication`:**

```ts
function mapGovUKEntityToApp(entity: RawPlanningApp, assetId: string, userId: string, assetCoords: {lat: number; lon: number}): Omit<PlanningApplication, 'id' | 'createdAt' | 'updatedAt'> {
  const appCoords = parseGeometryPoint(entity.geometry);
  const distanceMetres = appCoords
    ? haversineDistanceMetres(assetCoords, appCoords)
    : null;

  return {
    assetId,
    userId,
    refNumber: entity.reference ?? entity.entity,
    description: entity.description ?? "",
    applicant: entity["applicant-name"] ?? null,
    applicationType: classifyApplicationType(entity.description),
    status: normaliseStatus(entity.status),
    submittedDate: entity["start-date"] ? new Date(entity["start-date"]) : null,
    decisionDate: entity["end-date"] ? new Date(entity["end-date"]) : null,
    siteAddress: entity["site-address"] ?? null,
    postcode: null,  // not always available from gov.uk
    distanceMetres,
    latitude: appCoords?.lat ?? null,
    longitude: appCoords?.lon ?? null,
    lpaCode: entity.organisation ?? null,
    country: "UK",
    dataSource: "planning_data_gov_uk",
    sourceRef: entity.entity ?? entity.reference,
    sourceUrl: entity["entry-date"]
      ? `https://www.planning.data.gov.uk/entity/${entity.entity}`
      : null,
    impact: null,         // classified separately by Claude
    impactScore: null,
    impactRationale: null,
    holdSellLink: null,
    classifiedAt: null,
    lastStatusSeen: null,
    alertSentAt: null,
    alertAcked: false,
  };
}
```

### 3b. US (Florida) — Miami-Dade + Broward county

**Miami-Dade (open data portal):**
```ts
// https://opendata.miamidade.gov/resource/fmte-mxk9.json
// ?$where=within_circle(the_geom, {lat}, {lon}, {radiusMetres})
// &$limit=50
// Dataset: "Building Permits" (planning applications proxied via permits)
```

**Broward County:**
```ts
// https://gis.broward.org/gisdata/PermitSearch/ — no public API
// Fallback: use FDOT parcel proximity search for development activity signals
// Practical fallback: populate manually via admin panel for Wave 2
```

**Note:** Florida LPA integration is less mature than UK. For Wave 2, prioritise UK. US planning data defaults to manual/admin entry if no API key.

---

## 4. Impact classification

Run after each new `PlanningApplication` is created. Batch-processed in the cron.

### `classifyPlanningImpact(app, asset)` — Claude API call

```ts
async function classifyPlanningImpact(
  app: PlanningApplication,
  asset: { assetType: string; name: string }
): Promise<{ impact: "threat" | "opportunity" | "neutral"; impactScore: number; rationale: string; holdSellLink: "sell" | "hold" | "monitor" }> {

  const prompt = `
You are a commercial property analyst. Assess the impact of a nearby planning application on a commercial property portfolio asset.

PORTFOLIO ASSET:
- Name: ${asset.name}
- Type: ${asset.assetType}

NEARBY PLANNING APPLICATION:
- Reference: ${app.refNumber}
- Description: ${app.description}
- Type: ${app.applicationType}
- Status: ${app.status}
- Distance: ${app.distanceMetres ? Math.round(app.distanceMetres) + "m" : "unknown"}
- LPA: ${app.lpaName ?? "unknown"}

Classify this application's impact on the portfolio asset:
1. impact: "threat" if it creates competition, reduces access/visibility, or negatively affects value; "opportunity" if it increases area demand or signals positive market movement; "neutral" if it has no material effect.
2. impactScore: 1–10 (10 = critical, 1 = negligible)
3. rationale: 1–2 sentences explaining the impact
4. holdSellLink: "sell" if the impact is a catalyst to exit; "hold" if it strengthens the investment case; "monitor" if uncertain

Respond in JSON only: { "impact": "...", "impactScore": N, "rationale": "...", "holdSellLink": "..." }
`;

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content[0].type === "text" ? res.content[0].text : "{}";
  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
}
```

Use `claude-haiku-4-5-20251001` (fast + cheap) for classification. Batch with 200ms delay between calls to avoid rate limits.

---

## 5. Monitoring cron — `POST /api/cron/planning-monitor`

Daily cron. Protected by `CRON_SECRET`.

```ts
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all assets with UK postcodes (or FL zip codes for US)
  const assets = await prisma.userAsset.findMany({
    where: {
      postcode: { not: null },
      OR: [
        { planningLastFetched: null },
        { planningLastFetched: { lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      ],
    },
    include: { user: { select: { email: true } } },
  });

  let totalCreated = 0;
  let alertsSent = 0;

  for (const asset of assets) {
    try {
      const country = asset.country ?? "UK";
      let rawApps: RawPlanningApp[] = [];

      if (country === "UK" && asset.postcode) {
        rawApps = await fetchUKPlanningApplications(asset.postcode, 800);
      } else if (country === "US" && asset.postcode) {
        rawApps = await fetchUSPlanningApplications(asset.postcode, asset.latitude, asset.longitude);
      }

      const assetCoords = { lat: asset.latitude ?? 0, lon: asset.longitude ?? 0 };

      for (const raw of rawApps) {
        const mapped = mapRawToApp(raw, asset.id, asset.userId, assetCoords, country);

        // Upsert — don't duplicate if sourceRef already exists for this asset
        const existing = await prisma.planningApplication.findUnique({
          where: { assetId_sourceRef: { assetId: asset.id, sourceRef: mapped.sourceRef! } },
        });

        if (existing) {
          // Check for status change → send alert
          if (existing.status !== mapped.status && !existing.alertSentAt) {
            await sendPlanningStatusAlert(asset.user.email, asset.name, existing, mapped.status);
            await prisma.planningApplication.update({
              where: { id: existing.id },
              data: { status: mapped.status, lastStatusSeen: existing.status, alertSentAt: new Date() },
            });
            alertsSent++;
          }
        } else {
          // New application — create + classify
          const created = await prisma.planningApplication.create({ data: mapped });
          totalCreated++;

          // Classify impact (with 200ms delay between calls)
          await new Promise(r => setTimeout(r, 200));
          const classification = await classifyPlanningImpact(created, asset);
          await prisma.planningApplication.update({
            where: { id: created.id },
            data: {
              impact: classification.impact,
              impactScore: classification.impactScore,
              impactRationale: classification.rationale,
              holdSellLink: classification.holdSellLink,
              classifiedAt: new Date(),
            },
          });

          // Update asset-level signal (worst-case for hold/sell)
          if (classification.impact === "threat" && classification.impactScore >= 7) {
            await prisma.userAsset.update({
              where: { id: asset.id },
              data: { planningImpactSignal: "threat" },
            });
          }
        }
      }

      // Mark asset as fetched
      await prisma.userAsset.update({
        where: { id: asset.id },
        data: { planningLastFetched: new Date() },
      });

    } catch (err) {
      console.error(`Planning fetch failed for asset ${asset.id}:`, err);
      // Continue to next asset — don't fail entire cron
    }
  }

  return NextResponse.json({ assetsProcessed: assets.length, totalCreated, alertsSent });
}
```

---

## 6. Planning status change alert email

```ts
// src/lib/email.ts — add:
export async function sendPlanningStatusAlert(
  email: string,
  assetName: string,
  app: PlanningApplication,
  newStatus: string
) {
  await resend.emails.send({
    from: "alerts@realhq.co.uk",
    to: email,
    subject: `Planning update near ${assetName}: ${app.refNumber} now ${newStatus}`,
    html: `
      <p>A planning application near <strong>${assetName}</strong> has changed status.</p>
      <table>
        <tr><td>Reference</td><td>${app.refNumber}</td></tr>
        <tr><td>Previous status</td><td>${app.lastStatusSeen}</td></tr>
        <tr><td>New status</td><td><strong>${newStatus}</strong></td></tr>
        <tr><td>Description</td><td>${app.description.substring(0, 200)}…</td></tr>
        <tr><td>Distance</td><td>${app.distanceMetres ? Math.round(app.distanceMetres) + "m" : "nearby"}</td></tr>
        <tr><td>Impact</td><td>${app.impact} (score: ${app.impactScore}/10)</td></tr>
      </table>
      <p><a href="https://app.realhq.co.uk/planning">View in RealHQ →</a></p>
    `,
  });
}
```

---

## 7. Data migration script

One-time migration to move JSON blob data into the `PlanningApplication` table.

```ts
// prisma/scripts/migrate-planning-history.ts
async function migratePlanningHistory() {
  const assets = await prisma.userAsset.findMany({
    where: { planningHistory: { not: Prisma.JsonNull } },
    select: { id: true, userId: true, planningHistory: true },
  });

  for (const asset of assets) {
    const history = asset.planningHistory as PlanningEntry[];
    if (!Array.isArray(history) || history.length === 0) continue;

    for (const entry of history) {
      await prisma.planningApplication.upsert({
        where: { assetId_sourceRef: { assetId: asset.id, sourceRef: entry.id } },
        create: {
          assetId: asset.id,
          userId: asset.userId,
          refNumber: entry.refNumber,
          description: entry.description,
          applicant: entry.applicant,
          applicationType: entry.type,
          status: entry.status,
          submittedDate: entry.submittedDate ? new Date(entry.submittedDate) : null,
          decisionDate: entry.decisionDate ? new Date(entry.decisionDate) : null,
          impact: entry.impact,
          impactScore: entry.impactScore,
          impactRationale: entry.notes,
          holdSellLink: entry.holdSellLink ?? "monitor",
          dataSource: "admin",
          sourceRef: entry.id,
          classifiedAt: new Date(),
        },
        update: {},  // don't overwrite if already migrated
      });
    }
  }

  console.log(`Migrated planning history for ${assets.length} assets`);
}
```

Run once via `npx ts-node prisma/scripts/migrate-planning-history.ts`.

---

## 8. Wave 3 stub: permitted development / change of use submission

Not built in Wave 2. But the Planning Intelligence page should surface a CTA for high-opportunity applications:

```tsx
// When an application has impact = "opportunity" and applicationType includes "change_of_use" or "prior_approval":
<div className="mt-3 pt-3 border-t border-gray-100">
  <p className="text-xs text-gray-500 mb-2">
    RealHQ can assess your permitted development rights for this asset.
  </p>
  <button
    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
    style={{ backgroundColor: "rgba(22,71,232,0.08)", color: "#1647E8" }}
    onClick={() => {/* Wave 3 — for now: capture interest via /api/user/planning-submissions */}}
  >
    Assess PD rights →
  </button>
</div>
```

`POST /api/user/planning-submissions` in Wave 3 — captures user interest for a planning submission service (fixed fee advisory). Not part of the Wave 2 build.

---

## 9. UK planning data sources summary

| Source | Coverage | Rate limit | Key required |
|--------|----------|------------|--------------|
| `planning.data.gov.uk` | ~60% of UK LPAs (growing) | None documented | No |
| `postcodes.io` | Postcode → lat/lon geocoding | 1 req/sec | No |
| LPA direct (Ashford, Sevenoaks) | Local only | Varies | Some |
| Miami-Dade Open Data | Miami-Dade County | 1000 req/day | No |
| Broward County | No public API | — | Manual fallback |

---

## 10. Acceptance criteria

- [ ] `PlanningApplication` table created. Migration script runs without error, moves all existing `UserAsset.planningHistory` JSON entries to `PlanningApplication` records.
- [ ] `GET /api/user/planning` reads from `PlanningApplication` table (not JSON blob). Response shape unchanged — existing page renders correctly.
- [ ] `POST /api/cron/planning-monitor` creates `PlanningApplication` records for UK assets with postcodes by querying `planning.data.gov.uk`. Does not create duplicates (upsert on `assetId + sourceRef`).
- [ ] Each newly created `PlanningApplication` receives an impact classification from Claude within the cron run. Fields `impact`, `impactScore`, `impactRationale`, `holdSellLink`, `classifiedAt` are populated.
- [ ] When an existing application's `status` changes, a status-change alert email is sent to the asset owner via Resend. `alertSentAt` is set. Email not resent on subsequent cron runs.
- [ ] `PATCH /api/user/planning/:applicationId/ack` sets `alertAcked = true`.
- [ ] `UserAsset.planningImpactSignal` is updated to `"threat"` when a newly created application has `impact = "threat"` and `impactScore >= 7`.
- [ ] Cron handles failures per-asset gracefully — one failed asset does not stop others from processing.
- [ ] Cron does not re-fetch assets fetched within the last 7 days (`planningLastFetched` gate).
- [ ] Planning page "Assess PD rights →" CTA renders on opportunity-classified applications (Wave 3 submission CTA, not wired to backend).

---

## 11. Build order

1. **Prisma migration** — `PlanningApplication` model + `UserAsset.planningImpactSignal` + `UserAsset.planningLastFetched`
2. **Data migration script** — `prisma/scripts/migrate-planning-history.ts` — migrate JSON blobs → `PlanningApplication` records
3. **Update `GET /api/user/planning`** — swap data source to `PlanningApplication` table; verify page renders unchanged
4. **`classifyPlanningImpact()`** — Claude Haiku classification utility in `src/lib/planning-classifier.ts`
5. **`fetchUKPlanningApplications()`** — `planning.data.gov.uk` + `postcodes.io` in `src/lib/planning-feed.ts`
6. **`POST /api/cron/planning-monitor`** — daily cron: fetch → upsert → classify → alert on status change
7. **`sendPlanningStatusAlert()`** — Resend email template, add to `src/lib/email.ts`
8. **`PATCH /api/user/planning/:id/ack`** — alert acknowledgement route
9. **`POST /api/admin/planning/fetch/:assetId`** — admin manual trigger
10. **UI: Wave 3 "Assess PD rights" CTA** — add to expanded application panel on opportunity-classified items
