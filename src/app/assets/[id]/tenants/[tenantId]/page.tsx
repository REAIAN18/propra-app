"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TenantData {
  tenant: {
    id: string;
    name: string;
    email: string | null;
    sector: string | null;
    covenantGrade: string;
    covenantScore: number | null;
    companyStatus: string | null;
    yearsTrading: number | null;
  };
  lease: {
    id: string;
    assetId: string;
    assetName: string;
    assetLocation: string;
    unitRef: string | null;
    sqft: number;
    passingRent: number;
    currency: string;
    sym: string;
    startDate: string | null;
    expiryDate: string | null;
    breakDate: string | null;
    breakNoticePeriodMonths: number | null;
    reviewDate: string | null;
    reviewType: string | null;
    escalationType: string | null;
    repairObligation: string | null;
    alienation: string | null;
    rentPerSqft: number | null;
    daysToExpiry: number | null;
    daysToBreak: number | null;
    daysToReview: number | null;
  };
  kpis: {
    covenantScore: number;
    covenantLabel: string;
    passingRent: number;
    rentPerSqft: number | null;
    marketERV: number | null;
    marketRentPerSqft: number | null;
    daysToExpiry: number | null;
    daysToBreak: number | null;
    leaseStatus: string;
  };
  covenant: {
    overallScore: number;
    label: string;
    companyStatus: string;
    yearsTrading: number | null;
    sector: string | null;
    paymentHistory: string;
    leaseRisk: string;
    lastChecked: string;
  };
  payments: {
    history: Array<{
      id: string;
      status: string;
      period: string;
      amount: number;
      dueDate: string;
      paidDate: string | null;
    }>;
    totalCollected: number;
    onTimePercentage: number;
  };
  timeline: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    status: string;
    date: string;
  }>;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;
  const tenantId = params.tenantId as string;

  const [data, setData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/tenants/${tenantId}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [tenantId]);

  if (loading) {
    return (
      <div className="tab-page">
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Loading tenant details...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="tab-page">
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Tenant not found.
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `${data.lease.sym}${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const getCovenantColor = () => {
    if (data.kpis.covenantScore >= 8) return "var(--grn)";
    if (data.kpis.covenantScore >= 6) return "var(--amb)";
    return "var(--red)";
  };

  const getPaymentStatusClass = (status: string) => {
    if (status === "paid_on_time") return "paid";
    if (status === "paid_late") return "late";
    if (status === "missed") return "missed";
    return "future";
  };

  const getTimelineStatusTag = (type: string, status: string) => {
    if (type === "payment" && status === "paid_on_time") return "ok";
    if (type === "engagement") return "acc";
    if (type === "covenant_check") return "muted";
    if (status === "sent") return "ok";
    return "muted";
  };

  return (
    <div className="tab-page">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <Link
          href={`/assets/${assetId}`}
          style={{ font: "400 12px var(--sans)", color: "var(--acc)", cursor: "pointer" }}
        >
          ← {data.lease.assetName} · Tenants
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
        className="a1"
      >
        <div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: "var(--tx)", marginBottom: "4px" }}>
            {data.tenant.name}
          </div>
          <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
            {data.lease.unitRef && `${data.lease.unitRef} · `}
            {data.lease.sqft.toLocaleString()} sqft · {data.lease.assetLocation}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{
              height: "30px",
              padding: "0 12px",
              background: "transparent",
              color: "var(--tx2)",
              border: "1px solid var(--bdr)",
              borderRadius: "7px",
              font: "500 11px/1 var(--sans)",
              cursor: "pointer",
            }}
          >
            Send letter →
          </button>
          <button
            style={{
              height: "30px",
              padding: "0 14px",
              background: "var(--acc)",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              font: "600 11px/1 var(--sans)",
              cursor: "pointer",
            }}
          >
            Engage →
          </button>
        </div>
      </div>

      {/* TENANT KPIs */}
      <div className="kpis a1" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="kpi">
          <div className="kpi-l">Covenant</div>
          <div className="kpi-v" style={{ color: getCovenantColor() }}>
            {data.kpis.covenantScore}/10
          </div>
          <div className="kpi-note">{data.kpis.covenantLabel}</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Passing Rent</div>
          <div className="kpi-v">
            {formatCurrency(data.kpis.passingRent)}
            <small>/yr</small>
          </div>
          <div className="kpi-note">
            {data.kpis.rentPerSqft && `${data.lease.sym}${data.kpis.rentPerSqft.toFixed(2)}/sqft`}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Market ERV</div>
          <div className="kpi-v">
            {data.kpis.marketERV ? formatCurrency(data.kpis.marketERV) : "—"}
            <small>/yr</small>
          </div>
          <div className="kpi-note">
            {data.kpis.marketRentPerSqft && (
              <span className="pos">{data.lease.sym}{data.kpis.marketRentPerSqft.toFixed(2)}/sqft</span>
            )}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Lease Expiry</div>
          <div className="kpi-v">
            {data.lease.expiryDate
              ? new Date(data.lease.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
              : "—"}
          </div>
          <div className="kpi-note">
            {data.lease.daysToExpiry !== null &&
              `${(data.lease.daysToExpiry / 365).toFixed(1)} yrs remaining`}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Break Clause</div>
          <div className="kpi-v" style={{ color: data.lease.daysToBreak && data.lease.daysToBreak < 120 ? "var(--red)" : "var(--tx)" }}>
            {data.lease.daysToBreak !== null && data.lease.daysToBreak > 0 ? `${data.lease.daysToBreak}d` : "None"}
          </div>
          <div className="kpi-note">
            {data.lease.daysToBreak && data.lease.daysToBreak < 120 && (
              <span className="neg">at risk</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2 a2">
        {/* LEASE TERMS */}
        <div className="card">
          <div className="card-hd">
            <h4>Lease Terms</h4>
            <span className="card-link">View full lease →</span>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Lease start</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
              {formatDate(data.lease.startDate)}
            </div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Lease expiry</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
              {formatDate(data.lease.expiryDate)}
            </div>
          </div>
          {data.lease.breakDate && (
            <>
              <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                <div className="row-name">Break clause</div>
                <div
                  style={{
                    font: "600 12px var(--sans)",
                    color: data.lease.daysToBreak && data.lease.daysToBreak < 120 ? "var(--red)" : "var(--tx)",
                  }}
                >
                  {formatDate(data.lease.breakDate)}
                  {data.lease.daysToBreak !== null && ` (${data.lease.daysToBreak} days)`}
                </div>
              </div>
              {data.lease.breakNoticePeriodMonths && (
                <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                  <div className="row-name">Break notice period</div>
                  <div style={{ font: "500 12px var(--sans)", color: "var(--amb)" }}>
                    {data.lease.breakNoticePeriodMonths} months
                  </div>
                </div>
              )}
            </>
          )}
          {data.lease.reviewDate && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Rent review</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                {formatDate(data.lease.reviewDate)} ({data.lease.reviewType || "open market"})
              </div>
            </div>
          )}
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Passing rent</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
              {formatCurrency(data.lease.passingRent)}/yr ({formatCurrency(Math.round(data.lease.passingRent / 12))}/mo)
            </div>
          </div>
          {data.lease.escalationType && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Rent escalation</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                {data.lease.escalationType}
              </div>
            </div>
          )}
          {data.lease.repairObligation && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Repair obligation</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                {data.lease.repairObligation}
              </div>
            </div>
          )}
          {data.lease.alienation && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Alienation</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                {data.lease.alienation}
              </div>
            </div>
          )}
        </div>

        {/* COVENANT STRENGTH */}
        <div className="card">
          <div className="card-hd">
            <h4>Covenant Strength</h4>
            <span className="card-link">Refresh check →</span>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Overall score</div>
            <div style={{ font: "600 13px var(--sans)", color: getCovenantColor() }}>
              {data.covenant.overallScore}/10 — {data.covenant.label}
            </div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Company status</div>
            <div
              style={{
                font: "500 12px var(--sans)",
                color: data.covenant.companyStatus === "Active" ? "var(--grn)" : "var(--tx)",
              }}
            >
              {data.covenant.companyStatus}
            </div>
          </div>
          {data.covenant.yearsTrading !== null && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Years trading</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                {data.covenant.yearsTrading} years
              </div>
            </div>
          )}
          {data.covenant.sector && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Sector</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                {data.covenant.sector}
              </div>
            </div>
          )}
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Payment history</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--grn)" }}>
              {data.covenant.paymentHistory}
            </div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Lease risk</div>
            <div
              style={{
                font: "500 12px var(--sans)",
                color: data.covenant.leaseRisk.includes("active") ? "var(--amb)" : "var(--tx)",
              }}
            >
              {data.covenant.leaseRisk}
            </div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Last checked</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx3)" }}>
              {formatDate(data.covenant.lastChecked)}
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT HISTORY */}
      <div className="sec a3">Payment History — Last 12 Months</div>
      <div className="card a3">
        <div className="card-hd">
          <h4>Rent Payments</h4>
          <span className="card-link" style={{ color: "var(--tx3)" }}>
            {formatCurrency(data.payments.totalCollected)} collected · {data.payments.onTimePercentage}% on time
          </span>
        </div>
        <div style={{ padding: "18px" }}>
          {/* Visual payment bar */}
          <div className="pay-bar">
            {data.payments.history.map((payment, idx) => (
              <div
                key={payment.id || idx}
                className={`pay-month ${getPaymentStatusClass(payment.status)}`}
                title={`${payment.period} — ${payment.status.replace(/_/g, " ")}`}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              font: "400 9px var(--mono)",
              color: "var(--tx3)",
              marginTop: "4px",
            }}
          >
            <span>{data.payments.history[data.payments.history.length - 1]?.period}</span>
            <span>{data.payments.history[0]?.period}</span>
          </div>
          <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", font: "400 10px var(--sans)", color: "var(--tx3)" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--grn)", opacity: ".6" }} />
              Paid on time
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", font: "400 10px var(--sans)", color: "var(--tx3)" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--amb)", opacity: ".6" }} />
              Late
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", font: "400 10px var(--sans)", color: "var(--tx3)" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--red)", opacity: ".6" }} />
              Missed
            </div>
          </div>
        </div>
      </div>

      {/* ENGAGEMENT TIMELINE */}
      <div className="sec a3">Engagement History</div>
      <div className="card a3">
        <div className="card-hd">
          <h4>Correspondence &amp; Actions</h4>
          <span className="card-link">New engagement →</span>
        </div>
        {data.timeline.slice(0, 10).map((item) => (
          <div key={item.id} className="row row-4">
            <div>
              <div className="row-name">{item.title}</div>
              <div className="row-sub">{item.description}</div>
            </div>
            <span className={`row-tag ${getTimelineStatusTag(item.type, item.status)}`}>
              {item.type === "payment" ? "PAID" : item.type === "covenant_check" ? "AUTO" : item.status.toUpperCase()}
            </span>
            <span className="row-mono">
              {new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
            <span className="row-go">→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
