"use client";

import { useState } from "react";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { useNav } from "./NavContext";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const portfolios = [flMixed, seLogistics];
  const { openSidebar, portfolioId, setPortfolioId } = useNav();
  const current = portfolios.find((p) => p.id === portfolioId) ?? portfolios[0];

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 shrink-0"
      style={{ backgroundColor: "#0B1622", borderBottom: "1px solid #1a2d45" }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={openSidebar}
          className="lg:hidden p-1.5 rounded-md transition-opacity hover:opacity-70 active:opacity-50 -ml-1"
          style={{ color: "#8ba0b8" }}
          aria-label="Open navigation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {title && (
          <h1 className="text-base lg:text-lg font-semibold" style={{ color: "#e8eef5" }}>
            {title}
          </h1>
        )}
      </div>

      {/* Portfolio selector */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-80"
          style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
        >
          <span style={{ color: "#0A8A4C" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="hidden sm:inline">{current.name}</span>
          <span className="sm:hidden">{current.shortName}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#5a7a96" }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute right-0 mt-1.5 w-52 rounded-lg py-1 shadow-2xl z-50"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            {portfolios.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPortfolioId(p.id); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                style={{ color: p.id === portfolioId ? "#0A8A4C" : "#8ba0b8" }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
