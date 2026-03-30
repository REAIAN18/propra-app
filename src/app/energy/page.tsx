"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

interface EnergySummary {
  hasBills: boolean;
  totalAnnualSpend: number;
  avgUnitRate: number;
  benchmarkRate: number | null;
  benchmarkDate: string | null;
  bills: Array<{
    id: string;
    supplier: string;
    accountNumber: string | null;
    billingPeriod: string | null;
    totalCost: number;
    unitRate: number;
    consumption: number;
    filename: string;
  }>;
}

type MarketType = "regulated" | "deregulated";

export default function EnergyPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [energyData, setEnergyData] = useState<EnergySummary | null>(null);
  const [_loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"portfolio" | string>("portfolio");

  const sym = portfolio.currency === "USD" ? "$" : "£";
  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);

  // FL is regulated, TX/UK would be deregulated (simplified market detection)
  const marketType: MarketType = "regulated"; // TODO: Detect from portfolio.assets[0].state

  useEffect(() => {
    async function loadEnergy() {
      try {
        const res = await fetch("/api/user/energy-summary");
        if (res.ok) {
          const data = await res.json();
          setEnergyData(data);
        }
      } catch (error) {
        console.error("Failed to load energy data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadEnergy();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Energy Optimisation — RealHQ";
    }
  }, []);

  function fmt(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  const estimatedAnnualCost = totalSqft * 2.9; // $2.90/sqft FL commercial avg
  const costPerSqft = energyData?.hasBills && energyData.totalAnnualSpend > 0
    ? energyData.totalAnnualSpend / totalSqft
    : 2.9;

  // Estimated savings: 15% baseline for tariff optimization
  const potentialSavings = energyData?.hasBills
    ? energyData.totalAnnualSpend * 0.15
    : estimatedAnnualCost * 0.15;

  return (
    <AppShell>
      <TopBar title="Energy Optimisation" />

      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl mb-1"
              style={{
                fontFamily: "var(--serif, 'Instrument Serif', Georgia, serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              Energy Optimisation
            </h1>
            <p className="text-[13px]" style={{ color: "var(--tx3)" }}>
              Find savings across your portfolio — tariff restructuring, solar, demand reduction, and more.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
              style={{
                background: "transparent",
                color: "var(--tx2)",
                borderColor: "var(--bdr)",
              }}
            >
              Upload bills
            </button>
            <button
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: "var(--acc, #7c6af0)",
                color: "#fff",
              }}
            >
              Get assessment
            </button>
          </div>
        </div>

        {/* VIEW TOGGLE */}
        <div
          className="flex gap-0 w-fit rounded-lg overflow-hidden border"
          style={{
            background: "var(--s1)",
            borderColor: "var(--bdr)",
          }}
        >
          <button
            onClick={() => setActiveView("portfolio")}
            className="px-4 py-2 text-[11px] font-medium transition-all"
            style={{
              background: activeView === "portfolio" ? "var(--acc)" : "transparent",
              color: activeView === "portfolio" ? "#fff" : "var(--tx3)",
            }}
          >
            Portfolio
          </button>
          {portfolio.assets.slice(0, 3).map((asset) => (
            <button
              key={asset.id}
              onClick={() => setActiveView(asset.id)}
              className="px-4 py-2 text-[11px] font-medium transition-all"
              style={{
                background: activeView === asset.id ? "var(--acc)" : "transparent",
                color: activeView === asset.id ? "#fff" : "var(--tx3)",
              }}
            >
              {asset.name}
            </button>
          ))}
        </div>

        {/* MARKET BANNER */}
        <div
          className="flex items-start gap-3 px-6 py-4 rounded-xl text-[12px] leading-relaxed"
          style={{
            background: marketType === "regulated" ? "var(--amb-lt)" : "var(--grn-lt)",
            borderColor: marketType === "regulated" ? "var(--amb-bdr)" : "var(--grn-bdr)",
            border: "1px solid",
            color: marketType === "regulated" ? "var(--amb)" : "var(--grn)",
          }}
        >
          <div className="text-base mt-0.5">
            {marketType === "regulated" ? "⚠" : "⚡"}
          </div>
          <div>
            <strong className="block mb-0.5">
              {marketType === "regulated"
                ? "Florida Regulated Market"
                : "Deregulated Market — Switching Available"}
            </strong>
            <span style={{ opacity: 0.7 }}>
              {marketType === "regulated"
                ? "You cannot switch suppliers. Savings come from tariff restructuring, solar PPA, demand reduction, LED/HVAC retrofit, and utility rebates."
                : "You can switch suppliers. We'll compare all available plans and move you to the best rate."}
            </span>
          </div>
        </div>

        {/* KPI ROW */}
        <div
          className="grid grid-cols-5 gap-px rounded-xl overflow-hidden border"
          style={{
            background: "var(--bdr)",
            borderColor: "var(--bdr)",
          }}
        >
          {/* Annual Spend */}
          <div
            className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
            style={{ background: "var(--s1)" }}
          >
            <div
              className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
              style={{
                fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                color: "var(--tx3)",
                letterSpacing: "0.8px",
              }}
            >
              Annual Spend
            </div>
            <div
              className="text-xl leading-none"
              style={{
                fontFamily: "var(--serif, 'Instrument Serif', Georgia, serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              {fmt(energyData?.totalAnnualSpend ?? estimatedAnnualCost)}
              {!energyData?.hasBills && (
                <span
                  className="inline-flex ml-1 px-1.5 py-0.5 rounded text-[8px] font-medium uppercase tracking-wider align-middle"
                  style={{
                    fontFamily: "var(--mono)",
                    background: "var(--amb-lt)",
                    color: "var(--amb)",
                    border: "1px solid var(--amb-bdr)",
                    letterSpacing: "0.3px",
                  }}
                >
                  EST
                </span>
              )}
            </div>
            <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
              {energyData?.hasBills ? "From uploaded bills" : `${totalSqft.toLocaleString()} sqft × $2.90 avg`}
            </div>
          </div>

          {/* Identified Savings */}
          <div
            className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
            style={{ background: "var(--s1)" }}
          >
            <div
              className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
              style={{
                fontFamily: "var(--mono)",
                color: "var(--tx3)",
                letterSpacing: "0.8px",
              }}
            >
              Identified Savings
            </div>
            <div
              className="text-xl leading-none"
              style={{
                fontFamily: "var(--serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              {fmt(potentialSavings)}
            </div>
            <div className="text-[10px] mt-1 flex items-center gap-1">
              <span style={{ color: "var(--grn)", fontWeight: 500 }}>↓15%</span>
              <span style={{ color: "var(--tx3)" }}>tariff + demand</span>
            </div>
          </div>

          {/* Cost/sqft */}
          <div
            className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
            style={{ background: "var(--s1)" }}
          >
            <div
              className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
              style={{
                fontFamily: "var(--mono)",
                color: "var(--tx3)",
                letterSpacing: "0.8px",
              }}
            >
              Cost/sqft
            </div>
            <div
              className="text-xl leading-none"
              style={{
                fontFamily: "var(--serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              {sym}{costPerSqft.toFixed(2)}
            </div>
            <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
              FL avg {sym}2.90
            </div>
          </div>

          {/* Bills Uploaded */}
          <div
            className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
            style={{ background: "var(--s1)" }}
          >
            <div
              className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
              style={{
                fontFamily: "var(--mono)",
                color: "var(--tx3)",
                letterSpacing: "0.8px",
              }}
            >
              Bills Uploaded
            </div>
            <div
              className="text-xl leading-none"
              style={{
                fontFamily: "var(--serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              {energyData?.bills.length ?? 0}
              <span className="text-[10px] ml-1" style={{ color: "var(--tx3)", fontFamily: "var(--sans)" }}>
                of {portfolio.assets.length}
              </span>
            </div>
            <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
              {energyData?.bills.length === 0 && "Upload to unlock analysis"}
              {(energyData?.bills.length ?? 0) > 0 && "Good coverage"}
            </div>
          </div>

          {/* Solar Potential */}
          <div
            className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
            style={{ background: "var(--s1)" }}
          >
            <div
              className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
              style={{
                fontFamily: "var(--mono)",
                color: "var(--tx3)",
                letterSpacing: "0.8px",
              }}
            >
              Solar Potential
            </div>
            <div
              className="text-xl leading-none"
              style={{
                fontFamily: "var(--serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              {fmt(totalSqft * 0.8 * 15)}
              <span
                className="inline-flex ml-1 px-1.5 py-0.5 rounded text-[8px] font-medium uppercase tracking-wider align-middle"
                style={{
                  fontFamily: "var(--mono)",
                  background: "var(--amb-lt)",
                  color: "var(--amb)",
                  border: "1px solid var(--amb-bdr)",
                  letterSpacing: "0.3px",
                }}
              >
                EST
              </span>
            </div>
            <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
              80% roof coverage
            </div>
          </div>
        </div>

        {/* INSIGHT BANNER */}
        {energyData?.hasBills && energyData.bills.length > 0 && (
          <div
            className="grid grid-cols-[1fr,auto] gap-6 items-center px-6 py-5 rounded-xl"
            style={{
              background: "var(--s1)",
              border: "1px solid rgba(56,189,248,.22)",
            }}
          >
            <div>
              <div
                className="text-[9px] font-medium uppercase tracking-widest mb-2"
                style={{
                  fontFamily: "var(--mono)",
                  color: "#38bdf8",
                  letterSpacing: "2px",
                }}
              >
                Energy Insight
              </div>
              <h3
                className="text-lg font-normal mb-1"
                style={{
                  fontFamily: "var(--serif)",
                  color: "var(--tx)",
                }}
              >
                Better tariff available
              </h3>
              <p className="text-[12px] leading-relaxed max-w-md" style={{ color: "var(--tx3)" }}>
                Your current average rate is {energyData.avgUnitRate.toFixed(2)}¢/kWh.
                FPL offers a demand-based tariff that could save you{" "}
                {fmt(energyData.totalAnnualSpend * 0.12)} per year with the same consumption.
              </p>
            </div>
            <div className="text-right">
              <div
                className="text-3xl leading-none mb-1"
                style={{
                  fontFamily: "var(--serif)",
                  color: "var(--tx)",
                  letterSpacing: "-0.03em",
                }}
              >
                {fmt(energyData.totalAnnualSpend * 0.12)}
              </div>
              <div className="text-[11px] mb-3.5" style={{ color: "var(--tx3)" }}>
                per year
              </div>
              <button
                className="px-4 py-2 rounded-lg text-[11px] font-semibold"
                style={{
                  background: "#38bdf8",
                  color: "#111",
                }}
              >
                Review tariff switch
              </button>
            </div>
          </div>
        )}

        {/* 5 WAYS TO REDUCE ENERGY COSTS */}
        <div>
          <div
            className="text-[9px] font-medium uppercase tracking-widest mb-3"
            style={{
              fontFamily: "var(--mono)",
              color: "var(--tx3)",
              letterSpacing: "2px",
            }}
          >
            5 Ways to Reduce Energy Costs
          </div>

          <div
            className="rounded-xl overflow-hidden border"
            style={{
              background: "var(--s1)",
              borderColor: "var(--bdr)",
            }}
          >
            {[
              {
                num: 1,
                title: "Tariff restructuring",
                desc: "FPL has 15+ commercial tariff schedules. Most owners are on the wrong one. Moving to a demand-based or time-of-use tariff saves 10–20% with the same supplier, no contract change needed.",
                saving: "10–20%",
              },
              {
                num: 2,
                title: "Solar PPA",
                desc: "Florida has exceptional solar irradiance. A Power Purchase Agreement means zero upfront cost, a fixed rate below your FPL tariff, and an immediate monthly saving from day one.",
                saving: "$42k+/yr",
              },
              {
                num: 3,
                title: "Demand charge reduction",
                desc: "40–60% of Florida commercial bills are demand charges, not consumption. Identifying and reducing peak demand events through HVAC scheduling or battery storage cuts the bill significantly.",
                saving: "Up to 25%",
              },
              {
                num: 4,
                title: "LED and HVAC retrofit",
                desc: "Lighting and HVAC account for 70%+ of commercial energy use. LED and controls upgrades reduce consumption 20–40% and qualify for FPL, Duke, and Tampa Electric rebates.",
                saving: "20–40%",
              },
              {
                num: 5,
                title: "Utility rebate programmes",
                desc: "FPL, Duke Energy Florida, and Tampa Electric all run commercial efficiency rebate programmes worth $50k–$200k per site. Most commercial owners never claim them.",
                saving: "$50k+",
              },
            ].map((way, idx) => (
              <div
                key={way.num}
                className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:opacity-90"
                style={{
                  borderBottom: idx < 4 ? "1px solid var(--bdr-lt)" : "none",
                }}
              >
                {/* Number badge */}
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 text-xs font-semibold mt-0.5"
                  style={{
                    background: "var(--acc-lt)",
                    border: "1px solid var(--acc-bdr)",
                    color: "var(--acc)",
                  }}
                >
                  {way.num}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-medium mb-1" style={{ color: "var(--tx)" }}>
                    {way.title}
                  </h4>
                  <p className="text-[12px] leading-relaxed mb-2" style={{ color: "var(--tx3)", fontWeight: 300 }}>
                    {way.desc}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      className="px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: "var(--acc)",
                        color: "#fff",
                      }}
                    >
                      Review {way.title.toLowerCase()} →
                    </button>
                    <span className="text-[10px] italic" style={{ color: "var(--tx3)" }}>
                      RealHQ analyzes your portfolio
                    </span>
                  </div>
                </div>

                {/* Saving */}
                <div
                  className="text-right flex-shrink-0 min-w-[70px] text-base"
                  style={{
                    fontFamily: "var(--serif)",
                    color: "var(--grn)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {way.saving}
                  <div className="text-[10px] font-normal mt-0.5" style={{ color: "var(--tx3)", fontFamily: "var(--sans)" }}>
                    potential
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BILL UPLOAD SECTION */}
        <div>
          <div
            className="text-[9px] font-medium uppercase tracking-widest mb-3"
            style={{
              fontFamily: "var(--mono)",
              color: "var(--tx3)",
              letterSpacing: "2px",
            }}
          >
            Upload Energy Bills
          </div>

          <div
            className="rounded-xl px-6 py-5 border"
            style={{
              background: "var(--s1)",
              borderColor: "var(--bdr)",
            }}
          >
            <h3 className="text-[15px] font-medium mb-1.5" style={{ color: "var(--tx)" }}>
              Upload your energy bills.
            </h3>
            <p className="text-[13px] mb-4 leading-relaxed" style={{ color: "var(--tx3)" }}>
              RealHQ reads your tariff, consumption, and demand profile and finds every saving. The more bills you upload, the sharper the analysis.
            </p>

            {energyData?.bills && energyData.bills.length > 0 && (
              <div className="mb-4 space-y-1">
                {energyData.bills.slice(0, 3).map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-colors hover:opacity-90"
                    style={{
                      background: "var(--s2)",
                      border: "1px solid var(--bdr)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-lg">📄</div>
                      <div>
                        <div className="text-[12px] font-medium" style={{ color: "var(--tx)" }}>
                          {bill.filename}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
                          {bill.supplier} · {bill.billingPeriod ?? "Unknown period"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-[13px] font-semibold"
                        style={{
                          color: "var(--tx)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {fmt(bill.totalCost)}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
                        {bill.consumption.toLocaleString()} kWh
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className="border-2 border-dashed rounded-lg px-6 py-6 text-center cursor-pointer transition-all mb-3"
              style={{
                borderColor: "var(--bdr)",
                background: "var(--s2)",
              }}
            >
              <div className="text-2xl mb-2 opacity-40">📂</div>
              <h4 className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                Drop energy bills here — or click to browse
              </h4>
              <p className="text-[11px]" style={{ color: "var(--tx3)" }}>
                PDF · FPL · Duke · Tampa Electric · any format
              </p>
            </div>

            <button
              className="w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: "var(--acc)",
                color: "#fff",
              }}
            >
              Upload and find savings →
            </button>
          </div>
        </div>

        {/* PORTAL HINT */}
        <div
          className="px-5 py-3.5 rounded-xl text-[12px] leading-relaxed border"
          style={{
            background: "var(--s1)",
            borderColor: "var(--bdr)",
            color: "var(--tx3)",
            fontWeight: 300,
          }}
        >
          Share energy data with sustainability assessors or for ESG reporting.{" "}
          <button
            className="font-medium cursor-pointer"
            style={{ color: "var(--acc)" }}
          >
            Create a portal link →
          </button>
        </div>
      </main>
    </AppShell>
  );
}
