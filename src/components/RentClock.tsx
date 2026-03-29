import type { RentReview } from "@/hooks/useRentReviews";

type RentClockProps = {
  reviews: RentReview[];
  horizonMonths?: number;
};

export function RentClock({ reviews, horizonMonths = 24 }: RentClockProps) {
  const markers = reviews
    .map((review) => {
      const monthsToEvent = review.daysToExpiry / 30;
      if (monthsToEvent > horizonMonths) return null;

      const angleDeg = (monthsToEvent / horizonMonths) * 360;
      const angleRad = ((angleDeg - 90) * Math.PI) / 180;

      const radius = 42;
      const x = 50 + radius * Math.cos(angleRad);
      const y = 50 + radius * Math.sin(angleRad);

      let colorClass = "ok";
      if (review.urgency === "urgent") colorClass = "urgent";
      else if (review.urgency === "soon") colorClass = "soon";

      const hasBreak = review.breakDate && new Date(review.breakDate) < new Date(review.expiryDate);
      const eventType = hasBreak ? "Break" : "Review";

      return { id: review.id, x, y, colorClass, label: `${eventType} ${review.daysToExpiry}d`, tenantName: review.tenantName };
    })
    .filter(Boolean);

  return (
    <div className="py-6">
      <div className="relative mx-auto" style={{ width: "280px", height: "280px" }}>
        <div className="absolute inset-0 rounded-full" style={{ border: "2px solid var(--bdr)", background: "var(--s1)" }} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-[28px] font-normal" style={{ color: "var(--tx)", fontFamily: "var(--serif)", letterSpacing: "-0.02em" }}>
            {reviews.length}
          </div>
          <div className="text-[10px]" style={{ color: "var(--tx3)" }}>lease events</div>
        </div>

        {markers.map((marker) => {
          if (!marker) return null;
          let bgColor = "var(--grn)";
          let shadow = "";
          if (marker.colorClass === "urgent") {
            bgColor = "var(--red)";
            shadow = "0 0 8px rgba(248, 113, 113, 0.4)";
          } else if (marker.colorClass === "soon") {
            bgColor = "var(--amb)";
          }

          return (
            <div
              key={marker.id}
              className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${marker.x}%`, top: `${marker.y}%`, background: bgColor, boxShadow: shadow }}
              title={`${marker.tenantName} — ${marker.label}`}
            />
          );
        })}
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--tx3)" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--red)" }} />
          Break clause
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--tx3)" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--amb)" }} />
          Review due
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--tx3)" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--grn)" }} />
          Expiry / future
        </div>
      </div>
    </div>
  );
}
