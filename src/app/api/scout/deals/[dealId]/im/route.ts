/**
 * POST /api/scout/deals/:dealId/im
 * Generates a full 8-10 page Investment Memorandum for a Scout deal.
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
import { renderBrochureHTML, type BrochureData } from "@/lib/brochure-template";
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
    return `${data.assetName} is a ${data.assetType.toLowerCase()} asset located in ${data.location}${data.price ? ` with an asking price of ${data.sym}${(data.price / 1_000_000).toFixed(2)}M` : ""}. ${data.noi ? `The property generates ${data.sym}${(data.noi / 1000).toFixed(0)}k per annum in net operating income` : ""}. This asset represents a compelling institutional-grade investment opportunity for buyers seeking high-quality commercial income in the ${data.location} market. The property benefits from strong fundamentals and favorable market dynamics.`;
  }

  const fmt = (v: number) => v >= 1_000_000 ? `${data.sym}${(v / 1_000_000).toFixed(1)}M` : `${data.sym}${Math.round(v / 1000)}k`;

  const prompt = `Write a comprehensive 2-paragraph commercial property investment narrative for an institutional Investment Memorandum. Be factual, professional, and detailed. Focus on the investment thesis, property characteristics, market position, and income profile. Do not use clichés like "stunning" or "superb". Write in a formal, analytical tone suitable for institutional investors.

Asset: ${data.assetName}, ${data.assetType}, ${data.location}
${data.price ? `Asking price: ${fmt(data.price)}` : ""}
${data.noi ? `NOI: ${fmt(data.noi)}/yr` : ""}
${data.yieldPct ? `Initial yield: ${data.yieldPct.toFixed(1)}%` : ""}

First paragraph: Property overview, location strengths, and physical characteristics.
Second paragraph: Income profile, investment rationale, and market opportunity.`;

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
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error("Claude error");
    const j = await res.json() as { content: Array<{ type: string; text: string }> };
    return j.content.find((c) => c.type === "text")?.text ?? "";
  } catch {
    return `${data.assetName} is a ${data.assetType.toLowerCase()} asset strategically located in ${data.location}. The property offers institutional-grade commercial space with strong fundamentals and favorable market positioning. ${data.noi ? `Currently generating ${fmt(data.noi)}/yr in net operating income, the asset demonstrates consistent cash flow performance. ` : ""}This investment presents a compelling opportunity for capital deployment in the ${data.location} commercial market, with potential for income optimization and value enhancement through active asset management.`;
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
  const confidential = body.confidential ?? true; // Default to confidential for IMs
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
  const marketCapRate = underwriting?.marketCapRate ?? null;

  const narrative = await generateNarrative({
    assetName: deal.address,
    assetType: deal.assetType,
    location: deal.address,
    price: deal.askingPrice ?? deal.guidePrice ?? null,
    noi,
    yieldPct,
    sym,
  });

  // For IM, we want more complete financial data
  const financials = noi ? {
    grossRevenue: noi * 1.15, // Estimate gross from NOI
    operatingCosts: noi * 0.15, // Estimate opex
    noi: noi,
  } : undefined;

  const imData: BrochureData = {
    type: "investment_memo",
    assetName: deal.address,
    assetType: deal.assetType,
    location: deal.address,
    address: deal.address ?? undefined,
    sqft: deal.sqft ?? undefined,
    passingRent: noi ?? undefined,
    noi: noi ?? undefined,
    yieldPct: yieldPct ?? undefined,
    capRate: capRate ?? undefined,
    marketCapRate: marketCapRate ?? undefined,
    satelliteUrl: deal.satelliteImageUrl ?? undefined,
    financials,
    narrative,
    sym,
    confidential,
    recipientName,
    generatedAt,
  };

  const htmlPreview = renderBrochureHTML(imData);

  // Attempt PDF generation
  let pdfUrl: string | null = null;
  try {
    const pdfBuffer = await generateBrochurePDF(imData);
    if (pdfBuffer) {
      pdfUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    }
  } catch {
    // Non-fatal — return HTML preview only
  }

  return NextResponse.json({ pdfUrl, htmlPreview, generatedAt });
}
