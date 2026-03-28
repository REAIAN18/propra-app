"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

// Type definitions
type CollectionStatus = "paid" | "late" | "overdue" | "vacant";

type TenantCollection = {
  id: string;
  tenantName: string;
  suite: string;
  monthlyRent: number;
  status: CollectionStatus;
  paymentDate?: string;
  daysLate?: number;
  amount: number;
};

type CashFlowMonth = {
  month: string;
  revenue: number;
  opex: number;
  noi: number;
  debt: number;
  capex: number;
  netCash: number;
  warning?: string;
};

// Format currency
function fmt(v: number): string {
  const absV = Math.abs(v);
  if (absV >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (absV >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function CollectionDot({ status }: { status: CollectionStatus }) {
  const colors = {
    paid: "bg-[#34d399]",
    late: "bg-[#fbbf24]",
    overdue: "bg-[#f87171]",
    vacant: "bg-[#71717a]",
  };

  return (
    <div
      className={`w-2 h-2 rounded-full ${colors[status]}`}
      aria-label={status}
    />
  );
}

function CollectionRow({ item }: { item: TenantCollection }) {
  const statusLabels = {
    paid: "PAID",
    late: `${item.daysLate} DAYS LATE`,
    overdue: "OVERDUE",
    vacant: "VACANT",
  };

  const statusColors = {
    paid: "bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20",
    late: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
    overdue: "bg-[#f87171]/10 text-[#f87171] border-[#f87171]/20",
    vacant: "bg-[#52525b]/10 text-[#a1a1aa] border-[#52525b]/20",
  };

  const amountColor = item.status === "late" || item.status === "overdue" ? "text-[#fbbf24]" : "text-[#e4e4ec]";

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center py-3 px-4 border-b border-[#27272a] hover:bg-[#18181f] transition-colors">
      <div className="flex items-center gap-3">
        <CollectionDot status={item.status} />
        <div>
          <div className="text-[13px] font-medium text-[#e4e4ec]">{item.tenantName}</div>
          <div className="text-[11px] text-[#a1a1aa] mt-0.5">
            {item.suite} · {fmt(item.monthlyRent)}/mo
          </div>
        </div>
      </div>

      <span
        className={`px-2 py-1 rounded text-[9px] font-mono font-medium uppercase tracking-wider border ${statusColors[item.status]}`}
      >
        {statusLabels[item.status]}
      </span>

      <span className="text-[11px] font-mono text-[#a1a1aa]">
        {item.paymentDate || "—"}
      </span>

      <span className={`text-[12px] font-mono font-medium ${amountColor}`}>
        {item.status === "vacant" ? "—" : fmt(item.amount)}
      </span>

      <button className="text-[#a1a1aa] hover:text-[#7c6af0] transition-colors">
        →
      </button>
    </div>
  );
}

function CashFlowRow({ month }: { month: CashFlowMonth }) {
  const isNegative = month.netCash < 0;
  const hasWarning = Boolean(month.warning);

  return (
    <tr
      className={`border-b border-[#27272a] ${hasWarning ? "bg-[#fbbf24]/5" : ""}`}
    >
      <td className={`py-2 px-3 text-[11px] ${hasWarning ? "text-[#fbbf24]" : "text-[#e4e4ec]"}`}>
        {month.month} {hasWarning ? "⚠" : ""}
      </td>
      <td className="py-2 px-3 text-right text-[11px] font-mono text-[#34d399]">
        {fmt(month.revenue)}
      </td>
      <td className="py-2 px-3 text-right text-[11px] font-mono text-[#f87171]">
        {fmt(month.opex)}
      </td>
      <td className="py-2 px-3 text-right text-[11px] font-mono text-[#e4e4ec]">
        {fmt(month.noi)}
      </td>
      <td className="py-2 px-3 text-right text-[11px] font-mono text-[#a1a1aa]">
        {fmt(month.debt)}
      </td>
      <td className="py-2 px-3 text-right text-[11px] font-mono text-[#a1a1aa]">
        {month.capex > 0 ? fmt(month.capex) : "—"}
      </td>
      <td className={`py-2 px-3 text-right text-[11px] font-mono font-medium ${isNegative ? "text-[#f87171]" : "text-[#34d399]"}`}>
        {isNegative ? "−" : ""}{fmt(Math.abs(month.netCash))}
      </td>
    </tr>
  );
}

export default function FinancialsPage() {
  useNav({ page: "financials" });
  const { portfolio } = usePortfolio("fl-mixed");

  // Derive collection data from portfolio leases
  const [collections, setCollections] = useState<TenantCollection[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowMonth[]>([]);

  useEffect(() => {
    // Build collection status from portfolio data
    const collected: TenantCollection[] = [];
    let totalCollected = 0;
    let totalOutstanding = 0;

    portfolio.assets.forEach((asset) => {
      asset.leases.forEach((lease) => {
        const monthlyRent = lease.sqft * lease.rentPerSqft;
        const isVacant = lease.tenant === "Vacant";

        // Simulate payment status (in production, this would come from TenantPayment model)
        const random = Math.random();
        let status: CollectionStatus;
        let paymentDate: string | undefined;
        let daysLate: number | undefined;

        if (isVacant) {
          status = "vacant";
        } else if (random > 0.85) {
          status = "late";
          daysLate = Math.floor(Math.random() * 20) + 5;
          paymentDate = "Due 1 Mar";
          totalOutstanding += monthlyRent;
        } else {
          status = "paid";
          paymentDate = random > 0.5 ? "1 Mar" : "3 Mar";
          totalCollected += monthlyRent;
        }

        collected.push({
          id: lease.id,
          tenantName: lease.tenant,
          suite: asset.name,
          monthlyRent,
          status,
          paymentDate,
          daysLate,
          amount: monthlyRent,
        });
      });
    });

    setCollections(collected);

    // Build 12-month cash flow forecast
    const months = [
      "Apr 26",
      "May 26",
      "Jun 26",
      "Jul 26",
      "Aug 26",
      "Sep 26",
      "Oct 26",
      "Nov 26",
      "Dec 26",
      "Jan 27",
      "Feb 27",
      "Mar 27",
    ];

    const basePlanning = months.map((month, idx) => {
      // Calculate base revenue from portfolio
      const baseRevenue = portfolio.assets.reduce(
        (sum, asset) => sum + asset.grossIncome,
        0
      ) / 12;

      // Simulate opex (35% of revenue)
      const opex = baseRevenue * 0.35;
      const noi = baseRevenue - opex;

      // Simulate debt service (monthly)
      const annualDebt = 225614; // From design
      const debt = annualDebt / 12;

      // Simulate capex events
      let capex = 0;
      let warning: string | undefined;

      if (month === "Jun 26") {
        capex = 15000;
        warning = "HVAC replacement capex";
      }

      const netCash = noi - debt - capex;

      return {
        month,
        revenue: baseRevenue,
        opex,
        noi,
        debt,
        capex,
        netCash,
        warning,
      };
    });

    setCashFlow(basePlanning);
  }, [portfolio]);

  const totalCollected = collections
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalOutstanding = collections
    .filter((c) => c.status === "late" || c.status === "overdue")
    .reduce((sum, c) => sum + c.amount, 0);
  const collectionRate =
    totalCollected / (totalCollected + totalOutstanding) * 100;

  return (
    <AppShell>
      <TopBar />
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-serif text-[#e4e4ec] mb-2">Financials</h1>
          <p className="text-[14px] text-[#a1a1aa]">
            Portfolio financial performance and cash flow management
          </p>
        </div>

        {/* Rent Collection Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-[#27272a]" />
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
              Rent Collection — March 2026
            </h2>
            <div className="h-px flex-1 bg-[#27272a]" />
          </div>

          <div className="bg-[#111116] rounded-lg border border-[#27272a]">
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#e4e4ec]">Collection Status</h3>
              <span className="text-[12px] text-[#a1a1aa]">
                {collectionRate.toFixed(0)}% collected · {fmt(totalOutstanding)} outstanding
              </span>
            </div>

            <div>
              {collections.map((item) => (
                <CollectionRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Forecast Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-[#27272a]" />
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
              Cash Flow Forecast — Next 12 Months
            </h2>
            <div className="h-px flex-1 bg-[#27272a]" />
          </div>

          <div className="bg-[#111116] rounded-lg border border-[#27272a]">
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#e4e4ec]">
                Monthly Projected Cash Flow
              </h3>
              <button className="text-[12px] text-[#7c6af0] hover:text-[#9d8df7] transition-colors">
                Adjust assumptions →
              </button>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#27272a]">
                    <th className="py-2 px-3 text-left text-[8px] font-mono uppercase tracking-wider text-[#71717a]">
                      Month
                    </th>
                    <th className="py-2 px-3 text-right text-[8px] font-mono uppercase tracking-wider text-[#71717a]">
                      Revenue
                    </th>
                    <th className="py-2 px-3 text-right text-[8px] font-mono uppercase tracking-wider text-[#71717a]">
                      OpEx
                    </th>
                    <th className="py-2 px-3 text-right text-[8px] font-mono uppercase tracking-wider text-[#71717a]">
                      NOI
                    </th>
                    <th className="py-2 px-3 text-right text-[8px] font-mono uppercase tracking-wider text-[#71717a]">
                      Debt
                    </th>
                    <th className="py-2 px-3 text-right text-[8px] font-mono uppercase tracking-wider text-[#71717a]">
                      Capex
                    </th>
                    <th className="py-2 px-3 text-right text-[8px] font-mono uppercase tracking-wider text-[#71717a]">
                      Net Cash
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlow.map((month, idx) => (
                    <CashFlowRow key={idx} month={month} />
                  ))}
                </tbody>
              </table>

              {cashFlow.find((m) => m.warning) && (
                <div className="mt-3 text-[10px] text-[#a1a1aa] leading-relaxed">
                  ⚠ {cashFlow.find((m) => m.warning)?.warning}. Forecast includes known capex events and lease expirations.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Capex Plan Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-[#27272a]" />
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
              Capex Plan
            </h2>
            <div className="h-px flex-1 bg-[#27272a]" />
          </div>

          <div className="bg-[#111116] rounded-lg border border-[#27272a]">
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#e4e4ec]">
                Scheduled Capital Works
              </h3>
              <button className="text-[12px] text-[#7c6af0] hover:text-[#9d8df7] transition-colors">
                Create work order →
              </button>
            </div>

            <div>
              {/* HVAC replacement */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center py-3 px-4 border-b border-[#27272a] hover:bg-[#18181f] transition-colors">
                <div>
                  <div className="text-[13px] font-medium text-[#e4e4ec]">
                    HVAC replacement — Units 2B + 3A
                  </div>
                  <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                    2 units end of life · Quoted $15k · Improves EPC + tenant comfort
                  </div>
                </div>
                <span className="px-2 py-1 rounded text-[9px] font-mono font-medium uppercase tracking-wider bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/20">
                  JUN 2026
                </span>
                <span className="text-[12px] font-mono font-medium text-[#e4e4ec]">
                  $15,000
                </span>
                <span className="text-[10px] text-[#34d399]">+$22k value</span>
                <button className="text-[#a1a1aa] hover:text-[#7c6af0] transition-colors">
                  →
                </button>
              </div>

              {/* Lobby renovation */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center py-3 px-4 border-b border-[#27272a] hover:bg-[#18181f] transition-colors">
                <div>
                  <div className="text-[13px] font-medium text-[#e4e4ec]">Lobby renovation</div>
                  <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                    Modernise entrance · Improve tenant retention + letting appeal
                  </div>
                </div>
                <span className="px-2 py-1 rounded text-[9px] font-mono font-medium uppercase tracking-wider bg-[#52525b]/10 text-[#a1a1aa] border border-[#52525b]/20">
                  Q4 2026
                </span>
                <span className="text-[12px] font-mono font-medium text-[#e4e4ec]">
                  $35,000
                </span>
                <span className="text-[10px] text-[#34d399]">+$60k value</span>
                <button className="text-[#a1a1aa] hover:text-[#7c6af0] transition-colors">
                  →
                </button>
              </div>

              {/* Roof reseal */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center py-3 px-4 border-b border-[#27272a] hover:bg-[#18181f] transition-colors">
                <div>
                  <div className="text-[13px] font-medium text-[#e4e4ec]">Roof reseal</div>
                  <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                    Preventive maintenance · Extends roof life 10 years
                  </div>
                </div>
                <span className="px-2 py-1 rounded text-[9px] font-mono font-medium uppercase tracking-wider bg-[#52525b]/10 text-[#a1a1aa] border border-[#52525b]/20">
                  2027
                </span>
                <span className="text-[12px] font-mono font-medium text-[#e4e4ec]">
                  $28,000
                </span>
                <span className="text-[10px] text-[#a1a1aa]">Maintenance</span>
                <button className="text-[#a1a1aa] hover:text-[#7c6af0] transition-colors">
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Debt & Financing Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-[#27272a]" />
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
              Debt & Financing
            </h2>
            <div className="h-px flex-1 bg-[#27272a]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Current Debt */}
            <div className="bg-[#111116] rounded-lg border border-[#27272a]">
              <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
                <h3 className="text-[15px] font-medium text-[#e4e4ec]">Current Debt</h3>
                <button className="text-[12px] text-[#7c6af0] hover:text-[#9d8df7] transition-colors">
                  Update terms →
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-[12px] text-[#a1a1aa]">Lender</div>
                  <div className="text-[12px] font-medium text-[#e4e4ec]">
                    Chase Commercial
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-[12px] text-[#a1a1aa]">Outstanding</div>
                  <div className="text-[12px] font-mono font-medium text-[#e4e4ec]">
                    $2,980,000
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-[12px] text-[#a1a1aa]">Rate</div>
                  <div className="text-[12px] font-mono font-medium text-[#e4e4ec]">
                    SOFR + 225bps (7.57% all-in)
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-[12px] text-[#a1a1aa]">Maturity</div>
                  <div className="text-[12px] font-mono font-medium text-[#e4e4ec]">
                    Mar 2028 (24 months)
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-[12px] text-[#a1a1aa]">LTV</div>
                  <div className="text-[12px] font-mono font-medium text-[#fbbf24]">
                    62% (covenant: 65%)
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-[12px] text-[#a1a1aa]">DSCR</div>
                  <div className="text-[12px] font-mono font-medium text-[#34d399]">
                    1.38× (covenant: 1.25×)
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-[12px] text-[#a1a1aa]">Annual debt service</div>
                  <div className="text-[12px] font-mono font-medium text-[#e4e4ec]">
                    $225,614
                  </div>
                </div>
              </div>
            </div>

            {/* Refinance Opportunity */}
            <div className="bg-[#111116] rounded-lg border border-[#27272a]">
              <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
                <h3 className="text-[15px] font-medium text-[#e4e4ec]">
                  Refinance Opportunity
                </h3>
                <button className="text-[12px] text-[#7c6af0] hover:text-[#9d8df7] transition-colors">
                  Model refi →
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-[#18181f] rounded-lg p-3 text-center">
                    <div className="text-[8px] font-mono uppercase tracking-wider text-[#71717a] mb-1">
                      Current Rate
                    </div>
                    <div className="text-[17px] font-serif text-[#e4e4ec]">7.57%</div>
                  </div>
                  <div className="bg-[#18181f] rounded-lg p-3 text-center">
                    <div className="text-[8px] font-mono uppercase tracking-wider text-[#71717a] mb-1">
                      Market Rate
                    </div>
                    <div className="text-[17px] font-serif text-[#34d399]">7.07%</div>
                  </div>
                  <div className="bg-[#18181f] rounded-lg p-3 text-center">
                    <div className="text-[8px] font-mono uppercase tracking-wider text-[#71717a] mb-1">
                      Annual Saving
                    </div>
                    <div className="text-[17px] font-serif text-[#34d399]">$14.9k</div>
                  </div>
                  <div className="bg-[#18181f] rounded-lg p-3 text-center">
                    <div className="text-[8px] font-mono uppercase tracking-wider text-[#71717a] mb-1">
                      Break Cost
                    </div>
                    <div className="text-[17px] font-serif text-[#fbbf24]">$8.2k</div>
                  </div>
                </div>
                <div className="p-3 bg-[#34d399]/5 border border-[#34d399]/20 rounded-lg">
                  <div className="text-[12px] leading-relaxed text-[#34d399]">
                    <strong>Net benefit after break cost:</strong> $14.9k/yr saving − $8.2k
                    break cost = $6.7k net gain in year 1, $14.9k/yr ongoing. Payback: 7
                    months.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
