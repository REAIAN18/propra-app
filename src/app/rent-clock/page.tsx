"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";

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
    dot: "var(--red)",
    text: "var(--red)",
    countBg: "var(--red-lt)",
    countText: "var(--red)",
    inactionBg: "var(--red-lt)",
    inactionLabel: "var(--red)",
    inactionText: "var(--red)",
  };
  if (tier === "review") return {
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

function reviewTypeBadge(reviewType: "open" | "fixed" | "cpi", fixedRate?: number) {
  if (reviewType === "open") {
    return (
      <span
        className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block"
        style={{ background: "var(--acc-lt)", color: "var(--acc)", border: "1px solid var(--acc-bdr)" }}
      >
        Open market review
      </span>
    );
  }
  if (reviewType === "fixed") {
    return (
      <span
        className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block"
        style={{ background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" }}
      >
        Fixed increase · {fixedRate ?? 3}% pa compounded
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block"
      style={{ background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" }}
    >
      CPI-linked
    </span>
  );
}

export default function RentClockPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ReviewEvent | null>(null);
  const [sending, setSending] = useState<Set<string>>(new Set());

  function fmt(v: number, currency: string) {
    if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
    return `${currency}${v.toLocaleString()}`;
  }

  // Mock data - replace with API call to /api/user/rent-reviews
  const mockEvents: ReviewEvent[] = portfolio.assets.flatMap((asset) =>
    asset.leases
      .filter((lease) => lease.daysToExpiry <= 365)
      .map((lease) => ({
        id: lease.id,
        tenant: lease.tenant,
        property: asset.name,
        sqft: lease.sqft,
        passingRent: lease.rentPerSqft * lease.sqft,
        passingRentPerSqft: lease.rentPerSqft,
        marketERV: asset.marketERV,
        eventType: lease.breakDate && new Date(lease.breakDate) < new Date(lease.expiryDate) ? "break" : lease.daysToExpiry <= 90 ? "expiry" : "review",
        eventDate: lease.reviewDate || lease.expiryDate,
        daysRemaining: lease.daysToExpiry,
        reviewType: "open",
        hasBackdating: false,
        reviewCycleYears: 5,
      } as ReviewEvent))
  );

  const sortedEvents = [...mockEvents].sort((a, b) => {
    const tierA = urgencyTier(a.daysRemaining);
    const tierB = urgencyTier(b.daysRemaining);
    if (tierA !== tierB) {
      const tierOrder = { urgent: 0, review: 1, secure: 2 };
      return tierOrder[tierA] - tierOrder[tierB];
    }
    return a.daysRemaining - b.daysRemaining;
  });

  const handleSendClick = async (event: ReviewEvent) => {
    // In a real implementation, fetch tenant data to check if email exists
    // For now, we'll simulate checking email existence
    const tenantHasEmail = Math.random() > 0.5; // Mock: 50% chance tenant has email

    if (!tenantHasEmail) {
      setSelectedEvent(event);
      setShowEmailModal(true);
    } else {
      await sendCorrespondence(event.id, "mock-email@example.com");
    }
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
      setSelectedEvent(null);
    }
  };

  const handleEmailCaptured = async (email: string) => {
    if (selectedEvent) {
      await sendCorrespondence(selectedEvent.id, email);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/user/rent-reviews/${selectedEvent.id}/pdf`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rent-review-${selectedEvent.tenant.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowEmailModal(false);
      setSelectedEvent(null);
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
              Track upcoming reviews, break clauses, and lease expiries
            </p>
          </div>
        </div>

        {/* CALLOUT */}
        <div
          className="flex items-start gap-3 px-6 py-4 rounded-xl text-[12px] leading-relaxed"
          style={{
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
          }}
        >
          <div
            className="text-lg mt-0.5"
            style={{ color: "var(--acc)" }}
          >
            ⚡
          </div>
          <div className="flex-1">
            <strong className="block mb-0.5 text-sm" style={{ color: "var(--tx)" }}>
              RealHQ drafts every rent review letter — nothing is sent without your approval
            </strong>
            <p style={{ color: "var(--tx3)" }}>
              RealHQ monitors upcoming reviews, break clauses, and expiries across your portfolio. Every letter is pre-drafted with tenant name, property, passing rent, and ERV. You review and approve before anything is sent.
            </p>
          </div>
        </div>

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
                    <div className="text-xs mb-3" style={{ color: "var(--tx3)" }}>
                      {event.property} · {fmt(event.passingRent, sym)}/yr passing
                    </div>

                    {reviewTypeBadge(event.reviewType, event.fixedRate)}

                    {/* Cost of inaction box */}
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
                        {event.reviewType === "open" && (
                          <span
                            className="font-semibold"
                            style={{
                              fontFamily: "var(--serif)",
                              fontSize: "13px",
                              color: colors.inactionText,
                            }}
                          >
                            {fmt(costOfInaction, sym)}
                          </span>
                        )}
                      </div>
                    </div>
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
                        {event.daysRemaining}
                      </div>
                    </div>

                    {isApproved ? (
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
                          onClick={() => handleSendClick(event)}
                          disabled={sending.has(event.id)}
                          className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: sending.has(event.id) ? "var(--s3)" : "var(--grn)",
                            color: "#fff",
                            cursor: sending.has(event.id) ? "not-allowed" : "pointer",
                          }}
                        >
                          {sending.has(event.id) ? "Sending..." : "Send letter →"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setApproved(prev => new Set(prev).add(event.id))}
                        className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: "var(--acc)",
                          color: "#fff",
                        }}
                      >
                        Draft letter →
                      </button>
                    )}

                    {event.hasBackdating && (
                      <div
                        className="text-[10px] mt-2"
                        style={{ color: "var(--amb)" }}
                      >
                        ⚠ Backdating possible
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {selectedEvent && (
        <EmailCaptureModal
          isOpen={showEmailModal}
          tenantName={selectedEvent.tenant}
          tenantId={selectedEvent.id}
          onEmailCaptured={handleEmailCaptured}
          onDecline={handleDownloadPDF}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </AppShell>
  );
}
