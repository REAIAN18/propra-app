/**
 * POST /api/user/ask
 * Conversational AI over the user's real portfolio data. Streams via SSE.
 *
 * Body: { question: string }
 * Response: text/event-stream
 *   — chunks: data: {"delta": "text fragment"}\n\n
 *   — final:  data: {"done": true, "sources": [{label, href}]}\n\n
 *
 * If the user has no assets (demo mode) the response is a polite placeholder,
 * not an error. If ANTHROPIC_API_KEY is absent, returns 501.
 *
 * Architecture note: raw fetch to Anthropic API — no SDK (per codebase convention).
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContextLink {
  label: string;
  href: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

const INCOME_OPP_BY_TYPE: Record<string, number> = {
  industrial: 30000,
  warehouse: 37000,
  retail: 23000,
  office: 31000,
  flex: 23000,
  mixed: 22000,
  commercial: 22000,
};

// ---------------------------------------------------------------------------
// Portfolio context builder — produces a compact text summary for Claude
// ---------------------------------------------------------------------------

async function buildPortfolioContext(userId: string): Promise<string | null> {
  const rows = await prisma.userAsset.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      assetType: true,
      location: true,
      country: true,
      sqft: true,
      grossIncome: true,
      netIncome: true,
      insurancePremium: true,
      marketInsurance: true,
      energyCost: true,
      marketEnergyCost: true,
      occupancy: true,
      epcRating: true,
    },
    orderBy: { createdAt: "asc" },
    take: 20, // cap at 20 to keep context token-efficient
  });

  if (rows.length === 0) return null;

  const isUK = rows.some((r) => r.country !== "US");
  const sym = isUK ? "£" : "$";

  const assets = rows.map((r) => {
    const sqft            = r.sqft ?? 10000;
    const gross           = r.grossIncome ?? sqft * 25;
    const net             = r.netIncome ?? Math.round(gross * 0.72);
    const insPremium      = r.insurancePremium ?? Math.round(gross * 0.04);
    const insMarket       = r.marketInsurance ?? Math.round(insPremium * 0.75);
    const energyCost      = r.energyCost ?? Math.round(gross * 0.06);
    const energyMarket    = r.marketEnergyCost ?? Math.round(energyCost * 0.75);
    const occupancy       = r.occupancy ?? 90;
    const insSaving       = Math.max(0, insPremium - insMarket);
    const energySaving    = Math.max(0, energyCost - energyMarket);
    const incomeOpp       = INCOME_OPP_BY_TYPE[(r.assetType ?? "commercial").toLowerCase()]
                          ?? INCOME_OPP_BY_TYPE["commercial"];
    return { ...r, sqft, gross, net, insPremium, insMarket, energyCost, energyMarket, occupancy, insSaving, energySaving, incomeOpp };
  });

  const totalGross     = assets.reduce((s, a) => s + a.gross, 0);
  const totalNet       = assets.reduce((s, a) => s + a.net, 0);
  const g2n            = Math.round((totalNet / totalGross) * 100);
  const totalInsSave   = assets.reduce((s, a) => s + a.insSaving, 0);
  const totalEnergySave= assets.reduce((s, a) => s + a.energySaving, 0);
  const totalIncomeOpp = assets.reduce((s, a) => s + a.incomeOpp, 0);
  const totalOpp       = totalInsSave + totalEnergySave + totalIncomeOpp;

  const assetLines = assets.map((a) => {
    const lines: string[] = [
      `Asset: ${a.name}`,
      `  Type: ${a.assetType ?? "commercial"} | Location: ${a.location ?? "unknown"} | ${a.sqft.toLocaleString()} sqft`,
      `  Income: gross ${fmt(a.gross, sym)}/yr, net ${fmt(a.net, sym)}/yr, G2N ${Math.round((a.net / a.gross) * 100)}%`,
      `  Occupancy: ${a.occupancy}%`,
    ];
    if (a.insSaving > 0) lines.push(`  Insurance: paying ${fmt(a.insPremium, sym)}, market ${fmt(a.insMarket, sym)} — overpay ${fmt(a.insSaving, sym)}/yr`);
    if (a.energySaving > 0) lines.push(`  Energy: paying ${fmt(a.energyCost, sym)}, market ${fmt(a.energyMarket, sym)} — overpay ${fmt(a.energySaving, sym)}/yr`);
    if (a.epcRating) lines.push(`  EPC: ${a.epcRating}`);
    return lines.join("\n");
  }).join("\n\n");

  return `PORTFOLIO SUMMARY
Assets: ${rows.length} | Gross income: ${fmt(totalGross, sym)}/yr | Net income: ${fmt(totalNet, sym)}/yr | G2N: ${g2n}%
Total identified opportunity: ${fmt(totalOpp, sym)}/yr
  — Insurance overpay: ${fmt(totalInsSave, sym)}/yr
  — Energy overpay: ${fmt(totalEnergySave, sym)}/yr
  — Additional income potential: ${fmt(totalIncomeOpp, sym)}/yr

ASSET DETAIL:
${assetLines}`;
}

// ---------------------------------------------------------------------------
// Derive navigation source links from the answer text
// ---------------------------------------------------------------------------

function deriveSourceLinks(answer: string): ContextLink[] {
  const links: ContextLink[] = [];
  const l = answer.toLowerCase();
  if (l.includes("insurance") || l.includes("premium") || l.includes("retender")) links.push({ label: "Insurance", href: "/insurance" });
  if (l.includes("energy") || l.includes("tariff") || l.includes("kwh")) links.push({ label: "Energy", href: "/energy" });
  if (l.includes("tenant") || l.includes("lease") || l.includes("rent review") || l.includes("renewal")) links.push({ label: "Tenants", href: "/tenants" });
  if (l.includes("compliance") || l.includes("certificate") || l.includes("epc") || l.includes("fire")) links.push({ label: "Compliance", href: "/compliance" });
  if (l.includes("planning") || l.includes("pdr") || l.includes("change of use")) links.push({ label: "Planning", href: "/planning" });
  if (l.includes("work order") || l.includes("contractor") || l.includes("repair") || l.includes("maintenance")) links.push({ label: "Work Orders", href: "/work-orders" });
  if (l.includes("scout") || l.includes("acquisition") || l.includes("underwriting") || l.includes("deal")) links.push({ label: "Scout", href: "/scout" });
  if (l.includes("hold") || l.includes("sell") || l.includes("irr") || l.includes("valuation") || l.includes("exit")) links.push({ label: "Hold vs Sell", href: "/hold-sell" });
  if (l.includes("portfolio") || l.includes("total") || l.includes("summary") || l.includes("overview")) links.push({ label: "Dashboard", href: "/dashboard" });
  // Return at most 3 unique links
  const seen = new Set<string>();
  return links.filter((ln) => { if (seen.has(ln.href)) return false; seen.add(ln.href); return true; }).slice(0, 3);
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseEncode(encoder: TextEncoder, payload: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "AI not available" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({})) as { question?: string };
  const question = body.question?.trim();
  if (!question) {
    return new Response(JSON.stringify({ error: "question is required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = await buildPortfolioContext(session.user.id);

  // No assets — demo/empty user
  if (!context) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const msg = "Add your first property to RealHQ to ask questions about your portfolio. Once your assets are uploaded, I can answer questions about income, costs, compliance, and opportunities across all your properties.";
        controller.enqueue(sseEncode(encoder, { delta: msg }));
        controller.enqueue(sseEncode(encoder, { done: true, sources: [{ label: "Portfolio setup", href: "/dashboard" }] }));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const systemPrompt = `You are RealHQ's portfolio intelligence assistant. You have full access to this owner's commercial property portfolio data. Answer questions concisely and accurately. Always cite specific figures from the portfolio data. When relevant, mention the URL path to navigate to a specific screen (e.g. "see /insurance for full details").

Portfolio context:
${context}`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 800,
      stream:     true,
      system:     systemPrompt,
      messages:   [{ role: "user", content: question }],
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (!claudeRes?.ok || !claudeRes.body) {
    // Fallback — return non-streaming error JSON (not SSE)
    return new Response(JSON.stringify({ error: "AI request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Transform Claude SSE stream → RealHQ SSE format
  const encoder    = new TextEncoder();
  const decoder    = new TextDecoder();
  const fullTokens: string[] = [];

  const outStream = new ReadableStream({
    async start(controller) {
      const reader = claudeRes.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data) as {
                type: string;
                delta?: { type: string; text?: string };
              };
              if (
                evt.type === "content_block_delta" &&
                evt.delta?.type === "text_delta" &&
                evt.delta.text
              ) {
                fullTokens.push(evt.delta.text);
                controller.enqueue(sseEncode(encoder, { delta: evt.delta.text }));
              }
            } catch { /* skip malformed lines */ }
          }
        }
      } catch { /* reader closed early — that's OK */ }

      const sources = deriveSourceLinks(fullTokens.join(""));
      controller.enqueue(sseEncode(encoder, { done: true, sources }));
      controller.close();
    },
  });

  return new Response(outStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
