import { NextRequest } from "next/server";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio } from "@/lib/data/types";

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function buildPortfolioContext(portfolioId: string): string {
  const p = portfolios[portfolioId] ?? flMixed;
  const sym = p.currency === "USD" ? "$" : "£";

  const totalGross = p.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNet = p.assets.reduce((s, a) => s + a.netIncome, 0);
  const g2n = Math.round((totalNet / totalGross) * 100);
  const totalAUM = p.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const totalInsOverpay = p.assets.reduce((s, a) => s + (a.insurancePremium - a.marketInsurance), 0);
  const totalEnergyOverpay = p.assets.reduce((s, a) => s + (a.energyCost - a.marketEnergyCost), 0);
  const totalAddIncome = p.assets
    .flatMap((a) => a.additionalIncomeOpportunities)
    .reduce((s, o) => s + o.annualIncome, 0);

  const expiringLeases = p.assets.flatMap((a) =>
    a.leases.filter((l) => l.status === "expiring_soon")
  );
  const complianceIssues = p.assets.flatMap((a) =>
    a.compliance.filter((c) => c.status !== "valid")
  );
  const totalFineExposure = complianceIssues.reduce((s, c) => s + c.fineExposure, 0);

  const assetLines = p.assets
    .map((a) => {
      const g2nA = Math.round((a.netIncome / a.grossIncome) * 100);
      const rentRev = Math.round(
        ((a.marketERV - a.passingRent) / a.passingRent) * 100
      );
      const insOverpay = a.insurancePremium - a.marketInsurance;
      const energyOverpay = a.energyCost - a.marketEnergyCost;
      const addIncome = a.additionalIncomeOpportunities.reduce(
        (s, o) => s + o.annualIncome,
        0
      );
      const incomeTypes = a.additionalIncomeOpportunities
        .map((o) => `${o.label} (${fmt(o.annualIncome, sym)}/yr, ${o.status})`)
        .join(", ");

      const leaseSummary = a.leases
        .map(
          (l) =>
            `${l.tenant === "Vacant" ? "Vacant" : l.tenant} ${l.sqft.toLocaleString()} sqft @ ${sym}${l.rentPerSqft}/sqft expiring ${l.expiryDate} (${l.daysToExpiry}d, ${l.status})`
        )
        .join("; ");

      const compSummary = a.compliance
        .filter((c) => c.status !== "valid")
        .map(
          (c) =>
            `${c.certificate} ${c.status} in ${c.daysToExpiry}d (${fmt(c.fineExposure, sym)} fine risk)`
        )
        .join(", ");

      return [
        `  Asset: ${a.name}`,
        `    Type: ${a.type} | Location: ${a.location} | ${a.sqft.toLocaleString()} sqft | ${sym}${(a.valuationUSD ?? a.valuationGBP ?? 0) / 1_000_000}M valuation`,
        `    Income: gross ${fmt(a.grossIncome, sym)}/yr, net ${fmt(a.netIncome, sym)}/yr, G2N ${g2nA}%`,
        `    Occupancy: ${a.occupancy}% | Passing rent: ${sym}${a.passingRent}/sqft | ERV: ${sym}${a.marketERV}/sqft${rentRev > 0 ? ` (+${rentRev}% reversion available)` : ""}`,
        `    Insurance: paying ${fmt(a.insurancePremium, sym)}, market ${fmt(a.marketInsurance, sym)}, overpay ${fmt(insOverpay, sym)}/yr`,
        `    Energy: paying ${fmt(a.energyCost, sym)}, market ${fmt(a.marketEnergyCost, sym)}, overpay ${fmt(energyOverpay, sym)}/yr`,
        addIncome > 0
          ? `    Additional income opportunities: ${fmt(addIncome, sym)}/yr total — ${incomeTypes}`
          : null,
        leaseSummary ? `    Leases: ${leaseSummary}` : null,
        compSummary ? `    Compliance alerts: ${compSummary}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return `PORTFOLIO: ${p.name} (${p.currency})
AUM: ${fmt(totalAUM, sym)} | Assets: ${p.assets.length} | Gross: ${fmt(totalGross, sym)}/yr | Net: ${fmt(totalNet, sym)}/yr | G2N: ${g2n}% (benchmark: ${p.benchmarkG2N}%)
Total opportunity: ${fmt(totalInsOverpay + totalEnergyOverpay + totalAddIncome, sym)}/yr — Insurance overpay: ${fmt(totalInsOverpay, sym)}, Energy overpay: ${fmt(totalEnergyOverpay, sym)}, Additional income: ${fmt(totalAddIncome, sym)}
Expiring leases: ${expiringLeases.length} | Compliance issues: ${complianceIssues.length}${totalFineExposure > 0 ? ` (${fmt(totalFineExposure, sym)} fine exposure)` : ""}

ASSET DETAIL:
${assetLines}`;
}

export async function POST(req: NextRequest) {
  const { messages, portfolioId } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const p = portfolios[portfolioId as string] ?? flMixed;
  const sym = p.currency === "USD" ? "$" : "£";
  const portfolioContext = buildPortfolioContext(portfolioId ?? "fl-mixed");

  const systemPrompt = `You are Arca — an AI property intelligence agent for commercial real estate owner-operators. You have full visibility into this portfolio and answer questions directly with specific numbers. You surface opportunities, flag risks, and recommend specific actions.

${portfolioContext}

Respond in plain text (no markdown). Be direct and numbers-first. Short paragraphs. If you recommend an action, name it specifically. Use ${sym} for currency. Never hedge when the data is clear.`;

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(err, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
