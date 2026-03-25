/**
 * POST /api/user/assets/:id/brochure
 * Generates a marketing brochure or investment memo for an asset.
 *
 * Returns: { pdfUrl, htmlPreview, generatedAt }
 * - If PDF generation succeeds (puppeteer available): pdfUrl is a base64 data URI
 * - If PDF generation fails: pdfUrl is null, htmlPreview still returned
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderBrochureHTML, type BrochureData } from "@/lib/brochure-template";
import { generateBrochurePDF } from "@/lib/brochure";

type Params = { params: Promise<{ id: string }> };

interface ReqBody {
  type?: "brochure" | "investment_memo";
  includeFinancials?: boolean;
  includeLeaseSchedule?: boolean;
  recipientName?: string;
  confidential?: boolean;
}

async function generateNarrative(data: {
  assetName: string; assetType: string; location: string; sqft?: number | null;
  passingRent?: number | null; marketERV?: number | null; yieldPct?: number | null;
  tenantNames: string; planningSignal?: string | null; sym: string;
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return `${data.assetName} is a ${data.assetType.toLowerCase()} asset located in ${data.location}${data.sqft ? ` comprising ${data.sqft.toLocaleString()} sqft` : ""}. ${data.passingRent ? `The property generates ${data.sym}${(data.passingRent / 1000).toFixed(0)}k per annum in contracted income` : "The property is available for acquisition"}. ${data.marketERV && data.passingRent && data.marketERV > data.passingRent ? `There is an active management opportunity with estimated rental value of ${data.sym}${(data.marketERV / 1000).toFixed(0)}k, representing a ${Math.round((data.marketERV - data.passingRent) / data.passingRent * 100)}% uplift potential.` : ""} The asset offers a compelling investment proposition for buyers seeking stabilised commercial income in the ${data.location} market.`;
  }

  const fmt = (v: number) => v >= 1_000_000 ? `${data.sym}${(v / 1_000_000).toFixed(1)}M` : `${data.sym}${Math.round(v / 1000)}k`;
  const upliftNote = data.marketERV && data.passingRent && data.marketERV > data.passingRent
    ? `${Math.round((data.marketERV - data.passingRent) / data.passingRent * 100)}% below market — uplift opportunity`
    : "at or near market rate";

  const prompt = `Write a 3-4 sentence commercial property investment narrative for a marketing brochure. Be factual, professional, and concise. Do not use clichés like "stunning" or "superb".

Asset: ${data.assetName}, ${data.assetType}, ${data.location}
${data.sqft ? `Size: ${data.sqft.toLocaleString()} sqft` : ""}
${data.passingRent ? `Passing rent: ${fmt(data.passingRent)}/yr` : "Vacant"}
${data.marketERV ? `Market ERV: ${fmt(data.marketERV)}/yr (${upliftNote})` : ""}
${data.yieldPct ? `NOI yield: ${data.yieldPct.toFixed(1)}%` : ""}
${data.tenantNames ? `Key tenant(s): ${data.tenantNames}` : ""}
${data.planningSignal ? `Planning: ${data.planningSignal}` : ""}

Write from the perspective of presenting this asset to a potential investor.`;

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
    return `${data.assetName} is a ${data.assetType.toLowerCase()} asset located in ${data.location}. ${data.passingRent ? `Currently generating ${fmt(data.passingRent)}/yr in contracted income.` : ""} This property offers a strong investment proposition in the ${data.location} commercial market.`;
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as ReqBody;
  const brochureType = body.type ?? "brochure";
  const confidential = body.confidential ?? false;
  const recipientName = body.recipientName;

  // Load tenants from leases
  const leases = await (prisma as unknown as {
    lease: {
      findMany: (q: object) => Promise<Array<{
        passingRent: number; sqft: number; rentPerSqft: number | null;
        expiryDate: Date | null; tenant: { name: string };
      }>>;
    };
  }).lease.findMany({
    where: { assetId, userId: session.user.id, status: "active" },
    include: { tenant: { select: { name: true } } },
  } as object).catch(() => []);

  const tenantNames = leases.map((l: { tenant: { name: string } }) => l.tenant.name).join(", ");

  // Compute yield
  const passingRent = asset.passingRent ?? asset.grossIncome ?? 0;
  // Rough AVM-based yield
  const yieldPct = asset.avmValue && passingRent
    ? (passingRent / asset.avmValue) * 100
    : asset.marketCapRate ?? undefined;

  // Monthly financial for NOI
  const mfRows = await (prisma as unknown as {
    monthlyFinancial: {
      findMany: (q: object) => Promise<Array<{ noi: number; grossRevenue: number; operatingCosts: number }>>;
    };
  }).monthlyFinancial.findMany({
    where: { assetId, userId: session.user.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
  } as object).catch(() => []);

  const financials = mfRows.length >= 3 ? {
    grossRevenue: mfRows.reduce((s: number, r: { grossRevenue: number }) => s + r.grossRevenue, 0),
    operatingCosts: mfRows.reduce((s: number, r: { operatingCosts: number }) => s + r.operatingCosts, 0),
    noi: mfRows.reduce((s: number, r: { noi: number }) => s + r.noi, 0),
  } : undefined;

  const sym = asset.country === "UK" ? "£" : "$";
  const generatedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const narrative = await generateNarrative({
    assetName: asset.name,
    assetType: asset.assetType,
    location: asset.location,
    sqft: asset.sqft,
    passingRent: passingRent || undefined,
    marketERV: asset.marketERV,
    yieldPct,
    tenantNames,
    planningSignal: asset.planningImpactSignal,
    sym,
  });

  const brochureData: BrochureData = {
    type: brochureType,
    assetName: asset.name,
    assetType: asset.assetType,
    location: asset.location,
    address: asset.address ?? undefined,
    sqft: asset.sqft ?? undefined,
    passingRent: passingRent || undefined,
    marketERV: asset.marketERV ?? undefined,
    noi: financials?.noi,
    yieldPct,
    capRate: yieldPct,
    marketCapRate: asset.marketCapRate ?? undefined,
    epcRating: asset.epcRating ?? undefined,
    satelliteUrl: asset.satelliteUrl ?? undefined,
    tenants: leases.map((l: {
      tenant: { name: string };
      expiryDate: Date | null;
      rentPerSqft: number | null;
    }) => ({
      name: l.tenant.name,
      expiry: l.expiryDate ? l.expiryDate.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : null,
      rentPerSqft: l.rentPerSqft,
    })),
    financials,
    narrative,
    sym,
    confidential,
    recipientName,
    generatedAt,
  };

  const htmlPreview = renderBrochureHTML(brochureData);

  // Attempt PDF generation
  let pdfUrl: string | null = null;
  try {
    const pdfBuffer = await generateBrochurePDF(brochureData);
    if (pdfBuffer) {
      pdfUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    }
  } catch {
    // Non-fatal — return HTML preview only
  }

  return NextResponse.json({ pdfUrl, htmlPreview, generatedAt });
}
