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

      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-5xl space-y-4">
          {/* Hero */}
          <div
            className="rounded-xl px-6 py-5"
            style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
          <p
            className="text-[10px] uppercase tracking-wider mb-1.5"
            style={{ color: "var(--tx3)", fontFamily: "var(--mono)", letterSpacing: "0.08em" }}
          >
            {portfolio.name} · Energy Optimisation
          </p>
          <h2
            className="text-xl font-normal mb-2"
            style={{ color: "var(--tx)", fontFamily: "var(--serif)", letterSpacing: "-0.02em" }}
          >
            Reduce energy costs 15–30% without switching supplier
          </h2>
          <p
            className="text-sm mb-4 leading-relaxed font-light"
            style={{ color: "var(--tx3)" }}
          >
            Florida utilities are regulated — you can't switch. But you can cut costs through tariff restructuring, solar PPA, demand reduction, LED/HVAC retrofit, and utility rebates.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-lg px-4 py-3"
              style={{ background: "var(--s2)", border: "1px solid var(--bdr)" }}
            >
              <div
                className="text-[9px] uppercase tracking-wider mb-1"
                style={{ color: "var(--tx3)", fontFamily: "var(--mono)", letterSpacing: "0.08em" }}
              >
                Portfolio Size
              </div>
              <div
                className="text-lg font-normal"
                style={{ color: "var(--tx)", fontFamily: "var(--serif)" }}
              >
                {totalSqft.toLocaleString()} sqft
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--tx3)" }}
              >
                {portfolio.assets.length} properties
              </div>
            </div>

            <div
              className="rounded-lg px-4 py-3"
              style={{ background: "var(--s2)", border: "1px solid var(--bdr)" }}
            >
              <div
                className="text-[9px] uppercase tracking-wider mb-1"
                style={{ color: "var(--tx3)", fontFamily: "var(--mono)", letterSpacing: "0.08em" }}
              >
                Typical Saving
              </div>
              <div
                className="text-lg font-normal"
                style={{ color: "var(--amb)", fontFamily: "var(--serif)" }}
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
              className="rounded-lg px-4 py-3"
              style={{ background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }}
            >
              <div
                className="text-[9px] uppercase tracking-wider mb-1"
                style={{ color: "var(--grn)", fontFamily: "var(--mono)", letterSpacing: "0.08em" }}
              >
                Next Step
              </div>
              <div
                className="text-lg font-normal"
                style={{ color: "var(--grn)", fontFamily: "var(--serif)" }}
              >
                Upload Bills
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--tx3)" }}
              >
                Get exact savings analysis
              </div>
            </div>
          </div>
        </div>

          {/* 5 Ways Card */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div
              className="px-5 py-3.5"
              style={{ borderBottom: "1px solid var(--bdr)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                5 ways RealHQ reduces energy costs in Florida
              </h3>
            </div>

            {FL_WAYS.map((way, idx) => (
              <div
                key={way.num}
                className="flex items-start gap-3.5 px-5 py-3.5"
                style={{
                  borderBottom: idx < FL_WAYS.length - 1 ? "1px solid var(--bdr-lt)" : "none",
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)" }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: "var(--acc)" }}>
                    {way.num}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                    {way.title}
                  </div>
                  <div
                    className="text-xs leading-relaxed mb-2.5 font-light"
                    style={{ color: "var(--tx3)" }}
                  >
                    {way.desc}
                  </div>

                  {way.whatWeDoItems && (
                    <div
                      className="rounded-lg px-3 py-2.5 mb-2.5"
                      style={{ background: "var(--s2)", border: "1px solid var(--bdr)" }}
                    >
                      <div className="text-[11px] font-medium mb-1.5" style={{ color: "var(--tx2)" }}>
                        What RealHQ does
                      </div>
                      {way.whatWeDoItems.map((item, i) => (
                        <div key={i} className="flex gap-1.5 items-start mb-1">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                            style={{ background: "var(--acc)" }}
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
                        style={{ background: "var(--acc)", color: "#fff" }}
                      >
                        {way.ctaLabel}
                      </button>
                    </Link>
                    <span className="text-[11px] font-light" style={{ color: "var(--tx3)" }}>
                      {way.ctaHint}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-medium shrink-0" style={{ color: "var(--grn)", fontFamily: "var(--mono)" }}>
                  {way.saving}
                </div>
              </div>
            ))}
        </div>

          {/* Upload Section */}
          <div
            className="rounded-xl px-6 py-5"
            style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <h3 className="text-base font-normal mb-1.5" style={{ color: "var(--tx)", fontFamily: "var(--serif)" }}>
              Upload your energy bills
            </h3>
            <p
              className="text-sm mb-4 leading-relaxed font-light"
              style={{ color: "var(--tx3)" }}
            >
              RealHQ reads your tariff, consumption, and demand profile and finds every saving. The more bills you upload, the sharper the analysis.
            </p>

            <div
              className="border-2 border-dashed rounded-lg px-5 py-6 text-center mb-4 cursor-pointer transition-all"
              style={{ borderColor: "var(--bdr)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--acc)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--bdr)")}
            >
              <div className="text-2xl mb-2" style={{ opacity: 0.3 }}>📄</div>
              <h4 className="text-sm font-medium mb-0.5" style={{ color: "var(--tx2)" }}>
                Drop energy bills here — or click to browse
              </h4>
              <p className="text-xs" style={{ color: "var(--tx3)" }}>
                PDF · FPL · Duke · Tampa Electric · any format
              </p>
            </div>

            <Link href="/documents">
              <button
                className="w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "var(--acc)", color: "#fff" }}
              >
                Upload and find savings →
              </button>
            </Link>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
