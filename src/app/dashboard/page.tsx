"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

// ── Types ─────────────────────────────────────────────────────────────────
interface Portfolio {
  totalValue: number;
  rentRoll: number;
  noi: number;
  occupancy: number;
  sqft: number;
  assetCount: number;
  voidCount: number;
  unactionedOpps: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1000)}k`;
  return `$${v.toLocaleString()}`;
}

// ── Main Component ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // TODO: Replace with real API calls
        setPortfolio({
          totalValue: 34900000,
          rentRoll: 3400000,
          noi: 2300000,
          occupancy: 91,
          sqft: 135400,
          assetCount: 8,
          voidCount: 1,
          unactionedOpps: 921000,
        });
        setLoading(false);
      } catch (error) {
        console.error("Dashboard data fetch failed:", error);
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
      {/* Main container with proper background */}
      <div style={{ background: "#F3F4F6", minHeight: "100vh" }}>
        {/* Topbar */}
        <div style={{ height: "52px", background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 18px", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Value Dashboard</div>
          <span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "2px" }}>Florida Commercial · 8 Assets · AI monitoring live</span>
          <div style={{ flex: 1 }} />
          <Link href="/assets">
            <button style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "5px 12px", fontSize: "12px", fontWeight: 500, color: "#4B5563", cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>
              Export
            </button>
          </Link>
          <Link href="/properties/add">
            <button style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "5px 12px", fontSize: "12px", fontWeight: 500, color: "#4B5563", cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>
              + Add Property
            </button>
          </Link>
          <Link href="/audit">
            <button style={{ background: "#0A8A4C", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>
              Run Full Analysis
            </button>
          </Link>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", height: "calc(100vh - 52px)" }}>
          {/* Alert bar */}
          <div style={{ background: "#FEF6E8", borderBottom: "1px solid rgba(245,169,74,0.2)", padding: "8px 18px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#92580A" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3.5M7 10v.5"/></svg>
            <strong style={{ color: "#92580A", fontWeight: 700 }}>2 leases expire in 90 days:</strong>
            <span style={{ color: "#4B5563" }}>Coastal Pharmacy and Broward Medical — review letters ready.</span>
            <Link href="/rent-clock" style={{ marginLeft: "auto", color: "#0A8A4C", fontWeight: 600, textDecoration: "none", fontSize: "11.5px" }}>Review now →</Link>
          </div>

          {/* Hero */}
          <div style={{ background: "#173404", padding: "18px 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: "5px" }}>
                Friday, March 20, 2026 · Good morning
              </div>
              <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", color: "#fff", lineHeight: 1.25, marginBottom: "3px" }}>
                Welcome back, Michael — here's your portfolio
              </div>
              <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.4)" }}>
                8 commercial assets across Florida · AI monitoring active · Last refreshed 4 minutes ago
              </div>
            </div>
          </div>

          {/* 8-KPI Strip (FLEX layout) */}
          <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #E5E7EB", overflow: "hidden" }}>
            {[
              { label: "Portfolio Value", value: fmt(portfolio.totalValue), meta: `${portfolio.assetCount} assets` },
              { label: "Rent Roll", value: `${fmt(portfolio.rentRoll)}/yr`, meta: `${fmt(portfolio.rentRoll / 12)}/mo` },
              { label: "NOI", value: fmt(portfolio.noi), meta: "67% margin" },
              { label: "Occupancy", value: `${portfolio.occupancy}%`, meta: `${portfolio.voidCount} void suite` },
              { label: "Square Footage", value: `${Math.round(portfolio.sqft / 1000)}k`, meta: "across 8 assets" },
              { label: "Cap Rate", value: "6.6%", meta: "mkt 6.5% ↑" },
              { label: "Saved YTD", value: "$249k", meta: "actioned" },
              { label: "Unactioned", value: fmt(portfolio.unactionedOpps), meta: `+${fmt(portfolio.unactionedOpps * 15.2)} value`, highlight: true },
            ].map((kpi, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "11px 12px",
                  borderRight: i < 7 ? "1px solid #F3F4F6" : "none",
                  background: kpi.highlight ? "#FEF6E8" : "#fff",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.055em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {kpi.label}
                </div>
                <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: "17px", color: kpi.highlight ? "#92580A" : "#111827", lineHeight: 1, marginBottom: "3px", letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: "9.5px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{kpi.meta}</div>
              </div>
            ))}
          </div>

          {/* Content padding wrapper */}
          <div style={{ padding: "14px 18px" }}>
            {/* Opportunities section */}
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>Opportunities · ranked by value</div>
                  <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "1px" }}>
                    {fmt(portfolio.unactionedOpps)}/yr unactioned · +{fmt(portfolio.unactionedOpps * 15.2)} implied value
                  </div>
                </div>
                <Link href="/audit" style={{ fontSize: "11px", color: "#0A8A4C", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Action all →</Link>
              </div>

              {/* Opportunity rows */}
              {[
                { name: "Rent uplift", desc: "5 leases below ERV", value: 485000, pct: 53, route: "/rent-clock" },
                { name: "Ancillary income", desc: "solar, EV, 5G", value: 187000, pct: 20, route: "/income" },
                { name: "Energy optimisation", desc: "4 assets above benchmark", value: 156000, pct: 17, route: "/energy" },
                { name: "Insurance retender", desc: "5 policies above market range", value: 93000, pct: 10, route: "/insurance" },
              ].map((opp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: i > 0 ? "8px" : 0, borderTop: i > 0 ? "1px solid #F9FAFB" : "none" }}>
                  <div style={{ flex: 1, fontSize: "11.5px", fontWeight: 500, color: "#111827" }}>
                    {opp.name} · <span style={{ color: "#9CA3AF" }}>{opp.desc}</span>
                  </div>
                  <div style={{ width: "100px", background: "#F3F4F6", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                    <div style={{ background: "#92580A", height: "100%", width: `${opp.pct}%` }} />
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-dm-serif)", color: "#92580A", minWidth: "56px", textAlign: "right" }}>{fmt(opp.value)}/yr</div>
                  <Link href={opp.route}>
                    <button style={{ padding: "4px 10px", background: "#FEF6E8", color: "#92580A", border: "1px solid rgba(245,169,74,0.2)", borderRadius: "6px", fontSize: "10.5px", fontWeight: 600, cursor: "pointer" }}>
                      Fix this →
                    </button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Properties section */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827" }}>Where your money is</div>
                <Link href="/assets" style={{ fontSize: "11px", color: "#0A8A4C", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                {[
                  { name: "Coral Gables Medical", value: 8900000, address: "Coral Gables, FL", type: "Medical", id: "fl-001" },
                  { name: "Brickell Office Tower", value: 14200000, address: "Brickell, Miami, FL", type: "Office", id: "fl-002" },
                  { name: "Tampa Logistics Hub", value: 6700000, address: "Tampa, FL", type: "Industrial", id: "fl-003" },
                ].map((prop) => (
                  <Link key={prop.id} href={`/assets/${prop.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "13px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "none"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{prop.name}</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-dm-serif)", color: "#111827", whiteSpace: "nowrap", marginLeft: "8px" }}>{fmt(prop.value)}</div>
                      </div>
                      <div style={{ fontSize: "10px", color: "#9CA3AF", marginBottom: "8px" }}>{prop.address}</div>
                      <div style={{ fontSize: "8.5px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#E8F5EE", color: "#0A8A4C", display: "inline-block" }}>{prop.type}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Lease expiry */}
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "3px" }}>
                Act now — 2 leases expire in 90 days
              </div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", marginBottom: "10px" }}>Miss a window, lose leverage for 5 years</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { tenant: "Coastal Pharmacy", days: 90, rent: 149000, status: "urgent", route: "/tenants" },
                  { tenant: "Broward Medical", days: 120, rent: 147000, status: "urgent", route: "/tenants" },
                  { tenant: "SunState Accountants", days: 284, rent: 240000, status: "warning", route: "/rent-clock" },
                  { tenant: "HR Dynamics", days: 284, rent: 147000, status: "warning", route: "/rent-clock" },
                ].map((lease, i) => (
                  <div key={i} style={{ background: lease.status === "urgent" ? "#FDECEA" : "#F9FAFB", border: "1px solid " + (lease.status === "urgent" ? "#D93025" : "#E5E7EB"), borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10.5px", fontWeight: 600, color: "#111827", marginBottom: "2px" }}>{lease.tenant}</div>
                    <div style={{ fontSize: "9px", color: "#9CA3AF", marginBottom: "5px" }}>{fmt(lease.rent)}/yr · {lease.days}d</div>
                    <Link href={lease.route} style={{ fontSize: "10px", fontWeight: 600, color: lease.status === "urgent" ? "#0A8A4C" : "#4B5563", textDecoration: "none" }}>
                      {lease.status === "urgent" ? "Letter ready →" : "Review Q4 →"}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Market benchmarks */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: "12px" }}>
              {[
                { label: "Cap rate", value: "6.6%", market: "mkt 6.5% ↑", status: "good" },
                { label: "NOI margin", value: "67%", market: "mkt 58% ↑", status: "good" },
                { label: "Occupancy", value: "91%", market: "mkt 94% ↓", status: "warning" },
                { label: "Rent/sqft", value: "$25.12", market: "mkt $14.50 ↑", status: "good" },
                { label: "OpEx/sqft", value: "$8.18", market: "mkt $4.29 ↓", status: "bad" },
                { label: "Ins/sqft", value: "$2.43", market: "mkt $1.11 ↓", status: "bad" },
              ].map((bench, i) => (
                <div key={i} style={{ padding: "11px 12px", borderRight: i < 5 ? "1px solid #F3F4F6" : "none", textAlign: "center" }}>
                  <div style={{ fontSize: "9px", color: "#9CA3AF", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{bench.label}</div>
                  <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: "15px", color: "#111827", marginBottom: "2px", letterSpacing: "-0.3px" }}>{bench.value}</div>
                  <div style={{ fontSize: "9px", color: bench.status === "good" ? "#0A8A4C" : bench.status === "warning" ? "#92580A" : "#D93025" }}>{bench.market}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
