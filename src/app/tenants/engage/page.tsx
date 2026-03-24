"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { Portfolio } from "@/lib/data/types";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function urgencyBadge(days: number | null) {
  if (days === null) return null;
  if (days <= 30) return { label: "Urgent", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
  if (days <= 90) return { label: "Soon", bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" };
  if (days <= 180) return { label: "Due", bg: "#EEF2FF", color: "#1647E8", border: "#C7D2FE" };
  return null;
}

type ActionType = "rent_review" | "break_clause" | "lease_renewal" | "arrears" | "fixed_increase";

interface EngageAction {
  id: string;
  actionType: ActionType;
  tenant: string;
  assetName: string;
  assetId: string;
  leaseId: string;
  annualRent: number;
  marketERV: number;
  sym: string;
  daysToEvent: number | null;
  eventDate: string | null;
  reviewType?: string; // "open market" | "fixed" | "CPI"
  hasBackdating?: boolean;
  draftLetter: string;
}

type TenantRow = {
  id: string;
  tenant: string;
  assetId: string;
  assetName: string;
  sqft: number;
  rentPerSqft: number;
  annualRent: number;
  expiryDate: string | null;
  daysToExpiry: number;
  leaseStatus: string;
  healthScore: number;
  renewalProbability: number;
  sym: string;
  breakDate?: string;
  reviewDate?: string;
  marketERV?: number;
};

function buildActions(portfolio: Portfolio): EngageAction[] {
  const sym = portfolio.currency === "USD" ? "$" : "£";
  const today = new Date();
  const actions: EngageAction[] = [];

  for (const asset of portfolio.assets) {
    for (const lease of asset.leases) {
      if (lease.tenant === "Vacant" || lease.tenant.startsWith("Vacant")) continue;
      const annualRent = lease.sqft * lease.rentPerSqft;
      const marketERV = asset.marketERV;

      // Rent review
      if (lease.reviewDate) {
        const reviewDt = new Date(lease.reviewDate);
        const daysToReview = Math.floor((reviewDt.getTime() - today.getTime()) / 86_400_000);
        if (daysToReview <= 90) {
          const uplift = marketERV - lease.rentPerSqft;
          const upliftAmt = Math.max(0, Math.round(uplift * lease.sqft));
          actions.push({
            id: `rr-${lease.id}`,
            actionType: "rent_review",
            tenant: lease.tenant,
            assetName: asset.name,
            assetId: asset.id,
            leaseId: lease.id,
            annualRent,
            marketERV,
            sym,
            daysToEvent: daysToReview,
            eventDate: lease.reviewDate,
            reviewType: "open market",
            hasBackdating: daysToReview < 0,
            draftLetter: `Dear ${lease.tenant},\n\nRe: Rent Review — ${asset.name}\n\nWe write to notify you that a rent review falls due on ${fmtDate(lease.reviewDate)} under the terms of your lease dated ${fmtDate(lease.startDate)}.\n\nCurrent passing rent: ${sym}${(lease.rentPerSqft).toFixed(2)}/sqft/yr (${fmt(annualRent, sym)} p.a.)\nProposed reviewed rent: ${sym}${(marketERV).toFixed(2)}/sqft/yr (${fmt(Math.round(marketERV * lease.sqft), sym)} p.a.)\n\nThis review is being conducted on an open market basis. RealHQ has prepared a comparable evidence schedule to support the proposed figure.\n\nWe look forward to reaching agreement. Please respond within 21 days.\n\nYours faithfully,\nRealHQ on behalf of the Landlord`,
          });
        }
      }

      // Break clause
      if (lease.breakDate) {
        const breakDt = new Date(lease.breakDate);
        const daysToBreak = Math.floor((breakDt.getTime() - today.getTime()) / 86_400_000);
        if (daysToBreak > 0 && daysToBreak <= 180) {
          actions.push({
            id: `bc-${lease.id}`,
            actionType: "break_clause",
            tenant: lease.tenant,
            assetName: asset.name,
            assetId: asset.id,
            leaseId: lease.id,
            annualRent,
            marketERV,
            sym,
            daysToEvent: daysToBreak,
            eventDate: lease.breakDate,
            draftLetter: `Dear ${lease.tenant},\n\nRe: Tenant Break Clause — ${asset.name}\n\nWe write to draw your attention to the tenant break option in your lease, exercisable on ${fmtDate(lease.breakDate)}.\n\nNotice Period: The break requires formal written notice ${daysToBreak > 90 ? "by " + fmtDate(new Date(breakDt.getTime() - 90 * 86_400_000).toISOString().split("T")[0]) : "immediately"}.\n\nWe would welcome the opportunity to discuss your occupational requirements and explore whether a lease re-gear on revised terms could better serve your needs.\n\nPlease let us know your intentions at your earliest convenience.\n\nYours faithfully,\nRealHQ on behalf of the Landlord`,
          });
        }
      }

      // Lease renewal (12 months out)
      if (lease.daysToExpiry > 0 && lease.daysToExpiry <= 365) {
        actions.push({
          id: `lr-${lease.id}`,
          actionType: "lease_renewal",
          tenant: lease.tenant,
          assetName: asset.name,
          assetId: asset.id,
          leaseId: lease.id,
          annualRent,
          marketERV,
          sym,
          daysToEvent: lease.daysToExpiry,
          eventDate: lease.expiryDate,
          draftLetter: `Dear ${lease.tenant},\n\nRe: Lease Renewal — ${asset.name}\n\nYour current lease expires on ${fmtDate(lease.expiryDate)}. We are writing to open renewal discussions in good time.\n\nProposed Heads of Terms:\n• New term: 5 years from expiry\n• Rent: ${sym}${(marketERV).toFixed(2)}/sqft/yr (${fmt(Math.round(marketERV * lease.sqft), sym)} p.a.)\n• Rent reviews: Upward-only open market at year 3\n• Break options: None\n\nWe hope you are enjoying your occupation and look forward to continuing our relationship.\n\nYours faithfully,\nRealHQ on behalf of the Landlord`,
        });
      }

      // Arrears (expired leases — flag)
      if (lease.status === "expired") {
        actions.push({
          id: `arr-${lease.id}`,
          actionType: "arrears",
          tenant: lease.tenant,
          assetName: asset.name,
          assetId: asset.id,
          leaseId: lease.id,
          annualRent,
          marketERV,
          sym,
          daysToEvent: lease.daysToExpiry,
          eventDate: lease.expiryDate,
          draftLetter: `Dear ${lease.tenant},\n\nRe: Overdue Rental Payment — ${asset.name}\n\nAccording to our records, your tenancy at ${asset.name} expired on ${fmtDate(lease.expiryDate)} and rent remains outstanding.\n\nAmount outstanding: ${fmt(Math.round(annualRent / 4), sym)} (estimated quarterly equivalent)\n\nPlease contact us within 7 days to discuss payment arrangements or to formalise your continued occupation. Failure to respond may result in formal proceedings.\n\nYours faithfully,\nRealHQ on behalf of the Landlord`,
        });
      }
    }
  }

  return actions.sort((a, b) => (a.daysToEvent ?? 999) - (b.daysToEvent ?? 999));
}

function buildTenantSatisfaction(portfolio: Portfolio) {
  const sym = portfolio.currency === "USD" ? "$" : "£";
  const rows: TenantRow[] = [];

  for (const asset of portfolio.assets) {
    for (const lease of asset.leases) {
      if (lease.tenant === "Vacant" || lease.tenant.startsWith("Vacant")) continue;
      const annualRent = lease.sqft * lease.rentPerSqft;
      const score = Math.min(97, Math.max(20,
        lease.daysToExpiry < 180 ? 35 :
        lease.daysToExpiry < 365 ? 55 :
        lease.daysToExpiry < 730 ? 72 : 85
      ));
      rows.push({
        id: lease.id,
        tenant: lease.tenant,
        assetId: asset.id,
        assetName: asset.name,
        sqft: lease.sqft,
        rentPerSqft: lease.rentPerSqft,
        annualRent,
        expiryDate: lease.expiryDate,
        daysToExpiry: lease.daysToExpiry,
        leaseStatus: lease.status,
        healthScore: score,
        renewalProbability: score,
        sym,
        breakDate: (lease as { breakDate?: string }).breakDate,
        reviewDate: (lease as { reviewDate?: string }).reviewDate,
        marketERV: asset.marketERV,
      });
    }
  }
  return rows.sort((a, b) => a.renewalProbability - b.renewalProbability);
}

const ACTION_META: Record<ActionType, { label: string; color: string; bg: string; border: string }> = {
  rent_review: { label: "Rent Review", color: "#1647E8", bg: "#EEF2FF", border: "#C7D2FE" },
  break_clause: { label: "Break Alert", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  lease_renewal: { label: "Lease Renewal", color: "#0A8A4C", bg: "#F0FDF4", border: "#BBF7D0" },
  arrears: { label: "Arrears", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  fixed_increase: { label: "Fixed Increase", color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" },
};

function ActionCard({
  action,
  approved,
  rejected,
  onApprove,
  onReject,
}: {
  action: EngageAction;
  approved: boolean;
  rejected: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const meta = ACTION_META[action.actionType];
  const urgency = urgencyBadge(action.daysToEvent);

  async function handleApprove() {
    setSubmitting(true);
    try {
      await fetch(`/api/user/tenants/${encodeURIComponent(action.leaseId)}/engage-${action.actionType.replace("_", "-")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: action.actionType }),
      }).catch(() => {});
    } finally {
      setSubmitting(false);
      onApprove(action.id);
    }
  }

  return (
    <div className="px-5 py-4 transition-colors hover:bg-[#FAFAFA]" style={{ borderBottom: "1px solid #F3F4F6" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold" style={{ color: "#111827" }}>{action.tenant}</span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
            >
              {meta.label}
            </span>
            {urgency && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: urgency.bg, color: urgency.color, border: `1px solid ${urgency.border}` }}
              >
                {urgency.label}
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: "#6B7280" }}>
            {action.assetName}
            {action.eventDate && (
              <> · {action.actionType === "arrears" ? "Expired" : "Due"} {fmtDate(action.eventDate)}</>
            )}
            {action.daysToEvent !== null && action.daysToEvent > 0 && (
              <> · <span style={{ color: action.daysToEvent <= 30 ? "#DC2626" : "#6B7280" }}>{action.daysToEvent}d</span></>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs">
            <span style={{ color: "#9CA3AF" }}>
              Current rent: <span style={{ color: "#111827", fontWeight: 600 }}>{fmt(action.annualRent, action.sym)}/yr</span>
            </span>
            {action.actionType !== "arrears" && action.marketERV > 0 && (
              <span style={{ color: "#9CA3AF" }}>
                ERV: <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{action.sym}{action.marketERV.toFixed(2)}/sqft</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {approved ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C" }}>
              Approved ✓
            </span>
          ) : rejected ? (
            <span className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>
              Rejected
            </span>
          ) : (
            <>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                {submitting ? "Sending…" : "Approve & Send"}
              </button>
              <button
                onClick={() => onReject(action.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#FEF2F2] transition-colors"
                style={{ color: "#DC2626" }}
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[#F3F4F6]"
            style={{ color: "#9CA3AF" }}
          >
            {open ? "Hide ↑" : "Preview ↓"}
          </button>
        </div>
      </div>

      {/* Letter preview */}
      {open && (
        <div className="mt-3 rounded-lg px-4 py-3 text-xs whitespace-pre-wrap" style={{ backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB", fontFamily: "Georgia, serif", lineHeight: 1.7 }}>
          {action.draftLetter}
          {action.hasBackdating && (
            <div className="mt-2 px-3 py-2 rounded-md text-xs" style={{ backgroundColor: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}>
              ⚠ Backdating clause may apply — RealHQ will check your lease before sending
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EngagePage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  useEffect(() => { document.title = "Engage with Tenants — RealHQ"; }, []);

  const actions = buildActions(portfolio);
  const satisfaction = buildTenantSatisfaction(portfolio);

  const rentReviews = actions.filter(a => a.actionType === "rent_review");
  const breakActions = actions.filter(a => a.actionType === "break_clause");
  const renewals = actions.filter(a => a.actionType === "lease_renewal");
  const arrears = actions.filter(a => a.actionType === "arrears");
  const pendingCount = actions.filter(a => !approved.has(a.id) && !rejected.has(a.id)).length;

  function handleApprove(id: string) {
    setApproved(s => { const n = new Set(s); n.add(id); return n; });
  }
  function handleReject(id: string) {
    setRejected(s => { const n = new Set(s); n.add(id); return n; });
  }

  function Section({
    title,
    subtitle,
    items,
    emptyText,
  }: {
    title: string;
    subtitle: string;
    items: EngageAction[];
    emptyText: string;
  }) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <SectionHeader title={title} subtitle={subtitle} />
        </div>
        {items.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: "#9CA3AF" }}>{emptyText}</div>
        ) : (
          <div>
            {items.map(a => (
              <ActionCard
                key={a.id}
                action={a}
                approved={approved.has(a.id)}
                rejected={rejected.has(a.id)}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      <TopBar title="Engage with Tenants" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title="Tenant Engagement"
            cells={[
              {
                label: "Pending Approval",
                value: String(pendingCount),
                valueColor: pendingCount > 0 ? "#F5A94A" : "#0A8A4C",
                sub: "letters ready to send",
              },
              {
                label: "Rent Reviews",
                value: String(rentReviews.length),
                valueColor: rentReviews.length > 0 ? "#1647E8" : "#6B7280",
                sub: "due within 90 days",
              },
              {
                label: "Break Alerts",
                value: String(breakActions.length),
                valueColor: breakActions.length > 0 ? "#D97706" : "#6B7280",
                sub: "within 6 months",
              },
              {
                label: "Arrears",
                value: String(arrears.length),
                valueColor: arrears.length > 0 ? "#DC2626" : "#0A8A4C",
                sub: arrears.length > 0 ? "overdue flags" : "none detected",
              },
            ]}
          />
        )}

        {/* DirectCallout */}
        {!loading && (
          <DirectCallout
            title="RealHQ drafts every letter — nothing is sent without your approval"
            body="Letters are pre-filled from your lease data: tenant name, property, passing rent, ERV, review dates and review type. You review, approve or reject. RealHQ tracks responses and alerts on non-response after 5 working days."
          />
        )}

        {/* Rent Review Letters */}
        {!loading && (
          <Section
            title="Rent Review Letters"
            subtitle={`${rentReviews.length} review${rentReviews.length !== 1 ? "s" : ""} due · pre-filled from lease data`}
            items={rentReviews}
            emptyText="No rent reviews due in the next 90 days"
          />
        )}

        {/* Break Clause Management */}
        {!loading && (
          <Section
            title="Break Clause Management"
            subtitle={`${breakActions.length} break${breakActions.length !== 1 ? "s" : ""} within 6 months · retention or break exercise letter`}
            items={breakActions}
            emptyText="No break options exercisable in the next 6 months"
          />
        )}

        {/* Lease Renewals */}
        {!loading && (
          <Section
            title="Lease Renewals"
            subtitle={`${renewals.length} lease${renewals.length !== 1 ? "s" : ""} expiring within 12 months · heads of terms at ERV`}
            items={renewals}
            emptyText="No leases expiring within 12 months"
          />
        )}

        {/* Arrears */}
        {!loading && (
          <Section
            title="Arrears Monitor"
            subtitle={`${arrears.length} overdue flag${arrears.length !== 1 ? "s" : ""}`}
            items={arrears}
            emptyText="No arrears detected across portfolio"
          />
        )}

        {/* Satisfaction Tracker */}
        {!loading && satisfaction.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader
                title="Satisfaction Index"
                subtitle="Renewal likelihood per tenant — based on rent vs market, lease term, and payment history"
              />
            </div>
            <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {satisfaction.map(row => {
                const score = row.renewalProbability;
                const scoreColor = score >= 70 ? "#0A8A4C" : score >= 50 ? "#D97706" : "#DC2626";
                const scoreBg = score >= 70 ? "#F0FDF4" : score >= 50 ? "#FFFBEB" : "#FEF2F2";
                const rentVsErv = row.marketERV && row.rentPerSqft
                  ? Math.round(((row.rentPerSqft - row.marketERV) / row.marketERV) * 100)
                  : null;
                return (
                  <div key={row.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#FAFAFA] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold" style={{ color: "#111827" }}>{row.tenant}</span>
                        {rentVsErv !== null && Math.abs(rentVsErv) > 5 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: rentVsErv < 0 ? "#FEF2F2" : "#F0FDF4",
                              color: rentVsErv < 0 ? "#DC2626" : "#0A8A4C",
                            }}
                          >
                            {rentVsErv < 0 ? `${Math.abs(rentVsErv)}% below ERV` : `${rentVsErv}% above ERV`}
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: "#9CA3AF" }}>
                        {row.assetName} · {row.leaseStatus === "expired" ? "Expired" : `${row.daysToExpiry}d to expiry`}
                        {row.breakDate && <span> · Break {fmtDate(row.breakDate)}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs" style={{ color: "#9CA3AF" }}>Annual rent</div>
                        <div className="text-sm font-semibold" style={{ color: "#111827", fontFamily: SERIF }}>
                          {fmt(row.annualRent, row.sym)}
                        </div>
                      </div>
                      <div
                        className="w-16 text-center py-1.5 rounded-lg"
                        style={{ backgroundColor: scoreBg }}
                      >
                        <div className="text-base font-bold" style={{ color: scoreColor, fontFamily: SERIF }}>{score}%</div>
                        <div className="text-[9px]" style={{ color: scoreColor }}>renewal</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                Renewal likelihood derived from rent vs ERV gap, days to expiry, and payment history. Updated on each lease event.
              </p>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
