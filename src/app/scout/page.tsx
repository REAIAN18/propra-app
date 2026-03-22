"use client";

import { useState, useEffect, useCallback } from "react";
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
};

// ── Headline insight logic ────────────────────────────────────────────
function getHeadlineInsight(deal: ScoutDeal): { text: string; priority: number } {
  const price = deal.guidePrice ?? deal.askingPrice;
  const sym = deal.currency === "GBP" ? "£" : "$";

  if (deal.hasLisPendens || deal.hasInsolvency) {
    return {
      text: "Owner company shows financial stress — potential below-market opportunity",
      priority: 1,
    };
  }

  if (deal.auctionDate) {
    const days = Math.ceil(
      (new Date(deal.auctionDate).getTime() - Date.now()) / 86_400_000
    );
    const priceStr = price ? `Guide price ${sym}${(price / 1000).toFixed(0)}k` : "Guide price TBC";
    return {
      text: days > 0
        ? `${priceStr} — auction in ${days} day${days !== 1 ? "s" : ""}`
        : `${priceStr} — auction imminent`,
      priority: 2,
    };
  }

  if (deal.lastSaleYear && deal.lastSaleYear <= new Date().getFullYear() - 10) {
    return {
      text: `Held since ${deal.lastSaleYear} — no recent transaction. Owner may be open to approach.`,
      priority: 3,
    };
  }

  if (deal.hasPlanningApplication) {
    return {
      text: "Change of use application submitted — development potential identified",
      priority: 4,
    };
  }

  if (deal.solarIncomeEstimate && deal.solarIncomeEstimate > 0) {
    const sym2 = deal.currency === "GBP" ? "£" : "$";
    return {
      text: `Est. ${sym2}${deal.solarIncomeEstimate.toLocaleString()}/yr rooftop income available — not yet activated`,
      priority: 5,
    };
  }

  if (deal.inFloodZone) {
    return {
      text: "Flood zone asset — typically trades 15–25% below comparable. Mitigation could unlock value.",
      priority: 6,
    };
  }

  return {
    text: "RealHQ is analysing this asset — check back shortly",
    priority: 7,
  };
}

// ── Deal Intelligence Score dots ──────────────────────────────────────
function IntelligenceDots({ count }: { count: number }) {
  const clamped = Math.min(5, Math.max(0, count));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="text-[10px]"
          style={{ color: i < clamped ? "#0A8A4C" : "#D1D5DB" }}
        >
          ●
        </span>
      ))}
    </div>
  );
}

// ── Source tag badge ──────────────────────────────────────────────────
function SourceTag({ tag }: { tag: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Auction:          { bg: "rgba(245,169,74,0.12)", text: "#F5A94A" },
    "Pre-market":     { bg: "rgba(22,71,232,0.10)",  text: "#1647E8" },
    "Planning signal":{ bg: "rgba(10,138,76,0.10)",  text: "#0A8A4C" },
    Distressed:       { bg: "rgba(240,96,64,0.10)",  text: "#f06040" },
    LoopNet:          { bg: "rgba(99,102,241,0.10)", text: "#6366F1" },
  };
  const c = colors[tag] ?? { bg: "rgba(107,114,128,0.10)", text: "#6B7280" };
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {tag}
    </span>
  );
}

function fmtPrice(price: number | null, currency: string) {
  if (!price) return "POA";
  const sym = currency === "GBP" ? "£" : "$";
  if (price >= 1_000_000) return `${sym}${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1_000) return `${sym}${(price / 1_000).toFixed(0)}k`;
  return `${sym}${price.toLocaleString()}`;
}

// ── Expanded Deal Panel ───────────────────────────────────────────────
function ExpandedDeal({
  deal,
  onClose,
  onInterested,
  onPass,
}: {
  deal: ScoutDeal;
  onClose: () => void;
  onInterested: () => void;
  onPass: () => void;
}) {
  const headline = getHeadlineInsight(deal);
  const displayPrice = deal.guidePrice ?? deal.askingPrice;

  const signals: { label: string; value: string }[] = [];
  if (deal.ownerName) signals.push({ label: "Owner", value: deal.ownerName });
  if (deal.capRate) signals.push({ label: "Cap rate", value: `${deal.capRate.toFixed(2)}%` });
  if (deal.brokerName) signals.push({ label: "Broker", value: deal.brokerName });
  if (deal.daysOnMarket !== null && deal.daysOnMarket !== undefined) signals.push({ label: "Days on market", value: `${deal.daysOnMarket} days` });
  if (deal.lastSaleYear) signals.push({ label: "Last sale", value: String(deal.lastSaleYear) });
  if (deal.auctionDate) signals.push({ label: "Auction", value: new Date(deal.auctionDate).toLocaleDateString("en-GB") });
  if (deal.hasPlanningApplication) signals.push({ label: "Planning", value: "Change of use application submitted" });
  if (deal.solarIncomeEstimate) signals.push({ label: "Solar", value: `${deal.currency === "GBP" ? "£" : "$"}${deal.solarIncomeEstimate.toLocaleString()}/yr estimated` });
  if (deal.inFloodZone) signals.push({ label: "Flood zone", value: "High flood risk area" });
  if (deal.hasLisPendens || deal.hasInsolvency) signals.push({ label: "Stress signal", value: "Financial distress indicators found" });

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" style={{ backgroundColor: "rgba(11,22,34,0.7)" }} />
      <div
        className="w-full max-w-lg flex flex-col overflow-y-auto"
        style={{ backgroundColor: "#fff", borderLeft: "1px solid #E5E7EB" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: "#111827" }}>{deal.address}</div>
            <div className="text-xs mb-2" style={{ color: "#9CA3AF" }}>
              {deal.assetType}{deal.sqft ? ` · ${deal.sqft.toLocaleString()} sqft` : ""}
            </div>
            <SourceTag tag={deal.sourceTag} />
          </div>
          <button onClick={onClose} className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E5E7EB", color: "#9CA3AF" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Satellite placeholder */}
        {deal.satelliteImageUrl ? (
          <img src={deal.satelliteImageUrl} alt={deal.address} className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
            <div className="text-center">
              <div className="text-2xl mb-1">📍</div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>{deal.address}</div>
            </div>
          </div>
        )}

        {/* Headline insight */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>KEY INSIGHT</div>
          <div className="text-sm font-medium" style={{ color: "#111827" }}>{headline.text}</div>
        </div>

        {/* Price + Intelligence */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <div>
            <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>{deal.guidePrice ? "Guide price" : "Asking price"}</div>
            <div className="text-xl font-bold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
              {fmtPrice(displayPrice, deal.currency)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Deal intelligence</div>
            <IntelligenceDots count={deal.signalCount} />
          </div>
        </div>

        {/* Signals */}
        {signals.length > 0 && (
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9CA3AF" }}>SIGNALS FOUND</div>
            <div className="space-y-2">
              {signals.map((s) => (
                <div key={s.label} className="flex items-start justify-between gap-3 text-xs">
                  <span className="font-medium" style={{ color: "#6B7280" }}>{s.label}</span>
                  <span className="text-right" style={{ color: "#111827" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload prompt */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <div className="text-xs mb-3" style={{ color: "#9CA3AF" }}>
            Got a brochure or OM for this asset? Drop it in — we&apos;ll pull the numbers.
          </div>
          <button
            className="w-full py-2.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
            style={{ borderColor: "#E5E7EB", color: "#6B7280", backgroundColor: "#F9FAFB" }}
          >
            Upload brochure or marketing pack
          </button>
        </div>

        {/* Actions */}
        <div className="px-5 py-4">
          {deal.userReaction === "interested" ? (
            <div className="flex items-center gap-2 py-2.5 rounded-lg px-4 text-sm font-medium" style={{ backgroundColor: "rgba(10,138,76,0.08)", color: "#0A8A4C" }}>
              <span>✓</span> Marked as interested — RealHQ monitoring
            </div>
          ) : deal.userReaction === "passed" ? (
            <div className="py-2.5 text-sm text-center" style={{ color: "#D1D5DB" }}>Passed — monitoring for price reduction</div>
          ) : (
            <div className="flex gap-3">
              <button onClick={onInterested} className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: "#0A8A4C", color: "#fff" }}>
                Interested ✓
              </button>
              <button onClick={onPass} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{ backgroundColor: "#E5E7EB", color: "#9CA3AF" }}>
                Pass ✗
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Swipe Card (full-screen, first 8) ────────────────────────────────
function SwipeCard({
  deal,
  remaining,
  onInterested,
  onPass,
}: {
  deal: ScoutDeal;
  remaining: number;
  onInterested: () => void;
  onPass: () => void;
}) {
  const headline = getHeadlineInsight(deal);
  const displayPrice = deal.guidePrice ?? deal.askingPrice;

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress */}
      <div className="px-5 pt-4 pb-2">
        <div className="text-xs text-center" style={{ color: "#9CA3AF" }}>
          {remaining > 0 ? `${remaining} more to personalise your feed` : "Feed personalised — swipe complete"}
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 px-4 pb-4 flex flex-col">
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {/* Image */}
          {deal.satelliteImageUrl ? (
            <img src={deal.satelliteImageUrl} alt={deal.address} className="w-full h-52 object-cover" />
          ) : (
            <div className="w-full h-52 flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
              <div className="text-center">
                <div className="text-4xl mb-2">📍</div>
                <div className="text-sm font-medium" style={{ color: "#6B7280" }}>{deal.address}</div>
              </div>
            </div>
          )}

          <div className="flex-1 p-5 flex flex-col">
            {/* Address + type */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-base font-bold mb-0.5" style={{ color: "#111827" }}>{deal.address}</div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>
                  {deal.assetType}{deal.sqft ? ` · ${deal.sqft.toLocaleString()} sqft` : ""}
                </div>
              </div>
              <SourceTag tag={deal.sourceTag} />
            </div>

            {/* Price */}
            <div className="text-2xl font-bold mb-3" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
              {fmtPrice(displayPrice, deal.currency)}
            </div>

            {/* Headline insight */}
            <div className="flex-1 rounded-xl p-4 mb-4" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <div className="text-sm" style={{ color: "#374151", lineHeight: 1.6 }}>{headline.text}</div>
            </div>

            {/* Intelligence score */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs" style={{ color: "#9CA3AF" }}>Deal intelligence</span>
              <IntelligenceDots count={deal.signalCount} />
            </div>

            {/* Swipe buttons */}
            <div className="flex gap-4">
              <button
                onClick={onPass}
                className="flex-1 py-4 rounded-2xl text-lg font-bold transition-all active:scale-[0.95]"
                style={{ backgroundColor: "#FEF2F2", color: "#f06040", border: "2px solid #FCA5A5" }}
              >
                ✗ Pass
              </button>
              <button
                onClick={onInterested}
                className="flex-1 py-4 rounded-2xl text-lg font-bold transition-all active:scale-[0.95]"
                style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "2px solid #86EFAC" }}
              >
                ✓ Interested
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────────
function GridCard({
  deal,
  onClick,
}: {
  deal: ScoutDeal;
  onClick: () => void;
}) {
  const headline = getHeadlineInsight(deal);
  const displayPrice = deal.guidePrice ?? deal.askingPrice;

  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
      style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
      onClick={onClick}
    >
      {/* Address + source */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight truncate mb-0.5" style={{ color: "#111827" }}>{deal.address}</div>
          <div className="text-xs truncate" style={{ color: "#9CA3AF" }}>
            {deal.assetType}{deal.sqft ? ` · ${deal.sqft.toLocaleString()} sqft` : ""}
          </div>
        </div>
        <SourceTag tag={deal.sourceTag} />
      </div>

      {/* Price + cap rate */}
      <div className="flex items-baseline gap-2 mb-3">
        <div className="text-lg font-bold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
          {fmtPrice(displayPrice, deal.currency)}
        </div>
        {deal.capRate && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(10,138,76,0.08)", color: "#0A8A4C" }}>
            {deal.capRate.toFixed(2)}% cap
          </span>
        )}
      </div>

      {/* Headline insight */}
      <div className="rounded-lg p-3 mb-3 text-xs leading-relaxed" style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}>
        {headline.text}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <IntelligenceDots count={deal.signalCount} />
        {deal.userReaction === "interested" && (
          <span className="text-xs font-medium" style={{ color: "#0A8A4C" }}>✓ Interested</span>
        )}
        {deal.userReaction === "passed" && (
          <span className="text-xs" style={{ color: "#D1D5DB" }}>Passed</span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ScoutPage() {
  const [deals, setDeals] = useState<ScoutDeal[]>([]);
  const [reactionCount, setReactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedDeal, setExpandedDeal] = useState<ScoutDeal | null>(null);
  const [interestCount, setInterestCount] = useState(0);
  const [showLearning, setShowLearning] = useState(false);

  // Swipe mode active when reactionCount < 8 and there are unreacted deals
  const unreactedDeals = deals.filter((d) => !d.userReaction);
  const inSwipeMode = reactionCount < 8 && unreactedDeals.length > 0;
  const swipeDeal = inSwipeMode ? unreactedDeals[0] : null;
  const remaining = Math.max(0, 8 - reactionCount - 1);

  useEffect(() => {
    fetch("/api/scout/deals")
      .then((r) => r.json())
      .then((data) => {
        setDeals(data.deals ?? []);
        setReactionCount(data.reactionCount ?? 0);
        const interests = (data.deals ?? []).filter((d: ScoutDeal) => d.userReaction === "interested").length;
        setInterestCount(interests);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const react = useCallback(
    async (dealId: string, reaction: "interested" | "passed") => {
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, userReaction: reaction } : d))
      );
      setReactionCount((c) => c + 1);

      if (reaction === "interested") {
        const newCount = interestCount + 1;
        setInterestCount(newCount);
        if (newCount === 5) {
          setShowLearning(true);
          setTimeout(() => setShowLearning(false), 3000);
        }
      }

      await fetch(`/api/scout/deals/${dealId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      }).catch(() => {});
    },
    [interestCount]
  );

  return (
    <AppShell>
      <TopBar title="Deal Scout" />

      {/* Learning notification */}
      {showLearning && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg"
          style={{ backgroundColor: "rgba(10,138,76,0.95)", color: "#fff" }}
        >
          Your feed is learning ✓
        </div>
      )}

      {/* Expanded deal panel */}
      {expandedDeal && (
        <ExpandedDeal
          deal={expandedDeal}
          onClose={() => setExpandedDeal(null)}
          onInterested={() => {
            react(expandedDeal.id, "interested");
            setExpandedDeal(null);
          }}
          onPass={() => {
            react(expandedDeal.id, "passed");
            setExpandedDeal(null);
          }}
        />
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm" style={{ color: "#9CA3AF" }}>Finding deals…</div>
        </div>
      ) : deals.length === 0 ? (
        /* Empty state */
        <main className="flex-1 p-4 lg:p-6">
          <div
            className="rounded-2xl p-10 flex flex-col items-center text-center gap-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            {/* Animated scanning indicator */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: "rgba(22,71,232,0.12)" }} />
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(22,71,232,0.08)", border: "1px solid rgba(22,71,232,0.2)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#1647E8" strokeWidth="1.5" />
                  <path d="M16.5 16.5L21 21" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-xl font-bold mb-2" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                RealHQ is scanning the market for your next asset
              </div>
              <div className="text-sm max-w-md mx-auto" style={{ color: "#6B7280", lineHeight: 1.6 }}>
                We screen Land Registry, Companies House, auction houses, and planning portals daily.
                Add your portfolio and deals matching your criteria will start appearing.
              </div>
            </div>
            <a
              href="/properties/add"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#1647E8", color: "#fff" }}
            >
              Add portfolio to start scouting
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </main>
      ) : inSwipeMode && swipeDeal ? (
        /* Swipe mode — full height */
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <SwipeCard
            deal={swipeDeal}
            remaining={remaining}
            onInterested={() => react(swipeDeal.id, "interested")}
            onPass={() => react(swipeDeal.id, "passed")}
          />
        </div>
      ) : (
        /* Grid mode — after 8 reactions */
        <main className="flex-1 p-4 lg:p-6 space-y-4">
          {/* Interested count */}
          {interestCount > 0 && (
            <div className="text-xs px-1" style={{ color: "#9CA3AF" }}>
              {interestCount} deal{interestCount !== 1 ? "s" : ""} marked as interested · Feed personalised
            </div>
          )}

          {/* Active deals grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals
              .filter((d) => d.userReaction !== "passed")
              .map((d) => (
                <GridCard key={d.id} deal={d} onClick={() => setExpandedDeal(d)} />
              ))}
          </div>

          {/* Passed deals */}
          {deals.filter((d) => d.userReaction === "passed").length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#D1D5DB" }}>
                Passed — Monitoring for price reduction
              </div>
              <div className="space-y-1">
                {deals
                  .filter((d) => d.userReaction === "passed")
                  .map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs py-1">
                      <span style={{ color: "#9CA3AF" }}>{d.address}</span>
                      <span style={{ color: "#D1D5DB" }}>{fmtPrice(d.guidePrice ?? d.askingPrice, d.currency)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </main>
      )}
    </AppShell>
  );
}
