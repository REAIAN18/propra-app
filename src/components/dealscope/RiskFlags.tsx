"use client";

interface RiskFlagsProps {
  signals?: string[];
  hasLisPendens?: boolean;
  hasInsolvency?: boolean;
  hasPlanningApplication?: boolean;
  inFloodZone?: boolean;
  epcRating?: string;
}

type FlagSeverity = "red" | "amber" | "blue" | "green";

interface Flag {
  label: string;
  severity: FlagSeverity;
}

const COLORS: Record<FlagSeverity, { bg: string; color: string }> = {
  red:   { bg: "rgba(240,96,96,.08)",   color: "#f06060" },
  amber: { bg: "rgba(234,176,32,.08)",  color: "#eab020" },
  blue:  { bg: "rgba(85,153,240,.08)",  color: "#5599f0" },
  green: { bg: "rgba(45,212,168,.08)",  color: "#2dd4a8" },
};

export function RiskFlags({
  signals,
  hasLisPendens,
  hasInsolvency,
  hasPlanningApplication,
  inFloodZone,
  epcRating,
}: RiskFlagsProps) {
  const flags: Flag[] = [];

  if (hasInsolvency) flags.push({ label: "Administration", severity: "red" });
  if (hasLisPendens) flags.push({ label: "Lis pendens", severity: "red" });
  if (inFloodZone) flags.push({ label: "Flood risk", severity: "amber" });
  if (hasPlanningApplication) flags.push({ label: "Planning application", severity: "blue" });

  if (epcRating) {
    const rating = epcRating.toUpperCase();
    const severity: FlagSeverity =
      rating <= "B" ? "green" :
      rating <= "D" ? "amber" : "red";
    flags.push({ label: `EPC ${rating}`, severity });
  }

  if (signals) {
    for (const signal of signals) {
      if (!flags.some(f => f.label.toLowerCase() === signal.toLowerCase())) {
        flags.push({ label: signal, severity: "amber" });
      }
    }
  }

  if (flags.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {flags.map((flag, i) => {
        const { bg, color } = COLORS[flag.severity];
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: ".3px",
              background: bg,
              color,
            }}
          >
            {flag.label}
          </span>
        );
      })}
    </div>
  );
}
