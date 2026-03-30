/**
 * POST /api/scout/deals/:dealId/teaser
 * Generates a 2-page investment teaser for a Scout deal.
 *
 * Returns: { pdfUrl, htmlPreview, generatedAt }
 * - If PDF generation succeeds (puppeteer available): pdfUrl is a base64 data URI
 * - If PDF generation fails: pdfUrl is null, htmlPreview still returned
 */

// Route segment config for Vercel
export const maxDuration = 60; // seconds - PDF generation needs time
export const dynamic = 'force-dynamic'; // no caching

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderTeaserHTML, type BrochureData } from "@/lib/brochure-template";
import { generateBrochurePDF } from "@/lib/brochure";

type Params = { params: Promise<{ dealId: string }> };

interface ReqBody {
  recipientName?: string;
  confidential?: boolean;
}

async function generateNarrative(data: {
  assetName: string; assetType: string; location: string; price?: number | null;
  noi?: number | null; yieldPct?: number | null; sym: string;
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return `${data.assetName} is a ${data.assetType.toLowerCase()} asset located in ${data.location}${data.price ? ` with an asking price of ${data.sym}${(data.price / 1_000_000).toFixed(2)}M` : ""}. ${data.noi ? `The property generates ${data.sym}${(data.noi / 1000).toFixed(0)}k per annum in net operating income` : ""}. This asset offers a compelling investment opportunity for buyers seeking commercial income in the ${data.location} market.`;
  }

  const fmt = (v: number) => v >= 1_000_000 ? `${data.sym}${(v / 1_000_000).toFixed(1)}M` : `${data.sym}${Math.round(v / 1000)}k`;

  const prompt = `Write a 3-4 sentence commercial property investment narrative for a teaser document. Be factual, professional, and concise. Focus on the investment thesis. Do not use clichés like "stunning" or "superb".

Asset: ${data.assetName}, ${data.assetType}, ${data.location}
${data.price ? `Asking price: ${fmt(data.price)}` : ""}
${data.noi ? `NOI: ${fmt(data.noi)}/yr` : ""}
${data.yieldPct ? `Initial yield: ${data.yieldPct.toFixed(1)}%` : ""}

Write from the perspective of presenting this investment opportunity to a potential investor.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error("Claude error");
    const j = await res.json() as { content: Array<{ type: string; text: string }> };
    return j.content.find((c) => c.type === "text")?.text ?? "";
  } catch {
    return `${data.assetName} is a ${data.assetType.toLowerCase()} asset located in ${data.location}. ${data.noi ? `Currently generating ${fmt(data.noi)}/yr in net operating income.` : ""} This property offers a strong investment proposition in the ${data.location} commercial market.`;
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await params;

  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
  });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as ReqBody;
  const confidential = body.confidential ?? true; // Default to confidential for teasers
  const recipientName = body.recipientName;

  // Get underwriting data if available
  const underwriting = await prisma.scoutUnderwriting.findFirst({
    where: { dealId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const sym = deal.currency === "GBP" ? "£" : "$";
  const generatedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Use underwriting data if available, otherwise use deal data
  const noi = underwriting?.noinet ?? null;
  const yieldPct = underwriting?.grossYield ?? null;
  const capRate = underwriting?.capRate ?? deal.capRate;

  const narrative = await generateNarrative({
    assetName: deal.address,
    assetType: deal.assetType,
    location: deal.address,
    price: deal.askingPrice ?? deal.guidePrice ?? null,
    noi,
    yieldPct,
    sym,
  });

  const teaserData: BrochureData = {
    type: "teaser",
    assetName: deal.address,
    assetType: deal.assetType,
    location: deal.address,
    address: deal.address ?? undefined,
    sqft: deal.sqft ?? undefined,
    passingRent: noi ?? undefined,
    noi: noi ?? undefined,
    yieldPct: yieldPct ?? undefined,
    capRate: capRate ?? undefined,
    satelliteUrl: deal.satelliteImageUrl ?? undefined,
    narrative,
    sym,
    confidential,
    recipientName,
    generatedAt,
  };

  const htmlPreview = renderTeaserHTML(teaserData);

  // Attempt PDF generation
  let pdfUrl: string | null = null;
  try {
    const pdfBuffer = await generateBrochurePDF(teaserData);
    if (pdfBuffer) {
      pdfUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    }
  } catch {
    // Non-fatal — return HTML preview only
  }

  return NextResponse.json({ pdfUrl, htmlPreview, generatedAt });
}
