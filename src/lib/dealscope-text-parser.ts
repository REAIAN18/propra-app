import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedAddressData {
  address: string;
  postcode?: string;
  propertyType?: string;
  additionalNotes?: string;
}

/**
 * Extract address and postcode from unstructured text description using Claude API.
 * Handles various input formats like property descriptions, listings, notes, etc.
 */
export async function extractAddressFromDescription(
  description: string
): Promise<ExtractedAddressData | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[dealscope-text-parser] ANTHROPIC_API_KEY not configured");
    return null;
  }

  if (!description || description.trim().length === 0) {
    console.error("[dealscope-text-parser] Description is empty");
    return null;
  }

  try {
    const client = new Anthropic();

    const prompt = `You are a property data extraction specialist. Extract address information from the following unstructured text description.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "address": "full street address including building number and street name (required)",
  "postcode": "UK postcode if found, null otherwise",
  "propertyType": "e.g. 'office', 'retail', 'industrial', 'residential' if identifiable, null otherwise",
  "additionalNotes": "any other relevant property details found in the text, null if none"
}

Rules:
- Extract the most complete address possible from the text
- If postcode is mentioned, include it
- If building/house number is missing but street is clear, still extract the street address
- Return null for any fields where data is not present or cannot be inferred
- Do NOT invent or assume data not in the text

Text to extract from:
${description}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    const extracted: ExtractedAddressData = JSON.parse(responseText);

    // Validate that address was extracted
    if (!extracted.address || extracted.address.trim().length === 0) {
      console.warn(
        "[dealscope-text-parser] No address could be extracted from description"
      );
      return null;
    }

    return extracted;
  } catch (error) {
    console.error("[dealscope-text-parser] Error extracting address:", error);
    return null;
  }
}
