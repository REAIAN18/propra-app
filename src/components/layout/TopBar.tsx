"use client";

import { useState, useRef, useEffect } from "react";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio } from "@/lib/data/types";
import { useNav } from "./NavContext";

interface TopBarProps {
  title?: string;
}

function computeHealthScore(portfolio: Portfolio) {
  let score = 100;

  // Insurance: deduct up to 25 pts based on overpay %
  const totalPremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalMarket = portfolio.assets.reduce((s, a) => s + a.marketInsurance, 0);
  const overpayPct = totalMarket > 0 ? ((totalPremium - totalMarket) / totalPremium) * 100 : 0;
  score -= Math.min(25, overpayPct * 0.8);

  // Compliance: deduct 8 pts per expired, 4 pts per expiring
  const allCompliance = portfolio.assets.flatMap((a) => a.compliance);
  const expiredCount = allCompliance.filter((c) => c.status === "expired").length;
  const expiringSoonCount = allCompliance.filter((c) => c.status === "expiring_soon").length;
  score -= expiredCount * 8 + expiringSoonCount * 4;

  // Leases: deduct up to 15 pts based on vacant units
  const vacantLeases = portfolio.assets.flatMap((a) => a.leases.filter((l) => l.tenant === "Vacant")).length;
  score -= Math.min(15, vacantLeases * 5);

  // Energy: deduct up to 15 pts based on overpay %
  const totalEnergy = portfolio.assets.reduce((s, a) => s + a.energyCost, 0);
  const totalMarketEnergy = portfolio.assets.reduce((s, a) => s + a.marketEnergyCost, 0);
  const energyOverpayPct = totalMarketEnergy > 0 ? ((totalEnergy - totalMarketEnergy) / totalEnergy) * 100 : 0;
  score -= Math.min(15, energyOverpayPct * 0.5);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function TopBar({ title }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portfolios = [flMixed, seLogistics];
  const { openSidebar, portfolioId, setPortfolioId } = useNav();
  const current = portfolios.find((p) => p.id === portfolioId) ?? portfolios[0];
  const healthScore = computeHealthScore(current);

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

      {/* Portfolio health score */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: healthScore >= 70 ? "#0f2a1c" : healthScore >= 50 ? "#2e1e0a" : "#2e0f0a",
          color: healthScore >= 70 ? "#0A8A4C" : healthScore >= 50 ? "#F5A94A" : "#f06040",
          border: `1px solid ${healthScore >= 70 ? "#0A8A4C" : healthScore >= 50 ? "#F5A94A" : "#f06040"}`,
        }}
        title="Portfolio health score — measures insurance, energy, compliance, and occupancy vs benchmarks"
      >
        <span>{healthScore}</span>
        <span style={{ opacity: 0.7 }}>/100</span>
        <span style={{ opacity: 0.6 }}>health</span>
      </div>

      {/* Portfolio selector */}
      <div className="relative" ref={dropdownRef}>
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
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="transition-transform duration-150"
            style={{ color: "#5a7a96", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
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
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:opacity-80 flex items-center gap-2"
                style={{ color: p.id === portfolioId ? "#0A8A4C" : "#8ba0b8" }}
              >
                {p.id === portfolioId && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                    <path d="M2 6L5 9L10 3" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {p.id !== portfolioId && <span className="w-3 shrink-0" />}
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
