"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkOrder {
  id: string;
  jobType: string;
  description: string;
  scopeOfWorks: string | null;
  aiScopeJson: Record<string, unknown> | null;
  status: string;
  priority: string | null;
  currency: string;
  budgetEstimate: number | null;
  costEstimate: number | null;
  agreedPrice: number | null;
  finalCost: number | null;
  beforePhotos: Array<{ url: string; caption: string; takenAt: string }> | null;
  afterPhotos: Array<{ url: string; caption: string; takenAt: string }> | null;
  variationOrders: Array<{ description: string; amount: number; approved: boolean; date: string }> | null;
  createdAt: string;
  asset: { id: string; name: string; location: string } | null;
  quotes: TenderQuote[];
  milestones: Milestone[];
}

interface TenderQuote {
  id: string;
  contractorName: string;
  price: number;
  breakdown: { labour?: number; materials?: number; plant?: number; overheads?: number } | null;
  proposedStart: string | null;
  proposedDuration: number | null;
  warranty: string | null;
  paymentTerms: string | null;
  questions: Array<{ question: string; answer: string }> | null;
  awarded: boolean;
  rating: number | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  status: string;
  paymentAmount: number | null;
  paymentReleased: boolean;
  paymentReleasedAt: string | null;
  progressPhotos: Array<{ url: string; caption: string }> | null;
  signOffNotes: string | null;
}

// ── Status Config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "background:var(--s3);color:var(--tx3);border:1px solid var(--bdr)",
  scoped: "background:var(--acc-lt);color:var(--acc);border:1px solid var(--acc-bdr)",
  tendered: "background:var(--acc-lt);color:var(--acc);border:1px solid var(--acc-bdr)",
  awarded: "background:var(--amb-lt);color:var(--amb);border:1px solid var(--amb-bdr)",
  in_progress: "background:var(--amb-lt);color:var(--amb);border:1px solid var(--amb-bdr)",
  complete: "background:var(--grn-lt);color:var(--grn);border:1px solid var(--grn-bdr)",
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

function parseCSSString(css: string): React.CSSProperties {
  const obj: Record<string, string> = {};
  css.split(";").forEach((rule) => {
    const [key, value] = rule.split(":").map((s) => s.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      obj[camelKey] = value;
    }
  });
  return obj as React.CSSProperties;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingScope, setGeneratingScope] = useState(false);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/user/work-orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      } else if (res.status === 404) {
        router.push("/work-orders");
      }
    } catch (err) {
      console.error("Failed to load work order:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateScope() {
    if (!order || generatingScope) return;
    setGeneratingScope(true);
    try {
      const res = await fetch(`/api/user/work-orders/${orderId}/scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: order.description,
          jobType: order.jobType,
        }),
      });
      if (res.ok) {
        await loadOrder(); // Reload to get updated aiScopeJson
      }
    } catch (err) {
      console.error("Failed to generate scope:", err);
    } finally {
      setGeneratingScope(false);
    }
  }

  async function awardContract(quoteId: string) {
    if (!order || awarding) return;
    setAwarding(true);
    try {
      const res = await fetch(`/api/user/work-orders/${orderId}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      if (res.ok) {
        await loadOrder();
      }
    } catch (err) {
      console.error("Failed to award contract:", err);
    } finally {
      setAwarding(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar />
        <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ color: "var(--tx3)" }}>Loading work order...</div>
        </main>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <TopBar />
        <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ color: "var(--tx3)", marginBottom: "16px" }}>Work order not found</div>
          <Link
            href="/work-orders"
            style={{
              padding: "8px 16px",
              background: "var(--acc)",
              color: "#fff",
              borderRadius: "7px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            Back to work orders
          </Link>
        </main>
      </AppShell>
    );
  }

  const sym = order.currency === "USD" ? "$" : "£";
  const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.draft;
  const priorityStyle = PRIORITY_STYLES[order.priority || "normal"];
  const aiScope = order.aiScopeJson as { scopeSummary?: string; lineItems?: Array<{ description: string; estimatedCost: number }> } | null;

  return (
    <AppShell>
      <TopBar />
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 32px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: "11px", color: "var(--tx3)", marginBottom: "12px" }}>
          <Link href="/work-orders" style={{ color: "var(--acc)" }}>
            ← Work Orders
          </Link>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          {order.priority && (
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
                ...parseCSSString(priorityStyle),
              }}
            >
              {order.priority}
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9px",
              fontWeight: 500,
              padding: "3px 7px",
              borderRadius: "5px",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
              ...parseCSSString(statusStyle),
            }}
          >
            {order.status.replace(/_/g, " ")}
          </span>
          <span style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--tx3)" }}>
            Created {formatDate(order.createdAt)}
          </span>
        </div>
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--tx)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              marginBottom: "4px",
            }}
          >
            {order.jobType}
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--tx3)" }}>
            {order.asset?.name || "No property"} · {order.asset?.location || ""}
          </div>
        </div>

        {/* Description */}
        <Section title="Brief">
          <Card>
            <div style={{ padding: "18px" }}>
              <div style={{ fontSize: "12px", color: "var(--tx)", lineHeight: 1.6 }}>{order.description}</div>
            </div>
          </Card>
        </Section>

        {/* AI Scope */}
        {aiScope && aiScope.lineItems && aiScope.lineItems.length > 0 ? (
          <Section title="Scope of Work — AI Generated">
            <Card>
              <CardHeader
                title="Scope of Work"
                badge="AI GENERATED"
                action="Edit scope →"
                onActionClick={() => console.log("Edit scope")}
              />
              {aiScope.lineItems.map((item, i) => (
                <ScopeItem key={i} num={i + 1} description={item.description} cost={item.estimatedCost} sym={sym} />
              ))}
              {aiScope.scopeSummary && (
                <div style={{ padding: "12px 18px", borderTop: "1px solid var(--bdr)", fontSize: "11px", color: "var(--tx3)" }}>
                  {aiScope.scopeSummary}
                </div>
              )}
            </Card>
          </Section>
        ) : (
          order.status === "draft" && (
            <Section title="Scope of Work">
              <Card>
                <div style={{ padding: "24px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "var(--tx3)", marginBottom: "12px" }}>
                    Generate a detailed scope of work using AI
                  </div>
                  <button
                    onClick={generateScope}
                    disabled={generatingScope}
                    style={{
                      padding: "8px 16px",
                      background: "var(--acc)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "7px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: generatingScope ? 0.5 : 1,
                    }}
                  >
                    {generatingScope ? "Generating..." : "Generate scope with AI →"}
                  </button>
                </div>
              </Card>
            </Section>
          )
        )}

        {/* Tender Comparison */}
        {order.quotes && order.quotes.length > 0 && (
          <Section title="Tender Comparison">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "24px" }}>
              {order.quotes.slice(0, 3).map((quote) => (
                <TenderCard
                  key={quote.id}
                  quote={quote}
                  sym={sym}
                  onAward={() => awardContract(quote.id)}
                  awarding={awarding}
                  isAwarded={quote.awarded}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Milestones */}
        {order.milestones && order.milestones.length > 0 && (
          <Section title="Milestone Payments">
            <Card>
              <CardHeader
                title="Payment Schedule"
                action={`${fmt(order.agreedPrice || 0, sym)} total`}
              />
              {order.milestones.map((milestone) => (
                <MilestoneRow key={milestone.id} milestone={milestone} sym={sym} />
              ))}
            </Card>
          </Section>
        )}

        {/* Photo Evidence */}
        {(order.beforePhotos || order.afterPhotos || order.status === "in_progress") && (
          <Section title="Photo Evidence">
            <Card>
              <CardHeader title="Before / Progress / After" action="Upload photos →" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", padding: "18px" }}>
                {order.beforePhotos?.map((photo, i) => (
                  <PhotoSlot key={`before-${i}`} label={`Before — ${formatDate(photo.takenAt)}`} caption={photo.caption} />
                ))}
                <PhotoSlot label="+ Upload before photo" />
                <PhotoSlot label="+ Upload progress photo" />
                <PhotoSlot label="+ Upload after photo" />
              </div>
            </Card>
          </Section>
        )}

        {/* Actions */}
        <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
          {order.status === "draft" && aiScope && (
            <button
              style={{
                padding: "10px 20px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Send to contractors →
            </button>
          )}
          {order.status === "tendered" && order.quotes.length > 0 && (
            <div style={{ fontSize: "12px", color: "var(--tx3)" }}>
              {order.quotes.length} quote{order.quotes.length !== 1 ? "s" : ""} received — review above to award
            </div>
          )}
          <Link
            href="/work-orders"
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "var(--tx2)",
              border: "1px solid var(--bdr)",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Back to list
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

// ── UI Components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "9px",
          fontWeight: 500,
          color: "var(--tx3)",
          textTransform: "uppercase",
          letterSpacing: "2px",
          marginBottom: "12px",
          paddingTop: "4px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--s1)",
        border: "1px solid var(--bdr)",
        borderRadius: "var(--r, 10px)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  badge,
  action,
  onActionClick,
}: {
  title: string;
  badge?: string;
  action?: string;
  onActionClick?: () => void;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--bdr)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h4 style={{ fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 600, color: "var(--tx)" }}>{title}</h4>
        {badge && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "8px",
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "var(--acc-lt)",
              color: "var(--acc)",
              border: "1px solid var(--acc-bdr)",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {action && (
        <span
          onClick={onActionClick}
          style={{
            fontFamily: "var(--sans)",
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--acc)",
            cursor: onActionClick ? "pointer" : "default",
          }}
        >
          {action}
        </span>
      )}
    </div>
  );
}

function ScopeItem({ num, description, cost, sym }: { num: number; description: string; cost?: number; sym: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "10px",
        alignItems: "start",
        padding: "10px 18px",
        borderBottom: "1px solid var(--bdr-lt, var(--bdr))",
      }}
    >
      <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 600, color: "var(--acc)", minWidth: "24px" }}>
        {num}.
      </span>
      <div style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--tx)", lineHeight: 1.6 }}>
        {description}
      </div>
      {cost !== undefined && (
        <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--tx3)", textAlign: "right" }}>
          {fmt(cost, sym)}
        </span>
      )}
    </div>
  );
}

function TenderCard({
  quote,
  sym,
  onAward,
  awarding,
  isAwarded,
}: {
  quote: TenderQuote;
  sym: string;
  onAward: () => void;
  awarding: boolean;
  isAwarded: boolean;
}) {
  const breakdown = quote.breakdown || {};
  const total = (breakdown.labour || 0) + (breakdown.materials || 0) + (breakdown.plant || 0) + (breakdown.overheads || 0);

  return (
    <div
      style={{
        background: "var(--s1)",
        border: isAwarded ? "1px solid var(--grn-bdr)" : "1px solid var(--bdr)",
        borderRadius: "var(--r, 10px)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: isAwarded ? "0 0 0 1px var(--grn-bdr)" : "none",
      }}
    >
      {isAwarded && (
        <div style={{ padding: "4px 14px 0", textAlign: "center" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "8px",
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: "5px",
              background: "var(--grn-lt)",
              color: "var(--grn)",
              border: "1px solid var(--grn-bdr)",
            }}
          >
            AWARDED
          </span>
        </div>
      )}
      <div style={{ padding: "14px", borderBottom: "1px solid var(--bdr)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 600, color: "var(--tx)", marginBottom: "2px" }}>
          {quote.contractorName}
        </div>
        {quote.rating && (
          <div style={{ display: "flex", justifyContent: "center", gap: "2px", marginTop: "4px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ color: i < quote.rating! ? "var(--amb)" : "var(--tx3)", fontSize: "12px" }}>
                ★
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid var(--bdr)" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: isAwarded ? "var(--grn)" : "var(--tx)" }}>
          {fmt(quote.price, sym)}
        </div>
        {quote.proposedDuration && (
          <div style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)" }}>
            {quote.proposedDuration} working days
          </div>
        )}
      </div>
      {breakdown.labour !== undefined && (
        <>
          <TenderRow label="Labour" value={fmt(breakdown.labour, sym)} />
          <TenderRow label="Materials" value={fmt(breakdown.materials || 0, sym)} />
          <TenderRow label="Overheads" value={fmt(breakdown.overheads || 0, sym)} />
        </>
      )}
      {quote.proposedStart && <TenderRow label="Start date" value={formatDate(quote.proposedStart)} />}
      {quote.warranty && <TenderRow label="Warranty" value={quote.warranty} />}
      {quote.paymentTerms && <TenderRow label="Payment" value={quote.paymentTerms} />}
      <div style={{ padding: "10px 14px" }}>
        {!isAwarded && (
          <button
            onClick={onAward}
            disabled={awarding}
            style={{
              width: "100%",
              padding: "8px",
              background: "var(--grn)",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              fontFamily: "var(--sans)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              opacity: awarding ? 0.5 : 1,
            }}
          >
            Award contract →
          </button>
        )}
      </div>
    </div>
  );
}

function TenderRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 14px",
        borderBottom: "1px solid var(--bdr-lt, var(--bdr))",
        fontFamily: "var(--sans)",
        fontSize: "11px",
      }}
    >
      <span style={{ color: "var(--tx3)" }}>{label}</span>
      <span style={{ color: "var(--tx)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function MilestoneRow({ milestone, sym }: { milestone: Milestone; sym: string }) {
  const isDone = milestone.status === "complete";
  const isCurrent = milestone.status === "in_progress";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: "12px",
        alignItems: "center",
        padding: "12px 18px",
        borderBottom: "1px solid var(--bdr-lt, var(--bdr))",
      }}
    >
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          border: "2px solid var(--bdr)",
          background: isDone ? "var(--grn)" : isCurrent ? "var(--acc)" : "var(--s2)",
          borderColor: isDone ? "var(--grn)" : isCurrent ? "var(--acc)" : "var(--bdr)",
        }}
      />
      <div>
        <div style={{ fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 500, color: "var(--tx)" }}>
          {milestone.title}
        </div>
        <div style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)" }}>
          {milestone.dueDate ? `Due ${formatDate(milestone.dueDate)}` : "No due date"}
        </div>
      </div>
      {milestone.paymentAmount && (
        <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 500, color: "var(--tx)" }}>
          {fmt(milestone.paymentAmount, sym)}
        </span>
      )}
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: "9px",
          fontWeight: 500,
          padding: "2px 7px",
          borderRadius: "4px",
          background: milestone.paymentReleased ? "var(--grn-lt)" : "var(--amb-lt)",
          color: milestone.paymentReleased ? "var(--grn)" : "var(--amb)",
          border: milestone.paymentReleased ? "1px solid var(--grn-bdr)" : "1px solid var(--amb-bdr)",
        }}
      >
        {milestone.paymentReleased ? "RELEASED" : "PENDING"}
      </span>
    </div>
  );
}

function PhotoSlot({ label, caption }: { label: string; caption?: string }) {
  return (
    <div
      style={{
        aspectRatio: "4/3",
        background: "var(--s2)",
        border: "1px solid var(--bdr)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--sans)",
        fontSize: "10px",
        color: "var(--tx3)",
        cursor: "pointer",
        transition: "border-color 0.12s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--tx3)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--bdr)")}
    >
      {caption ? (
        <>
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)" }}>{caption}</div>
          <span
            style={{
              position: "absolute",
              bottom: "6px",
              left: "6px",
              fontFamily: "var(--mono)",
              fontSize: "8px",
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: "3px",
              background: "rgba(0,0,0,0.7)",
              color: "var(--tx)",
            }}
          >
            {label}
          </span>
        </>
      ) : (
        label
      )}
    </div>
  );
}
