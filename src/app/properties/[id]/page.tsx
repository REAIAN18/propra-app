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
          <>
            {/* Tenant KPIs */}
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
                    Tenants
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    {asset.leases.filter(l => l.tenant !== "Vacant").length}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                    + {asset.leases.filter(l => l.tenant === "Vacant").length} vacant
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    Gross Rent
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    {fmt(passingRent, sym)}
                    <span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "#555568", fontWeight: 400 }}>/yr</span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#34d399" }}>
                    100% of occupied let
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    Collection
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
                    WAULT
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    3.8
                    <span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "#555568", fontWeight: 400 }}>yrs</span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#555568" }}>
                    weighted avg unexpired
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    Concentration
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#e4e4ec" }}
                  >
                    {asset.leases.length > 0 ? Math.round((Math.max(...asset.leases.filter(l => l.tenant !== "Vacant").map(l => l.sqft * l.rentPerSqft)) / passingRent) * 100) : 0}%
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#fbbf24" }}>
                    {asset.leases.length > 0 && asset.leases[0].tenant !== "Vacant" ? `top tenant = ${asset.leases[0].tenant}` : "—"}
                  </div>
                </div>

                <div className="p-4" style={{ background: "#111116" }}>
                  <div
                    className="text-[8px] uppercase tracking-wider mb-1.5"
                    style={{ color: "#555568", fontFamily: "var(--mono)" }}
                  >
                    Upcoming Events
                  </div>
                  <div
                    className="text-lg font-medium"
                    style={{ fontFamily: "var(--serif)", color: "#fbbf24" }}
                  >
                    3
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "#fbbf24" }}>
                    1 review · 1 break · 1 expiry
                  </div>
                </div>
              </div>
            </div>

            {/* Rent Collection Summary */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533", marginTop: "16px" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#252533" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                  This Month's Rent
                </h3>
                <span className="text-xs font-medium" style={{ color: "#8888a0", fontFamily: "var(--mono)" }}>
                  {fmt(passingRent / 12, sym)} / {fmt(passingRent / 12, sym)} due
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
                      style={{
                        borderColor: "#1a1a26",
                        borderLeft: isLate && !isVacant ? "3px solid #fbbf24" : "none",
                        opacity: isVacant ? 0.5 : 1
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: isVacant ? "#555568" : isLate ? "#fbbf24" : "#34d399"
                        }}
                      />
                      <div className="flex-1">
                        <div
                          className="text-sm font-medium"
                          style={{ color: isLate && !isVacant ? "#fbbf24" : "#e4e4ec" }}
                        >
                          {lease.tenant}
                        </div>
                        {isLate && !isVacant && (
                          <div className="text-xs" style={{ color: "#fbbf24" }}>
                            14 days overdue · {fmt(monthlyRent, sym)} outstanding
                          </div>
                        )}
                        {isVacant && (
                          <div className="text-xs" style={{ color: "#555568" }}>
                            {lease.sqft.toLocaleString()} sq ft · Available
                          </div>
                        )}
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "var(--mono)", color: "#8888a0" }}
                      >
                        {isVacant ? "—" : `${fmt(monthlyRent, sym)}/mo`}
                      </span>
                      <span
                        style={{
                          font: "500 9px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "5px",
                          letterSpacing: ".3px",
                          background: isVacant ? "#1f1f28" : isLate ? "#3d2e0f" : "#0f3d2e",
                          color: isVacant ? "#555568" : isLate ? "#fbbf24" : "#34d399",
                          border: isVacant ? "1px solid #252533" : isLate ? "1px solid rgba(251,191,36,.22)" : "1px solid rgba(52,211,153,.22)"
                        }}
                      >
                        {isVacant ? "VACANT" : isLate ? "14D LATE" : "PAID MAR 1"}
                      </span>
                      <span style={{ color: "#555568", fontSize: "12px" }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Events */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533", marginTop: "16px" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#252533" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                  Reviews, Breaks & Expiries
                </h3>
                <span className="text-xs font-medium" style={{ color: "#7c6af0", cursor: "pointer" }}>
                  View rent clock →
                </span>
              </div>
              <div>
                {asset.leases.filter(l => l.tenant !== "Vacant").slice(0, 3).map((lease, idx) => {
                  const eventTypes = ["REVIEW", "BREAK", "EXPIRY"];
                  const eventColors = ["#fbbf24", "#f87171", "#555568"];
                  const eventBgs = ["#3d2e0f", "#3d1f1f", "#1f1f28"];
                  const eventBdrs = ["rgba(251,191,36,.22)", "rgba(248,113,113,.22)", "#252533"];
                  const eventType = eventTypes[idx];
                  const eventColor = eventColors[idx];
                  const eventBg = eventBgs[idx];
                  const eventBdr = eventBdrs[idx];

                  return (
                    <div
                      key={lease.id || idx}
                      className="px-5 py-3 border-b last:border-b-0 flex items-start gap-3"
                      style={{ borderColor: "#1a1a26" }}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1" style={{ color: "#e4e4ec" }}>
                          {eventType === "REVIEW" ? "Rent Review" : eventType === "BREAK" ? "Break Clause" : "Lease Expiry"} — {lease.tenant}
                        </div>
                        <div className="text-xs" style={{ color: "#555568" }}>
                          {eventType === "REVIEW" && `Open market review · Current: ${fmt(lease.sqft * lease.rentPerSqft / 12, sym)}/mo`}
                          {eventType === "BREAK" && `Tenant can break with 3mo notice · Risk: medium`}
                          {eventType === "EXPIRY" && `${Math.floor((new Date(lease.expiryDate || Date.now()).getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000))}-year lease ending · Renewal interest indicated`}
                        </div>
                      </div>
                      <span
                        style={{
                          font: "500 9px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "5px",
                          background: eventBg,
                          color: eventColor,
                          border: `1px solid ${eventBdr}`
                        }}
                      >
                        {eventType === "REVIEW" ? "JUL 2026" : eventType === "BREAK" ? "SEP 2026" : "FEB 2027"}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "var(--mono)", color: eventType === "BREAK" ? "#f87171" : "#8888a0" }}
                      >
                        {eventType === "REVIEW" && `+${fmt(lease.sqft * lease.rentPerSqft * 0.1 / 12, sym)}/mo`}
                        {eventType === "BREAK" && `−${fmt(lease.sqft * lease.rentPerSqft / 12, sym)}/mo risk`}
                        {eventType === "EXPIRY" && fmt(lease.sqft * lease.rentPerSqft / 12, sym) + "/mo"}
                      </span>
                      <span
                        style={{
                          font: "500 9px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "5px",
                          background: eventBg,
                          color: eventColor,
                          border: `1px solid ${eventBdr}`
                        }}
                      >
                        {eventType}
                      </span>
                      <span style={{ color: "#555568", fontSize: "12px" }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tenant Schedule */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ background: "#111116", borderColor: "#252533", marginTop: "16px" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#252533" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "#e4e4ec" }}>
                  All Tenants
                </h3>
                <span className="text-xs font-medium" style={{ color: "#7c6af0", cursor: "pointer" }}>
                  View lease schedule →
                </span>
              </div>
              <div>
                {asset.leases.map((lease, idx) => {
                  const isVacant = lease.tenant === "Vacant";
                  const isLate = idx === Math.floor(asset.leases.length / 2);
                  const covenantScores = ["A+", "A", "B+", "A", "C", "B"];
                  const covenantColors = ["#34d399", "#34d399", "#fbbf24", "#34d399", "#f87171", "#fbbf24"];
                  const covenantBgs = ["rgba(52,211,153,.07)", "rgba(52,211,153,.07)", "rgba(251,191,36,.07)", "rgba(52,211,153,.07)", "rgba(248,113,113,.07)", "rgba(251,191,36,.07)"];
                  const covenantBdrs = ["rgba(52,211,153,.22)", "rgba(52,211,153,.22)", "rgba(251,191,36,.22)", "rgba(52,211,153,.22)", "rgba(248,113,113,.22)", "rgba(251,191,36,.22)"];
                  const score = covenantScores[idx % covenantScores.length];
                  const scoreColor = covenantColors[idx % covenantColors.length];
                  const scoreBg = covenantBgs[idx % covenantBgs.length];
                  const scoreBdr = covenantBdrs[idx % covenantBdrs.length];

                  return (
                    <div
                      key={lease.id || idx}
                      className="px-5 py-3 border-b last:border-b-0 flex items-center gap-3"
                      style={{
                        borderColor: "#1a1a26",
                        borderLeft: isLate && !isVacant ? "3px solid #fbbf24" : "none"
                      }}
                    >
                      <div className="flex-1">
                        <div
                          className="text-sm font-medium"
                          style={{ color: isLate && !isVacant ? "#fbbf24" : "#e4e4ec" }}
                        >
                          {lease.tenant}
                        </div>
                        <div className="text-xs" style={{ color: "#555568" }}>
                          {lease.sqft.toLocaleString()} sq ft{!isVacant && ` · Since ${new Date(lease.expiryDate || Date.now()).getFullYear() - 5}`}
                        </div>
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "var(--mono)", color: "#8888a0" }}
                      >
                        {isVacant ? "—" : `${fmt(lease.sqft * lease.rentPerSqft / 12, sym)}/mo`}
                      </span>
                      {!isVacant && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "100px",
                            font: "600 9px/1 var(--mono)",
                            letterSpacing: ".3px",
                            background: scoreBg,
                            color: scoreColor,
                            border: `1px solid ${scoreBdr}`
                          }}
                        >
                          {score}
                        </span>
                      )}
                      <span style={{ font: "400 10px var(--sans)", color: isLate && !isVacant ? "#fbbf24" : "#555568" }}>
                        {isVacant ? "—" : lease.expiryDate ? `Exp: ${new Date(lease.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : "Exp: N/A"}
                      </span>
                      <span
                        style={{
                          font: "500 9px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "5px",
                          background: isVacant ? "#1f1f28" : isLate ? "#3d1f1f" : "#0f3d2e",
                          color: isVacant ? "#555568" : isLate ? "#f87171" : "#34d399",
                          border: isVacant ? "1px solid #252533" : isLate ? "1px solid rgba(248,113,113,.22)" : "1px solid rgba(52,211,153,.22)"
                        }}
                      >
                        {isVacant ? "VACANT" : isLate ? "14D LATE" : "ON TIME"}
                      </span>
                      <span style={{ color: "#555568", fontSize: "12px" }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Letting Pipeline Hint */}
            {asset.leases.some(l => l.tenant === "Vacant") && (
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
                <strong>Vacant unit:</strong> {asset.leases.find(l => l.tenant === "Vacant")?.sqft.toLocaleString()} sq ft has been vacant. Consider co-working conversion or marketing. <span style={{ color: "#7c6af0", fontWeight: 500, cursor: "pointer" }}>View letting pipeline →</span>
              </div>
            )}
          </>
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
          <div>
            {/* Insurance KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Premium</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--tx)", marginBottom: "4px" }}>$93.4k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>5 policies</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Market Rate</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--tx)", marginBottom: "4px" }}>$72.1k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>FL benchmark</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Overpaying</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--red)", marginBottom: "4px" }}>$21.3k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>23% above market</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Coverage Gaps</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--amb)", marginBottom: "4px" }}>2</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>1 missing, 1 under</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Saved This Year</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--grn)", marginBottom: "4px" }}>$3.7k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Tampa retendering</div>
              </div>
            </div>

            {/* Risks & Coverage Gaps Alert */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--red)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ font: "600 14px var(--sans)", color: "var(--red)" }}>⚠️ Risks & Coverage Gaps</div>
                <div style={{ font: "600 12px var(--sans)", color: "var(--tx3)" }}>2 issues</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                  • <span style={{ color: "var(--tx)" }}>Miami Office</span> — Flood insurance missing ($2.4M replacement value exposed)
                </div>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                  • <span style={{ color: "var(--tx)" }}>Tampa Retail</span> — Building cover $1.8M (replacement value $2.3M) — underinsured by 22%
                </div>
              </div>
            </div>

            {/* Ways to Reduce Premium */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--grn)", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ font: "600 14px var(--sans)", color: "var(--grn)" }}>💡 Ways to Reduce Premium</div>
                <div style={{ font: "600 12px var(--sans)", color: "var(--grn)" }}>$8.4k potential</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                  • Upload fire safety compliance — <span style={{ color: "var(--grn)" }}>$900/yr</span>
                </div>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                  • Retender Orlando Warehouse (renewal in 34 days) — <span style={{ color: "var(--grn)" }}>$2.1k/yr</span>
                </div>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                  • Increase deductible Tampa Retail $5k → $10k — <span style={{ color: "var(--grn)" }}>$1.4k/yr</span>
                </div>
              </div>
            </div>

            {/* Policy Table */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bdr)" }}>
                <div style={{ font: "600 14px var(--sans)", color: "var(--tx)" }}>Active Policies</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                      <th style={{ font: "500 11px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Property</th>
                      <th style={{ font: "500 11px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Carrier</th>
                      <th style={{ font: "500 11px var(--sans)", color: "var(--tx3)", textAlign: "right", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Premium</th>
                      <th style={{ font: "500 11px var(--sans)", color: "var(--tx3)", textAlign: "right", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cover</th>
                      <th style={{ font: "500 11px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Renewal</th>
                      <th style={{ font: "500 11px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>vs Market</th>
                      <th style={{ font: "500 11px var(--sans)", color: "var(--tx3)", textAlign: "center", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { property: "Tampa Retail", carrier: "State Farm", premium: 24200, cover: 1800000, renewal: "34 days", vsMarket: "OVERPRICED", vsMarketColor: "var(--red)" },
                      { property: "Orlando Warehouse", carrier: "Nationwide", premium: 18900, cover: 2100000, renewal: "78 days", vsMarket: "OK", vsMarketColor: "var(--grn)" },
                      { property: "Miami Office", carrier: "Allstate", premium: 31200, cover: 2400000, renewal: "156 days", vsMarket: "OK", vsMarketColor: "var(--grn)" },
                      { property: "Jacksonville Industrial", carrier: "Liberty Mutual", premium: 12800, cover: 1600000, renewal: "203 days", vsMarket: "OVERPRICED", vsMarketColor: "var(--red)" },
                      { property: "Fort Lauderdale Retail", carrier: "Travelers", premium: 6300, cover: 850000, renewal: "312 days", vsMarket: "OK", vsMarketColor: "var(--grn)" },
                    ].map((policy, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < 4 ? "1px solid var(--bdr)" : "none" }}>
                        <td style={{ font: "400 12px var(--sans)", color: "var(--tx)", padding: "12px 16px" }}>{policy.property}</td>
                        <td style={{ font: "400 12px var(--sans)", color: "var(--tx2)", padding: "12px 16px" }}>{policy.carrier}</td>
                        <td style={{ font: "500 12px var(--mono)", color: "var(--tx)", padding: "12px 16px", textAlign: "right" }}>${(policy.premium / 1000).toFixed(1)}k</td>
                        <td style={{ font: "400 12px var(--mono)", color: "var(--tx2)", padding: "12px 16px", textAlign: "right" }}>${(policy.cover / 1000000).toFixed(1)}M</td>
                        <td style={{ font: "400 12px var(--sans)", color: "var(--tx2)", padding: "12px 16px" }}>{policy.renewal}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ font: "500 10px var(--sans)", color: policy.vsMarketColor, background: `${policy.vsMarketColor}22`, padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {policy.vsMarket}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <button style={{ font: "500 11px var(--sans)", color: "var(--acc)", background: "transparent", border: "1px solid var(--acc)", borderRadius: "4px", padding: "6px 12px", cursor: "pointer" }}>
                            Get Quotes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Energy" && (
          <div>
            {/* Energy KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Annual Spend</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--tx)", marginBottom: "4px" }}>$487k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>EST based on sqft</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Identified Savings</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--grn)", marginBottom: "4px" }}>$67k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>↓14% of spend</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Cost/sqft</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--red)", marginBottom: "4px" }}>$3.61</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>↑18% vs FL avg</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Bills Uploaded</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--amb)", marginBottom: "4px" }}>3 of 7</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>⚠ 4 missing</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Solar Potential</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--grn)", marginBottom: "4px" }}>$42k/yr</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>3 roofs assessed</div>
              </div>
            </div>

            {/* Market-Aware Banner (FL Regulated) */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--acc)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ font: "600 13px var(--sans)", color: "var(--acc)", marginBottom: "8px" }}>💡 Florida Market Intelligence</div>
              <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                You cannot switch supplier. FPL, Duke, Tampa Electric are sole providers. Focus on tariff restructuring, solar PPA, demand reduction, and rebates.
              </div>
            </div>

            {/* Energy Insight */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--grn)", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ font: "600 14px var(--sans)", color: "var(--grn)" }}>⚡ Tariff Optimization Opportunity</div>
                <div style={{ font: "600 14px var(--serif)", color: "var(--grn)" }}>$8.7k/yr</div>
              </div>
              <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)", marginBottom: "12px" }}>
                Your Tampa Office is on wrong FPL tariff — move from GSD-1 to GSLD-1 saves 18% annually
              </div>
              <button style={{ font: "500 11px var(--sans)", color: "var(--grn)", background: "transparent", border: "1px solid var(--grn)", borderRadius: "4px", padding: "8px 16px", cursor: "pointer" }}>
                Review tariff switch →
              </button>
            </div>

            {/* Properties Overview Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              {[
                { name: "Tampa Retail", address: "4120 W Kennedy Blvd", market: "FL Regulated", cost: 142000, costSqft: 3.82, benchmark: "↑25%", saving: "$21k", savingType: "Tariff", verified: true },
                { name: "Orlando Warehouse", address: "8901 Innovation Dr", market: "FL Regulated", cost: 89000, costSqft: 2.96, benchmark: "↓3%", saving: "$12k", savingType: "Solar PPA", verified: false },
                { name: "Miami Office", address: "1200 Brickell Ave", market: "FL Regulated", cost: 187000, costSqft: 4.21, benchmark: "↑37%", saving: "$34k", savingType: "Demand Reduction", verified: true },
                { name: "Jacksonville Industrial", address: "3401 Southside Blvd", market: "FL Regulated", cost: 52000, costSqft: 2.73, benchmark: "↓11%", saving: "—", savingType: "—", verified: false },
              ].map((prop, idx) => (
                <div key={idx} style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ font: "600 14px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>{prop.name}</div>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{prop.address}</div>
                    </div>
                    <span style={{ font: "500 9px var(--sans)", color: "var(--acc)", background: `var(--acc)22`, padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {prop.market}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginBottom: "4px" }}>ANNUAL COST {prop.verified && <span style={{ color: "var(--grn)" }}>✓</span>}</div>
                      <div style={{ font: "600 16px var(--serif)", color: "var(--tx)" }}>${(prop.cost / 1000).toFixed(0)}k</div>
                    </div>
                    <div>
                      <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginBottom: "4px" }}>COST/SQFT</div>
                      <div style={{ font: "600 16px var(--serif)", color: "var(--tx)" }}>${prop.costSqft}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>vs Benchmark</div>
                    <div style={{ font: "500 12px var(--sans)", color: prop.benchmark.startsWith("↑") ? "var(--red)" : "var(--grn)" }}>{prop.benchmark}</div>
                  </div>

                  {prop.saving !== "—" && (
                    <div style={{ background: "var(--s2)", borderRadius: "6px", padding: "12px", marginBottom: "12px" }}>
                      <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginBottom: "4px" }}>SAVING FOUND</div>
                      <div style={{ font: "600 18px var(--serif)", color: "var(--grn)", marginBottom: "4px" }}>{prop.saving}</div>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx2)" }}>{prop.savingType} optimization</div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={{ flex: 1, font: "500 11px var(--sans)", color: "var(--acc)", background: "transparent", border: "1px solid var(--acc)", borderRadius: "4px", padding: "8px 12px", cursor: "pointer" }}>
                      Review savings →
                    </button>
                    <button style={{ font: "500 11px var(--sans)", color: "var(--tx2)", background: "transparent", border: "1px solid var(--bdr)", borderRadius: "4px", padding: "8px 12px", cursor: "pointer" }}>
                      View bills
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Compliance" && (
          <div>
            {/* Compliance KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Certificates</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--tx)", marginBottom: "4px" }}>42</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Across 7 properties</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Compliant</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--grn)", marginBottom: "4px" }}>34</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>✓ 81% portfolio</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Expiring Soon</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--amb)", marginBottom: "4px" }}>5</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Within 90 days</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Expired</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--red)", marginBottom: "4px" }}>2</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Action required</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Fine Exposure</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--red)", marginBottom: "4px" }}>$18.4k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>From 2 expired</div>
              </div>
            </div>

            {/* Fine Exposure Alert */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--red)", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ font: "600 14px var(--sans)", color: "var(--red)" }}>⚠️ 2 expired certificates — $18,400 in fine exposure and growing</div>
                <button style={{ font: "500 11px var(--sans)", color: "var(--red)", background: "transparent", border: "1px solid var(--red)", borderRadius: "4px", padding: "8px 16px", cursor: "pointer" }}>
                  Fix now →
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                  • <span style={{ color: "var(--tx)" }}>Fire Risk Assessment</span> (Miami Office) — expired 23 days ago — <span style={{ color: "var(--red)" }}>$9.6k owed</span>
                </div>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>
                  • <span style={{ color: "var(--tx)" }}>EPC Certificate</span> (Tampa Retail) — expired 11 days ago — <span style={{ color: "var(--red)" }}>$8.8k owed</span>
                </div>
              </div>
            </div>

            {/* Certificate Status Matrix + Timeline */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>
              {/* Certificate Table */}
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bdr)" }}>
                  <div style={{ font: "600 14px var(--sans)", color: "var(--tx)" }}>Certificate Status</div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                        <th style={{ font: "500 10px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "8px 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Certificate</th>
                        <th style={{ font: "500 10px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "8px 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Property</th>
                        <th style={{ font: "500 10px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "8px 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                        <th style={{ font: "500 10px var(--sans)", color: "var(--tx3)", textAlign: "left", padding: "8px 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Expiry</th>
                        <th style={{ font: "500 10px var(--sans)", color: "var(--tx3)", textAlign: "center", padding: "8px 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { cert: "Fire Risk", property: "Miami Office", status: "EXPIRED", statusColor: "var(--red)", expiry: "23 days ago", action: "Renew now" },
                        { cert: "EPC", property: "Tampa Retail", status: "EXPIRED", statusColor: "var(--red)", expiry: "11 days ago", action: "Renew now" },
                        { cert: "Gas Safe CP12", property: "Orlando Warehouse", status: "EXPIRING", statusColor: "var(--amb)", expiry: "34 days", action: "Schedule" },
                        { cert: "EICR", property: "Jacksonville", status: "EXPIRING", statusColor: "var(--amb)", expiry: "67 days", action: "Schedule" },
                        { cert: "Asbestos", property: "Miami Office", status: "VALID", statusColor: "var(--grn)", expiry: "298 days", action: "View" },
                        { cert: "Legionella", property: "Tampa Retail", status: "VALID", statusColor: "var(--grn)", expiry: "401 days", action: "View" },
                      ].map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < 5 ? "1px solid var(--bdr)" : "none" }}>
                          <td style={{ font: "400 11px var(--sans)", color: "var(--tx)", padding: "10px 12px" }}>{row.cert}</td>
                          <td style={{ font: "400 11px var(--sans)", color: "var(--tx2)", padding: "10px 12px" }}>{row.property}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ font: "500 9px var(--sans)", color: row.statusColor, background: `${row.statusColor}22`, padding: "3px 6px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{ font: "400 11px var(--sans)", color: "var(--tx2)", padding: "10px 12px" }}>{row.expiry}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <button style={{ font: "500 10px var(--sans)", color: row.statusColor, background: "transparent", border: `1px solid ${row.statusColor}`, borderRadius: "4px", padding: "4px 10px", cursor: "pointer" }}>
                              {row.action} →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fine Exposure Breakdown */}
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: "16px" }}>Fine Exposure Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { cert: "Fire Risk", property: "Miami", fine: 9600, status: "owed" },
                    { cert: "EPC", property: "Tampa", fine: 8800, status: "owed" },
                    { cert: "Gas Safe", property: "Orlando", fine: 2400, status: "risk" },
                    { cert: "EICR", property: "Jacksonville", fine: 1800, status: "risk" },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx)" }}>{item.cert}</div>
                        <div style={{ font: "600 11px var(--mono)", color: item.status === "owed" ? "var(--red)" : "var(--amb)" }}>
                          ${(item.fine / 1000).toFixed(1)}k
                        </div>
                      </div>
                      <div style={{ height: "6px", background: "var(--s2)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${(item.fine / 9600) * 100}%`, height: "100%", background: item.status === "owed" ? "var(--red)" : "var(--amb)", borderRadius: "3px" }} />
                      </div>
                      <div style={{ font: "400 9px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>{item.property} — {item.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upload Certificate Button */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button style={{ font: "500 12px var(--sans)", color: "var(--tx)", background: "var(--acc)", border: "none", borderRadius: "6px", padding: "12px 24px", cursor: "pointer" }}>
                Upload certificate
              </button>
              <button style={{ font: "500 12px var(--sans)", color: "var(--tx2)", background: "transparent", border: "1px solid var(--bdr)", borderRadius: "6px", padding: "12px 24px", cursor: "pointer" }}>
                Download compliance report
              </button>
            </div>
          </div>
        )}

        {activeTab === "Planning" && (
          <div>
            {/* Planning KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Applications</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--tx)", marginBottom: "4px" }}>18</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Within 1 mile, last 12mo</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Negative</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--red)", marginBottom: "4px" }}>3</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>High impact</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Positive</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--grn)", marginBottom: "4px" }}>7</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Area improvements</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Dev Potential</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--grn)", marginBottom: "4px" }}>+$420k</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Medium uplift</div>
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Monitoring</div>
                <div style={{ font: "600 20px var(--serif)", color: "var(--acc)", marginBottom: "4px" }}>Active</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>Checked weekly</div>
              </div>
            </div>

            {/* Development Potential Card */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--grn)", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: "600 14px var(--sans)", color: "var(--grn)", marginBottom: "8px" }}>💡 Medium Development Potential</div>
                  <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)", lineHeight: "1.5" }}>
                    Current zoning permits +35% FAR above existing development. Office to residential conversion feasible under permitted use. Historic district overlay restricts façade changes but interior reconfiguration permitted.
                  </div>
                </div>
                <div style={{ marginLeft: "24px", textAlign: "right" }}>
                  <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginBottom: "4px" }}>POTENTIAL UPLIFT</div>
                  <div style={{ font: "600 24px var(--serif)", color: "var(--grn)" }}>+$420k</div>
                </div>
              </div>
              <button style={{ font: "500 11px var(--sans)", color: "var(--grn)", background: "transparent", border: "1px solid var(--grn)", borderRadius: "4px", padding: "8px 16px", cursor: "pointer" }}>
                Full report →
              </button>
            </div>

            {/* Nearby Applications */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ font: "600 14px var(--sans)", color: "var(--tx)" }}>Nearby Applications (1 mile)</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={{ font: "500 11px var(--sans)", color: "var(--acc)", background: `var(--acc)22`, border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer" }}>
                    List
                  </button>
                  <button style={{ font: "500 11px var(--sans)", color: "var(--tx3)", background: "transparent", border: "1px solid var(--bdr)", borderRadius: "4px", padding: "6px 12px", cursor: "pointer" }}>
                    Map
                  </button>
                </div>
              </div>

              {/* Applications List */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { ref: "PA-2024-8821", address: "420 Kennedy Blvd", desc: "Class A office — 180k sqft new build", impact: "NEGATIVE", impactColor: "var(--red)", distance: "0.2mi", status: "PENDING", reason: "Competing use (Class A office) within 0.2mi likely to attract existing tenants. Public consultation active until Mar 15.", action: "Draft objection letter" },
                  { ref: "PA-2024-7432", address: "115 S Franklin St", desc: "Restaurant & retail ground floor conversion", impact: "POSITIVE", impactColor: "var(--grn)", distance: "0.4mi", status: "APPROVED", reason: "Amenity improvement. Dining & retail within walking distance increases tenant appeal and potential rent uplift.", action: null },
                  { ref: "PA-2024-9104", address: "890 N Highland Ave", desc: "Mixed-use residential — 42 units + retail", impact: "POSITIVE", impactColor: "var(--grn)", distance: "0.6mi", status: "APPROVED", reason: "Residential density increase supports local services and retail viability. No direct competition with subject property use.", action: null },
                  { ref: "PA-2023-6721", address: "1801 E 7th Ave", desc: "Industrial warehouse — 95k sqft", impact: "NEGATIVE", impactColor: "var(--red)", distance: "0.8mi", status: "UNDER REVIEW", reason: "Potential traffic impact and loading bay activity may affect tenant perception of area quality.", action: "Draft objection letter" },
                  { ref: "PA-2024-5509", address: "2301 N Florida Ave", desc: "Public park & greenway extension", impact: "POSITIVE", impactColor: "var(--grn)", distance: "0.9mi", status: "APPROVED", reason: "Public realm improvement. Parks and green space within 1mi correlate with +7% rental premiums in comparable assets.", action: null },
                ].map((app, idx) => (
                  <div key={idx} style={{ borderBottom: idx < 4 ? "1px solid var(--bdr)" : "none", borderLeft: `3px solid ${app.impactColor}` }}>
                    <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ font: "600 12px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>{app.ref}</div>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx2)", marginBottom: "2px" }}>{app.address}</div>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{app.desc}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "16px" }}>
                        <span style={{ font: "500 9px var(--sans)", color: app.impactColor, background: `${app.impactColor}22`, padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {app.impact}
                        </span>
                        <div style={{ font: "400 11px var(--mono)", color: "var(--tx3)", minWidth: "50px" }}>{app.distance}</div>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", minWidth: "100px" }}>{app.status}</div>
                      </div>
                    </div>

                    {/* AI Classification Explanation (for first negative app as example) */}
                    {idx === 0 && (
                      <div style={{ padding: "12px 16px", paddingTop: "0", paddingLeft: "19px" }}>
                        <div style={{ background: "var(--s2)", borderRadius: "6px", padding: "12px", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <span style={{ font: "500 9px var(--sans)", color: "var(--acc)", background: `var(--acc)22`, padding: "3px 6px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              AI CLASSIFICATION
                            </span>
                          </div>
                          <div style={{ font: "400 11px var(--sans)", color: "var(--tx2)", lineHeight: "1.5", marginBottom: "10px" }}>
                            {app.reason}
                          </div>
                          {app.action && (
                            <button style={{ font: "500 10px var(--sans)", color: "var(--red)", background: "transparent", border: `1px solid var(--red)`, borderRadius: "4px", padding: "6px 12px", cursor: "pointer" }}>
                              {app.action} →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Documents" && (
          <div>
            {/* Upload Zone */}
            <div style={{ background: "var(--s1)", border: "2px dashed var(--bdr)", borderRadius: "8px", padding: "32px", textAlign: "center", marginBottom: "24px", cursor: "pointer" }}>
              <div style={{ font: "400 32px var(--serif)", color: "var(--tx3)", marginBottom: "12px" }}>📁</div>
              <div style={{ font: "600 14px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Drop documents here — RealHQ auto-extracts</div>
              <div style={{ font: "400 12px var(--sans)", color: "var(--tx3)" }}>PDF, JPG, PNG, DOCX · Leases, bills, certificates · Auto-categorised</div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {["All", "Lease", "Insurance", "Energy", "Compliance", "Financial"].map((filter, idx) => (
                <button
                  key={filter}
                  style={{
                    font: "500 11px var(--sans)",
                    color: idx === 0 ? "var(--acc)" : "var(--tx3)",
                    background: idx === 0 ? `var(--acc)22` : "transparent",
                    border: idx === 0 ? "1px solid var(--acc)" : "1px solid var(--bdr)",
                    borderRadius: "16px",
                    padding: "6px 14px",
                    cursor: "pointer",
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Document List */}
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bdr)" }}>
                <div style={{ font: "600 14px var(--sans)", color: "var(--tx)" }}>Property Documents</div>
              </div>

              {/* Document Rows */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { name: "Lease Agreement — Tampa Retail LLC", type: "Lease", status: "EXTRACTED", statusColor: "var(--grn)", summary: "5yr term · £84k pa · Break at 3yrs · Expires 12 Apr 2027", date: "25 Mar" },
                  { name: "Building Insurance Policy — State Farm", type: "Insurance", status: "EXTRACTED", statusColor: "var(--grn)", summary: "$24.2k pa · $1.8M cover · Renewal 34 days", date: "18 Mar" },
                  { name: "FPL Electricity Bill — Dec 2024", type: "Energy", status: "EXTRACTED", statusColor: "var(--grn)", summary: "$11,240 · 42,100 kWh · GSD-1 tariff", date: "12 Mar" },
                  { name: "Fire Risk Assessment Certificate", type: "Compliance", status: "EXTRACTED", statusColor: "var(--grn)", summary: "Valid until 23 Feb 2026 · Medium risk rating", date: "8 Mar" },
                  { name: "Q4 2024 Bank Statement.pdf", type: "Financial", status: "UPLOADED", statusColor: "var(--tx3)", summary: "Processing for extraction", date: "4 Mar" },
                  { name: "Property Valuation Report 2024", type: "Financial", status: "EXTRACTED", statusColor: "var(--grn)", summary: "$2.4M valuation · 6.2% yield · $387 psf", date: "28 Feb" },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "14px 16px",
                      borderBottom: idx < 5 ? "1px solid var(--bdr)" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <div style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>{doc.name}</div>
                        <span style={{ font: "500 9px var(--sans)", color: doc.statusColor, background: `${doc.statusColor}22`, padding: "3px 7px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {doc.status}
                        </span>
                        <span style={{ font: "500 9px var(--sans)", color: "var(--acc)", background: `var(--acc)22`, padding: "3px 7px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {doc.type}
                        </span>
                      </div>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{doc.summary}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "16px" }}>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", minWidth: "50px", textAlign: "right" }}>{doc.date}</div>
                      <div style={{ font: "400 16px", color: "var(--tx3)" }}>→</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State (if no documents) - commented out since we have demo data */}
              {/* <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)", marginBottom: "8px" }}>No documents uploaded yet</div>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx3)" }}>Drop documents above to get started</div>
              </div> */}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
