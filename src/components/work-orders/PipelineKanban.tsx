"use client";

// ── Pipeline Kanban Component (PRO-802) ─────────────────────────────────────
// Kanban board for work order pipeline management

interface WorkOrder {
  id: string;
  jobType: string;
  description: string;
  status: string;
  costEstimate: number | null;
  agreedPrice: number | null;
  budgetEstimate: number | null;
  tenderType: string | null;
  targetStart: string | null;
  asset: {
    name: string;
  } | null;
  quotes: any[];
  createdAt: Date | string;
}

interface PipelineKanbanProps {
  workOrders: WorkOrder[];
  currency: string;
  onCardClick: (workOrder: WorkOrder) => void;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "var(--tx3)" },
  scoped: { label: "Scoped", color: "var(--acc)" },
  tendered: { label: "Tendered", color: "var(--acc)" },
  quotes_received: { label: "Quotes", color: "var(--amb)" },
  awarded: { label: "Awarded", color: "var(--amb)" },
  in_progress: { label: "In Progress", color: "var(--amb)" },
  complete: { label: "Complete", color: "var(--grn)" },
};

const PIPELINE_STAGES = [
  "draft",
  "scoped",
  "tendered",
  "quotes_received",
  "in_progress",
  "complete",
] as const;

export function PipelineKanban({
  workOrders,
  currency,
  onCardClick,
}: PipelineKanbanProps) {
  const sym = currency === "GBP" ? "£" : "$";

  function fmt(v: number | null) {
    if (!v) return "—";
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${month} ${year}`;
  }

  function getPriorityLabel(order: WorkOrder): string | null {
    const targetDate = order.targetStart ? new Date(order.targetStart) : null;
    if (!targetDate) return null;

    const daysUntil = Math.floor(
      (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) return "OVERDUE";
    if (daysUntil <= 7) return "URGENT";
    if (daysUntil <= 30) return "HIGH";
    return null;
  }

  function getPriorityClass(order: WorkOrder): string {
    const label = getPriorityLabel(order);
    if (label === "OVERDUE" || label === "URGENT") return "urgent";
    if (label === "HIGH") return "high";
    return "normal";
  }

  // Group orders by status
  const ordersByStatus = PIPELINE_STAGES.reduce(
    (acc, status) => {
      acc[status] = workOrders.filter((wo) => wo.status === status);
      return acc;
    },
    {} as Record<string, WorkOrder[]>
  );

  return (
    <div
      className="grid gap-3 mb-6"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {PIPELINE_STAGES.map((status) => {
        const orders = ordersByStatus[status] || [];
        const config = STATUS_CONFIG[status];

        return (
          <div key={status} style={{ minHeight: "120px" }}>
            {/* Column header */}
            <div
              className="flex items-center justify-between mb-2"
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9px",
                fontWeight: 500,
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              <span>{config.label}</span>
              <span
                className="px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: "var(--s3)",
                  border: "1px solid var(--bdr)",
                  color: "var(--tx3)",
                }}
              >
                {orders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {orders.map((order) => {
                const priority = getPriorityLabel(order);
                const priceDisplay =
                  order.agreedPrice ||
                  order.costEstimate ||
                  order.budgetEstimate;

                return (
                  <div
                    key={order.id}
                    onClick={() => onCardClick(order)}
                    className="rounded-lg p-3 cursor-pointer transition-colors hover:border-opacity-80"
                    style={{
                      backgroundColor: "var(--s1)",
                      border: "1px solid var(--bdr)",
                    }}
                  >
                    {/* Title */}
                    <div
                      className="text-[11px] font-medium mb-1 line-clamp-2"
                      style={{ color: "var(--tx)" }}
                    >
                      {order.jobType}
                    </div>

                    {/* Meta */}
                    <div
                      className="text-[9px] mb-2"
                      style={{ color: "var(--tx3)" }}
                    >
                      {order.asset?.name || "Portfolio"}
                      {order.targetStart && ` · ${formatDate(order.targetStart)}`}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div
                        className="text-[10px] font-medium"
                        style={{ fontFamily: "var(--mono)", color: "var(--tx2)" }}
                      >
                        {fmt(priceDisplay)}
                      </div>
                      {priority && (
                        <span
                          className={`text-[8px] font-medium px-2 py-0.5 rounded-full uppercase ${getPriorityClass(order)}`}
                          style={{
                            fontFamily: "var(--mono)",
                            letterSpacing: "0.3px",
                          }}
                        >
                          {priority}
                        </span>
                      )}
                    </div>

                    {/* Quotes indicator */}
                    {order.quotes && order.quotes.length > 0 && (
                      <div
                        className="mt-2 pt-2 text-[9px] flex items-center gap-1"
                        style={{
                          borderTop: "1px solid var(--bdr-lt)",
                          color: "var(--acc)",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {order.quotes.length} quote{order.quotes.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
