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

// Canned demo responses — used when ANTHROPIC_API_KEY is not set
const DEMO_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["biggest", "single", "top", "priority", "most important"],
    response: `The single biggest opportunity right now is income activation. Across the FL Mixed portfolio there are $124k/yr of additional income streams sitting idle — rooftop solar, EV charging bays, and a 5G mast placement — that require no capital from you. Arca identifies the right operators, negotiates the contracts, and installs everything on a commission-only basis.

The second priority is insurance. The portfolio is paying $42k/yr above the market rate across 4 assets. Brickell Retail Center is the worst offender — $18k above benchmark. A retender across 8–12 carriers would close most of that gap within 60 days.

Combined that's $166k/yr recoverable before touching rents or energy.`,
  },
  {
    keywords: ["insurance", "premium", "carrier", "retender"],
    response: `The portfolio is overpaying $42k/yr on insurance in total. Broken down by asset:

Brickell Retail Center: paying $68k, market rate $50k — overpay $18k/yr (36% above benchmark).
Palmetto Industrial Park: paying $54k, market rate $42k — overpay $12k/yr (29% above benchmark).
The other two assets are within 15% of market, which is acceptable given current conditions.

Recommended action: retender Brickell Retail Center and Palmetto Industrial Park immediately. With two assets in a single placement, you have negotiating leverage. Arca would approach Allianz, Markel, QBE, and Beazley as priority carriers. Expected timeline: 30–45 days to bind. Arca fee: 15% of the saving — $6k — paid only on placement.`,
  },
  {
    keywords: ["lease", "expiry", "expiring", "reversion", "rent review", "wault", "tenant"],
    response: `Three leases are flagged as expiring soon across the portfolio.

Apex Logistics Hub: the 18,000 sqft unit leased to Coastal Distribution expires in 348 days at $26/sqft. ERV is $31/sqft — that's a $90k/yr reversion opportunity if you capture it at lease renewal. Start the rent review process now.

Palmetto Industrial Park: a 9,600 sqft unit expires in 289 days at $25/sqft against ERV of $29/sqft. $38k/yr uplift available. This tenant is likely to renew given limited comparable supply in the Hillsborough submarket.

Coconut Grove Mixed Use has a vacant unit (11,200 sqft) that has been empty for 71 days. At ERV of $45/sqft this is costing $504k/yr in passing rent. Marketing it at $42/sqft with a 3-month rent-free incentive is the recommended approach.

Total rent reversion available across expiring leases: ~$170k/yr.`,
  },
  {
    keywords: ["compliance", "certificate", "fire", "eicr", "expir", "fine", "regulation"],
    response: `There are 3 compliance certificates requiring action.

Apex Logistics Hub — Fire Safety Certificate: expires in 151 days. Fine exposure: $25k. Schedule renewal now — lead time for fire safety assessors in Miami-Dade is typically 6–8 weeks.

Apex Logistics Hub — Elevator Inspection: expires in 45 days. This is urgent — fine exposure $15k and the building cannot legally operate elevators past expiry. Book an inspection this week.

Coconut Grove Mixed Use — EICR: expired. $20k fine exposure. This is the most urgent item in the portfolio. An electrical inspection should be arranged within 7 days.

Total fine exposure if nothing is done: $60k. Arca tracks all certificates across the portfolio and files renewals automatically — this is included in the platform at no extra cost.`,
  },
  {
    keywords: ["energy", "electricity", "supplier", "tariff", "kwh", "utility"],
    response: `The portfolio is paying $28k/yr above market rate on energy. Priority assets to switch:

Palmetto Industrial Park: paying $87k/yr, market rate $68k — overpay $19k/yr. Large warehouse footprint with predictable load profile — ideal candidate for a fixed-rate commercial tariff. Current supplier (Duke Energy default rate) is 24% above what Constellation or Direct Energy would offer.

Apex Logistics Hub: paying $64k/yr, market rate $52k — overpay $12k/yr. Switch to a green tariff here and you can market the asset as net-zero aligned, which is increasingly a leasing requirement for logistics tenants.

The remaining assets are within acceptable range of market. Arca would run a live comparison across 6 suppliers and lock in the best rate within 3 business days. Fee: 10% of the year-1 saving — $3k total.`,
  },
  {
    keywords: ["income", "solar", "ev", "5g", "mast", "parking", "billboard", "additional"],
    response: `There are $124k/yr of additional income opportunities identified across the portfolio. Status:

Rooftop Solar — Apex Logistics Hub (180kWp): $32k/yr, 85% probability, currently in progress. Arca has approached 3 solar operators. Expected to go live within 90 days.

5G Mast — Palmetto Industrial Park: $18k/yr, 90% probability. Identified. The rooftop has line-of-sight coverage value for T-Mobile and AT&T. Arca can run a competitive tender in 2 weeks.

EV Charging — Brickell Retail Center: $24k/yr, 78% probability. 12 bays in the car park, high footfall from retail. BP Pulse and Osprey are both active in this market. No capex required — operator funds the install.

5G Mast — Coconut Grove Mixed Use: $15k/yr, 88% probability. Identified.

Activating all four adds $89k/yr in high-probability income. Arca handles operator negotiation and installation management.`,
  },
];

function demoStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      // Stream word-by-word with small delays to simulate AI typing
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? "" : " ") + words[i];
        const event = `data: ${JSON.stringify({
          type: "content_block_delta",
          delta: { type: "text_delta", text: chunk },
        })}\n\n`;
        controller.enqueue(encoder.encode(event));
        // Small delay between words
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  const { messages, portfolioId } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Demo mode: return canned response based on the last user message
    const lastUserMsg = [...(messages as { role: string; content: string }[])]
      .reverse()
      .find((m) => m.role === "user");
    const query = (lastUserMsg?.content ?? "").toLowerCase();

    const match = DEMO_RESPONSES.find((r) =>
      r.keywords.some((kw) => query.includes(kw))
    );

    const responseText =
      match?.response ??
      `This is a live demo of the ${portfolioId === "se-logistics" ? "SE Logistics" : "FL Mixed"} portfolio. The AI analysis is available when Arca connects your real portfolio. For a full walkthrough, email hello@arcahq.ai or explore the dashboard modules — each one shows specific numbers for this demo.`;

    return new Response(demoStream(responseText), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
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
