export type DocumentHintType = "insurance" | "energy" | "lease" | "compliance" | "other";

export interface ParsedDocument {
  documentType: string;
  summary: string;
  keyData: Record<string, unknown>;
  opportunities: string[];
  alerts: string[];
}

const EXTRACTION_PROMPT = (hint?: DocumentHintType) =>
  `You are a commercial real estate document analyst.${hint ? ` This document is a ${hint} document.` : ""}

Extract all structured information and return ONLY valid JSON matching this schema:

{
  "documentType": one of "insurance_policy" | "energy_bill" | "rent_roll" | "lease_agreement" | "compliance_cert" | "financial_statement" | "valuation_report" | "other",
  "summary": "2-3 sentence plain-English summary of what this document is and its key figures",
  "keyData": {
    // For insurance_policy: insurer, currentPremium (number), insuredValue (number), propertyAddress, coverageType, renewalDate (ISO YYYY-MM-DD), excess (number), currency ("GBP"|"USD")
    // For energy_bill: supplier, annualSpend (number), unitRate (number), annualUsage (number), contractEndDate (ISO YYYY-MM-DD), currency
    // For lease_agreement: landlord, tenant, propertyAddress, sqft (number), passingRent (number), startDate (ISO), expiryDate (ISO), breakClause (ISO or null), currency
    // For compliance_cert: certificateType (e.g. "Fire Risk Assessment", "EPC", "EICR", "Gas Safety"), propertyAddress, issuedBy (certifying body), issueDate (ISO YYYY-MM-DD), expiryDate (ISO YYYY-MM-DD), referenceNo (certificate reference number)
    // Always include all monetary values, dates, names, addresses found in the document
    // Use null for any field not present in the document — never invent values
  },
  "opportunities": ["list specific cost savings or income opportunities found in the document"],
  "alerts": ["list urgent issues requiring action, e.g. expiring certificates, renewal deadlines"]
}

Return ONLY the JSON object. No markdown fences, no explanation.`;

/**
 * Parse a document using Claude API.
 * @param rawText - Text extracted from the document (e.g. via Textract). If null, pass pdfBytes.
 * @param pdfBase64 - Base64-encoded PDF bytes. Used only when rawText is null.
 * @param hint - Optional document type hint.
 */
export async function parseDocument(
  rawText: string | null,
  pdfBase64: string | null,
  hint?: DocumentHintType
): Promise<ParsedDocument | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const userContent: unknown[] = [];

  if (rawText) {
    userContent.push({ type: "text", text: EXTRACTION_PROMPT(hint) });
    userContent.push({
      type: "text",
      text: `\n\nDocument text:\n${rawText}`,
    });
  } else if (pdfBase64) {
    userContent.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
    });
    userContent.push({ type: "text", text: EXTRACTION_PROMPT(hint) });
  } else {
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    console.error("[document-parser] Claude error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  try {
    return JSON.parse(text) as ParsedDocument;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ParsedDocument;
      } catch {
        /* fall through */
      }
    }
    console.error("[document-parser] could not parse Claude response:", text);
    return null;
  }
}
