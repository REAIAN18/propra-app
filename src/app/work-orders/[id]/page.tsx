"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ── Types ─────────────────────────────────────────────────────────────

type ScopeItem = {
  num: number;
  description: string;
  quantity: string;
};

type TenderQuote = {
  id: string;
  contractorName: string;
  contractorCompany: string;
  contractorRating: number;
  totalPrice: number;
  labourCost: number;
  materialsCost: number;
  overheadsCost: number;
  startDate: string;
  warranty: string;
  paymentTerms: string;
  durationDays: number;
  isRecommended: boolean;
};

type WorkOrderDetail = {
  id: string;
  title: string;
  property: string;
  location: string;
  tenant: string | null;
  priority: "NORMAL" | "HIGH" | "URGENT";
  status: string;
  createdAt: string;
  createdFrom: string;
  scopeOfWork: ScopeItem[];
  accessNotes: string;
  exclusions: string;
  quotes: TenderQuote[];
};

// ── Helper Functions ──────────────────────────────────────────────────

function fmtPrice(v: number, currency: string = "USD"): string {
  const sym = currency === "GBP" ? "£" : "$";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(1)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      style={{
        color: i < rating ? "var(--amb)" : "var(--tx3)",
        fontSize: "12px",
      }}
    >
      ★
    </span>
  ));
}

// ── Main Component ────────────────────────────────────────────────────

export default function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<WorkOrderDetail | null>(null);

  useEffect(() => {
    // Mock data for demo - Phase 2 will fetch from /api/user/work-orders/[id]
    setLoading(true);
    setTimeout(() => {
      setOrder({
        id: params.id,
        title: "Roof Leak Repair — Suite 3A",
        property: "Coral Gables Office Park",
        location: "3rd floor, north wing",
        tenant: "Meridian Law Group",
        priority: "HIGH",
        status: "tendered",
        createdAt: "2026-03-10",
        createdFrom: "Tenant report",
        scopeOfWork: [
          {
            num: 1,
            description: "**Inspection & diagnosis:** Access roof area above Suite 3A, identify leak source, check membrane condition, inspect flashings and penetrations around HVAC unit and vent pipes.",
            quantity: "Allow 4hrs",
          },
          {
            num: 2,
            description: "**Temporary protection:** Install temporary waterproofing to prevent further water ingress during repair period. Protect tenant's ceiling and carpet below with dust sheets.",
            quantity: "1 day",
          },
          {
            num: 3,
            description: "**Membrane repair:** Cut back damaged EPDM membrane (approx. 3m²), apply new EPDM patch with hot-air welded seams. Replace damaged flashing around HVAC penetration.",
            quantity: "~3m² EPDM",
          },
          {
            num: 4,
            description: "**Interior make-good:** Repair water-stained ceiling tile (approx. 4 tiles), repaint affected area. Replace carpet tile if damaged (check on inspection).",
            quantity: "4 ceiling tiles",
          },
          {
            num: 5,
            description: "**Water test & sign-off:** Flood test repaired area, confirm no further ingress over 48hr monitoring period. Photograph completed work.",
            quantity: "48hr test",
          },
        ],
        accessNotes: "Roof access via internal stairwell. MEWP not required. Harness/edge protection needed for parapet work. Tenant notification 48hrs before interior work.",
        exclusions: "Full roof replacement not included. HVAC unit repair/replacement excluded (separate order if needed). Asbestos survey not included — check records.",
        quotes: [
          {
            id: "q1",
            contractorName: "ProRoof Solutions",
            contractorCompany: "Licensed · Insured · 12 years",
            contractorRating: 5,
            totalPrice: 2850,
            labourCost: 1600,
            materialsCost: 850,
            overheadsCost: 400,
            startDate: "Apr 2",
            warranty: "10 years",
            paymentTerms: "50/50",
            durationDays: 5,
            isRecommended: true,
          },
          {
            id: "q2",
            contractorName: "Tampa Roofing Co",
            contractorCompany: "Licensed · Insured · 8 years",
            contractorRating: 4,
            totalPrice: 3400,
            labourCost: 2000,
            materialsCost: 900,
            overheadsCost: 500,
            startDate: "Apr 7",
            warranty: "5 years",
            paymentTerms: "On completion",
            durationDays: 7,
            isRecommended: false,
          },
          {
            id: "q3",
            contractorName: "FastFix Maintenance",
            contractorCompany: "Licensed · Insured · 3 years",
            contractorRating: 3,
            totalPrice: 4100,
            labourCost: 2400,
            materialsCost: 1000,
            overheadsCost: 700,
            startDate: "Mar 31",
            warranty: "2 years",
            paymentTerms: "100% upfront",
            durationDays: 3,
            isRecommended: false,
          },
        ],
      });
      setLoading(false);
    }, 300);
  }, [params.id]);

  if (loading) {
    return (
      <AppShell>
        <TopBar />
        <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "28px 32px 80px", maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ padding: "40px 20px", textAlign: "center", font: "13px var(--sans)", color: "var(--tx3)" }}>
            Loading work order...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <TopBar />
        <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "28px 32px 80px", maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ padding: "40px 20px", textAlign: "center", font: "13px var(--sans)", color: "var(--tx3)" }}>
            Work order not found
          </div>
        </div>
      </AppShell>
    );
  }

  const priorityStyles = {
    URGENT: { bg: "var(--red-lt)", color: "var(--red)", border: "var(--red-bdr)" },
    HIGH: { bg: "var(--amb-lt)", color: "var(--amb)", border: "var(--amb-bdr)" },
    NORMAL: { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)" },
  };

  const statusStyles = {
    draft: { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)" },
    scoped: { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)" },
    tendered: { bg: "var(--acc-lt)", color: "var(--acc)", border: "var(--acc-bdr)" },
    awarded: { bg: "var(--amb-lt)", color: "var(--amb)", border: "var(--amb-bdr)" },
    in_progress: { bg: "var(--acc-lt)", color: "var(--acc)", border: "var(--acc-bdr)" },
    complete: { bg: "var(--grn-lt)", color: "var(--grn)", border: "var(--grn-bdr)" },
  };

  const ps = priorityStyles[order.priority];
  const ss = statusStyles[order.status as keyof typeof statusStyles] || statusStyles.draft;

  const recommendedQuote = order.quotes.find((q) => q.isRecommended);

  return (
    <AppShell>
      <TopBar />
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "28px 32px 80px", maxWidth: "1080px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: ".3px", background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
            {order.priority}
          </span>
          <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: ".3px", textTransform: "uppercase", background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
            {order.status}
          </span>
          <span style={{ font: "300 12px var(--sans)", color: "var(--tx3)" }}>
            Created {order.createdAt} · From {order.createdFrom}
          </span>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: "24px", fontWeight: 400, color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: "4px" }}>
            {order.title}
          </div>
          <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
            {order.property} · {order.location}
            {order.tenant && ` · Tenant: ${order.tenant}`}
          </div>
        </div>

        {/* AI Scope of Work */}
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>
          Scope of Work — AI Generated
        </div>

        <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Scope of Work</h4>
              <span style={{ font: "500 8px/1 var(--mono)", padding: "2px 6px", borderRadius: "4px", background: "var(--acc-lt)", color: "var(--acc)", border: "1px solid var(--acc-bdr)" }}>
                AI GENERATED
              </span>
            </div>
            <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>Edit scope →</span>
          </div>

          {order.scopeOfWork.map((item) => (
            <div
              key={item.num}
              style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "12px", alignItems: "start", padding: "11px 18px", borderBottom: "1px solid rgba(255,255,255,.02)" }}
            >
              <span style={{ font: "600 11px var(--mono)", color: "var(--acc)", minWidth: "24px" }}>{item.num}.</span>
              <div
                style={{ font: "400 12px/1.6 var(--sans)", color: "var(--tx)" }}
                dangerouslySetInnerHTML={{
                  __html: item.description.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                }}
              />
              <span style={{ font: "400 10px var(--mono)", color: "var(--tx3)", textAlign: "right" }}>{item.quantity}</span>
            </div>
          ))}

          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--bdr)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <div style={{ font: "500 10px var(--sans)", color: "var(--tx2)", marginBottom: "4px" }}>Access & Safety</div>
                <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)" }}>{order.accessNotes}</div>
              </div>
              <div>
                <div style={{ font: "500 10px var(--sans)", color: "var(--tx2)", marginBottom: "4px" }}>Exclusions</div>
                <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)" }}>{order.exclusions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tender Comparison */}
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>
          Tender Comparison
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          {order.quotes.map((quote) => (
            <div
              key={quote.id}
              style={{
                background: "var(--s1)",
                border: quote.isRecommended ? "1px solid var(--grn-bdr)" : "1px solid var(--bdr)",
                borderRadius: "10px",
                overflow: "hidden",
                boxShadow: quote.isRecommended ? "0 0 0 1px var(--grn-bdr)" : "none",
              }}
            >
              {quote.isRecommended && (
                <div style={{ padding: "4px 14px 0", textAlign: "center" }}>
                  <span style={{ font: "500 8px/1 var(--mono)", padding: "2px 7px", borderRadius: "4px", background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" }}>
                    AI RECOMMENDED
                  </span>
                </div>
              )}

              <div style={{ padding: quote.isRecommended ? "14px" : "18px 14px 14px", borderBottom: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: "2px" }}>{quote.contractorName}</div>
                <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)" }}>{quote.contractorCompany}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: "2px", marginTop: "4px" }}>{renderStars(quote.contractorRating)}</div>
              </div>

              <div style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid var(--bdr)" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: quote.isRecommended ? "var(--grn)" : "var(--tx)" }}>{fmtPrice(quote.totalPrice)}</div>
                <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)" }}>{quote.durationDays} working days</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.02)", font: "400 11px var(--sans)" }}>
                <span style={{ color: "var(--tx3)" }}>Labour</span>
                <span style={{ color: "var(--tx)", fontWeight: 500 }}>{fmtPrice(quote.labourCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.02)", font: "400 11px var(--sans)" }}>
                <span style={{ color: "var(--tx3)" }}>Materials</span>
                <span style={{ color: "var(--tx)", fontWeight: 500 }}>{fmtPrice(quote.materialsCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.02)", font: "400 11px var(--sans)" }}>
                <span style={{ color: "var(--tx3)" }}>Overheads</span>
                <span style={{ color: "var(--tx)", fontWeight: 500 }}>{fmtPrice(quote.overheadsCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.02)", font: "400 11px var(--sans)" }}>
                <span style={{ color: "var(--tx3)" }}>Start date</span>
                <span style={{ color: "var(--tx)", fontWeight: 500 }}>{quote.startDate}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.02)", font: "400 11px var(--sans)" }}>
                <span style={{ color: "var(--tx3)" }}>Warranty</span>
                <span style={{ color: "var(--tx)", fontWeight: 500 }}>{quote.warranty}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", font: "400 11px var(--sans)" }}>
                <span style={{ color: "var(--tx3)" }}>Payment</span>
                <span style={{ color: "var(--tx)", fontWeight: 500 }}>{quote.paymentTerms}</span>
              </div>

              <div style={{ padding: "10px 14px" }}>
                <button
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: quote.isRecommended ? "var(--grn)" : "transparent",
                    color: quote.isRecommended ? "#fff" : "var(--tx2)",
                    border: quote.isRecommended ? "none" : "1px solid var(--bdr)",
                    borderRadius: "7px",
                    font: quote.isRecommended ? "600 11px var(--sans)" : "500 11px var(--sans)",
                    cursor: "pointer",
                  }}
                >
                  Award contract →
                </button>
              </div>
            </div>
          ))}
        </div>

        {recommendedQuote && (
          <div style={{ padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", font: "300 12px/1.5 var(--sans)", color: "var(--tx3)", marginBottom: "24px" }}>
            <strong>AI recommendation:</strong> {recommendedQuote.contractorName} offers the best value — lowest price, longest warranty ({recommendedQuote.warranty}), and highest contractor rating ({recommendedQuote.contractorRating}.0 from previous jobs). Start date {recommendedQuote.startDate} is acceptable.
          </div>
        )}
      </div>
    </AppShell>
  );
}
