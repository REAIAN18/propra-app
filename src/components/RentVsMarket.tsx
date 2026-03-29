"use client";

import type { RentReview } from "@/hooks/useRentReviews";

type RentVsMarketProps = {
  reviews: RentReview[];
  currency: string;
};

export function RentVsMarket({ reviews, currency }: RentVsMarketProps) {
  const sym = currency === "USD" ? "$" : "£";

  const fmt = (v: number) => {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  };

  // Only show reviews with ERV data
  const reviewsWithERV = reviews.filter((r) => r.ervLive && r.passingRent);

  if (reviewsWithERV.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--tx3)", fontSize: "13px" }}>
        No market comparison data available
      </div>
    );
  }

  return (
    <div>
      {reviewsWithERV.map((review) => {
        const passingRent = review.passingRent;
        const ervTotal = (review.ervLive ?? 0) * (passingRent / (review.ervLive ?? 1)); // Approximate total ERV
        const gap = review.gap ?? 0;
        const maxValue = Math.max(passingRent, ervTotal);

        const passingWidth = (passingRent / maxValue) * 100;
        const ervWidth = (ervTotal / maxValue) * 100;

        return (
          <div
            key={review.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 18px",
              borderBottom: "1px solid var(--bdr-lt)",
            }}
          >
            {/* Tenant info */}
            <div style={{ width: "140px", minWidth: "140px" }}>
              <div
                style={{
                  font: "500 12px var(--sans)",
                  color: "var(--tx)",
                  marginBottom: "1px",
                }}
              >
                {review.tenantName}
              </div>
              <div
                style={{
                  font: "300 10px var(--sans)",
                  color: "var(--tx3)",
                }}
              >
                {review.propertyAddress}
              </div>
            </div>

            {/* Bars */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
              {/* Passing rent bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    flex: 1,
                    height: "20px",
                    background: "var(--s2)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${passingWidth}%`,
                      height: "100%",
                      background: "var(--tx3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "6px",
                    }}
                  >
                    <span
                      style={{
                        font: "500 10px var(--mono)",
                        color: "var(--tx)",
                      }}
                    >
                      {fmt(passingRent)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    font: "400 10px var(--sans)",
                    color: "var(--tx3)",
                    width: "70px",
                  }}
                >
                  Passing
                </div>
              </div>

              {/* ERV bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    flex: 1,
                    height: "20px",
                    background: "var(--s2)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${ervWidth}%`,
                      height: "100%",
                      background: gap > 0 ? "var(--grn)" : "var(--tx3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "6px",
                    }}
                  >
                    <span
                      style={{
                        font: "500 10px var(--mono)",
                        color: "#fff",
                      }}
                    >
                      {fmt(ervTotal)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    font: "400 10px var(--sans)",
                    color: "var(--tx3)",
                    width: "70px",
                  }}
                >
                  Market ERV
                </div>
              </div>
            </div>

            {/* Gap */}
            <div style={{ textAlign: "right", minWidth: "80px" }}>
              {gap > 0 ? (
                <div>
                  <div
                    style={{
                      font: "600 13px var(--sans)",
                      color: "var(--grn)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    +{fmt(gap)}
                  </div>
                  <div
                    style={{
                      font: "400 9px var(--sans)",
                      color: "var(--tx3)",
                    }}
                  >
                    uplift
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    font: "400 11px var(--sans)",
                    color: "var(--tx3)",
                  }}
                >
                  At market
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
