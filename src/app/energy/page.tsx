"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { DirectCallout } from "@/components/ui/DirectCallout";
import Link from "next/link";

const DARK_GREEN = "#173404";

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

      <main className="flex-1 p-4 lg:p-6 space-y-3">
        <DirectCallout
          title="Florida utilities are regulated — you can't switch supplier"
          body="FPL, Duke Energy FL, and Tampa Electric are monopolies. But you can cut 15–30% through tariff restructuring, solar PPA, demand reduction, LED/HVAC retrofit, and utility rebates. Upload your bills and RealHQ finds every saving."
        />

        {/* Hero */}
        <div
          className="rounded-xl px-6 py-5"
          style={{ background: DARK_GREEN }}
        >
          <p
            className="text-[10px] uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {portfolio.name} · Energy Optimisation
          </p>
          <h2
            className="text-xl font-medium mb-2"
            style={{ color: "#fff" }}
          >
            Your portfolio spends an estimated {fmt(estimatedLow)}–{fmt(estimatedHigh)}/yr on energy.
          </h2>
          <p
            className="text-[13px] mb-4 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Florida utilities are regulated — you can&apos;t switch supplier. But you can cut 15–30% through tariff restructuring, solar PPA, and demand reduction. Upload your bills and RealHQ finds every saving.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            <div
              className="rounded-lg px-3.5 py-3"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Est. annual spend
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "#fff" }}
              >
                {fmt(estimatedLow)}–{fmt(estimatedHigh)}
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {totalSqft.toLocaleString()} sqft · FL commercial avg
              </div>
            </div>

            <div
              className="rounded-lg px-3.5 py-3"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
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
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                tariff + demand + solar
              </div>
            </div>

            <div
              className="rounded-lg px-3.5 py-3"
              style={{ background: "rgba(10,138,76,0.2)", border: "0.5px solid rgba(10,138,76,0.3)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(74,222,128,0.6)" }}
              >
                After upload
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "#4ade80" }}
              >
                Exact saving
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                RealHQ analyses your bills
              </div>
            </div>
          </div>
        </div>

        {/* 5 Ways Card */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#fff", border: "0.5px solid #e5e7eb" }}
        >
          <div
            className="px-5 py-3"
            style={{ borderBottom: "0.5px solid #f3f4f6" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "#111827" }}>
              5 ways RealHQ reduces your energy costs in Florida
            </p>
          </div>

          {FL_WAYS.map((way, idx) => (
            <div
              key={way.num}
              className="flex items-start gap-3.5 px-5 py-3"
              style={{
                borderBottom: idx < FL_WAYS.length - 1 ? "0.5px solid #f9fafb" : "none",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "#E8F5EE" }}
              >
                <span className="text-[13px] font-semibold" style={{ color: "#0A8A4C" }}>
                  {way.num}
                </span>
              </div>

              <div className="flex-1">
                <div className="text-[13px] font-medium mb-1" style={{ color: "#111827" }}>
                  {way.title}
                </div>
                <div
                  className="text-xs leading-relaxed mb-2.5"
                  style={{ color: "#6b7280" }}
                >
                  {way.desc}
                </div>

                {way.whatWeDoItems && (
                  <div
                    className="rounded-lg px-3 py-2.5 mb-2.5"
                    style={{ background: "#f9fafb" }}
                  >
                    <div className="text-[11px] font-medium mb-1.5" style={{ color: "#111827" }}>
                      What RealHQ does
                    </div>
                    {way.whatWeDoItems.map((item, i) => (
                      <div key={i} className="flex gap-1.5 items-start mb-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                          style={{ background: "#0A8A4C" }}
                        />
                        <div className="text-[11px] leading-snug" style={{ color: "#374151" }}>
                          {item}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link href="/requests">
                    <button
                      className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                      style={{ background: "#0A8A4C", color: "#fff" }}
                    >
                      {way.ctaLabel}
                    </button>
                  </Link>
                  <span className="text-[11px] italic" style={{ color: "#9ca3af" }}>
                    {way.ctaHint}
                  </span>
                </div>
              </div>

              <div className="text-[13px] font-medium shrink-0" style={{ color: "#0A8A4C" }}>
                {way.saving}
              </div>
            </div>
          ))}
        </div>

        {/* Upload Section */}
        <div
          className="rounded-xl px-6 py-5"
          style={{ background: DARK_GREEN }}
        >
          <h3 className="text-[15px] font-medium mb-1.5" style={{ color: "#fff" }}>
            Upload your energy bills.
          </h3>
          <p
            className="text-[13px] mb-3.5 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            RealHQ reads your tariff, consumption, and demand profile and finds every saving. The more bills you upload, the sharper the analysis.
          </p>

          <div
            className="border-2 border-dashed rounded-lg px-5 py-5 text-center mb-3 cursor-pointer transition-all hover:border-opacity-30"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            <h4 className="text-sm font-medium mb-0.5" style={{ color: "#fff" }}>
              Drop energy bills here — or click to browse
            </h4>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              PDF · FPL · Duke · Tampa Electric · any format
            </p>
          </div>

          <Link href="/requests">
            <button
              className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "#0A8A4C", color: "#fff" }}
            >
              Upload and find savings →
            </button>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
