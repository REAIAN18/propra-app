"use client";

import { useState, useRef, useEffect } from "react";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { portfolioFinancing } from "@/lib/data/financing";
import { computePortfolioHealthScore } from "@/lib/health";
import { useNav } from "./NavContext";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [demoCompany, setDemoCompany] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portfolios = [flMixed, seLogistics];
  const { openSidebar, portfolioId, setPortfolioId } = useNav();
  const current = portfolios.find((p) => p.id === portfolioId) ?? portfolios[0];
  const loans = portfolioFinancing[current.id] ?? [];
  const { overall: healthScore } = computePortfolioHealthScore(current, loans);

  useEffect(() => { setDemoCompany(localStorage.getItem("arca_company") ?? ""); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [open]);

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-5 shrink-0"
      style={{ height: 52, backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB" }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={openSidebar}
          className="lg:hidden h-9 w-9 flex items-center justify-center rounded-md transition-opacity hover:opacity-70 -ml-1"
          style={{ color: "#6B7280" }}
          aria-label="Open navigation"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4.5H16M2 9H16M2 13.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {title && (
          <h1 className="text-sm font-bold" style={{ color: "#111827" }}>
            {title}
          </h1>
        )}
        <span className="hidden sm:block text-[11px]" style={{ color: "#9CA3AF" }}>
          {current.name} · {current.assets.length} assets · AI monitoring live
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Portfolio health score */}
        <div
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: healthScore >= 70 ? "#E8F5EE" : healthScore >= 50 ? "#FEF6E8" : "#FDECEA",
            color: healthScore >= 70 ? "#0A8A4C" : healthScore >= 50 ? "#92580A" : "#D93025",
          }}
          title="Portfolio health score"
        >
          <span style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif" }}>{healthScore}</span>
          <span style={{ opacity: 0.6, fontSize: 10 }}>/100</span>
        </div>

        {/* Portfolio selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: "#374151" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ color: "#0A8A4C" }}>
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="hidden sm:inline">{demoCompany || current.shortName}</span>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ color: "#9CA3AF", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div
              className="absolute right-0 mt-1 w-52 rounded-lg py-1 shadow-xl z-50"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
            >
              {portfolios.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPortfolioId(p.id); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2"
                  style={{ color: p.id === portfolioId ? "#0A8A4C" : "#4B5563" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {p.id === portfolioId && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0">
                      <path d="M2 6L5 9L10 3" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {p.id !== portfolioId && <span className="w-[11px] shrink-0" />}
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
