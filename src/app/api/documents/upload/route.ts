import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminDocumentAlert } from "@/lib/email";

const EXTRACTION_PROMPT = `You are a commercial real estate document analyst. Extract all structured information from this document and return ONLY valid JSON matching this schema:

{
  "documentType": one of "insurance_policy" | "energy_bill" | "rent_roll" | "compliance_cert" | "lease_agreement" | "financial_statement" | "valuation_report" | "other",
  "summary": "2-3 sentence plain-English summary of what this document is and its key figures",
  "keyData": {
    // Flexible object — include all relevant fields you can extract.
    // For insurance_policy: insurer, premium, renewalDate, propertyAddress, coverageType, sumInsured
    // For energy_bill: supplier, accountNumber, billingPeriod, totalCost, unitRate, consumption
    // For rent_roll: properties (array of {address, tenant, sqft, passingRent, leaseExpiry, breakDate})
    // For compliance_cert: certType, propertyAddress, issueDate, expiryDate, issuingBody, status
    // For lease_agreement: landlord, tenant, propertyAddress, sqft, passingRent, startDate, expiryDate, breakClause
    // For financial_statement: period, totalIncome, totalExpenses, netOperatingIncome, assetCount
    // For valuation_report: propertyAddress, valuationDate, marketValue, valuationMethod, capitalRate
    // Always include any monetary values, dates, names, addresses you find
  },
  "opportunities": ["list of specific cost savings or income opportunities identified, e.g. '£28k/yr insurance overpay vs market benchmark'"],
  "alerts": ["list of urgent issues requiring immediate action, e.g. 'Certificate expires in 14 days — £35k fine exposure'"]
}

Return ONLY the JSON object with no markdown, no code blocks, no explanation.`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and image files are supported." }, { status: 400 });
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 10MB." }, { status: 400 });
    }

    const isPDF = file.type === "application/pdf";

    // Create a pending document record
    const doc = await prisma.document.create({
      data: {
        userId: session?.user?.id ?? null,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: "processing",
      },
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Demo mode — return a canned extraction result
      const demoResult = buildDemoExtraction(file.name);
      const updated = await prisma.document.update({
        where: { id: doc.id },
        data: {
          documentType: demoResult.documentType as string,
          summary: demoResult.summary as string,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          extractedData: demoResult as any,
          status: "done",
        },
      });
      sendAdminDocumentAlert({
        uploaderEmail: session?.user?.email,
        filename: file.name,
        documentType: demoResult.documentType as string,
        summary: demoResult.summary as string,
        opportunities: demoResult.opportunities as string[],
        alerts: demoResult.alerts as string[],
        keyData: demoResult.keyData as Record<string, unknown>,
      }).catch((e) => console.error("[doc-alert] demo", e));
      return NextResponse.json({ document: updated });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Build the document/image content block
    // PDFs use type:"document"; images use type:"image"
    const mediaType = file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp";
    const fileContentBlock = isPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              fileContentBlock,
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[documents/upload] Claude API error:", errText);
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "error", error: `Claude API error: ${upstream.status}` },
      });
      return NextResponse.json({ error: "Extraction failed." }, { status: 500 });
    }

    const claudeResponse = await upstream.json();
    const rawText = claudeResponse.content?.[0]?.text ?? "";

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from the response if Claude wrapped it in text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: "error", error: "Could not parse extraction result." },
        });
        return NextResponse.json({ error: "Could not parse extraction result." }, { status: 500 });
      }
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        documentType: (extracted.documentType as string) ?? "other",
        summary: (extracted.summary as string) ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractedData: extracted as any,
        status: "done",
      },
    });

    sendAdminDocumentAlert({
      uploaderEmail: session?.user?.email,
      filename: file.name,
      documentType: extracted.documentType as string,
      summary: extracted.summary as string,
      opportunities: extracted.opportunities as string[],
      alerts: extracted.alerts as string[],
      keyData: extracted.keyData as Record<string, unknown>,
    }).catch((e) => console.error("[doc-alert]", e));

    return NextResponse.json({ document: updated });
  } catch (err) {
    console.error("[documents/upload]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

function buildDemoExtraction(filename: string): Record<string, unknown> {
  const name = filename.toLowerCase();
  if (name.includes("insurance") || name.includes("policy")) {
    return {
      documentType: "insurance_policy",
      summary: "Commercial property insurance policy for a mixed-use portfolio. Annual premium of $112,000 covering 5 commercial assets. Policy renewal due in 45 days.",
      keyData: {
        insurer: "Allianz Commercial",
        premium: 112000,
        currency: "USD",
        renewalDate: "2026-05-01",
        propertyAddress: "Multiple — FL Mixed Portfolio",
        coverageType: "Commercial Property All-Risks",
        sumInsured: 42000000,
      },
      opportunities: [
        "$28k/yr insurance overpay vs market benchmark — market rate is $84k",
        "Multi-asset placement could achieve 20-25% premium reduction",
      ],
      alerts: [
        "Policy renews in 45 days — retender window is closing",
        "Premium 25% above market benchmark — immediate retender recommended",
      ],
    };
  }
  if (name.includes("energy") || name.includes("bill") || name.includes("electric")) {
    return {
      documentType: "energy_bill",
      summary: "Commercial energy bill for Coral Gables Office Park covering Q1 2026. Total cost $49,500 for the quarter at 18.2p/kWh — 28% above the current market benchmark rate.",
      keyData: {
        supplier: "Florida Power & Light",
        accountNumber: "FPL-8821-CG",
        billingPeriod: "Jan 2026 – Mar 2026",
        totalCost: 49500,
        currency: "USD",
        unitRate: 0.182,
        consumption: "272,000 kWh",
        propertyAddress: "Coral Gables Office Park, FL",
      },
      opportunities: [
        "$50k/yr energy overpay vs market benchmark — annualised overspend",
        "Fixed commercial tariff from EDF or NextEra could save ~$50k/yr",
      ],
      alerts: [
        "Energy contract auto-renewed at above-market rate — switch window open now",
        "Rate 28% above benchmark — supplier comparison recommended within 72 hours",
      ],
    };
  }
  if (name.includes("lease") || name.includes("rent") || name.includes("tenancy")) {
    return {
      documentType: "lease_agreement",
      summary: "Commercial lease agreement between Coral Gables Holdings LLC (Landlord) and Meridian Legal LLP (Tenant) for 18,000 sqft of Grade A office space. Passing rent $26/sqft with lease expiry in 348 days.",
      keyData: {
        landlord: "Coral Gables Holdings LLC",
        tenant: "Meridian Legal LLP",
        propertyAddress: "Coral Gables Office Park, Unit 3A, FL",
        sqft: 18000,
        passingRent: 26,
        annualRent: 468000,
        currency: "USD",
        startDate: "2021-04-01",
        expiryDate: "2027-03-31",
        breakClause: null,
        rentReviewDate: "2026-04-01",
      },
      opportunities: [
        "$54k/yr rent reversion available — ERV is $29/sqft vs $26/sqft passing",
        "No break clause — secure renewal at ERV for full reversion uplift",
      ],
      alerts: [
        "Lease expires in 348 days — begin renewal strategy now",
        "Rent review due in 13 days — engage surveyor to serve notice",
      ],
    };
  }
  return {
    documentType: "other",
    summary: "Commercial real estate document uploaded for analysis. Key financial data, dates, and parties have been extracted. Please review the extracted data for accuracy.",
    keyData: {
      filename,
      uploadedAt: new Date().toISOString(),
      note: "Demo extraction — connect ANTHROPIC_API_KEY for live Claude-powered analysis",
    },
    opportunities: ["Connect your real documents for AI-powered opportunity identification"],
    alerts: ["Add ANTHROPIC_API_KEY to enable live extraction"],
  };
}
