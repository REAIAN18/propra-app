"use client";

import { useState } from "react";
import Link from "next/link";

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString()}`;
}

export function PortfolioCalculator({ onTotalChange }: { onTotalChange?: (total: number) => void }) {
  const [assets, setAssets] = useState(8);

  // Benchmark estimates based on GTM data
  const insurance = Math.round(assets * 1_500);                         // ~$18k / 12 assets
  const energy = Math.round(assets * 4_333);                            // ~$52k / 12 assets
  const income = Math.round(80_000 + Math.min(assets, 20) * 2_200);    // base $80k, scales to ~$124k at 20 assets
  const total = insurance + energy + income;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
    >
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
          Quick estimate
        </div>
        <div className="text-base font-semibold" style={{ color: "#111827" }}>
          How much is your portfolio leaving behind?
        </div>
      </div>

      {/* ── Estimate — shown ABOVE the slider ──────────────── */}
      <div className="px-6 py-6 text-center" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
        <div className="text-xs mb-2" style={{ color: "#9CA3AF" }}>We estimate</div>
        <div
          className="text-4xl font-bold leading-none mb-2"
          style={{ color: "#F5A94A", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
        >
          {fmt(total)}/yr
        </div>
        <div className="text-sm" style={{ color: "#6B7280" }}>in recoverable value across your portfolio</div>
      </div>

      {/* ── Slider ─────────────────────────────────────────── */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium" style={{ color: "#6B7280" }}>
            Number of assets
          </label>
          <span
            className="text-xl font-bold"
            style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
          >
            {assets}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          value={assets}
          onChange={(e) => {
            const n = Number(e.target.value);
            setAssets(n);
            const ins = Math.round(n * 1_500);
            const eng = Math.round(n * 4_333);
            const inc = Math.round(80_000 + Math.min(n, 20) * 2_200);
            onTotalChange?.(ins + eng + inc);
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0A8A4C ${((assets - 1) / 29) * 100}%, #E5E7EB ${((assets - 1) / 29) * 100}%)`,
            accentColor: "#0A8A4C",
          }}
        />
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: "#D1D5DB" }}>
          <span>1</span>
          <span>30</span>
        </div>
      </div>

      {/* ── Breakdown rows ─────────────────────────────────── */}
      <div className="px-6 py-5 space-y-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
        {[
          { label: "Insurance overpay (est.)", value: insurance, color: "#F5A94A" },
          { label: "Energy overpay (est.)", value: energy, color: "#1647E8" },
          { label: "Additional income (est.)", value: income, color: "#0A8A4C" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
              <span className="text-sm" style={{ color: "#6B7280" }}>{row.label}</span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold" style={{ color: row.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(row.value)}/yr</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href={`/properties/add?assets=${assets}`}
          className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          See your analysis →
        </Link>
        <p className="text-xs text-center" style={{ color: "#D1D5DB" }}>
          No account required ·{" "}
          <Link href={`/signup?assets=${assets}`} style={{ color: "#9CA3AF" }} className="underline underline-offset-2">
            sign up for your real portfolio
          </Link>
        </p>
      </div>
    </div>
  );
}
