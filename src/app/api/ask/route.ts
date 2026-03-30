import { NextRequest } from "next/server";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio } from "@/lib/data/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STATIC_PORTFOLIOS: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

async function resolvePortfolio(portfolioId: string): Promise<Portfolio> {
  if (STATIC_PORTFOLIOS[portfolioId]) return STATIC_PORTFOLIOS[portfolioId];
  try {
    const custom = await prisma.clientPortfolio.findUnique({ where: { urlKey: portfolioId } });
    if (custom?.data) return custom.data as unknown as Portfolio;
  } catch { /* fall through */ }
  return flMixed;
}

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function buildPortfolioContext(portfolioId: string, overridePortfolio?: Portfolio): string {
  const p = overridePortfolio ?? STATIC_PORTFOLIOS[portfolioId] ?? flMixed;
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
    keywords: ["what do you do", "what does realhq do", "what can you", "overview", "tell me about", "how does this work", "what is this"],
    response: `RealHQ benchmarks every cost line in your commercial portfolio against live market data, identifies the gap between what you are paying and what you should be paying, then closes it.

FL Mixed Portfolio snapshot: $93k insurance overpay, $156k energy overpay, $243k in untapped additional income. $492k total opportunity identified across 5 assets.

RealHQ covers insurance retender, energy switching, income stream activation (solar, EV, 5G, parking), compliance management, lease advisory, financing, and full transaction management.`,
  },
  {
    keywords: ["cost", "fee", "price", "how much", "charge", "commission", "pricing", "pay"],
    response: `RealHQ charges a success fee only on results delivered.

Insurance retender: 15% of annual saving — if RealHQ saves $93k/yr, the fee is $13,950 once, in year one only.
Energy optimisation: 10% of annual saving — $15.6k on the FL Mixed portfolio.
Additional income (solar, EV, 5G): 10% of income generated — paid from the new revenue stream.
Financing: 1% arrangement fee on placed debt — $67k on the Orlando refinancing, payable on completion.
Transactions: 0.25% of deal value — ~$26k on a $10.5M Coral Gables exit.`,
  },
  {
    keywords: ["how long", "timeline", "when", "how quickly", "turnaround", "take"],
    response: `Timelines by workstream:

Insurance retender: 2–4 weeks from portfolio data to new placement. Savings visible from the next renewal date.
Energy switching: 1–3 weeks. Rate locked within 72 hours of supplier comparison; live on next billing cycle.
Additional income (solar install): 60–90 days from survey to live revenue.
Compliance fixes: same week for most certificates. Asbestos and Phase I ESA surveys take 2–5 days.
Financing: 4–8 weeks from mandate to completion. Time-critical for the Orlando maturity in 42 days.
Lease advisory: ongoing — RealHQ starts immediately and works alongside your existing agents.

Most portfolios see first savings within 30 days of engagement.`,
  },
  {
    keywords: ["need from", "what do you need", "information", "data", "documents", "send you", "provide"],
    response: `To scope the full opportunity, RealHQ needs four things:

1. Asset list — address, type (office/industrial/retail), and approximate size in sqft for each property.
2. Current insurance policies — renewal dates and current annual premiums.
3. Latest energy bills — account numbers and current tariff for each meter.
4. Rent roll — tenant names, lease expiry dates, current passing rent, and any break clauses.

No system access required. No data room setup. A 20-minute call and a shared folder is enough to scope the engagement. RealHQ handles everything from there.`,
  },
  {
    keywords: ["total", "summary", "how much can", "overall", "all in", "whole portfolio"],
    response: `FL Mixed Portfolio total identified opportunity: $492k/yr.

Insurance overpay: $93k/yr — 5 assets paying 25–33% above market benchmark. Combined retender saves $93k from year one.
Energy overpay: $156k/yr — consumption above EIA benchmark for each building type. HVAC anomaly detection and demand charge management identified as primary levers. Coral Gables alone is $50k above benchmark.
Additional income: $243k/yr — solar installs in progress at Tampa ($45k) and Coral Gables ($32k), plus EV charging, billboard, 5G mast, and parking across the other 3 assets.

This is based on current market benchmarks and live data for this portfolio. Actual savings depend on your specific contracts — RealHQ provides a full audit with guarantees before any fee is earned.`,
  },
  {
    keywords: ["biggest", "single", "top", "priority", "most important"],
    response: `Three things need to happen immediately.

First — Tampa Industrial Park compliance. Phase I ESA expires in 14 days with $50k fine exposure. This is the single most time-critical item in the portfolio. Book an assessor today.

Second — energy. The portfolio is paying $156k/yr above EIA benchmark across all 5 assets. Coral Gables Office Park alone is $50k above benchmark. RealHQ would run HVAC anomaly detection and demand charge analysis within 24 hours.

Third — income activation. There are $243k/yr of identified income opportunities — solar installs in progress at Tampa and Coral Gables, EV charging and billboard at Brickell, plus 5G and parking at Orlando. Activating the high-probability identified opportunities adds $130k/yr in new income.

Total opportunity across the FL Mixed portfolio: insurance $93k/yr, energy $156k/yr, new income $243k/yr — $492k/yr before touching rents.`,
  },
  {
    keywords: ["insurance", "premium", "carrier", "retender"],
    response: `The portfolio is overpaying $93k/yr on insurance across all 5 assets. Broken down:

Coral Gables Office Park: paying $112k, market rate $84k — overpay $28k/yr (25% above benchmark). Largest absolute overpay.
Orlando Business Center: paying $86k, market rate $62k — overpay $24k/yr (28% above benchmark).
Fort Lauderdale Flex: paying $54k, market rate $38k — overpay $16k/yr (30% above benchmark).
Brickell Retail Center: paying $33.6k, market rate $22.5k — overpay $11k/yr (33% above benchmark).
Tampa Industrial Park: paying $42k, market rate $28k — overpay $14k/yr (33% above benchmark).

Recommended action: retender all 5 as a combined placement for maximum carrier leverage. RealHQ would approach Allianz, Markel, QBE, Travelers, and Beazley. A 5-asset commercial portfolio in Florida carries meaningful volume — expect a 15–25% premium reduction. Timeline: 30–45 days. RealHQ fee: 15% of the saving — $13,950 — paid only on placement.`,
  },
  {
    keywords: ["lease", "expiry", "expiring", "reversion", "rent review", "wault", "tenant"],
    response: `Four lease situations require attention across the portfolio.

Coral Gables Office Park — Meridian Legal: 18,000 sqft at $26/sqft, expiring in 348 days. ERV is $29/sqft — $54k/yr reversion if captured at renewal. Begin lease strategy now; Miami-Dade office demand is strong and you have 12 months to position.

Brickell Retail Center — Coastal Pharmacy: 2,400 sqft at $62/sqft, expiring in 167 days. ERV is $72/sqft — a $24k/yr reversion on a well-located Brickell unit. Retail demand here is robust. Start renewal discussions in the next 30 days.

Fort Lauderdale Flex — Broward Medical Supplies: 7,000 sqft at $21/sqft, expiring in 197 days. ERV is $25/sqft — $28k/yr uplift. Medical supply tenants tend to renew; approach now.

Orlando Business Center: 5,760 sqft vacant (18% of the building). At ERV of $27/sqft this is costing $155k/yr in lost rent. And HR Dynamics (6,400 sqft) expires in 289 days. Dual lease risk is the main reason for the sell recommendation on this asset.

Total reversion potential: ~$106k/yr if all renewals close at ERV.`,
  },
  {
    keywords: ["compliance", "certificate", "fire", "eicr", "expir", "fine", "regulation"],
    response: `Six compliance certificates require action. Three are urgent.

Tampa Industrial Park — Phase I ESA: expires in 14 days. Fine exposure: $50k. This is the most critical item in the portfolio. Environmental assessments take 5–7 days to turn around — book a NEPA-qualified assessor today.

Brickell Retail Center — Health Inspection: expires in 29 days. Fine exposure: $8k. The tenant (Coastal Pharmacy) must coordinate access — contact them this week.

Fort Lauderdale Flex — HVAC Inspection: expires in 15 days. Fine exposure: $6k. HVAC contractors in Broward typically have 3–5 day availability.

Coral Gables Office Park — Elevator Inspection: expires in 45 days. Fine exposure: $15k. Elevators cannot legally operate past expiry — book now.

Coral Gables Office Park — Fire Safety Certificate: expires in 151 days. Fine exposure: $25k. Florida fire assessors have 6–8 week lead times.

Orlando Business Center — EICR: expires in 105 days. Fine exposure: $12k.

Total fine exposure if nothing is done: $116k. RealHQ tracks all certificates and files renewals automatically — no manual chasing required.`,
  },
  {
    keywords: ["energy", "electricity", "supplier", "tariff", "kwh", "utility"],
    response: `The portfolio is paying $156k/yr above EIA benchmark on energy across all 5 assets. Note: FPL, Duke Energy, and TECO are regulated monopolies in Florida — there is no tariff switching available. The saving comes from HVAC anomaly detection, demand charge management, and consumption reduction to EIA benchmark.

Coral Gables Office Park: paying $198k/yr, EIA benchmark $148k — overpay $50k/yr (25% above). Largest overpay. 45,000 sqft office building — HVAC scheduling anomaly likely; overnight and weekend consumption analysis will quantify the saving.

Orlando Business Center: paying $136k/yr, benchmark $98k — overpay $38k/yr (28% above). Partially vacant building means elevated cost per occupied sqft — demand charge management is the primary lever.

Fort Lauderdale Flex: paying $95k/yr, benchmark $68k — overpay $27k/yr (28% above).

Tampa Industrial Park: paying $84k/yr, benchmark $56k — overpay $28k/yr (33% above). Industrial 24/7 load — solar offset at $45k/yr already in progress.

Brickell Retail Center: paying $56k/yr, benchmark $43k — overpay $13k/yr (23% above).

RealHQ runs HVAC anomaly detection and demand charge analysis across all 5 assets. Fee: 10% of year-1 saving — $15.6k total.`,
  },
  {
    keywords: ["income", "solar", "ev", "5g", "mast", "parking", "billboard", "additional"],
    response: `There are $243k/yr of additional income opportunities identified across the FL Mixed portfolio.

Currently in progress:
Coral Gables — Rooftop Solar (180kWp): $32.4k/yr, 85% probability. Expected live within 90 days.
Tampa Industrial — Rooftop Solar (250kWp): $45k/yr, 90% probability. Largest solar install — Tampa industrial roofline is ideal.

Identified (not yet instructed):
Brickell — Digital Billboard (street-facing): $36k/yr, 60% probability. High-footfall Brickell location supports premium rates.
Coral Gables — EV Charging (12 bays): $28.8k/yr, 75% probability. Office commuter profile suits workplace charging.
Fort Lauderdale — Rooftop Solar (140kWp): $25.2k/yr, 80% probability.
Orlando — 5G Rooftop Mast: $24k/yr, 65% probability.
Tampa — EV HGV Charging (4 bays): $19.2k/yr, 70% probability. Industrial traffic supports HGV chargers.
Brickell — EV Charging (6 bays): $14.4k/yr, 80% probability.
Orlando — Weekend Parking Revenue: $18k/yr, 85% probability. Orange County office demand for weekend events is underserved.

Activating all identified opportunities adds ~$166k/yr. RealHQ handles all operator negotiations.`,
  },
  {
    keywords: ["financing", "loan", "debt", "refinance", "mortgage", "lender", "interest rate", "ltv", "icr", "maturity", "covenant"],
    response: `Three assets require financing attention. One is critical.

Orlando Business Center: $6.72M loan at 7.1% fixed with First Horizon, maturing in 42 days. This is the most urgent item. ICR is 1.04x — below the 1.25x covenant. The combination of imminent maturity and covenant breach creates dual pressure. Rate is 190bps above market (market rate 5.2%) — excess interest of $128k/yr. RealHQ would approach 5–6 lenders including Truist, Regions, and PNC. Key risk: vacancy at this asset suppresses ICR and complicates refinancing. Arrangement fee: 1% on placed debt — $67k payable on completion.

Brickell Retail Center: $4.42M loan at 6.4% fixed with Chase, maturing in 103 days. ICR is 1.34x — above covenant but tight. Rate is 140bps above market (market 5.0%) — excess interest of $62k/yr. Refinancing this alongside Coral Gables gives combined leverage with lenders. Start this process within 30 days.

Coral Gables Office Park: $9.23M loan at 5.8% fixed with Wells Fargo, maturing in 195 days. ICR is 1.38x — above covenant but lease expiry risk may cause lenders to adjust their assessment. Rate is 70bps above market — excess interest of $65k/yr. Refinance within 90 days.

Tampa Industrial Park, Fort Lauderdale Flex: stable. Tampa is SOFR+1.5% variable at 5.2% (near market), Fort Lauderdale is 5.9% fixed at Truist — ICR 1.74x on both, no near-term maturity.

Total excess debt service across the FL portfolio: approximately $280k/yr — recoverable via refinancing to current market rates.`,
  },
  {
    keywords: ["hold", "sell", "exit", "irr", "dispose", "disposal", "capital", "sale", "sell or hold", "which asset"],
    response: `Hold/sell analysis across the FL Mixed portfolio based on current NOI, cap rates, and 5-year IRR projections:

Coral Gables Office Park: Hold IRR 7.2%, Sell IRR 9.1% — sell advantage 190bps. Current valuation $9.8M; sell exit estimate $10.5M at 7% buyer cap rate on $742k NOI. Two leases expiring within 12 months add execution risk to the hold scenario. Recommendation: Sell. Begin transaction process now.

Orlando Business Center: Hold IRR 6.8%, Sell IRR 8.4% — sell advantage 160bps. Exit value $10.2M. 18% vacancy and dual lease expiry create compounding risk on hold — the hold scenario requires successful re-leasing at ERV. Current occupancy commands a buyer premium. Recommendation: Sell.

Fort Lauderdale Flex: Hold IRR 8.1%, Sell IRR 7.9% — marginal, 20bps in favour of hold. Exit value $4.9M. Rent reversion potential supports hold; Hillsborough flex demand is strong. Monitor lease outcome over the next 6 months before deciding. Recommendation: Review.

Brickell Retail Center: Hold IRR 8.9%, Sell IRR 7.8% — hold wins by 110bps. Retail in Brickell is supply-constrained. Passing rent 13% below ERV — hold through the lease review cycle to capture the reversion before exit. Recommendation: Hold.

Tampa Industrial Park: Hold IRR 9.6%, Sell IRR 8.2% — hold wins by 140bps. Exit value $6.1M. Full occupancy, strong WAULT, industrial fundamentals improving. Solar addition adds 90bps to hold IRR. No catalyst to sell. Recommendation: Hold.

Strongest exits: Coral Gables and Orlando. RealHQ manages full transactions for 0.25% of deal value.`,
  },
];

const SE_LOGISTICS_RESPONSES: DemoResponse[] = [
  {
    keywords: ["what do you do", "what does realhq do", "what can you", "overview", "tell me about", "how does this work", "what is this"],
    response: `RealHQ benchmarks every cost line in your commercial portfolio against live market data, identifies the gap between what you are paying and what you should be paying, then closes it.

SE Logistics Portfolio snapshot: £65k insurance overpay, £238k energy overpay, £614k in untapped additional income. £917k total opportunity identified across 5 assets.

RealHQ covers insurance retender, energy optimisation (bespoke tender for large HH-metered sites; tariff switching for SME-metered), income stream activation (solar, EV, 5G, parking), compliance management, lease advisory, financing, and full transaction management.`,
  },
  {
    keywords: ["cost", "fee", "price", "how much", "charge", "commission", "pricing", "pay"],
    response: `RealHQ charges a success fee only on results delivered.

Insurance retender: 15% of annual saving — if RealHQ saves £65k/yr, the fee is £9,750 once, in year one only.
Energy optimisation: 10% of annual saving — £23.8k on the SE Logistics portfolio.
Additional income (solar, EV, 5G): 10% of income generated — paid from the new revenue stream.
Financing: 1% arrangement fee on placed debt — £204k on the Thurrock refinancing, payable on completion.
Transactions: 0.25% of deal value — ~£36k on a £14.5M Gravesend exit.`,
  },
  {
    keywords: ["how long", "timeline", "when", "how quickly", "turnaround", "take"],
    response: `Timelines by workstream:

Insurance retender: 2–4 weeks from portfolio data to new placement. Savings visible from the next renewal date.
Energy switching: 1–3 weeks. Rate locked within 72 hours of supplier comparison; live on next billing cycle.
Additional income (solar install): 60–90 days from survey to live revenue.
Compliance fixes: same week for most certificates. Asbestos surveys take 2–5 days — critical given the Thurrock expiry in 14 days.
Financing: 4–8 weeks from mandate to completion. Time-critical for the Thurrock loan maturing in 42 days.
Lease advisory: ongoing — RealHQ starts immediately, especially for the DHL break clause exercisable in 68 days.

Most portfolios see first savings within 30 days of engagement.`,
  },
  {
    keywords: ["need from", "what do you need", "information", "data", "documents", "send you", "provide"],
    response: `To scope the full opportunity, RealHQ needs four things:

1. Asset list — address, type (industrial/logistics/trade park), and approximate size in sqft for each property.
2. Current insurance policies — renewal dates and current annual premiums.
3. Latest energy bills — account numbers and current tariff for each meter.
4. Rent roll — tenant names, lease expiry dates, current passing rent, and any break clauses (including the DHL break at Dartford).

No system access required. No data room setup. A 20-minute call and a shared folder is enough to scope the engagement. RealHQ handles everything from there.`,
  },
  {
    keywords: ["total", "summary", "how much can", "overall", "all in", "whole portfolio"],
    response: `SE Logistics Portfolio total identified opportunity: £917k/yr.

Insurance overpay: £65k/yr — 5 assets paying 29–39% above market benchmark. Thurrock alone is £22.8k above benchmark.
Energy overpay: £238k/yr — contracts locked at inception, never renegotiated. Dartford and Thurrock are HH-metered (>100MWh/yr each) — bespoke broker tender required; Basildon, Medway, and Gravesend can switch via Octopus/EDF SME APIs.
Additional income: £614k/yr — solar installs in progress at Thurrock (£144k), Dartford (£96k), and Gravesend (£77k), plus EV charging across four sites and an existing 5G mast at Dartford already generating £22k/yr.

This is based on current market benchmarks and live data for this portfolio. Actual savings depend on your specific contracts — RealHQ provides a full audit with guarantees before any fee is earned.`,
  },
  {
    keywords: ["biggest", "single", "top", "priority", "most important"],
    response: `The most urgent issue in this portfolio is the DHL break clause at Dartford Logistics Hub — exercisable in 68 days (26 May 2026). DHL has not yet served notice. If they exercise it, you lose £1.19M/yr in gross income on a 85,000 sqft building worth £22.5M. RealHQ recommends engaging DHL directly within the next 2 weeks to understand their intentions and — if they plan to stay — to capture the rent reversion. Passing rent is £14/sqft against ERV of £16/sqft; a renewal at market adds £170k/yr.

The second priority is energy. The portfolio is paying £238k/yr above market rate — Thurrock is £82k/yr above benchmark and Dartford is £57k/yr above. Both are HH-metered; bespoke broker tender required rather than SME switching.

Combined with insurance overpay (£65k/yr) and income opportunities (£614k/yr identified), total recoverable opportunity across the SE Logistics portfolio is £917k/yr.`,
  },
  {
    keywords: ["insurance", "premium", "carrier", "retender"],
    response: `The SE Logistics portfolio is overpaying £65k/yr on insurance across 5 assets.

Thurrock Distribution Centre: paying £58.8k, market rate £36k — overpay £22.8k/yr (39% above benchmark). Largest absolute overpay.

Dartford Logistics Hub: paying £42.5k, market rate £27.2k — overpay £15.3k/yr (36% above benchmark).

Gravesend Logistics Centre: paying £33.6k, market rate £22.4k — overpay £11.2k/yr (33% above benchmark).

Basildon Industrial Estate: paying £29.7k, market rate £19.8k — overpay £9.9k/yr (33% above benchmark).

Medway Trade Park: paying £20.2k, market rate £14.4k — overpay £5.8k/yr (29% above benchmark).

Recommended action: retender Thurrock and Dartford as a combined placement to maximise carrier leverage. RealHQ would approach QBE, Allianz, Zurich, and Hiscox. Both buildings are Grade A industrial with strong loss history. Timeline: 30–45 days. RealHQ fee: 15% of the saving — £9,750 on placement.`,
  },
  {
    keywords: ["lease", "expiry", "expiring", "reversion", "rent review", "wault", "tenant", "break", "dhl"],
    response: `Two critical lease situations require immediate attention.

Dartford Logistics Hub — DHL break clause: exercisable 26 May 2026, just 68 days away. DHL (85,000 sqft, £1.19M gross income) has not yet served notice. If they stay, passing rent at £14/sqft is £170k/yr below ERV of £16/sqft. RealHQ recommends a direct conversation with DHL's estates team this week to secure a renewal commitment and negotiate the uplift.

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

Total fine exposure across all five: £116k. RealHQ tracks all certificates and files renewals automatically — no manual chasing required.`,
  },
  {
    keywords: ["energy", "electricity", "supplier", "tariff", "kwh", "utility"],
    response: `The SE Logistics portfolio is paying £238k/yr above market rate on energy across all 5 assets.

Thurrock Distribution Centre: paying £412k/yr, market rate £330k — overpay £82k/yr (25% above). HH-metered (>100MWh/yr) — Amazon's 24/7 load profile requires a bespoke HH contract via broker tender. EDF Business and Centrica Business Solutions both offer HH contracts for this profile.

Dartford Logistics Hub: paying £286k/yr, market rate £229k — overpay £57k/yr (25% above). Also HH-metered — bespoke broker tender required, not SME API switching.

Gravesend Logistics Centre: paying £228k/yr, market rate £182k — overpay £46k/yr (25% above). SME-metered — can switch via Octopus or EDF SME APIs.

Basildon Industrial Estate: paying £156k/yr, market rate £125k — overpay £31k/yr.

Medway Trade Park: paying £112k/yr, market rate £90k — overpay £22k/yr.

All five buildings have large roof areas with solar potential that would further reduce net energy cost. RealHQ would run bespoke tender for Thurrock and Dartford, and SME API comparison for the remaining three. Fee: 10% of the year-1 saving — £23.8k on the full portfolio.`,
  },
  {
    keywords: ["income", "solar", "ev", "5g", "mast", "parking", "billboard", "additional"],
    response: `There are £614k/yr of additional income opportunities identified across the SE Logistics portfolio. This is the largest single bucket.

Thurrock Distribution Centre — Rooftop Solar (900kWp): £144k/yr, 95% probability, in progress. RealHQ is in discussions with Low Carbon and Anesco. Amazon's energy demand profile makes this highly viable.

Dartford Logistics Hub — Rooftop Solar (600kWp): £96k/yr, 92% probability, in progress. The 5G mast at this site is already live at £22k/yr — the solar install is the next step.

Gravesend Logistics Centre — Rooftop Solar (480kWp): £76.8k/yr, 88% probability, in progress.

Basildon Industrial Estate — Rooftop Solar (320kWp): £51.2k/yr, 82% probability. Identified — not yet approached operators.

EV Charging across Thurrock, Dartford, Basildon, and Gravesend: combined £159k/yr opportunity. Industrial parks with HGV movements are now among the highest-yield EV charging locations in the UK. Osprey and GridServe are both expanding aggressively in SE England.

Total high-probability income (>75%): £540k/yr.`,
  },
  {
    keywords: ["financing", "loan", "debt", "refinance", "mortgage", "lender", "interest rate", "ltv", "icr", "maturity", "covenant"],
    response: `Two assets have urgent financing issues across the SE Logistics portfolio. Both have ICR covenant breaches.

Thurrock Distribution Centre: £20.4M loan at 6.2% fixed with Lloyds, maturing in 42 days. Critical. ICR is 1.04x — below the 1.25x covenant. This is the single most urgent financing action in the portfolio. Rate is 130bps above market (market 4.9%) — excess interest of £265k/yr. RealHQ would approach NatWest, Barclays, PGIM, and AEW Capital. The Amazon covenant gives meaningful lender confidence but the near-term maturity is pressing. Arrangement fee: 1% on placed debt — £204k payable on completion.

Dartford Logistics Hub: £14.625M at 5.4% variable (SONIA+1.8%) with Barclays, maturing in 560 days. ICR is 1.14x — below the 1.25x covenant. The DHL break clause exercisable in 68 days creates additional refinancing risk; if DHL exercises, LTV deteriorates significantly. Lenders will price the break clause risk — act before the break date resolves. Excess interest: £73k/yr (50bps above market). Refinancing before the break removes uncertainty premium.

Basildon Industrial Estate: £5.88M at 5.8% with NatWest, maturing in 195 days. ICR 1.59x — comfortable. Rate is 90bps above market — excess interest £53k/yr. Plan refinancing now.

Medway Trade Park: at market rate (4.8%, HSBC), no excess interest. ICR 2.15x. No action needed.

Gravesend Logistics Centre: £10.68M at 5.6% with Santander, maturing in 287 days. ICR 1.78x. Rate 70bps above market — excess interest £75k/yr. Factor in XPO lease expiry risk when approaching lenders.

Total excess debt service: approximately £466k/yr recoverable via refinancing to current market rates.`,
  },
  {
    keywords: ["hold", "sell", "exit", "irr", "dispose", "disposal", "capital", "sale", "sell or hold", "which asset"],
    response: `The hold/sell analysis across the SE Logistics portfolio in current market conditions:

Dartford Logistics Hub: Hold IRR 7.8%, Sell IRR 8.9% — sell advantage 110bps. The DHL break clause exercisable in 68 days is the critical variable. Logistics cap rate compression in Dartford/Kent makes this an exceptional exit window. Selling now captures current occupancy premium before the break event creates void uncertainty. Recommendation: Sell. Begin transaction process.

Thurrock Distribution Centre: Hold IRR 8.5%, Sell IRR 7.4% — hold wins by 110bps. Amazon covenant with 9yr unexpired; the implied sale price suggests sub-5% yield — insufficient premium for grade-A logistics income at this covenant strength. Hold captures ERV reversion as rent rolls. Recommendation: Hold.

Basildon Industrial Estate: Hold IRR 7.1%, Sell IRR 8.0% — sell advantage 90bps. Exit value £10.4M. Vacancy in unit C (2,250 sqft) is weighing on income. Lease up the vacant unit before committing to sale to maximise exit value. Basildon Engineering (20,000 sqft) also expires in 289 days. Recommendation: Review — market unit C actively, then reassess.

Medway Trade Park: Hold IRR 9.2%, Sell IRR 8.1% — hold wins by 110bps. Both tenants (Kent Auto Parts, Medway Print Co) have 2–4 years unexpired at ERV. Clean income with no near-term expiry. EV charging income uplift adds to hold case. Recommendation: Hold.

Gravesend Logistics Centre: Hold IRR 6.4%, Sell IRR 9.3% — sell strongly favoured, 290bps advantage. Current valuation £14.5M reflecting XPO expiry void risk; reversionary value if re-let at ERV is £18.5–22M. XPO Logistics is exiting at lease expiry in 289 days — void risk is crystallising. Sell now with 9 months income unexpired to a buyer underwriting the re-let. Recommendation: Sell.

Strongest exits: Dartford (110bps sell advantage) and Gravesend (290bps). RealHQ manages full transactions for 0.25% of deal value.`,
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

function buildDemoSystemPrompt(portfolioContext: string, sym: string): string {
  return `You are RealHQ — an AI property intelligence agent for commercial real estate owner-operators. You have full visibility into this portfolio and answer questions directly with specific numbers. You surface opportunities, flag risks, and recommend specific actions.

${portfolioContext}

Respond in plain text (no markdown). Be direct and numbers-first. Short paragraphs. If you recommend an action, name it specifically. Use ${sym} for currency. Never hedge when the data is clear.`;
}

function buildUserSystemPrompt(assets: {
  name: string;
  assetType: string;
  location: string;
  country?: string | null;
  sqft: number | null;
  grossIncome: number | null;
  netIncome: number | null;
  insurancePremium: number | null;
  marketInsurance: number | null;
  energyCost: number | null;
  marketEnergyCost: number | null;
  occupancy: number | null;
}[]): string {
  const INCOME_OPP_BY_TYPE: Record<string, number> = {
    industrial: 30000, warehouse: 37000, retail: 23000,
    office: 31000, flex: 23000, mixed: 22000, commercial: 22000,
  };

  const enriched = assets.map((r) => {
    const sqft = r.sqft ?? 10000;
    const grossIncome = r.grossIncome ?? sqft * 25;
    const netIncome = r.netIncome ?? Math.round(grossIncome * 0.72);
    const insurancePremium = r.insurancePremium ?? Math.round(grossIncome * 0.04);
    const marketInsurance = r.marketInsurance ?? Math.round(insurancePremium * 0.75);
    const energyCost = r.energyCost ?? Math.round(grossIncome * 0.06);
    const marketEnergyCost = r.marketEnergyCost ?? Math.round(energyCost * 0.75);
    const occupancy = r.occupancy ?? 90;
    const typeKey = (r.assetType ?? "commercial").toLowerCase();
    return {
      name: r.name, assetType: r.assetType, location: r.location,
      sqft, grossIncome, netIncome, insurancePremium, marketInsurance,
      energyCost, marketEnergyCost, occupancy,
      insuranceSaving: Math.max(0, insurancePremium - marketInsurance),
      energySaving: Math.max(0, energyCost - marketEnergyCost),
      incomePotential: INCOME_OPP_BY_TYPE[typeKey] ?? INCOME_OPP_BY_TYPE["commercial"],
    };
  });

  const isUK = assets.some((a) => a.country === "UK");
  const sym = isUK ? "£" : "$";
  const totalGross = enriched.reduce((s, a) => s + a.grossIncome, 0);
  const totalNet = enriched.reduce((s, a) => s + a.netIncome, 0);
  const totalIns = enriched.reduce((s, a) => s + a.insurancePremium, 0);
  const totalEnergy = enriched.reduce((s, a) => s + a.energyCost, 0);
  const totalInsSaving = enriched.reduce((s, a) => s + a.insuranceSaving, 0);
  const totalEnergySaving = enriched.reduce((s, a) => s + a.energySaving, 0);
  const totalIncome = enriched.reduce((s, a) => s + a.incomePotential, 0);
  const markets = [...new Set(enriched.map((a) => a.location).filter(Boolean))];

  const assetLines = enriched.map((a) =>
    `- ${a.name} (${a.assetType}, ${a.location}): ${fmt(a.grossIncome, sym)}/yr gross, ${fmt(a.netIncome, sym)}/yr net, ${a.occupancy}% occupancy` +
    (a.insuranceSaving > 0 ? `, insurance saving est. ${fmt(a.insuranceSaving, sym)}/yr` : "") +
    (a.energySaving > 0 ? `, energy saving est. ${fmt(a.energySaving, sym)}/yr` : "")
  ).join("\n");

  return `You are a commercial real estate advisor for RealHQ. The user's portfolio:
- ${enriched.length} asset${enriched.length !== 1 ? "s" : ""} across ${markets.join(", ") || "UK"}
- Total gross income: ${fmt(totalGross, sym)}/yr
- Total net income: ${fmt(totalNet, sym)}/yr
- Insurance premium: ${fmt(totalIns, sym)}/yr (estimated saving: ${fmt(totalInsSaving, sym)}/yr)
- Energy cost: ${fmt(totalEnergy, sym)}/yr (estimated saving: ${fmt(totalEnergySaving, sym)}/yr)
- Additional income potential: ${fmt(totalIncome, sym)}/yr

Assets:
${assetLines}

Answer questions about their portfolio, identify opportunities, and recommend next steps.
Always frame recommendations around RealHQ's services.
Respond in plain text (no markdown). Be direct and numbers-first. Short paragraphs.`;
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
        ? `This is a live demo of the SE Logistics Portfolio (5 assets, £81.4M AUM, £917k/yr opportunity identified). RealHQ connects to your real portfolio when you onboard — the numbers update to your actual assets. Email hello@realhq.com or explore the dashboard modules — each one shows live numbers for this portfolio.`
        : `This is a live demo of the FL Mixed Portfolio (5 assets, $492k/yr of identified opportunity — $93k insurance, $156k energy, $243k additional income). RealHQ connects to your real portfolio when you onboard. Email hello@realhq.com or explore the dashboard modules to see every number.`);

    return new Response(demoStream(responseText), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Check if user has real assets — if so, build context from real data
  let systemPrompt: string;
  let model = "claude-sonnet-4-6";
  try {
    const session = await auth();
    if (session?.user?.id) {
      const userAssets = await prisma.userAsset.findMany({
        where: { userId: session.user.id },
        select: {
          id: true, name: true, assetType: true, location: true, country: true,
          sqft: true, grossIncome: true, netIncome: true,
          insurancePremium: true, marketInsurance: true,
          energyCost: true, marketEnergyCost: true, occupancy: true,
        },
        orderBy: { createdAt: "asc" },
      });
      if (userAssets.length > 0) {
        systemPrompt = buildUserSystemPrompt(userAssets);
        model = "claude-haiku-4-5-20251001";
      } else {
        const p = await resolvePortfolio(portfolioId ?? "fl-mixed");
        const sym = p.currency === "USD" ? "$" : "£";
        const ctx = buildPortfolioContext(portfolioId ?? "fl-mixed", p);
        systemPrompt = buildDemoSystemPrompt(ctx, sym);
      }
    } else {
      const p = await resolvePortfolio(portfolioId ?? "fl-mixed");
      const sym = p.currency === "USD" ? "$" : "£";
      const ctx = buildPortfolioContext(portfolioId ?? "fl-mixed", p);
      systemPrompt = buildDemoSystemPrompt(ctx, sym);
    }
  } catch {
    const p = await resolvePortfolio(portfolioId ?? "fl-mixed");
    const sym = p.currency === "USD" ? "$" : "£";
    const ctx = buildPortfolioContext(portfolioId ?? "fl-mixed", p);
    systemPrompt = buildDemoSystemPrompt(ctx, sym);
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
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
