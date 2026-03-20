"use client";

import { useState } from "react";
import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString()}`;
}

interface Row {
  label: string;
  saving: number;
  feeRate: number;
  accent: string;
  note: string;
}

export function PricingCalculator() {
  const [assets, setAssets] = useState(8);

  const insurance = Math.round(assets * 1_500);
  const energy = Math.round(assets * 4_333);
  const income = Math.round(80_000 + Math.min(assets, 20) * 2_200);

  const rows: Row[] = [
    { label: "Insurance saving", saving: insurance, feeRate: 0.15, accent: "#F5A94A", note: "15% of saving · one-time" },
    { label: "Energy saving", saving: energy, feeRate: 0.10, accent: "#1647E8", note: "10% of year-1 saving" },
    { label: "New income (yr 1)", saving: income, feeRate: 0.10, accent: "#0A8A4C", note: "10% of year-1 income" },
  ];

  const totalOpportunity = insurance + energy + income;
  const totalFee = Math.round(insurance * 0.15 + energy * 0.10 + income * 0.10);
  const totalNet = totalOpportunity - totalFee;
  const feePercent = Math.round((totalFee / totalOpportunity) * 100);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
    >
      {/* Header */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #1a2d45" }}>
        <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#5a7a96", letterSpacing: "0.1em" }}>
          Net gain calculator
        </div>
        <div className="text-base font-semibold" style={{ color: "#e8eef5" }}>
          What RealHQ costs vs what you keep
        </div>
      </div>

      {/* Slider */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #1a2d45" }}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm" style={{ color: "#8ba0b8" }}>
            Assets in your portfolio
          </label>
          <span className="text-xl font-bold" style={{ color: "#e8eef5", fontFamily: SERIF }}>
            {assets}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          value={assets}
          onChange={(e) => setAssets(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0A8A4C ${((assets - 1) / 29) * 100}%, #1a2d45 ${((assets - 1) / 29) * 100}%)`,
            accentColor: "#0A8A4C",
          }}
        />
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: "#3d5a72" }}>
          <span>1</span><span>30</span>
        </div>
      </div>

      {/* Row breakdown */}
      <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
        {rows.map((row) => {
          const fee = Math.round(row.saving * row.feeRate);
          const net = row.saving - fee;
          return (
            <div key={row.label} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: row.accent }} />
                  <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{row.label}</span>
                </div>
                <span className="text-xs" style={{ color: "#5a7a96" }}>{row.note}</span>
              </div>
              {/* Bar */}
              <div className="flex gap-1 h-6 rounded-lg overflow-hidden mb-2">
                <div
                  className="flex items-center justify-center text-xs font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: `${row.accent}22`,
                    border: `1px solid ${row.accent}44`,
                    width: `${row.feeRate * 100}%`,
                    color: row.accent,
                    minWidth: "40px",
                  }}
                >
                  {fmt(fee)}
                </div>
                <div
                  className="flex-1 flex items-center justify-center text-xs font-semibold transition-all duration-300"
                  style={{ backgroundColor: "#0d1825", color: "#8ba0b8" }}
                >
                  {fmt(net)} yours
                </div>
              </div>
              <div className="flex justify-between text-xs" style={{ color: "#3d5a72" }}>
                <span>RealHQ: {fmt(fee)} ({Math.round(row.feeRate * 100)}%)</span>
                <span>You keep: {fmt(net)}/yr</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div
        className="px-6 py-5"
        style={{ backgroundColor: "#0d1825", borderTop: "1px solid #1a2d45" }}
      >
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Total opportunity", value: fmt(totalOpportunity), color: "#F5A94A" },
            { label: "RealHQ earns", value: fmt(totalFee), sub: `(${feePercent}%)`, color: "#5a7a96" },
            { label: "You keep", value: fmt(totalNet), sub: "/yr", color: "#0A8A4C" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-bold" style={{ color: s.color, fontFamily: SERIF }}>
                {s.value}
                {s.sub && <span className="text-sm font-normal ml-0.5" style={{ color: "#5a7a96" }}>{s.sub}</span>}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl px-4 py-3 text-xs mb-4 text-center"
          style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C33" }}
        >
          <span style={{ color: "#8ba0b8" }}>
            RealHQ earns <strong style={{ color: "#0A8A4C" }}>{feePercent}% of what it finds</strong> — and only after you&apos;ve confirmed the saving.
            {" "}You pay nothing until money is in your account.
          </span>
        </div>

        <Link
          href={`/signup?assets=${assets}`}
          className="w-full flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.01] active:scale-[0.98]"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          Get started free — see your actual numbers →
        </Link>
      </div>
    </div>
  );
}
