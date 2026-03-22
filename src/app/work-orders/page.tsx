"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { workOrders, WorkOrder, WorkOrderStatus } from "@/lib/data/work-orders";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";

const STATUS_PIPELINE: WorkOrderStatus[] = ["draft", "tendered", "awarded", "in_progress", "complete"];

const STATUS_META: Record<WorkOrderStatus, { label: string; color: string; badgeVariant: "gray" | "blue" | "amber" | "green" | "red" }> = {
  draft:       { label: "Draft",       color: "#9CA3AF", badgeVariant: "gray" },
  tendered:    { label: "Tendered",    color: "#1647E8", badgeVariant: "blue" },
  awarded:     { label: "Awarded",     color: "#F5A94A", badgeVariant: "amber" },
  in_progress: { label: "In Progress", color: "#F5A94A", badgeVariant: "amber" },
  complete:    { label: "Complete",    color: "#0A8A4C", badgeVariant: "green" },
};

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function overBenchmarkPct(order: WorkOrder) {
  return ((order.costEstimate - order.benchmarkCost) / order.benchmarkCost) * 100;
}

function CostCell({ order, sym }: { order: WorkOrder; sym: string }) {
  const pct = overBenchmarkPct(order);
  const isOver = pct > 15;
  const isUnder = pct < 0;
  const color = isOver ? "#f06040" : isUnder ? "#0A8A4C" : "#111827";

  return (
    <div className="text-right">
      <div className="text-sm font-semibold" style={{ color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
        {fmt(order.costEstimate, sym)}
      </div>
      <div className="text-xs mt-0.5" style={{ color: isOver ? "#f06040" : isUnder ? "#0A8A4C" : "#9CA3AF" }}>
        {isOver ? `+${pct.toFixed(0)}% over benchmark` : isUnder ? `${pct.toFixed(0)}% under` : `+${pct.toFixed(0)}% vs benchmark`}
      </div>
    </div>
  );
}

// ---- Create Work Order Modal ----

interface UserAssetOption { id: string; name: string }

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
  assets: UserAssetOption[];
}

function CreateWorkOrderModal({ onClose, onCreated, assets }: CreateModalProps) {
  const [jobType, setJobType] = useState("Maintenance");
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [targetStart, setTargetStart] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setError("Description is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/user/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobType,
          assetId: assetId || undefined,
          description: description.trim(),
          targetStart: targetStart || undefined,
          budgetEstimate: budgetEstimate ? Number(budgetEstimate) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create work order");
        return;
      }
      onCreated();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "#111827" }}>Create Work Order</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "#9CA3AF" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Job type</label>
            <select
              value={jobType}
              onChange={e => setJobType(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid #D1D5DB", color: "#111827" }}
            >
              {["Maintenance", "Refurbishment", "Fitout", "Other"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {assets.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Property</label>
              <select
                value={assetId}
                onChange={e => setAssetId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              >
                <option value="">— No property selected —</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Description <span style={{ color: "#f06040" }}>*</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the work needed…"
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Target start date</label>
              <input
                type="date"
                value={targetStart}
                onChange={e => setTargetStart(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Budget estimate</label>
              <input
                type="number"
                value={budgetEstimate}
                onChange={e => setBudgetEstimate(e.target.value)}
                placeholder="Optional"
                min={0}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
            </div>
          </div>

          {error && <p className="text-xs" style={{ color: "#f06040" }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
              style={{ backgroundColor: "#F5A94A", color: "#0B1622", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Creating…" : "Create work order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Real-user work order type (from API) ----

interface ApiWorkOrder {
  id: string;
  jobType: string;
  description: string;
  status: WorkOrderStatus;
  currency: string;
  budgetEstimate: number | null;
  costEstimate: number | null;
  contractor: string | null;
  targetStart: string | null;
  createdAt: string;
  asset: { name: string; location: string } | null;
}

// ---- Real-user view ----

function RealUserWorkOrders() {
  const [orders, setOrders] = useState<ApiWorkOrder[]>([]);
  const [assets, setAssets] = useState<UserAssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tenderingIds, setTenderingIds] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    setLoading(true);
    fetch("/api/user/work-orders")
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    fetch("/api/user/assets")
      .then(r => r.json())
      .then(d => setAssets((d.assets ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))))
      .catch(() => {});
  }, [reload]);

  async function handleTender(orderId: string) {
    setTenderingIds(prev => new Set([...prev, orderId]));
    try {
      const res = await fetch(`/api/user/work-orders/${orderId}/tender`, { method: "POST" });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "tendered" } : o));
      }
    } catch {
      // network error — silent
    } finally {
      setTenderingIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Work Orders" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-4">
            {[0, 1, 2].map(i => <CardSkeleton key={i} rows={3} />)}
          </div>
        </main>
      </AppShell>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        {showModal && (
          <CreateWorkOrderModal
            assets={assets}
            onClose={() => setShowModal(false)}
            onCreated={() => { setShowModal(false); reload(); }}
          />
        )}
        <AppShell>
          <TopBar title="Work Orders" />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div
                className="rounded-xl p-8 text-center max-w-lg mx-auto mt-12"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#F5A94A20" }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="4" width="16" height="13" rx="2" stroke="#F5A94A" strokeWidth="1.5" />
                    <path d="M6 8H14M6 11H11" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M7 2V5M13 2V5" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold mb-2" style={{ color: "#111827" }}>
                  No active work orders
                </h2>
                <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
                  RealHQ tenders contractor jobs across your portfolio — maintenance, refurb, fitout.
                  We get 3+ competing quotes and manage the process.
                  Fee: 3% of contract value, payable only on award.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] mb-5"
                  style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                >
                  Create work order
                </button>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>
                  Roof refurbishment · Tenant fitout · M&amp;E maintenance
                </div>
              </div>
            </div>
          </main>
        </AppShell>
      </>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "complete");
  const completeOrders = orders.filter(o => o.status === "complete");
  const sym = orders[0]?.currency === "USD" ? "$" : "£";

  return (
    <>
      {showModal && (
        <CreateWorkOrderModal
          assets={assets}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); reload(); }}
        />
      )}
      <AppShell>
        <TopBar title="Work Orders" />
        <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "#111827" }}>Work Orders</h1>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{activeOrders.length} active</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
            >
              + Create work order
            </button>
          </div>

          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader title="Active Work Orders" subtitle={`${activeOrders.length} order${activeOrders.length !== 1 ? "s" : ""}`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {activeOrders.map(order => {
                const meta = STATUS_META[order.status];
                const isTendering = tenderingIds.has(order.id);
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-4 gap-3 hover:bg-[#F9FAFB]">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-8 w-1 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: meta.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#111827" }}>{order.jobType}</span>
                          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                        </div>
                        {order.asset && (
                          <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                            {order.asset.name} · {order.asset.location}
                          </div>
                        )}
                        <div className="text-xs" style={{ color: "#D1D5DB" }}>{order.description}</div>
                        {order.targetStart && (
                          <div className="text-xs mt-1" style={{ color: "#D1D5DB" }}>Target start: {order.targetStart}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {order.budgetEstimate && (
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                            {sym}{order.budgetEstimate.toLocaleString()}
                          </div>
                          <div className="text-xs" style={{ color: "#9CA3AF" }}>Budget</div>
                        </div>
                      )}
                      {order.status === "draft" ? (
                        <button
                          onClick={() => handleTender(order.id)}
                          disabled={isTendering}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                          style={{ backgroundColor: "#F5A94A", color: "#0B1622", opacity: isTendering ? 0.6 : 1 }}
                        >
                          {isTendering ? "Starting…" : "Start Tender"}
                        </button>
                      ) : order.status === "tendered" ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#1647E8" }} />
                          <span className="text-xs font-medium" style={{ color: "#1647E8" }}>RealHQ tendering</span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>In hand</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {completeOrders.length > 0 && (
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader title="Completed" subtitle={`${completeOrders.length} order${completeOrders.length !== 1 ? "s" : ""} closed`} />
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {completeOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-6 w-1 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>{order.jobType}</span>
                          <Badge variant="green">Complete</Badge>
                        </div>
                        {order.asset && (
                          <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>{order.asset.name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </AppShell>
    </>
  );
}

// ---- Demo portfolio view (unchanged) ----

export default function WorkOrdersPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const [tenderedIds, setTenderedIds] = useState<Set<string>>(new Set());

  const isRealUser = portfolioId === "user";

  useEffect(() => {
    // no-op for real users — RealUserWorkOrders handles its own data
  }, [isRealUser]);

  if (isRealUser) {
    return <RealUserWorkOrders />;
  }

  const portfolio = portfolioId as "fl-mixed" | "se-logistics";
  const sym = portfolio === "fl-mixed" ? "$" : "£";

  const orders = workOrders.filter((o) => o.portfolio === portfolio);

  const activeOrders = orders.filter((o) => o.status !== "complete");
  const completeOrders = orders.filter((o) => o.status === "complete");

  const totalOutstanding = activeOrders.reduce((s, o) => s + o.costEstimate, 0);
  const benchmarkSavings = activeOrders
    .filter((o) => overBenchmarkPct(o) > 15)
    .reduce((s, o) => s + (o.costEstimate - o.benchmarkCost), 0);

  const overBenchmarkCount = activeOrders.filter((o) => overBenchmarkPct(o) > 15).length;
  const realhqRevenue = orders
    .filter((o) => o.status === "tendered" || o.status === "awarded" || o.status === "in_progress" || o.status === "complete")
    .reduce((s, o) => s + o.costEstimate * 0.03, 0);

  const sortedOrders = [...orders].sort((a, b) => {
    const statusOrder: WorkOrderStatus[] = ["in_progress", "awarded", "tendered", "draft", "complete"];
    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
  });

  return (
    <AppShell>
      <TopBar title="Work Orders" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title={`Work Orders — ${portfolio === "fl-mixed" ? "FL Mixed" : "SE Logistics"}`}
            cells={[
              {
                label: "Outstanding Work",
                value: fmt(totalOutstanding, sym),
                valueColor: "#F5A94A",
                sub: `${activeOrders.length} active · ${completeOrders.length} complete`,
              },
              {
                label: "Over Benchmark",
                value: `${overBenchmarkCount}`,
                valueColor: overBenchmarkCount > 0 ? "#FF8080" : "#5BF0AC",
                sub: overBenchmarkCount > 0 ? "Quotes >15% above rate" : "All at benchmark",
              },
              {
                label: "Savings Available",
                value: fmt(benchmarkSavings, sym),
                valueColor: benchmarkSavings > 0 ? "#5BF0AC" : "#6B7280",
                sub: "Via RealHQ retendering",
              },
              {
                label: "Commission",
                value: fmt(realhqRevenue, sym),
                valueColor: "#5BF0AC",
                sub: "3% of contract · success-only",
              },
            ]}
          />
        )}

        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <div className="text-xs" style={{ color: "#6B7280" }}>
              <span style={{ color: overBenchmarkCount > 0 ? "#f06040" : "#F5A94A", fontWeight: 600 }}>Issue:</span>{" "}
              {activeOrders.length} active work order{activeOrders.length !== 1 ? "s" : ""} across portfolio
              {overBenchmarkCount > 0 && (
                <>
                  {" "}— {overBenchmarkCount} quote{overBenchmarkCount !== 1 ? "s" : ""} exceeding benchmark by &gt;15% ·{" "}
                  <span style={{ color: "#f06040", fontWeight: 600 }}>Cost:</span>{" "}
                  <span style={{ color: "#f06040" }}>{fmt(benchmarkSavings, sym)}</span> above market rate if not retendered ·{" "}
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
                  retenders flagged orders against vetted contractor network — earns 3% of contract value
                </>
              )}
              {overBenchmarkCount === 0 && (
                <> · all quotes at or below benchmark · <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span> manages tender pipeline, earns 3% on awarded contracts</>
              )}
            </div>
          </div>
        )}

        {!loading && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_PIPELINE.map((status, i) => {
              const count = orders.filter((o) => o.status === status).length;
              const meta = STATUS_META[status];
              return (
                <div key={status} className="flex items-center gap-1 shrink-0">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: count > 0 ? "#fff" : "#F9FAFB",
                      border: `1px solid ${count > 0 ? meta.color + "40" : "#E5E7EB"}`,
                      color: count > 0 ? meta.color : "#D1D5DB",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: count > 0 ? meta.color : "#D1D5DB" }} />
                    {meta.label}
                    <span
                      className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: count > 0 ? meta.color + "20" : "#E5E7EB", color: count > 0 ? meta.color : "#D1D5DB" }}
                    >
                      {count}
                    </span>
                  </div>
                  {i < STATUS_PIPELINE.length - 1 && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0" style={{ color: "#E5E7EB" }}>
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <DirectCallout
            title="RealHQ benchmarks every quote before you sign — then manages the contractor"
            body={`RealHQ runs each job through its vetted contractor network and provides a benchmark before award. ${overBenchmarkCount > 0 ? `${overBenchmarkCount} order${overBenchmarkCount !== 1 ? "s" : ""} currently above benchmark — retender today.` : "All active orders are at or below benchmark."} 3% of contract value, payable on completion.`}
          />
        )}

        {loading ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader
                title="Active Work Orders"
                subtitle={`${activeOrders.length} orders · ${fmt(totalOutstanding, sym)} outstanding`}
              />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {sortedOrders.filter((o) => o.status !== "complete").map((order) => {
                const meta = STATUS_META[order.status];
                const pct = overBenchmarkPct(order);
                const isOver = pct > 15;
                const isTendered = tenderedIds.has(order.id);
                const effectiveStatus = isTendered ? "tendered" : order.status;
                const effectiveMeta = STATUS_META[effectiveStatus];

                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-4 gap-3 transition-colors hover:bg-[#F9FAFB]">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="h-8 w-1 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: isOver && !isTendered ? "#f06040" : effectiveMeta.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#111827" }}>{order.jobType}</span>
                          <Badge variant={isTendered ? "blue" : meta.badgeVariant}>
                            {isTendered ? "Tendered" : meta.label}
                          </Badge>
                          {isOver && !isTendered && (
                            <Badge variant="red">+{pct.toFixed(0)}% over benchmark</Badge>
                          )}
                        </div>
                        <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                          <Link href={`/assets/${order.assetId}`} className="hover:underline underline-offset-1">
                            {order.assetName}
                          </Link>
                          {" "}· {order.assetLocation}
                        </div>
                        <div className="text-xs" style={{ color: "#D1D5DB" }}>
                          {order.description}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "#D1D5DB" }}>
                          {order.contractor ? (
                            <span>Contractor: <span style={{ color: "#9CA3AF" }}>{order.contractor}</span></span>
                          ) : (
                            <span style={{ color: "#F5A94A" }}>No contractor assigned</span>
                          )}
                          {" "}· Due {order.dueDate}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-6 shrink-0">
                      <CostCell order={order} sym={sym} />
                      {isTendered ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#1647E8" }} />
                          <span className="text-xs font-medium" style={{ color: "#1647E8" }}>RealHQ tendering</span>
                        </div>
                      ) : order.status === "draft" || order.status === "tendered" ? (
                        <button
                          onClick={() => setTenderedIds((prev) => new Set([...prev, order.id]))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                          style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                        >
                          Start Tender
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>In hand</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && completeOrders.length > 0 && (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader title="Completed" subtitle={`${completeOrders.length} order${completeOrders.length !== 1 ? "s" : ""} closed`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {completeOrders.map((order) => {
                const pct = overBenchmarkPct(order);
                const isUnder = pct < 0;
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-6 w-1 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>{order.jobType}</span>
                          <Badge variant="green">Complete</Badge>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>
                          <Link href={`/assets/${order.assetId}`} className="hover:underline underline-offset-1">
                            {order.assetName}
                          </Link>
                          {order.contractor ? ` · ${order.contractor}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                        {fmt(order.costEstimate, sym)}
                      </div>
                      {isUnder && (
                        <div className="text-xs" style={{ color: "#0A8A4C" }}>
                          {Math.abs(pct).toFixed(0)}% under benchmark
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
