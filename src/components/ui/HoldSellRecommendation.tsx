interface HoldSellRecommendationProps {
  portfolioName: string;
  title: string;
  subtitle: string;
  exitValue: string;
  comparisonValue: string;
  onOptimise?: () => void;
  onTestMarket?: () => void;
}

export function HoldSellRecommendation({
  portfolioName,
  title,
  subtitle,
  exitValue,
  comparisonValue,
  onOptimise,
  onTestMarket,
}: HoldSellRecommendationProps) {
  return (
    <div
      className="rounded-2xl px-6 py-5 flex items-center justify-between gap-5"
      style={{
        background: "linear-gradient(135deg, #071510 0%, #040D09 100%)",
        border: "1px solid rgba(91,240,172,.18)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
          style={{ color: "rgba(91,240,172,.4)" }}
        >
          Recommendation — {portfolioName}
        </p>
        <p
          style={{
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
            fontSize: 23,
            color: "#5BF0AC",
            lineHeight: 1.2,
            marginBottom: 5,
          }}
        >
          {title}
        </p>
        <p className="text-[11px] mb-3" style={{ color: "rgba(255,255,255,.4)" }}>
          {subtitle}
        </p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#0A8A4C", border: "none" }}
            onClick={onOptimise}
          >
            Start optimising →
          </button>
          <button
            className="px-4 py-2 rounded-lg text-[12px] transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,.08)", border: "none", color: "rgba(255,255,255,.55)" }}
            onClick={onTestMarket}
          >
            Test the market
          </button>
        </div>
      </div>
      <div className="flex-shrink-0 text-right min-w-[140px]">
        <p className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,.35)" }}>
          Est. exit value
        </p>
        <p
          style={{
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
            fontSize: 30,
            color: "#fff",
            lineHeight: 1,
          }}
        >
          {exitValue}
        </p>
        <p className="text-[10px] mt-1" style={{ color: "rgba(91,240,172,.5)" }}>
          {comparisonValue}
        </p>
      </div>
    </div>
  );
}
