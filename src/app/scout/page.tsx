"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ── Types ─────────────────────────────────────────────────────────────
type ScoutDeal = {
  id: string;
  address: string;
  assetType: string;
  sqft: number | null;
  askingPrice: number | null;
  guidePrice: number | null;
  capRate: number | null;
  brokerName: string | null;
  daysOnMarket: number | null;
  sourceTag: string;
  sourceUrl: string | null;
  hasLisPendens: boolean;
  hasInsolvency: boolean;
  lastSaleYear: number | null;
  hasPlanningApplication: boolean;
  solarIncomeEstimate: number | null;
  inFloodZone: boolean;
  auctionDate: string | null;
  ownerName: string | null;
  satelliteImageUrl: string | null;
  signalCount: number;
  currency: string;
  userReaction: "interested" | "passed" | null;
  pipelineStage?: string | null;
  pricePerSqft?: number | null;
  marketCapRate?: number | null;
  noi?: number | null;
  occupancy?: number | null;
  wault?: number | null;
  yearBuilt?: number | null;
  rentUplift?: string | null;
  planningPlay?: string | null;
  portfolioComparison?: string | null;
};

type ApiResponse = {
  deals: ScoutDeal[];
  reactionCount: number;
  apiKeyConfigured: boolean;
  isDemo: boolean;
};

// ── Formatters ────────────────────────────────────────────────────────
function sym(currency: string) {
  return currency === "GBP" ? "£" : "$";
}

function fmtPrice(price: number | null, currency: string) {
  if (!price) return "POA";
  const s = sym(currency);
  if (price >= 1_000_000) return `${s}${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1_000) return `${s}${(price / 1_000).toFixed(0)}k`;
  return `${s}${price.toLocaleString()}`;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return null;
  return n.toLocaleString();
}

function fmtPercent(n: number | null | undefined) {
  if (n == null) return null;
  return `${n.toFixed(1)}%`;
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ScoutPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "pipeline" | "completed">("feed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scout/deals")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const deals = data?.deals ?? [];
  const feedDeals = deals.filter((d) => !d.pipelineStage && d.userReaction !== "passed");
  const pipelineDeals = deals.filter((d) => d.pipelineStage);
  const completedDeals = deals.filter((d) => d.userReaction === "passed");

  const displayDeals = activeTab === "feed" ? feedDeals : activeTab === "pipeline" ? pipelineDeals : completedDeals;

  // Calculate KPIs
  const matchedCount = feedDeals.length;
  const pipelineCount = pipelineDeals.length;
  const avgCapRate = feedDeals.length > 0
    ? feedDeals.reduce((sum, d) => sum + (d.capRate ?? 0), 0) / feedDeals.filter((d) => d.capRate).length
    : 0;
  const avgCapRateLow = avgCapRate > 0 ? (avgCapRate - 0.3).toFixed(1) : "—";
  const avgCapRateHigh = avgCapRate > 0 ? (avgCapRate + 0.3).toFixed(1) : "—";

  return (
    <AppShell>
      <TopBar />
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "28px 32px 80px", maxWidth: "1080px" }}>

        {/* Page Header */}
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "24px", fontWeight: 400, color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: "4px" }}>
              Acquisition Intelligence
            </div>
            <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
              {matchedCount} deals from 6 sources, scored against your strategy. Full underwriting on every one.
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ height: "30px", padding: "0 12px", background: "transparent", color: "var(--tx2)", border: "1px solid var(--bdr)", borderRadius: "7px", font: "500 11px/1 var(--sans)", cursor: "pointer" }}>
              Compare deals
            </button>
            <button style={{ height: "30px", padding: "0 12px", background: "transparent", color: "var(--tx2)", border: "1px solid var(--bdr)", borderRadius: "7px", font: "500 11px/1 var(--sans)", cursor: "pointer" }}>
              Edit strategy
            </button>
            <button style={{ height: "30px", padding: "0 14px", background: "var(--acc)", color: "#fff", border: "none", borderRadius: "7px", font: "600 11px/1 var(--sans)", cursor: "pointer" }}>
              View pipeline →
            </button>
          </div>
        </div>

        {/* Strategy Bar */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px" }}>Strategy:</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: "100px", font: "500 10px var(--sans)", background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", color: "var(--acc)" }}>Industrial</span>
              <span style={{ padding: "4px 10px", borderRadius: "100px", font: "500 10px var(--sans)", background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", color: "var(--acc)" }}>Warehouse</span>
              <span style={{ padding: "4px 10px", borderRadius: "100px", font: "500 10px var(--sans)", background: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx2)" }}>Office</span>
              <span style={{ padding: "4px 10px", borderRadius: "100px", font: "500 10px var(--sans)", background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", color: "var(--acc)" }}>FL + SE England</span>
              <span style={{ padding: "4px 10px", borderRadius: "100px", font: "500 10px var(--sans)", background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", color: "var(--acc)" }}>6%+ yield</span>
              <span style={{ padding: "4px 10px", borderRadius: "100px", font: "500 10px var(--sans)", background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", color: "var(--acc)" }}>$1M–$12M</span>
              <span style={{ padding: "4px 10px", borderRadius: "100px", font: "500 10px var(--sans)", background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", color: "var(--acc)" }}>5,000–50,000 sqft</span>
            </div>
          </div>
          <button style={{ height: "30px", padding: "0 12px", background: "transparent", color: "var(--tx2)", border: "1px solid var(--bdr)", borderRadius: "7px", font: "500 11px/1 var(--sans)", cursor: "pointer", flexShrink: 0 }}>
            Edit →
          </button>
        </div>

        {/* 6 KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1px", background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Total Deals</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>{matchedCount}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>from 6 sources</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Match ≥80%</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-.02em", lineHeight: 1 }}>8</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>strong fit</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Avg Cap Rate</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>6.9%</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>vs your 6.6% portfolio</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Avg IRR (5yr)</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>10.4%</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>leveraged</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>In Pipeline</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>{pipelineCount}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>1 in DD</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Sources</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>6</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>LoopNet, Auction, Pre-mkt, Distressed, Planning, Off-mkt</div>
          </div>
        </div>

        {/* Source Filter */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          <span style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", padding: "6px 0", marginRight: "4px" }}>Source:</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "500 8px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)", cursor: "pointer" }}>LoopNet (8)</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "500 8px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: "var(--red-lt)", color: "var(--red)", border: "1px solid var(--red-bdr)", cursor: "pointer" }}>Auction (3)</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "500 8px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: "var(--acc-lt)", color: "var(--acc)", border: "1px solid var(--acc-bdr)", cursor: "pointer" }}>Pre-market (4)</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "500 8px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)", cursor: "pointer" }}>Distressed (3)</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "500 8px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: "rgba(56,189,248,.07)", color: "#38bdf8", border: "1px solid rgba(56,189,248,.22)", cursor: "pointer" }}>Planning signal (2)</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "500 8px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)", cursor: "pointer" }}>Off-market (3)</span>
        </div>

        {/* Section Label */}
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>
          Deals
        </div>

        {/* Deal Cards */}
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", font: "13px var(--sans)", color: "var(--tx3)" }}>
            Loading deals...
          </div>
        ) : displayDeals.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", font: "13px var(--sans)", color: "var(--tx3)" }}>
            No deals in this view
          </div>
        ) : (
          displayDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))
        )}
      </div>
    </AppShell>
  );
}

// ── Deal Card Component ───────────────────────────────────────────────
function DealCard({ deal }: { deal: ScoutDeal }) {
  const price = deal.askingPrice ?? deal.guidePrice;
  const pricePerSqft = price && deal.sqft ? price / deal.sqft : null;

  // Mock returns data (Phase 2 will wire up real calculations)
  const mockIRR = deal.capRate ? (deal.capRate * 1.6).toFixed(1) : "—";
  const mockCashOnCash = deal.capRate ? (deal.capRate * 1.2).toFixed(1) : "—";
  const mockEquityMultiple = deal.capRate ? (1.5 + (deal.capRate / 20)).toFixed(2) : "—";
  const mockEquityNeeded = price ? fmtPrice(price * 0.35, deal.currency) : "—";

  // Determine source badge style
  const getSourceBadgeStyle = (source: string) => {
    const sourceMap: Record<string, any> = {
      "LoopNet": { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)" },
      "Auction": { bg: "var(--red-lt)", color: "var(--red)", border: "var(--red-bdr)" },
      "Pre-market": { bg: "var(--acc-lt)", color: "var(--acc)", border: "var(--acc-bdr)" },
      "Distressed": { bg: "var(--amb-lt)", color: "var(--amb)", border: "var(--amb-bdr)" },
      "Planning": { bg: "rgba(56,189,248,.07)", color: "#38bdf8", border: "rgba(56,189,248,.22)" },
      "Off-market": { bg: "var(--grn-lt)", color: "var(--grn)", border: "var(--grn-bdr)" },
    };
    return sourceMap[source] || sourceMap["LoopNet"];
  };

  const sourceBadgeStyle = getSourceBadgeStyle(deal.sourceTag);

  return (
    <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "10px", cursor: "pointer", transition: "border-color .12s" }}>
      {/* Deal Top Section */}
      <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "start" }}>
        <div>
          <div style={{ font: "500 14px var(--sans)", color: "var(--tx)", marginBottom: "3px" }}>
            {deal.address}
          </div>
          <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginBottom: "6px" }}>
            {deal.assetType} · {fmtNum(deal.sqft)} sqft · {deal.address.includes("Tampa") || deal.address.includes("FL") ? "Florida" : "SE England"} · Listed 4 days ago
          </div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "500 8px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: sourceBadgeStyle.bg, color: sourceBadgeStyle.color, border: `1px solid ${sourceBadgeStyle.border}` }}>
              {deal.sourceTag.toUpperCase()}
            </span>
            {deal.capRate && deal.marketCapRate && deal.capRate < deal.marketCapRate && (
              <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: ".3px", background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" }}>
                BELOW MKT CAP
              </span>
            )}
            {deal.wault && deal.wault > 5 && (
              <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: ".3px", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>
                LONG WAULT
              </span>
            )}
          </div>
          <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx2)" }}>
            <strong style={{ color: "var(--tx)" }}>Why this fits your strategy:</strong> {deal.assetType} in {deal.address.includes("Tampa") || deal.address.includes("FL") ? "FL" : "SE England"} (matches target) · {deal.capRate ? `${deal.capRate.toFixed(1)}% cap rate` : "Upload for calc"} {deal.capRate && deal.capRate > 6 ? "(above your 6%+ threshold)" : ""} · {price ? fmtPrice(price, deal.currency) : "POA"} {price && price < 12000000 ? "(within budget)" : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: "110px" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.01em" }}>
            {price ? fmtPrice(price, deal.currency) : "POA"}
          </div>
          {pricePerSqft && (
            <div style={{ font: "500 11px var(--mono)", color: "var(--tx3)", marginTop: "2px" }}>
              {sym(deal.currency)}{Math.round(pricePerSqft)}/sqft
            </div>
          )}
          <div style={{ font: "600 11px var(--mono)", color: "var(--grn)", marginTop: "4px", padding: "3px 8px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", borderRadius: "5px", display: "inline-block" }}>
            94% match
          </div>
        </div>
      </div>

      {/* Returns Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1px", background: "var(--bdr)", borderTop: "1px solid var(--bdr)" }}>
        <div style={{ background: "var(--s1)", padding: "10px 12px", textAlign: "center" }}>
          <div style={{ font: "500 7px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>Cap Rate</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "15px", color: deal.capRate && deal.capRate > 6.5 ? "var(--grn)" : "var(--tx)", letterSpacing: "-.01em" }}>
            {deal.capRate ? `${deal.capRate.toFixed(1)}%` : "—"}
          </div>
        </div>
        <div style={{ background: "var(--s1)", padding: "10px 12px", textAlign: "center" }}>
          <div style={{ font: "500 7px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>NOI</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "15px", color: "var(--tx)", letterSpacing: "-.01em" }}>
            {deal.noi ? fmtPrice(deal.noi, deal.currency) : "—"}
          </div>
        </div>
        <div style={{ background: "var(--s1)", padding: "10px 12px", textAlign: "center" }}>
          <div style={{ font: "500 7px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>IRR (5yr)</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "15px", color: mockIRR !== "—" && parseFloat(mockIRR) > 10 ? "var(--grn)" : "var(--tx)", letterSpacing: "-.01em" }}>
            {mockIRR !== "—" ? `${mockIRR}%` : "—"}
          </div>
        </div>
        <div style={{ background: "var(--s1)", padding: "10px 12px", textAlign: "center" }}>
          <div style={{ font: "500 7px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>Cash-on-Cash</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "15px", color: mockCashOnCash !== "—" && parseFloat(mockCashOnCash) > 8 ? "var(--grn)" : "var(--tx)", letterSpacing: "-.01em" }}>
            {mockCashOnCash !== "—" ? `${mockCashOnCash}%` : "—"}
          </div>
        </div>
        <div style={{ background: "var(--s1)", padding: "10px 12px", textAlign: "center" }}>
          <div style={{ font: "500 7px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>Equity Multiple</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "15px", color: mockEquityMultiple !== "—" && parseFloat(mockEquityMultiple) > 1.5 ? "var(--grn)" : "var(--tx)", letterSpacing: "-.01em" }}>
            {mockEquityMultiple !== "—" ? `${mockEquityMultiple}×` : "—"}
          </div>
        </div>
        <div style={{ background: "var(--s1)", padding: "10px 12px", textAlign: "center" }}>
          <div style={{ font: "500 7px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>Equity Needed</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "15px", color: "var(--tx)", letterSpacing: "-.01em" }}>
            {mockEquityNeeded}
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div style={{ display: "flex", gap: "6px", padding: "12px 18px", borderTop: "1px solid var(--bdr-lt)", background: "var(--s2)" }}>
        <button style={{ padding: "7px 16px", borderRadius: "7px", font: "500 11px var(--sans)", cursor: "pointer", border: "none", background: "var(--grn)", color: "#fff" }}>
          Interested — add to pipeline →
        </button>
        <button style={{ padding: "7px 16px", borderRadius: "7px", font: "500 11px var(--sans)", cursor: "pointer", border: "none", background: "var(--acc)", color: "#fff" }}>
          Full underwriting →
        </button>
        <button style={{ padding: "7px 16px", borderRadius: "7px", font: "500 11px var(--sans)", cursor: "pointer", background: "transparent", color: "var(--tx2)", border: "1px solid var(--bdr)" }}>
          Compare →
        </button>
        <button style={{ padding: "7px 16px", borderRadius: "7px", font: "500 11px var(--sans)", cursor: "pointer", background: "transparent", color: "var(--tx2)", border: "1px solid var(--bdr)" }}>
          Express interest →
        </button>
        <button style={{ padding: "7px 16px", borderRadius: "7px", font: "500 11px var(--sans)", cursor: "pointer", background: "transparent", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>
          Pass
        </button>
      </div>
    </div>
  );
}
