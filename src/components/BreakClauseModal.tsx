"use client";

import type { RentReview } from "@/hooks/useRentReviews";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

type BreakClauseModalProps = {
  review: RentReview;
  currency: string;
  onClose: () => void;
};

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

export function BreakClauseModal({ review, currency, onClose }: BreakClauseModalProps) {
  const sym = currency === "USD" ? "$" : "£";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.7)" }}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{ background: "var(--bg)", border: "1px solid var(--bdr)" }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--s1)", borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <h3 className="text-lg font-normal" style={{ color: "var(--tx)", fontFamily: SERIF }}>
              Break Clause — {review.tenantName}
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--tx3)" }}>
              {review.propertyAddress}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none px-2"
            style={{ color: "var(--tx3)" }}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm mb-6" style={{ color: "var(--tx2)" }}>
            {review.tenantName} can exercise their break in {review.daysToExpiry} days. If they leave, you lose {fmt(review.passingRent, sym)}/yr in rent.
          </p>

          {/* Income at risk callout */}
          <div
            className="rounded-lg p-4 mb-6 flex items-center justify-between"
            style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)" }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>Income at risk</div>
              <div className="text-xs mt-1" style={{ color: "var(--tx3)" }}>If break exercised — void + re-letting costs</div>
            </div>
            <div className="text-2xl font-normal" style={{ color: "var(--red)", fontFamily: SERIF, letterSpacing: "-0.02em" }}>
              {fmt(review.passingRent, sym)}/yr
            </div>
          </div>

          {/* Break details */}
          <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <h4 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Break Details</h4>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--tx3)" }}>Tenant</span>
                <span style={{ color: "var(--tx)" }}>{review.tenantName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--tx3)" }}>Break date</span>
                <span style={{ color: "var(--red)", fontWeight: 600 }}>
                  {review.breakDate ? new Date(review.breakDate).toLocaleDateString() : "N/A"} ({review.daysToExpiry} days)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--tx3)" }}>Current rent</span>
                <span style={{ color: "var(--tx)" }}>{fmt(review.passingRent, sym)}/yr</span>
              </div>
            </div>
          </div>

          {/* Retention options */}
          <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <h4 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Retention Options</h4>
            </div>
            <div>
              {[
                { title: "Offer rent-free period (1–3 months)", desc: "Retains income. Common for strong tenants." },
                { title: "Offer fit-out contribution", desc: "Fund an office refresh. Strengthens tenant commitment." },
                { title: "Extend lease at current terms", desc: "Remove break clause in exchange for extension. Locks in income certainty." },
                { title: "Engage directly — schedule meeting", desc: "Discuss tenant's plans. No formal notice." }
              ].map((option, i) => (
                <div
                  key={i}
                  className="px-4 py-3 cursor-pointer transition-all hover:bg-[var(--s2)]"
                  style={{ borderBottom: i < 3 ? "1px solid var(--bdr-lt)" : "none" }}
                >
                  <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>{option.title}</div>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>{option.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "var(--red)", color: "#fff" }}
            >
              Draft retention proposal →
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-lg text-sm font-medium"
              style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--tx2)" }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
