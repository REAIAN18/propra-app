"use client";

import { useState } from "react";
import Link from "next/link";

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString()}`;
}

export function PortfolioCalculator() {
  const [assets, setAssets] = useState(8);

  // Benchmark estimates based on GTM data
  const insurance = Math.round(assets * 1_500);                         // ~$18k / 12 assets
  const energy = Math.round(assets * 4_333);                            // ~$52k / 12 assets
  const income = Math.round(80_000 + Math.min(assets, 20) * 2_200);    // base $80k, scales to ~$124k at 20 assets
  const total = insurance + energy + income;
  const arcaFee = Math.round(insurance * 0.15 + energy * 0.10 + income * 0.10);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
    >
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #1a2d45" }}>
        <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#5a7a96", letterSpacing: "0.1em" }}>
          Quick estimate
        </div>
        <div className="text-base font-semibold" style={{ color: "#e8eef5" }}>
          How much is your portfolio leaving behind?
        </div>
      </div>

      <div className="px-6 py-5" style={{ borderBottom: "1px solid #1a2d45" }}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium" style={{ color: "#8ba0b8" }}>
            Number of assets
          </label>
          <span
            className="text-xl font-bold"
            style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}
          >
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
          <span>1</span>
          <span>30</span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3" style={{ borderBottom: "1px solid #1a2d45" }}>
        {[
          { label: "Insurance overpay (est.)", value: insurance, color: "#F5A94A", fee: "15% of saving" },
          { label: "Energy overpay (est.)", value: energy, color: "#1647E8", fee: "10% of yr 1 saving" },
          { label: "Additional income (est.)", value: income, color: "#0A8A4C", fee: "10% of first year" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
              <span className="text-sm" style={{ color: "#8ba0b8" }}>{row.label}</span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold" style={{ color: row.color }}>{fmt(row.value)}/yr</div>
              <div className="text-xs" style={{ color: "#3d5a72" }}>{row.fee}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4" style={{ backgroundColor: "#0d1825", borderBottom: "1px solid #1a2d45" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "#5a7a96" }}>Estimated annual opportunity</div>
            <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>Arca success fee on delivery: {fmt(arcaFee)}/yr</div>
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}
          >
            {fmt(total)}/yr
          </div>
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/signup"
          className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          Get started free →
        </Link>
        <p className="text-xs text-center" style={{ color: "#3d5a72" }}>
          Commission-only. You pay nothing until Arca delivers.
        </p>
      </div>
    </div>
  );
}
