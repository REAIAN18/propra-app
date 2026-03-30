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
}

export function FinancialsTab({ data, loading }: { data: FinancialsData | null; loading: boolean }) {
  if (loading) return <div className="p-6 text-[--tx3]">Loading financials...</div>;
  if (!data) return <div className="p-6 text-[--tx3]">No financial data available</div>;

  const { kpis } = data;

  return (
    <div className="p-6">
      {/* KPIs */}
      <FinancialsKPIs
        kpis={[
          { label: "Gross Revenue", value: `$${(kpis.grossRevenue / 1000).toFixed(0)}k`, unit: "yr", status: "neutral" },
          {
            label: "OpEx",
            value: `$${(kpis.opex / 1000).toFixed(0)}k`,
            unit: "yr",
            note: "↑ 8% over budget",
            status: "neg",
          },
          { label: "NOI", value: `$${(kpis.noi / 1000).toFixed(0)}k`, unit: "yr", status: "pos" },
          { label: "Collection Rate", value: `${kpis.collectionRate}%`, status: "neutral" },
          { label: "LTV", value: `${kpis.ltv}%`, status: "neutral" },
          { label: "DSCR", value: `${kpis.dscr}×`, status: "pos" },
        ]}
      />

      {/* Placeholder sections */}
      <div className="bg-[--s1] border border-[--bdr] rounded-[--r] p-6 mb-6">
        <h3 className="font-sans font-600 text-sm text-[--tx] mb-4">NOI Bridge — Trailing 12 Months</h3>
        <p className="text-sm text-[--tx3]">Chart visualization coming soon</p>
      </div>

      <div className="bg-[--s1] border border-[--bdr] rounded-[--r] p-6 mb-6">
        <h3 className="font-sans font-600 text-sm text-[--tx] mb-4">Budget vs Actual — 2026</h3>
        <p className="text-sm text-[--tx3]">Variance analysis coming soon</p>
      </div>

      <div className="bg-[--s1] border border-[--bdr] rounded-[--r] p-6 mb-6">
        <h3 className="font-sans font-600 text-sm text-[--tx] mb-4">Rent Collection</h3>
        <p className="text-sm text-[--tx3]">Collection tracking coming soon</p>
      </div>

      <div className="bg-[--s1] border border-[--bdr] rounded-[--r] p-6 mb-6">
        <h3 className="font-sans font-600 text-sm text-[--tx] mb-4">12-Month Cash Flow Forecast</h3>
        <p className="text-sm text-[--tx3]">Forecast table coming soon</p>
      </div>

      <div className="bg-[--s1] border border-[--bdr] rounded-[--r] p-6 mb-6">
        <h3 className="font-sans font-600 text-sm text-[--tx] mb-4">Capex Plan</h3>
        <p className="text-sm text-[--tx3]">Capital works list coming soon</p>
      </div>
    </div>
  );
}
