"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
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
  // Extended intelligence fields (present for demo + enriched live deals)
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

// ── Source tag badge ──────────────────────────────────────────────────
function SourceTag({ tag }: { tag: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Auction:            { bg: "rgba(245,169,74,0.12)", text: "#F5A94A" },
    "Pre-market":       { bg: "rgba(22,71,232,0.10)",  text: "#1647E8" },
    "Planning signal":  { bg: "rgba(10,138,76,0.10)",  text: "#0A8A4C" },
    Distressed:         { bg: "rgba(240,96,64,0.10)",  text: "#f06040" },
    LoopNet:            { bg: "rgba(99,102,241,0.10)", text: "#6366F1" },
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

// ── Intelligence dots ─────────────────────────────────────────────────
function IntelligenceDots({ count }: { count: number }) {
  const clamped = Math.min(5, Math.max(0, count));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-[10px]" style={{ color: i < clamped ? "#0A8A4C" : "#D1D5DB" }}>●</span>
      ))}
    </div>
  );
}

// ── Not For Us Panel ──────────────────────────────────────────────────
const NOT_FOR_US_REASONS = [
  "Price too high",
  "Cap rate too low",
  "Wrong location",
  "Wrong asset type",
  "Too much vacancy",
  "Already seen it",
];

function NotForUsPanel({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reasons: string[], freetext: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [freetext, setFreetext] = useState("");

  function toggle(r: string) {
    setSelected((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9CA3AF" }}>
          Why is this not for you?
        </div>
        <div className="flex flex-wrap gap-2">
          {NOT_FOR_US_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => toggle(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                selected.includes(r)
                  ? { backgroundColor: "#111827", color: "#fff" }
                  : { backgroundColor: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs mb-1.5" style={{ color: "#6B7280" }}>
          Anything else? Tell us in your own words.
        </div>
        <textarea
          value={freetext}
          onChange={(e) => setFreetext(e.target.value)}
          placeholder="No character limit, no structure required."
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg text-xs resize-none"
          style={{ border: "1px solid #E5E7EB", color: "#111827", outline: "none", lineHeight: 1.6 }}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(selected, freetext)}
          className="flex-1 py-2.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: "#111827", color: "#fff" }}
        >
          Submit feedback
        </button>
      </div>
    </div>
  );
}

// ── Action Suite ──────────────────────────────────────────────────────
type ActionKey = "track" | "interest" | "call" | "viewing" | "offer";

const ACTION_ROW_STYLE = {
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  overflow: "hidden" as const,
  marginBottom: 6,
};

// Defined at module scope to keep a stable identity across renders.
// If defined inside ActionSuite, React remounts it on every keystroke.
function ActionRow({
  actionKey,
  label,
  icon,
  open,
  submitted,
  onToggle,
  children,
}: {
  actionKey: ActionKey;
  label: string;
  icon: string;
  open: ActionKey | null;
  submitted: Partial<Record<ActionKey, boolean>>;
  onToggle: () => void;
  children: ReactNode;
}) {
  const done = submitted[actionKey];
  return (
    <div style={ACTION_ROW_STYLE}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium transition-colors"
        style={{
          backgroundColor: done ? "rgba(10,138,76,0.04)" : open === actionKey ? "#F9FAFB" : "#fff",
          color: done ? "#0A8A4C" : "#111827",
        }}
        onClick={() => !done && onToggle()}
      >
        <span className="flex items-center gap-2">
          <span>{icon}</span>
          <span>{done ? `${label} — sent for your review` : label}</span>
        </span>
        {done ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(10,138,76,0.1)", color: "#0A8A4C" }}>Done ✓</span>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open === actionKey ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {open === actionKey && !done && (
        <div style={{ borderTop: "1px solid #E5E7EB" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ActionSuite({
  deal,
  isTracking,
  onToggleTrack,
  onInterested,
}: {
  deal: ScoutDeal;
  isTracking: boolean;
  onToggleTrack: () => void;
  onInterested: () => void;
}) {
  const [open, setOpen] = useState<ActionKey | null>(null);
  const [interestText, setInterestText] = useState(
    `Hi,\n\nI'm a commercial property investor and came across ${deal.address}. I'd welcome a brief call to discuss the asset.\n\nI have an existing FL-based portfolio and am actively looking to add to it in the current market.\n\nPlease let me know your availability.\n\nBest regards`
  );
  const [callWith, setCallWith] = useState<"agent" | "owner" | "either">("agent");
  const [viewingDate, setViewingDate] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [submitted, setSubmitted] = useState<Partial<Record<ActionKey, boolean>>>({});

  const displayPrice = deal.guidePrice ?? deal.askingPrice;

  function markSubmitted(key: ActionKey) {
    setSubmitted((prev) => ({ ...prev, [key]: true }));
    setOpen(null);
    if (key === "interest") onInterested();
  }

  function toggle(key: ActionKey) {
    setOpen((prev) => (prev === key ? null : key));
  }

  return (
    <div className="px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9CA3AF" }}>Actions</div>

      {/* Track deal — always on */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-lg mb-2"
        style={{ backgroundColor: isTracking ? "rgba(10,138,76,0.06)" : "#F9FAFB", border: `1px solid ${isTracking ? "rgba(10,138,76,0.2)" : "#E5E7EB"}` }}
      >
        <div className="flex items-center gap-2">
          <span>🔔</span>
          <div>
            <div className="text-xs font-medium" style={{ color: isTracking ? "#0A8A4C" : "#111827" }}>
              Track this deal
            </div>
            {isTracking && (
              <div className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>
                Price drops · Status changes · Market alerts
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onToggleTrack}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={
            isTracking
              ? { backgroundColor: "rgba(10,138,76,0.12)", color: "#0A8A4C" }
              : { backgroundColor: "#E5E7EB", color: "#6B7280" }
          }
        >
          {isTracking ? "Tracking ✓" : "Track"}
        </button>
      </div>

      {/* Express interest */}
      <ActionRow actionKey="interest" label="Express interest" icon="✉️" open={open} submitted={submitted} onToggle={() => toggle("interest")}>
        <div className="p-4 space-y-3">
          <div className="text-[10px] px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(22,71,232,0.06)", color: "#1647E8", border: "1px solid rgba(22,71,232,0.12)" }}>
            RealHQ does not send without your explicit approval on this action.
          </div>
          <textarea
            value={interestText}
            onChange={(e) => setInterestText(e.target.value)}
            rows={6}
            className="w-full px-3 py-2.5 text-xs rounded-lg resize-none"
            style={{ border: "1px solid #E5E7EB", color: "#111827", outline: "none", lineHeight: 1.7 }}
          />
          <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
            {deal.brokerName ? `Addressed to: ${deal.brokerName}` : "Addressed to: listing agent"}
          </div>
          <button
            onClick={() => markSubmitted("interest")}
            className="w-full py-2.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Review &amp; approve send →
          </button>
        </div>
      </ActionRow>

      {/* Request a call */}
      <ActionRow actionKey="call" label="Request a call" icon="📞" open={open} submitted={submitted} onToggle={() => toggle("call")}>
        <div className="p-4 space-y-3">
          <div className="text-[10px] px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(22,71,232,0.06)", color: "#1647E8", border: "1px solid rgba(22,71,232,0.12)" }}>
            RealHQ does not send without your explicit approval on this action.
          </div>
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: "#374151" }}>Request call with</div>
            <div className="flex gap-2">
              {(["agent", "owner", "either"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCallWith(opt)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                  style={
                    callWith === opt
                      ? { backgroundColor: "#111827", color: "#fff" }
                      : { backgroundColor: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => markSubmitted("call")}
            className="w-full py-2.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Review &amp; approve send →
          </button>
        </div>
      </ActionRow>

      {/* Arrange viewing */}
      <ActionRow actionKey="viewing" label="Arrange viewing" icon="🗓️" open={open} submitted={submitted} onToggle={() => toggle("viewing")}>
        <div className="p-4 space-y-3">
          <div className="text-[10px] px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(22,71,232,0.06)", color: "#1647E8", border: "1px solid rgba(22,71,232,0.12)" }}>
            RealHQ does not send without your explicit approval on this action.
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "#6B7280" }}>Preferred date</div>
            <input
              type="date"
              value={viewingDate}
              onChange={(e) => setViewingDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs"
              style={{ border: "1px solid #E5E7EB", color: "#111827", outline: "none" }}
            />
          </div>
          <button
            onClick={() => markSubmitted("viewing")}
            className="w-full py-2.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Review &amp; approve send →
          </button>
        </div>
      </ActionRow>

      {/* Draft offer letter */}
      <ActionRow actionKey="offer" label="Draft offer letter" icon="📄" open={open} submitted={submitted} onToggle={() => toggle("offer")}>
        <div className="p-4 space-y-3">
          <div className="text-[10px] px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(22,71,232,0.06)", color: "#1647E8", border: "1px solid rgba(22,71,232,0.12)" }}>
            RealHQ does not send without your explicit approval on this action.
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "#6B7280" }}>
              Your offer price ({sym(deal.currency)})
            </div>
            <input
              type="number"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder={displayPrice ? String(Math.round(displayPrice * 0.95)) : "e.g. 1750000"}
              className="w-full px-3 py-2 rounded-lg text-xs"
              style={{ border: "1px solid #E5E7EB", color: "#111827", outline: "none" }}
            />
            {displayPrice && offerPrice && !isNaN(parseFloat(offerPrice)) && (
              <div className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>
                {((parseFloat(offerPrice) / displayPrice - 1) * 100).toFixed(1)}% vs asking
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => markSubmitted("offer")}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Draft &amp; review →
            </button>
          </div>
          <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
            Pre-filled from your portfolio data. Edit before approving.
          </div>
        </div>
      </ActionRow>
    </div>
  );
}

// ── Full Deal Panel (slide-in drawer) ──────────────────────────────────
function DealPanel({
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
  const [isTracking, setIsTracking] = useState(deal.userReaction === "interested");
  const [showNotForUs, setShowNotForUs] = useState(false);
  const [passedWithFeedback, setPassedWithFeedback] = useState(false);

  const displayPrice = deal.guidePrice ?? deal.askingPrice;
  const s = sym(deal.currency);

  // Stats grid entries
  const stats: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Asking", value: fmtPrice(displayPrice, deal.currency), highlight: true },
    deal.pricePerSqft
      ? { label: "Price / sqft", value: `${s}${deal.pricePerSqft}` }
      : { label: "Size", value: deal.sqft ? `${deal.sqft.toLocaleString()} sqft` : "–" },
    deal.capRate
      ? {
          label: "Cap rate",
          value: `${deal.capRate.toFixed(2)}% ${deal.marketCapRate ? `(mkt ${deal.marketCapRate.toFixed(1)}%)` : ""}`,
          highlight: deal.marketCapRate ? deal.capRate > deal.marketCapRate : false,
        }
      : { label: "Cap rate", value: "–" },
    deal.noi
      ? { label: "Est. NOI", value: `${s}${fmtNum(deal.noi)}/yr` }
      : { label: "NOI", value: "–" },
    deal.occupancy != null
      ? { label: "Occupancy", value: `${deal.occupancy}%` }
      : { label: "Type", value: deal.assetType },
    deal.wault != null
      ? { label: "WAULT", value: `${deal.wault.toFixed(1)} yrs` }
      : deal.yearBuilt
      ? { label: "Year built", value: String(deal.yearBuilt) }
      : { label: "On market", value: deal.daysOnMarket != null ? `${deal.daysOnMarket} days` : "–" },
  ];

  function handleNotForUsSubmit(reasons: string[], freetext: string) {
    // Fire-and-forget — no alert, no time promise
    fetch(`/api/scout/deals/${deal.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: "passed", reasons, freetext }),
    }).catch(() => {});
    setPassedWithFeedback(true);
    setShowNotForUs(false);
    onPass();
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" style={{ backgroundColor: "rgba(11,22,34,0.6)" }} />
      <div
        className="w-full max-w-lg flex flex-col overflow-y-auto"
        style={{ backgroundColor: "#fff", borderLeft: "1px solid #E5E7EB" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 sticky top-0 z-10" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#fff" }}>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold mb-1 leading-tight" style={{ color: "#111827" }}>
              {deal.address}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                {deal.assetType}{deal.sqft ? ` · ${deal.sqft.toLocaleString()} sqft` : ""}
              </span>
              <SourceTag tag={deal.sourceTag} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Satellite / hero image */}
        <div className="relative w-full h-52 flex-shrink-0">
          {deal.satelliteImageUrl ? (
            <img src={deal.satelliteImageUrl} alt={deal.address} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
              <div className="text-center">
                <div className="text-4xl mb-1">📍</div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>{deal.address}</div>
              </div>
            </div>
          )}

          {/* Time on market — top left */}
          {deal.daysOnMarket != null && (
            <div
              className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}
            >
              {deal.daysOnMarket}d on market
            </div>
          )}

          {/* Price badge — top right */}
          {deal.auctionDate && (
            <div
              className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ backgroundColor: "rgba(245,169,74,0.92)", color: "#fff" }}
            >
              Auction{" "}
              {(() => {
                const d = Math.ceil((new Date(deal.auctionDate).getTime() - Date.now()) / 86_400_000);
                return d > 0 ? `in ${d}d` : "imminent";
              })()}
            </div>
          )}
          {(deal.hasLisPendens || deal.hasInsolvency) && !deal.auctionDate && (
            <div
              className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ backgroundColor: "rgba(240,96,64,0.9)", color: "#fff" }}
            >
              Distressed
            </div>
          )}

          {/* View brochure link */}
          <a
            href={deal.sourceUrl ?? "#"}
            target={deal.sourceUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff" }}
            onClick={(e) => { if (!deal.sourceUrl) e.preventDefault(); }}
          >
            View brochure / IM →
          </a>
        </div>

        {/* Stats grid */}
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <div className="text-[10px] mb-0.5" style={{ color: "#9CA3AF" }}>{stat.label}</div>
                <div
                  className="text-sm font-bold truncate"
                  style={{
                    color: stat.highlight ? "#0A8A4C" : "#111827",
                    fontFamily: stat.label === "Asking" || stat.label === "Est. NOI" ? "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" : undefined,
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Year built + broker footer row */}
          <div className="flex items-center justify-between mt-3 text-[10px]" style={{ color: "#9CA3AF" }}>
            {deal.yearBuilt && <span>Built {deal.yearBuilt}</span>}
            {deal.brokerName && <span>{deal.brokerName}</span>}
            <IntelligenceDots count={deal.signalCount} />
          </div>
        </div>

        {/* RealHQ analysis strip */}
        {(deal.rentUplift || deal.planningPlay || deal.portfolioComparison) && (
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9CA3AF" }}>
              RealHQ Analysis
            </div>
            <div className="space-y-3">
              {deal.rentUplift && (
                <div className="flex gap-3">
                  <div
                    className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs mt-0.5"
                    style={{ backgroundColor: "rgba(10,138,76,0.1)", color: "#0A8A4C" }}
                  >
                    ↑
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#0A8A4C" }}>Rent uplift play</div>
                    <div className="text-xs leading-relaxed" style={{ color: "#374151" }}>{deal.rentUplift}</div>
                  </div>
                </div>
              )}
              {deal.planningPlay && (
                <div className="flex gap-3">
                  <div
                    className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs mt-0.5"
                    style={{ backgroundColor: "rgba(22,71,232,0.08)", color: "#1647E8" }}
                  >
                    🗺
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#1647E8" }}>Planning</div>
                    <div className="text-xs leading-relaxed" style={{ color: "#374151" }}>{deal.planningPlay}</div>
                  </div>
                </div>
              )}
              {deal.portfolioComparison && (
                <div className="flex gap-3">
                  <div
                    className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs mt-0.5"
                    style={{ backgroundColor: "rgba(245,169,74,0.1)", color: "#F5A94A" }}
                  >
                    ◎
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#F5A94A" }}>Portfolio fit</div>
                    <div className="text-xs leading-relaxed" style={{ color: "#374151" }}>{deal.portfolioComparison}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tracking context — always shown when tracking */}
        {isTracking && (
          <div className="px-5 py-3" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "rgba(10,138,76,0.03)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#0A8A4C" }}>
              Tracking active
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]" style={{ color: "#6B7280" }}>
              {[
                "Price drops",
                "Status changes (under offer, withdrawn)",
                "30 / 60 / 90 days on market",
                "Better match found",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1">
                  <span style={{ color: "#0A8A4C" }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] mt-2" style={{ color: "#9CA3AF" }}>
              Alerts delivered to platform + email. RealHQ notifies the agent on your behalf when relevant.
            </div>
          </div>
        )}

        {/* Action suite or Not For Us */}
        {deal.userReaction === "interested" ? (
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <span className="text-sm" style={{ color: "#0A8A4C" }}>✓</span>
            <span className="text-sm font-medium" style={{ color: "#0A8A4C" }}>Interested — RealHQ is monitoring this deal</span>
          </div>
        ) : deal.userReaction === "passed" || passedWithFeedback ? (
          <div className="px-5 py-4 text-xs text-center" style={{ color: "#9CA3AF", borderBottom: "1px solid #E5E7EB" }}>
            Passed — monitoring for price reduction
          </div>
        ) : showNotForUs ? (
          <div style={{ borderBottom: "1px solid #E5E7EB" }}>
            <NotForUsPanel
              onSubmit={handleNotForUsSubmit}
              onCancel={() => setShowNotForUs(false)}
            />
            <div className="px-5 pb-4 text-[10px]" style={{ color: "#9CA3AF" }}>
              RealHQ will refine your criteria. If this deal comes back at a better price, or a near-identical one appears, we&apos;ll let you know.
            </div>
          </div>
        ) : (
          <>
            <ActionSuite
              deal={deal}
              isTracking={isTracking}
              onToggleTrack={() => setIsTracking((v) => !v)}
              onInterested={onInterested}
            />
            <div className="px-5 pb-5 pt-1" style={{ borderTop: "1px solid #E5E7EB" }}>
              <button
                onClick={() => setShowNotForUs(true)}
                className="w-full py-2.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}
              >
                Not for us
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────────
function GridCard({ deal, onClick }: { deal: ScoutDeal; onClick: () => void }) {
  const displayPrice = deal.guidePrice ?? deal.askingPrice;
  const s = sym(deal.currency);

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
      style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
      onClick={onClick}
    >
      {/* Satellite */}
      <div className="relative w-full h-36">
        {deal.satelliteImageUrl ? (
          <img src={deal.satelliteImageUrl} alt={deal.address} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
            <div className="text-center">
              <div className="text-2xl mb-1">📍</div>
              <div className="text-[10px]" style={{ color: "#9CA3AF" }}>{deal.assetType}</div>
            </div>
          </div>
        )}
        {deal.daysOnMarket != null && (
          <div className="absolute top-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}>
            {deal.daysOnMarket}d on market
          </div>
        )}
        {deal.auctionDate && (
          <div className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,169,74,0.9)", color: "#fff" }}>
            Auction
          </div>
        )}
        {(deal.hasLisPendens || deal.hasInsolvency) && !deal.auctionDate && (
          <div className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(240,96,64,0.85)", color: "#fff" }}>
            Distressed
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Address + source */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight truncate mb-0.5" style={{ color: "#111827" }}>
              {deal.address}
            </div>
            <div className="text-xs truncate" style={{ color: "#9CA3AF" }}>
              {deal.assetType}{deal.sqft ? ` · ${deal.sqft.toLocaleString()} sqft` : ""}
            </div>
          </div>
          <SourceTag tag={deal.sourceTag} />
        </div>

        {/* Price + cap rate */}
        <div className="flex items-baseline gap-2 mt-2 mb-2">
          <div
            className="text-lg font-bold"
            style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
          >
            {fmtPrice(displayPrice, deal.currency)}
          </div>
          {deal.capRate && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(10,138,76,0.08)", color: "#0A8A4C" }}>
              {deal.capRate.toFixed(2)}% cap
            </span>
          )}
          {deal.pricePerSqft && (
            <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
              {s}{deal.pricePerSqft}/sqft
            </span>
          )}
        </div>

        {/* Analysis teaser */}
        {deal.rentUplift && (
          <div className="rounded-lg p-2.5 mb-2 text-[10px] leading-relaxed line-clamp-2" style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}>
            {deal.rentUplift}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1">
          <IntelligenceDots count={deal.signalCount} />
          {deal.userReaction === "interested" && (
            <span className="text-[10px] font-medium" style={{ color: "#0A8A4C" }}>✓ Interested</span>
          )}
          {deal.userReaction === "passed" && (
            <span className="text-[10px]" style={{ color: "#D1D5DB" }}>Passed</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ScoutPage() {
  const [deals, setDeals] = useState<ScoutDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeal, setExpandedDeal] = useState<ScoutDeal | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scout/deals", { signal: AbortSignal.timeout(8000) })
      .then((r) => r.json())
      .then((data) => {
        setDeals(data.deals ?? []);
        setIsDemo(data.isDemo ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const react = useCallback(async (dealId: string, reaction: "interested" | "passed") => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, userReaction: reaction } : d)));
    // Optimistic update only for demo deals — no API call needed for demo IDs
    if (!dealId.startsWith("demo-")) {
      await fetch(`/api/scout/deals/${dealId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      }).catch(() => {});
    }
  }, []);

  // "Not for us" feedback notification
  useEffect(() => {
    if (feedbackSubmitted) {
      const t = setTimeout(() => setFeedbackSubmitted(null), 4000);
      return () => clearTimeout(t);
    }
  }, [feedbackSubmitted]);

  const activeDeals = deals.filter((d) => d.userReaction !== "passed");
  const passedDeals = deals.filter((d) => d.userReaction === "passed");

  return (
    <AppShell>
      <TopBar title="Deal Scout" />

      {/* Feedback notification */}
      {feedbackSubmitted && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg max-w-xs text-center"
          style={{ backgroundColor: "rgba(17,24,39,0.92)", color: "#fff" }}
        >
          RealHQ will refine your criteria. If this deal comes back at a better price, or a near-identical one appears, we&apos;ll let you know.
        </div>
      )}

      {/* Deal panel */}
      {expandedDeal && (
        <DealPanel
          deal={expandedDeal}
          onClose={() => setExpandedDeal(null)}
          onInterested={() => {
            react(expandedDeal.id, "interested");
            setExpandedDeal((d) => d ? { ...d, userReaction: "interested" } : null);
          }}
          onPass={() => {
            react(expandedDeal.id, "passed");
            setFeedbackSubmitted(expandedDeal.id);
            setExpandedDeal(null);
          }}
        />
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm" style={{ color: "#9CA3AF" }}>Loading deals…</div>
        </div>
      ) : deals.length === 0 ? (
        <main className="flex-1 p-4 lg:p-6">
          <div
            className="rounded-2xl p-10 flex flex-col items-center text-center gap-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
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
                RealHQ is scanning the market
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
      ) : (
        <main className="flex-1 p-4 lg:p-6 space-y-4">
          {/* Demo banner */}
          {isDemo && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
              style={{ backgroundColor: "rgba(22,71,232,0.06)", border: "1px solid rgba(22,71,232,0.12)", color: "#1647E8" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#1647E8" strokeWidth="1.2" />
                <path d="M7 6v4M7 4.5v.5" stroke="#1647E8" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span>
                Sample deals from the FL Mixed Portfolio market. Add your portfolio to receive personalised deal flow.
              </span>
            </div>
          )}

          {/* Active deals grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDeals.map((d) => (
              <GridCard key={d.id} deal={d} onClick={() => setExpandedDeal(d)} />
            ))}
          </div>

          {/* Passed deals */}
          {passedDeals.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#D1D5DB" }}>
                Passed — Monitoring for price reduction
              </div>
              <div className="space-y-1">
                {passedDeals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs py-1">
                    <span style={{ color: "#9CA3AF" }}>{d.address}</span>
                    <span style={{ color: "#D1D5DB" }}>
                      {fmtPrice(d.guidePrice ?? d.askingPrice, d.currency)}
                    </span>
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
