"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold print:hidden"
      style={{ backgroundColor: "var(--grn)", color: "#fff" }}
    >
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M3.5 1h8A1.5 1.5 0 0 1 13 2.5v4H2v-4A1.5 1.5 0 0 1 3.5 1zM2 6.5h11v5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 11.5v-5zM5 9h5M5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      Print / Save as PDF
    </button>
  );
}
