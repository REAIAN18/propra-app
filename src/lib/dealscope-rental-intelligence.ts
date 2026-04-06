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
 * Also handles international assets: cinema in Devon, cold store in Florida,
 * logistics in Singapore — Claude's training data covers all of these.
 *
 * IMPORTANT: estimateMarketERV() NEVER returns null. It always produces a number.
 * If the first attempt fails (network/parse error) it retries with a simpler prompt.
 * There is always available data — Claude has market knowledge for any location.
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

function buildFullPrompt(address: string, assetType: string, sqft: number, contextStr: string): string {
  return `You are a commercial property valuation expert with global market knowledge. Estimate the current open-market rental value (ERV) for this property.

Property details:
- Address: ${address}
- Asset type: ${assetType}
- Floor area: ${sqft.toLocaleString()} sqft${contextStr}

Your task: Based on current commercial property market conditions (Q1 2026), what is the realistic market ERV in local currency per sqft per annum for this specific location and asset type?

Consider:
- The specific town/city and its position in the local commercial property hierarchy (prime, secondary, tertiary)
- Current supply and demand for this asset type in this location
- Grade of building based on age and condition clues
- Regional and national economic conditions
- For UK properties, use £/sqft/yr. For US properties, use $/sqft/yr NNN basis. Match the currency to the location.

You have market knowledge for ALL locations worldwide — cinema in Devon, cold store in Florida, logistics in Singapore, office in Basildon — always provide an estimate. Never say data is unavailable.

Respond with a JSON object only, no other text:
{
  "erv_psf": <number — currency/sqft/yr, e.g. 20.00>,
  "range_low_psf": <number — conservative low end>,
  "range_high_psf": <number — optimistic high end>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<2-3 sentences explaining the estimate and key drivers>"
}`;
}

function buildFallbackPrompt(address: string, assetType: string, sqft: number): string {
  return `You are a commercial property valuation expert. What is the current market rent in £/sqft/year (or $/sqft/yr for US) for a ${assetType} property at: ${address}, floor area ${sqft.toLocaleString()} sqft?

Respond with JSON only:
{
  "erv_psf": <number>,
  "range_low_psf": <number>,
  "range_high_psf": <number>,
  "confidence": "low",
  "reasoning": "<1-2 sentences>"
}`;
}

function parseERVResponse(text: string): ERVEstimateRaw | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as ERVEstimateRaw;
    if (parsed.erv_psf && typeof parsed.erv_psf === "number" && parsed.erv_psf > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Estimate market ERV using Claude AI for any commercial property worldwide.
 *
 * ALWAYS returns a result — never returns null. Uses retry logic to ensure
 * a number is always produced, even on transient failures.
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
): Promise<RentalIntelligenceResult> {
  const client = new Anthropic();

  const contextLines: string[] = [];
  if (context?.yearBuilt) contextLines.push(`Year built: ${context.yearBuilt}`);
  if (context?.epcRating) contextLines.push(`EPC rating: ${context.epcRating}`);
  if (context?.condition) contextLines.push(`Condition: ${context.condition}`);
  if (context?.occupancy) contextLines.push(`Occupancy: ${context.occupancy}`);
  const contextStr = contextLines.length > 0 ? `\nAdditional context:\n${contextLines.join("\n")}` : "";

  // Attempt 1: Full prompt with all context
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: buildFullPrompt(address, assetType, sqft, contextStr) }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const parsed = parseERVResponse(text);

    if (parsed) {
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
    }

    console.warn("[rental-intelligence] Attempt 1 parse failed, retrying:", text.slice(0, 200));
  } catch (err) {
    console.warn("[rental-intelligence] Attempt 1 failed:", err);
  }

  // Attempt 2: Simplified prompt
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: buildFallbackPrompt(address, assetType, sqft) }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const parsed = parseERVResponse(text);

    if (parsed) {
      const ervAnnual = Math.round(parsed.erv_psf * sqft);
      console.log(`[rental-intelligence] ERV (retry) for ${address}: £${parsed.erv_psf}/sqft`);
      return {
        ervPsf: parsed.erv_psf,
        ervAnnual,
        confidence: "low",
        source: "AI market analysis (simplified)",
        reasoning: parsed.reasoning || "Estimated from address and asset type.",
        rangeLow: parsed.range_low_psf,
        rangeHigh: parsed.range_high_psf,
      };
    }

    console.warn("[rental-intelligence] Attempt 2 parse failed:", text.slice(0, 200));
  } catch (err) {
    console.warn("[rental-intelligence] Attempt 2 failed:", err);
  }

  // Attempt 3: Last resort — ask Claude for just a number, parse aggressively
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 128,
      messages: [{
        role: "user",
        content: `Market rent £/sqft/year for ${assetType} at ${address}? Reply with only a JSON object: {"erv_psf": <number>}`,
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const numMatch = text.match(/[\d]+\.?[\d]*/);
    if (numMatch) {
      const psf = parseFloat(numMatch[0]);
      if (psf > 0 && psf < 1000) {
        const ervAnnual = Math.round(psf * sqft);
        console.log(`[rental-intelligence] ERV (last resort) for ${address}: £${psf}/sqft`);
        return {
          ervPsf: psf,
          ervAnnual,
          confidence: "low",
          source: "AI market analysis (estimated)",
          reasoning: `Market rent estimate for ${assetType} in this location.`,
        };
      }
    }
  } catch (err) {
    console.warn("[rental-intelligence] Attempt 3 failed:", err);
  }

  // Final safety net: Claude Sonnet with a direct question (more reliable than Haiku under load)
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 128,
      messages: [{
        role: "user",
        content: `What is the approximate market rent in £/sqft/year for a ${assetType} property at "${address}"? Respond with only a JSON object: {"erv_psf": <number>, "reasoning": "<one sentence>"}`,
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const parsed = parseERVResponse(text);
    if (parsed) {
      const ervAnnual = Math.round(parsed.erv_psf * sqft);
      return {
        ervPsf: parsed.erv_psf,
        ervAnnual,
        confidence: "low",
        source: "AI market analysis (Sonnet fallback)",
        reasoning: parsed.reasoning || `Market rent estimate for ${assetType} at this location.`,
      };
    }
  } catch (err) {
    console.warn("[rental-intelligence] Sonnet fallback failed:", err);
  }

  // Absolute last resort: derive from asset type and postcode zone
  // This should never be reached in practice since Claude always knows rent levels
  const defaultPsf = assetType.includes("office") ? 18
    : assetType.includes("retail") ? 20
    : assetType.includes("logistics") || assetType.includes("warehouse") ? 9
    : assetType.includes("industrial") ? 8.5
    : 10;

  const ervAnnual = Math.round(defaultPsf * sqft);
  console.warn(`[rental-intelligence] All AI attempts failed for ${address}. Using type-based floor: £${defaultPsf}/sqft`);
  return {
    ervPsf: defaultPsf,
    ervAnnual,
    confidence: "low",
    source: "asset-type floor (AI temporarily unavailable)",
    reasoning: `All AI estimation attempts failed. Using conservative floor rate for ${assetType}.`,
  };
}
