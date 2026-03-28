"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type ActionCategory = "cost_saving" | "income_uplift" | "urgent" | "refinance" | "value_add";
export type ActionUrgency = "urgent" | "this_week" | "this_month" | "no_deadline";

export interface ActionQueueItem {
  id: string;
  type: string;
  category: ActionCategory;
  title: string;
  assetName: string | null;
  annualValue: number | null;    // in portfolio currency
  currencySym: string;           // "$" | "£"
  urgency: ActionUrgency;
  actionLabel: string;
  actionHref: string;
  rank: number;
}

const CATEGORY_STYLE: Record<ActionCategory, { bg: string; color: string; label: string }> = {
  cost_saving:   { bg: "var(--acc-lt)", color: "#7c6af0", label: "Cost saving" },
  income_uplift: { bg: "var(--grn-lt)", color: "#34d399", label: "Income uplift" },
  urgent:        { bg: "var(--red-lt)", color: "#f87171", label: "Urgent" },
  refinance:     { bg: "rgba(13,148,136,0.07)", color: "#0d9488", label: "Refinance" },
  value_add:     { bg: "rgba(107,33,168,0.07)", color: "#a855f7", label: "Value add" },
};

const URGENCY_LABEL: Record<ActionUrgency, string> = {
  urgent:       "Act now",
  this_week:    "This week",
  this_month:   "This month",
  no_deadline:  "No deadline",
};

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${Math.round(v).toLocaleString()}`;
}

type FilterTab = "all" | "urgent" | "savings" | "income" | "deals";

interface ActionQueueDrawerProps {
  open: boolean;
  onClose: () => void;
  items: ActionQueueItem[];
}

export function ActionQueueDrawer({ open, onClose, items }: ActionQueueDrawerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Load dismissed IDs from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("realhq_dismissed_actions") ?? "[]") as string[];
      setDismissed(new Set(stored));
    } catch { /* ignore */ }
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function dismiss(id: string) {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    try {
      localStorage.setItem("realhq_dismissed_actions", JSON.stringify([...next]));
    } catch { /* ignore */ }
  }

  const visible = items.filter((i) => !dismissed.has(i.id)).sort((a, b) => b.rank - a.rank);

  const filtered = visible.filter((i) => {
    if (activeTab === "all") return true;
    if (activeTab === "urgent") return i.urgency === "urgent" || i.category === "urgent";
    if (activeTab === "savings") return i.category === "cost_saving";
    if (activeTab === "income") return i.category === "income_uplift";
    if (activeTab === "deals") return i.category === "value_add" || i.category === "refinance";
    return true;
  });

  const totalValue = visible.reduce((s, i) => s + (i.annualValue ?? 0), 0);
  const sym = visible[0]?.currencySym ?? "£";
  const urgentCount = visible.filter((i) => i.urgency === "urgent" || i.category === "urgent").length;

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",     label: "All",     count: visible.length },
    { key: "urgent",  label: "Urgent",  count: urgentCount },
    { key: "savings", label: "Savings", count: visible.filter((i) => i.category === "cost_saving").length },
    { key: "income",  label: "Income",  count: visible.filter((i) => i.category === "income_uplift").length },
    { key: "deals",   label: "Deals",   count: visible.filter((i) => i.category === "value_add" || i.category === "refinance").length },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: "min(400px, 100vw)",
          backgroundColor: "var(--s1)",
          borderLeft: "1px solid var(--bdr)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-4 shrink-0" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
              RealHQ found {visible.length} thing{visible.length !== 1 ? "s" : ""} across your portfolio
            </div>
            {totalValue > 0 && (
              <div className="text-xs mt-0.5" style={{ color: "#34d399" }}>
                {fmt(totalValue, sym)}/yr of value identified
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-gray-100"
            style={{ color: "var(--tx2)" }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 flex gap-1 shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--bdr)", paddingTop: 10, paddingBottom: 0 }}>
          {TABS.filter((t) => t.count > 0 || t.key === "all").map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1 px-2.5 py-2 text-[11.5px] font-medium whitespace-nowrap transition-colors border-b-2"
              style={{
                color: activeTab === tab.key ? "#111827" : "#9CA3AF",
                borderBottomColor: activeTab === tab.key ? "#111827" : "transparent",
              }}
            >
              {tab.label}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: tab.key === "urgent" && tab.count > 0 ? "var(--red-lt)" : "var(--s2)",
                  color: tab.key === "urgent" && tab.count > 0 ? "#f87171" : "#6B7280",
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--grn-lt)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 4" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                {visible.length === 0
                  ? "No open actions right now"
                  : "No items in this category"}
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                {visible.length === 0
                  ? "RealHQ is monitoring your portfolio."
                  : "Switch tabs to see other opportunities."}
              </div>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--s2)" }}>
              {filtered.map((item) => {
                const cat = CATEGORY_STYLE[item.category];
                const urgencyLabel = URGENCY_LABEL[item.urgency];
                const isUrgent = item.urgency === "urgent" || item.category === "urgent";
                return (
                  <div
                    key={item.id}
                    className="px-5 py-4 transition-colors hover:bg-[#FAFAFA]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ backgroundColor: cat.bg, color: cat.color }}
                      >
                        {cat.label.toUpperCase()}
                      </span>
                      <button
                        onClick={() => dismiss(item.id)}
                        className="shrink-0 h-4 w-4 flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity"
                        aria-label="Dismiss"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1 1l8 8M9 1L1 9" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {item.assetName && (
                      <div className="text-[10px] mb-0.5" style={{ color: "var(--tx3)" }}>{item.assetName}</div>
                    )}

                    <div className="text-xs font-medium mb-2" style={{ color: "var(--tx)" }}>
                      {item.title}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.annualValue != null && item.annualValue > 0 && (
                          <span className="text-xs font-bold" style={{ color: "#34d399", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                            {fmt(item.annualValue, item.currencySym)}/yr
                          </span>
                        )}
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: isUrgent ? "#f87171" : "#9CA3AF" }}
                        >
                          {urgencyLabel}
                        </span>
                      </div>

                      <Link
                        href={item.actionHref}
                        onClick={onClose}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                        style={{ backgroundColor: isUrgent ? "var(--red-lt)" : "var(--acc-lt)", color: isUrgent ? "#f87171" : "#7c6af0" }}
                      >
                        {item.actionLabel} →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "var(--s2)" }}>
          <div className="text-[10px] text-center" style={{ color: "var(--tx3)" }}>
            All insights update automatically as RealHQ monitors your portfolio.
          </div>
        </div>
      </div>
    </>
  );
}
