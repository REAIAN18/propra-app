"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { Portfolio } from "@/lib/data/types";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

// ── Health score (0–100) derived from days to expiry ─────────────────────────
function healthScore(daysToExpiry: number, status: string): number {
  if (status === "expired" || daysToExpiry === 0) return 0;
  if (daysToExpiry < 180) return Math.round(25 + (daysToExpiry / 180) * 20);
  if (daysToExpiry < 365) return Math.round(45 + ((daysToExpiry - 180) / 185) * 20);
  if (daysToExpiry < 730) return Math.round(65 + ((daysToExpiry - 365) / 365) * 20);
  return Math.min(97, Math.round(85 + ((daysToExpiry - 730) / 365) * 12));
}

function renewalProbability(daysToExpiry: number, status: string): number {
  if (status === "expired") return 0;
  if (daysToExpiry < 180) return Math.round(40 + (daysToExpiry / 180) * 20);
  if (daysToExpiry < 365) return Math.round(60 + ((daysToExpiry - 180) / 185) * 15);
  return Math.min(95, Math.round(75 + ((daysToExpiry - 365) / 730) * 20));
}

function scoreColor(score: number) {
  if (score >= 75) return { bg: "#F0FDF4", border: "#0A8A4C40", text: "#0A8A4C", label: "green" };
  if (score >= 50) return { bg: "#FFFBEB", border: "#F5A94A40", text: "#D97706", label: "amber" };
  return { bg: "#FEF2F2", border: "#DC262640", text: "#DC2626", label: "red" };
}

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtDays(days: number) {
  if (days <= 0) return "Expired";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}

// ── Sparkline (static 12-month payment history) ───────────────────────────────
function PaymentSparkline({ status }: { status: string }) {
  const bars = Array.from({ length: 12 }, (_, i) => {
    // Expired tenants might have missed recent payments
    const missed = status === "expired" && i >= 9;
    return missed ? 0.3 : 1;
  });

  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-2 rounded-sm"
          style={{
            height: `${h * 100}%`,
            backgroundColor: h === 1 ? "#0A8A4C" : "#DC2626",
            opacity: 0.7 + i * 0.025,
          }}
        />
      ))}
    </div>
  );
}

// ── Tenant data shape ─────────────────────────────────────────────────────────
interface TenantRow {
  id: string;
  tenant: string;
  assetId: string;
  assetName: string;
  sqft: number;
  rentPerSqft: number;
  annualRent: number;
  startDate: string;
  expiryDate: string;
  daysToExpiry: number;
  leaseStatus: string;
  healthScore: number;
  renewalProbability: number;
  currency: string;
  sym: string;
  portfolio: string;
  breakDate?: string;
  reviewDate?: string;
}

function buildTenants(portfolioData: Portfolio): TenantRow[] {
  const sym = portfolioData.currency === "USD" ? "$" : "£";
  const portfolioKey = portfolioData.id;
  const rows: TenantRow[] = [];

  for (const asset of portfolioData.assets) {
    for (const lease of asset.leases) {
      if (lease.tenant === "Vacant" || lease.tenant.startsWith("Vacant")) continue;
      const score = healthScore(lease.daysToExpiry, lease.status);
      rows.push({
        id: lease.id,
        tenant: lease.tenant,
        assetId: asset.id,
        assetName: asset.name,
        sqft: lease.sqft,
        rentPerSqft: lease.rentPerSqft,
        annualRent: lease.sqft * lease.rentPerSqft,
        startDate: lease.startDate,
        expiryDate: lease.expiryDate,
        daysToExpiry: lease.daysToExpiry,
        leaseStatus: lease.status,
        healthScore: score,
        renewalProbability: renewalProbability(lease.daysToExpiry, lease.status),
        currency: portfolioData.currency,
        sym,
        portfolio: portfolioKey as "fl-mixed" | "se-logistics",
        breakDate: (lease as { breakDate?: string }).breakDate,
        reviewDate: (lease as { reviewDate?: string }).reviewDate,
      });
    }
  }

  return rows.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

// ── Row component ─────────────────────────────────────────────────────────────
function TenantRow({
  row,
  doneActions,
  onAction,
}: {
  row: TenantRow;
  doneActions: Set<string>;
  onAction: (leaseRef: string, actionType: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [letterDraft, setLetterDraft] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<string | null>(null);
  const [reviewDraftLoading, setReviewDraftLoading] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [agreedRent, setAgreedRent] = useState<number | null>(null);
  const [hotDraft, setHotDraft] = useState<string | null>(null);
  const [hotLoading, setHotLoading] = useState(false);
  const [sentTypes, setSentTypes] = useState<Set<string>>(new Set());
  const [sendingType, setSendingType] = useState<string | null>(null);
  const c = scoreColor(row.healthScore);

  async function fireAction(actionType: string, endpoint: string) {
    if (doneActions.has(actionType) || pending) return;
    setPending(actionType);
    try {
      await fetch(`/api/user/tenants/${encodeURIComponent(row.id)}/${endpoint}`, { method: "POST" });
      onAction(row.id, actionType);
    } finally {
      setPending(null);
    }
  }

  async function fireRentReview() {
    if (doneActions.has("rent_review_started") || pending) return;
    setPending("rent_review_started");
    const horizon = row.daysToExpiry > 365 ? "18m" : row.daysToExpiry > 180 ? "12m" : row.daysToExpiry > 90 ? "6m" : "3m";
    try {
      const res = await fetch("/api/user/rent-reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leaseId:         row.id,
          tenantName:      row.tenant,
          expiryDate:      row.expiryDate,
          passingRent:     row.annualRent,
          horizon,
          propertyAddress: row.assetName,
          assetId:         row.assetId,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { review?: { id: string } };
        if (data.review?.id) setActiveReviewId(data.review.id);
      }
      onAction(row.id, "rent_review_started");
    } finally {
      setPending(null);
    }
  }

  async function draftReview() {
    if (!activeReviewId || reviewDraftLoading || reviewDraft) return;
    setReviewDraftLoading(true);
    try {
      const res = await fetch(`/api/user/rent-reviews/${activeReviewId}/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "renewal_letter" }),
      });
      if (res.ok) {
        const data = await res.json() as { body?: string };
        setReviewDraft(data.body ?? null);
      }
    } catch { /* non-fatal */ } finally {
      setReviewDraftLoading(false);
    }
  }

  async function completeReview() {
    if (!activeReviewId || reviewCompleted) return;
    const newRentStr = window.prompt(`Enter agreed new annual rent (${row.annualRent ? `currently £${row.annualRent.toLocaleString()}` : ""})`);
    if (!newRentStr) return;
    const newRent = parseFloat(newRentStr.replace(/[^0-9.]/g, ""));
    if (isNaN(newRent) || newRent <= 0) return;
    try {
      await fetch(`/api/user/rent-reviews/${activeReviewId}/complete`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newRent }),
      });
      setReviewCompleted(true);
      setAgreedRent(newRent);
    } catch { /* non-fatal */ }
  }

  async function generateHoT() {
    if (!activeReviewId || !agreedRent || hotLoading || hotDraft) return;
    const newTermStr = window.prompt("New lease term (years)?", "5");
    if (!newTermStr) return;
    const newTerm = parseInt(newTermStr.trim(), 10);
    if (isNaN(newTerm) || newTerm <= 0) return;
    setHotLoading(true);
    try {
      const res = await fetch(`/api/user/rent-reviews/${activeReviewId}/hot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agreedRent, newTerm }),
      });
      if (res.ok) {
        const data = await res.json() as { hotBody?: string };
        setHotDraft(data.hotBody ?? null);
      }
    } catch { /* non-fatal */ } finally {
      setHotLoading(false);
    }
  }

  async function sendDraft(body: string, type: string) {
    if (!activeReviewId || sentTypes.has(type) || sendingType) return;
    const recipientEmail = window.prompt("Tenant email address to send to?");
    if (!recipientEmail?.trim()) return;
    setSendingType(type);
    try {
      await fetch(`/api/user/rent-reviews/${activeReviewId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, body, recipientEmail: recipientEmail.trim() }),
      });
      setSentTypes((prev) => new Set([...prev, type]));
    } catch { /* non-fatal */ } finally {
      setSendingType(null);
    }
  }

  async function fireLetter() {
    if (letterLoading || letterDraft) return;
    setLetterLoading(true);
    try {
      const res = await fetch(`/api/user/tenants/${encodeURIComponent(row.id)}/letter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "rent_review" }),
      });
      if (res.ok) {
        const data = await res.json() as { letter?: { body?: string } };
        setLetterDraft(data.letter?.body ?? null);
      }
    } finally {
      setLetterLoading(false);
    }
  }

  return (
    <div style={{ borderBottom: "1px solid var(--bdr)" }}>
      {/* Main row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 gap-3 transition-colors hover:bg-[var(--s2)] text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Health score bar */}
          <div className="h-10 w-1 rounded-full shrink-0" style={{ backgroundColor: c.text }} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{row.tenant}</span>
              {row.leaseStatus === "expiring_soon" && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#F5A94A20", color: "#F5A94A" }}
                >
                  Expiring soon
                </span>
              )}
              {row.leaseStatus === "expired" && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#DC262620", color: "#DC2626" }}
                >
                  Expired
                </span>
              )}
              {row.breakDate && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#1647E820", color: "#6699ff" }}
                >
                  Break clause
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
              {row.assetName} · {row.sqft.toLocaleString()} sqft · {row.sym}{row.rentPerSqft}/sqft/yr
            </div>
            {/* Mobile-only key metrics shown inline */}
            <div className="flex items-center gap-2 mt-1 sm:hidden">
              <span className="text-xs font-semibold" style={{ color: "var(--tx)", fontFamily: SERIF }}>{fmt(row.annualRent, row.sym)}/yr</span>
              <span style={{ color: "#D1D5DB" }}>·</span>
              <span className="text-xs font-medium" style={{ color: row.daysToExpiry < 365 ? "#F5A94A" : "var(--tx2)" }}>
                {fmtDays(row.daysToExpiry)} to expiry
              </span>
            </div>
          </div>
        </div>

        {/* Right side metrics */}
        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
          {/* Annual rent */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold" style={{ color: "var(--tx)", fontFamily: SERIF }}>
              {fmt(row.annualRent, row.sym)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>annual rent</div>
          </div>

          {/* Expiry */}
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium" style={{ color: row.daysToExpiry < 365 ? "#F5A94A" : "var(--tx2)" }}>
              {fmtDays(row.daysToExpiry)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
              {row.expiryDate ? row.expiryDate.slice(0, 7) : "—"}
            </div>
          </div>

          {/* Health score badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
          >
            <span className="text-sm font-bold" style={{ color: c.text, fontFamily: SERIF }}>{row.healthScore}</span>
            <span className="text-xs" style={{ color: c.text, opacity: 0.7 }}>/100</span>
          </div>

          {/* Chevron */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="shrink-0 transition-transform duration-150"
            style={{ color: "#D1D5DB", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div
          className="px-5 pb-5 pt-1"
          style={{ backgroundColor: "var(--s2)", borderTop: "1px solid var(--bdr)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Lease start</div>
              <div className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{row.startDate || "—"}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Lease expiry</div>
              <div className="text-sm font-medium" style={{ color: row.daysToExpiry < 365 ? "#F5A94A" : "var(--tx2)" }}>
                {row.expiryDate || "—"}
              </div>
            </div>
            {row.breakDate && (
              <div>
                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Break clause</div>
                <div className="text-sm font-medium" style={{ color: "#6699ff" }}>{row.breakDate}</div>
              </div>
            )}
            {row.reviewDate && (
              <div>
                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Rent review</div>
                <div className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{row.reviewDate}</div>
              </div>
            )}
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Renewal probability</div>
              <div className="text-sm font-bold" style={{ color: c.text, fontFamily: SERIF }}>
                {row.renewalProbability}%
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Passing rent (pa)</div>
              <div className="text-sm font-bold" style={{ color: "var(--tx)", fontFamily: SERIF }}>
                {fmt(row.annualRent, row.sym)}
              </div>
            </div>
          </div>

          {/* Payment history sparkline */}
          <div>
            <div className="text-xs mb-2" style={{ color: "#9CA3AF" }}>12-month payment history</div>
            <div className="flex items-end gap-3">
              <PaymentSparkline status={row.leaseStatus} />
              <span className="text-xs pb-0.5" style={{ color: row.leaseStatus === "expired" ? "#DC2626" : "#0A8A4C" }}>
                {row.leaseStatus === "expired" ? "Payments lapsed" : "All payments on time"}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {row.daysToExpiry < 365 && row.daysToExpiry > 0 && (
              doneActions.has("engage_renewal") ? (
                <span
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}
                >
                  Engagement sent ✓
                </span>
              ) : (
                <button
                  onClick={() => fireAction("engage_renewal", "engage-renewal")}
                  disabled={pending === "engage_renewal"}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "#1647E8", color: "var(--bg)" }}
                >
                  {pending === "engage_renewal" ? "Sending…" : "Engage on renewal →"}
                </button>
              )
            )}
            {row.daysToExpiry <= 0 && (
              doneActions.has("relet") ? (
                <span
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}
                >
                  Instructed ✓
                </span>
              ) : (
                <button
                  onClick={() => fireAction("relet", "relet")}
                  disabled={pending === "relet"}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "#DC2626", color: "var(--bg)" }}
                >
                  {pending === "relet" ? "Sending…" : "Re-letting required →"}
                </button>
              )
            )}
            {row.breakDate && (
              doneActions.has("review_break") ? (
                <span
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}
                >
                  Review requested ✓
                </span>
              ) : (
                <button
                  onClick={() => fireAction("review_break", "review-break")}
                  disabled={pending === "review_break"}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "var(--bdr)", color: "#6699ff" }}
                >
                  {pending === "review_break" ? "Sending…" : "Review break clause →"}
                </button>
              )
            )}
            {row.reviewDate && (
              reviewCompleted ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}>
                    Review complete ✓
                  </span>
                  {!hotDraft && (
                    <button
                      onClick={generateHoT}
                      disabled={hotLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-60"
                      style={{ border: "1px solid #0A8A4C", color: "#0A8A4C", backgroundColor: "#F0FDF4" }}
                    >
                      {hotLoading ? "Generating…" : "Generate Heads of Terms →"}
                    </button>
                  )}
                </div>
              ) : activeReviewId ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>Review active</span>
                  {!reviewDraft && (
                    <button
                      onClick={draftReview}
                      disabled={reviewDraftLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-60"
                      style={{ border: "1px solid #0A8A4C", color: "#0A8A4C", backgroundColor: "#F0FDF4" }}
                    >
                      {reviewDraftLoading ? "Drafting…" : "Draft renewal letter →"}
                    </button>
                  )}
                  <button
                    onClick={completeReview}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                    style={{ border: "1px solid var(--bdr)", color: "var(--tx2)", backgroundColor: "var(--s2)" }}
                  >
                    Mark complete →
                  </button>
                </div>
              ) : doneActions.has("rent_review_started") ? (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}>
                  Rent review started ✓
                </span>
              ) : (
                <button
                  onClick={fireRentReview}
                  disabled={!!pending}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "#0A8A4C", color: "var(--bg)" }}
                >
                  {pending === "rent_review_started" ? "Starting…" : "Start rent review →"}
                </button>
              )
            )}
            {row.reviewDate && !letterDraft && (
              <button
                onClick={fireLetter}
                disabled={letterLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{ border: "1px solid #0A8A4C", color: "#0A8A4C", backgroundColor: "#F0FDF4" }}
              >
                {letterLoading ? "Drafting…" : "Draft rent review letter →"}
              </button>
            )}
          </div>

          {/* Review draft preview (from rent-review workflow) */}
          {reviewDraft && (
            <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: "#F8FAFC", border: "1px solid #BBF7D0" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>Renewal letter (review workflow)</span>
                <div className="flex items-center gap-2">
                  {sentTypes.has("renewal_letter") ? (
                    <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>Sent ✓</span>
                  ) : (
                    <button
                      onClick={() => sendDraft(reviewDraft, "renewal_letter")}
                      disabled={!!sendingType}
                      className="text-xs px-2 py-1 rounded transition-all hover:opacity-80 disabled:opacity-60"
                      style={{ border: "1px solid #0A8A4C", color: "#0A8A4C", backgroundColor: "#F0FDF4" }}
                    >
                      {sendingType === "renewal_letter" ? "Sending…" : "Send to tenant →"}
                    </button>
                  )}
                  <button
                    onClick={() => { navigator.clipboard.writeText(reviewDraft).catch(() => {}); }}
                    className="text-xs px-2 py-1 rounded"
                    style={{ border: "1px solid var(--bdr)", color: "var(--tx2)", backgroundColor: "var(--s1)" }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: "var(--tx2)", fontFamily: "inherit", lineHeight: 1.6 }}>
                {reviewDraft}
              </pre>
            </div>
          )}

          {/* Heads of Terms draft */}
          {hotDraft && (
            <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FCD34D" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "#92400E" }}>Heads of Terms — Subject to Contract</span>
                <div className="flex items-center gap-2">
                  {sentTypes.has("hot") ? (
                    <span className="text-xs font-semibold" style={{ color: "#92400E" }}>Sent ✓</span>
                  ) : (
                    <button
                      onClick={() => sendDraft(hotDraft, "hot")}
                      disabled={!!sendingType}
                      className="text-xs px-2 py-1 rounded transition-all hover:opacity-80 disabled:opacity-60"
                      style={{ border: "1px solid #D97706", color: "#D97706", backgroundColor: "#FFFBEB" }}
                    >
                      {sendingType === "hot" ? "Sending…" : "Send to tenant →"}
                    </button>
                  )}
                  <button
                    onClick={() => { navigator.clipboard.writeText(hotDraft).catch(() => {}); }}
                    className="text-xs px-2 py-1 rounded"
                    style={{ border: "1px solid var(--bdr)", color: "var(--tx2)", backgroundColor: "var(--s1)" }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: "var(--tx2)", fontFamily: "inherit", lineHeight: 1.6 }}>
                {hotDraft}
              </pre>
            </div>
          )}

          {/* Generated letter preview */}
          {letterDraft && (
            <div
              className="mt-4 rounded-lg p-4"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--tx2)" }}>Rent review letter draft</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(letterDraft).catch(() => {}); }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ border: "1px solid var(--bdr)", color: "var(--tx2)", backgroundColor: "var(--s1)" }}
                >
                  Copy
                </button>
              </div>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: "var(--tx2)", fontFamily: "inherit", lineHeight: 1.6 }}>
                {letterDraft}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio: portfolioData, loading: customLoading } = usePortfolio(portfolioId);

  const [userTenants, setUserTenants] = useState<TenantRow[]>([]);
  const [userTenantsLoading, setUserTenantsLoading] = useState(false);
  const [userTenantsLoaded, setUserTenantsLoaded] = useState(false);
  const [userSym, setUserSym] = useState<string>("£");
  // leaseRef -> Set of actionTypes already done
  const [actionsDone, setActionsDone] = useState<Map<string, Set<string>>>(new Map());
  // Lettings workflow state
  const [lettingsStarted, setLettingsStarted] = useState<Set<string>>(new Set());
  const [lettingsPending, setLettingsPending] = useState<string | null>(null);

  function handleAction(leaseRef: string, actionType: string) {
    setActionsDone((prev) => {
      const next = new Map(prev);
      const existing = new Set(next.get(leaseRef) ?? []);
      existing.add(actionType);
      next.set(leaseRef, existing);
      return next;
    });
  }

  // Load existing engagement actions
  useEffect(() => {
    if (portfolioId !== "user") return;
    fetch("/api/user/tenants/actions")
      .then((r) => r.json())
      .then((data: { actions: { leaseRef: string; actionType: string }[] }) => {
        const map = new Map<string, Set<string>>();
        for (const a of data.actions ?? []) {
          const s = map.get(a.leaseRef) ?? new Set<string>();
          s.add(a.actionType);
          map.set(a.leaseRef, s);
        }
        setActionsDone(map);
      })
      .catch(() => {});
  }, [portfolioId]);

  useEffect(() => {
    if (portfolioId !== "user") return;
    setUserTenantsLoading(true);
    fetch("/api/user/tenants")
      .then((r) => r.json())
      .then((data: {
        tenants?: Array<{
          id: string; tenant: string; tenantId: string; assetId: string; assetName: string;
          location: string; sqft: number; rentPerSqft: number; annualRent: number;
          startDate: string | null; expiryDate: string | null; breakDate: string | null;
          reviewDate: string | null; daysToExpiry: number | null; leaseStatus: string;
          healthScore: number; renewalProbability: string; renewalPct: number;
          covenantGrade: string; currency: string; sym: string;
        }>;
      }) => {
        if (!data.tenants?.length) {
          setUserTenants([]);
          return;
        }
        // Determine dominant currency from first tenant
        const firstCurrency = data.tenants[0]?.currency ?? "GBP";
        const apiSym = firstCurrency === "USD" ? "$" : "£";
        const rows: TenantRow[] = data.tenants.map((t) => ({
          id:                t.id,
          tenant:            t.tenant,
          assetId:           t.assetId,
          assetName:         t.assetName ?? t.location ?? "Unknown property",
          sqft:              t.sqft,
          rentPerSqft:       t.rentPerSqft,
          annualRent:        t.annualRent,
          startDate:         t.startDate ?? "",
          expiryDate:        t.expiryDate ?? "",
          daysToExpiry:      t.daysToExpiry ?? 9999,
          leaseStatus:       t.leaseStatus,
          healthScore:       t.healthScore,
          renewalProbability: t.renewalPct,
          currency:          t.currency ?? firstCurrency,
          sym:               t.sym ?? apiSym,
          portfolio:         "user",
          breakDate:         t.breakDate ?? undefined,
          reviewDate:        t.reviewDate ?? undefined,
        }));
        setUserSym(apiSym);
        setUserTenants(rows.sort((a, b) => a.daysToExpiry - b.daysToExpiry));
      })
      .catch(() => setUserTenants([]))
      .finally(() => { setUserTenantsLoading(false); setUserTenantsLoaded(true); });
  }, [portfolioId]);

  const sym = portfolioId === "user" ? userSym : (portfolioData.currency === "USD" ? "$" : "£");
  const tenants = portfolioId === "user" ? userTenants : buildTenants(portfolioData);

  const isUserMode = portfolioId === "user";
  const isLoading = loading || customLoading || (isUserMode && userTenantsLoading);

  const atRisk = tenants.filter((t) => t.daysToExpiry > 0 && t.daysToExpiry < 365);
  const expired = tenants.filter((t) => t.leaseStatus === "expired" || t.daysToExpiry === 0);
  const revenueAtRisk = atRisk.reduce((s, t) => s + t.annualRent, 0);

  const totalNetIncome = portfolioData.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalPortfolioValue = portfolioData.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const impliedCapRate = totalPortfolioValue > 0 ? totalNetIncome / totalPortfolioValue : 0;

  const avgHealth = tenants.length
    ? Math.round(tenants.reduce((s, t) => s + t.healthScore, 0) / tenants.length)
    : 0;
  const avgC = scoreColor(avgHealth);

  return (
    <AppShell>
      <TopBar title="Tenant Intelligence" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">

        {/* Page Hero */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title="Tenant Intelligence"
            cells={[
              { label: "Tenants", value: `${tenants.length}`, sub: `Across ${new Set(tenants.map((t) => t.assetId)).size} assets` },
              { label: "Avg Health Score", value: `${avgHealth}/100`, valueColor: avgC.text, sub: avgHealth >= 75 ? "Portfolio in good shape" : avgHealth >= 50 ? "Moderate renewal risk" : "High renewal risk" },
              { label: "Expiring ≤12mo", value: `${atRisk.length}`, valueColor: atRisk.length > 0 ? "#F5A94A" : "#0A8A4C", sub: atRisk.length > 0 ? `${fmt(revenueAtRisk, sym)}/yr at risk` : "No near-term expiries" },
              { label: "Revenue at Risk", value: `${fmt(revenueAtRisk, sym)}/yr`, valueColor: revenueAtRisk > 0 ? "#F5A94A" : "#0A8A4C", sub: "From leases expiring <12mo" },
            ]}
          />
        )}

        {/* Issue / Cost / RealHQ Action bar */}
        {!isLoading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <div className="text-xs" style={{ color: "var(--tx2)" }}>
              {atRisk.length > 0 ? (
                <>
                  {atRisk.length} tenant{atRisk.length !== 1 ? "s" : ""} approaching expiry —{" "}
                  <span style={{ color: "#DC2626", fontWeight: 600 }}>{fmt(revenueAtRisk, sym)}/yr</span> of rent at risk of vacancy.
                  {revenueAtRisk > 0 && impliedCapRate > 0 && (
                    <> At your cap rate, that is{" "}
                      <span style={{ color: "#DC2626", fontWeight: 600 }}>~{fmt(Math.round(revenueAtRisk / impliedCapRate), sym)}</span> of portfolio value at risk of disruption.{" "}
                    </>
                  )}
                  RealHQ monitors every lease event and engages tenants before the window closes.
                </>
              ) : (
                <>No tenants expiring within 12 months. RealHQ monitors all lease events and flags renewal windows 12+ months ahead.</>
              )}
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!isLoading && (
          <DirectCallout
            title="RealHQ triggers rent reviews at the optimal window — not when it's too late"
            body={`RealHQ monitors every lease event and engages tenants 12+ months before expiry to avoid void risk. ${atRisk.length > 0 ? `${atRisk.length} tenant${atRisk.length !== 1 ? "s" : ""} need attention now.` : "All leases currently within safe renewal windows."}`}
          />
        )}

        {/* Insight bar */}
        {!isLoading && atRisk.length > 0 && (
          <div
            className="rounded-xl px-5 py-3 flex items-center gap-3"
            style={{ backgroundColor: "#1f1a0d", border: "1px solid #F5A94A30" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M8 2L2 13H14L8 2Z" stroke="#F5A94A" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 7V9.5" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.75" fill="#F5A94A" />
            </svg>
            <span className="text-xs font-medium" style={{ color: "#F5A94A" }}>
              {atRisk.length} tenant{atRisk.length !== 1 ? "s" : ""} at risk of non-renewal in next 12 months
              {" "}— {fmt(revenueAtRisk, sym)}/yr passing rent exposed
              {expired.length > 0 && ` · ${expired.length} space${expired.length !== 1 ? "s" : ""} currently vacant`}
            </span>
          </div>
        )}

        {/* ── Vacant Units — lettings workflow entry point ─────────────────── */}
        {!isLoading && expired.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
                Vacant Units ({expired.length})
              </span>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #FECACA", backgroundColor: "#FFF" }}>
              {expired.map((t, i) => {
                const isLast = i === expired.length - 1;
                const isStarted = lettingsStarted.has(t.id);
                const isPending = lettingsPending === t.id;
                const daysSinceExpiry = Math.abs(t.daysToExpiry);

                async function activateLetting() {
                  if (isStarted || isPending) return;
                  setLettingsPending(t.id);
                  try {
                    await fetch("/api/user/lettings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ assetId: t.assetId, askingRent: t.annualRent }),
                    });
                    setLettingsStarted((prev) => new Set([...prev, t.id]));
                  } catch { /* non-fatal */ }
                  finally { setLettingsPending(null); }
                }

                return (
                  <div
                    key={t.id}
                    className="px-4 py-3 flex items-center gap-3"
                    style={{ borderBottom: isLast ? "none" : "1px solid #FEE2E2" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{ color: "var(--tx)" }}>{t.assetName}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>
                        {t.sqft.toLocaleString()} sqft · {fmt(t.annualRent, t.sym)}/yr passing rent
                        {daysSinceExpiry > 0 && ` · vacant ${daysSinceExpiry} days`}
                      </div>
                    </div>
                    {isStarted ? (
                      <span className="text-[10.5px] font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C" }}>
                        Letting started ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => void activateLetting()}
                        disabled={isPending}
                        className="text-[10.5px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ backgroundColor: "#DC2626", color: "var(--bg)" }}
                      >
                        {isPending ? "Starting…" : "Find tenant →"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tenant list */}
        {isLoading ? (
          <CardSkeleton rows={6} />
        ) : isUserMode && userTenantsLoaded && tenants.length === 0 ? (
          <div
            className="rounded-xl px-6 py-10 flex flex-col items-center gap-3 text-center"
            style={{ backgroundColor: "var(--s2)", border: "1px dashed #D1D5DB" }}
          >
            <div className="text-2xl">📄</div>
            <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>No lease data yet</div>
            <div className="text-xs max-w-xs" style={{ color: "var(--tx2)" }}>
              Upload your first lease from Rent Clock to see tenant analysis, lease health scores, and expiry tracking.
            </div>
            <Link
              href="/rent-clock"
              className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#1647E8", color: "var(--bg)" }}
            >
              Go to Rent Clock →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <SectionHeader
                title="All Tenants"
                subtitle={`${tenants.length} leases · sorted by expiry`}
              />
              <a
                href="/api/user/export?type=lease-schedule"
                download
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
                style={{ border: "1px solid #0A8A4C", color: "#0A8A4C", backgroundColor: "#F0FDF4", textDecoration: "none" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v7M3.5 6 6 8.5 8.5 6"/><path d="M1.5 10.5h9"/>
                </svg>
                Export .xlsx
              </a>
            </div>

            {/* Column headers */}
            <div
              className="hidden md:flex items-center px-5 py-2 text-xs gap-3"
              style={{ color: "#D1D5DB", borderBottom: "1px solid var(--bdr)", backgroundColor: "var(--s2)" }}
            >
              <div className="w-1 shrink-0" />
              <div className="flex-1 pl-3">Tenant · Asset</div>
              <div className="w-28 text-right">Annual rent</div>
              <div className="w-20 text-right">Expiry</div>
              <div className="w-24 text-right pr-1">Health</div>
              <div className="w-4" />
            </div>

            <div>
              {tenants.map((row) => (
                <TenantRow
                  key={row.id}
                  row={row}
                  doneActions={actionsDone.get(row.id) ?? new Set()}
                  onAction={handleAction}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
