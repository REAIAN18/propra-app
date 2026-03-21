"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Portfolio } from "@/lib/data/types";
import { useNav } from "./NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

// ── Nav structure ─────────────────────────────────────────────────────────────
type NavItem = {
  href: string;
  label: string;
  badge?: number;
  badgeVariant?: "green" | "amber" | "red" | "gray";
  liveTag?: boolean;
  icon: React.ReactNode;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function Ico({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={fill ? undefined : "currentColor"} strokeWidth="1.5">
      <path d={d} fill={fill ? "currentColor" : undefined} />
    </svg>
  );
}

// ── Alert computation ─────────────────────────────────────────────────────────
function computeAlerts(portfolio: Portfolio, financingAlertCount: number) {
  const today = new Date();

  const insurance = portfolio.assets.filter(
    (a) => a.marketInsurance > 0 && (a.insurancePremium - a.marketInsurance) / a.insurancePremium > 0.15
  ).length;

  const energy = portfolio.assets.filter(
    (a) => a.marketEnergyCost > 0 && (a.energyCost - a.marketEnergyCost) / a.energyCost > 0.15
  ).length;

  const income = portfolio.assets.flatMap((a) => a.additionalIncomeOpportunities).filter((o) => o.status === "identified").length;

  const compliance = portfolio.assets.flatMap((a) => a.compliance).filter((c) => c.status === "expiring_soon" || c.status === "expired").length;

  const expiringLeases = portfolio.assets.flatMap((a) => a.leases).filter((l) => l.status === "expiring_soon").length;
  const urgentBreaks = portfolio.assets.flatMap((a) => a.leases).filter((l) => {
    if (!l.breakDate) return false;
    const days = Math.round((new Date(l.breakDate).getTime() - today.getTime()) / 86400000);
    return days > 0 && days <= 90;
  }).length;

  return { insurance, energy, income, compliance, rentClock: expiringLeases + urgentBreaks, financing: financingAlertCount };
}

// ── Badge component ───────────────────────────────────────────────────────────
function NavBadge({ count, variant = "gray" }: { count: number; variant?: "green" | "amber" | "red" | "gray" }) {
  if (count === 0) return null;
  const styles: Record<string, string> = {
    green: "background:#E8F5EE;color:#0A8A4C",
    amber: "background:#FEF6E8;color:#92580A",
    red: "background:#FDECEA;color:#D93025",
    gray: "background:#F3F4F6;color:#6B7280",
  };
  return (
    <span
      className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none font-mono"
      style={{ background: styles[variant].split(";")[0].split(":")[1], color: styles[variant].split(";")[1].split(":")[1] }}
    >
      {count}
    </span>
  );
}

function LivePill() {
  return (
    <span className="ml-auto flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E8F5EE] text-[#0A8A4C]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0A8A4C] animate-pulse" />
      LIVE
    </span>
  );
}

function SavingPill({ text, color }: { text: string; color: "green" | "teal" }) {
  const bg = color === "green" ? "#E8F5EE" : "#E6F7F6";
  const fg = color === "green" ? "#0A8A4C" : "#0D9488";
  return (
    <span className="ml-auto text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: bg, color: fg }}>
      {text}
    </span>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [financingAlertCount, setFinancingAlertCount] = useState(0);
  const alerts = computeAlerts(portfolio, financingAlertCount);
  const [activeRequestCount, setActiveRequestCount] = useState(0);

  const sym = portfolio.currency === "USD" ? "$" : "£";
  const totalInsuranceSave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.insurancePremium - a.marketInsurance), 0);
  const totalEnergySave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.energyCost - a.marketEnergyCost), 0);
  const fmtSave = (v: number) => v >= 1000 ? `${sym}${Math.round(v / 1000)}k` : `${sym}${v}`;

  useEffect(() => {
    fetch("/api/user/financing-summary")
      .then(r => r.ok ? r.json() : { loans: [] })
      .then((data: { loans: Array<{ daysToMaturity?: number; icr?: number; icrCovenant?: number }> }) => {
        const count = data.loans.filter(
          (l) => (l.daysToMaturity !== undefined && l.daysToMaturity <= 90) ||
                 (l.icr !== undefined && l.icrCovenant !== undefined && l.icr < l.icrCovenant)
        ).length;
        setFinancingAlertCount(count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/user/requests")
      .then(r => r.ok ? r.json() : [])
      .then((leads: Array<{ status: string }>) => {
        setActiveRequestCount(leads.filter(l => l.status !== "done" && l.status !== "not_proceeding").length);
      })
      .catch(() => {});
  }, []);

  const sections: NavSection[] = [
    {
      title: "Overview",
      items: [
        {
          href: "/dashboard",
          label: "Value Dashboard",
          icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor"/><rect x="7.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".4"/><rect x="1" y="7.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".4"/><rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".4"/></svg>,
        },
        {
          href: "/assets",
          label: "Properties",
          badge: portfolio.assets.length,
          badgeVariant: "gray",
          icon: <Ico d="M2 11V5.5L7 2.5l5 3V11M4.5 7H5.5V11H4.5zM8.5 7H9.5V11H8.5z" />,
        },
        {
          href: "/audit",
          label: "Portfolio Analytics",
          icon: <Ico d="M2 10l3-3.5 2.5 2.5 4.5-6" />,
        },
      ],
    },
    {
      title: "Income Enhancement",
      items: [
        {
          href: "/rent-clock",
          label: "Rent Optimisation",
          badge: alerts.rentClock,
          badgeVariant: alerts.rentClock > 0 ? "amber" : "gray",
          icon: <Ico d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM7 4.5V7l1.5 1.5" />,
        },
        {
          href: "/tenants",
          label: "Lease Restructuring",
          icon: <Ico d="M1.5 2.5h11a1 1 0 011 1v8a1 1 0 01-1 1h-11a1 1 0 01-1-1v-8a1 1 0 011-1zM4.5 2.5V1.5M9.5 2.5V1.5M1.5 6h11" />,
        },
        {
          href: "/income",
          label: "Ancillary Revenue",
          badge: alerts.income,
          badgeVariant: "green",
          icon: <Ico d="M7 2v10M3.5 5.5L7 2l3.5 3.5M3 10.5h8" />,
        },
        {
          href: "/ask",
          label: "AI Opportunities",
          badge: alerts.income > 0 ? alerts.income + 3 : 0,
          badgeVariant: "green",
          icon: <Ico d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM5 7h4M7 5v4" />,
        },
      ],
    },
    {
      title: "Cost Reduction",
      items: [
        {
          href: "/insurance",
          label: "Insurance Audit",
          icon: <Ico d="M7 1.5l1.2 2.6 2.8.4-2 2 .5 2.9L7 8.1l-2.5 1.3.5-2.9-2-2 2.8-.4z" />,
          badge: undefined,
          ...(totalInsuranceSave > 0 && { savePill: { text: fmtSave(totalInsuranceSave), color: "green" as const } }),
        } as NavItem & { savePill?: { text: string; color: "green" | "teal" } },
        {
          href: "/energy",
          label: "Utility Switching",
          ...(totalEnergySave > 0 && { savePill: { text: fmtSave(totalEnergySave), color: "teal" as const } }),
          icon: <Ico d="M7 2.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM7 5.5v3M5.5 8.5c0 1.7 3 1.7 3 0" />,
        } as NavItem & { savePill?: { text: string; color: "green" | "teal" } },
        {
          href: "/work-orders",
          label: "CAM Recovery",
          icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/><path d="M5 4V3h4v1"/></svg>,
        },
        {
          href: "/compliance",
          label: "Tax & Compliance",
          icon: <Ico d="M1.5 1.5h11v11h-11zM4.5 7h5M7 4.5v5" />,
        },
      ],
    },
    {
      title: "Asset Growth",
      items: [
        {
          href: "/hold-sell",
          label: "Hold vs Sell",
          icon: <Ico d="M2 12l3.5-4 2.5 2.5 4-6" />,
        },
        {
          href: "/financing",
          label: "Refinance Centre",
          badge: alerts.financing,
          badgeVariant: alerts.financing > 0 ? "red" : "gray",
          icon: <Ico d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM7 4.5V7l1.5 1.5" />,
        },
        {
          href: "/scout",
          label: "Acquisitions Scout",
          icon: <Ico d="M7 2.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" />,
        },
        {
          href: "/planning",
          label: "Planning & Dev",
          icon: <Ico d="M7 1l5 3v4a5 5 0 01-5 5 5 5 0 01-5-5V4z" />,
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          href: "/ask",
          label: "AI Insights",
          liveTag: true,
          icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="2.5"/><path d="M7 1.5v2M7 10.5v2M1.5 7h2M10.5 7h2"/></svg>,
        },
        {
          href: "/compliance",
          label: "Compliance",
          badge: alerts.compliance,
          badgeVariant: alerts.compliance > 0 ? "red" : "gray",
          icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5.5H3a.8.8 0 00-.8.8v5.4a.8.8 0 00.8.8h8a.8.8 0 00.8-.8V6.3a.8.8 0 00-.8-.8z"/><path d="M4.5 5.5V4a2.5 2.5 0 015 0v1.5"/></svg>,
        },
        {
          href: "/tenants",
          label: "Tenants & Rent Clock",
          icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="5" r="2.5"/><path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5"/></svg>,
        },
        {
          href: "/work-orders",
          label: "Work Orders",
          icon: <Ico d="M1.5 3h11v8a1 1 0 01-1 1h-9a1 1 0 01-1-1V3zM4.5 3V2M9.5 3V2" />,
        },
      ],
    },
    {
      title: "Platform",
      items: [
        {
          href: "/requests",
          label: "Opportunity Inbox",
          badge: activeRequestCount,
          badgeVariant: activeRequestCount > 0 ? "amber" : "gray",
          icon: <Ico d="M2.5 9.5l2-2 1.5 1.5 4-5M1.5 1.5h11v11h-11z" />,
        },
        {
          href: "/report",
          label: "Portfolio Report",
          icon: <Ico d="M3.5 1.5h7l3 3v9a1 1 0 01-1 1h-9a1 1 0 01-1-1v-11a1 1 0 011-1zM10.5 1.5V5h3M5 8h7M5 11h5" />,
        },
        {
          href: "/documents",
          label: "Documents",
          icon: <Ico d="M3 2C3 1.45 3.45 1 4 1H10.5L14 4.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V2zM10.5 1V5H14M6 7h4M6 10h3" />,
        },
      ],
    },
  ];

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <aside
      className="h-full flex flex-col overflow-y-auto overflow-x-hidden"
      style={{ width: 220, minWidth: 220, backgroundColor: "#fff", borderRight: "1px solid #E5E7EB" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3.5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold leading-none flex-shrink-0"
            style={{ backgroundColor: "#0A8A4C", letterSpacing: "-0.5px" }}
          >
            R
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "#111827", letterSpacing: "-0.3px" }}>RealHQ</div>
            <div className="text-[10px]" style={{ color: "#9CA3AF" }}>{portfolio.shortName}</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded transition-opacity hover:opacity-70"
            style={{ color: "#6B7280" }}
            aria-label="Close navigation"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 2.5L11.5 11.5M11.5 2.5L2.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-2 space-y-0.5">
        {sections.map((section) => (
          <div key={section.title} className="px-2.5 pt-3 pb-0.5">
            <div
              className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 mb-1"
              style={{ color: "#9CA3AF", letterSpacing: "0.07em" }}
            >
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const extItem = item as NavItem & { savePill?: { text: string; color: "green" | "teal" } };
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-100 whitespace-nowrap"
                    style={{
                      color: active ? "#0A8A4C" : "#4B5563",
                      backgroundColor: active ? "#E8F5EE" : "transparent",
                      border: active ? "1px solid rgba(10,138,76,.15)" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <span style={{ opacity: active ? 1 : 0.65 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.liveTag && <LivePill />}
                    {extItem.savePill && !item.badge && <SavingPill text={extItem.savePill.text} color={extItem.savePill.color} />}
                    {item.badge !== undefined && item.badge > 0 && (
                      <NavBadge count={item.badge} variant={item.badgeVariant ?? "gray"} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3.5 py-3" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
          Commission-only · 0 upfront fees
        </div>
      </div>
    </aside>
  );
}
