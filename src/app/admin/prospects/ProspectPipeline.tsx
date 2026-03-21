"use client";
// OUTREACH FREEZE — disabled until Wave 1 KR1 achieved.
export function ProspectPipeline({ market }: { market: "fl" | "seuk" }) {
  return (
    <div className="text-sm p-4" style={{ color: "#5a7a96" }}>
      Prospect pipeline ({market.toUpperCase()}) disabled — outreach freeze in effect.
    </div>
  );
}
