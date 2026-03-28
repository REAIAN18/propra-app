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

        {/* Hero Section */}
        <div className="bg-[#1a3a0f] rounded-[14px] p-6 mb-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
            SE UK Industrial · Acquisitions Scout
          </p>
          <h2 className="text-[20px] font-medium text-white mb-2">
            {matchedCount} deals matched to your acquisition criteria
          </h2>
          <p className="text-[13px] text-white/45 leading-relaxed mb-4">
            Industrial and logistics assets in SE England within your target cap rate range. Upload brochure for automated underwriting, comparables, and LOI generation.
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white/[0.07] rounded-[9px] p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Matched deals</div>
              <div className="text-[18px] font-medium text-white">{matchedCount}</div>
            </div>
            <div className="bg-white/[0.07] rounded-[9px] p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Active pipeline</div>
              <div className="text-[18px] font-medium text-white">{pipelineCount}</div>
            </div>
            <div className="bg-white/[0.07] rounded-[9px] p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Avg cap rate</div>
              <div className="text-[18px] font-medium text-white">
                {avgCapRate > 0 ? `${avgCapRateLow}–${avgCapRateHigh}%` : "—"}
              </div>
            </div>
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

        {/* Deal Feed Card */}
        <div className="bg-white border border-[var(--bdr)] rounded-[14px] overflow-hidden">
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

  return (
    <div className="px-5 py-4 border-b border-[var(--bdr-lt)] last:border-b-0 flex gap-4">
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
  );
}
