"use client";
// OUTREACH FREEZE — Prospect pipeline disabled until Wave 1 insurance is live.
// Rule 1: No outreach tooling until carrier API quotes are returning real data.
export function ProspectsContent() {
  return (
    <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
      <div className="text-sm font-semibold mb-2" style={{ color: "#F5A94A" }}>Outreach Frozen</div>
      <p className="text-sm" style={{ color: "#5a7a96" }}>
        Prospect pipeline is disabled until Wave 1 insurance (KR1) is live with real carrier API quotes.
      </p>
    </div>
  );
}
