"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { workOrders, WorkOrder, WorkOrderStatus } from "@/lib/data/work-orders";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";

const STATUS_PIPELINE: WorkOrderStatus[] = ["draft", "tendered", "awarded", "in_progress", "complete"];

const STATUS_META: Record<WorkOrderStatus, { label: string; color: string; badgeVariant: "gray" | "blue" | "amber" | "green" | "red" }> = {
  draft:       { label: "Draft",       color: "#5a7a96", badgeVariant: "gray" },
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
  const color = isOver ? "#f06040" : isUnder ? "#0A8A4C" : "#e8eef5";

  return (
    <div className="text-right">
      <div className="text-sm font-semibold" style={{ color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
        {fmt(order.costEstimate, sym)}
      </div>
      <div className="text-xs mt-0.5" style={{ color: isOver ? "#f06040" : isUnder ? "#0A8A4C" : "#5a7a96" }}>
        {isOver ? `+${pct.toFixed(0)}% over benchmark` : isUnder ? `${pct.toFixed(0)}% under` : `+${pct.toFixed(0)}% vs benchmark`}
      </div>
    </div>
  );
}

export default function WorkOrdersPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const [tenderedIds, setTenderedIds] = useState<Set<string>>(new Set());

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
  const arcaRevenue = orders
    .filter((o) => o.status === "tendered" || o.status === "awarded" || o.status === "in_progress" || o.status === "complete")
    .reduce((s, o) => s + o.costEstimate * 0.03, 0);

  const handleTender = async (order: WorkOrder) => {
    setTenderedIds((prev) => new Set([...prev, order.id]));
    await fetch("/api/leads/work-order-tender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetName: order.assetName,
        assetLocation: order.assetLocation,
        jobType: order.jobType,
        description: order.description,
        costEstimate: `${sym}${Math.round(order.costEstimate / 1000)}k`,
        benchmarkCost: `${sym}${Math.round(order.benchmarkCost / 1000)}k`,
        contractor: order.contractor,
      }),
    }).catch(() => {});
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const statusOrder: WorkOrderStatus[] = ["in_progress", "awarded", "tendered", "draft", "complete"];
    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
  });

  return (
    <AppShell>
      <TopBar title="Work Orders" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
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
                valueColor: benchmarkSavings > 0 ? "#5BF0AC" : "#8ba0b8",
                sub: "Via Arca retendering",
              },
              {
                label: "Commission",
                value: fmt(arcaRevenue, sym),
                valueColor: "#5BF0AC",
                sub: "3% of contract · success-only",
              },
            ]}
          />
        )}

        {/* Issue / Cost / Action */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: overBenchmarkCount > 0 ? "#f06040" : "#F5A94A", fontWeight: 600 }}>Issue:</span>{" "}
              {activeOrders.length} active work order{activeOrders.length !== 1 ? "s" : ""} across portfolio
              {overBenchmarkCount > 0 && (
                <>
                  {" "}— {overBenchmarkCount} quote{overBenchmarkCount !== 1 ? "s" : ""} exceeding benchmark by &gt;15% ·{" "}
                  <span style={{ color: "#f06040", fontWeight: 600 }}>Cost:</span>{" "}
                  <span style={{ color: "#f06040" }}>{fmt(benchmarkSavings, sym)}</span> above market rate if not retendered ·{" "}
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
                  retenders flagged orders against vetted contractor network — earns 3% of contract value
                </>
              )}
              {overBenchmarkCount === 0 && (
                <> · all quotes at or below benchmark · <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span> manages tender pipeline, earns 3% on awarded contracts</>
              )}
            </div>
          </div>
        )}

        {/* Status Pipeline */}
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
                      backgroundColor: count > 0 ? "#111e2e" : "#0d1825",
                      border: `1px solid ${count > 0 ? meta.color + "40" : "#1a2d45"}`,
                      color: count > 0 ? meta.color : "#3d5a72",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: count > 0 ? meta.color : "#3d5a72" }} />
                    {meta.label}
                    <span
                      className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: count > 0 ? meta.color + "20" : "#1a2d45", color: count > 0 ? meta.color : "#3d5a72" }}
                    >
                      {count}
                    </span>
                  </div>
                  {i < STATUS_PIPELINE.length - 1 && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0" style={{ color: "#1a2d45" }}>
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Work Orders Table */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader
                title="Active Work Orders"
                subtitle={`${activeOrders.length} orders · ${fmt(totalOutstanding, sym)} outstanding`}
              />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {sortedOrders.filter((o) => o.status !== "complete").map((order) => {
                const meta = STATUS_META[order.status];
                const pct = overBenchmarkPct(order);
                const isOver = pct > 15;
                const isTendered = tenderedIds.has(order.id);
                const effectiveStatus = isTendered ? "tendered" : order.status;
                const effectiveMeta = STATUS_META[effectiveStatus];

                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-4 gap-3 transition-colors hover:bg-[#0d1825]">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="h-8 w-1 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: isOver && !isTendered ? "#f06040" : effectiveMeta.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{order.jobType}</span>
                          <Badge variant={isTendered ? "blue" : meta.badgeVariant}>
                            {isTendered ? "Tendered" : meta.label}
                          </Badge>
                          {isOver && !isTendered && (
                            <Badge variant="red">+{pct.toFixed(0)}% over benchmark</Badge>
                          )}
                        </div>
                        <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>
                          <Link href={`/assets/${order.assetId}`} className="hover:underline underline-offset-1">
                            {order.assetName}
                          </Link>
                          {" "}· {order.assetLocation}
                        </div>
                        <div className="text-xs" style={{ color: "#3d5a72" }}>
                          {order.description}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "#3d5a72" }}>
                          {order.contractor ? (
                            <span>Contractor: <span style={{ color: "#5a7a96" }}>{order.contractor}</span></span>
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
                          <span className="text-xs font-medium" style={{ color: "#1647E8" }}>Arca tendering</span>
                        </div>
                      ) : order.status === "draft" || order.status === "tendered" ? (
                        <button
                          onClick={() => handleTender(order)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                          style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                        >
                          Start Tender
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: "#5a7a96" }}>In hand</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Orders */}
        {!loading && completeOrders.length > 0 && (
          <div className="rounded-xl" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Completed" subtitle={`${completeOrders.length} order${completeOrders.length !== 1 ? "s" : ""} closed`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {completeOrders.map((order) => {
                const pct = overBenchmarkPct(order);
                const isUnder = pct < 0;
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-6 w-1 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#8ba0b8" }}>{order.jobType}</span>
                          <Badge variant="green">Complete</Badge>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>
                          <Link href={`/assets/${order.assetId}`} className="hover:underline underline-offset-1">
                            {order.assetName}
                          </Link>
                          {order.contractor ? ` · ${order.contractor}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: "#8ba0b8", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
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
