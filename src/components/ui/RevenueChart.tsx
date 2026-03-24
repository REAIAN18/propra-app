"use client";

import { useState, useEffect } from "react";

interface MonthData {
  month: number;
  year: number;
  label: string;
  grossRevenue: number;
  noi: number;
  operatingCosts: number;
  hasRealData: boolean;
}

interface ChartData {
  months: MonthData[];
  hasMinData: boolean;
  dataQuality: "estimated" | "mixed" | "actual";
}

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

export function RevenueChart({ sym }: { sym: string }) {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/api/user/monthly-financial?months=12")
      .then((r) => r.json())
      .then((d: ChartData) => setData(d))
      .catch(() => setData({ months: [], hasMinData: false, dataQuality: "estimated" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-xl flex items-center justify-center"
        style={{ height: 160, backgroundColor: "#F9FAFB", border: "0.5px solid #E5E7EB" }}
      >
        <span className="text-xs" style={{ color: "#9CA3AF" }}>Loading…</span>
      </div>
    );
  }

  if (!data?.hasMinData) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex flex-col justify-between"
        style={{ border: "0.5px solid #E5E7EB", backgroundColor: "#fff" }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>
          Revenue vs NOI
        </div>
        {/* Placeholder chart outline */}
        <div className="flex-1 flex items-end gap-1" style={{ height: 80 }}>
          {[40, 55, 50, 65, 60, 70, 55, 75, 65, 72, 80, 68].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${h}%`, backgroundColor: "#F3F4F6" }}
            />
          ))}
        </div>
        <div className="mt-2 text-[10px]" style={{ color: "#9CA3AF" }}>
          Add 3 months of rent data to unlock the Revenue vs NOI chart
        </div>
      </div>
    );
  }

  const months = data.months.slice(-12);
  const maxRevenue = Math.max(...months.map((m) => m.grossRevenue), 1);
  const maxNOI     = Math.max(...months.map((m) => m.noi), 1);
  const maxVal     = Math.max(maxRevenue, maxNOI);

  const BAR_H = 90; // px height of bar area
  const CHART_W = 100; // percent width divided by months
  const dotRadius = 3;

  const noiPoints = months.map((m, i) => {
    const x = ((i + 0.5) / months.length) * 100;
    const y = BAR_H - (m.noi / maxVal) * BAR_H;
    return { x, y, m };
  });

  const polyline = noiPoints.map((p) => `${p.x}%,${p.y}px`).join(" ");
  void polyline; // used below via inline style

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ border: "0.5px solid #E5E7EB", backgroundColor: "#fff", position: "relative" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
          Revenue vs NOI
        </div>
        <div className="flex items-center gap-3">
          {data.dataQuality === "estimated" && (
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FFFBEB", color: "#D97706" }}>
              Estimated
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px]" style={{ color: "#9CA3AF" }}>
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#E5E7EB" }} /> Revenue
            </span>
            <span className="flex items-center gap-1 text-[9px]" style={{ color: "#9CA3AF" }}>
              <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: "#0A8A4C" }} /> NOI
            </span>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ position: "relative", height: BAR_H }}>
        {/* Bars (Revenue) */}
        <div className="absolute inset-0 flex items-end gap-0.5 px-0">
          {months.map((m, i) => {
            const barH = Math.round((m.grossRevenue / maxVal) * BAR_H);
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm cursor-pointer transition-opacity hover:opacity-80"
                style={{ height: barH, backgroundColor: "#E5E7EB" }}
                onMouseEnter={(e) => setTooltip({ idx: i, x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().top })}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </div>

        {/* NOI line via SVG overlay */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          style={{ width: "100%", height: BAR_H }}
          preserveAspectRatio="none"
          viewBox={`0 0 ${months.length * 10} ${BAR_H}`}
        >
          <polyline
            points={noiPoints.map((p, i) => `${(i + 0.5) * 10},${BAR_H - (p.m.noi / maxVal) * BAR_H}`).join(" ")}
            fill="none"
            stroke="#0A8A4C"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {noiPoints.map((p, i) => (
            <circle
              key={i}
              cx={(i + 0.5) * 10}
              cy={BAR_H - (p.m.noi / maxVal) * BAR_H}
              r={dotRadius * 0.6}
              fill="#0A8A4C"
            />
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip !== null && months[tooltip.idx] && (
          <div
            className="absolute z-10 px-2.5 py-1.5 rounded-lg shadow-md text-[10px] pointer-events-none"
            style={{
              left: `${((tooltip.idx + 0.5) / months.length) * 100}%`,
              top: 0,
              transform: "translateX(-50%)",
              backgroundColor: "#111827",
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            <div className="font-semibold">{months[tooltip.idx].label}</div>
            <div>Revenue: {fmt(months[tooltip.idx].grossRevenue, sym)}</div>
            <div>NOI: {fmt(months[tooltip.idx].noi, sym)}</div>
            <div>Margin: {Math.round((months[tooltip.idx].noi / months[tooltip.idx].grossRevenue) * 100)}%</div>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex mt-1">
        {months.map((m, i) => (
          <div key={i} className="flex-1 text-center text-[8px]" style={{ color: "#D1D5DB" }}>
            {i % 3 === 0 ? m.label.split(" ")[0] : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
