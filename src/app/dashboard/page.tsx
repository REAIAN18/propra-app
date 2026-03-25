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
        {/* Topbar */}
        <div style={{ height: "52px", background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 18px", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Value Dashboard</div>
          <span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "2px" }}>{region} · {portfolio.assetCount} {portfolio.assetCount === 1 ? "Asset" : "Assets"} · AI monitoring live</span>
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
                <Link href="/rent-clock" style={{ marginLeft: "auto", color: "#0A8A4C", fontWeight: 600, textDecoration: "none", fontSize: "11.5px" }}>Review now →</Link>
              </div>
            );
          })()}

          {/* Hero */}
          <div style={{ background: "#173404", padding: "18px 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: "5px" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · Good {new Date().getHours() < 12 ? "morning" : "afternoon"}
              </div>
              <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", color: "#fff", lineHeight: 1.25, marginBottom: "3px" }}>
                Welcome back — here's your portfolio
              </div>
              <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.4)" }}>
                {portfolio.assetCount} commercial {portfolio.assetCount === 1 ? "asset" : "assets"} across {region.split(" ")[0]} · AI monitoring active · Last refreshed just now
              </div>
            </div>
          </div>

          {/* 8-KPI Strip (FLEX layout) */}
          <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #E5E7EB", overflow: "hidden" }}>
            {[
              { label: "Portfolio Value", value: fmt(portfolio.totalValue, portfolio.currency), meta: `${portfolio.assetCount} ${portfolio.assetCount === 1 ? "asset" : "assets"}` },
              { label: "Rent Roll", value: `${fmt(portfolio.rentRoll, portfolio.currency)}/yr`, meta: `${fmt(portfolio.rentRoll / 12, portfolio.currency)}/mo` },
              { label: "NOI", value: fmt(portfolio.noi, portfolio.currency), meta: portfolio.rentRoll > 0 ? `${Math.round((portfolio.noi / portfolio.rentRoll) * 100)}% margin` : "" },
              { label: "Occupancy", value: `${portfolio.occupancy}%`, meta: portfolio.voidCount > 0 ? `${portfolio.voidCount} void ${portfolio.voidCount === 1 ? "suite" : "suites"}` : "fully let" },
              { label: "Square Footage", value: `${Math.round(portfolio.sqft / 1000)}k`, meta: `across ${portfolio.assetCount} ${portfolio.assetCount === 1 ? "asset" : "assets"}` },
              { label: "Cap Rate", value: portfolio.noi > 0 && portfolio.totalValue > 0 ? `${((portfolio.noi / portfolio.totalValue) * 100).toFixed(1)}%` : "—", meta: "portfolio avg" },
              { label: "Saved YTD", value: "—", meta: "no actions yet" },
              { label: "Unactioned", value: fmt(portfolio.unactionedOpps, portfolio.currency), meta: portfolio.unactionedOpps > 0 ? `+${fmt(portfolio.unactionedOpps * 15.2, portfolio.currency)} value` : "", highlight: portfolio.unactionedOpps > 0 },
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
            {/* G2N card + Opportunities (side by side) */}
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "12px", marginBottom: "12px" }}>
              {/* G2N comparison card */}
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "3px" }}>Green-to-Net</div>
                <div style={{ fontSize: "10px", color: "#9CA3AF", marginBottom: "12px" }}>Energy cost vs portfolio benchmark</div>
                <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: "32px", color: "#111827", lineHeight: 1, marginBottom: "4px", letterSpacing: "-0.5px" }}>15%</div>
                <div style={{ fontSize: "10px", color: "#9CA3AF", marginBottom: "12px" }}>above market range · upload to confirm</div>
                <Link href="/energy" style={{ display: "inline-block", padding: "6px 12px", background: "#FEF6E8", color: "#92580A", border: "1px solid rgba(245,169,74,0.2)", borderRadius: "6px", fontSize: "11px", fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>
                  Optimise now →
                </Link>
              </div>

              {/* Opportunities section */}
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>Opportunities · ranked by value</div>
                    <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "1px" }}>
                      {opportunities.length > 0 ? `${fmt(portfolio.unactionedOpps, portfolio.currency)}/yr unactioned · +${fmt(portfolio.unactionedOpps * 15.2, portfolio.currency)} implied value` : "No opportunities identified yet"}
                    </div>
                  </div>
                  {opportunities.length > 0 && (
                    <Link href="/audit" style={{ fontSize: "11px", color: "#0A8A4C", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Action all →</Link>
                  )}
                </div>

                {/* Opportunity rows */}
                {opportunities.length > 0 ? (
                  opportunities.map((opp, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: i > 0 ? "8px" : 0, borderTop: i > 0 ? "1px solid #F9FAFB" : "none" }}>
                      <div style={{ flex: 1, fontSize: "11.5px", fontWeight: 500, color: "#111827" }}>
                        {opp.name} · <span style={{ color: "#9CA3AF" }}>{opp.desc}</span>
                      </div>
                      <div style={{ width: "100px", background: "#F3F4F6", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                        <div style={{ background: "#92580A", height: "100%", width: `${opp.pct}%` }} />
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-dm-serif)", color: "#92580A", minWidth: "56px", textAlign: "right" }}>{fmt(opp.value, portfolio.currency)}/yr</div>
                      <Link href={opp.route}>
                        <button style={{ padding: "4px 10px", background: "#FEF6E8", color: "#92580A", border: "1px solid rgba(245,169,74,0.2)", borderRadius: "6px", fontSize: "10.5px", fontWeight: 600, cursor: "pointer" }}>
                          Fix this →
                        </button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>
                    Add properties to see optimization opportunities
                  </div>
                )}
              </div>
            </div>

            {/* Properties section */}
            {rawPortfolio && rawPortfolio.assets.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827" }}>Where your money is</div>
                  <Link href="/assets" style={{ fontSize: "11px", color: "#0A8A4C", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  {rawPortfolio.assets.slice(0, 3).map((asset) => {
                    const value = portfolio.currency === "USD" ? (asset.valuationUSD ?? 0) : (asset.valuationGBP ?? 0);
                    const typeLabel = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);
                    return (
                      <Link key={asset.id} href={`/assets/${asset.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "13px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "none"; }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{asset.name}</div>
                            {value > 0 && (
                              <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-dm-serif)", color: "#111827", whiteSpace: "nowrap", marginLeft: "8px" }}>{fmt(value, portfolio.currency)}</div>
                            )}
                          </div>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", marginBottom: "8px" }}>{asset.location}</div>
                          <div style={{ fontSize: "8.5px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#E8F5EE", color: "#0A8A4C", display: "inline-block" }}>{typeLabel}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lease expiry */}
            {rawPortfolio && (() => {
              const allLeases = rawPortfolio.assets.flatMap(a => a.leases.map(l => ({ ...l, asset: a.name })));
              const expiringLeases = allLeases.filter(l => l.daysToExpiry <= 365).sort((a, b) => a.daysToExpiry - b.daysToExpiry).slice(0, 4);

              if (expiringLeases.length === 0) return null;

              const urgentCount = expiringLeases.filter(l => l.daysToExpiry <= 90).length;

              return (
                <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "3px" }}>
                    {urgentCount > 0 ? `Act now — ${urgentCount} ${urgentCount === 1 ? "lease expires" : "leases expire"} in 90 days` : "Upcoming lease renewals"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#9CA3AF", marginBottom: "10px" }}>
                    {urgentCount > 0 ? "Miss a window, lose leverage for 5 years" : "Monitor renewal timelines"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: expiringLeases.length >= 4 ? "1fr 1fr 1fr 1fr" : `repeat(${expiringLeases.length}, 1fr)`, gap: "10px" }}>
                    {expiringLeases.map((lease, i) => {
                      const isUrgent = lease.daysToExpiry <= 90;
                      const annualRent = lease.sqft * lease.rentPerSqft;
                      return (
                        <div key={i} style={{ background: isUrgent ? "#FDECEA" : "#F9FAFB", border: "1px solid " + (isUrgent ? "#D93025" : "#E5E7EB"), borderRadius: "8px", padding: "10px" }}>
                          <div style={{ fontSize: "10.5px", fontWeight: 600, color: "#111827", marginBottom: "2px" }}>{lease.tenant}</div>
                          <div style={{ fontSize: "9px", color: "#9CA3AF", marginBottom: "5px" }}>{fmt(annualRent, portfolio.currency)}/yr · {lease.daysToExpiry}d</div>
                          <Link href="/rent-clock" style={{ fontSize: "10px", fontWeight: 600, color: isUrgent ? "#0A8A4C" : "#4B5563", textDecoration: "none" }}>
                            {isUrgent ? "Letter ready →" : "Review →"}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>
    </AppShell>
  );
}
