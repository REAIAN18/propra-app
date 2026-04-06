"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetRow {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  pct: number;
}

interface MonthRow {
  label: string;
  grossRevenue: number;
  operatingCosts: number;
  noi: number;
  hasRealData: boolean;
}

interface TenantPayment {
  id: string;
  tenant: string;
  location: string;
  annualRent: number;
  currency: string;
  sym: string;
  paymentStatus: "paid" | "late" | "overdue" | "vacant";
}

interface WorkOrder {
  id: string;
  jobType: string;
  description: string;
  timing: string;
  budgetEstimate: number;
  capRateValueAdd: number;
  currency: string;
  status: string;
}

interface LoanSummary {
  assetName: string;
  estimatedValue: number;
  loanCapacity: number;
  estimatedRate: number;
  annualDebtService: number;
  ltv: number;
  currency: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number, sym = "$"): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function pctColor(pct: number): string {
  if (pct <= 0) return "var(--grn)";
  if (pct <= 10) return "var(--amb)";
  return "var(--red)";
}

function pctLabel(row: BudgetRow): string {
  if (row.category === "Gross Revenue") {
    return row.pct === 0 ? "On target ✓" : row.pct > 0 ? `+${row.pct}% ahead ✓` : `${row.pct}% short`;
  }
  if (row.pct < 0) return `${row.pct}% under ✓`;
  if (row.pct === 0) return "On target ✓";
  return `+${row.pct}% over${row.pct >= 15 ? " ⚠" : ""}`;
}

function varBarColor(row: BudgetRow): string {
  if (row.category === "Gross Revenue") return row.pct >= 0 ? "var(--grn)" : "var(--red)";
  return row.pct <= 0 ? "var(--grn)" : "var(--red)";
}

function barWidth(pct: number): string {
  const w = Math.min(Math.abs(pct) + 100, 130);
  return `${w}%`;
}

// ─── Budget Form ──────────────────────────────────────────────────────────────

interface BudgetFormProps {
  year: number;
  onSaved: () => void;
  onCancel: () => void;
}

function BudgetForm({ year, onSaved, onCancel }: BudgetFormProps) {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    budgetedRevenue: "",
    budgetedInsurance: "",
    budgetedEnergy: "",
    budgetedMaintenance: "",
    budgetedManagement: "",
  });

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/user/financial-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          budgetedRevenue:     parseFloat(fields.budgetedRevenue)     || 0,
          budgetedInsurance:   parseFloat(fields.budgetedInsurance)   || 0,
          budgetedEnergy:      parseFloat(fields.budgetedEnergy)      || 0,
          budgetedMaintenance: parseFloat(fields.budgetedMaintenance) || 0,
          budgetedManagement:  parseFloat(fields.budgetedManagement)  || 0,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--s2)",
    border: "1px solid var(--bdr)",
    borderRadius: 6,
    padding: "8px 10px",
    color: "var(--tx)",
    font: "400 12px var(--mono)",
    outline: "none",
  };

  const rows: { label: string; key: keyof typeof fields; placeholder: string }[] = [
    { label: "Gross Revenue", key: "budgetedRevenue", placeholder: "e.g. 462000" },
    { label: "Insurance", key: "budgetedInsurance", placeholder: "e.g. 38000" },
    { label: "Energy", key: "budgetedEnergy", placeholder: "e.g. 52000" },
    { label: "Maintenance", key: "budgetedMaintenance", placeholder: "e.g. 32000" },
    { label: "Management", key: "budgetedManagement", placeholder: "e.g. 26000" },
  ];

  return (
    <form onSubmit={submit} style={{ padding: 18 }}>
      <div style={{ font: "500 11px var(--mono)", color: "var(--tx3)", marginBottom: 14 }}>
        Annual budget for {year} — all figures in full (e.g. 462000)
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
            <label style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{r.label}</label>
            <input
              type="number"
              placeholder={r.placeholder}
              value={fields[r.key]}
              onChange={set(r.key)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{ padding: "8px 16px", background: "var(--acc)", color: "#fff", border: "none", borderRadius: 6, font: "500 12px var(--sans)", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save budget"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "8px 16px", background: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", borderRadius: 6, font: "500 12px var(--sans)", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialsPage() {
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [hasBudget, setHasBudget] = useState(false);
  const [budgetYear] = useState(new Date().getFullYear());
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [tenantPayments, setTenantPayments] = useState<TenantPayment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  function loadBudget() {
    return fetch(`/api/user/financial-budget?year=${budgetYear}`)
      .then((r) => r.json())
      .then((d) => {
        setBudgets(d.budgets ?? []);
        setHasBudget(d.hasBudget ?? false);
      })
      .catch(() => {});
  }

  useEffect(() => {
    Promise.all([
      loadBudget(),
      fetch("/api/user/monthly-financial?months=12").then((r) => r.json()),
      fetch("/api/user/tenants").then((r) => r.json()),
      fetch("/api/user/work-orders").then((r) => r.json()),
      fetch("/api/user/financing-summary").then((r) => r.json()),
    ])
      .then(([, monthData, tenantData, woData, loanData]) => {
        setMonths(monthData.months ?? []);

        const payments: TenantPayment[] = (tenantData.tenants ?? []).map(
          (t: {
            id: string;
            tenant: string;
            location: string;
            annualRent: number;
            currency: string;
            sym: string;
            paymentHistory?: { period: string; status: string }[];
            leaseStatus?: string;
          }) => {
            const latest = t.paymentHistory?.[0];
            let status: TenantPayment["paymentStatus"] = "paid";
            if (!t.leaseStatus || t.leaseStatus === "vacant") status = "vacant";
            else if (latest?.status === "late") status = "late";
            else if (latest?.status === "overdue") status = "overdue";
            else if (latest?.status === "paid") status = "paid";
            return {
              id: t.id,
              tenant: t.tenant,
              location: t.location,
              annualRent: t.annualRent,
              currency: t.currency,
              sym: t.sym ?? "$",
              paymentStatus: status,
            };
          }
        );
        setTenantPayments(payments);
        setWorkOrders(woData.orders ?? []);
        setLoans(loanData.loans ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived KPIs ────────────────────────────────────────────────────────────
  const recentMonths = months.slice(-12);
  const latestMonth = recentMonths[recentMonths.length - 1];
  const annualRevenue = recentMonths.reduce((s, m) => s + m.grossRevenue, 0);
  const annualOpEx = recentMonths.reduce((s, m) => s + m.operatingCosts, 0);
  const annualNOI = annualRevenue - annualOpEx;
  const noiMargin = annualRevenue > 0 ? Math.round((annualNOI / annualRevenue) * 100) : 0;
  const paidCount = tenantPayments.filter((t) => t.paymentStatus === "paid").length;
  const totalActive = tenantPayments.filter((t) => t.paymentStatus !== "vacant").length;
  const collectionRate = totalActive > 0 ? Math.round((paidCount / totalActive) * 100) : 0;
  const lateCount = tenantPayments.filter((t) => t.paymentStatus === "late" || t.paymentStatus === "overdue").length;
  const primaryLoan = loans[0];
  const totalDebt = loans.reduce((s, l) => s + l.loanCapacity, 0);
  const totalValue = loans.reduce((s, l) => s + l.estimatedValue, 0);
  const avgLTV = totalValue > 0 ? Math.round((totalDebt / totalValue) * 100) : 0;
  const totalDebtService = loans.reduce((s, l) => s + l.annualDebtService, 0);
  const dscr = totalDebtService > 0 ? (annualNOI / totalDebtService).toFixed(2) : "—";

  // NOI waterfall — prefer budget actuals, fall back to monthly aggregate
  const revRow = budgets.find((b) => b.category === "Gross Revenue");
  const insRow = budgets.find((b) => b.category === "Insurance");
  const engRow = budgets.find((b) => b.category === "Energy");
  const mntRow = budgets.find((b) => b.category === "Maintenance");

  const wfRevenue = revRow?.actual ?? annualRevenue / 4;
  const wfIns = insRow?.actual ?? 0;
  const wfEng = engRow?.actual ?? 0;
  const wfMnt = mntRow?.actual ?? 0;
  const wfNOI = wfRevenue - wfIns - wfEng - wfMnt;
  const wfMax = Math.max(wfRevenue, 1);
  const wfH = (v: number) => Math.max(Math.round((v / wfMax) * 160), 4);

  // Cash flow: last 4 months of actuals
  const cashRows = recentMonths.slice(-4).map((m) => ({
    label: m.label,
    revenue: m.grossRevenue,
    opex: m.operatingCosts,
    noi: m.noi,
    debt: totalDebtService / 12,
    net: m.noi - totalDebtService / 12,
    isProjected: !m.hasRealData,
  }));

  const sym = latestMonth ? "$" : "$";

  // Budget rows to display (skip Total OpEx — derived from others)
  const displayBudgets = budgets.filter((b) => b.category !== "Total OpEx");

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <TopBar title="Financials" />
          <div style={{ padding: "40px 32px", color: "var(--tx3)", fontFamily: "var(--sans)", fontSize: 13 }}>
            Loading…
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <TopBar title="Financials" />

        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px 80px", maxWidth: 1080 }}>

          {/* ── KPIs ─────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
            <KPI label="Gross Revenue" value={fmt(annualRevenue, sym)} note="/yr" />
            <KPI label="OpEx" value={fmt(annualOpEx, sym)} note="/yr" />
            <KPI label="NOI" value={fmt(annualNOI, sym)} note="/yr" valueColor="var(--grn)" subNote={`${noiMargin}% margin`} />
            <KPI
              label="Collection Rate"
              value={`${collectionRate}%`}
              subNote={lateCount > 0 ? `${lateCount} tenant${lateCount > 1 ? "s" : ""} late` : "All current"}
              subNoteColor={lateCount > 0 ? "var(--amb)" : "var(--grn)"}
            />
            <KPI
              label="LTV"
              value={`${avgLTV}%`}
              subNote={avgLTV > 65 ? "above 65% target" : "within target"}
              subNoteColor={avgLTV > 65 ? "var(--amb)" : "var(--grn)"}
            />
            <KPI
              label="DSCR"
              value={typeof dscr === "string" ? dscr : `${dscr}×`}
              subNote={parseFloat(String(dscr)) >= 1.25 ? "above 1.25× covenant" : "below covenant"}
              subNoteColor={parseFloat(String(dscr)) >= 1.25 ? "var(--grn)" : "var(--red)"}
            />
          </div>

          {/* ── NOI Waterfall ─────────────────────────────────────────── */}
          <Card title="NOI Bridge — Trailing 12 Months" action="Download P&L →">
            {wfRevenue > 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 200, padding: "0 18px 18px" }}>
                <WFCol label="Gross Revenue" value={fmt(wfRevenue, sym)} height={wfH(wfRevenue)} color="var(--grn)" />
                {wfIns > 0 && <WFCol label="Insurance" value={`−${fmt(wfIns, sym)}`} height={wfH(wfIns)} color="var(--red)" />}
                {wfEng > 0 && <WFCol label="Energy" value={`−${fmt(wfEng, sym)}`} height={wfH(wfEng)} color="var(--red)" />}
                {wfMnt > 0 && <WFCol label="Maintenance" value={`−${fmt(wfMnt, sym)}`} height={wfH(wfMnt)} color="var(--red)" />}
                <WFCol label="NOI" value={fmt(wfNOI, sym)} height={wfH(wfNOI)} color="var(--acc)" />
              </div>
            ) : (
              <EmptyState message="Upload financial statements to see NOI breakdown." />
            )}
          </Card>

          {/* ── Budget vs Actual ──────────────────────────────────────── */}
          <SectionLabel>Budget vs Actual — {budgetYear}</SectionLabel>
          <Card
            title="Year-to-Date Variance"
            action={showBudgetForm ? undefined : hasBudget ? "Edit budget →" : "Set budget →"}
            onAction={() => setShowBudgetForm(true)}
          >
            {showBudgetForm ? (
              <BudgetForm
                year={budgetYear}
                onSaved={() => { setShowBudgetForm(false); loadBudget(); }}
                onCancel={() => setShowBudgetForm(false)}
              />
            ) : displayBudgets.length > 0 ? (
              <div style={{ padding: 18 }}>
                {displayBudgets.map((row) => (
                  <div key={row.category} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{row.category}</span>
                      <span style={{ font: "500 11px var(--mono)", color: "var(--tx)" }}>
                        {fmt(row.actual, sym)} / {fmt(row.budgeted, sym)} budget
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "var(--s3)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: varBarColor(row), width: barWidth(row.pct), transition: "width .3s" }} />
                      </div>
                      <span style={{ font: "500 10px var(--mono)", minWidth: 80, textAlign: "right", color: pctColor(row.category === "Gross Revenue" ? -row.pct : row.pct) }}>
                        {pctLabel(row)}
                      </span>
                    </div>
                  </div>
                ))}

                {revRow && (
                  <div style={{ padding: "12px 16px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>NOI — YTD</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--grn)" }}>
                      {fmt(revRow.actual - (insRow?.actual ?? 0) - (engRow?.actual ?? 0) - (mntRow?.actual ?? 0), sym)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message="No budget set. Use 'Set budget →' to track variance against your actuals." />
            )}
          </Card>

          {/* ── Rent Collection ───────────────────────────────────────── */}
          <SectionLabel>Rent Collection</SectionLabel>
          <Card
            title="Collection Status"
            action={totalActive > 0 ? `${collectionRate}% collected${lateCount > 0 ? ` · ${lateCount} outstanding` : ""}` : undefined}
            actionMuted
          >
            {tenantPayments.length > 0 ? (
              tenantPayments.map((t) => (
                <CollectionRow key={t.id} tenant={t} sym={sym} />
              ))
            ) : (
              <EmptyState message="No lease data. Upload a rent roll or lease agreements to populate this section." />
            )}
          </Card>

          {/* ── Cash Flow ─────────────────────────────────────────────── */}
          <SectionLabel>Cash Flow — Recent Months</SectionLabel>
          <Card title="Monthly Cash Flow" action="View all →">
            {cashRows.length > 0 ? (
              <div style={{ padding: 18, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", font: "400 11px var(--sans)", minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                      {["Month", "Revenue", "OpEx", "NOI", "Debt Service", "Net Cash"].map((h) => (
                        <th key={h} style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", textAlign: h === "Month" ? "left" : "right" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cashRows.map((r) => {
                      const netNeg = r.net < 0;
                      return (
                        <tr key={r.label} style={{ borderBottom: "1px solid var(--bdr-lt)", background: netNeg ? "var(--red-lt)" : "transparent" }}>
                          <td style={{ padding: "6px 8px", color: netNeg ? "var(--amb)" : "var(--tx)" }}>
                            {r.label}{netNeg ? " ⚠" : ""}
                            {r.isProjected && <span style={{ font: "400 9px var(--mono)", color: "var(--tx3)", marginLeft: 4 }}>est</span>}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--grn)" }}>{fmt(r.revenue, sym)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--red)" }}>{fmt(r.opex, sym)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--tx)" }}>{fmt(r.noi, sym)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--tx3)" }}>{r.debt > 0 ? fmt(r.debt, sym) : "—"}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: netNeg ? "var(--red)" : "var(--grn)" }}>
                            {netNeg ? "−" : ""}{fmt(Math.abs(r.net), sym)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No financial data available yet." />
            )}
          </Card>

          {/* ── Capex Plan ───────────────────────────────────────────── */}
          <SectionLabel>Capex Plan</SectionLabel>
          <Card title="Scheduled Capital Works" action="Create work order →">
            {workOrders.length > 0 ? (
              workOrders.map((wo) => (
                <div
                  key={wo.id}
                  style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid var(--bdr-lt)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx)" }}>{wo.jobType}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>{wo.description}</div>
                  </div>
                  <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: 5, background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)", whiteSpace: "nowrap" }}>
                    {wo.timing ?? "TBD"}
                  </span>
                  <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>
                    {fmt(wo.budgetEstimate ?? 0, sym)}
                  </span>
                  {wo.capRateValueAdd > 0 && (
                    <span style={{ font: "400 10px var(--sans)", color: "var(--grn)" }}>+{fmt(wo.capRateValueAdd, sym)} value</span>
                  )}
                  <span style={{ color: "var(--tx3)", fontSize: 12 }}>→</span>
                </div>
              ))
            ) : (
              <EmptyState message="No capital works scheduled." />
            )}
          </Card>

          {/* ── Debt & Financing ─────────────────────────────────────── */}
          <SectionLabel>Debt &amp; Financing</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Current Debt</span>
              </div>
              {primaryLoan ? (
                <>
                  <DebtRow label="Portfolio" value={primaryLoan.assetName} />
                  <DebtRow label="Indicative balance" value={fmt(primaryLoan.loanCapacity, primaryLoan.currency === "GBP" ? "£" : "$")} />
                  <DebtRow label="Indicative rate" value={`${primaryLoan.estimatedRate}% p.a.`} />
                  <DebtRow label="LTV" value={`${primaryLoan.ltv}%`} valueColor={primaryLoan.ltv > 65 ? "var(--amb)" : "var(--grn)"} />
                  <DebtRow label="Annual debt service" value={fmt(primaryLoan.annualDebtService, primaryLoan.currency === "GBP" ? "£" : "$")} />
                </>
              ) : (
                <div style={{ padding: "14px 18px", color: "var(--tx3)", fontSize: 12 }}>No debt data available.</div>
              )}
            </div>

            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
                <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Portfolio Summary</span>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  <MiniStat label="Total Asset Value" value={fmt(totalValue, sym)} />
                  <MiniStat label="Total Debt Capacity" value={fmt(totalDebt, sym)} />
                  <MiniStat label="Blended LTV" value={`${avgLTV}%`} />
                  <MiniStat label="Annual NOI" value={fmt(annualNOI, sym)} color="var(--grn)" />
                </div>
                {parseFloat(String(dscr)) > 0 && (
                  <div style={{ padding: "10px 14px", background: parseFloat(String(dscr)) >= 1.25 ? "var(--grn-lt)" : "var(--red-lt)", border: `1px solid ${parseFloat(String(dscr)) >= 1.25 ? "var(--grn-bdr)" : "var(--red-bdr)"}`, borderRadius: 8, font: "400 12px/1.5 var(--sans)", color: parseFloat(String(dscr)) >= 1.25 ? "var(--grn)" : "var(--red)" }}>
                    <strong>DSCR {dscr}×</strong> — {parseFloat(String(dscr)) >= 1.25 ? "Above 1.25× covenant. Debt service well covered." : "Below 1.25× covenant. Review debt structure."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Reports hint ─────────────────────────────────────────── */}
          <div style={{ padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 10, font: "300 12px/1.5 var(--sans)", color: "var(--tx3)" }}>
            Generate financial reports:{" "}
            <span style={{ color: "var(--acc)", fontWeight: 500, cursor: "pointer" }}>Management accounts →</span>
            {" · "}
            <span style={{ color: "var(--acc)", fontWeight: 500, cursor: "pointer" }}>Lender pack →</span>
            {" · "}
            <span style={{ color: "var(--acc)", fontWeight: 500, cursor: "pointer" }}>Investor report →</span>
            {" "}All auto-populated from your data. Share via portal link.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPI({ label, value, note, valueColor, subNote, subNoteColor }: {
  label: string; value: string; note?: string;
  valueColor?: string; subNote?: string; subNoteColor?: string;
}) {
  return (
    <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: valueColor ?? "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>
        {value}
        {note && <span style={{ fontFamily: "var(--sans)", fontSize: 10, color: "var(--tx3)" }}>{note}</span>}
      </div>
      {subNote && <div style={{ font: "400 10px var(--sans)", color: subNoteColor ?? "var(--tx3)", marginTop: 3 }}>{subNote}</div>}
    </div>
  );
}

function Card({ title, action, actionMuted, onAction, children }: {
  title: string; action?: string; actionMuted?: boolean;
  onAction?: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>{title}</span>
        {action && (
          <span
            onClick={onAction}
            style={{ font: "500 11px var(--sans)", color: actionMuted ? "var(--tx3)" : "var(--acc)", cursor: onAction ? "pointer" : "default" }}
          >
            {action}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12, paddingTop: 4 }}>
      {children}
    </div>
  );
}

function WFCol({ label, value, height, color }: { label: string; value: string; height: number; color: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: "100%", borderRadius: "4px 4px 0 0", height, background: color, opacity: 0.8, minHeight: 4 }} />
      <div style={{ font: "500 10px var(--mono)", color: "var(--tx)" }}>{value}</div>
      <div style={{ font: "400 8px var(--mono)", color: "var(--tx3)", textAlign: "center", whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

function CollectionRow({ tenant, sym }: { tenant: TenantPayment; sym: string }) {
  const dotColor: Record<TenantPayment["paymentStatus"], string> = {
    paid: "var(--grn)", late: "var(--amb)", overdue: "var(--red)", vacant: "var(--tx3)",
  };
  const tagStyle: Record<TenantPayment["paymentStatus"], { bg: string; color: string; border: string; label: string }> = {
    paid:    { bg: "var(--grn-lt)", color: "var(--grn)", border: "var(--grn-bdr)", label: "PAID" },
    late:    { bg: "var(--amb-lt)", color: "var(--amb)", border: "var(--amb-bdr)", label: "LATE" },
    overdue: { bg: "var(--red-lt)", color: "var(--red)", border: "var(--red-bdr)", label: "OVERDUE" },
    vacant:  { bg: "var(--s3)",     color: "var(--tx3)", border: "var(--bdr)",     label: "VACANT" },
  };
  const tag = tagStyle[tenant.paymentStatus];
  const monthly = Math.round(tenant.annualRent / 12);
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid var(--bdr-lt)", cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor[tenant.paymentStatus], flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx)" }}>{tenant.tenant}</div>
          <div style={{ fontSize: 11, color: "var(--tx3)" }}>{tenant.location} · {fmt(monthly, sym)}/mo</div>
        </div>
      </div>
      <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: 5, background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`, whiteSpace: "nowrap" }}>
        {tag.label}
      </span>
      <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>{fmt(tenant.annualRent, sym)}</span>
      <span style={{ fontSize: 11, color: "var(--tx3)" }}>/yr</span>
      <span style={{ color: "var(--tx3)", fontSize: 12 }}>→</span>
    </div>
  );
}

function DebtRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--tx)" }}>{label}</span>
      <span style={{ font: "500 12px var(--mono)", color: valueColor ?? "var(--tx)" }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "var(--s2)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: color ?? "var(--tx)" }}>{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "24px 18px", color: "var(--tx3)", font: "400 12px var(--sans)", textAlign: "center" }}>
      {message}
    </div>
  );
}
