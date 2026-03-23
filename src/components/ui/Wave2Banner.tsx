"use client";

import { useEffect, useState } from "react";

interface Wave2BannerProps {
  itemCount: number;
  onSeeWhatsNew: () => void;
}

const STORAGE_KEY = "realhq_wave2_banner_dismissed";

export function Wave2Banner({ itemCount, onSeeWhatsNew }: Wave2BannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      if (!dismissed) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  }

  if (!visible) return null;

  return (
    <div
      className="flex items-center justify-between px-4 lg:px-5 gap-3 shrink-0"
      style={{
        height: 44,
        backgroundColor: "#EEF2FE",
        borderBottom: "1px solid #C7D7FA",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#1647E8" }} />
        <span className="text-[11.5px] truncate" style={{ color: "#1647E8" }}>
          RealHQ has been updated — energy intelligence is now live.
          {itemCount > 0 && ` We found ${itemCount} new opportunit${itemCount === 1 ? "y" : "ies"} across your portfolio.`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { onSeeWhatsNew(); dismiss(); }}
          className="text-[11.5px] font-semibold transition-opacity hover:opacity-80"
          style={{ color: "#1647E8" }}
        >
          See what&apos;s new →
        </button>
        <button
          onClick={dismiss}
          className="h-5 w-5 flex items-center justify-center rounded transition-colors hover:bg-blue-100"
          style={{ color: "#1647E8" }}
          aria-label="Dismiss"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
