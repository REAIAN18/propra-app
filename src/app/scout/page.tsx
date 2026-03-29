"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StrategyBar } from "@/components/StrategyBar";
import { StrategyEditorModal } from "@/components/StrategyEditorModal";
import {
  calculateDealReturns,
  formatCurrency,
  formatPercent,
  formatMultiplier,
  classifyReturn,
} from "@/lib/scout-returns";

// ── Types ─────────────────────────────────────────────────────────────
type AcquisitionStrategy = {
  id: string;
  name: string | null;
  targetTypes: string[];
  targetGeography: string[];
  minYield: number | null;
  maxYield: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minSqft: number | null;
  maxSqft: number | null;
  currency: string;
};

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
  matchScore?: number | null;
};

type ApiResponse = {
  deals: ScoutDeal[];
  reactionCount: number;
  apiKeyConfigured: boolean;
  isDemo: boolean;
  strategy: AcquisitionStrategy | null;
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

// ── Source Badge Component (Scout v2) ────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const getSourceStyle = () => {
    const normalized = source.toLowerCase().replace(/[_\s]/g, "");
    switch (normalized) {
      case "loopnet":
        return "bg-[var(--s3)] text-[var(--tx3)] border-[var(--bdr)]";
      case "auction":
        return "bg-[var(--red-lt)] text-[var(--red)] border-[var(--red-bdr)]";
      case "pre-market":
      case "premarket":
        return "bg-[var(--acc-lt)] text-[var(--acc)] border-[var(--acc-bdr)]";
      case "distressed":
        return "bg-[var(--amb-lt)] text-[var(--amb)] border-[var(--amb-bdr)]";
      case "planning":
      case "planningsignal":
        return "bg-[rgba(56,189,248,.07)] text-[#38bdf8] border-[rgba(56,189,248,.22)]";
      case "off-market":
      case "offmarket":
        return "bg-[var(--grn-lt)] text-[var(--grn)] border-[var(--grn-bdr)]";
      default:
        return "bg-[var(--s3)] text-[var(--tx3)] border-[var(--bdr)]";
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono font-medium text-[8px] uppercase tracking-wide border ${getSourceStyle()}`}>
      {source}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ScoutPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "pipeline" | "completed">("feed");
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const fetchDeals = () => {
    setLoading(true);
    fetch("/api/scout/deals")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDeals();
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

  // Portfolio comparison metrics (placeholder - should come from API)
  const portfolioMetrics = {
    capRate: 6.6,
    irr: 9.8,
    costPerSqft: 162,
    wault: 4.2,
    avgDealSize: 3400000,
  };

  // Calculate deal averages for comparison
  const dealMetrics = feedDeals.length > 0 ? {
    capRate: feedDeals.reduce((sum, d) => sum + (d.capRate ?? 0), 0) / feedDeals.filter((d) => d.capRate).length,
    irr: feedDeals.reduce((sum, d) => {
      const returns = calculateDealReturns({
        askingPrice: d.askingPrice,
        guidePrice: d.guidePrice,
        capRate: d.capRate,
        noi: d.noi,
        assetType: d.assetType,
        currency: d.currency,
      });
      return sum + (returns.irr5yr ?? 0);
    }, 0) / feedDeals.length,
    costPerSqft: feedDeals.reduce((sum, d) => {
      const price = d.askingPrice ?? d.guidePrice;
      if (!price || !d.sqft) return sum;
      return sum + (price / d.sqft);
    }, 0) / feedDeals.filter((d) => d.sqft && (d.askingPrice ?? d.guidePrice)).length,
    wault: feedDeals.reduce((sum, d) => sum + (d.wault ?? 0), 0) / feedDeals.filter((d) => d.wault).length,
    avgDealSize: feedDeals.reduce((sum, d) => sum + (d.askingPrice ?? d.guidePrice ?? 0), 0) / feedDeals.filter((d) => d.askingPrice ?? d.guidePrice).length,
  } : null;

  return (
    <AppShell>
      <TopBar />
      <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh" }}>

        {/* Note */}
        <div className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">
          PRO-625 — Acquisitions Scout · RealHQ
        </div>
        <div className="bg-white border border-[var(--bdr)] rounded-lg p-3.5 mb-4 text-[12px] text-[var(--tx3)] leading-relaxed">
          <strong>Key features:</strong> Automated underwriting (cap rate, NOI, yield, DSCR, IRR) on every deal · PDF brochure upload + Claude extraction · LOI generator · Pipeline tracking · Land Registry comparables<br />
          <strong>Wave 2 adds:</strong> Upload brochure → RealHQ extracts rent, price, WAULT → calculates underwriting → draft LOI at one click<br />
          Brand rule: &quot;You approve. RealHQ executes.&quot; No assumed figures. Values shown as ranges before upload.
        </div>

        {/* Strategy Bar */}
        <StrategyBar
          strategy={data?.strategy || null}
          onEdit={() => setIsEditorOpen(true)}
        />

        {/* Strategy Editor Modal */}
        <StrategyEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          strategy={data?.strategy || null}
          onSave={fetchDeals}
        />

        {/* KPIs - Scout v2 6-column grid */}
        <div className="grid gap-[1px] bg-[var(--bdr)] border border-[var(--bdr)] rounded-[10px] overflow-hidden mb-6" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
          <div className="bg-[var(--s1)] p-4 hover:bg-[var(--s2)] transition-all">
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Total Deals</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{matchedCount}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>from 6 sources</div>
          </div>
          <div className="bg-[var(--s1)] p-4 hover:bg-[var(--s2)] transition-all">
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Match ≥80%</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-0.02em", lineHeight: 1 }}>{feedDeals.filter(d => (d.matchScore ?? 0) >= 80).length}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>strong fit</div>
          </div>
          <div className="bg-[var(--s1)] p-4 hover:bg-[var(--s2)] transition-all">
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Avg Cap Rate</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{avgCapRate > 0 ? `${avgCapRate.toFixed(1)}%` : "—"}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>vs your 6.6% portfolio</div>
          </div>
          <div className="bg-[var(--s1)] p-4 hover:bg-[var(--s2)] transition-all">
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Avg IRR (5yr)</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{dealMetrics && dealMetrics.irr > 0 ? `${dealMetrics.irr.toFixed(1)}%` : "—"}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>leveraged</div>
          </div>
          <div className="bg-[var(--s1)] p-4 hover:bg-[var(--s2)] transition-all">
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>In Pipeline</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{pipelineCount}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>{pipelineDeals.filter(d => d.pipelineStage === "due_diligence").length > 0 ? `${pipelineDeals.filter(d => d.pipelineStage === "due_diligence").length} in DD` : "active"}</div>
          </div>
          <div className="bg-[var(--s1)] p-4 hover:bg-[var(--s2)] transition-all">
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Sources</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>6</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>LoopNet, Auction, more</div>
          </div>
        </div>

        {/* Pipeline Tabs */}
        <div className="flex gap-0.5 bg-[var(--s2)] p-1 rounded-[10px] mb-3">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 rounded-[7px] text-[12px] font-medium transition-all ${
              activeTab === "feed"
                ? "bg-white text-[var(--tx)] shadow-sm"
                : "text-[var(--tx3)] hover:text-[var(--tx)]"
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-4 py-2 rounded-[7px] text-[12px] font-medium transition-all ${
              activeTab === "pipeline"
                ? "bg-white text-[var(--tx)] shadow-sm"
                : "text-[var(--tx3)] hover:text-[var(--tx)]"
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-[7px] text-[12px] font-medium transition-all ${
              activeTab === "completed"
                ? "bg-white text-[var(--tx)] shadow-sm"
                : "text-[var(--tx3)] hover:text-[var(--tx)]"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Source Filter - Scout v2 */}
        {activeTab === "feed" && feedDeals.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <span className="text-[9px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mr-1">
              Source:
            </span>
            {["LoopNet", "Auction", "Pre-market", "Distressed", "Planning signal", "Off-market"].map((source) => {
              const count = feedDeals.filter((d) => d.sourceTag === source).length;
              if (count === 0) return null;
              return (
                <button
                  key={source}
                  className="transition-opacity hover:opacity-70"
                  title={`Filter by ${source}`}
                >
                  <SourceBadge source={source} />
                  <span className="ml-1 text-[10px] text-[var(--tx3)]">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Deal Feed Card */}
        <div className="bg-white border border-[var(--bdr)] rounded-[14px] overflow-hidden mb-6">
          {/* Card Header */}
          <div className="px-5 py-3.5 border-b border-[var(--s2)] flex items-center justify-between">
            <p className="text-[13px] font-medium text-[var(--tx)]">Deal Feed</p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[12px] font-medium hover:bg-gray-50">
                Filter
              </button>
              <button className="px-4 py-2 bg-white text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[12px] font-medium hover:bg-gray-50">
                Sort by cap rate
              </button>
            </div>
          </div>

          {/* Deal Cards */}
          {loading ? (
            <div className="px-5 py-8 text-center text-[13px] text-[var(--tx3)]">
              Loading deals...
            </div>
          ) : displayDeals.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-[var(--tx3)]">
              No deals in this view
            </div>
          ) : (
            displayDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))
          )}
        </div>

        {/* Portfolio Fit Comparison */}
        {activeTab === "feed" && dealMetrics && feedDeals.length > 0 && (
          <div>
            <div className="text-[9px] font-medium font-mono text-[var(--tx3)] uppercase tracking-[2px] mb-3">
              How These Deals Compare to Your Portfolio
            </div>
            <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] overflow-hidden mb-6">
              <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
                <h4 className="text-[13px] font-medium text-[var(--tx)]">Deal vs Portfolio Comparison</h4>
                <span className="text-[11px] text-[var(--tx3)]">Your avg across 7 assets</span>
              </div>
              {/* Portfolio Row */}
              <div className="grid grid-cols-5 gap-[1px] bg-[var(--bdr)]">
                <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    Your Portfolio
                  </div>
                  <div className="text-[10px] font-medium text-[var(--tx3)]">Cap Rate</div>
                  <div className="text-[16px] font-serif text-[var(--tx)]">{portfolioMetrics.capRate.toFixed(1)}%</div>
                </div>
                <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    Your Portfolio
                  </div>
                  <div className="text-[10px] font-medium text-[var(--tx3)]">IRR</div>
                  <div className="text-[16px] font-serif text-[var(--tx)]">{portfolioMetrics.irr.toFixed(1)}%</div>
                </div>
                <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    Your Portfolio
                  </div>
                  <div className="text-[10px] font-medium text-[var(--tx3)]">Cost/sqft</div>
                  <div className="text-[16px] font-serif text-[var(--tx)]">${portfolioMetrics.costPerSqft}</div>
                </div>
                <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    Your Portfolio
                  </div>
                  <div className="text-[10px] font-medium text-[var(--tx3)]">WAULT</div>
                  <div className="text-[16px] font-serif text-[var(--tx)]">{portfolioMetrics.wault.toFixed(1)} yrs</div>
                </div>
                <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    Your Portfolio
                  </div>
                  <div className="text-[10px] font-medium text-[var(--tx3)]">Avg Deal</div>
                  <div className="text-[16px] font-serif text-[var(--tx)]">${(portfolioMetrics.avgDealSize / 1_000_000).toFixed(1)}M</div>
                </div>
              </div>
              {/* Deal Average Row */}
              <div className="grid grid-cols-5 gap-[1px] bg-[var(--bdr)]">
                <div className="bg-[var(--s2)] px-3 py-2.5 text-center">
                  <div className={`text-[8px] font-mono font-medium uppercase tracking-wider mb-1 ${
                    dealMetrics.capRate > portfolioMetrics.capRate ? "text-[var(--grn)]" : "text-[var(--tx3)]"
                  }`}>
                    Deal Avg
                  </div>
                  <div className={`text-[16px] font-serif ${
                    dealMetrics.capRate > portfolioMetrics.capRate ? "text-[var(--grn)]" : "text-[var(--tx)]"
                  }`}>
                    {dealMetrics.capRate.toFixed(1)}%
                  </div>
                  <div className={`text-[9px] font-light ${
                    dealMetrics.capRate > portfolioMetrics.capRate ? "text-[var(--grn)]" : "text-[var(--red)]"
                  }`}>
                    {dealMetrics.capRate > portfolioMetrics.capRate ? "+" : ""}
                    {(dealMetrics.capRate - portfolioMetrics.capRate).toFixed(1)}% {dealMetrics.capRate > portfolioMetrics.capRate ? "above" : "below"}
                  </div>
                </div>
                <div className="bg-[var(--s2)] px-3 py-2.5 text-center">
                  <div className={`text-[8px] font-mono font-medium uppercase tracking-wider mb-1 ${
                    dealMetrics.irr > portfolioMetrics.irr ? "text-[var(--grn)]" : "text-[var(--tx3)]"
                  }`}>
                    Deal Avg
                  </div>
                  <div className={`text-[16px] font-serif ${
                    dealMetrics.irr > portfolioMetrics.irr ? "text-[var(--grn)]" : "text-[var(--tx)]"
                  }`}>
                    {dealMetrics.irr.toFixed(1)}%
                  </div>
                  <div className={`text-[9px] font-light ${
                    dealMetrics.irr > portfolioMetrics.irr ? "text-[var(--grn)]" : "text-[var(--red)]"
                  }`}>
                    {dealMetrics.irr > portfolioMetrics.irr ? "+" : ""}
                    {(dealMetrics.irr - portfolioMetrics.irr).toFixed(1)}% {dealMetrics.irr > portfolioMetrics.irr ? "above" : "below"}
                  </div>
                </div>
                <div className="bg-[var(--s2)] px-3 py-2.5 text-center">
                  <div className={`text-[8px] font-mono font-medium uppercase tracking-wider mb-1 ${
                    dealMetrics.costPerSqft < portfolioMetrics.costPerSqft ? "text-[var(--grn)]" : "text-[var(--tx3)]"
                  }`}>
                    Deal Avg
                  </div>
                  <div className={`text-[16px] font-serif ${
                    dealMetrics.costPerSqft < portfolioMetrics.costPerSqft ? "text-[var(--grn)]" : "text-[var(--tx)]"
                  }`}>
                    ${Math.round(dealMetrics.costPerSqft)}
                  </div>
                  <div className={`text-[9px] font-light ${
                    dealMetrics.costPerSqft < portfolioMetrics.costPerSqft ? "text-[var(--grn)]" : "text-[var(--red)]"
                  }`}>
                    {((dealMetrics.costPerSqft - portfolioMetrics.costPerSqft) / portfolioMetrics.costPerSqft * 100).toFixed(0)}% {dealMetrics.costPerSqft < portfolioMetrics.costPerSqft ? "cheaper" : "higher"}
                  </div>
                </div>
                <div className="bg-[var(--s2)] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    Deal Avg
                  </div>
                  <div className="text-[16px] font-serif text-[var(--tx)]">
                    {dealMetrics.wault > 0 ? `${dealMetrics.wault.toFixed(1)} yrs` : "—"}
                  </div>
                  {dealMetrics.wault > 0 && (
                    <div className={`text-[9px] font-light ${
                      Math.abs(dealMetrics.wault - portfolioMetrics.wault) < 0.5 ? "text-[var(--tx3)]" : dealMetrics.wault < portfolioMetrics.wault ? "text-[var(--amb)]" : "text-[var(--grn)]"
                    }`}>
                      {(dealMetrics.wault - portfolioMetrics.wault).toFixed(1)} yrs {dealMetrics.wault < portfolioMetrics.wault ? "shorter" : "longer"}
                    </div>
                  )}
                </div>
                <div className="bg-[var(--s2)] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    Deal Avg
                  </div>
                  <div className="text-[16px] font-serif text-[var(--tx)]">
                    ${(dealMetrics.avgDealSize / 1_000_000).toFixed(1)}M
                  </div>
                  <div className={`text-[9px] font-light ${
                    dealMetrics.avgDealSize < portfolioMetrics.avgDealSize ? "text-[var(--grn)]" : "text-[var(--amb)]"
                  }`}>
                    {((dealMetrics.avgDealSize - portfolioMetrics.avgDealSize) / portfolioMetrics.avgDealSize * 100).toFixed(0)}% {dealMetrics.avgDealSize < portfolioMetrics.avgDealSize ? "below" : "above"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

// ── Deal Card Component ───────────────────────────────────────────────
function DealCard({ deal }: { deal: ScoutDeal }) {
  const hasAuction = !!deal.auctionDate;
  const auctionDate = hasAuction ? new Date(deal.auctionDate!) : null;
  const auctionFormatted = auctionDate
    ? `${auctionDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    : null;

  const price = deal.askingPrice ?? deal.guidePrice;
  const priceLabel = deal.askingPrice ? "Asking price" : deal.guidePrice ? "Guide price" : "Price";
  const capRateVsMarket = deal.capRate && deal.marketCapRate
    ? `${deal.capRate.toFixed(1)}% vs ${deal.marketCapRate.toFixed(1)}%`
    : deal.capRate
    ? fmtPercent(deal.capRate)
    : "Upload for calc";

  const hasDetailedMetrics = !!(deal.capRate || deal.noi || deal.wault);
  const matchScore = deal.matchScore;

  // Calculate returns metrics using hold-sell-model.ts
  const returns = calculateDealReturns({
    askingPrice: deal.askingPrice,
    guidePrice: deal.guidePrice,
    capRate: deal.capRate,
    noi: deal.noi,
    assetType: deal.assetType,
    currency: deal.currency,
  });

  return (
    <div className="border-b border-[var(--bdr-lt)] last:border-b-0 overflow-hidden">
      <div className="px-5 py-4 flex gap-4">
        {/* Satellite Image */}
        <div className="relative w-[120px] h-[90px] bg-[var(--bdr)] rounded-lg flex-shrink-0 overflow-hidden">
          {deal.satelliteImageUrl ? (
            <img src={deal.satelliteImageUrl} alt={deal.address} className="w-full h-full object-cover" />
          ) : null}
          <div className="absolute bottom-1 left-1 text-[9px] text-white bg-black/60 px-1.5 py-0.5 rounded">
            Satellite view · zoom 18
          </div>
        </div>

        {/* Deal Body */}
        <div className="flex-1">
          {/* Title */}
          <div className="text-[14px] font-medium text-[var(--tx)] mb-1">
            {deal.address}
          </div>

          {/* Meta */}
          <div className="text-[11px] text-[var(--tx3)] mb-2">
            {deal.assetType} · {fmtNum(deal.sqft)} sqft · Freehold
          </div>

          {/* Metrics */}
          {hasDetailedMetrics ? (
            <div className="flex gap-3 mb-2">
              <div className="flex flex-col">
                <div className="text-[9px] text-[var(--tx3)] uppercase tracking-wider mb-0.5">{priceLabel}</div>
                <div className="text-[13px] font-medium text-[var(--tx)]">
                  {price ? fmtPrice(price, deal.currency) : "POA"}
                </div>
              </div>
              {deal.capRate && (
                <div className="flex flex-col">
                  <div className="text-[9px] text-[var(--tx3)] uppercase tracking-wider mb-0.5">Cap rate</div>
                  <div className={`text-[13px] font-medium ${deal.marketCapRate && deal.capRate > deal.marketCapRate ? "text-[var(--grn)]" : "text-[var(--tx)]"}`}>
                    {capRateVsMarket}
                  </div>
                </div>
              )}
              {deal.noi && (
                <div className="flex flex-col">
                  <div className="text-[9px] text-[var(--tx3)] uppercase tracking-wider mb-0.5">Gross yield</div>
                  <div className="text-[13px] font-medium text-[var(--tx)]">
                    {deal.askingPrice && deal.noi ? ((deal.noi / deal.askingPrice) * 100).toFixed(1) : "—"}%
                  </div>
                </div>
              )}
              {deal.wault && (
                <div className="flex flex-col">
                  <div className="text-[9px] text-[var(--tx3)] uppercase tracking-wider mb-0.5">WAULT</div>
                  <div className="text-[13px] font-medium text-[var(--tx)]">
                    {deal.wault.toFixed(1)} years
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-3 mb-2">
              <div className="flex flex-col">
                <div className="text-[9px] text-[var(--tx3)] uppercase tracking-wider mb-0.5">{priceLabel}</div>
                <div className="text-[13px] font-medium text-[var(--tx)]">
                  {price ? fmtPrice(price, deal.currency) : "POA"}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[9px] text-[var(--tx3)] uppercase tracking-wider mb-0.5">Cap rate</div>
                <div className="text-[13px] font-medium text-[var(--tx)]">
                  {capRateVsMarket}
                </div>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="mb-2 flex flex-wrap gap-1">
            {/* Source Badge - Scout v2 enhanced */}
            <SourceBadge source={deal.sourceTag} />
            {matchScore !== null && matchScore !== undefined && (
              <span
                className={`inline-block text-[10px] px-2 py-1 rounded-[10px] font-mono font-medium ${
                  matchScore >= 80
                    ? "bg-[var(--grn-lt)] text-[var(--grn)] border border-[var(--grn-bdr)]"
                    : matchScore >= 60
                    ? "bg-[var(--amb-lt)] text-[var(--amb)] border border-[var(--amb-bdr)]"
                    : "bg-[var(--s2)] text-[var(--tx3)] border border-[var(--bdr)]"
                }`}
              >
                {matchScore}% match
              </span>
            )}
            {hasAuction && auctionFormatted && (
              <span className="inline-block text-[10px] px-2 py-1 rounded-[10px] bg-[var(--grn-lt)] text-[var(--grn)] border border-[var(--grn-bdr)]">
                Auction {auctionFormatted}
              </span>
            )}
            {deal.occupancy && deal.occupancy === 100 && (
              <span className="inline-block text-[10px] px-2 py-1 rounded-[10px] bg-[var(--grn-lt)] text-[var(--grn)] border border-[var(--grn-bdr)]">
                EPC B
              </span>
            )}
            {deal.inFloodZone && (
              <span className="inline-block text-[10px] px-2 py-1 rounded-[10px] bg-[var(--amb-lt)] text-[var(--amb)] border border-[var(--amb-bdr)]">
                Flood Zone 2
              </span>
            )}
            {deal.hasLisPendens && (
              <span className="inline-block text-[10px] px-2 py-1 rounded-[10px] bg-[var(--amb-lt)] text-[var(--amb)] border border-[var(--amb-bdr)]">
                Distressed
              </span>
            )}
            {deal.noi && (
              <span className="inline-block text-[10px] px-2 py-1 rounded-[10px] bg-[var(--grn-lt)] text-[var(--grn)] border border-[var(--grn-bdr)]">
                Passing rent {fmtPrice(deal.noi, deal.currency)}/yr
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[var(--grn)] text-white border-none rounded-lg text-[12px] font-medium hover:bg-[var(--grn)]">
              Upload brochure →
            </button>
            <button className="px-4 py-2 bg-white text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[12px] font-medium hover:bg-gray-50">
              Draft LOI
            </button>
            <button className="px-4 py-2 bg-white text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[12px] font-medium hover:bg-gray-50">
              Mark interested
            </button>
          </div>
        </div>
      </div>

      {/* Returns Strip - PRO-760 */}
      <div className="grid grid-cols-6 gap-[1px] bg-[var(--bdr)] border-t border-[var(--bdr)]">
        <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
          <div className="text-[7px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
            Cap Rate
          </div>
          <div className="text-[15px] font-serif text-[var(--tx)]">
            {returns.capRate ? formatPercent(returns.capRate) : "—"}
          </div>
        </div>

        <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
          <div className="text-[7px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
            NOI
          </div>
          <div className="text-[15px] font-serif text-[var(--tx)]">
            {formatCurrency(returns.noi, deal.currency)}
          </div>
        </div>

        <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
          <div className="text-[7px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
            IRR (5yr)
          </div>
          <div
            className={`text-[15px] font-serif ${
              classifyReturn("irr", returns.irr5yr) === "good"
                ? "text-[var(--grn)]"
                : classifyReturn("irr", returns.irr5yr) === "bad"
                ? "text-[var(--red)]"
                : "text-[var(--tx2)]"
            }`}
          >
            {returns.irr5yr ? formatPercent(returns.irr5yr) : "—"}
          </div>
        </div>

        <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
          <div className="text-[7px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
            Cash-on-Cash
          </div>
          <div
            className={`text-[15px] font-serif ${
              classifyReturn("coc", returns.cashOnCash) === "good"
                ? "text-[var(--grn)]"
                : classifyReturn("coc", returns.cashOnCash) === "bad"
                ? "text-[var(--red)]"
                : "text-[var(--tx2)]"
            }`}
          >
            {returns.cashOnCash ? formatPercent(returns.cashOnCash) : "—"}
          </div>
        </div>

        <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
          <div className="text-[7px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
            Equity Multiple
          </div>
          <div
            className={`text-[15px] font-serif ${
              classifyReturn("multiple", returns.equityMultiple) === "good"
                ? "text-[var(--grn)]"
                : classifyReturn("multiple", returns.equityMultiple) === "bad"
                ? "text-[var(--red)]"
                : "text-[var(--tx2)]"
            }`}
          >
            {formatMultiplier(returns.equityMultiple)}
          </div>
        </div>

        <div className="bg-[var(--s1)] px-3 py-2.5 text-center">
          <div className="text-[7px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
            Equity Needed
          </div>
          <div className="text-[15px] font-serif text-[var(--tx)]">
            {formatCurrency(returns.equityNeeded, deal.currency)}
          </div>
        </div>
      </div>

      {/* Deal Actions - Below returns strip */}
      <div className="flex gap-2 px-5 py-3 border-t border-[var(--bdr)] bg-[var(--s2)]">
        <button
          onClick={() => window.location.href = `/scout/${deal.id}/underwrite`}
          className="px-4 py-2 bg-[var(--acc)] text-white rounded-lg text-[11px] font-medium hover:opacity-90 transition-opacity"
        >
          Full underwriting →
        </button>
        <button
          className="px-4 py-2 bg-[var(--grn)] text-white rounded-lg text-[11px] font-medium hover:opacity-90 transition-opacity"
        >
          Add to pipeline →
        </button>
        <button
          className="px-4 py-2 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[11px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all"
        >
          Compare →
        </button>
        <button
          className="px-4 py-2 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[11px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all"
        >
          Express interest →
        </button>
        <button
          className="px-4 py-2 bg-transparent text-[var(--tx3)] border border-[var(--bdr)] rounded-lg text-[11px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx2)] transition-all ml-auto"
        >
          Pass
        </button>
      </div>
    </div>
  );
}
