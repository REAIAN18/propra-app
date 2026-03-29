"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { computePortfolioHealthScore } from "@/lib/health";
import { useNav } from "./NavContext";
import { ActionQueueDrawer, type ActionQueueItem } from "@/components/ui/ActionQueueDrawer";
import { Wave2Banner } from "@/components/ui/Wave2Banner";

interface TopBarProps {
  title?: string;
  showStepIndicators?: boolean;
  currentStep?: number;
  totalSteps?: number;
  onSkip?: () => void;
}

export function TopBar({ title, showStepIndicators, currentStep = 1, totalSteps = 3, onSkip }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [demoCompany, setDemoCompany] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portfolios = [flMixed, seLogistics];
  const { openSidebar, portfolioId, setPortfolioId } = useNav();
  const current = portfolios.find((p) => p.id === portfolioId) ?? portfolios[0];
  const { overall: healthScore } = computePortfolioHealthScore(current, []);
  const [actionQueueOpen, setActionQueueOpen] = useState(false);
  const [actionItems, setActionItems] = useState<ActionQueueItem[]>([]);

  // Build action queue items from static portfolio data + financing API
  useEffect(() => {
    const sym = current.currency === "USD" ? "$" : "£";
    const today = new Date();
    const items: ActionQueueItem[] = [];

    // Compliance
    current.assets.forEach((a) => {
      a.compliance.forEach((c, idx) => {
        if (c.status !== "expiring_soon" && c.status !== "expired") return;
        const isExpired = c.status === "expired";
        const urgency: ActionQueueItem["urgency"] = isExpired ? "urgent" : "this_month";
        items.push({
          id: `compliance:${a.id}:${idx}`,
          type: "compliance",
          category: "urgent",
          title: `${c.certificate} ${isExpired ? "expired" : "expiring"}`,
          assetName: a.name,
          annualValue: c.fineExposure ?? null,
          currencySym: sym,
          urgency,
          actionLabel: "Review",
          actionHref: "/compliance",
          rank: (c.fineExposure ?? 0) * (isExpired ? 4 : 1.5),
        });
      });
    });

    // Lease expiry (within 180 days)
    current.assets.forEach((a) => {
      a.leases.forEach((l, idx) => {
        const days = Math.round((new Date(l.expiryDate).getTime() - today.getTime()) / 86_400_000);
        if (days < 0 || days > 180) return;
        const urgency: ActionQueueItem["urgency"] = days <= 60 ? "urgent" : days <= 90 ? "this_week" : "this_month";
        const category: ActionQueueItem["category"] = days <= 60 ? "urgent" : "income_uplift";
        items.push({
          id: `lease:${a.id}:${idx}`,
          type: "lease_expiry",
          category,
          title: `Lease expiry — ${l.tenant}, ${days} days`,
          assetName: a.name,
          annualValue: null,
          currencySym: sym,
          urgency,
          actionLabel: "Review",
          actionHref: "/rent-clock",
          rank: days <= 60 ? 8000 : days <= 90 ? 4000 : 2000,
        });
      });
    });

    // Insurance overpay (from portfolio static data)
    const totalInsuranceCurrent = current.assets.reduce((s, a) => s + (a.insurancePremium ?? 0), 0);
    const totalInsuranceMarket = current.assets.reduce((s, a) => s + (a.marketInsurance ?? 0), 0);
    const insuranceSaving = totalInsuranceCurrent - totalInsuranceMarket;
    if (insuranceSaving > 500) {
      items.push({
        id: "insurance:overpay",
        type: "insurance",
        category: "cost_saving",
        title: `Insurance retender — ${sym}${Math.round(insuranceSaving / 1000)}k/yr overpay identified`,
        assetName: null,
        annualValue: insuranceSaving,
        currencySym: sym,
        urgency: "this_month",
        actionLabel: "Get quotes",
        actionHref: "/insurance",
        rank: insuranceSaving * 1.5,
      });
    }

    // Energy overpay (from portfolio static data)
    const totalEnergyCurrent = current.assets.reduce((s, a) => s + (a.energyCost ?? 0), 0);
    const totalEnergyMarket = current.assets.reduce((s, a) => s + (a.marketEnergyCost ?? 0), 0);
    const energySaving = totalEnergyCurrent - totalEnergyMarket;
    if (energySaving > 500) {
      items.push({
        id: "energy:overpay",
        type: "energy_switch",
        category: "cost_saving",
        title: `Energy ${current.currency === "USD" ? "optimisation" : "tariff switch"} — ${sym}${Math.round(energySaving / 1000)}k/yr saving identified`,
        assetName: null,
        annualValue: energySaving,
        currencySym: sym,
        urgency: "this_month",
        actionLabel: current.currency === "USD" ? "Optimise" : "Switch",
        actionHref: "/energy",
        rank: energySaving * 1.5,
      });
    }

    // Additional income opportunities (from portfolio static data)
    const totalAdditionalIncome = current.assets.reduce((s, a) =>
      s + a.additionalIncomeOpportunities
           .filter((o) => o.status !== "live")
           .reduce((ss, o) => ss + o.annualIncome, 0), 0);
    if (totalAdditionalIncome > 0) {
      items.push({
        id: "income:opportunities",
        type: "income",
        category: "income_uplift",
        title: `Additional income identified — EV charging, solar, telecom`,
        assetName: null,
        annualValue: totalAdditionalIncome,
        currencySym: sym,
        urgency: "no_deadline",
        actionLabel: "Activate",
        actionHref: "/income",
        rank: totalAdditionalIncome,
      });
    }

    setActionItems(items);

    // Fetch financing summary for loan maturity alerts
    fetch("/api/user/financing-summary")
      .then(r => r.ok ? r.json() : { loans: [] })
      .then((data: { loans: Array<{ lenderName?: string; daysToMaturity?: number; outstandingBalance?: number; assetName?: string }> }) => {
        const loanItems: ActionQueueItem[] = data.loans
          .filter((l) => l.daysToMaturity !== undefined && l.daysToMaturity <= 90)
          .map((l, idx) => ({
            id: `loan:${idx}`,
            type: "financing",
            category: "urgent" as const,
            title: `Loan maturing in ${l.daysToMaturity} days — ${l.lenderName ?? "lender"}`,
            assetName: l.assetName ?? null,
            annualValue: null,
            currencySym: sym,
            urgency: (l.daysToMaturity! <= 30 ? "urgent" : "this_month") as ActionQueueItem["urgency"],
            actionLabel: "Review",
            actionHref: "/hold-sell",
            rank: l.daysToMaturity! <= 30 ? 10000 : 6000,
          }));
        if (loanItems.length > 0) {
          setActionItems((prev) => [...prev, ...loanItems]);
        }
      })
      .catch(() => {});

    // Fetch DB-backed Wave 2 action queue items (5-min revalidation via cache)
    fetch("/api/user/action-queue")
      .then(r => r.ok ? r.json() : { items: [] })
      .then((data: { items: ActionQueueItem[] }) => {
        if (data.items?.length > 0) {
          setActionItems((prev) => {
            // Merge: deduplicate by id (API items override static if same id)
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = data.items.filter((i) => !existingIds.has(i.id));
            return [...prev, ...newItems];
          });
        }
      })
      .catch(() => {});
  }, [current]);

  useEffect(() => { setDemoCompany(localStorage.getItem("realhq_company") ?? ""); }, []);

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
  <>
    <header
      className="flex items-center justify-between px-4 lg:px-5 shrink-0"
      style={{ height: 52, backgroundColor: "var(--s1)", borderBottom: "1px solid var(--bdr)" }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {!showStepIndicators && (
          <button
            onClick={openSidebar}
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-md transition-opacity hover:opacity-70 -ml-1"
            style={{ color: "var(--tx3)" }}
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4.5H16M2 9H16M2 13.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {title && !showStepIndicators && (
          <h1 className="text-sm font-bold" style={{ color: "var(--tx)" }}>
            {title}
          </h1>
        )}
        {!showStepIndicators && (
          <span className="hidden sm:block text-[11px]" style={{ color: "var(--tx3)" }}>
            {current.name} · {current.assets.length} assets · AI monitoring live
          </span>
        )}

        {/* RealHQ brand mark for onboarding */}
        {showStepIndicators && (
          <div className="text-base" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
            <span style={{ color: "var(--acc)", fontStyle: "italic" }}>R</span>ealHQ
          </div>
        )}
      </div>

      {/* Step indicators — center */}
      {showStepIndicators && (
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const isDone = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            return (
              <div key={stepNum} className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor: isDone
                      ? "var(--grn)"
                      : isActive
                      ? "var(--acc)"
                      : "var(--bdr)",
                  }}
                />
                {stepNum < totalSteps && (
                  <div
                    className="w-8 h-px transition-colors"
                    style={{
                      backgroundColor: isDone ? "var(--grn)" : "var(--bdr)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Skip to dashboard button — onboarding only */}
        {showStepIndicators && onSkip && (
          <button
            onClick={onSkip}
            className="text-xs transition-colors hover:opacity-70"
            style={{ color: "var(--tx3)" }}
          >
            Skip to dashboard →
          </button>
        )}

        {/* Action Queue badge — replaces legacy "X Urgent" chip */}
        {!showStepIndicators && (() => {
          const hasUrgent = actionItems.some((i) => i.urgency === "urgent" || i.category === "urgent");
          const sym = current.currency === "USD" ? "$" : "£";
          const totalVal = actionItems.reduce((s, i) => s + (i.annualValue ?? 0), 0);
          const bg = hasUrgent ? "var(--red-lt)" : "var(--acc-lt)";
          const color = hasUrgent ? "#f87171" : "#7c6af0";
          const border = hasUrgent ? "1px solid rgba(217,48,37,.2)" : "1px solid rgba(22,71,232,.2)";
          return (
            <button
              onClick={() => setActionQueueOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
              style={{ backgroundColor: bg, color, border }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{ backgroundColor: color }}
              />
              {actionItems.length} item{actionItems.length !== 1 ? "s" : ""}
              {totalVal > 0 && ` · ${sym}${totalVal >= 1000 ? Math.round(totalVal / 1000) + "k" : Math.round(totalVal)}/yr`}
            </button>
          );
        })()}

        {/* Export button — matches prototype .btn-s */}
        {!showStepIndicators && (
          <button
            className="hidden md:block px-3 py-[5px] rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-100"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", color: "var(--tx2)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--s2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
            onClick={() => window.print()}
          >
            Export
          </button>
        )}

        {/* + Add Property — secondary button */}
        {!showStepIndicators && (
          <Link
            href="/properties/add"
            className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-100"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", color: "var(--tx2)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--s2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Add Property
          </Link>
        )}

        {/* Run Full Analysis — green primary button */}
        {!showStepIndicators && (
          <Link
            href="/ask"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-100 hover:opacity-90"
            style={{ backgroundColor: "#7c6af0", color: "#fff" }}
          >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.2 2.4L10 4l-2 2 .5 2.5L6 7.4 3.5 8.5 4 6 2 4l2.8-.6z" fill="currentColor"/></svg>
          Run Full Analysis
        </Link>
        )}

        {/* Portfolio health score */}
        {!showStepIndicators && (
          <div
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: healthScore >= 70 ? "var(--grn-lt)" : healthScore >= 50 ? "var(--amb-lt)" : "var(--red-lt)",
            color: healthScore >= 70 ? "#34d399" : healthScore >= 50 ? "#fbbf24" : "#f87171",
          }}
          title="Portfolio health score"
        >
            <span style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif" }}>{healthScore}</span>
            <span style={{ opacity: 0.6, fontSize: 10 }}>/100</span>
          </div>
        )}

        {/* Portfolio selector */}
        {!showStepIndicators && (
          <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", color: "var(--tx2)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--s2)"; }}
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
        )}
      </div>
    </header>

    {/* Wave 2 first-login banner — shown once, below header, above page content */}
    <Wave2Banner
      itemCount={actionItems.length}
      onSeeWhatsNew={() => setActionQueueOpen(true)}
    />

    {/* Action Queue drawer — portal, rendered outside the header */}
    <ActionQueueDrawer
      open={actionQueueOpen}
      onClose={() => setActionQueueOpen(false)}
      items={actionItems}
    />
  </>
  );
}
