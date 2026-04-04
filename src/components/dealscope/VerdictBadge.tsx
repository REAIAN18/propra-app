"use client";

export type VerdictRating =
  | "strong_buy"
  | "buy"
  | "good"
  | "marginal"
  | "bad"
  | "avoid";

interface VerdictBadgeProps {
  rating: VerdictRating | string;
  play?: string;
  targetOfferRange?: { low: number; high: number };
  size?: "sm" | "md";
}

const RATING_MAP: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  strong_buy: {
    label: "STRONG BUY",
    color: "#34d399",
    bg: "rgba(52,211,153,.12)",
    border: "rgba(52,211,153,.3)",
  },
  buy: {
    label: "BUY",
    color: "#34d399",
    bg: "rgba(52,211,153,.12)",
    border: "rgba(52,211,153,.3)",
  },
  good: {
    label: "GOOD DEAL",
    color: "#34d399",
    bg: "rgba(52,211,153,.12)",
    border: "rgba(52,211,153,.3)",
  },
  marginal: {
    label: "CONDITIONAL",
    color: "#fbbf24",
    bg: "rgba(251,191,36,.12)",
    border: "rgba(251,191,36,.3)",
  },
  bad: {
    label: "BELOW THRESHOLD",
    color: "#f87171",
    bg: "rgba(248,113,113,.12)",
    border: "rgba(248,113,113,.3)",
  },
  avoid: {
    label: "AVOID",
    color: "#f87171",
    bg: "rgba(248,113,113,.12)",
    border: "rgba(248,113,113,.3)",
  },
};

export function VerdictBadge({
  rating,
  play,
  targetOfferRange,
  size = "md",
}: VerdictBadgeProps) {
  const map = RATING_MAP[rating] ?? {
    label: rating.toUpperCase().replace(/_/g, " "),
    color: "#a0a0ab",
    bg: "rgba(160,160,171,.12)",
    border: "rgba(160,160,171,.3)",
  };

  const fontSize = size === "sm" ? 10 : 11;
  const padding = size === "sm" ? "2px 8px" : "3px 10px";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span
        style={{
          background: map.bg,
          color: map.color,
          border: `1px solid ${map.border}`,
          fontWeight: 700,
          fontSize,
          padding,
          borderRadius: 4,
          letterSpacing: 1,
          fontFamily: "var(--mono, monospace)",
          whiteSpace: "nowrap",
        }}
      >
        {map.label}
      </span>
      {play && (
        <span style={{ fontSize: 12, color: "#a0a0ab", fontStyle: "italic" }}>
          {play}
        </span>
      )}
      {targetOfferRange && (
        <span style={{ fontSize: 12, color: "#a0a0ab" }}>
          Target:{" "}
          <strong style={{ color: map.color }}>
            £{targetOfferRange.low.toLocaleString()} – £
            {targetOfferRange.high.toLocaleString()}
          </strong>
        </span>
      )}
    </div>
  );
}
