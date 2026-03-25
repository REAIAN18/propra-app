# Wave 2 — Per-Asset Development Potential Engineering Handoff

**Author:** Head of Product
**Date:** 2026-03-23
**Status:** Ready to build
**Prerequisite:** Prisma schema migration from `wave-2-planning-intelligence-engineering-handoff.md` must be complete first
**Sources:** RealHQ-Spec-v3.2 Section 5.3, PRO-599

---

## Overview

Each property asset should display its development potential — what the owner could do with the site beyond its current use. This is distinct from nearby-planning-application monitoring: it is an assessment of the asset itself.

Four dimensions:

| Dimension | What it shows | Data source |
|-----------|--------------|-------------|
| Site coverage | Building footprint as % of land area | `assessorData.buildingSqft` + `landSqft` |
| PDR | What can be built without planning permission | Rule-based: UK GPDO / US zoning rules + use class |
| Change of use | Could this asset convert to a higher-value use? | Rule-based: UK Use Classes Order + asset type |
| Air rights | Floors that could be added above current structure | Rule-based: asset height + local typical height limits + site coverage headroom |

All four are assessed per asset. They are not fetched from an external API in Wave 2 — they are calculated/classified using the existing asset data and a Claude Haiku narrative call.

---

## 1. Prisma schema additions

Add to `model UserAsset`:

```prisma
  // Development potential (Wave 2 — per-asset)
  siteCoveragePct        Float?     // buildingSqft / landSqft × 100
  pdRights               String?    // "full" | "partial" | "restricted" | "none" | null (unassessed)
  pdRightsDetail         String?    @db.Text   // Claude-generated narrative
  changeOfUsePotential   String?    // "high" | "medium" | "low" | "none"
  changeOfUseDetail      String?    @db.Text
  airRightsPotential     String?    // "high" | "medium" | "low" | "none"
  airRightsDetail        String?    @db.Text
  devPotentialAssessedAt DateTime?
```

These fields are nullable (null = not yet assessed). The UI shows a "Not yet assessed" state when null.

No new model needed — all fields live on `UserAsset`.

---

## 2. Classification utility — `src/lib/dev-potential.ts`

```ts
/**
 * src/lib/dev-potential.ts
 * Per-asset development potential classification.
 *
 * Combines rule-based screening with a Claude Haiku narrative for detail fields.
 */

import type { UserAsset } from "@prisma/client";

export interface DevPotentialResult {
  siteCoveragePct: number | null;
  pdRights: "full" | "partial" | "restricted" | "none";
  pdRightsDetail: string;
  changeOfUsePotential: "high" | "medium" | "low" | "none";
  changeOfUseDetail: string;
  airRightsPotential: "high" | "medium" | "low" | "none";
  airRightsDetail: string;
}

// ── Site coverage ─────────────────────────────────────────────────────────

export function calculateSiteCoverage(
  buildingSqft: number | null | undefined,
  landSqft: number | null | undefined
): number | null {
  if (!buildingSqft || !landSqft || landSqft <= 0) return null;
  return Math.min(100, Math.round((buildingSqft / landSqft) * 1000) / 10);
}

// ── PDR classification — rule-based ───────────────────────────────────────

/**
 * UK GPDO-based PDR screening.
 *
 * Classes with full PD rights (Class O/MA onwards):
 * - Industrial/storage → can convert to residential under Class MA (prior approval)
 * - Office/commercial → residential under Class O (now subsumed by MA)
 * - Agricultural → some development rights under Class Q/R
 *
 * Classes with restricted rights:
 * - Listed buildings
 * - Conservation areas
 * - Article 4 direction areas
 *
 * Note: We don't have flood zone or Article 4 data for UK assets in Wave 2.
 * Default to "partial" for most commercial; "restricted" if known constraints.
 */
export function classifyUKPDR(assetType: string | null): "full" | "partial" | "restricted" | "none" {
  if (!assetType) return "partial";
  const t = assetType.toLowerCase();

  // Industrial/warehouse — highest PDR potential under Class MA
  if (/industrial|warehouse|storage|logistics/.test(t)) return "full";

  // Office — Class MA eligible
  if (/office/.test(t)) return "full";

  // Retail/commercial — Class MA eligible but use class-dependent
  if (/retail|shop|commercial|high street/.test(t)) return "partial";

  // Mixed use — partial
  if (/mixed/.test(t)) return "partial";

  // Residential already — no conversion PDR applicable
  if (/residential|flat|apartment/.test(t)) return "none";

  // Agricultural — Class Q/R rights
  if (/agricultural|farm|rural/.test(t)) return "partial";

  // Default
  return "partial";
}

/**
 * US zoning-based PDR screening.
 * Florida: by-right development varies by municipality.
 * For Wave 2, default to "partial" with narrative detail.
 */
export function classifyUSPDR(assetType: string | null): "full" | "partial" | "restricted" | "none" {
  if (!assetType) return "partial";
  const t = assetType.toLowerCase();
  if (/industrial|warehouse/.test(t)) return "full";
  if (/office|retail|commercial/.test(t)) return "partial";
  if (/residential/.test(t)) return "none";
  return "partial";
}

// ── Change of use — rule-based ────────────────────────────────────────────

/**
 * UK Use Classes Order 2020 change of use potential.
 *
 * Class E (commercial, business and service) is the key class:
 * - Includes offices, retail, gyms, medical centres, restaurants
 * - Can freely change between Class E uses WITHOUT planning permission
 *
 * Industrial/storage (Class B2/B8):
 * - Can convert to residential via Class MA prior approval
 * - High value uplift potential
 *
 * Residential (Class C3):
 * - Limited change of use potential without full planning
 */
export function classifyUKChangeOfUse(assetType: string | null, siteCoveragePct: number | null): "high" | "medium" | "low" | "none" {
  if (!assetType) return "low";
  const t = assetType.toLowerCase();

  // Industrial/warehouse → residential = high potential (Class MA)
  if (/industrial|warehouse|storage/.test(t)) return "high";

  // Office → residential = high potential
  if (/office/.test(t)) return "high";

  // Retail → residential = medium (Class E → C3 via MA, subject to approval)
  if (/retail|shop/.test(t)) return "medium";

  // Already residential
  if (/residential|flat/.test(t)) return "none";

  // Mixed use — some potential
  if (/mixed/.test(t)) return "medium";

  return "low";
}

export function classifyUSChangeOfUse(assetType: string | null): "high" | "medium" | "low" | "none" {
  if (!assetType) return "low";
  const t = assetType.toLowerCase();
  if (/industrial|warehouse/.test(t)) return "high";
  if (/office/.test(t)) return "medium";
  if (/retail/.test(t)) return "medium";
  if (/residential/.test(t)) return "none";
  return "low";
}

// ── Air rights — rule-based ───────────────────────────────────────────────

/**
 * Air rights potential based on:
 * 1. Site coverage: low coverage (< 60%) = more potential
 * 2. Stories implied: single-storey on large site = high potential
 * 3. Asset type: industrial single-storey buildings common; residential already built-up
 *
 * In Wave 2 we don't have actual storey count or height from API data,
 * so we infer from asset type and site coverage.
 */
export function classifyAirRights(
  assetType: string | null,
  siteCoveragePct: number | null
): "high" | "medium" | "low" | "none" {
  if (!assetType) return "low";
  const t = assetType.toLowerCase();

  // Industrial/warehouse: typically single storey, large footprint — high air rights
  if (/industrial|warehouse|storage|logistics/.test(t)) {
    if (siteCoveragePct !== null && siteCoveragePct < 70) return "high";
    return "medium";
  }

  // Office: mid-rise potential if single storey
  if (/office/.test(t)) return "medium";

  // Retail single-storey: medium air rights
  if (/retail|shop/.test(t)) return "medium";

  // Residential: limited (planning restrictions for residential upward extensions)
  if (/residential|flat|apartment/.test(t)) return "low";

  return "low";
}

// ── Claude Haiku narrative ────────────────────────────────────────────────

export async function generateDevPotentialNarratives(
  asset: Pick<UserAsset, "name" | "assetType" | "location" | "sqft" | "country">,
  siteCoveragePct: number | null,
  pdRights: string,
  changeOfUsePotential: string,
  airRightsPotential: string
): Promise<{ pdRightsDetail: string; changeOfUseDetail: string; airRightsDetail: string }> {
  const fallback = {
    pdRightsDetail: "Assessment based on asset type classification. Consult a planning consultant for site-specific advice.",
    changeOfUseDetail: "Assessment based on UK Use Classes Order. Subject to local planning policy and site constraints.",
    airRightsDetail: "Assessment based on asset type and site coverage. Structural survey and planning advice required before any development.",
  };

  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const country = (asset.country ?? "UK").toUpperCase();
  const planningSystem = country === "US"
    ? "US local zoning (Florida)"
    : "UK planning system (GPDO 2015, Use Classes Order 2020)";

  const prompt = `You are a commercial property planning consultant specialising in the ${planningSystem}.

ASSET:
- Name: ${asset.name}
- Type: ${asset.assetType ?? "commercial"}
- Location: ${asset.location}
- Size: ${asset.sqft ? asset.sqft.toLocaleString() + " sq ft" : "unknown"}
- Site coverage: ${siteCoveragePct !== null ? siteCoveragePct + "%" : "unknown"}

INITIAL ASSESSMENT:
- PDR status: ${pdRights}
- Change of use potential: ${changeOfUsePotential}
- Air rights potential: ${airRightsPotential}

Write three brief narratives (1–2 sentences each) for a property owner:
1. pdRightsDetail: What permitted development rights apply and what they mean in practice
2. changeOfUseDetail: What change of use options exist and the likely approval route
3. airRightsDetail: What upward extension or additional storey potential exists

Be specific to the asset type and UK/US planning context. Do not give legal advice.
Respond in JSON only: {"pdRightsDetail":"...","changeOfUseDetail":"...","airRightsDetail":"..."}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const text = data?.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]) as Partial<typeof fallback>;
    return {
      pdRightsDetail: typeof parsed.pdRightsDetail === "string" ? parsed.pdRightsDetail.slice(0, 400) : fallback.pdRightsDetail,
      changeOfUseDetail: typeof parsed.changeOfUseDetail === "string" ? parsed.changeOfUseDetail.slice(0, 400) : fallback.changeOfUseDetail,
      airRightsDetail: typeof parsed.airRightsDetail === "string" ? parsed.airRightsDetail.slice(0, 400) : fallback.airRightsDetail,
    };
  } catch {
    return fallback;
  }
}

// ── Main classifier ───────────────────────────────────────────────────────

export async function classifyDevPotential(
  asset: Pick<UserAsset, "id" | "name" | "assetType" | "location" | "sqft" | "country"> & {
    assessorData?: Record<string, unknown> | null;
    landSqft?: number | null;
  }
): Promise<DevPotentialResult> {
  const country = (asset.country ?? "UK").toUpperCase();

  // Site coverage: use assessorData fields if available, fall back to null
  const buildingSqft = typeof asset.assessorData?.buildingSqft === "number"
    ? asset.assessorData.buildingSqft as number
    : asset.sqft ?? null;
  const landSqft = typeof asset.assessorData?.landSqft === "number"
    ? asset.assessorData.landSqft as number
    : asset.landSqft ?? null;

  const siteCoveragePct = calculateSiteCoverage(buildingSqft, landSqft);

  // Rule-based classification
  const pdRights = country === "US"
    ? classifyUSPDR(asset.assetType)
    : classifyUKPDR(asset.assetType);

  const changeOfUsePotential = country === "US"
    ? classifyUSChangeOfUse(asset.assetType)
    : classifyUKChangeOfUse(asset.assetType, siteCoveragePct);

  const airRightsPotential = classifyAirRights(asset.assetType, siteCoveragePct);

  // Claude narratives
  const narratives = await generateDevPotentialNarratives(
    asset,
    siteCoveragePct,
    pdRights,
    changeOfUsePotential,
    airRightsPotential
  );

  return {
    siteCoveragePct,
    pdRights,
    pdRightsDetail: narratives.pdRightsDetail,
    changeOfUsePotential,
    changeOfUseDetail: narratives.changeOfUseDetail,
    airRightsPotential,
    airRightsDetail: narratives.airRightsDetail,
  };
}
```

---

## 3. API route — `GET /api/user/assets/:id/development-potential`

```ts
// src/app/api/user/assets/[id]/development-potential/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyDevPotential } from "@/lib/dev-potential";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.userAsset.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true, name: true, assetType: true, location: true,
      sqft: true, country: true, assessorData: true,
      siteCoveragePct: true, pdRights: true, pdRightsDetail: true,
      changeOfUsePotential: true, changeOfUseDetail: true,
      airRightsPotential: true, airRightsDetail: true,
      devPotentialAssessedAt: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If already assessed and less than 30 days old, return cached
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  if (
    asset.devPotentialAssessedAt &&
    Date.now() - new Date(asset.devPotentialAssessedAt).getTime() < CACHE_TTL_MS &&
    asset.pdRights !== null
  ) {
    return NextResponse.json({ asset, cached: true });
  }

  // Classify and persist
  const result = await classifyDevPotential(asset as Parameters<typeof classifyDevPotential>[0]);

  const updated = await prisma.userAsset.update({
    where: { id },
    data: {
      siteCoveragePct: result.siteCoveragePct,
      pdRights: result.pdRights,
      pdRightsDetail: result.pdRightsDetail,
      changeOfUsePotential: result.changeOfUsePotential,
      changeOfUseDetail: result.changeOfUseDetail,
      airRightsPotential: result.airRightsPotential,
      airRightsDetail: result.airRightsDetail,
      devPotentialAssessedAt: new Date(),
    },
    select: {
      id: true, name: true, assetType: true,
      siteCoveragePct: true, pdRights: true, pdRightsDetail: true,
      changeOfUsePotential: true, changeOfUseDetail: true,
      airRightsPotential: true, airRightsDetail: true,
      devPotentialAssessedAt: true,
    },
  });

  return NextResponse.json({ asset: updated, cached: false });
}
```

Also add admin refresh route `POST /api/admin/assets/:id/dev-potential/refresh` that forces re-classification (bypasses cache).

---

## 4. UI — Development Potential section on `/planning` page

Add a second section to `RealUserPlanningView` below the applications list.

### Section layout

```tsx
// Per-asset development potential cards
// One card per UserAsset, showing four metric rows

function DevPotentialCard({ asset }: { asset: AssetWithDevPotential }) {
  // Show loading state if not yet assessed
  // Show four rows: Site Coverage, PDR, Change of Use, Air Rights
  // Each row: label + rating pill + 1-line detail
}
```

### Rating pill colours

| Rating | Colour |
|--------|--------|
| high / full | Green `#0A8A4C` |
| medium / partial | Amber `#F5A94A` |
| low / restricted | Grey `#9CA3AF` |
| none | Light grey, italic |

### Section trigger

The section is shown on the real user `/planning` page only. Not shown in demo mode.

On first load, if `devPotentialAssessedAt` is null, trigger assessment via `GET /api/user/assets/:id/development-potential` for each asset.

Do not block the page render — show skeleton cards while loading.

### Component spec

```tsx
// Section header: "Development Potential"
// Subtitle: "What your assets can become"

// Per-asset card:
// ┌─────────────────────────────────────────────────────┐
// │ [Asset name]                          [assetType]   │
// ├─────────────────────────────────────────────────────┤
// │ Site Coverage    [42%]    Low density — headroom    │
// │ PDR Status       [Full]   Prior approval eligible   │
// │ Change of Use    [High]   Class MA conversion...    │
// │ Air Rights       [Medium] 1–2 additional storeys... │
// └─────────────────────────────────────────────────────┘
```

---

## 5. Prisma schema additions (summary)

Add to `model UserAsset` in `prisma/schema.prisma`:

```prisma
  // Development potential (Wave 2)
  siteCoveragePct        Float?
  pdRights               String?
  pdRightsDetail         String?   @db.Text
  changeOfUsePotential   String?
  changeOfUseDetail      String?   @db.Text
  airRightsPotential     String?
  airRightsDetail        String?   @db.Text
  devPotentialAssessedAt DateTime?
```

Include in the same Prisma migration as the `PlanningApplication` model.

---

## 6. Acceptance criteria

- [ ] `siteCoveragePct` calculated correctly from `buildingSqft` / `landSqft` and stored on UserAsset
- [ ] UK industrial asset → `pdRights = "full"`, detail references Class MA prior approval
- [ ] UK office asset → `pdRights = "full"`, detail references Class MA / office-to-residential
- [ ] UK retail asset → `pdRights = "partial"`, detail references Class E and MA eligibility
- [ ] UK Class E asset → `changeOfUsePotential = "high"` or `"medium"`
- [ ] UK industrial asset → `changeOfUsePotential = "high"`
- [ ] Industrial asset with <70% site coverage → `airRightsPotential = "high"`
- [ ] `devPotentialAssessedAt` set after classification, re-assessment skipped within 30-day TTL
- [ ] `/planning` page renders Development Potential section with per-asset cards for real users
- [ ] Section shows loading skeleton while assessment is in progress
- [ ] US asset → PDR and change of use narratives reference Florida zoning, not UK GPDO

---

## 7. Build order

1. Add dev potential fields to `UserAsset` in Prisma schema (include in same migration as `PlanningApplication`)
2. `src/lib/dev-potential.ts` — classifier utility
3. `GET /api/user/assets/:id/development-potential` — API route
4. `POST /api/admin/assets/:id/dev-potential/refresh` — admin force-refresh
5. Development Potential UI section on `/planning` page
6. Run acceptance criteria tests
