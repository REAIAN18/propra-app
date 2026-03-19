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
type DemoResponse = { keywords: string[]; response: string };

const FL_MIXED_RESPONSES: DemoResponse[] = [
  {
    keywords: ["biggest", "single", "top", "priority", "most important"],
    response: `The single biggest opportunity right now is income activation. Across the FL Mixed portfolio there are $124k/yr of additional income streams sitting idle — rooftop solar, EV charging bays, and a 5G mast placement — that require no capital from you. Arca identifies the right operators, negotiates the contracts, and installs everything on a commission-only basis.

The second priority is insurance. The portfolio is paying $42k/yr above the market rate across 4 assets. Brickell Retail Center is the worst offender at 36% above benchmark. A retender across 8–12 carriers would close most of that gap within 60 days.

Combined that's $166k/yr recoverable before touching rents or energy.`,
  },
  {
    keywords: ["insurance", "premium", "carrier", "retender"],
    response: `The portfolio is overpaying $42k/yr on insurance. Broken down by asset:

Brickell Retail Center: paying $68k, market rate $50k — overpay $18k/yr (36% above benchmark).
Palmetto Industrial Park: paying $54k, market rate $42k — overpay $12k/yr (29% above benchmark).
The other assets are within 15% of market, which is acceptable.

Recommended action: retender Brickell Retail Center and Palmetto Industrial Park immediately. With two assets in a single placement, you have negotiating leverage. Arca would approach Allianz, Markel, QBE, and Beazley as priority carriers. Expected timeline: 30–45 days to bind. Arca fee: 15% of the saving — $6k — paid only on placement.`,
  },
  {
    keywords: ["lease", "expiry", "expiring", "reversion", "rent review", "wault", "tenant"],
    response: `Three leases are flagged as expiring soon across the portfolio.

Apex Logistics Hub: the 18,000 sqft unit leased to Coastal Distribution expires in 348 days at $26/sqft. ERV is $31/sqft — that's a $90k/yr reversion opportunity if you capture it at lease renewal. Start the rent review process now.

Palmetto Industrial Park: a 9,600 sqft unit expires in 289 days at $25/sqft against ERV of $29/sqft. $38k/yr uplift available. This tenant is likely to renew given limited comparable supply in the Hillsborough submarket.

Coconut Grove Mixed Use has a vacant unit (11,200 sqft). At ERV of $45/sqft this is costing $504k/yr in lost rent. Marketing at $42/sqft with a 3-month rent-free incentive is the recommended approach.

Total rent reversion available across expiring leases: ~$170k/yr.`,
  },
  {
    keywords: ["compliance", "certificate", "fire", "eicr", "expir", "fine", "regulation"],
    response: `There are 3 compliance certificates requiring action.

Apex Logistics Hub — Fire Safety Certificate: expires in 151 days. Fine exposure: $25k. Schedule renewal now — lead time for fire safety assessors in Miami-Dade is typically 6–8 weeks.

Apex Logistics Hub — Elevator Inspection: expires in 45 days. This is urgent — fine exposure $15k and the building cannot legally operate elevators past expiry. Book an inspection this week.

Coconut Grove Mixed Use — EICR: expired. $20k fine exposure. An electrical inspection should be arranged within 7 days.

Total fine exposure if nothing is done: $60k. Arca tracks all certificates and files renewals automatically — included in the platform at no extra cost.`,
  },
  {
    keywords: ["energy", "electricity", "supplier", "tariff", "kwh", "utility"],
    response: `The portfolio is paying $28k/yr above market rate on energy.

Palmetto Industrial Park: paying $87k/yr, market rate $68k — overpay $19k/yr. Large warehouse footprint with predictable load profile — ideal for a fixed-rate commercial tariff. The current Duke Energy default rate is 24% above what Constellation or Direct Energy would offer.

Apex Logistics Hub: paying $64k/yr, market rate $52k — overpay $12k/yr. Switch to a green tariff here and you can market the asset as net-zero aligned, which is increasingly a leasing requirement for logistics tenants.

Arca would run a live comparison across 6 suppliers and lock in the best rate within 3 business days. Fee: 10% of the year-1 saving — $3k total.`,
  },
  {
    keywords: ["income", "solar", "ev", "5g", "mast", "parking", "billboard", "additional"],
    response: `There are $124k/yr of additional income opportunities identified. Status:

Rooftop Solar — Apex Logistics Hub (180kWp): $32k/yr, 85% probability, currently in progress. Expected to go live within 90 days.

5G Mast — Palmetto Industrial Park: $18k/yr, 90% probability. The rooftop has line-of-sight coverage value for T-Mobile and AT&T. Arca can run a competitive tender in 2 weeks.

EV Charging — Brickell Retail Center: $24k/yr, 78% probability. 12 bays in the car park, high retail footfall. BP Pulse and Osprey are both active in this market. No capex required.

5G Mast — Coconut Grove Mixed Use: $15k/yr, 88% probability.

Activating all four adds $89k/yr in high-probability income.`,
  },
  {
    keywords: ["financing", "loan", "debt", "refinance", "mortgage", "lender", "interest rate", "ltv", "icr", "maturity", "covenant"],
    response: `Two assets require financing attention.

Brickell Retail Center: $4.2M loan at 7.1% fixed with Wells Fargo, maturing in 42 days. This is the most urgent item. The market rate is 6.4% — you're paying 70bps above market on $4.2M, or $29k/yr in excess interest. Refinancing now at market rate saves $29k/yr. Arca would approach 4–6 lenders including Regional Bank Group, Pacific Western, and Valley National. Fee: 1% arrangement fee on placed debt — $42k, payable only on completion.

Palmetto Industrial Park: $7.8M loan at 6.8% with JPMorgan Chase, maturing in 127 days. ICR is 1.61x — comfortable. Rate is 40bps above market. Refinancing yields $31k/yr saving. Start this process now given the 127-day runway.

Remaining 3 assets have loans within acceptable parameters — ICR above 1.5x and rates within 25bps of market.

Total: $60k/yr in excess debt service recoverable across the portfolio.`,
  },
  {
    keywords: ["hold", "sell", "exit", "irr", "dispose", "disposal", "capital", "sale", "sell or hold", "which asset"],
    response: `Based on current NOI, cap rates, and market conditions, the hold/sell analysis across the FL Mixed portfolio shows mixed signals.

Brickell Retail Center: Hold IRR 8.2%, Sell IRR 9.8% at a 6.5% cap rate. The 160bps IRR advantage for selling is significant. With Brickell office rents at $72/sqft and the asset at 100% occupancy, exit pricing is strong right now. Arca recommendation: Sell. Begin transaction process.

Palmetto Industrial Park: Hold IRR 9.1%, Sell IRR 8.4% — hold wins by 70bps. Industrial cap rates in Tampa have compressed; holding captures more of the income upside as rents revert to ERV. Recommendation: Hold.

Apex Logistics Hub: Hold IRR 8.7%, Sell IRR 8.6% — marginal. The Coastal Distribution lease expires in 348 days. Selling before the lease event avoids the void risk and captures current occupancy premium. Recommendation: Review — model the void scenario before deciding.

Coconut Grove Mixed Use: 20% vacant unit is suppressing valuation. Wait for re-letting before exit — vacancy discount typically 15–20% on mixed-use. Recommendation: Hold until full occupancy.

The strongest exit right now is Brickell. Arca manages the full transaction for 0.25% of deal value — $23k on a $9.4M exit.`,
  },
];

const SE_LOGISTICS_RESPONSES: DemoResponse[] = [
  {
    keywords: ["biggest", "single", "top", "priority", "most important"],
    response: `The most urgent issue in this portfolio is the DHL break clause at Dartford Logistics Hub — exercisable in 68 days (26 May 2026). DHL has not yet served notice. If they exercise it, you lose £1.19M/yr in gross income on a 85,000 sqft building worth £22.5M. Arca recommends engaging DHL directly within the next 2 weeks to understand their intentions and — if they plan to stay — to capture the rent reversion. Passing rent is £14/sqft against ERV of £16/sqft; a renewal at market adds £170k/yr.

The second priority is energy. The portfolio is paying £362k/yr above market rate on energy — the biggest absolute overspend item. Thurrock Distribution Centre alone is £122k/yr above benchmark.

Combined with insurance overpay (£183k/yr) and income opportunities (£614k/yr identified), total recoverable opportunity across the SE Logistics portfolio is £1.16M/yr.`,
  },
  {
    keywords: ["insurance", "premium", "carrier", "retender"],
    response: `The SE Logistics portfolio is overpaying £183k/yr on insurance across 5 assets.

Thurrock Distribution Centre: paying £210k, market rate £148k — overpay £62k/yr (42% above benchmark). This is by far the worst offender. A retender here alone would generate £9k in Arca commission.

Dartford Logistics Hub: paying £148k, market rate £105k — overpay £43k/yr (41% above benchmark).

Gravesend Logistics Centre: paying £118k, market rate £82k — overpay £36k/yr.

Recommended action: retender Thurrock and Dartford as a combined placement to maximise carrier leverage. Arca would approach QBE, Allianz, Zurich, and Hiscox. Both buildings are Grade A industrial with strong loss history — you should be able to command significant discounts. Timeline: 30–45 days. Arca fee: 15% of the saving — £27k on placement.`,
  },
  {
    keywords: ["lease", "expiry", "expiring", "reversion", "rent review", "wault", "tenant", "break", "dhl"],
    response: `Two critical lease situations require immediate attention.

Dartford Logistics Hub — DHL break clause: exercisable 26 May 2026, just 68 days away. DHL (85,000 sqft, £1.19M gross income) has not yet served notice. If they stay, passing rent at £14/sqft is £170k/yr below ERV of £16/sqft. Arca recommends a direct conversation with DHL's estates team this week to secure a renewal commitment and negotiate the uplift.

Gravesend Logistics Centre — XPO Logistics: 68,000 sqft expiring in 289 days at £14/sqft. ERV is £16.50/sqft — a £170k/yr reversion available at renewal. XPO did not exercise their Dec 2024 break so they are committed to the lease term, but marketing preparation for a new lease should start now.

Basildon Industrial Estate — Basildon Engineering: 20,000 sqft expiring in 289 days. ERV of £15.50/sqft vs passing £13/sqft — £50k/yr reversion. Tenant has been in occupation since 2020 and is likely to renew.

Total rent reversion available: ~£390k/yr if all three renewals are concluded at ERV.`,
  },
  {
    keywords: ["compliance", "certificate", "fire", "eicr", "asbestos", "expir", "fine", "regulation"],
    response: `Five compliance certificates require action across the portfolio. Two are critical.

Thurrock Distribution Centre — Asbestos Management Survey: expires in 14 days. Fine exposure: £35k. This is the most urgent item in the portfolio. Asbestos surveys take 2–5 days to complete — book immediately.

Gravesend Logistics Centre — Asbestos Management Survey: expires in 44 days. Fine exposure: £28k. Book this alongside Thurrock to get a combined surveyor rate.

Basildon Industrial Estate — Fire Risk Assessment: expires in 44 days. Fine exposure: £18k.

Dartford Logistics Hub — EICR: expires in 59 days. Fine exposure: £20k.

Gravesend Logistics Centre — EICR: expires in 136 days. Fine exposure: £15k.

Total fine exposure across all five: £116k. Arca tracks all certificates and files renewals automatically — no manual chasing required.`,
  },
  {
    keywords: ["energy", "electricity", "supplier", "tariff", "kwh", "utility"],
    response: `The SE Logistics portfolio is paying £362k/yr above market rate on energy — the largest single recoverable item after income.

Thurrock Distribution Centre: paying £412k/yr, market rate £290k — overpay £122k/yr. Amazon's 120,000 sqft facility has predictable 24/7 load. This is the ideal candidate for a fixed-rate industrial tariff from a supplier like EDF or Centrica Business Solutions.

Dartford Logistics Hub: paying £286k/yr, market rate £198k — overpay £88k/yr. DHL's break clause situation makes energy switching more attractive — demonstrating operational cost improvements strengthens the case for a lease renewal at higher rent.

Gravesend Logistics Centre: paying £228k/yr, market rate £158k — overpay £70k/yr.

All three buildings have large roof areas with solar potential that would further reduce net energy cost. Arca would run a live supplier comparison across 8 suppliers simultaneously. Fee: 10% of the year-1 saving — £36k on the full portfolio.`,
  },
  {
    keywords: ["income", "solar", "ev", "5g", "mast", "parking", "billboard", "additional"],
    response: `There are £614k/yr of additional income opportunities identified across the SE Logistics portfolio. This is the largest single bucket.

Thurrock Distribution Centre — Rooftop Solar (900kWp): £144k/yr, 95% probability, in progress. Arca is in discussions with Low Carbon and Anesco. Amazon's energy demand profile makes this highly viable.

Dartford Logistics Hub — Rooftop Solar (600kWp): £96k/yr, 92% probability, in progress. The 5G mast at this site is already live at £22k/yr — the solar install is the next step.

Gravesend Logistics Centre — Rooftop Solar (480kWp): £76.8k/yr, 88% probability, in progress.

Basildon Industrial Estate — Rooftop Solar (320kWp): £51.2k/yr, 82% probability. Identified — not yet approached operators.

EV Charging across Thurrock, Dartford, Basildon, and Gravesend: combined £159k/yr opportunity. Industrial parks with HGV movements are now among the highest-yield EV charging locations in the UK. Osprey and GridServe are both expanding aggressively in SE England.

Total high-probability income (>75%): £540k/yr.`,
  },
  {
    keywords: ["financing", "loan", "debt", "refinance", "mortgage", "lender", "interest rate", "ltv", "icr", "maturity", "covenant"],
    response: `Two loans require urgent attention across the SE Logistics portfolio.

Thurrock Distribution Centre: £14.4M loan at 6.2% fixed with Lloyds Bank, maturing in 42 days. Critical. ICR is 1.04x — below the 1.25x covenant. The combination of near-term maturity and covenant breach risk makes this the single most urgent financing action in the portfolio. Arca would approach 5–6 lenders including NatWest, Barclays Commercial, and two debt funds. A covenant cure via income improvement (energy switching, rent reversion) should run in parallel. Arrangement fee: 1% on placed debt — £144k payable on completion.

Dartford Logistics Hub: £13.5M loan at 5.8% with HSBC, maturing in 127 days. ICR 1.48x — acceptable but the DHL break clause creates refinancing risk. If DHL exercises the break, LTV would deteriorate significantly. Lenders will price this risk in; act before the break date is resolved.

Gravesend, Basildon, Milton Keynes: stable. Rates within 30bps of market, ICR above 1.4x across all three.

Net excess debt service across the portfolio: £97k/yr — recoverable via refinancing to market rates.`,
  },
  {
    keywords: ["hold", "sell", "exit", "irr", "dispose", "disposal", "capital", "sale", "sell or hold", "which asset"],
    response: `The hold/sell analysis across the SE Logistics portfolio in current market conditions:

Thurrock Distribution Centre: Hold IRR 8.1%, Sell IRR 9.4% — sell advantage 130bps. Amazon is the anchor tenant on a long lease; prime South East industrial with 120,000 sqft trades at strong cap rate compression. Logistics yields in Thurrock are at 5.0–5.3%. At current NOI this implies a £27.5M valuation against the £14.4M loan — strong equity release available. Recommendation: Sell or recapitalise.

Dartford Logistics Hub: Hold IRR 7.8%, Sell IRR 7.2% — hold wins by 60bps, but the DHL break clause is the critical variable. If DHL exercises the break, selling quickly while the building appears occupied is strongly preferred. If they renew, hold and capture the rent reversion (£170k/yr uplift). Recommendation: Monitor — resolve DHL position first.

Gravesend, Basildon, Milton Keynes: All three show hold IRR > sell IRR by 50–90bps. ERV reversion available across all three as leases roll — the income upside is captured better by holding. Recommendation: Hold and review at next lease event.

Strongest exit opportunity: Thurrock — Arca manages the full transaction for 0.25% of deal value.`,
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
    // Demo mode: return portfolio-specific canned response based on the last user message
    const lastUserMsg = [...(messages as { role: string; content: string }[])]
      .reverse()
      .find((m) => m.role === "user");
    const query = (lastUserMsg?.content ?? "").toLowerCase();

    const isSE = portfolioId === "se-logistics";
    const responses = isSE ? SE_LOGISTICS_RESPONSES : FL_MIXED_RESPONSES;
    const match = responses.find((r) => r.keywords.some((kw) => query.includes(kw)));

    const responseText =
      match?.response ??
      (isSE
        ? `This is a live demo of the SE Logistics Portfolio (5 assets, £91M AUM, £1.16M/yr opportunity identified). The AI analysis connects to your real portfolio when you onboard with Arca. Email hello@arcahq.ai or explore the dashboard modules — each one shows live numbers for this portfolio.`
        : `This is a live demo of the FL Mixed Portfolio (5 assets, $2.8M gross income, $194k/yr opportunity identified). The full AI analysis is available when Arca connects your real portfolio. Email hello@arcahq.ai or explore the dashboard modules to see every number.`);

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
