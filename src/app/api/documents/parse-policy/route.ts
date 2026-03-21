import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "PDF parsing not configured" });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string | null) ?? "insurance";

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ ok: false, error: "Only PDF files are supported." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File size must be under 10MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    const promptText = documentType === "energy"
      ? "Extract from this energy bill: supplier name, annual spend (£ or $), unit rate (pence or cents per kWh), annual usage (kWh), contract end date (if visible). Return ONLY valid JSON: { supplier: string | null, annualSpend: number | null, unitRate: number | null, annualUsage: number | null, contractEndDate: string | null (ISO date YYYY-MM-DD), currency: 'GBP' | 'USD' | null }. If a field cannot be found, use null."
      : "Extract insurance policy details from this document. Return ONLY valid JSON with these fields: { currentPremium: number | null (annual premium in £ or $, convert monthly to annual), insuredValue: number | null (sum insured / insured value / building reinstatement cost in £ or $), insurer: string | null, renewalDate: string | null (ISO date YYYY-MM-DD), coverageType: string | null, propertyAddress: string | null, excess: number | null (policy excess / deductible in £ or $), currency: 'GBP' | 'USD' | null }. If a field cannot be found, use null.";

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64Data },
              },
              { type: "text", text: promptText },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[parse-policy] Claude API error:", errText);
      return NextResponse.json({
        ok: false,
        error: "Could not parse this document — please enter your details manually.",
      });
    }

    const claudeResponse = await upstream.json();
    const rawText: string = claudeResponse.content?.[0]?.text ?? "";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Claude may have wrapped JSON in markdown code fences
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({
            ok: false,
            error: "Could not parse this document — please enter your details manually.",
          });
        }
      } else {
        return NextResponse.json({
          ok: false,
          error: "Could not parse this document — please enter your details manually.",
        });
      }
    }

    if (documentType === "energy") {
      return NextResponse.json({
        ok: true,
        extracted: {
          supplier: typeof parsed.supplier === "string" ? parsed.supplier : null,
          annualSpend: typeof parsed.annualSpend === "number" ? parsed.annualSpend : null,
          unitRate: typeof parsed.unitRate === "number" ? parsed.unitRate : null,
          annualUsage: typeof parsed.annualUsage === "number" ? parsed.annualUsage : null,
          contractEndDate: typeof parsed.contractEndDate === "string" ? parsed.contractEndDate : null,
          currency: parsed.currency === "GBP" || parsed.currency === "USD" ? parsed.currency : null,
        },
      });
    }

    // Insurance: coerce premium — if it looks like a monthly figure (< 1000), annualise it
    let currentPremium = typeof parsed.currentPremium === "number" ? parsed.currentPremium : null;
    if (currentPremium !== null && currentPremium > 0 && currentPremium < 1000) {
      currentPremium = Math.round(currentPremium * 12);
    }

    const insuredValue = typeof parsed.insuredValue === "number" ? parsed.insuredValue : null;
    const insurer = typeof parsed.insurer === "string" ? parsed.insurer : null;
    const renewalDate = typeof parsed.renewalDate === "string" ? parsed.renewalDate : null;
    const coverageType = typeof parsed.coverageType === "string" ? parsed.coverageType : null;
    const propertyAddress = typeof parsed.propertyAddress === "string" ? parsed.propertyAddress : null;
    const excess = typeof parsed.excess === "number" ? parsed.excess : null;
    const currency = parsed.currency === "GBP" || parsed.currency === "USD" ? parsed.currency : null;

    // Persist to Document table so insurance-summary can read real policy data
    let documentId: string | undefined;
    try {
      const doc = await prisma.document.create({
        data: {
          userId: session.user.id,
          filename: file.name,
          fileSize: file.size,
          mimeType: "application/pdf",
          documentType: "insurance_policy",
          status: "done",
          extractedData: {
            premium: currentPremium,
            sumInsured: insuredValue,
            insurer,
            renewalDate,
            coverageType,
            propertyAddress,
            excess,
            currency,
          },
        },
      });
      documentId = doc.id;
    } catch (err) {
      console.error("[parse-policy] DB save failed:", err);
      // Non-fatal — still return extracted data to the client
    }

    return NextResponse.json({
      ok: true,
      documentId: documentId ?? null,
      extracted: {
        currentPremium,
        insuredValue,
        insurer,
        renewalDate,
        coverageType,
        propertyAddress,
        excess,
        currency,
      },
    });
  } catch (err) {
    console.error("[parse-policy]", err);
    return NextResponse.json({
      ok: false,
      error: "Could not parse this document — please enter your premium manually.",
    });
  }
}
