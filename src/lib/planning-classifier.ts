/**
 * src/lib/planning-classifier.ts
 * Claude Haiku impact classification for planning applications.
 *
 * Used by: POST /api/cron/planning-monitor (batch), POST /api/admin/planning/fetch/:assetId (single)
 *
 * Cost: claude-haiku-4-5-20251001 at ~$0.0008/call. A portfolio of 10 assets with
 * 5 new applications each = $0.04/cron run. Acceptable at any volume.
 *
 * The cron should add a 200ms delay between calls to respect rate limits.
 */


// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface PlanningApplicationForClassification {
  id: string;
  refNumber: string;
  description: string;
  applicationType: string;
  status: string;
  distanceMetres: number | null;
  lpaName: string | null;
}

export interface AssetForClassification {
  name: string;
  assetType: string | null;
  country: string | null;
}

export interface ClassificationResult {
  impact: "threat" | "opportunity" | "neutral";
  impactScore: number;          // 1–10
  rationale: string;
  holdSellLink: "sell" | "hold" | "monitor";
}

// ---------------------------------------------------------------------------
// CLASSIFICATION FUNCTION
// ---------------------------------------------------------------------------

/**
 * Classifies the impact of a planning application on a portfolio asset.
 *
 * Returns a safe fallback ({ impact: "neutral", impactScore: 5, ... })
 * if Claude is unavailable or returns unparseable output. Never throws.
 */
export async function classifyPlanningImpact(
  app: PlanningApplicationForClassification,
  asset: AssetForClassification
): Promise<ClassificationResult> {
  const fallback: ClassificationResult = {
    impact: "neutral",
    impactScore: 5,
    rationale: "Impact classification unavailable — review manually.",
    holdSellLink: "monitor",
  };

  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const countryContext = (asset.country ?? "").toUpperCase() === "UK"
    ? "UK commercial property market"
    : "US commercial property market";

  const distanceText = app.distanceMetres
    ? `${Math.round(app.distanceMetres)}m from the asset`
    : "proximity unknown";

  const prompt = `You are a commercial property analyst specialising in the ${countryContext}.
Assess the impact of a nearby planning application on a commercial property portfolio asset.

PORTFOLIO ASSET:
- Name: ${asset.name}
- Type: ${asset.assetType ?? "commercial"}

NEARBY PLANNING APPLICATION:
- Reference: ${app.refNumber}
- Description: ${app.description}
- Type: ${app.applicationType}
- Status: ${app.status}
- Distance: ${distanceText}
- LPA: ${app.lpaName ?? "unknown"}

Classify this application's impact on the portfolio asset:
1. impact: "threat" if it creates competition, reduces access/visibility, or negatively affects value; "opportunity" if it increases area demand or signals positive market movement; "neutral" if it has no material effect on this asset.
2. impactScore: integer 1–10 (10 = critical impact, 1 = negligible)
3. rationale: 1–2 sentences explaining the specific impact on this asset type
4. holdSellLink: "sell" if the impact is a clear catalyst to exit; "hold" if it strengthens the investment case; "monitor" if the impact is uncertain or long-term

Respond in JSON only — no prose, no markdown wrapper:
{"impact":"...","impactScore":N,"rationale":"...","holdSellLink":"..."}`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const text = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClassificationResult>;

    // Validate and sanitise parsed values
    const impact = (["threat", "opportunity", "neutral"] as const).includes(parsed.impact as never)
      ? (parsed.impact as ClassificationResult["impact"])
      : "neutral";

    const impactScore = typeof parsed.impactScore === "number"
      ? Math.min(10, Math.max(1, Math.round(parsed.impactScore)))
      : 5;

    const holdSellLink = (["sell", "hold", "monitor"] as const).includes(parsed.holdSellLink as never)
      ? (parsed.holdSellLink as ClassificationResult["holdSellLink"])
      : "monitor";

    const rationale = typeof parsed.rationale === "string" && parsed.rationale.length > 0
      ? parsed.rationale.slice(0, 500)
      : fallback.rationale;

    return { impact, impactScore, rationale, holdSellLink };
  } catch (err) {
    console.error("[planning-classifier] Classification failed:", err);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// APPLICATION TYPE NORMALISATION
// ---------------------------------------------------------------------------

/**
 * Classifies an application type from its description string.
 * Used when the data source doesn't provide an explicit type field.
 */
export function classifyApplicationType(description: string | null | undefined): string {
  if (!description) return "other";
  const d = description.toLowerCase();

  if (/change of use|change use/.test(d))               return "change_of_use";
  if (/prior approval|prior notification/.test(d))       return "prior_approval";
  if (/lawful development|ldp|lawful use/.test(d))       return "lawful_development";
  if (/advertisement|sign|hoarding/.test(d))             return "advertisement";
  if (/listed building|listed consent/.test(d))          return "listed_building";
  if (/outline/.test(d))                                 return "outline";
  if (/full planning|full application|erection|demolish|construction|development/.test(d)) return "full";
  return "other";
}

/**
 * Normalises planning application status strings from various data sources
 * to the standard set used in `PlanningApplication.status`.
 */
export function normaliseStatus(rawStatus: string | null | undefined): string {
  if (!rawStatus) return "In Application";
  const s = rawStatus.toLowerCase().replace(/[\s_-]+/g, " ").trim();

  if (/approved|granted|permitted|allowed/.test(s))      return "Approved";
  if (/refused|rejected|dismissed/.test(s))              return "Refused";
  if (/appeal/.test(s))                                  return "Appeal";
  if (/withdrawn|invalid/.test(s))                       return "Withdrawn";
  if (/pending|submitted|received|in progress|application|registered/.test(s)) return "In Application";
  return "In Application"; // safe default
}
