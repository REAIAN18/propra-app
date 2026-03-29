"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
import { useRentReviews } from "@/hooks/useRentReviews";
import { RentClock } from "@/components/RentClock";
import { RentVsMarket } from "@/components/RentVsMarket";

function urgencyLabel(urgency: "urgent" | "soon" | "monitor") {
  if (urgency === "urgent") return "Urgent — act now";
  if (urgency === "soon") return "Review soon";
  return "On track";
}

function urgencyColors(urgency: "urgent" | "soon" | "monitor") {
  if (urgency === "urgent") return {
    border: "var(--red-bdr)",
    topBg: "var(--red-lt)",
    dot: "var(--red)",
    text: "var(--red)",
    countBg: "var(--red-lt)",
    countText: "var(--red)",
    inactionBg: "var(--red-lt)",
    inactionLabel: "var(--red)",
    inactionText: "var(--red)",
  };
  if (urgency === "soon") return {
    border: "var(--amb-bdr)",
    topBg: "var(--amb-lt)",
    dot: "var(--amb)",
    text: "var(--amb)",
    countBg: "var(--amb-lt)",
    countText: "var(--amb)",
    inactionBg: "var(--amb-lt)",
    inactionLabel: "var(--amb)",
    inactionText: "var(--amb)",
  };
  return {
    border: "var(--bdr)",
    topBg: "var(--s1)",
    dot: "var(--grn)",
    text: "var(--grn)",
    countBg: "var(--s1)",
    countText: "var(--grn)",
    inactionBg: "var(--grn-lt)",
    inactionLabel: "var(--grn)",
    inactionText: "var(--grn)",
  };
}

export default function RentClockPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const { reviews, totalGapGbp, loading } = useRentReviews();
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [sending, setSending] = useState<Set<string>>(new Set());

  function fmt(v: number, currency: string) {
    if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
    return `${currency}${v.toLocaleString()}`;
  }

  // Calculate KPIs from reviews and portfolio data
  const activeLeases = portfolio.assets.reduce((sum, a) => sum + (a.leases?.length ?? 0), 0);
  const reviewsDue = reviews.filter((r) => r.daysToExpiry <= 180).length;
  const breakClauses = reviews.filter((r) => r.breakDate).length;
  const urgentBreak = reviews.find((r) => r.breakDate && r.daysToExpiry < 90);

  // Calculate WAULT (Weighted Average Unexpired Lease Term)
  const totalRent = portfolio.assets.reduce((sum, a) =>
    sum + (a.leases?.reduce((s, l) => s + (l.rentPerSqft * l.sqft), 0) ?? 0), 0
  );
  const wault = totalRent > 0
    ? portfolio.assets.reduce((sum, a) =>
        sum + (a.leases?.reduce((s, l) =>
          s + ((l.rentPerSqft * l.sqft) * (l.daysToExpiry / 365)), 0
        ) ?? 0), 0
      ) / totalRent
    : 0;

  const sortedReviews = [...reviews].sort((a, b) => {
    const tierOrder = { urgent: 0, soon: 1, monitor: 2 };
    const tierA = a.urgency;
    const tierB = b.urgency;
    if (tierA !== tierB) {
      return tierOrder[tierA] - tierOrder[tierB];
    }
    return a.daysToExpiry - b.daysToExpiry;
  });

  // Find biggest opportunity for insight banner
  const biggestOpportunity = sortedReviews.reduce((max, r) =>
    (!max || (r.gap ?? 0) > (max.gap ?? 0)) ? r : max
  , sortedReviews[0]);

  const handleSendClick = async (reviewId: string) => {
    // For MVP: always show email modal (tenant email validation can be added later)
    setSelectedReview(reviewId);
    setShowEmailModal(true);
  };

  const sendCorrespondence = async (reviewId: string, recipientEmail: string) => {
    setSending((prev) => new Set(prev).add(reviewId));

    try {
      const response = await fetch(`/api/user/rent-reviews/${reviewId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to send correspondence");
      }

      alert("Correspondence sent successfully!");
    } catch (error) {
      alert("Failed to send correspondence. Please try again.");
    } finally {
      setSending((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
      setShowEmailModal(false);
      setSelectedReview(null);
    }
  };

  const handleEmailCaptured = async (email: string) => {
    if (selectedReview) {
      await sendCorrespondence(selectedReview, email);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedReview) return;

    try {
      const response = await fetch(`/api/user/rent-reviews/${selectedReview}/pdf`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rent-review-${selectedReview}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowEmailModal(false);
      setSelectedReview(null);
    } catch (error) {
      alert("Failed to download PDF. Please try again.");
    }
  };

  if (typeof document !== "undefined") {
    document.title = "Rent Clock — RealHQ";
  }

  return (
    <AppShell>
      <TopBar title="Rent Clock" />

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
              Rent Clock
            </h1>
            <p className="text-[13px]" style={{ color: "var(--tx3)" }}>
              Every lease event across your portfolio — reviews, breaks, expiries — with days counting down
            </p>
          </div>
        </div>

        {/* KPIs */}
        {!loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "1px",
              background: "var(--bdr)",
              border: "1px solid var(--bdr)",
              borderRadius: "var(--r, 10px)",
              overflow: "hidden",
            }}
          >
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Active Leases
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: "1" }}>
                {activeLeases}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                across {portfolio.assets.length} properties
              </div>
            </div>
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Reviews Due
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: reviewsDue > 0 ? "var(--amb)" : "var(--tx)", letterSpacing: "-0.02em", lineHeight: "1" }}>
                {reviewsDue}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: reviewsDue > 0 ? "var(--amb)" : "var(--tx3)", marginTop: "3px" }}>
                within 6 months
              </div>
            </div>
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Reversionary Gap
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: totalGapGbp > 0 ? "var(--grn)" : "var(--tx)", letterSpacing: "-0.02em", lineHeight: "1" }}>
                {fmt(totalGapGbp, sym)}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--grn)" }}>↑</span> total uncaptured rent
              </div>
            </div>
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Break Clauses
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: urgentBreak ? "var(--red)" : "var(--tx)", letterSpacing: "-0.02em", lineHeight: "1" }}>
                {breakClauses}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: urgentBreak ? "var(--red)" : "var(--tx3)", marginTop: "3px" }}>
                {urgentBreak ? `${urgentBreak.daysToExpiry} days — at risk` : "no urgent breaks"}
              </div>
            </div>
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                WAULT
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: "1" }}>
                {wault.toFixed(1)}<span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}> yrs</span>
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                weighted avg unexpired
              </div>
            </div>
          </div>
        )}

        {/* INSIGHT BANNER */}
        {biggestOpportunity && (biggestOpportunity.gap ?? 0) > 0 && (
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--acc-bdr)",
              borderRadius: "var(--r, 10px)",
              padding: "22px 24px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "24px",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                Rent Opportunity
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "18px", fontWeight: "400", color: "var(--tx)", marginBottom: "3px" }}>
                {biggestOpportunity.tenantName} paying below market rent
              </div>
              <div style={{ fontSize: "12px", color: "var(--tx3)", lineHeight: "1.6", maxWidth: "480px" }}>
                Review due in {biggestOpportunity.daysToExpiry} days. Gap: {fmt(biggestOpportunity.gap ?? 0, sym)}/year uncaptured.
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: "32px", fontWeight: "400", color: "var(--grn)", letterSpacing: "-0.03em", lineHeight: "1" }}>
                +{fmt(biggestOpportunity.gap ?? 0, sym)}
              </div>
              <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>
                annual uplift
              </div>
            </div>
          </div>
        )}

        {/* VISUAL CLOCK & RENT VS MARKET */}
        {!loading && reviews.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "var(--r, 10px)",
                padding: "20px",
              }}
            >
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: "16px", textAlign: "center" }}>
                Lease Event Timeline
              </h4>
              <RentClock reviews={reviews} />
              <div style={{ fontSize: "10px", color: "var(--tx3)", textAlign: "center", marginTop: "8px" }}>
                <span style={{ color: "var(--red)" }}>●</span> Urgent ({"<"}90d) · <span style={{ color: "var(--amb)" }}>●</span> Soon (90-180d) · <span style={{ color: "var(--grn)" }}>●</span> Secure ({">"}180d)
              </div>
            </div>
            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "var(--r, 10px)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
                <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                  Rent vs Market
                </h4>
              </div>
              <RentVsMarket reviews={reviews} currency={portfolio.currency} />
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: "var(--tx3)" }}>Loading reviews...</div>
          </div>
        )}

        {!loading && sortedReviews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: "var(--tx3)" }}>No upcoming lease events</div>
          </div>
        )}

        {sortedReviews.map((review) => {
          const colors = urgencyColors(review.urgency);
          const gap = review.gap ?? 0;
          const isApproved = approved.has(review.id);
          const isDraft = review.draftGeneratedAt !== null;

          const eventTypeLabel = review.breakDate ? "Break clause" : "Rent review";

          const inactionLabel = "Opportunity cost";
          const inactionText = gap > 0
            ? `Uncaptured rent: ${fmt(gap, sym)}/year. ${review.leverageExplanation ?? ""}`
            : (review.leverageExplanation ?? `Passing rent ${fmt(review.passingRent, sym)}/yr vs market ERV.`);

          return (
            <div
              key={review.id}
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--s1)", border: `1px solid ${colors.border}` }}
            >
              {/* Card top */}
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ background: colors.topBg, borderBottom: `1px solid ${colors.border}` }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: colors.dot }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: colors.text, fontFamily: "var(--mono)" }}
                >
                  {urgencyLabel(review.urgency)}
                </span>
              </div>

              {/* Card body */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
                  <div>
                    <div className="text-base font-medium mb-0.5" style={{ color: "var(--tx)" }}>
                      {review.tenantName} — {eventTypeLabel.toLowerCase()}
                    </div>
                    <div className="text-xs mb-3" style={{ color: "var(--tx3)" }}>
                      {review.propertyAddress} · {fmt(review.passingRent, sym)}/yr passing
                    </div>

                    {/* Cost of inaction box */}
                    {gap > 0 && (
                      <div
                        className="rounded-lg p-3 my-3"
                        style={{ background: colors.inactionBg, border: `1px solid ${colors.border}` }}
                      >
                        <div
                          className="text-xs font-medium mb-1"
                          style={{ color: colors.inactionLabel }}
                        >
                          {inactionLabel}
                        </div>
                        <div
                          className="text-[11px] leading-relaxed"
                          style={{ color: "var(--tx3)" }}
                        >
                          {inactionText}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div className="text-right min-w-[160px]">
                    <div
                      className="rounded-lg px-4 py-2 inline-block mb-3"
                      style={{ background: colors.countBg, border: `1px solid ${colors.border}` }}
                    >
                      <div
                        className="text-[10px] font-medium uppercase tracking-wider mb-1"
                        style={{ color: "var(--tx3)", fontFamily: "var(--mono)" }}
                      >
                        Days remaining
                      </div>
                      <div
                        className="text-2xl font-normal"
                        style={{
                          fontFamily: "var(--serif)",
                          color: colors.countText,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {review.daysToExpiry}
                      </div>
                    </div>

                    {isDraft && isApproved ? (
                      <div className="space-y-2">
                        <div>
                          <div
                            className="text-xs font-medium mb-1"
                            style={{ color: "var(--grn)" }}
                          >
                            ✓ Draft approved
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
                            Ready to send
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendClick(review.id)}
                          disabled={sending.has(review.id)}
                          className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: sending.has(review.id) ? "var(--s3)" : "var(--grn)",
                            color: "#fff",
                            cursor: sending.has(review.id) ? "not-allowed" : "pointer",
                          }}
                        >
                          {sending.has(review.id) ? "Sending..." : "Send letter →"}
                        </button>
                      </div>
                    ) : isDraft ? (
                      <button
                        onClick={() => setApproved(prev => new Set(prev).add(review.id))}
                        className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: "var(--acc)",
                          color: "#fff",
                        }}
                      >
                        Review draft →
                      </button>
                    ) : (
                      <button
                        onClick={() => setApproved(prev => new Set(prev).add(review.id))}
                        className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: "var(--acc)",
                          color: "#fff",
                        }}
                      >
                        Draft letter →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {selectedReview && (
        <EmailCaptureModal
          isOpen={showEmailModal}
          tenantName={reviews.find(r => r.id === selectedReview)?.tenantName ?? "Tenant"}
          tenantId={selectedReview}
          onEmailCaptured={handleEmailCaptured}
          onDecline={handleDownloadPDF}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedReview(null);
          }}
        />
      )}
    </AppShell>
  );
}
