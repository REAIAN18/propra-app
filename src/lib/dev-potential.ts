/**
 * src/lib/dev-potential.ts
 * Per-asset development potential classification.
 *
 * Combines rule-based screening (UK GPDO / US zoning) with Claude Haiku
 * narratives for the detail fields.
 *
 * Used by: GET /api/user/assets/:id/development-potential
 */

import type { UserAsset } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface DevPotentialResult {
  siteCoveragePct: number | null;
  pdRights: "full" | "partial" | "restricted" | "none";
  pdRightsDetail: string;
  changeOfUsePotential: "high" | "medium" | "low" | "none";
  changeOfUseDetail: string;
  airRightsPotential: "high" | "medium" | "low" | "none";
  airRightsDetail: string;
}

// ---------------------------------------------------------------------------
// SITE COVERAGE
// ---------------------------------------------------------------------------

export function calculateSiteCoverage(
  buildingSqft: number | null | undefined,
  landSqft: number | null | undefined
): number | null {
  if (!buildingSqft || !landSqft || landSqft <= 0) return null;
  return Math.min(100, Math.round((buildingSqft / landSqft) * 1000) / 10);
}

// ---------------------------------------------------------------------------
// PDR CLASSIFICATION — rule-based
// ---------------------------------------------------------------------------

/**
 * UK GPDO-based PDR screening.
 * Industrial/storage: Class MA prior approval eligible → full
 * Office: Class MA eligible → full
 * Retail/commercial: Class E → partial
 * Residential: no applicable conversion PDR → none
 */
export function classifyUKPDR(assetType: string | null): "full" | "partial" | "restricted" | "none" {
  if (!assetType) return "partial";
  const t = assetType.toLowerCase();
  if (/industrial|warehouse|storage|logistics/.test(t)) return "full";
  if (/office/.test(t)) return "full";
  if (/retail|shop|commercial|high street/.test(t)) return "partial";
  if (/mixed/.test(t)) return "partial";
  if (/residential|flat|apartment/.test(t)) return "none";
  if (/agricultural|farm|rural/.test(t)) return "partial";
  return "partial";
}

/**
 * US zoning-based PDR screening (Florida).
 * For Wave 2, defaults to partial with narrative detail.
 */
export function classifyUSPDR(assetType: string | null): "full" | "partial" | "restricted" | "none" {
  if (!assetType) return "partial";
  const t = assetType.toLowerCase();
  if (/industrial|warehouse/.test(t)) return "full";
  if (/office|retail|commercial/.test(t)) return "partial";
  if (/residential/.test(t)) return "none";
  return "partial";
}

// ---------------------------------------------------------------------------
// CHANGE OF USE — rule-based
// ---------------------------------------------------------------------------

/**
 * UK Use Classes Order 2020 change of use potential.
 * Class E (commercial, business, service) can freely change within the class.
 * Industrial/storage → residential via Class MA: high potential.
 * Office → residential via Class MA: high potential.
 */
export function classifyUKChangeOfUse(
  assetType: string | null,
  _siteCoveragePct: number | null
): "high" | "medium" | "low" | "none" {
  if (!assetType) return "low";
  const t = assetType.toLowerCase();
  if (/industrial|warehouse|storage/.test(t)) return "high";
  if (/office/.test(t)) return "high";
  if (/retail|shop/.test(t)) return "medium";
  if (/residential|flat/.test(t)) return "none";
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

// ---------------------------------------------------------------------------
// AIR RIGHTS — rule-based
// ---------------------------------------------------------------------------

/**
 * Air rights potential inferred from asset type and site coverage.
 * Industrial/warehouse: typically single storey, large footprint → high
 * Office: mid-rise potential → medium
 * Retail: medium
 * Residential: limited → low
 */
export function classifyAirRights(
  assetType: string | null,
  siteCoveragePct: number | null
): "high" | "medium" | "low" | "none" {
  if (!assetType) return "low";
  const t = assetType.toLowerCase();
  if (/industrial|warehouse|storage|logistics/.test(t)) {
    return siteCoveragePct !== null && siteCoveragePct < 70 ? "high" : "medium";
  }
  if (/office/.test(t)) return "medium";
  if (/retail|shop/.test(t)) return "medium";
  if (/residential|flat|apartment/.test(t)) return "low";
  return "low";
}

// ---------------------------------------------------------------------------
// CLAUDE HAIKU NARRATIVES
// ---------------------------------------------------------------------------

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

Be specific to the asset type and planning context. Do not give legal advice.
Respond in JSON only: {"pdRightsDetail":"...","changeOfUseDetail":"...","airRightsDetail":"..."}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
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
      pdRightsDetail:    typeof parsed.pdRightsDetail    === "string" ? parsed.pdRightsDetail.slice(0, 400)    : fallback.pdRightsDetail,
      changeOfUseDetail: typeof parsed.changeOfUseDetail === "string" ? parsed.changeOfUseDetail.slice(0, 400) : fallback.changeOfUseDetail,
      airRightsDetail:   typeof parsed.airRightsDetail   === "string" ? parsed.airRightsDetail.slice(0, 400)   : fallback.airRightsDetail,
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// MAIN CLASSIFIER
// ---------------------------------------------------------------------------

export async function classifyDevPotential(
  asset: Pick<UserAsset, "id" | "name" | "assetType" | "location" | "sqft" | "country"> & {
    assessorData?: Record<string, unknown> | null;
    landSqft?: number | null;
  }
): Promise<DevPotentialResult> {
  const country = (asset.country ?? "UK").toUpperCase();

  const buildingSqft = typeof asset.assessorData?.buildingSqft === "number"
    ? (asset.assessorData.buildingSqft as number)
    : (asset.sqft ?? null);
  const landSqft = typeof asset.assessorData?.landSqft === "number"
    ? (asset.assessorData.landSqft as number)
    : (asset.landSqft ?? null);

  const siteCoveragePct = calculateSiteCoverage(buildingSqft, landSqft);

  const pdRights = country === "US"
    ? classifyUSPDR(asset.assetType)
    : classifyUKPDR(asset.assetType);

  const changeOfUsePotential = country === "US"
    ? classifyUSChangeOfUse(asset.assetType)
    : classifyUKChangeOfUse(asset.assetType, siteCoveragePct);

  const airRightsPotential = classifyAirRights(asset.assetType, siteCoveragePct);

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
    pdRightsDetail:      narratives.pdRightsDetail,
    changeOfUsePotential,
    changeOfUseDetail:   narratives.changeOfUseDetail,
    airRightsPotential,
    airRightsDetail:     narratives.airRightsDetail,
  };
}
