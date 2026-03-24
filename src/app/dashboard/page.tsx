"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1000)}k`;
  return `$${v.toLocaleString()}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortfolioData {
  totalValue: number;
  assetCount: number;
  monthlyRent: number;
  annualRent: number;
  noi: number;
  noiMargin: number;
  occupancy: number;
  voidCount: number;
  savedYTD: number;
  unactionedOpportunities: number;
  impliedValue: number;
}

interface Opportunity {
  name: string;
  description: string;
  value: number;
  percentage: number;
  route: string;
}

interface LeaseExpiry {
  tenantName: string;
  property: string;
  annualRent: number;
  daysRemaining: number;
  status: "urgent" | "warning" | "normal";
  cta: string;
  route: string;
}

interface Benchmark {
  label: string;
  value: string;
  market: string;
  status: "good" | "warning" | "bad";
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leases, setLeases] = useState<LeaseExpiry[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  useEffect(() => {
    // Fetch dashboard data
    async function fetchData() {
      try {
        // For now, use hardcoded data matching the reference HTML
        // TODO: Replace with real API calls once endpoints are ready
        setPortfolio({
          totalValue: 34900000,
          assetCount: 5,
          monthlyRent: 283000,
          annualRent: 3400000,
          noi: 2300000,
          noiMargin: 67,
          occupancy: 91,
          voidCount: 1,
          savedYTD: 249000,
          unactionedOpportunities: 921000,
          impliedValue: 14000000,
        });

        setOpportunities([
          { name: "Rent uplift", description: "5 leases below ERV", value: 485000, percentage: 53, route: "/rent-clock" },
          { name: "Ancillary income", description: "solar, EV, 5G", value: 187000, percentage: 20, route: "/income" },
          { name: "Energy optimisation", description: "4 assets above benchmark", value: 156000, percentage: 17, route: "/energy" },
          { name: "Insurance retender", description: "5 policies above market range", value: 93000, percentage: 10, route: "/insurance" },
        ]);

        setLeases([
          { tenantName: "Coastal Pharmacy", property: "Brickell", annualRent: 149000, daysRemaining: 90, status: "urgent", cta: "Letter ready →", route: "/tenants" },
          { tenantName: "Broward Medical", property: "Ft Lauderdale", annualRent: 147000, daysRemaining: 120, status: "urgent", cta: "Letter ready →", route: "/tenants" },
          { tenantName: "SunState Accountants", property: "Coral Gables", annualRent: 240000, daysRemaining: 284, status: "warning", cta: "Review Q4 →", route: "/rent-clock" },
          { tenantName: "HR Dynamics", property: "Orlando Business", annualRent: 147000, daysRemaining: 284, status: "warning", cta: "Review Q4 →", route: "/rent-clock" },
        ]);

        setBenchmarks([
          { label: "Cap rate", value: "6.6%", market: "mkt 6.5% ↑", status: "good" },
          { label: "NOI margin", value: "67%", market: "mkt 58% ↑", status: "good" },
          { label: "Occupancy", value: "91%", market: "mkt 94% ↓", status: "warning" },
          { label: "Rent/sqft", value: "$25.12", market: "mkt $14.50 ↑", status: "good" },
          { label: "OpEx/sqft", value: "$8.18", market: "mkt $4.29 ↓", status: "bad" },
          { label: "Ins/sqft", value: "$2.43", market: "mkt $1.11 ↓", status: "bad" },
        ]);

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: "24px", color: "#6b7280" }}>Loading dashboard...</div>
      </AppShell>
    );
  }

  if (!portfolio) {
    return (
      <AppShell>
        <div style={{ padding: "24px", color: "#6b7280" }}>No portfolio data available</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ background: "#f7f7f5", minHeight: "100vh", padding: "18px" }}>
        {/* MORNING BRIEFING HERO */}
        <div style={{ background: "#173404", padding: "22px 24px", marginBottom: "10px", borderRadius: "14px" }}>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })} · good morning · Miami-Dade, FL
          </div>
          <div style={{ fontSize: "20px", fontWeight: 500, color: "#fff", marginBottom: "8px", lineHeight: 1.3, maxWidth: "580px" }}>
            Two leases expire in 90 days. Insurance is above market range. ${Math.round(portfolio.unactionedOpportunities / 1000)}k sitting on the table.
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: "16px", lineHeight: 1.6 }}>
            Coastal Pharmacy and Broward Medical are both up in September — review letters ready. Insurance retender and energy together represent{" "}
            <span style={{ color: "#4ade80", fontWeight: 500 }}>~$1.4M of implied portfolio value</span> at your cap rate.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            <Link href="/rent-clock" style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: "10px", padding: "12px 14px", cursor: "pointer" }}>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px", color: "rgba(248,113,113,0.8)" }}>Urgent · 90 days</div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#fff", marginBottom: "2px" }}>Coastal Pharmacy renewal</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "5px" }}>Brickell · $149k/yr · Sep 2026</div>
                <div style={{ fontSize: "12px", color: "#f87171" }}>Letter ready →</div>
              </div>
            </Link>
            <Link href="/insurance" style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "10px", padding: "12px 14px", cursor: "pointer" }}>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px", color: "rgba(251,191,36,0.7)" }}>Act now · $93k/yr</div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#fff", marginBottom: "2px" }}>Insurance retender</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "5px" }}>5 policies · above market range</div>
                <div style={{ fontSize: "12px", color: "#fbbf24" }}>Start audit →</div>
              </div>
            </Link>
            <Link href="/energy" style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px 14px", cursor: "pointer" }}>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px", color: "rgba(74,222,128,0.6)" }}>Quick win · $156k/yr</div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#fff", marginBottom: "2px" }}>Energy optimisation</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "5px" }}>4 assets above benchmark</div>
                <div style={{ fontSize: "12px", color: "#4ade80" }}>View savings →</div>
              </div>
            </Link>
          </div>
        </div>

        {/* KPI STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", marginBottom: "10px" }}>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "11px", padding: "12px 13px" }}>
            <div style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Portfolio</div>
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#111827" }}>{fmt(portfolio.totalValue)}</div>
            <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "2px" }}>{portfolio.assetCount} assets</div>
          </div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "11px", padding: "12px 13px" }}>
            <div style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Rent/mo</div>
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#111827" }}>{fmt(portfolio.monthlyRent)}</div>
            <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "2px" }}>{fmt(portfolio.annualRent)}/yr</div>
          </div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "11px", padding: "12px 13px" }}>
            <div style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>NOI</div>
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#111827" }}>{fmt(portfolio.noi)}</div>
            <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "2px" }}>{portfolio.noiMargin}% margin</div>
          </div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "11px", padding: "12px 13px" }}>
            <div style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Occupancy</div>
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#111827" }}>{portfolio.occupancy}%</div>
            <div style={{ fontSize: "9px", color: "#dc2626", marginTop: "2px" }}>{portfolio.voidCount} void suite</div>
          </div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "11px", padding: "12px 13px" }}>
            <div style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Saved YTD</div>
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#059669" }}>{fmt(portfolio.savedYTD)}</div>
            <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "2px" }}>actioned</div>
          </div>
          <div style={{ background: "#f0fdf4", border: "0.5px solid #d1fae5", borderRadius: "11px", padding: "12px 13px" }}>
            <div style={{ fontSize: "9px", color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Unactioned</div>
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#065f46" }}>{fmt(portfolio.unactionedOpportunities)}</div>
            <div style={{ fontSize: "9px", color: "#059669", marginTop: "2px" }}>+{fmt(portfolio.impliedValue)} value</div>
          </div>
        </div>

        {/* OPPORTUNITIES */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", marginBottom: "12px" }}>
          <div style={{ padding: "13px 18px", borderBottom: "0.5px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "#111827", margin: 0 }}>Opportunities · ranked by value</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "#059669" }}>
                {fmt(portfolio.unactionedOpportunities)}/yr · +{fmt(portfolio.impliedValue)} value
              </span>
              <Link href="/audit">
                <button style={{ padding: "5px 12px", background: "#173404", color: "#fff", border: "none", borderRadius: "7px", fontSize: "11px", cursor: "pointer" }}>Action all →</button>
              </Link>
            </div>
          </div>
          {opportunities.map((opp, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 18px",
                borderBottom: index < opportunities.length - 1 ? "0.5px solid #f9fafb" : "none",
                gap: "12px",
              }}
            >
              <div style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "#111827" }}>
                {opp.name} · {opp.description}
              </div>
              <div style={{ width: "120px", background: "#f3f4f6", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                <div style={{ background: "#059669", height: "100%", width: `${opp.percentage}%` }}></div>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#059669", minWidth: "60px", textAlign: "right" }}>{fmt(opp.value)}/yr</div>
              <Link href={opp.route}>
                <button style={{ padding: "4px 10px", background: "#f0fdf4", color: "#065f46", border: "1px solid #d1fae5", borderRadius: "6px", fontSize: "10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  Action →
                </button>
              </Link>
            </div>
          ))}
        </div>

        {/* LEASE EXPIRY */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", marginBottom: "12px" }}>
          <div style={{ padding: "13px 18px", borderBottom: "0.5px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#111827", margin: 0 }}>Lease expiry · next 12 months</p>
              <small style={{ fontSize: "11px", color: "#6b7280" }}>Miss a window, lose leverage for 5 years</small>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {leases.map((lease, index) => (
              <div
                key={index}
                style={{
                  padding: "12px 16px",
                  borderRight: index < leases.length - 1 ? "0.5px solid #f3f4f6" : "none",
                  background: lease.status === "urgent" ? "#fffbfb" : "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 500 }}>{lease.tenantName}</span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: lease.status === "urgent" ? "#dc2626" : "#d97706",
                      background: lease.status === "urgent" ? "#fee2e2" : "#fef3c7",
                      padding: "2px 7px",
                      borderRadius: "10px",
                    }}
                  >
                    {lease.daysRemaining}d
                  </span>
                </div>
                <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "4px", margin: 0 }}>
                  {lease.property} · {fmt(lease.annualRent)}/yr
                </p>
                <Link href={lease.route} style={{ textDecoration: "none" }}>
                  <p style={{ fontSize: "11px", color: lease.status === "urgent" ? "#059669" : "#6b7280", margin: 0 }}>{lease.cta}</p>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* MARKET BENCHMARKS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", marginBottom: "12px" }}>
          {benchmarks.map((bench, index) => (
            <div key={index} style={{ padding: "11px 12px", borderRight: index < benchmarks.length - 1 ? "0.5px solid #f3f4f6" : "none", textAlign: "center" }}>
              <p style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{bench.label}</p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: bench.status === "good" ? "#059669" : bench.status === "warning" ? "#d97706" : "#dc2626",
                  margin: 0,
                }}
              >
                {bench.value}
              </p>
              <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "1px", margin: 0 }}>{bench.market}</p>
            </div>
          ))}
        </div>

        {/* PLACEHOLDER SECTIONS */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", padding: "18px", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "8px" }}>Current transactions</div>
          <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>No active deals tracked. Click "Track new deal" to add your first acquisition or disposition.</p>
        </div>

        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", padding: "18px", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "8px" }}>Current projects</div>
          <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>No capex or works projects tracked. Add a project to monitor budget and completion status.</p>
        </div>

        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", padding: "18px", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "8px" }}>Acquisitions pipeline</div>
          <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>No deals in pipeline. Visit Scout to find opportunities matching your criteria.</p>
        </div>

        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", padding: "18px", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "8px" }}>Financing & refinance</div>
          <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Upload loan documents to see refinancing opportunities and track your current LTV.</p>
        </div>
      </div>
    </AppShell>
  );
}
