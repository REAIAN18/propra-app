"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

type TabName = "Overview" | "Tenants" | "Financials" | "Insurance" | "Energy" | "Compliance" | "Planning" | "Documents";

export default function PropertyDetailPage() {
  const params = useParams();
  const assetId = params.id as string;
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [satelliteLoaded, setSatelliteLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("Overview");

  const asset = portfolio.assets.find((a) => a.id === assetId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  useEffect(() => {
    if (asset) {
      document.title = `${asset.name || "Property"} — RealHQ`;
    }
  }, [asset]);

  if (!asset) {
    return (
      <AppShell>
        <TopBar title="Property Not Found" />
        <div className="p-6 text-center">
          <p className="text-gray-500">Asset not found</p>
        </div>
      </AppShell>
    );
  }

  // Calculate KPIs
  const estimatedValue = asset.valuationGBP ?? asset.valuationUSD ?? 0;
  const passingRent = asset.leases.reduce((s, l) => s + l.sqft * l.rentPerSqft, 0);
  const ervTotal = asset.sqft * asset.marketERV;
  const ervUplift = ervTotal - passingRent;
  const noi = passingRent * 0.65; // Simplified: 65% after expenses
  const capRate = estimatedValue > 0 ? (noi / estimatedValue) * 100 : 0;
  const occupancy = (asset.leases.filter(l => l.tenant !== "Vacant").reduce((s, l) => s + l.sqft, 0) / asset.sqft) * 100;
  const siteCoverage = 35; // Demo value

  return (
    <AppShell>
      <TopBar title={asset.name || "Property Details"} />

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        {/* Hero: Satellite + OSM Polygon */}
        <div
          className="rounded-xl overflow-hidden border"
          style={{ background: "#111116", borderColor: "#252533" }}
        >
          <div
            className="relative"
            style={{ height: "200px", background: "#18181f" }}
          >
            {/* Satellite image placeholder */}
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl opacity-10">🛰️</div>
            </div>

            {/* Property overlay info */}
            <div
              className="absolute bottom-0 left-0 right-0 px-6 py-4"
              style={{
                background: "linear-gradient(transparent, rgba(9,9,11,0.95))",
              }}
            >
              <h1
                className="text-2xl font-medium mb-1"
                style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
              >
                {asset.name}
              </h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {asset.location} · {asset.sqft.toLocaleString()} sqft · {asset.type || "Commercial"}
              </p>
            </div>
          </div>
        </div>

        {/* 6-Number Strip */}
        <div
          className="rounded-xl overflow-hidden border"
          style={{ background: "#111116", borderColor: "#252533" }}
        >
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-px" style={{ background: "#252533" }}>
            <div className="p-4" style={{ background: "#111116" }}>
              <div
                className="text-[8px] uppercase tracking-wider mb-1.5"
                style={{ color: "#555568", fontFamily: "var(--mono)" }}
              >
                Est. Value
              </div>
              <div
                className="text-lg font-medium"
                style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
              >
                {fmt(estimatedValue * 0.9, sym)}–{fmt(estimatedValue * 1.1, sym)}
                <span
                  className="ml-1 text-[8px] px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(251,191,36,0.07)",
                    color: "#fbbf24",
                    border: "1px solid rgba(251,191,36,0.22)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  EST
                </span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                Market based
              </div>
            </div>

            <div className="p-4" style={{ background: "#111116" }}>
              <div
                className="text-[8px] uppercase tracking-wider mb-1.5"
                style={{ color: "#555568", fontFamily: "var(--mono)" }}
              >
                Passing Rent
              </div>
              <div
                className="text-lg font-medium"
                style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
              >
                {fmt(passingRent, sym)}
                <span className="text-[10px] text-gray-500">/yr</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                {sym}{(passingRent / asset.sqft).toFixed(2)}/sqft
              </div>
            </div>

            <div className="p-4" style={{ background: "#111116" }}>
              <div
                className="text-[8px] uppercase tracking-wider mb-1.5"
                style={{ color: "#555568", fontFamily: "var(--mono)" }}
              >
                ERV + Uplift
              </div>
              <div
                className="text-lg font-medium"
                style={{ fontFamily: "var(--serif)", color: "#34d399" }}
              >
                +{fmt(ervUplift, sym)}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                {sym}{asset.marketERV.toFixed(2)}/sqft market
              </div>
            </div>

            <div className="p-4" style={{ background: "#111116" }}>
              <div
                className="text-[8px] uppercase tracking-wider mb-1.5"
                style={{ color: "#555568", fontFamily: "var(--mono)" }}
              >
                NOI + Cap Rate
              </div>
              <div
                className="text-lg font-medium"
                style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
              >
                {fmt(noi, sym)}
                <span className="text-[10px] text-gray-500">/yr</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                {capRate.toFixed(1)}% cap rate
              </div>
            </div>

            <div className="p-4" style={{ background: "#111116" }}>
              <div
                className="text-[8px] uppercase tracking-wider mb-1.5"
                style={{ color: "#555568", fontFamily: "var(--mono)" }}
              >
                Occupancy
              </div>
              <div
                className="text-lg font-medium"
                style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
              >
                {occupancy.toFixed(0)}%
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                {asset.leases.filter(l => l.tenant !== "Vacant").length} tenants
              </div>
            </div>

            <div className="p-4" style={{ background: "#111116" }}>
              <div
                className="text-[8px] uppercase tracking-wider mb-1.5"
                style={{ color: "#555568", fontFamily: "var(--mono)" }}
              >
                Site Coverage
              </div>
              <div
                className="text-lg font-medium"
                style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
              >
                {siteCoverage}%
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                {100 - siteCoverage}% undeveloped
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--bdr)", marginBottom: "24px" }}>
          {(["Overview", "Tenants", "Financials", "Insurance", "Energy", "Compliance", "Planning", "Documents"] as TabName[]).map((tab) => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 16px",
                font: "500 12px var(--sans)",
                color: activeTab === tab ? "var(--acc)" : "var(--tx3)",
                cursor: "pointer",
                borderBottom: activeTab === tab ? "2px solid var(--acc)" : "2px solid transparent",
                transition: "all .12s",
              }}
            >
              {tab}
              {tab === "Tenants" && <span style={{ font: "500 8px/1 var(--mono)", padding: "1px 5px", borderRadius: "3px", background: activeTab === tab ? "var(--acc-lt)" : "var(--s3)", color: activeTab === tab ? "var(--acc)" : "var(--tx3)", marginLeft: "5px" }}>{asset.leases.length}</span>}
              {tab === "Compliance" && <span style={{ font: "500 8px/1 var(--mono)", padding: "1px 5px", borderRadius: "3px", background: activeTab === tab ? "var(--acc-lt)" : "var(--s3)", color: activeTab === tab ? "var(--acc)" : "var(--tx3)", marginLeft: "5px" }}>2</span>}
              {tab === "Documents" && <span style={{ font: "500 8px/1 var(--mono)", padding: "1px 5px", borderRadius: "3px", background: activeTab === tab ? "var(--acc-lt)" : "var(--s3)", color: activeTab === tab ? "var(--acc)" : "var(--tx3)", marginLeft: "5px" }}>6</span>}
            </div>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && (
          <>
        {/* Rent Roll */}
        <div
          className="rounded-xl overflow-hidden border"
          style={{ background: "#111116", borderColor: "#252533" }}
        >
          <div
            className="px-5 py-3 border-b"
            style={{ borderColor: "#252533" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
              Rent Roll
            </h3>
          </div>
          <div>
            {asset.leases.map((lease, idx) => {
              const ervGap = asset.marketERV - lease.rentPerSqft;
              const ervGapPct = lease.rentPerSqft > 0 ? (ervGap / lease.rentPerSqft) * 100 : 0;

              return (
                <div
                  key={lease.id}
                  className="px-5 py-3 border-b last:border-b-0"
                  style={{ borderColor: "#1a1a26" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1" style={{ color: "#e4e4ec" }}>
                        {lease.tenant}
                      </div>
                      <div className="text-xs" style={{ color: "#555568" }}>
                        {lease.sqft.toLocaleString()} sqft · {sym}{lease.rentPerSqft.toFixed(2)}/sqft → ERV {sym}{asset.marketERV.toFixed(2)}/sqft
                        {ervGapPct > 10 && (
                          <span className="ml-2" style={{ color: "#34d399" }}>
                            +{ervGapPct.toFixed(0)}% uplift
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-xs font-medium"
                        style={{ fontFamily: "var(--mono)", color: "#8888a0" }}
                      >
                        {fmt(lease.sqft * lease.rentPerSqft, sym)}/yr
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                        Exp: {lease.expiryDate ? new Date(lease.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Benchmarks */}
        <div
          className="rounded-xl overflow-hidden border"
          style={{ background: "#111116", borderColor: "#252533" }}
        >
          <div
            className="px-5 py-3 border-b"
            style={{ borderColor: "#252533" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
              Cost Benchmarks
            </h3>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              <div
                className="p-3 rounded-lg"
                style={{ background: "#18181f", border: "1px solid #252533" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: "#8888a0" }}>Insurance</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(251,191,36,0.07)",
                      color: "#fbbf24",
                      border: "1px solid rgba(251,191,36,0.22)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    ESTIMATE
                  </span>
                </div>
                <div className="text-sm" style={{ color: "#e4e4ec" }}>
                  {fmt(asset.sqft * 0.8, sym)}–{fmt(asset.sqft * 1.2, sym)}/yr estimated range
                </div>
                <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                  Upload schedule for exact premium
                </div>
              </div>

              <div
                className="p-3 rounded-lg"
                style={{ background: "#18181f", border: "1px solid #252533" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: "#8888a0" }}>Energy</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(251,191,36,0.07)",
                      color: "#fbbf24",
                      border: "1px solid rgba(251,191,36,0.22)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    ESTIMATE
                  </span>
                </div>
                <div className="text-sm" style={{ color: "#e4e4ec" }}>
                  {fmt(asset.sqft * 2.5, sym)}–{fmt(asset.sqft * 3.5, sym)}/yr estimated range
                </div>
                <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                  Upload bills for tariff analysis
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities */}
        <div
          className="rounded-xl overflow-hidden border"
          style={{ background: "#111116", borderColor: "#252533" }}
        >
          <div
            className="px-5 py-3 border-b"
            style={{ borderColor: "#252533" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
              Opportunities
            </h3>
          </div>
          <div>
            {ervUplift > 0 && (
              <div
                className="px-5 py-3 border-b"
                style={{ borderColor: "#1a1a26" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(52,211,153,0.07)",
                      border: "1px solid rgba(52,211,153,0.22)",
                    }}
                  >
                    <span style={{ color: "#34d399" }}>💰</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1" style={{ color: "#e4e4ec" }}>
                      Rent review to ERV
                    </div>
                    <div className="text-xs" style={{ color: "#8888a0" }}>
                      {fmt(ervUplift, sym)}/yr uplift potential based on market evidence
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded shrink-0"
                    style={{
                      background: "rgba(52,211,153,0.07)",
                      color: "#34d399",
                      border: "1px solid rgba(52,211,153,0.22)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    QUICK WIN
                  </span>
                </div>
              </div>
            )}

            {siteCoverage < 50 && (
              <div
                className="px-5 py-3 border-b"
                style={{ borderColor: "#1a1a26" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(124,106,240,0.10)",
                      border: "1px solid rgba(124,106,240,0.22)",
                    }}
                  >
                    <span style={{ color: "#7c6af0" }}>🏗️</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1" style={{ color: "#e4e4ec" }}>
                      Development potential
                    </div>
                    <div className="text-xs" style={{ color: "#8888a0" }}>
                      {100 - siteCoverage}% site undeveloped — subject to planning appraisal
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded shrink-0"
                    style={{
                      background: "rgba(124,106,240,0.10)",
                      color: "#7c6af0",
                      border: "1px solid rgba(124,106,240,0.22)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    OPPORTUNITY
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hold vs Sell */}
        <div
          className="rounded-xl overflow-hidden border"
          style={{ background: "#111116", borderColor: "#252533" }}
        >
          <div
            className="px-5 py-3 border-b"
            style={{ borderColor: "#252533" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
              Hold vs Sell
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 rounded-lg"
                style={{ background: "#18181f", border: "1px solid #252533" }}
              >
                <div className="text-xs mb-2" style={{ color: "#8888a0" }}>HOLD</div>
                <div className="text-lg font-medium mb-1" style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}>
                  {fmt(noi * 10, sym)}
                </div>
                <div className="text-[10px]" style={{ color: "#555568" }}>
                  10-year income stream
                </div>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ background: "#18181f", border: "1px solid #252533" }}
              >
                <div className="text-xs mb-2" style={{ color: "#8888a0" }}>SELL</div>
                <div className="text-lg font-medium mb-1" style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}>
                  {fmt(estimatedValue, sym)}
                </div>
                <div className="text-[10px]" style={{ color: "#555568" }}>
                  Current market value
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs" style={{ color: "#555568" }}>
              Run full scenario analysis with holding costs, capex, and exit assumptions
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === "Tenants" && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--tx3)" }}>
            Tenants tab — Coming in Phase 2 (using tenants-v2-design.html)
          </div>
        )}

        {activeTab === "Financials" && (
          <>
            {/* Financial KPIs */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533" }}
            >
              <div className="grid grid-cols-6 gap-px" style={{ background: "#252533" }}>
                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    Gross Revenue
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    {fmt(passingRent, sym)}
                    <span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "#555568", fontWeight: 400 }}>/yr</span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#34d399" }}>
                    on budget
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    OpEx
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    {fmt(passingRent * 0.32, sym)}
                    <span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "#555568", fontWeight: 400 }}>/yr</span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#f87171" }}>
                    ↑ 8% over budget
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    NOI
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#34d399" }}
                  >
                    {fmt(noi, sym)}
                    <span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "#555568", fontWeight: 400 }}>/yr</span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                    {Math.round((noi / passingRent) * 100)}% margin
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    Collection Rate
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    96%
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#fbbf24" }}>
                    1 tenant 14d late
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    LTV
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    62%
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#fbbf24" }}>
                    above 60% target
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    DSCR
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    1.38×
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#34d399" }}>
                    above 1.25× covenant
                  </div>
                </div>
              </div>
            </div>

            {/* NOI Waterfall */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533", marginTop: "16px" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#252533" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                  NOI Bridge — Trailing 12 Months
                </h3>
                <span className="text-xs font-medium" style={{ color: "#7c6af0", cursor: "pointer" }}>
                  Download P&L →
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "180px", padding: "0 18px 18px" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", borderRadius: "4px 4px 0 0", minHeight: "4px", background: "#34d399", opacity: 0.7, height: `${(passingRent / passingRent) * 160}px` }} />
                  <div style={{ font: "500 10px var(--mono)", color: "#e4e4ec" }}>{fmt(passingRent, sym)}</div>
                  <div style={{ font: "400 8px var(--mono)", color: "#555568", textAlign: "center", whiteSpace: "nowrap" }}>Gross<br />Revenue</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", borderRadius: "4px 4px 0 0", minHeight: "4px", background: "#f87171", opacity: 0.7, height: `${(passingRent * 0.08 / passingRent) * 160}px` }} />
                  <div style={{ font: "500 10px var(--mono)", color: "#e4e4ec" }}>−{fmt(passingRent * 0.08, sym)}</div>
                  <div style={{ font: "400 8px var(--mono)", color: "#555568", textAlign: "center" }}>Insurance</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", borderRadius: "4px 4px 0 0", minHeight: "4px", background: "#f87171", opacity: 0.7, height: `${(passingRent * 0.11 / passingRent) * 160}px` }} />
                  <div style={{ font: "500 10px var(--mono)", color: "#e4e4ec" }}>−{fmt(passingRent * 0.11, sym)}</div>
                  <div style={{ font: "400 8px var(--mono)", color: "#555568", textAlign: "center" }}>Energy</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", borderRadius: "4px 4px 0 0", minHeight: "4px", background: "#f87171", opacity: 0.7, height: `${(passingRent * 0.07 / passingRent) * 160}px` }} />
                  <div style={{ font: "500 10px var(--mono)", color: "#e4e4ec" }}>−{fmt(passingRent * 0.07, sym)}</div>
                  <div style={{ font: "400 8px var(--mono)", color: "#555568", textAlign: "center" }}>Maintenance</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", borderRadius: "4px 4px 0 0", minHeight: "4px", background: "#f87171", opacity: 0.7, height: `${(passingRent * 0.06 / passingRent) * 160}px` }} />
                  <div style={{ font: "500 10px var(--mono)", color: "#e4e4ec" }}>−{fmt(passingRent * 0.06, sym)}</div>
                  <div style={{ font: "400 8px var(--mono)", color: "#555568", textAlign: "center" }}>Management</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", borderRadius: "4px 4px 0 0", minHeight: "4px", background: "#7c6af0", opacity: 0.8, height: `${(noi / passingRent) * 160}px` }} />
                  <div style={{ font: "500 10px var(--mono)", color: "#34d399" }}>{fmt(noi, sym)}</div>
                  <div style={{ font: "400 8px var(--mono)", color: "#555568", textAlign: "center" }}>NOI</div>
                </div>
              </div>
            </div>

            {/* Budget vs Actual */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533", marginTop: "16px" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#252533" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                  Budget vs Actual — 2026 YTD
                </h3>
                <span className="text-xs font-medium" style={{ color: "#7c6af0", cursor: "pointer" }}>
                  Edit budget →
                </span>
              </div>
              <div style={{ padding: "18px" }}>
                {[
                  { label: "Gross Revenue", actual: passingRent / 4, budget: passingRent / 4, pct: 0, isOver: false },
                  { label: "Insurance", actual: (passingRent * 0.08) / 4 * 1.04, budget: (passingRent * 0.08) / 4, pct: 4, isOver: true },
                  { label: "Energy", actual: (passingRent * 0.11) / 4 * 1.23, budget: (passingRent * 0.11) / 4, pct: 23, isOver: true },
                  { label: "Maintenance", actual: (passingRent * 0.07) / 4 * 0.85, budget: (passingRent * 0.07) / 4, pct: -15, isOver: false },
                ].map((item, idx) => (
                  <div key={idx} style={{ marginBottom: idx < 3 ? "16px" : "0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ font: "500 12px var(--sans)", color: "#e4e4ec" }}>{item.label}</span>
                      <span style={{ font: "500 11px var(--mono)", color: "#e4e4ec" }}>
                        {fmt(item.actual, sym)} / {fmt(item.budget, sym)} budget
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, height: "6px", background: "#1f1f28", borderRadius: "3px", position: "relative", overflow: "visible" }}>
                        <div style={{
                          height: "100%",
                          borderRadius: "3px",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: `${Math.min((item.actual / item.budget) * 100, 150)}%`,
                          background: item.isOver ? "#f87171" : "#34d399"
                        }} />
                        <div style={{ position: "absolute", top: "-3px", left: "100%", height: "12px", width: "2px", background: "#555568" }} />
                      </div>
                      <div style={{ font: "500 10px var(--mono)", minWidth: "80px", textAlign: "right", color: item.isOver && item.pct > 0 ? "#f87171" : item.pct < 0 ? "#34d399" : "#34d399" }}>
                        {item.pct === 0 ? "On target ✓" : item.pct > 0 ? `+${item.pct}% over${item.pct > 15 ? " ⚠" : ""}` : `${item.pct}% under ✓`}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "12px 16px", background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.22)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                  <span style={{ font: "500 13px var(--sans)", color: "#e4e4ec" }}>NOI — YTD</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "#34d399" }}>{fmt(noi / 4, sym)}</span>
                    <span style={{ font: "400 11px var(--sans)", color: "#555568", marginLeft: "8px" }}>vs {fmt(noi / 4 * 1.02, sym)} budget (−2%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rent Collection */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533", marginTop: "16px" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#252533" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                  Rent Collection — March 2026
                </h3>
                <span className="text-xs" style={{ color: "#555568" }}>
                  96% collected · {fmt(passingRent / 12 * 0.04, sym)} outstanding
                </span>
              </div>
              <div>
                {asset.leases.map((lease, idx) => {
                  const isVacant = lease.tenant === "Vacant";
                  const isLate = idx === Math.floor(asset.leases.length / 2);
                  const monthlyRent = lease.sqft * lease.rentPerSqft / 12;

                  return (
                    <div
                      key={lease.id || idx}
                      className="px-5 py-3 border-b last:border-b-0 flex items-center gap-3"
                      style={{ borderColor: "#1a1a26" }}
                    >
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: isVacant ? "#555568" : isLate ? "#fbbf24" : "#34d399" }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: "#e4e4ec" }}>
                          {lease.tenant}
                        </div>
                        <div className="text-xs" style={{ color: "#555568" }}>
                          {lease.sqft.toLocaleString()} sq ft{!isVacant && ` · ${fmt(monthlyRent, sym)}/mo`}
                        </div>
                      </div>
                      <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", background: isVacant ? "#1f1f28" : isLate ? "#3d2e0f" : "#0f3d2e", color: isVacant ? "#555568" : isLate ? "#fbbf24" : "#34d399", border: isVacant ? "1px solid #252533" : isLate ? "1px solid rgba(251,191,36,.22)" : "1px solid rgba(52,211,153,.22)" }}>
                        {isVacant ? "VACANT" : isLate ? "14 DAYS LATE" : "PAID"}
                      </span>
                      <span style={{ font: "500 11px/1 var(--mono)", color: "#8888a0" }}>
                        {isVacant ? "—" : isLate ? "Due 1 Mar" : "1 Mar"}
                      </span>
                      <span className="text-sm font-semibold text-right" style={{ color: isLate && !isVacant ? "#fbbf24" : "#e4e4ec", minWidth: "70px" }}>
                        {isVacant ? "$0" : fmt(monthlyRent, sym)}
                      </span>
                      <span style={{ color: "#555568", fontSize: "12px" }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cash Flow Forecast */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533", marginTop: "16px" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#252533" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                  Cash Flow Forecast — Next 12 Months
                </h3>
                <span className="text-xs font-medium" style={{ color: "#7c6af0", cursor: "pointer" }}>
                  Adjust assumptions →
                </span>
              </div>
              <div style={{ padding: "18px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", font: "400 11px var(--sans)", minWidth: "700px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #252533" }}>
                      <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "#555568", textTransform: "uppercase", letterSpacing: ".5px", textAlign: "left" }}>Month</th>
                      <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "#555568", textAlign: "right" }}>Revenue</th>
                      <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "#555568", textAlign: "right" }}>OpEx</th>
                      <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "#555568", textAlign: "right" }}>NOI</th>
                      <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "#555568", textAlign: "right" }}>Debt</th>
                      <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "#555568", textAlign: "right" }}>Capex</th>
                      <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "#555568", textAlign: "right" }}>Net Cash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["Apr 26", "May 26", "Jun 26", "Jul 26"].map((month, idx) => {
                      const hasCapex = idx === 2;
                      const monthlyRev = passingRent / 12;
                      const monthlyOpEx = (passingRent * 0.32) / 12;
                      const monthlyNOI = noi / 12;
                      const monthlyDebt = monthlyNOI * 0.72;
                      const capex = hasCapex ? 15000 : 0;
                      const netCash = monthlyNOI - monthlyDebt - capex;

                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #1a1a26", background: hasCapex ? "rgba(251,191,36,.07)" : "transparent" }}>
                          <td style={{ padding: "6px 8px", color: hasCapex ? "#fbbf24" : "#e4e4ec" }}>{month}{hasCapex ? " ⚠" : ""}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "#34d399" }}>{fmt(monthlyRev, sym)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "#f87171" }}>{fmt(monthlyOpEx, sym)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "#e4e4ec" }}>{fmt(monthlyNOI, sym)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "#555568" }}>{fmt(monthlyDebt, sym)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: capex > 0 ? "#f87171" : "#555568" }}>{capex > 0 ? fmt(capex, sym) : "—"}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: netCash < 0 ? "#f87171" : "#34d399", fontWeight: 500 }}>{netCash < 0 ? "−" : ""}{fmt(Math.abs(netCash), sym)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ font: "300 10px var(--sans)", color: "#555568", marginTop: "8px" }}>
                  ⚠ Jun: HVAC replacement capex ($15k). Forecast based on current lease terms + budget assumptions.
                </div>
              </div>
            </div>

            {/* Debt & Financing */}
            <div className="grid grid-cols-2 gap-4" style={{ marginTop: "16px" }}>
              <div
                className="rounded-xl overflow-hidden border"
                style={{ background: "#111116", borderColor: "#252533" }}
              >
                <div
                  className="px-5 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: "#252533" }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                    Current Debt
                  </h3>
                  <span className="text-xs font-medium" style={{ color: "#7c6af0", cursor: "pointer" }}>
                    Update terms →
                  </span>
                </div>
                <div>
                  {[
                    { label: "Outstanding", value: fmt(estimatedValue * 0.62, sym) },
                    { label: "Rate", value: "SOFR + 225bps (7.57%)" },
                    { label: "Maturity", value: "Mar 2028 (24 mo)" },
                    { label: "LTV", value: "62% (covenant: 65%)", color: "#fbbf24" },
                    { label: "DSCR", value: "1.38× (covenant: 1.25×)", color: "#34d399" },
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      className="px-5 py-2.5 border-b last:border-b-0 flex justify-between items-center"
                      style={{ borderColor: "#1a1a26" }}
                    >
                      <div className="text-xs font-medium" style={{ color: "#e4e4ec" }}>{row.label}</div>
                      <div style={{ font: "500 12px var(--mono)", color: row.color || "#e4e4ec" }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl overflow-hidden border"
                style={{ background: "#111116", borderColor: "#252533" }}
              >
                <div
                  className="px-5 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: "#252533" }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                    Refinance Opportunity
                  </h3>
                  <span className="text-xs font-medium" style={{ color: "#7c6af0", cursor: "pointer" }}>
                    Model refi →
                  </span>
                </div>
                <div style={{ padding: "18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                    {[
                      { label: "Current Rate", value: "7.57%", color: "#e4e4ec" },
                      { label: "Market Rate", value: "7.07%", color: "#34d399" },
                      { label: "Annual Saving", value: "$14.9k", color: "#34d399" },
                      { label: "Break Cost", value: "$8.2k", color: "#fbbf24" },
                    ].map((metric, idx) => (
                      <div key={idx} style={{ background: "#18181f", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "#555568", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "4px" }}>{metric.label}</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: "17px", color: metric.color }}>{metric.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "10px 14px", background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.22)", borderRadius: "8px", font: "400 11px/1.5 var(--sans)", color: "#34d399" }}>
                    <strong>Net benefit:</strong> $14.9k/yr saving − $8.2k break cost = $6.7k net gain in year 1. Payback: 7 months.
                  </div>
                </div>
              </div>
            </div>

            {/* Reports Hint */}
            <div
              style={{
                padding: "14px 18px",
                background: "#111116",
                border: "1px solid #252533",
                borderRadius: "10px",
                font: "300 12px/1.5 var(--sans)",
                color: "#555568",
                marginTop: "14px"
              }}
            >
              Generate financial reports: <span style={{ color: "#7c6af0", fontWeight: 500, cursor: "pointer" }}>Management accounts →</span> · <span style={{ color: "#7c6af0", fontWeight: 500, cursor: "pointer" }}>Lender pack →</span> · <span style={{ color: "#7c6af0", fontWeight: 500, cursor: "pointer" }}>Investor report →</span> · All auto-populated from your data. Share via portal link.
            </div>
          </>
        )}

        {activeTab === "Insurance" && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--tx3)" }}>
            Insurance tab — Coming in Phase 2
          </div>
        )}

        {activeTab === "Energy" && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--tx3)" }}>
            Energy tab — Coming in Phase 2
          </div>
        )}

        {activeTab === "Compliance" && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--tx3)" }}>
            Compliance tab — Coming in Phase 2
          </div>
        )}

        {activeTab === "Planning" && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--tx3)" }}>
            Planning tab — Coming in Phase 2 (using planning-v2-design.html)
          </div>
        )}

        {activeTab === "Documents" && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--tx3)" }}>
            Documents tab — Coming in Phase 2
          </div>
        )}
      </main>
    </AppShell>
  );
}
