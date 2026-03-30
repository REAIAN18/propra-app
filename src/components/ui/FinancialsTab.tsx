"use client";

import { FinancialsKPIs } from "./FinancialsKPIs";

interface FinancialsData {
  asset: { id: string; name: string; address: string; currency: string };
  kpis: {
    grossRevenue: number;
    opex: number;
    noi: number;
    collectionRate: number;
    ltv: number;
    dscr: number;
  };
  noiWaterfall: {
    grossRevenue: number;
    insurance: number;
    energy: number;
    maintenance: number;
    management: number;
    noi: number;
  };
  budgetVsActual?: {
    grossRevenue: { actual: number; budget: number };
    insurance: { actual: number; budget: number };
    energy: { actual: number; budget: number };
    maintenance: { actual: number; budget: number };
    noi: { actual: number; budget: number };
  };
  rentCollection?: {
    tenantId: string;
    tenantName: string;
    unitRef: string;
    rentAmount: number;
    status: "paid" | "late" | "overdue" | "vacant";
    paidDate?: string;
    dueDate?: string;
    daysLate?: number;
  }[];
  collectionSummary?: {
    collectedAmount: number;
    outstandingAmount: number;
    latePaymentsCount: number;
    collectionRate: number;
  };
  cashFlowForecast: Array<{
    month: string;
    revenue: number;
    opex: number;
    noi: number;
    debt: number;
    capex: number;
    netCash: number;
  }>;
  capexPlan: Array<{
    id: string;
    description: string;
    estimatedCost: number;
    scheduledDate: string;
    status: string;
    valueImpact: number;
  }>;
  debt?: {
    lender: string;
    outstanding: number;
    rate: string;
    maturity: string;
    ltv: number;
    dscr: number;
    annualDebtService: number;
  };
  refiOpportunity?: {
    currentRate: number;
    marketRate: number;
    annualSaving: number;
    breakCost: number;
  };
}

function fmt(value: number, currency: string = "USD"): string {
  const symbol = currency === "GBP" ? "£" : "$";
  if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}k`;
  return `${symbol}${value.toFixed(0)}`;
}

function VarianceBar({
  label,
  actual,
  budget,
  currency = "USD",
}: {
  label: string;
  actual: number;
  budget: number;
  currency?: string;
}) {
  const percentage = (actual / budget) * 100;
  const isOver = percentage > 100;
  const displayPct = isOver ? `+${(percentage - 100).toFixed(0)}% over` : `${(100 - percentage).toFixed(0)}% under`;

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-[--tx]">{label}</span>
        <span className="text-xs font-mono text-[--tx]">
          {fmt(actual, currency)} / {fmt(budget, currency)} budget
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[--s3] rounded-sm relative overflow-visible">
          <div
            className={`h-full rounded-sm ${isOver ? "bg-[--red]" : "bg-[--grn]"}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[--tx3]"
            style={{ left: "100%" }}
          />
        </div>
        <span className={`text-xs font-mono min-w-fit ${isOver ? "text-[--red]" : "text-[--grn]"}`}>
          {displayPct}
        </span>
      </div>
    </div>
  );
}

export function FinancialsTab({ data }: { data: FinancialsData | null }) {
  if (!data) return <div className="p-6 text-[--tx3]">No financial data available</div>;

  const { kpis, noiWaterfall, budgetVsActual, rentCollection, cashFlowForecast, capexPlan, debt, refiOpportunity } =
    data;
  const { currency } = data.asset;

  return (
    <div className="max-w-[1080px] px-8 py-7">
      {/* KPIs */}
      <FinancialsKPIs
        kpis={[
          { label: "Gross Revenue", value: fmt(kpis.grossRevenue, currency), unit: "yr", status: "neutral" },
          {
            label: "OpEx",
            value: fmt(kpis.opex, currency),
            unit: "yr",
            note: "↑ 8% over budget",
            status: "neg",
          },
          { label: "NOI", value: fmt(kpis.noi, currency), unit: "yr", status: "pos" },
          { label: "Collection Rate", value: `${kpis.collectionRate}%`, status: "neutral" },
          { label: "LTV", value: `${kpis.ltv}%`, note: "above 60% target", status: "neg" },
          { label: "DSCR", value: `${kpis.dscr}×`, status: "pos" },
        ]}
      />

      {/* NOI Waterfall */}
      <div className="bg-[--s1] border border-[--bdr] rounded-lg p-0 mb-6">
        <div className="border-b border-[--bdr] px-4 py-3 flex justify-between items-center">
          <h4 className="font-sans font-600 text-sm text-[--tx]">NOI Bridge — Trailing 12 Months</h4>
          <span className="text-xs font-medium text-[--acc] cursor-pointer">Download P&L →</span>
        </div>
        <div className="px-4 py-6 flex items-end gap-1.5 h-48">
          {[
            { label: "Gross\nRevenue", value: noiWaterfall.grossRevenue, color: "bg-[--grn]" },
            { label: "Insurance", value: -noiWaterfall.insurance, color: "bg-[--red]" },
            { label: "Energy", value: -noiWaterfall.energy, color: "bg-[--red]" },
            { label: "Maintenance", value: -noiWaterfall.maintenance, color: "bg-[--red]" },
            { label: "Management", value: -noiWaterfall.management, color: "bg-[--red]" },
            { label: "NOI", value: noiWaterfall.noi, color: "bg-[--acc]" },
          ].map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full ${item.color} rounded-t opacity-70`}
                style={{ height: `${Math.abs((item.value / noiWaterfall.grossRevenue) * 100)}%` }}
              />
              <span className="text-xs font-mono text-[--tx]">
                {item.value < 0 ? "−" : ""}
                {fmt(Math.abs(item.value), currency)}
              </span>
              <span className="text-xs text-center text-[--tx3] whitespace-pre-wrap">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Budget vs Actual */}
      {budgetVsActual && (
        <>
          <div className="text-xs font-mono uppercase tracking-widest text-[--tx3] mb-3 mt-6">Budget vs Actual — 2026</div>
          <div className="bg-[--s1] border border-[--bdr] rounded-lg p-4 mb-6">
            <div className="border-b border-[--bdr] pb-4 flex justify-between items-center mb-4">
              <h4 className="font-sans font-600 text-sm text-[--tx]">Year-to-Date Variance</h4>
              <span className="text-xs font-medium text-[--acc] cursor-pointer">Edit budget →</span>
            </div>
            <VarianceBar
              label="Gross Revenue"
              actual={budgetVsActual.grossRevenue.actual}
              budget={budgetVsActual.grossRevenue.budget}
              currency={currency}
            />
            <VarianceBar
              label="Insurance"
              actual={budgetVsActual.insurance.actual}
              budget={budgetVsActual.insurance.budget}
              currency={currency}
            />
            <VarianceBar
              label="Energy"
              actual={budgetVsActual.energy.actual}
              budget={budgetVsActual.energy.budget}
              currency={currency}
            />
            <VarianceBar
              label="Maintenance"
              actual={budgetVsActual.maintenance.actual}
              budget={budgetVsActual.maintenance.budget}
              currency={currency}
            />
            <div className="p-3 bg-[--grn-lt] border border-[--grn-bdr] rounded-lg flex justify-between items-center mt-4">
              <span className="font-sans font-500 text-sm text-[--tx]">NOI — YTD</span>
              <div className="text-right">
                <span className="font-serif text-xl text-[--grn]">{fmt(budgetVsActual.noi.actual, currency)}</span>
                <span className="font-sans text-xs text-[--tx3] ml-2">vs {fmt(budgetVsActual.noi.budget, currency)} budget</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rent Collection */}
      {rentCollection && (
        <>
          <div className="text-xs font-mono uppercase tracking-widest text-[--tx3] mb-3 mt-6">Rent Collection</div>
          <div className="bg-[--s1] border border-[--bdr] rounded-lg mb-6 overflow-hidden">
            <div className="border-b border-[--bdr] px-4 py-3 flex justify-between items-center">
              <h4 className="font-sans font-600 text-sm text-[--tx]">Collection Status</h4>
              <span className="text-xs font-medium text-[--tx3]">
                {kpis.collectionRate}% collected · {fmt(data.collectionSummary?.outstandingAmount || 0, currency)} outstanding
              </span>
            </div>
            {rentCollection.map((tenant) => (
              <div
                key={tenant.tenantId}
                className="px-4 py-3 border-b border-[--bdr-lt] last:border-b-0 hover:bg-[--s2] grid gap-3"
                style={{ gridTemplateColumns: "1fr auto auto auto auto" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      tenant.status === "paid"
                        ? "bg-[--grn]"
                        : tenant.status === "late"
                          ? "bg-[--amb]"
                          : tenant.status === "overdue"
                            ? "bg-[--red]"
                            : "bg-[--tx3]"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-medium text-[--tx]">{tenant.tenantName}</div>
                    <div className="text-xs text-[--tx3]">{tenant.unitRef}</div>
                  </div>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-1 rounded border ${
                    tenant.status === "paid"
                      ? "bg-[--grn-lt] border-[--grn-bdr] text-[--grn]"
                      : tenant.status === "late"
                        ? "bg-[--amb-lt] border-[--amb-bdr] text-[--amb]"
                        : tenant.status === "overdue"
                          ? "bg-[--red-lt] border-[--red-bdr] text-[--red]"
                          : "bg-[--s3] border-[--bdr] text-[--tx3]"
                  }`}
                >
                  {tenant.status === "paid"
                    ? "PAID"
                    : tenant.status === "late"
                      ? `${tenant.daysLate} DAYS LATE`
                      : tenant.status === "overdue"
                        ? "OVERDUE"
                        : "VACANT"}
                </span>
                <span className="text-xs font-mono text-[--tx2]">{tenant.paidDate || tenant.dueDate || "—"}</span>
                <span className="text-xs font-mono text-[--tx] text-right">{fmt(tenant.rentAmount, currency)}</span>
                <span className="text-xs text-[--tx3]">→</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cash Flow Forecast */}
      <div className="text-xs font-mono uppercase tracking-widest text-[--tx3] mb-3 mt-6">Cash Flow Forecast</div>
      <div className="bg-[--s1] border border-[--bdr] rounded-lg mb-6 overflow-hidden">
        <div className="border-b border-[--bdr] px-4 py-3 flex justify-between items-center">
          <h4 className="font-sans font-600 text-sm text-[--tx]">Monthly Projected Cash Flow</h4>
          <span className="text-xs font-medium text-[--acc] cursor-pointer">Adjust assumptions →</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[--bdr]">
                <th className="px-2 py-2 text-left font-mono text-[--tx3] uppercase text-xs">Month</th>
                <th className="px-2 py-2 text-right font-mono text-[--tx3] uppercase text-xs">Revenue</th>
                <th className="px-2 py-2 text-right font-mono text-[--tx3] uppercase text-xs">OpEx</th>
                <th className="px-2 py-2 text-right font-mono text-[--tx3] uppercase text-xs">NOI</th>
                <th className="px-2 py-2 text-right font-mono text-[--tx3] uppercase text-xs">Debt</th>
                <th className="px-2 py-2 text-right font-mono text-[--tx3] uppercase text-xs">Capex</th>
                <th className="px-2 py-2 text-right font-mono text-[--tx3] uppercase text-xs">Net Cash</th>
              </tr>
            </thead>
            <tbody>
              {cashFlowForecast.map((row, i) => (
                <tr key={i} className="border-b border-[--bdr-lt]">
                  <td className="px-2 py-2 text-[--tx]">{row.month}</td>
                  <td className="px-2 py-2 text-right text-[--grn]">{fmt(row.revenue, currency)}</td>
                  <td className="px-2 py-2 text-right text-[--red]">{fmt(row.opex, currency)}</td>
                  <td className="px-2 py-2 text-right text-[--tx]">{fmt(row.noi, currency)}</td>
                  <td className="px-2 py-2 text-right text-[--tx3]">{fmt(row.debt, currency)}</td>
                  <td className="px-2 py-2 text-right text-[--tx3]">{row.capex > 0 ? fmt(row.capex, currency) : "—"}</td>
                  <td className={`px-2 py-2 text-right font-medium ${row.netCash >= 0 ? "text-[--grn]" : "text-[--red]"}`}>
                    {fmt(row.netCash, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capex Plan */}
      <div className="text-xs font-mono uppercase tracking-widest text-[--tx3] mb-3 mt-6">Capex Plan</div>
      <div className="bg-[--s1] border border-[--bdr] rounded-lg mb-6 overflow-hidden">
        <div className="border-b border-[--bdr] px-4 py-3 flex justify-between items-center">
          <h4 className="font-sans font-600 text-sm text-[--tx]">Scheduled Capital Works</h4>
          <span className="text-xs font-medium text-[--acc] cursor-pointer">Create work order →</span>
        </div>
        {capexPlan.map((work) => (
          <div
            key={work.id}
            className="px-4 py-3 border-b border-[--bdr-lt] last:border-b-0 hover:bg-[--s2] grid gap-3"
            style={{ gridTemplateColumns: "1fr auto auto auto auto" }}
          >
            <div>
              <div className="text-xs font-medium text-[--tx]">{work.description}</div>
              <div className="text-xs text-[--tx3]">Quoted {fmt(work.estimatedCost, currency)}</div>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded border bg-[--amb-lt] border-[--amb-bdr] text-[--amb]">
              {work.scheduledDate}
            </span>
            <span className="text-xs font-mono text-[--tx]">{fmt(work.estimatedCost, currency)}</span>
            <span className="text-xs font-medium text-[--grn]">+{fmt(work.valueImpact, currency)} value</span>
            <span className="text-xs text-[--tx3]">→</span>
          </div>
        ))}
      </div>

      {/* Debt & Financing */}
      {(debt || refiOpportunity) && (
        <>
          <div className="text-xs font-mono uppercase tracking-widest text-[--tx3] mb-3 mt-6">Debt & Financing</div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            {debt && (
              <div className="bg-[--s1] border border-[--bdr] rounded-lg overflow-hidden">
                <div className="border-b border-[--bdr] px-4 py-3">
                  <h4 className="font-sans font-600 text-sm text-[--tx]">Current Debt</h4>
                </div>
                <div className="divide-y divide-[--bdr-lt]">
                  <div className="px-4 py-2 flex justify-between text-xs">
                    <span className="text-[--tx]">Lender</span>
                    <span className="font-mono text-[--tx]">{debt.lender}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs">
                    <span className="text-[--tx]">Outstanding</span>
                    <span className="font-mono text-[--tx]">{fmt(debt.outstanding, currency)}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs">
                    <span className="text-[--tx]">Rate</span>
                    <span className="font-mono text-[--tx]">{debt.rate}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs">
                    <span className="text-[--tx]">Maturity</span>
                    <span className="font-mono text-[--tx]">{debt.maturity}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs">
                    <span className="text-[--tx]">LTV</span>
                    <span className="font-mono text-[--amb]">{debt.ltv}%</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs">
                    <span className="text-[--tx]">DSCR</span>
                    <span className="font-mono text-[--grn]">{debt.dscr}×</span>
                  </div>
                </div>
              </div>
            )}

            {refiOpportunity && (
              <div className="bg-[--s1] border border-[--bdr] rounded-lg overflow-hidden">
                <div className="border-b border-[--bdr] px-4 py-3">
                  <h4 className="font-sans font-600 text-sm text-[--tx]">Refinance Opportunity</h4>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[--s2] rounded p-3 text-center">
                      <div className="text-xs font-mono text-[--tx3] uppercase mb-1">Current Rate</div>
                      <div className="font-serif text-lg text-[--tx]">{(refiOpportunity.currentRate / 100).toFixed(2)}%</div>
                    </div>
                    <div className="bg-[--s2] rounded p-3 text-center">
                      <div className="text-xs font-mono text-[--tx3] uppercase mb-1">Market Rate</div>
                      <div className="font-serif text-lg text-[--grn]">{(refiOpportunity.marketRate / 100).toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="p-3 bg-[--grn-lt] border border-[--grn-bdr] rounded-lg">
                    <div className="text-xs font-medium text-[--grn]">
                      <strong>Net benefit:</strong> {fmt(refiOpportunity.annualSaving, currency)}/yr − {fmt(refiOpportunity.breakCost, currency)} break cost
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
