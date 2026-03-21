import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

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

    const promptText =
      "Extract lease agreement details from this document. Return ONLY valid JSON: " +
      "{ tenantName: string | null, monthlyRent: number | null, currency: 'GBP' | 'USD' | null, " +
      "leaseStart: string | null (ISO date YYYY-MM-DD), leaseEnd: string | null (ISO date YYYY-MM-DD), " +
      "breakClauseDate: string | null (ISO date YYYY-MM-DD, the date the break clause can be exercised), " +
      "sqft: number | null, propertyAddress: string | null }. " +
      "If monthlyRent is not explicitly monthly, convert annual rent to monthly (divide by 12). " +
      "If a field cannot be found, use null.";

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
      console.error("[parse-lease] Claude API error:", errText);
      return NextResponse.json({
        ok: false,
        error: "Could not parse this document — please enter your lease details manually.",
      });
    }

    const claudeResponse = await upstream.json();
    const rawText: string = claudeResponse.content?.[0]?.text ?? "";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({
            ok: false,
            error: "Could not parse this document — please enter your lease details manually.",
          });
        }
      } else {
        return NextResponse.json({
          ok: false,
          error: "Could not parse this document — please enter your lease details manually.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      extracted: {
        tenantName: typeof parsed.tenantName === "string" ? parsed.tenantName : null,
        monthlyRent: typeof parsed.monthlyRent === "number" ? parsed.monthlyRent : null,
        currency: parsed.currency === "GBP" || parsed.currency === "USD" ? parsed.currency : null,
        leaseStart: typeof parsed.leaseStart === "string" ? parsed.leaseStart : null,
        leaseEnd: typeof parsed.leaseEnd === "string" ? parsed.leaseEnd : null,
        breakClauseDate: typeof parsed.breakClauseDate === "string" ? parsed.breakClauseDate : null,
        sqft: typeof parsed.sqft === "number" ? parsed.sqft : null,
        propertyAddress: typeof parsed.propertyAddress === "string" ? parsed.propertyAddress : null,
      },
    });
  } catch (err) {
    console.error("[parse-lease]", err);
    return NextResponse.json({
      ok: false,
      error: "Could not parse this document — please enter your lease details manually.",
    });
  }
}
