"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { DirectCallout } from "@/components/ui/DirectCallout";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

type ReviewEvent = {
  id: string;
  tenant: string;
  property: string;
  sqft: number;
  passingRent: number;
  passingRentPerSqft: number;
  marketERV: number;
  eventType: "review" | "break" | "expiry";
  eventDate: string;
  daysRemaining: number;
  reviewType: "open" | "fixed" | "cpi";
  fixedRate?: number;
  hasBackdating: boolean;
  reviewCycleYears: number;
};

function urgencyTier(days: number): "urgent" | "review" | "secure" {
  if (days < 90) return "urgent";
  if (days < 180) return "review";
  return "secure";
}

function urgencyLabel(tier: "urgent" | "review" | "secure") {
  if (tier === "urgent") return "Urgent — act now";
  if (tier === "review") return "Review soon";
  return "On track";
}

function urgencyColors(tier: "urgent" | "review" | "secure") {
  if (tier === "urgent") return {
    border: "var(--red-bdr)",
    topBg: "var(--red-lt)",
    topBorder: "var(--red-bdr)",
    dot: "var(--red)",
    text: "var(--red)",
    countBg: "var(--red-lt)",
    countText: "var(--red)",
    inactionBg: "var(--red-lt)",
    inactionLabel: "var(--red)",
    inactionText: "var(--tx2)",
  };
  if (tier === "review") return {
    border: "var(--amb-bdr)",
    topBg: "var(--amb-lt)",
    topBorder: "var(--amb-bdr)",
    dot: "var(--amb)",
    text: "var(--amb)",
    countBg: "var(--amb-lt)",
    countText: "var(--amb)",
    inactionBg: "var(--amb-lt)",
    inactionLabel: "var(--amb)",
    inactionText: "var(--tx2)",
  };
  return {
    border: "var(--grn-bdr)",
    topBg: "var(--grn-lt)",
    topBorder: "var(--grn-bdr)",
    dot: "var(--grn)",
    text: "var(--grn)",
    countBg: "var(--grn-lt)",
    countText: "var(--grn)",
    inactionBg: "var(--grn-lt)",
    inactionLabel: "var(--grn)",
    inactionText: "var(--tx2)",
  };
}

function reviewTypeBadge(reviewType: "open" | "fixed" | "cpi", fixedRate?: number) {
  if (reviewType === "open") {
    return (
      <span
        className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block"
        style={{ background: "var(--acc-lt)", color: "var(--acc)" }}
      >
        Open market review
      </span>
    );
  }
  if (reviewType === "fixed") {
    return (
      <span
        className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block"
        style={{ background: "var(--grn-lt)", color: "var(--grn)" }}
      >
        Fixed increase · {fixedRate ?? 3}% pa compounded
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block"
      style={{ background: "var(--amb-lt)", color: "var(--amb)" }}
    >
      CPI-linked
    </span>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).replace(",", " ·");
}

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

export default function RentClockPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";
  const isGBP = portfolio.currency === "GBP";

  const [approved, setApproved] = useState<Set<string>>(new Set());

  // Build review events from portfolio data
  const events: ReviewEvent[] = [];

  portfolio.assets.forEach((asset) => {
    asset.leases.forEach((lease) => {
      if (lease.tenant === "Vacant" || lease.status === "expired") return;

      let eventDate = "";
      let eventType: "review" | "break" | "expiry" = "expiry";
      let daysRemaining = lease.daysToExpiry;

      // Prefer reviewDate, then breakDate, then expiryDate
      if (lease.reviewDate) {
        eventDate = lease.reviewDate;
        eventType = "review";
        const reviewMs = new Date(lease.reviewDate).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.round(reviewMs / 86400000));
      } else if (lease.breakDate) {
        eventDate = lease.breakDate;
        eventType = "break";
        const breakMs = new Date(lease.breakDate).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.round(breakMs / 86400000));
      } else if (lease.expiryDate) {
        eventDate = lease.expiryDate;
        eventType = "expiry";
      }

      if (!eventDate) return;

      // Determine review type based on location and rent level
      let reviewType: "open" | "fixed" | "cpi" = "open";
      let fixedRate = 3;
      const annualRent = lease.sqft * lease.rentPerSqft;

      if (isGBP) {
        reviewType = "open";
      } else {
        // Florida: higher rent = CPI-linked, lower rent = fixed 3%
        reviewType = annualRent > 60_000 ? "cpi" : "fixed";
      }

      // Review cycle years: assume 5yr standard
      const reviewCycleYears = 5;

      // Backdating: assume present if reviewDate exists and is in past
      const hasBackdating = lease.reviewDate ? new Date(lease.reviewDate) < new Date() : false;

      events.push({
        id: lease.id,
        tenant: lease.tenant,
        property: asset.name,
        sqft: lease.sqft,
        passingRent: annualRent,
        passingRentPerSqft: lease.rentPerSqft,
        marketERV: asset.marketERV,
        eventType,
        eventDate,
        daysRemaining,
        reviewType,
        fixedRate,
        hasBackdating,
        reviewCycleYears,
      });
    });
  });

  // Sort by urgency: urgent first, then by days ascending
  const sortedEvents = events.sort((a, b) => {
    const tierA = urgencyTier(a.daysRemaining);
    const tierB = urgencyTier(b.daysRemaining);
    if (tierA !== tierB) {
      const tierOrder = { urgent: 0, review: 1, secure: 2 };
      return tierOrder[tierA] - tierOrder[tierB];
    }
    return a.daysRemaining - b.daysRemaining;
  });

  if (typeof document !== "undefined") {
    document.title = "Rent Clock — RealHQ";
  }

  return (
    <AppShell>
      <TopBar title="Rent Clock" />

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <DirectCallout
          title="RealHQ drafts every rent review letter — nothing is sent without your approval"
          body="RealHQ monitors upcoming reviews, break clauses, and expiries across your portfolio. Every letter is pre-drafted with tenant name, property, passing rent, and ERV. You review and approve before anything is sent."
        />

        {sortedEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: "var(--tx3)" }}>No upcoming lease events</div>
          </div>
        )}

        {sortedEvents.map((event) => {
          const tier = urgencyTier(event.daysRemaining);
          const colors = urgencyColors(tier);
          const rentGap = Math.max(0, event.marketERV - event.passingRentPerSqft) * event.sqft;
          const costOfInaction = rentGap * event.reviewCycleYears;
          const isApproved = approved.has(event.id);

          let eventTypeLabel = "Rent review";
          if (event.eventType === "break") eventTypeLabel = "Break clause";
          if (event.eventType === "expiry") eventTypeLabel = "Lease expiry";

          let inactionLabel = "Cost of missing this window";
          let inactionText = "";

          if (event.reviewType === "open") {
            inactionText = `Current rent ${sym}${event.passingRentPerSqft.toFixed(0)}/sf vs ERV ${sym}${event.marketERV.toFixed(0)}/sf. Miss this review and you cannot increase rent until ${new Date(new Date(event.eventDate).setFullYear(new Date(event.eventDate).getFullYear() + event.reviewCycleYears)).toLocaleDateString("en-US", { month: "short", year: "numeric" })}. That is ${event.reviewCycleYears} years × ${fmt(rentGap, sym)} gap = `;
          } else if (event.reviewType === "fixed") {
            const newRent = event.passingRentPerSqft * Math.pow(1 + (event.fixedRate ?? 3) / 100, 1);
            const uplift = (newRent - event.passingRentPerSqft) * event.sqft;
            inactionLabel = "Automatic uplift — notification required";
            inactionText = `Fixed increase from ${sym}${event.passingRentPerSqft.toFixed(0)}/sf to ${sym}${newRent.toFixed(2)}/sf (+${fmt(uplift, sym)}/yr). Automatic — no negotiation needed. Note: ERV is ${sym}${event.marketERV.toFixed(0)}/sf — fixed clause means you cannot capture full market uplift at this review.`;
          } else {
            inactionText = `Current rent ${sym}${event.passingRentPerSqft.toFixed(0)}/sf vs ERV ${sym}${event.marketERV.toFixed(0)}/sf. Miss this review and gap costs ${fmt(rentGap, sym)}/yr for up to ${event.reviewCycleYears} years. `;
          }

          return (
            <div
              key={event.id}
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--s1)", border: `1px solid ${colors.border}` }}
            >
              {/* Card top */}
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ background: colors.topBg, borderBottom: `1px solid ${colors.topBorder}` }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: colors.dot }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: colors.text }}
                >
                  {urgencyLabel(tier)}
                </span>
              </div>

              {/* Card body */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
                  <div>
                    <div className="text-base font-medium mb-0.5" style={{ color: "var(--tx)" }}>
                      {event.tenant} — {eventTypeLabel.toLowerCase()}
                    </div>
                    <div className="text-xs mb-3" style={{ color: "var(--tx2)" }}>
                      {event.property} · {fmt(event.passingRent, sym)}/yr passing
                    </div>

                    {reviewTypeBadge(event.reviewType, event.fixedRate)}

                    {/* Cost of inaction box */}
                    <div
                      className="rounded-lg p-3 my-3"
                      style={{ background: colors.inactionBg }}
                    >
                      <div
                        className="text-xs font-medium mb-1"
                        style={{ color: colors.inactionLabel }}
                      >
                        {inactionLabel}
                      </div>
                      <div
                        className="text-[13px] leading-relaxed"
                        style={{ color: colors.inactionText }}
                      >
                        {inactionText}
                        {event.reviewType === "open" && (
                          <strong style={{ fontFamily: SERIF }}>
                            {fmt(costOfInaction, sym)} total cost of inaction.
                          </strong>
                        )}
                      </div>
                    </div>

                    {/* Backdating flag */}
                    {event.hasBackdating && (
                      <div
                        className="rounded-lg px-3 py-2 mb-3 text-xs"
                        style={{ background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" }}
                      >
                        ⚠️ Backdating clause — new rent may be backdated with interest. Act before the review date.
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "var(--grn-lt)", color: "var(--grn)" }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--grn)" }} />
                        {event.reviewType === "fixed" ? "Notification letter ready" : "Review letter ready"}
                      </div>
                      {!isApproved ? (
                        <button
                          onClick={() => setApproved((prev) => new Set([...prev, event.id]))}
                          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                          style={{ background: "var(--grn)", color: "var(--bg)" }}
                        >
                          Approve & Send →
                        </button>
                      ) : (
                        <div className="text-xs" style={{ color: "var(--tx3)" }}>
                          Letter sent · RealHQ tracking response. If no reply within 5 working days, RealHQ will follow up.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Countdown */}
                  <div
                    className="text-center rounded-xl py-4 px-5 min-w-[120px]"
                    style={{ background: colors.countBg }}
                  >
                    <div
                      className="text-[42px] font-semibold leading-none"
                      style={{ color: colors.countText }}
                    >
                      {event.daysRemaining <= 0 ? "!" : event.daysRemaining}
                    </div>
                    <div
                      className="text-xs mt-1 font-medium"
                      style={{ color: colors.countText }}
                    >
                      {event.daysRemaining <= 0 ? "Overdue" : "days remaining"}
                    </div>
                    <div className="text-[10px] mt-1.5" style={{ color: "var(--tx3)" }}>
                      {formatDate(event.eventDate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </AppShell>
  );
}
