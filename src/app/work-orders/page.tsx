"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkOrder {
  id: string;
  jobType: string;
  description: string;
  status: string;
  priority: string | null;
  currency: string;
  budgetEstimate: number | null;
  costEstimate: number | null;
  agreedPrice: number | null;
  finalCost: number | null;
  createdAt: string;
  asset: { name: string; location: string } | null;
  quotes: Array<{ id: string; price: number; awarded: boolean }>;
}

interface KPIs {
  activeOrders: number;
  ytdSpend: number;
  budgetRemaining: number;
  overdue: number;
  avgRating: number;
}

type WorkOrderStatus = "draft" | "scoped" | "tendered" | "awarded" | "in_progress" | "complete";

// ── Status & Priority Config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "var(--tx3)" },
  scoped: { label: "Scoped", color: "var(--acc)" },
  tendered: { label: "Tendered", color: "var(--acc)" },
  awarded: { label: "Awarded", color: "var(--amb)" },
  in_progress: { label: "In Progress", color: "var(--amb)" },
  complete: { label: "Complete", color: "var(--grn)" },
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "background:var(--red-lt);color:var(--red);border:1px solid var(--red-bdr)",
  high: "background:var(--amb-lt);color:var(--amb);border:1px solid var(--amb-bdr)",
  normal: "background:var(--s3);color:var(--tx3);border:1px solid var(--bdr)",
  low: "background:var(--s3);color:var(--tx3);border:1px solid var(--bdr);opacity:0.6",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function getOrderCost(order: WorkOrder): number {
  return order.finalCost || order.agreedPrice || order.costEstimate || order.budgetEstimate || 0;
}

function normalizeStatus(status: string): WorkOrderStatus {
  const s = status.toLowerCase();
  if (s === "quotes_received") return "tendered";
  if (["draft", "scoped", "tendered", "awarded", "in_progress", "complete"].includes(s)) {
    return s as WorkOrderStatus;
  }
  return "draft";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>({
    activeOrders: 0,
    ytdSpend: 0,
    budgetRemaining: 0,
    overdue: 0,
    avgRating: 0,
  });

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await fetch("/api/user/work-orders");
      if (res.ok) {
        const data = await res.json();
        const fetchedOrders = data.orders || [];
        setOrders(fetchedOrders);
        calculateKPIs(fetchedOrders);
      }
    } catch (err) {
      console.error("Failed to load work orders:", err);
    } finally {
      setLoading(false);
    }
  }

  function calculateKPIs(orders: WorkOrder[]) {
    const activeOrders = orders.filter((o) =>
      ["draft", "scoped", "tendered", "awarded", "in_progress"].includes(normalizeStatus(o.status))
    ).length;

    const ytdSpend = orders
      .filter((o) => normalizeStatus(o.status) === "complete")
      .reduce((sum, o) => sum + getOrderCost(o), 0);

    const annualBudget = 78000; // TODO: make this configurable per portfolio
    const budgetRemaining = annualBudget - ytdSpend;

    const overdue = 0; // TODO: calculate from targetStart vs current date

    const completedOrders = orders.filter((o) => normalizeStatus(o.status) === "complete");
    const avgRating = 4.2; // TODO: calculate from actual contractor ratings

    setKpis({ activeOrders, ytdSpend, budgetRemaining, overdue, avgRating });
  }

  function getOrdersByStatus(status: WorkOrderStatus): WorkOrder[] {
    return orders.filter((o) => normalizeStatus(o.status) === status);
  }

  const statuses: WorkOrderStatus[] = ["draft", "scoped", "tendered", "awarded", "in_progress", "complete"];

  return (
    <AppShell>
      <TopBar />
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 32px 40px", background: "var(--bg)" }}>
        {/* Page Header */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "9px",
            fontWeight: 500,
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "16px",
          }}
        >
          Work Orders
        </div>

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "1px",
            background: "var(--bdr)",
            border: "1px solid var(--bdr)",
            borderRadius: "var(--r, 10px)",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          <KPI label="Active Orders" value={kpis.activeOrders.toString()} note={`${orders.length} total`} />
          <KPI
            label="YTD Spend"
            value={fmt(kpis.ytdSpend, "$")}
            note={
              kpis.budgetRemaining > 0 ? `${Math.round((kpis.ytdSpend / 78000) * 100)}% of budget` : "Over budget"
            }
          />
          <KPI label="Budget Remaining" value={fmt(kpis.budgetRemaining, "$")} note="of $78k annual maintenance" />
          <KPI
            label="Overdue"
            value={kpis.overdue.toString()}
            note={kpis.overdue > 0 ? "Action required" : "All on track"}
            valueColor={kpis.overdue > 0 ? "var(--red)" : "var(--tx)"}
          />
          <KPI label="Avg Rating" value={`${kpis.avgRating}/5`} note="across completed orders" />
        </div>

        {/* Kanban Board */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          {statuses.map((status) => {
            const statusOrders = getOrdersByStatus(status);
            const config = STATUS_CONFIG[status];
            return (
              <div key={status} style={{ minHeight: "120px" }}>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    fontWeight: 500,
                    color: config.color,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {config.label}
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      fontWeight: 500,
                      padding: "2px 6px",
                      borderRadius: "5px",
                      background: "var(--s3)",
                      color: "var(--tx3)",
                      border: "1px solid var(--bdr)",
                    }}
                  >
                    {statusOrders.length}
                  </span>
                </div>
                {statusOrders.map((order) => (
                  <KanbanCard key={order.id} order={order} />
                ))}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "var(--r, 10px)",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--tx3)", marginBottom: "8px" }}>No work orders yet</div>
            <Link
              href="/property"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "var(--acc)",
                color: "#fff",
                borderRadius: "7px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Create first work order
            </Link>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--tx3)" }}>Loading work orders...</div>
        )}
      </main>
    </AppShell>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPI({
  label,
  value,
  note,
  valueColor = "var(--tx)",
}: {
  label: string;
  value: string;
  note: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "var(--s1)",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--s1)")}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "8px",
          fontWeight: 500,
          color: "var(--tx3)",
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: "20px",
          color: valueColor,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", marginTop: "3px" }}>{note}</div>
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ order }: { order: WorkOrder }) {
  const cost = getOrderCost(order);
  const sym = order.currency === "USD" ? "$" : "£";
  const priority = order.priority || "normal";

  return (
    <Link href={`/work-orders/${order.id}`}>
      <div
        style={{
          background: "var(--s1)",
          border: "1px solid var(--bdr)",
          borderRadius: "8px",
          padding: "10px 12px",
          marginBottom: "6px",
          cursor: "pointer",
          transition: "border-color 0.12s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--tx3)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--bdr)")}
      >
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--tx)",
            marginBottom: "3px",
          }}
        >
          {order.jobType}
        </div>
        <div style={{ fontFamily: "var(--sans)", fontSize: "9px", color: "var(--tx3)", marginBottom: "6px" }}>
          {order.asset?.name || "No property"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 500, color: "var(--tx2)" }}>
            {cost > 0 ? fmt(cost, sym) : "Est. pending"}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "100px",
              fontFamily: "var(--mono)",
              fontSize: "8px",
              fontWeight: 500,
              letterSpacing: "0.3px",
              textTransform: "uppercase",
              ...parseCSSString(PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal),
            }}
          >
            {priority}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

function parseCSSString(css: string): React.CSSProperties {
  const obj: React.CSSProperties = {};
  css.split(";").forEach((rule) => {
    const [key, value] = rule.split(":").map((s) => s.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      (obj as Record<string, string>)[camelKey] = value;
    }
  });
  return obj;
}
