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

export default function PropertyDetailPage() {
  const params = useParams();
  const assetId = params.id as string;
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [satelliteLoaded, setSatelliteLoaded] = useState(false);

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
  const passingRent = asset.leases.reduce((s, l) => s + l.sqft * l.rentPerSqft, 0);
  const ervTotal = asset.sqft * asset.marketERV;
  const ervUplift = ervTotal - passingRent;
  const noi = passingRent * 0.65; // Simplified: 65% after expenses
  const estimatedValue = (portfolio.currency === "USD" ? asset.valuationUSD : asset.valuationGBP) ?? 0;
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
                {asset.location} · {asset.sqft.toLocaleString()} sqft · {asset.type}
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
      </main>
    </AppShell>
  );
}
