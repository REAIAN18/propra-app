"use client";

import { useState } from "react";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

type BoundQuote = {
  id: string;
  type: "insurance" | "energy";
  userId: string;
  assetId: string | null;
  email: string | undefined;
  assetName: string | null;
  label: string;
  annualSaving: number | null;
};

type Commission = {
  id: string;
  userId: string;
  assetId: string | null;
  category: string;
  sourceId: string | null;
  annualSaving: number;
  commissionRate: number;
  commissionValue: number;
  status: string;
  createdAt: string;
  user: { email: string | null; name: string | null } | null;
  asset: { name: string; location: string | null } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",   color: "#92580A", bg: "#FEF6E8" },
  confirmed: { label: "Confirmed", color: "#0A8A4C", bg: "#E8F5EE" },
  invoiced:  { label: "Invoiced",  color: "#1647E8", bg: "#EEF2FE" },
  paid:      { label: "Paid",      color: "#0D9488", bg: "#E6F7F6" },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  insurance:  { label: "Insurance",  color: "#F5A94A" },
  energy:     { label: "Energy",     color: "#1647E8" },
  rent:       { label: "Rent",       color: "#0A8A4C" },
  ancillary:  { label: "Ancillary",  color: "#8b5cf6" },
};

function fmt(v: number, currency = "GBP"): string {
  const sym = currency === "USD" ? "$" : "£";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${Math.round(v)}`;
}

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Modal({
  quote,
  onClose,
  onCreated,
}: {
  quote: BoundQuote;
  onClose: () => void;
  onCreated: (commission: Commission) => void;
}) {
  const defaultRate = quote.type === "insurance" ? 0.15 : 0.10;
  const [annualSaving, setAnnualSaving] = useState(
    quote.annualSaving != null ? String(quote.annualSaving) : ""
  );
  const [commissionRate, setCommissionRate] = useState(String(defaultRate));
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savingNum = parseFloat(annualSaving) || 0;
  const rateNum = parseFloat(commissionRate) || 0;
  const commissionValue = savingNum * rateNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: quote.userId,
          assetId: quote.assetId,
          category: quote.type,
          sourceId: quote.id,
          annualSaving: savingNum,
          commissionRate: rateNum,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create commission");
        return;
      }
      const commission = await res.json() as Commission;
      onCreated(commission);
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold mb-0.5" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
            Create Commission
          </h2>
          <p className="text-xs" style={{ color: "#5a7a96" }}>
            {quote.email} · {quote.assetName ?? "—"} · {quote.label}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Annual Saving */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#8ba0b8" }}>Annual Saving (£)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={annualSaving}
              onChange={(e) => setAnnualSaving(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "#0d1a28",
                border: "1px solid #1a2d45",
                color: "#e8eef5",
              }}
            />
          </div>

          {/* Commission Rate */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#8ba0b8" }}>
              Commission Rate (default: {quote.type === "insurance" ? "15%" : "10%"})
            </label>
            <div className="flex gap-2">
              {[0.10, 0.15, 0.20].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCommissionRate(String(r))}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: commissionRate === String(r) ? "#1647E8" : "#0d1a28",
                    border: `1px solid ${commissionRate === String(r) ? "#1647E8" : "#1a2d45"}`,
                    color: commissionRate === String(r) ? "#fff" : "#8ba0b8",
                  }}
                >
                  {Math.round(r * 100)}%
                </button>
              ))}
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-20 rounded-lg px-2 py-2 text-sm outline-none text-center"
                style={{
                  backgroundColor: "#0d1a28",
                  border: "1px solid #1a2d45",
                  color: "#e8eef5",
                }}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#8ba0b8" }}>Status</label>
            <div className="flex gap-2 flex-wrap">
              {["pending", "confirmed", "invoiced", "paid"].map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity"
                    style={{
                      backgroundColor: status === s ? cfg.bg : "#0d1a28",
                      color: status === s ? cfg.color : "#5a7a96",
                      border: `1px solid ${status === s ? cfg.bg : "#1a2d45"}`,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commission preview */}
          {commissionValue > 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: "#0d1a28", border: "1px solid #1a2d45" }}
            >
              <span className="text-xs" style={{ color: "#5a7a96" }}>Commission fee</span>
              <span className="text-lg font-bold" style={{ fontFamily: SERIF, color: "#5BF0AC" }}>
                {fmt(commissionValue)}
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: "#0d1a28",
                border: "1px solid #1a2d45",
                color: "#8ba0b8",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !annualSaving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: saving ? "#0f3080" : "#1647E8",
                color: "#fff",
                opacity: saving || !annualSaving ? 0.7 : 1,
              }}
            >
              {saving ? "Creating…" : "Create Commission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CommissionsClient({
  initialCommissions,
  boundQuotes,
}: {
  initialCommissions: Commission[];
  boundQuotes: BoundQuote[];
}) {
  const [commissions, setCommissions] = useState(initialCommissions);
  const [pendingQuotes, setPendingQuotes] = useState(boundQuotes);
  const [activeQuote, setActiveQuote] = useState<BoundQuote | null>(null);

  function handleCreated(commission: Commission) {
    setCommissions((prev) => [commission, ...prev]);
    setPendingQuotes((prev) => prev.filter((q) => q.id !== commission.sourceId));
  }

  if (pendingQuotes.length === 0) return null;

  return (
    <>
      {activeQuote && (
        <Modal
          quote={activeQuote}
          onClose={() => setActiveQuote(null)}
          onCreated={handleCreated}
        />
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
        <div className="px-5 py-3" style={{ backgroundColor: "#111e2e", borderBottom: "1px solid #1a2d45" }}>
          <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
            Bound Quotes — Awaiting Commission Record
          </span>
        </div>
        <div style={{ backgroundColor: "#0d1a28" }}>
          {pendingQuotes.map((q, i) => {
            const catColor = q.type === "insurance" ? "#F5A94A" : "#1647E8";
            return (
              <div
                key={q.id}
                className="px-5 py-3 flex items-center gap-4"
                style={{ borderTop: i > 0 ? "1px solid #1a2d45" : undefined }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: "#e8eef5" }}>{q.email}</div>
                  <div className="text-xs" style={{ color: "#5a7a96" }}>
                    {q.assetName ?? "—"} · {q.label}
                  </div>
                </div>
                {q.annualSaving != null && (
                  <div className="text-sm font-semibold shrink-0" style={{ color: "#5BF0AC" }}>
                    {fmt(q.annualSaving)}/yr
                  </div>
                )}
                <button
                  onClick={() => setActiveQuote(q)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: "#1647E822", color: "#1647E8", border: "1px solid #1647E844" }}
                >
                  Create commission
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live-updated commission rows (newly created this session) */}
      {commissions.length > initialCommissions.length && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
          <div className="px-5 py-3" style={{ backgroundColor: "#111e2e", borderBottom: "1px solid #1a2d45" }}>
            <span className="text-sm font-semibold" style={{ color: "#5BF0AC" }}>Just Created</span>
          </div>
          <div style={{ backgroundColor: "#0d1a28" }}>
            {commissions.slice(0, commissions.length - initialCommissions.length).map((c, i) => {
              const cat = CATEGORY_CONFIG[c.category] ?? { label: c.category, color: "#8ba0b8" };
              const st = STATUS_CONFIG[c.status] ?? { label: c.status, color: "#8ba0b8", bg: "#1a2d45" };
              return (
                <div
                  key={c.id}
                  className="px-5 py-4 flex items-center gap-4"
                  style={{ borderTop: i > 0 ? "1px solid #1a2d45" : undefined }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "#e8eef5" }}>
                      {c.user?.email ?? "—"}
                    </div>
                    <div className="text-xs truncate" style={{ color: "#5a7a96" }}>
                      {c.asset?.name ?? "Portfolio"} · {cat.label} · {timeAgo(c.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Saving</div>
                    <div className="text-sm font-semibold" style={{ color: "#5BF0AC" }}>{fmt(c.annualSaving)}/yr</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Fee ({Math.round(c.commissionRate * 100)}%)</div>
                    <div className="text-sm font-bold" style={{ color: "#e8eef5" }}>{fmt(c.commissionValue)}</div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
