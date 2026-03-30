import { NextRequest, NextResponse } from "next/server";
import { extractTextFromDocument } from "@/lib/textract";

interface PropertyFromSchedule {
  address: string;
  confidence: "high" | "medium" | "low";
  additionalInfo?: Record<string, unknown>;
}

/**
 * Parse a property schedule/rent roll to extract property addresses.
 * Uses Claude API to identify and extract property addresses from the document text.
 */
async function parsePropertySchedule(
  rawText: string
): Promise<PropertyFromSchedule[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const prompt = `You are a commercial real estate document analyst. Analyze this property schedule or rent roll and extract ALL property addresses.

For each property found, return:
- The complete address (street, city, state/country, postal code if available)
- Your confidence level (high/medium/low) based on how clearly the address is stated
- Any additional data found for that property (rent, tenant name, square footage, etc.)

Return ONLY valid JSON matching this schema:
{
  "properties": [
    {
      "address": "complete property address",
      "confidence": "high" | "medium" | "low",
      "additionalInfo": {
        "rent": number or null,
        "tenant": "string" or null,
        "sqft": number or null,
        "currency": "USD" | "GBP" | null
        // include any other structured data found for this property
      }
    }
  ]
}

Document text:
${rawText}

Return ONLY the JSON object. No markdown fences, no explanation.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        "[upload-schedule] Claude error:",
        response.status,
        await response.text()
      );
      return [];
    }

    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? "";

    const parsed = JSON.parse(text) as { properties: PropertyFromSchedule[] };
    return parsed.properties || [];
  } catch (err) {
    console.error("[upload-schedule] parsing failed:", err);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file from form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Supported formats: PDF, Excel, CSV, Word",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text using AWS Textract
    const rawText = await extractTextFromDocument(buffer);

    if (!rawText) {
      return NextResponse.json(
        { error: "Could not extract text from document" },
        { status: 500 }
      );
    }

    // Parse the text to extract property addresses
    const properties = await parsePropertySchedule(rawText);

    if (properties.length === 0) {
      return NextResponse.json(
        {
          error: "No properties found in document",
          suggestion:
            "Please ensure the document contains property addresses in a clear format",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      propertiesFound: properties.length,
      properties,
    });
  } catch (error) {
    console.error("[upload-schedule] error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
