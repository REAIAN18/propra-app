"use client";

import type { RentReview } from "@/hooks/useRentReviews";

type RentClockProps = {
  reviews: RentReview[];
};

export function RentClock({ reviews }: RentClockProps) {
  // Calculate positions on the clock (12 months = full circle)
  // Top = 0 months, Right = 3 months, Bottom = 6 months, Left = 9 months
  const getClockPosition = (daysToExpiry: number) => {
    const monthsToExpiry = daysToExpiry / 30;
    const angle = (monthsToExpiry / 12) * 360;
    const radians = ((angle - 90) * Math.PI) / 180;
    const radius = 125; // radius of the clock
    const x = 140 + radius * Math.cos(radians); // 140 = center x
    const y = 140 + radius * Math.sin(radians); // 140 = center y
    return { x, y };
  };

  const totalReviews = reviews.length;

  return (
    <div
      style={{
        position: "relative",
        width: "280px",
        height: "280px",
        borderRadius: "50%",
        border: "2px solid var(--bdr)",
        background: "var(--s1)",
        margin: "0 auto 20px",
      }}
    >
      {/* Center content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: "28px",
            color: "var(--tx)",
            letterSpacing: "-0.02em",
          }}
        >
          {totalReviews}
        </div>
        <div
          style={{
            font: "400 10px var(--sans)",
            color: "var(--tx3)",
          }}
        >
          active events
        </div>
      </div>

      {/* Markers for each review */}
      {reviews.map((review) => {
        const pos = getClockPosition(review.daysToExpiry);
        const urgencyColor =
          review.urgency === "urgent"
            ? "var(--red)"
            : review.urgency === "soon"
            ? "var(--amb)"
            : "var(--grn)";

        return (
          <div
            key={review.id}
            style={{
              position: "absolute",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: urgencyColor,
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: "translate(-50%, -50%)",
              boxShadow:
                review.urgency === "urgent"
                  ? "0 0 8px rgba(248,113,113,.4)"
                  : undefined,
            }}
            title={`${review.tenantName} - ${review.daysToExpiry} days`}
          />
        );
      })}
    </div>
  );
}
