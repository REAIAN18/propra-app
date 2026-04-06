/**
 * src/lib/dealscope-rental-intelligence.ts
 *
 * Real-time market ERV (Estimated Rental Value) intelligence using Claude AI.
 *
 * Instead of static benchmark tables (which require manual maintenance and are
 * wrong for secondary/regional markets), this module calls Claude with the
 * specific property details and location to get a location-aware ERV estimate.
 *
 * This handles the long tail of UK commercial submarkets — Basildon, Newcastle,
 * Milton Keynes, etc. — without needing a hardcoded entry for every market.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface RentalIntelligenceResult {
  /** Estimated annual rent in £ per sqft per year */
  ervPsf: number;
  /** Estimated annual total rent (£/yr) */
  ervAnnual: number;
  /** Confidence level */
  confidence: "high" | "medium" | "low";
  /** Source description for display */
  source: string;
  /** Reasoning from the AI model */
  reasoning: string;
  /** Range low/high if provided */
  rangeLow?: number;
  rangeHigh?: number;
}

interface ERVEstimateRaw {
  erv_psf: number;
  range_low_psf?: number;
  range_high_psf?: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

/**
 * Estimate market ERV using Claude AI for any UK commercial property.
 *
 * Called when no passing rent is found in the listing and we need a
 * location-aware ERV rather than a regional lookup table.
 *
 * @param address   Full property address (e.g. "Regency House, Miles Gray Road, Basildon, SS14 3HJ")
 * @param assetType Normalised asset type (e.g. "office", "industrial", "retail")
 * @param sqft      Floor area in square feet
 * @param context   Optional extra context (year built, condition, EPC rating, etc.)
 */
export async function estimateMarketERV(
  address: string,
  assetType: string,
  sqft: number,
  context?: {
    yearBuilt?: number | null;
    epcRating?: string | null;
    condition?: string | null;
    occupancy?: string | null;
  }
): Promise<RentalIntelligenceResult | null> {
  const client = new Anthropic();

  const contextLines: string[] = [];
  if (context?.yearBuilt) contextLines.push(`Year built: ${context.yearBuilt}`);
  if (context?.epcRating) contextLines.push(`EPC rating: ${context.epcRating}`);
  if (context?.condition) contextLines.push(`Condition: ${context.condition}`);
  if (context?.occupancy) contextLines.push(`Occupancy: ${context.occupancy}`);
  const contextStr = contextLines.length > 0 ? `\nAdditional context:\n${contextLines.join("\n")}` : "";

  const prompt = `You are a UK commercial property valuation expert. Estimate the current open-market rental value (ERV) for this property.

Property details:
- Address: ${address}
- Asset type: ${assetType}
- Floor area: ${sqft.toLocaleString()} sqft${contextStr}

Your task: Based on current UK commercial property market conditions (Q1 2026), what is the realistic market ERV in £ per sqft per annum for this specific location and asset type?

Consider:
- The specific town/city and its position in the UK commercial property hierarchy (prime, secondary, tertiary)
- Current supply and demand for this asset type in this location
- Grade of building based on age and condition clues
- Regional economic conditions

Respond with a JSON object only, no other text:
{
  "erv_psf": <number — £/sqft/yr, e.g. 20.00>,
  "range_low_psf": <number — conservative low end>,
  "range_high_psf": <number — optimistic high end>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<2-3 sentences explaining the estimate and key drivers>"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[rental-intelligence] No JSON in AI response:", text.slice(0, 200));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as ERVEstimateRaw;

    if (!parsed.erv_psf || typeof parsed.erv_psf !== "number" || parsed.erv_psf <= 0) {
      console.warn("[rental-intelligence] Invalid ERV from AI:", parsed);
      return null;
    }

    const ervAnnual = Math.round(parsed.erv_psf * sqft);

    console.log(`[rental-intelligence] ERV for ${address}: £${parsed.erv_psf}/sqft (${parsed.confidence} confidence)`);

    return {
      ervPsf: parsed.erv_psf,
      ervAnnual,
      confidence: parsed.confidence || "medium",
      source: "AI market analysis",
      reasoning: parsed.reasoning || "",
      rangeLow: parsed.range_low_psf,
      rangeHigh: parsed.range_high_psf,
    };
  } catch (err) {
    console.warn("[rental-intelligence] AI ERV estimation failed:", err);
    return null;
  }
}
