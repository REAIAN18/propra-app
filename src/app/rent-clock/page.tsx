"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";

type ReviewEvent = {
  id: string;
  tenantName: string;
  propertyAddress: string | null;
  expiryDate: string;
  daysToExpiry: number;
  breakDate: string | null;
  passingRent: number;
  ervLive: number | null;
  gap: number | null;
  leverageScore: number | null;
  leverageExplanation: string | null;
  horizon: string | null;
  status: string;
  urgency: "urgent" | "soon" | "monitor";
  draftGeneratedAt: string | null;
};

type ReviewsResponse = {
  reviews: ReviewEvent[];
  totalGapGbp: number;
};

function urgencyColors(urgency: "urgent" | "soon" | "monitor") {
  if (urgency === "urgent") return {
    border: "var(--red-bdr)",
    topBg: "var(--red-lt)",
    dot: "var(--red)",
    text: "var(--red)",
    tag: "danger",
  };
  if (urgency === "soon") return {
    border: "var(--amb-bdr)",
    topBg: "var(--amb-lt)",
    dot: "var(--amb)",
    text: "var(--amb)",
    tag: "warn",
  };
  return {
    border: "var(--bdr)",
    topBg: "var(--s1)",
    dot: "var(--grn)",
    text: "var(--grn)",
    tag: "ok",
  };
}

function urgencyLabel(urgency: "urgent" | "soon" | "monitor") {
  if (urgency === "urgent") return "URGENT — ACT NOW";
  if (urgency === "soon") return "REVIEW SOON";
  return "ON TRACK";
}

export default function RentClockPage() {
  const { portfolioId } = useNav();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/rent-reviews")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (typeof document !== "undefined") {
    document.title = "Rent Clock — RealHQ";
  }

  const reviews = data?.reviews || [];
  const totalGap = data?.totalGapGbp || 0;

  // Calculate KPIs
  const activeLeases = reviews.length;
  const reviewsDue = reviews.filter((r) => r.daysToExpiry <= 180).length;
  const breakClauses = reviews.filter((r) => r.breakDate).length;
  const urgentBreak = reviews.find((r) => r.breakDate && r.daysToExpiry < 90);

  // Find biggest opportunity
  const biggestOpp = reviews.reduce((max, r) =>
    (r.gap && r.gap > (max?.gap || 0)) ? r : max
  , reviews[0]);

  function fmt(v: number) {
    if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `£${(v / 1_000).toFixed(0)}k`;
    return `£${v.toLocaleString()}`;
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
                fontFamily: "var(--serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              Rent Clock
            </h1>
            <p className="text-[13px]" style={{ color: "var(--tx3)" }}>
              Every lease event across your portfolio — reviews, breaks, expiries — with days counting down.
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: "var(--tx3)" }}>Loading...</div>
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: "var(--tx3)" }}>No upcoming lease events</div>
          </div>
        )}

        {!loading && reviews.length > 0 && (
          <>
            {/* KPI ROW */}
            <div
              className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-xl overflow-hidden"
              style={{ background: "var(--bdr)", border: "1px solid var(--bdr)" }}
            >
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                  ACTIVE LEASES
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em" }}>
                  {activeLeases}
                </div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                  across portfolio
                </div>
              </div>

              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                  REVIEWS DUE
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: reviewsDue > 0 ? "var(--amb)" : "var(--tx)", letterSpacing: "-0.02em" }}>
                  {reviewsDue}
                </div>
                <div style={{ font: "400 10px var(--sans)", color: reviewsDue > 0 ? "var(--amb)" : "var(--tx3)", marginTop: "3px" }}>
                  {reviewsDue > 0 ? "within 6 months" : "none due soon"}
                </div>
              </div>

              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                  REVERSIONARY GAP
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: totalGap > 0 ? "var(--grn)" : "var(--tx)", letterSpacing: "-0.02em" }}>
                  {fmt(totalGap)}
                </div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                  {totalGap > 0 && <span style={{ color: "var(--grn)" }}>↑ below market</span>}
                </div>
              </div>

              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                  BREAK CLAUSES
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: urgentBreak ? "var(--red)" : "var(--tx)", letterSpacing: "-0.02em" }}>
                  {breakClauses}
                </div>
                <div style={{ font: "400 10px var(--sans)", color: urgentBreak ? "var(--red)" : "var(--tx3)", marginTop: "3px" }}>
                  {urgentBreak ? `${urgentBreak.daysToExpiry} days — at risk` : "monitored"}
                </div>
              </div>

              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                  WAULT
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em" }}>
                  —<span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: 400 }}> yrs</span>
                </div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                  weighted avg
                </div>
              </div>
            </div>

            {/* INSIGHT BANNER */}
            {biggestOpp && biggestOpp.gap && biggestOpp.gap > 0 && (
              <div
                style={{
                  background: "var(--s1)",
                  border: "1px solid var(--acc-bdr)",
                  borderRadius: "10px",
                  padding: "22px 24px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "24px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                    RENT OPPORTUNITY
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: "18px", fontWeight: 400, color: "var(--tx)", marginBottom: "3px" }}>
                    {biggestOpp.tenantName} paying below market rent.
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--tx3)", lineHeight: "1.6", maxWidth: "480px" }}>
                    Review due in {biggestOpp.daysToExpiry} days. Current passing rent {fmt(biggestOpp.passingRent)}/yr{biggestOpp.ervLive && ` vs ERV ${fmt(biggestOpp.ervLive)}/yr`}.
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: "32px", fontWeight: 400, color: "var(--tx)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {fmt(biggestOpp.gap)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>
                    annual uplift
                  </div>
                </div>
              </div>
            )}

            {/* UPCOMING REVIEWS */}
            <div>
              <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>
                UPCOMING REVIEWS
              </div>
              <div className="space-y-3">
                {reviews.slice(0, 5).map((review) => {
                  const colors = urgencyColors(review.urgency);
                  const isBreak = review.breakDate && new Date(review.breakDate) < new Date(review.expiryDate);
                  const eventType = isBreak ? "Break clause" : "Rent review";

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
                              {review.tenantName} — {eventType.toLowerCase()}
                            </div>
                            <div className="text-xs mb-3" style={{ color: "var(--tx3)" }}>
                              {review.propertyAddress || "Property"} · {fmt(review.passingRent)}/yr passing
                            </div>

                            {review.gap && review.gap > 0 && (
                              <div
                                className="rounded-lg p-3"
                                style={{ background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }}
                              >
                                <div
                                  className="text-xs font-medium mb-1"
                                  style={{ color: "var(--grn)" }}
                                >
                                  Potential rent increase
                                </div>
                                <div
                                  className="text-[11px] leading-relaxed"
                                  style={{ color: "var(--tx3)" }}
                                >
                                  Current rent {fmt(review.passingRent)}/yr vs market{review.ervLive && ` ${fmt(review.ervLive)}/yr`}. {" "}
                                  <span
                                    className="font-semibold"
                                    style={{
                                      fontFamily: "var(--serif)",
                                      fontSize: "13px",
                                      color: "var(--grn)",
                                    }}
                                  >
                                    +{fmt(review.gap)}
                                  </span>
                                  {" "}uplift available.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right column */}
                          <div className="text-right min-w-[160px]">
                            <div
                              className="rounded-lg px-4 py-2 inline-block mb-3"
                              style={{ background: colors.topBg, border: `1px solid ${colors.border}` }}
                            >
                              <div
                                className="text-[10px] font-medium uppercase tracking-wider mb-1"
                                style={{ color: "var(--tx3)", fontFamily: "var(--mono)" }}
                              >
                                DAYS REMAINING
                              </div>
                              <div
                                className="text-2xl font-normal"
                                style={{
                                  fontFamily: "var(--serif)",
                                  color: colors.text,
                                  letterSpacing: "-0.02em",
                                }}
                              >
                                {review.daysToExpiry}
                              </div>
                            </div>

                            {review.status === "draft_sent" ? (
                              <div>
                                <div
                                  className="text-xs font-medium mb-1"
                                  style={{ color: "var(--grn)" }}
                                >
                                  ✓ Draft sent
                                </div>
                                <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
                                  Awaiting response
                                </div>
                              </div>
                            ) : (
                              <button
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
              </div>
            </div>

            {/* PORTAL HINT */}
            <div
              style={{
                padding: "14px 18px",
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "10px",
                font: "300 12px/1.5 var(--sans)",
                color: "var(--tx3)",
              }}
            >
              Need to share lease data with a valuer or lender? <span style={{ color: "var(--acc)", fontWeight: 500 }}>Create a portal link →</span> — includes rent roll, lease summaries, and review status.
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
