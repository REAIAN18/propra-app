/**
 * src/lib/dealscope-ai-extract.ts
 * Intelligent property data extraction using Claude Haiku.
 * Sends listing page text to AI for structured extraction.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AIExtractedData {
  address: string | null;
  postcode: string | null;
  price: number | null;
  propertyType: string | null;
  tenure: string | null;
  size_sqft: number | null;
  size_sqm: number | null;
  yearBuilt: number | null;
  epcRating: string | null;
  numberOfUnits: number | null;
  accommodation: Array<{
    unit: string;
    size_sqft?: number;
    rent?: number;
    tenant?: string;
  }> | null;
  tenantNames: string[] | null;
  passingRent: number | null;
  leaseExpiry: string | null;
  breakDates: string[] | null;
  serviceCharge: number | null;
  groundRent: number | null;
  vacancy: string | null;
  condition: string | null;
  keyFeatures: string[] | null;
  risks: string[] | null;
  opportunities: string[] | null;
  auctionDate: string | null;
  lotNumber: string | null;
  completionPeriod: string | null;
  agentName: string | null;
  agentContact: string | null;
}

// Ordered by specificity — most precise first
const RENT_PATTERNS: { re: RegExp; type: "annual" | "psf" }[] = [
  // "passing rent of £670,617.50" / "passing rent £670,617"
  { re: /passing\s+rent(?:\s+of)?\s*[:\-]?\s*£([\d,]+(?:\.\d+)?)/i, type: "annual" },
  // "£670,617 per annum" / "£670,617 p.a." / "£670,617 pa"
  { re: /£([\d,]+(?:\.\d+)?)\s*(?:per\s+annum|p\.a\.|pa)\b/i, type: "annual" },
  // "rent: £670,617" / "income: £670,617" / "rent £670,617"
  { re: /(?:rent|income)\s*[:\-]?\s*£([\d,]+(?:\.\d+)?)/i, type: "annual" },
  // "£670,617 per sq ft" / "£670,617 psf" — psf only, caller must multiply by sqft
  { re: /£([\d,]+(?:\.\d+)?)\s*(?:per\s+sq\s*ft|psf|per\s+sqft)\b/i, type: "psf" },
];

/**
 * Extract passing rent from raw listing text using regex patterns.
 * Returns annual GBP figure, or null if not found.
 * PSF matches are skipped (caller context needed for sqft multiplication).
 */
export function extractPassingRentFallback(text: string): number | null {
  for (const { re, type } of RENT_PATTERNS) {
    if (type === "psf") continue; // skip psf — no sqft context here
    const match = text.match(re);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(value) && value > 0) return value;
    }
  }
  return null;
}

/**
 * Extract structured property data from listing text using Claude Haiku.
 * Returns null if API key missing or extraction fails.
 */
export async function extractListingWithAI(
  listingText: string
): Promise<AIExtractedData | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[dealscope-ai-extract] ANTHROPIC_API_KEY not configured");
    return null;
  }

  if (!listingText || listingText.trim().length < 20) {
    return null;
  }

  try {
    const client = new Anthropic();

    // Truncate very long texts to stay within token limits
    const truncated = listingText.slice(0, 12000);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a UK commercial property analyst. Extract ALL structured data from this property listing. Return ONLY valid JSON (no markdown, no explanation) matching this schema:

{
  "address": "full street address",
  "postcode": "UK postcode if found",
  "price": 123456,
  "propertyType": "e.g. office, retail, industrial, residential, mixed-use",
  "tenure": "Freehold or Leasehold",
  "size_sqft": 1234,
  "size_sqm": 123,
  "yearBuilt": 1990,
  "epcRating": "A-G letter",
  "numberOfUnits": 3,
  "accommodation": [{"unit": "Ground floor retail", "size_sqft": 500, "rent": 12000, "tenant": "Tenant Co"}],
  "tenantNames": ["Tenant A", "Tenant B"],
  "passingRent": 45000,
  "leaseExpiry": "2028-06-01",
  "breakDates": ["2027-01-01"],
  "serviceCharge": 5000,
  "groundRent": 250,
  "vacancy": "fully let / partially vacant / vacant",
  "condition": "good / fair / poor / requires refurbishment",
  "keyFeatures": ["feature 1", "feature 2"],
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "auctionDate": "2026-04-21",
  "lotNumber": "499",
  "completionPeriod": "28 days",
  "agentName": "Savills",
  "agentContact": "020 7499 8644"
}

For any field not found, return null. For prices/rents, return annual figures in GBP as numbers (no symbols). Convert sqm to sqft if only sqm is given (×10.764).

Text to extract from:
${truncated}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip any markdown code fences
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const extracted: AIExtractedData = JSON.parse(cleaned);

    // Regex fallback: if AI didn't extract passingRent, try patterns against raw text
    if (!extracted.passingRent) {
      const regexRent = extractPassingRentFallback(truncated);
      if (regexRent !== null) {
        extracted.passingRent = regexRent;
      }
    }

    return extracted;
  } catch (error) {
    console.error("[dealscope-ai-extract] Extraction failed:", error);
    return null;
  }
}
