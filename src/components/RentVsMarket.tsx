import type { RentReview } from "@/hooks/useRentReviews";

type RentVsMarketProps = {
  reviews: RentReview[];
  currency: string;
};

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

export function RentVsMarket({ reviews, currency }: RentVsMarketProps) {
  const sym = currency === "USD" ? "$" : "£";
  const withERV = reviews.filter(r => r.ervLive && r.sqft && r.sqft > 0);

  if (withERV.length === 0) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: "var(--tx3)" }}>
        No market comparison data available yet
      </div>
    );
  }

  const maxERV = Math.max(...withERV.map(r => (r.ervLive ?? 0) / (r.sqft ?? 1)));

  return (
    <div>
      {withERV.map((review) => {
        const sqft = review.sqft ?? 1;
        const passingPerSqft = review.passingRent / sqft;
        const ervPerSqft = (review.ervLive ?? passingPerSqft) / sqft;
        const gap = review.gap ?? 0;
        const gapPercent = ((ervPerSqft - passingPerSqft) / passingPerSqft * 100).toFixed(0);
        const passingWidth = (passingPerSqft / maxERV) * 100;
        const ervWidth = (ervPerSqft / maxERV) * 100;

        return (
          <div
            key={review.id}
            className="flex items-center gap-3 py-3 px-5"
            style={{ borderBottom: "1px solid var(--bdr-lt)" }}
          >
            <div className="w-36 min-w-36">
              <div className="text-xs font-medium mb-0.5" style={{ color: "var(--tx)" }}>
                {review.tenantName}
              </div>
              <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
                {review.propertyAddress?.split(",")[0] ?? "Property"}
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-[9px] w-12 text-right" style={{ color: "var(--tx3)", fontFamily: "var(--mono)" }}>Passing</div>
                <div className="h-3.5 rounded transition-all duration-500" style={{ width: `${passingWidth}%`, background: "var(--acc)", opacity: 0.6, minWidth: "4px" }} />
                <div className="text-[10px] ml-1" style={{ color: "var(--tx3)", fontFamily: "var(--mono)" }}>{sym}{passingPerSqft.toFixed(0)}/sf</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[9px] w-12 text-right" style={{ color: "var(--tx3)", fontFamily: "var(--mono)" }}>ERV</div>
                <div className="h-3.5 rounded transition-all duration-500" style={{ width: `${ervWidth}%`, background: "var(--grn)", opacity: 0.6, minWidth: "4px" }} />
                <div className="text-[10px] ml-1" style={{ color: "var(--grn)", fontFamily: "var(--mono)" }}>{sym}{ervPerSqft.toFixed(0)}/sf</div>
              </div>
            </div>

            <div className="text-right min-w-20">
              <div className="text-base font-normal" style={{ color: gap > 0 ? "var(--grn)" : "var(--tx)", fontFamily: "var(--serif)", letterSpacing: "-0.01em" }}>
                {gap > 0 ? "+" : ""}{fmt(gap, sym)}
              </div>
              <div className="text-[9px]" style={{ color: "var(--tx3)" }}>
                {gapPercent}% {gap > 0 ? "below" : "at"} mkt
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
