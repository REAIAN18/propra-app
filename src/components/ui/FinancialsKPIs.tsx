"use client";

interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  note?: string;
  status?: "pos" | "neg" | "neutral";
}

export function FinancialsKPIs({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="grid grid-cols-6 gap-1 border border-[--bdr] rounded-[--r] overflow-hidden mb-6">
      {kpis.map((kpi, i) => (
        <div key={i} className="bg-[--s1] border-r border-[--bdr] last:border-r-0 p-4">
          <div className="text-xs font-mono text-[--tx3] uppercase tracking-wider mb-2">{kpi.label}</div>
          <div className="font-serif text-xl text-[--tx] leading-tight">
            {kpi.value}
            {kpi.unit && <span className="text-xs text-[--tx3]">/{kpi.unit}</span>}
          </div>
          {kpi.note && (
            <div
              className={`text-xs mt-1 ${
                kpi.status === "pos" ? "text-[--grn]" : kpi.status === "neg" ? "text-[--red]" : "text-[--tx3]"
              }`}
            >
              {kpi.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
