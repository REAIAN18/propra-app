"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import Link from "next/link";

type Way = {
  num: number;
  title: string;
  desc: string;
  ctaLabel: string;
  ctaHint: string;
  saving: string;
  whatWeDoItems?: string[];
};

const FL_WAYS: Way[] = [
  {
    num: 1,
    title: "Tariff restructuring",
    desc: "FPL has 15+ commercial tariff schedules. Most owners are on the wrong one. Moving to a demand-based or time-of-use tariff saves 10–20% with the same supplier, no contract change needed.",
    ctaLabel: "Review tariff →",
    ctaHint: "RealHQ reviews all available FPL/Duke/TECO tariffs for your assets",
    saving: "10–20%",
  },
  {
    num: 2,
    title: "Solar PPA",
    desc: "Florida has exceptional solar irradiance. A Power Purchase Agreement means zero upfront cost, a fixed rate below your FPL tariff, and an immediate monthly saving from day one.",
    ctaLabel: "Model PPA →",
    ctaHint: "RealHQ models a PPA for each roof at current FL irradiance",
    saving: "$42k+/yr",
  },
  {
    num: 3,
    title: "Demand charge reduction",
    desc: "40–60% of Florida commercial bills are demand charges, not consumption. Identifying and reducing peak demand events through HVAC scheduling or battery storage cuts the bill significantly.",
    ctaLabel: "Analyse demand →",
    ctaHint: "Upload bills for RealHQ to identify peak demand events",
    saving: "Up to 25%",
  },
  {
    num: 4,
    title: "LED and HVAC retrofit",
    desc: "Lighting and HVAC account for 70%+ of commercial energy use. LED and controls upgrades reduce consumption 20–40% and qualify for FPL, Duke, and Tampa Electric rebates.",
    ctaLabel: "RealHQ commissions audit →",
    ctaHint: "Free · no commitment until you approve the works",
    saving: "20–40%",
    whatWeDoItems: [
      "Commissions a free energy audit from a certified assessor — no cost to you",
      "Identifies all applicable FPL, Duke or Tampa Electric rebates for your assets",
      "Presents you with a payback model — typical ROI under 3 years before rebates",
      "You approve. RealHQ manages the installation and rebate claim.",
    ],
  },
  {
    num: 5,
    title: "Utility rebate programmes",
    desc: "FPL, Duke Energy Florida, and Tampa Electric all run commercial efficiency rebate programmes worth $50k–$200k per site. Most commercial owners never claim them.",
    ctaLabel: "Check rebates →",
    ctaHint: "RealHQ identifies all rebates available for your assets",
    saving: "$50k+",
  },
];

export default function EnergyPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
  // FL commercial avg: ~$2.90/sqft/yr
  const estimatedLow = Math.round((totalSqft * 2.9) / 1000) * 1000;
  const estimatedHigh = Math.round((totalSqft * 4.1) / 1000) * 1000;

  function fmt(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Energy Optimisation — RealHQ";
    }
  }, []);

  return (
    <AppShell>
      <TopBar title="Energy Optimisation" />

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        {/* Market Banner */}
        <div
          className="rounded-xl px-6 py-4 flex items-start gap-3"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.22)",
          }}
        >
          <div className="text-lg shrink-0 mt-0.5">⚠</div>
          <div>
            <div className="text-xs font-medium mb-0.5" style={{ color: "#fbbf24" }}>
              Florida is a regulated energy market — you cannot switch supplier.
            </div>
            <div className="text-xs opacity-70" style={{ color: "#fbbf24" }}>
              FPL, Duke Energy, and Tampa Electric are the sole providers in their service areas. RealHQ focuses on optimisation: tariff restructuring, demand reduction, solar PPA, and utility rebates. Upload your bills for exact savings.
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div
          className="rounded-xl px-6 py-5"
          style={{
            background: "linear-gradient(135deg, rgba(124,106,240,0.08) 0%, rgba(251,191,36,0.06) 100%)",
            border: "1px solid var(--bdr)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: "var(--tx3)" }}
          >
            {portfolio.name} · Energy Optimisation
          </p>
          <h2
            className="text-xl font-medium mb-2"
            style={{ color: "var(--tx)" }}
          >
            Your portfolio spends an estimated {fmt(estimatedLow)}–{fmt(estimatedHigh)}/yr on energy.
          </h2>
          <p
            className="text-[13px] mb-4 leading-relaxed"
            style={{ color: "var(--tx3)" }}
          >
            Florida utilities are regulated — you can&apos;t switch supplier. But you can cut 15–30% through tariff restructuring, solar PPA, and demand reduction. Upload your bills and RealHQ finds every saving.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            <div
              className="rounded-lg px-3.5 py-3"
              style={{
                background: "var(--s2)",
                border: "1px solid var(--bdr)",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "var(--tx3)" }}
              >
                Est. annual spend
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "var(--tx)" }}
              >
                {fmt(estimatedLow)}–{fmt(estimatedHigh)}
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--tx3)" }}
              >
                {totalSqft.toLocaleString()} sqft · FL commercial avg
              </div>
            </div>

            <div
              className="rounded-lg px-3.5 py-3"
              style={{
                background: "var(--s2)",
                border: "1px solid var(--bdr)",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "var(--tx3)" }}
              >
                Typical saving
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "#fbbf24" }}
              >
                15–30%
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--tx3)" }}
              >
                tariff + demand + solar
              </div>
            </div>

            <div
              className="rounded-lg px-3.5 py-3"
              style={{
                background: "rgba(52,211,153,0.07)",
                border: "1px solid rgba(52,211,153,0.22)",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(52,211,153,0.6)" }}
              >
                After upload
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "#34d399" }}
              >
                Exact saving
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--tx3)" }}
              >
                RealHQ analyses your bills
              </div>
            </div>
          </div>
        </div>

        {/* 5 Ways Card */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
          }}
        >
          <div
            className="px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--bdr)" }}
          >
            <p className="text-[13px] font-semibold" style={{ color: "var(--tx)" }}>
              5 ways RealHQ reduces your energy costs in Florida
            </p>
          </div>

          {FL_WAYS.map((way, idx) => (
            <div
              key={way.num}
              className="flex items-start gap-3.5 px-5 py-4"
              style={{
                borderBottom: idx < FL_WAYS.length - 1 ? "1px solid rgba(37,37,51,0.4)" : "none",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "rgba(124,106,240,0.10)",
                  border: "1px solid rgba(124,106,240,0.22)",
                }}
              >
                <span className="text-[13px] font-semibold" style={{ color: "#7c6af0" }}>
                  {way.num}
                </span>
              </div>

              <div className="flex-1">
                <div className="text-[13px] font-medium mb-1" style={{ color: "var(--tx)" }}>
                  {way.title}
                </div>
                <div
                  className="text-xs leading-relaxed mb-2.5"
                  style={{ color: "var(--tx3)" }}
                >
                  {way.desc}
                </div>

                {way.whatWeDoItems && (
                  <div
                    className="rounded-lg px-3 py-2.5 mb-2.5"
                    style={{
                      background: "var(--s2)",
                      border: "1px solid var(--bdr)",
                    }}
                  >
                    <div className="text-[11px] font-medium mb-1.5" style={{ color: "var(--tx2)" }}>
                      What RealHQ does
                    </div>
                    {way.whatWeDoItems.map((item, i) => (
                      <div key={i} className="flex gap-1.5 items-start mb-1">
                        <div
                          className="w-1 h-1 rounded-full shrink-0 mt-1.5"
                          style={{ background: "#7c6af0" }}
                        />
                        <div className="text-[11px] leading-snug" style={{ color: "var(--tx3)" }}>
                          {item}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link href="/requests">
                    <button
                      className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: "#7c6af0", color: "#fff" }}
                    >
                      {way.ctaLabel}
                    </button>
                  </Link>
                  <span className="text-[11px] italic" style={{ color: "var(--tx3)" }}>
                    {way.ctaHint}
                  </span>
                </div>
              </div>

              <div className="text-[13px] font-medium shrink-0" style={{ color: "#34d399" }}>
                {way.saving}
              </div>
            </div>
          ))}
        </div>

        {/* Upload Section */}
        <div
          className="rounded-xl px-6 py-5"
          style={{
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
          }}
        >
          <h3 className="text-[15px] font-medium mb-1.5" style={{ color: "var(--tx)" }}>
            Upload your energy bills.
          </h3>
          <p
            className="text-[13px] mb-3.5 leading-relaxed"
            style={{ color: "var(--tx3)" }}
          >
            RealHQ reads your tariff, consumption, and demand profile and finds every saving. The more bills you upload, the sharper the analysis.
          </p>

          <div
            className="border-2 border-dashed rounded-lg px-5 py-5 text-center mb-3 cursor-pointer transition-all hover:border-opacity-70"
            style={{
              borderColor: "var(--bdr)",
              background: "var(--s2)",
            }}
          >
            <h4 className="text-sm font-medium mb-0.5" style={{ color: "var(--tx)" }}>
              Drop energy bills here — or click to browse
            </h4>
            <p className="text-[11px]" style={{ color: "var(--tx3)" }}>
              PDF · FPL · Duke · Tampa Electric · any format
            </p>
          </div>

          <Link href="/requests">
            <button
              className="w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "#7c6af0", color: "#fff" }}
            >
              Upload and find savings →
            </button>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
