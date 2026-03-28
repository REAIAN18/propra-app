"use client";

import { useEffect, useState } from "react";

interface FunnelData {
  signups: number;
  withProperty: number;
  withCommission: number;
  conversionRates: {
    signupToProperty: number;
    leadToCommission: number;
  };
  last30Days: {
    signups: number;
    withProperty: number;
    withCommission: number;
    conversionRates: {
      signupToProperty: number;
      leadToCommission: number;
    };
  };
}

interface DayData {
  day: string;
  count: number;
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function CSSBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function FunnelCard() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [show30, setShow30] = useState(false);

  useEffect(() => {
    fetch("/api/admin/funnel")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
        <p className="text-xs" style={{ color: "#5a7a96" }}>Loading funnel…</p>
      </div>
    );
  }

  const d = show30 ? data.last30Days : data;
  const maxVal = Math.max(d.signups, d.withProperty, d.withCommission, 1);

  const stages = [
    { label: "Leads (signups + audits)", value: d.signups, color: "#7c6af0", rate: null },
    { label: "Users with property", value: d.withProperty, color: "#F5A94A", rate: pct(d.conversionRates.signupToProperty) },
    { label: "Users with commission", value: d.withCommission, color: "#8b5cf6", rate: pct(d.conversionRates.leadToCommission) },
  ];

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Conversion funnel</h2>
        <button
          onClick={() => setShow30((v) => !v)}
          className="text-xs px-2 py-0.5 rounded-full transition-colors"
          style={{
            backgroundColor: show30 ? "#7c6af022" : "#1a2d45",
            color: show30 ? "#7c6af0" : "#5a7a96",
            border: "1px solid",
            borderColor: show30 ? "#7c6af0" : "#1a2d45",
          }}
        >
          {show30 ? "Last 30 days" : "All time"}
        </button>
      </div>

      <div className="space-y-4">
        {stages.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-xs tabular-nums" style={{ color: "#5a7a96" }}>
                    {s.rate} →
                  </span>
                )}
                <span className="text-xs" style={{ color: "#8ba0b8" }}>{s.label}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
            <CSSBar value={s.value} max={maxVal} color={s.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignupsChart() {
  const [days, setDays] = useState<DayData[]>([]);

  useEffect(() => {
    fetch("/api/admin/signups-by-day?days=30")
      .then((r) => r.json())
      .then((d: { data: DayData[] }) => setDays(d.data))
      .catch(() => {});
  }, []);

  if (days.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
        <p className="text-xs" style={{ color: "#5a7a96" }}>Loading signups chart…</p>
      </div>
    );
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Daily signups</h2>
        <span className="text-xs" style={{ color: "#5a7a96" }}>
          {total} in last 30 days
        </span>
      </div>

      {/* Sparkline: CSS bar chart */}
      <div className="flex items-end gap-0.5" style={{ height: 48 }}>
        {days.map((d) => {
          const heightPct = Math.round((d.count / maxCount) * 100);
          const isToday = d.day === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={d.day}
              className="flex-1 rounded-sm transition-all"
              title={`${d.day}: ${d.count}`}
              style={{
                height: `${Math.max(heightPct, d.count > 0 ? 8 : 2)}%`,
                backgroundColor: isToday ? "#7c6af0" : d.count > 0 ? "#7c6af066" : "#1a2d45",
                minHeight: 2,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: "#3d5a72" }}>
          {days[0]?.day}
        </span>
        <span className="text-xs" style={{ color: "#3d5a72" }}>
          {days[days.length - 1]?.day}
        </span>
      </div>
    </div>
  );
}
