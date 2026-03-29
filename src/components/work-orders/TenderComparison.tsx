"use client";

// ── Tender Comparison Component (PRO-802) ───────────────────────────────────
// Side-by-side contractor quote comparison with AI recommendation

interface Quote {
  id: string;
  contractorName: string;
  price: number;
  warranty: string | null;
  timeline: string | null;
  rating: number | null;
  notes: string | null;
  awarded: boolean;
  breakdown?: {
    labour?: number;
    materials?: number;
    plant?: number;
    overheads?: number;
    margin?: number;
  } | null;
  proposedStart?: Date | string | null;
  proposedDuration?: number | null;
  paymentTerms?: string | null;
}

interface TenderComparisonProps {
  quotes: Quote[];
  currency: string;
  onAward: (quoteId: string) => void;
}

export function TenderComparison({
  quotes,
  currency,
  onAward,
}: TenderComparisonProps) {
  const sym = currency === "GBP" ? "£" : "$";

  function fmt(v: number | null | undefined) {
    if (!v) return "—";
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  function renderStars(rating: number | null) {
    if (!rating) return <span style={{ color: "var(--tx3)" }}>No rating</span>;

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              color: star <= rating ? "var(--amb)" : "var(--tx3)",
              fontSize: "12px",
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  // Calculate recommendation (lowest price with good rating)
  const recommendedQuote = quotes.reduce((best, quote) => {
    if (!best) return quote;
    const bestScore =
      best.price * (best.rating ? 1 / (best.rating / 5) : 2);
    const quoteScore =
      quote.price * (quote.rating ? 1 / (quote.rating / 5) : 2);
    return quoteScore < bestScore ? quote : best;
  }, quotes[0]);

  if (quotes.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
      >
        <div className="text-sm" style={{ color: "var(--tx3)" }}>
          No quotes received yet
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--tx)" }}
        >
          Quote Comparison ({quotes.length})
        </h3>
        {recommendedQuote && (
          <div
            className="text-[9px] font-medium px-2 py-1 rounded"
            style={{
              fontFamily: "var(--mono)",
              backgroundColor: "rgba(52, 211, 153, 0.1)",
              color: "var(--grn)",
              border: "1px solid rgba(52, 211, 153, 0.22)",
            }}
          >
            AI: {recommendedQuote.contractorName} RECOMMENDED
          </div>
        )}
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(quotes.length, 3)}, 1fr)`,
        }}
      >
        {quotes.map((quote) => {
          const isRecommended = quote.id === recommendedQuote?.id;
          const isAwarded = quote.awarded;

          return (
            <div
              key={quote.id}
              className="rounded-xl overflow-hidden flex flex-col"
              style={{
                backgroundColor: "var(--s1)",
                border: `1px solid ${
                  isRecommended
                    ? "rgba(52, 211, 153, 0.22)"
                    : "var(--bdr)"
                }`,
                boxShadow: isRecommended
                  ? "0 0 0 1px rgba(52, 211, 153, 0.22)"
                  : "none",
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 text-center"
                style={{ borderBottom: "1px solid var(--bdr)" }}
              >
                <div
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--tx)" }}
                >
                  {quote.contractorName}
                </div>
                <div className="flex items-center justify-center gap-1">
                  {renderStars(quote.rating)}
                </div>
              </div>

              {/* Price */}
              <div
                className="px-4 py-4 text-center"
                style={{ borderBottom: "1px solid var(--bdr)" }}
              >
                <div
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}
                >
                  {fmt(quote.price)}
                </div>
                {quote.proposedDuration && (
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--tx3)" }}
                  >
                    {quote.proposedDuration} days
                  </div>
                )}
              </div>

              {/* Breakdown */}
              {quote.breakdown && (
                <div className="flex-1" style={{ borderBottom: "1px solid var(--bdr)" }}>
                  {Object.entries(quote.breakdown).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between px-4 py-2 text-[11px]"
                      style={{ borderBottom: "1px solid var(--bdr-lt)" }}
                    >
                      <span style={{ color: "var(--tx3)", textTransform: "capitalize" }}>
                        {key}
                      </span>
                      <span style={{ color: "var(--tx)", fontWeight: 500 }}>
                        {fmt(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="px-4 py-3 space-y-2 text-[11px]">
                {quote.warranty && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--tx3)" }}>Warranty</span>
                    <span style={{ color: "var(--tx2)" }}>{quote.warranty}</span>
                  </div>
                )}
                {quote.timeline && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--tx3)" }}>Timeline</span>
                    <span style={{ color: "var(--tx2)" }}>{quote.timeline}</span>
                  </div>
                )}
                {quote.paymentTerms && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--tx3)" }}>Payment</span>
                    <span style={{ color: "var(--tx2)" }}>
                      {quote.paymentTerms.length > 20
                        ? `${quote.paymentTerms.substring(0, 20)}...`
                        : quote.paymentTerms}
                    </span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="px-4 pb-4">
                {isAwarded ? (
                  <div
                    className="w-full py-2 rounded-lg text-center text-xs font-semibold"
                    style={{
                      backgroundColor: "rgba(52, 211, 153, 0.1)",
                      color: "var(--grn)",
                      border: "1px solid rgba(52, 211, 153, 0.22)",
                    }}
                  >
                    ✓ AWARDED
                  </div>
                ) : (
                  <button
                    onClick={() => onAward(quote.id)}
                    className="w-full py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: isRecommended ? "var(--grn)" : "var(--acc)",
                      color: "#fff",
                    }}
                  >
                    Award Contract
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
