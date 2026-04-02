/**
 * src/lib/dealscope-ai-extract.ts
 * Intelligent property data extraction using Claude Haiku.
 * Sends listing page text to AI for structured extraction.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AccommodationUnit {
  unit: string;
  size_sqft?: number;
  rent?: number;
  tenant?: string;
  leaseStart?: string;
  leaseEnd?: string;
  breakDate?: string;
  rentReview?: string;
  rentReviewType?: string;
}

export interface AIExtractedData {
  address: string | null;
  postcode: string | null;
  price: number | null;
  propertyType: string | null;
  tenure: string | null;
  tenureDetail: string | null;
  size_sqft: number | null;
  size_sqm: number | null;
  yearBuilt: number | null;
  epcRating: string | null;
  numberOfUnits: number | null;
  accommodation: AccommodationUnit[] | null;
  tenantNames: string[] | null;
  passingRent: number | null;
  totalPassingRent: number | null;
  leaseExpiry: string | null;
  breakDates: string[] | null;
  serviceCharge: number | null;
  groundRent: number | null;
  vacancy: string | null;
  occupancyPct: number | null;
  condition: string | null;
  conditionDetail: string | null;
  constructionType: string | null;
  refurbishment: string | null;
  refurbishmentCost: number | null;
  keyFeatures: string[] | null;
  risks: string[] | null;
  opportunities: string[] | null;
  auctionDate: string | null;
  lotNumber: string | null;
  completionPeriod: string | null;
  agentName: string | null;
  agentContact: string | null;
  agentType: string | null;
  isAgentListed: boolean | null;
  marketingStatus: string | null;
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

    // Allow more text for brochures which are longer — 18k chars ≈ 4k tokens
    const truncated = listingText.slice(0, 18000);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are a UK commercial property analyst. Extract ALL structured data from this property listing or brochure.

CRITICAL RULES:
- Extract the FULL tenancy/accommodation schedule with rent, lease dates, breaks, and review details per unit
- Calculate totalPassingRent by summing all individual tenant rents
- Calculate occupancyPct from occupied sqft / total sqft
- Identify if this is sold via an agent (isAgentListed: true) and extract agent name/type
- Extract tenure explicitly — look for "FREEHOLD", "LEASEHOLD", "COMMONHOLD"
- Extract refurbishment history and costs if mentioned
- Extract construction type (steel frame, concrete, brick, etc.)

Return ONLY valid JSON (no markdown, no explanation) matching this schema:

{
  "address": "full street address",
  "postcode": "UK postcode if found",
  "price": 123456,
  "propertyType": "e.g. office, retail, industrial, residential, mixed-use",
  "tenure": "Freehold or Leasehold or Commonhold",
  "tenureDetail": "e.g. Freehold with 999-year leasehold on part",
  "size_sqft": 1234,
  "size_sqm": 123,
  "yearBuilt": 1990,
  "epcRating": "A-G letter",
  "numberOfUnits": 3,
  "accommodation": [
    {
      "unit": "Ground Floor Unit A",
      "size_sqft": 500,
      "rent": 12000,
      "tenant": "Tenant Co Ltd",
      "leaseStart": "2020-01-01",
      "leaseEnd": "2030-01-01",
      "breakDate": "2025-01-01",
      "rentReview": "2025-01-01",
      "rentReviewType": "upward only / open market / CPI"
    }
  ],
  "tenantNames": ["Tenant A", "Tenant B"],
  "passingRent": 45000,
  "totalPassingRent": 45000,
  "leaseExpiry": "2028-06-01",
  "breakDates": ["2027-01-01"],
  "serviceCharge": 5000,
  "groundRent": 250,
  "vacancy": "fully let / partially vacant / vacant",
  "occupancyPct": 85,
  "condition": "good / fair / poor / requires refurbishment",
  "conditionDetail": "Refurbished in 2022 to Grade A specification with new M&E",
  "constructionType": "steel frame / concrete / brick / timber",
  "refurbishment": "Full refurbishment completed 2022 including new HVAC, LED lighting",
  "refurbishmentCost": 5300000,
  "keyFeatures": ["feature 1", "feature 2"],
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "auctionDate": "2026-04-21",
  "lotNumber": "499",
  "completionPeriod": "28 days",
  "agentName": "Savills",
  "agentContact": "020 7499 8644",
  "agentType": "sole agent / joint agent / multi-listed / auction house",
  "isAgentListed": true,
  "marketingStatus": "actively marketed / under offer / withdrawn / off-market"
}

For any field not found, return null. For prices/rents, return annual figures in GBP as numbers (no symbols). Convert sqm to sqft if only sqm is given (×10.764). For accommodation, extract EVERY unit — do not summarise or skip any.

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
    return extracted;
  } catch (error) {
    console.error("[dealscope-ai-extract] Extraction failed:", error);
    return null;
  }
}
