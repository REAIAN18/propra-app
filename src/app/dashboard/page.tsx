"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import type { Portfolio as PortfolioType, Asset } from "@/lib/data/types";

// ── Types ─────────────────────────────────────────────────────────────────
interface PortfolioKPIs {
  totalValue: number;
  rentRoll: number;
  noi: number;
  occupancy: number;
  sqft: number;
  assetCount: number;
  voidCount: number;
  unactionedOpps: number;
  currency: "USD" | "GBP";
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(v: number, currency: "USD" | "GBP" = "USD") {
  const sym = currency === "USD" ? "$" : "£";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function computeKPIs(portfolio: PortfolioType): PortfolioKPIs {
  const totalValue = portfolio.assets.reduce((sum, a) => {
    const val = portfolio.currency === "USD" ? (a.valuationUSD ?? 0) : (a.valuationGBP ?? 0);
    return sum + val;
  }, 0);

  const rentRoll = portfolio.assets.reduce((sum, a) => sum + (a.grossIncome ?? 0), 0);
  const noi = portfolio.assets.reduce((sum, a) => sum + (a.netIncome ?? 0), 0);
  const sqft = portfolio.assets.reduce((sum, a) => sum + (a.sqft ?? 0), 0);

  // Weighted average occupancy
  const totalOccupiedSqft = portfolio.assets.reduce((sum, a) => sum + (a.sqft * a.occupancy / 100), 0);
  const occupancy = sqft > 0 ? Math.round((totalOccupiedSqft / sqft) * 100) : 0;

  const voidCount = portfolio.assets.filter(a => a.occupancy < 100).length;

  // Compute unactioned opportunities
  const insuranceSave = portfolio.assets.reduce((sum, a) => sum + Math.max(0, a.insurancePremium - a.marketInsurance), 0);
  const energySave = portfolio.assets.reduce((sum, a) => sum + Math.max(0, a.energyCost - a.marketEnergyCost), 0);
  const incomeOpps = portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.status === "identified").reduce((sum, o) => sum + o.annualIncome, 0);
  const unactionedOpps = insuranceSave + energySave + incomeOpps;

  return {
    totalValue,
    rentRoll,
    noi,
    occupancy,
    sqft,
    assetCount: portfolio.assets.length,
    voidCount,
    unactionedOpps,
    currency: portfolio.currency,
  };
}

interface Opportunity {
  name: string;
  desc: string;
  value: number;
  pct: number;
  route: string;
}

function computeOpportunities(portfolio: PortfolioType): Opportunity[] {
  const insuranceSave = portfolio.assets.reduce((sum, a) => sum + Math.max(0, a.insurancePremium - a.marketInsurance), 0);
  const energySave = portfolio.assets.reduce((sum, a) => sum + Math.max(0, a.energyCost - a.marketEnergyCost), 0);
  const incomeOpps = portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.status === "identified").reduce((sum, o) => sum + o.annualIncome, 0);

  const insuranceAssetCount = portfolio.assets.filter(a => a.insurancePremium > a.marketInsurance && (a.insurancePremium - a.marketInsurance) / a.insurancePremium > 0.05).length;
  const energyAssetCount = portfolio.assets.filter(a => a.energyCost > a.marketEnergyCost && (a.energyCost - a.marketEnergyCost) / a.energyCost > 0.05).length;
  const incomeOppCount = portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.status === "identified").length;

  const total = insuranceSave + energySave + incomeOpps;

  const opps: Opportunity[] = [];

  if (incomeOpps > 0) {
    opps.push({
      name: "Ancillary income",
      desc: incomeOppCount > 0 ? `${incomeOppCount} ${incomeOppCount === 1 ? "opportunity" : "opportunities"} identified` : "opportunities available",
      value: incomeOpps,
      pct: total > 0 ? Math.round((incomeOpps / total) * 100) : 0,
      route: "/income",
    });
  }

  if (energySave > 0) {
    opps.push({
      name: "Energy optimisation",
      desc: energyAssetCount > 0 ? `${energyAssetCount} ${energyAssetCount === 1 ? "asset" : "assets"} above benchmark` : "available",
      value: energySave,
      pct: total > 0 ? Math.round((energySave / total) * 100) : 0,
      route: "/energy",
    });
  }

  if (insuranceSave > 0) {
    opps.push({
      name: "Insurance audit",
      desc: insuranceAssetCount > 0 ? `${insuranceAssetCount} ${insuranceAssetCount === 1 ? "policy" : "policies"} above market` : "available",
      value: insuranceSave,
      pct: total > 0 ? Math.round((insuranceSave / total) * 100) : 0,
      route: "/insurance",
    });
  }

  return opps.sort((a, b) => b.value - a.value);
}

// ── Main Component ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioKPIs | null>(null);
  const [rawPortfolio, setRawPortfolio] = useState<PortfolioType | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/portfolios/user");
        if (!res.ok) throw new Error("Failed to fetch portfolio");
        const data: PortfolioType = await res.json();
        setRawPortfolio(data);
        setPortfolio(computeKPIs(data));
        setOpportunities(computeOpportunities(data));
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

  const region = portfolio.currency === "USD" ? "Florida Commercial" : "UK Commercial";

  return (
    <AppShell>
      {/* Main container with proper background */}
      <div style={{ background: "#f7f7f5", minHeight: "100vh" }}>
        {/* Alert bar */}
        {rawPortfolio && (() => {
          const allLeases = rawPortfolio.assets.flatMap(a => a.leases);
          const urgentLeases = allLeases.filter(l => l.daysToExpiry <= 90).sort((a, b) => a.daysToExpiry - b.daysToExpiry);

          if (urgentLeases.length === 0) return null;

          const firstTenant = urgentLeases[0]?.tenant;
          const secondTenant = urgentLeases[1]?.tenant;
          const tenantText = urgentLeases.length === 1
            ? firstTenant
            : urgentLeases.length === 2
            ? `${firstTenant} and ${secondTenant}`
            : `${firstTenant}, ${secondTenant}, and ${urgentLeases.length - 2} more`;

          return (
            <div style={{ background: "#FEF6E8", borderBottom: "1px solid rgba(245,169,74,0.2)", padding: "8px 18px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#92580A" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3.5M7 10v.5"/></svg>
              <strong style={{ color: "#92580A", fontWeight: 700 }}>{urgentLeases.length} {urgentLeases.length === 1 ? "lease expires" : "leases expire"} in 90 days:</strong>
              <span style={{ color: "#4B5563" }}>{tenantText} — review letters ready.</span>
              <Link href="/rent-clock" style={{ marginLeft: "auto", color: "var(--grn)", fontWeight: 600, textDecoration: "none", fontSize: "11.5px" }}>Review now →</Link>
            </div>
          );
        })()}

        {/* Hero */}
        <div className="animate-stagger-1" style={{ background: "#173404", padding: "22px 24px 20px", marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "6px" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · Good {new Date().getHours() < 12 ? "morning" : "afternoon"}
          </div>
          <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: "22px", color: "#fff", lineHeight: 1.25, marginBottom: "8px" }}>
            Welcome back — here's your portfolio
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.65, maxWidth: "540px" }}>
            {portfolio.assetCount} commercial {portfolio.assetCount === 1 ? "asset" : "assets"} across {region.split(" ")[0]} · AI monitoring active · Last refreshed just now
          </div>
        </div>

        {/* KPI Grid - 8 cards per v9 design */}
        <div className="animate-stagger-2" style={{ padding: "0 24px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              { label: "Portfolio Value", value: fmt(portfolio.totalValue, portfolio.currency), meta: `${portfolio.assetCount} ${portfolio.assetCount === 1 ? "asset" : "assets"}` },
              { label: "Gross Rent/Mo", value: fmt(portfolio.rentRoll / 12, portfolio.currency), meta: `${fmt(portfolio.rentRoll, portfolio.currency)}/yr` },
              { label: "Net Operating Inc.", value: fmt(portfolio.noi, portfolio.currency), meta: portfolio.rentRoll > 0 ? `${Math.round((portfolio.noi / portfolio.rentRoll) * 100)}% margin` : "" },
              { label: "Occupancy", value: `${portfolio.occupancy}%`, meta: portfolio.voidCount > 0 ? `${portfolio.voidCount} void ${portfolio.voidCount === 1 ? "suite" : "suites"}` : "fully let", subRed: portfolio.voidCount > 0 },
              { label: "Total sqft", value: `${Math.round(portfolio.sqft / 1000)}k`, meta: `${portfolio.assetCount} ${portfolio.assetCount === 1 ? "property" : "properties"}` },
              { label: "Avg NOI Yield", value: portfolio.noi > 0 && portfolio.totalValue > 0 ? `${((portfolio.noi / portfolio.totalValue) * 100).toFixed(1)}%` : "—", meta: "portfolio avg", subGreen: portfolio.noi > 0 && portfolio.totalValue > 0 && ((portfolio.noi / portfolio.totalValue) * 100) > 6.5 },
              { label: "Saved YTD", value: "—", meta: "no actions yet" },
              { label: "Unactioned", value: fmt(portfolio.unactionedOpps, portfolio.currency), meta: portfolio.unactionedOpps > 0 ? `+${fmt(portfolio.unactionedOpps * 15.2, portfolio.currency)} value` : "", highlight: portfolio.unactionedOpps > 0, subGreen: portfolio.unactionedOpps > 0 },
            ].map((kpi, i) => (
              <div
                key={i}
                style={{
                  background: kpi.highlight ? "#fffbeb" : "#ffffff",
                  border: kpi.highlight ? "0.5px solid #fde68a" : "0.5px solid #e5e7eb",
                  borderLeft: kpi.highlight ? "3px solid #d97706" : "0.5px solid #e5e7eb",
                  borderRadius: 11,
                  padding: "12px 13px",
                  transition: "box-shadow .12s, transform .12s",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.05)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ font: "700 9px/1 Inter, system-ui, sans-serif", color: kpi.highlight ? "#d97706" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
                  {kpi.label}
                </div>
                <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 21, color: kpi.highlight ? "#92400e" : "#111827", lineHeight: 1, marginBottom: 3 }}>
                  {kpi.value}
                </div>
                <div style={{ font: "9.5px/1 Inter, system-ui, sans-serif", color: kpi.subRed ? "#dc2626" : (kpi.subGreen ? "#92400e" : "#6b7280") }}>
                  {kpi.meta}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content padding wrapper */}
        <div style={{ padding: "0 24px" }}>
          {/* Properties section */}
          {rawPortfolio && rawPortfolio.assets.length > 0 && (
            <div className="animate-stagger-3" style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 8px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ font: "700 9px/1 Inter, system-ui, sans-serif", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Properties</span>
                  <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: "17px", color: "var(--tx)" }}>{portfolio.assetCount} assets · {fmt(portfolio.totalValue, portfolio.currency)} portfolio</span>
                </div>
                <Link href="/assets" style={{ fontSize: "12px", color: "#1647E8", textDecoration: "none" }}>View all →</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {rawPortfolio.assets.slice(0, 3).map((asset) => {
                  const value = portfolio.currency === "USD" ? (asset.valuationUSD ?? 0) : (asset.valuationGBP ?? 0);
                  const typeLabel = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);
                  return (
                    <Link key={asset.id} href={`/assets/${asset.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
                      >
                        <div style={{ padding: "13px 15px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--tx)", lineHeight: 1.2, marginBottom: "2px" }}>{asset.name}</div>
                              <div style={{ fontSize: "11px", color: "#9ca3af" }}>{asset.location}</div>
                            </div>
                            {value > 0 && (
                              <div style={{ fontSize: "18px", fontWeight: 500, fontFamily: "'Instrument Serif', Georgia, serif", color: "var(--tx)", whiteSpace: "nowrap", marginLeft: "8px", lineHeight: 1 }}>
                                {fmt(value, portfolio.currency)}
                                <div style={{ font: "400 10px/1 Inter, system-ui, sans-serif", color: "#9ca3af", marginTop: "2px" }}>est. value</div>
                              </div>
                            )}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                            <div>
                              <div style={{ font: "700 9px/1 Inter, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "2px" }}>Passing Rent</div>
                              <div style={{ font: "500 12.5px/1 Inter, system-ui, sans-serif", color: "var(--tx)" }}>{fmt(asset.grossIncome, portfolio.currency)}/yr</div>
                            </div>
                            <div>
                              <div style={{ font: "700 9px/1 Inter, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "2px" }}>Occupancy</div>
                              <div style={{ font: "500 12.5px/1 Inter, system-ui, sans-serif", color: "var(--tx)" }}>{asset.occupancy}%</div>
                            </div>
                          </div>
                          <div style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "6px", background: "#E8F5EE", color: "var(--grn)", display: "inline-block", textTransform: "uppercase", letterSpacing: "0.03em" }}>{typeLabel}</div>
                        </div>
                        <div style={{ padding: "8px 15px", background: "#f7f7f5", borderTop: "0.5px solid #f3f4f6", font: "600 11px/1 Inter, system-ui, sans-serif", color: "#6b7280", display: "flex", justifyContent: "flex-end", transition: "color .12s" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "#111827"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
                        >
                          View asset →
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full-width "Where your money is" opportunities card - per v9 design */}
          {opportunities.length > 0 && (
            <div className="animate-stagger-4" style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ padding: "12px 18px", borderBottom: "0.5px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--tx)", margin: 0 }}>Where your money is</p>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>RealHQ has found these — ranked by what they're worth to you annually</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "17px", color: "var(--grn)" }}>{fmt(portfolio.unactionedOpps, portfolio.currency)}/yr</span>
                  <Link href="/audit">
                    <button style={{ padding: "5px 12px", background: "#173404", color: "#fff", border: "none", borderRadius: "7px", font: "600 11px Inter, system-ui, sans-serif", cursor: "pointer" }}>
                      Action all →
                    </button>
                  </Link>
                </div>
              </div>
              {opportunities.map((opp, i) => (
                <Link key={i} href={opp.route} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "10px 18px", borderBottom: i < opportunities.length - 1 ? "0.5px solid #f9fafb" : "none", gap: "12px", cursor: "pointer", transition: "background .1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ font: "500 10px/1 'Courier New', monospace", color: "#9ca3af", width: "18px", flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, fontSize: "12.5px", fontWeight: 500, color: "var(--tx)" }}>
                      {opp.name} <span style={{ fontSize: "11px", fontWeight: 400, color: "#6b7280", marginLeft: "4px" }}>· {opp.desc}</span>
                    </div>
                    <div style={{ width: "120px", background: "#f3f4f6", borderRadius: "3px", height: "5px", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ background: "#d1d5db", height: "100%", width: `${opp.pct}%`, transition: "width 1s ease .4s" }} />
                    </div>
                    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "15px", color: "#92400e", minWidth: "62px", textAlign: "right", fontWeight: 500 }}>
                      {fmt(opp.value, portfolio.currency)}/yr
                    </div>
                    <span style={{ fontSize: "13px", color: "#6b7280", marginLeft: "4px" }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Lease expiry */}
          {rawPortfolio && (() => {
            const allLeases = rawPortfolio.assets.flatMap(a => a.leases.map(l => ({ ...l, asset: a.name })));
            const expiringLeases = allLeases.filter(l => l.daysToExpiry <= 365).sort((a, b) => a.daysToExpiry - b.daysToExpiry).slice(0, 4);

            if (expiringLeases.length === 0) return null;

            const urgentCount = expiringLeases.filter(l => l.daysToExpiry <= 90).length;

            return (
              <div className="animate-stagger-5">
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 8px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ font: "700 9px/1 Inter, system-ui, sans-serif", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Rent Clock</span>
                    <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: "17px", color: "var(--tx)" }}>Lease expiry · next 12 months</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>Miss a window, lose leverage for 5 years</span>
                </div>
                <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", marginBottom: "48px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: expiringLeases.length >= 4 ? "repeat(4, 1fr)" : `repeat(${expiringLeases.length}, 1fr)` }}>
                    {expiringLeases.map((lease, i) => {
                      const isUrgent = lease.daysToExpiry <= 90;
                      const annualRent = lease.sqft * lease.rentPerSqft;
                      return (
                        <div key={i} style={{ padding: "12px 16px", borderRight: i < expiringLeases.length - 1 ? "0.5px solid #f3f4f6" : "none", cursor: "pointer", transition: "background .1s", background: isUrgent ? "#fffbfb" : "transparent" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={(e) => e.currentTarget.style.background = isUrgent ? "#fffbfb" : "transparent"}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <div style={{ font: "600 12px/1 Inter, system-ui, sans-serif", color: "var(--tx)" }}>{lease.tenant}</div>
                            <div style={{ font: "700 10px/1 Inter, system-ui, sans-serif", padding: "2px 7px", borderRadius: "10px", color: isUrgent ? "#dc2626" : "#d97706", background: isUrgent ? "#fee2e2" : "#fef3c7" }}>
                              {lease.daysToExpiry}d
                            </div>
                          </div>
                          <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "5px", lineHeight: 1.5 }}>
                            {lease.asset} · {fmt(annualRent, portfolio.currency)}/yr
                          </div>
                          <div style={{ height: "3px", background: "#f3f4f6", borderRadius: "2px", overflow: "hidden", marginBottom: "7px" }}>
                            <div style={{ height: "100%", borderRadius: "2px", background: isUrgent ? "#dc2626" : "#d97706", width: `${100 - (lease.daysToExpiry / 365 * 100)}%`, transition: "width 1s ease .7s" }} />
                          </div>
                          <Link href="/rent-clock" style={{ font: isUrgent ? "600 11px/1 Inter, system-ui, sans-serif" : "600 11px/1 Inter, system-ui, sans-serif", color: isUrgent ? "#0A8A4C" : "#6b7280", textDecoration: "none" }}>
                            {isUrgent ? "✓ Letter ready — send now →" : "Review Q4 →"}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </AppShell>
  );
}
