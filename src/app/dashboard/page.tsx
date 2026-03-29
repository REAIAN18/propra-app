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
  const [financingOpen, setFinancingOpen] = useState(false);

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

  if (!portfolio || portfolio.assetCount === 0) {
    return (
      <AppShell>
        <div style={{
          minHeight: "100vh",
          background: "var(--bg, #09090b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: "440px",
            textAlign: "center",
            background: "var(--s1, #111116)",
            border: "1px solid var(--bdr, #252533)",
            borderRadius: "16px",
            padding: "48px 40px"
          }}>
            {/* Icon */}
            <div style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 20px",
              borderRadius: "16px",
              background: "var(--s2, #18181f)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--tx3, #555568)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>

            {/* Heading */}
            <h1 style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "26px",
              fontWeight: 400,
              color: "var(--tx, #e4e4ec)",
              marginBottom: "8px",
              lineHeight: 1.3
            }}>
              Your portfolio is empty
            </h1>

            {/* Description */}
            <p style={{
              fontSize: "14px",
              color: "var(--tx2, #8888a0)",
              lineHeight: 1.6,
              marginBottom: "28px"
            }}>
              Add your first property to get started.<br />
              RealHQ will analyze it and find opportunities to increase your income.
            </p>

            {/* CTA Button */}
            <Link href="/properties/add" style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%",
                padding: "14px 24px",
                background: "var(--acc, #7c6af0)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#6d5ce0"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--acc, #7c6af0)"}
              >
                <span>+</span>
                <span>Add Property</span>
                <span>→</span>
              </button>
            </Link>

            {/* Help text */}
            <p style={{
              fontSize: "12px",
              color: "var(--tx3, #555568)",
              marginTop: "20px"
            }}>
              Just enter an address — we&apos;ll handle the rest
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const region = portfolio.currency === "USD" ? "Florida Commercial" : "UK Commercial";

  return (
    <AppShell>
      <style jsx>{`
        .kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--bdr, #252533);
          border: 1px solid var(--bdr, #252533);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .kpi {
          background: var(--s1, #111116);
          padding: 20px;
          cursor: pointer;
          transition: background .12s;
        }
        .kpi:hover {
          background: var(--s2, #18181f);
        }
        .kpi-l {
          font: 500 9px/1 'JetBrains Mono', monospace;
          color: var(--tx3, #555568);
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 10px;
        }
        .kpi-v {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 32px;
          font-weight: 400;
          color: var(--tx, #e4e4ec);
          line-height: 1;
          letter-spacing: -.03em;
        }
        .kpi-v small {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          color: var(--tx3, #555568);
          font-weight: 400;
        }
        .kpi-note {
          font-size: 11px;
          color: var(--tx3, #555568);
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .kpi-note .pos {
          color: var(--grn, #34d399);
        }
        .kpi-note .neg {
          color: var(--amb, #fbbf24);
        }
        @media (max-width: 375px) {
          .kpis {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {/* Main container */}
      <div style={{ background: "var(--bg, #09090b)", minHeight: "100vh", padding: "28px 32px 80px" }}>
        {/* Demo banner */}
        {isDemo && (
          <div style={{
            background: "var(--amb-lt, rgba(251,191,36,.07))",
            border: "1px solid var(--amb-bdr, rgba(251,191,36,.22))",
            borderRadius: "10px",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "13px",
            marginBottom: "24px",
            maxWidth: "960px"
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--amb, #fbbf24)" strokeWidth="2">
              <circle cx="8" cy="8" r="6"/>
              <path d="M8 5v3M8 11h.01"/>
            </svg>
            <strong style={{ color: "var(--amb, #fbbf24)", fontWeight: 600 }}>This is a demo</strong>
            <span style={{ color: "var(--tx2, #8888a0)" }}>— data is illustrative.</span>
            <Link href="/signin" style={{ marginLeft: "auto", color: "var(--acc, #7c6af0)", fontWeight: 600, textDecoration: "none" }}>
              Sign in to see your portfolio →
            </Link>
          </div>
        )}

        <div style={{ maxWidth: "960px" }}>
          {/* Greeting */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ font: "400 10px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
            <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "26px", fontWeight: 400, color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: "4px" }}>
              Good {new Date().getHours() < 12 ? "morning" : "afternoon"} — here&apos;s your portfolio
            </div>
            <div style={{ fontSize: "13px", color: "var(--tx3, #555568)" }}>
              {portfolio.assetCount} commercial {portfolio.assetCount === 1 ? "asset" : "assets"} · {region}
            </div>
          </div>

          {/* KPI Strip - 4 metrics */}
          <div className="kpis">
            <div className="kpi">
              <div className="kpi-l">Portfolio Value</div>
              <div className="kpi-v">{fmt(portfolio.totalValue, portfolio.currency)}</div>
              <div className="kpi-note">{portfolio.assetCount} {portfolio.assetCount === 1 ? "asset" : "assets"}</div>
            </div>

            <div className="kpi">
              <div className="kpi-l">Net Income</div>
              <div className="kpi-v">{fmt(portfolio.noi, portfolio.currency)}</div>
              <div className="kpi-note">
                {portfolio.rentRoll > 0 && (
                  <span className="pos">{Math.round((portfolio.noi / portfolio.rentRoll) * 100)}% margin</span>
                )}
                {portfolio.rentRoll === 0 && "—"}
              </div>
            </div>

            <div className="kpi">
              <div className="kpi-l">Uncaptured Value</div>
              <div className="kpi-v">{fmt(portfolio.unactionedOpps, portfolio.currency)}</div>
              <div className="kpi-note">
                {portfolio.unactionedOpps > 0 && (
                  <span className="pos">+{fmt(portfolio.unactionedOpps * 15.2, portfolio.currency)} potential</span>
                )}
                {portfolio.unactionedOpps === 0 && "All captured"}
              </div>
            </div>

            <div className="kpi">
              <div className="kpi-l">Saved by RealHQ</div>
              <div className="kpi-v">—</div>
              <div className="kpi-note">No actions yet</div>
            </div>
          </div>

          {/* Gross to Net section */}
          {portfolio.noi > 0 && portfolio.rentRoll > 0 && (
            <div
              style={{
                background: "var(--s1, #111116)",
                border: "1px solid var(--bdr, #252533)",
                borderRadius: "10px",
                marginBottom: "24px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--bdr, #252533)",
                }}
              >
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                  Gross to Net
                </h4>
                <span style={{ fontSize: "12px", color: "var(--acc, #7c6af0)", fontWeight: 600, cursor: "pointer" }}>
                  Full breakdown →
                </span>
              </div>
              <div style={{ padding: "24px 28px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "42px", fontWeight: 400, color: "var(--tx, #e4e4ec)", letterSpacing: "-.03em", lineHeight: 1 }}>
                    {Math.round((portfolio.noi / portfolio.rentRoll) * 100)}%{" "}
                    <small style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px", color: "var(--tx3, #555568)", fontWeight: 400, marginLeft: "4px" }}>
                      margin
                    </small>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--tx3, #555568)" }}>Benchmark 72–78%</div>
                </div>

                <div style={{ height: "6px", background: "var(--s3, #1f1f28)", borderRadius: "3px", overflow: "visible", position: "relative", marginBottom: "24px" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "3px",
                      background: "var(--acc, #7c6af0)",
                      width: `${Math.min((portfolio.noi / portfolio.rentRoll) * 100, 100)}%`,
                      transition: "width 1.2s ease .4s",
                    }}
                  />
                  <div style={{ position: "absolute", top: "-4px", left: "72%", height: "14px", width: "1px", background: "var(--tx3, #555568)" }} />
                  <div style={{ position: "absolute", top: "-4px", left: "78%", height: "14px", width: "1px", background: "var(--tx3, #555568)" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  <div>
                    <div style={{ font: "500 8px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      Gross Income
                    </div>
                    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em" }}>
                      {fmt(portfolio.rentRoll, portfolio.currency)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3, #555568)", marginTop: "3px" }}>rental / yr</div>
                  </div>
                  <div>
                    <div style={{ font: "500 8px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      OpEx
                    </div>
                    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em" }}>
                      −{fmt(portfolio.rentRoll - portfolio.noi, portfolio.currency)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--amb, #fbbf24)", marginTop: "3px" }}>
                      {((portfolio.rentRoll - portfolio.noi) / portfolio.rentRoll * 100).toFixed(0)}% of gross
                    </div>
                  </div>
                  <div>
                    <div style={{ font: "500 8px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      Net Income
                    </div>
                    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em" }}>
                      {fmt(portfolio.noi, portfolio.currency)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3, #555568)", marginTop: "3px" }}>
                      {Math.round((portfolio.noi / portfolio.rentRoll) * 100)}% margin
                    </div>
                  </div>
                  <div>
                    <div style={{ font: "500 8px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      Insurance
                    </div>
                    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em" }}>
                      —
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3, #555568)", marginTop: "3px" }}>estimated</div>
                  </div>
                  <div>
                    <div style={{ font: "500 8px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      Energy
                    </div>
                    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em" }}>
                      —
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3, #555568)", marginTop: "3px" }}>estimated</div>
                  </div>
                </div>

                {portfolio.unactionedOpps > 0 && (
                  <div style={{ padding: "14px 18px", background: "var(--acc-dim, rgba(124,106,240,.06))", border: "1px solid var(--acc-bdr, rgba(124,106,240,.22))", borderRadius: "8px", fontSize: "13px", color: "var(--tx2, #8888a0)", lineHeight: 1.6 }}>
                    Closing this gap adds{" "}
                    <strong style={{ color: "var(--tx, #e4e4ec)", fontWeight: 600 }}>
                      {fmt(portfolio.unactionedOpps, portfolio.currency)}/yr
                    </strong>{" "}
                    to net income — that&apos;s{" "}
                    <strong style={{ color: "var(--tx, #e4e4ec)", fontWeight: 600 }}>
                      +{fmt(portfolio.unactionedOpps * 15.2, portfolio.currency)}
                    </strong>{" "}
                    in portfolio value at current cap rates.{" "}
                    <a href="#" style={{ color: "var(--acc, #7c6af0)", fontWeight: 600, cursor: "pointer" }}>
                      Start closing it →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Money left on table section */}
          {opportunities.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ font: "500 9px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>
                Value RealHQ found
              </div>
              <div
                style={{
                  background: "var(--s1, #111116)",
                  border: "1px solid var(--bdr, #252533)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--bdr, #252533)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--tx, #e4e4ec)", marginBottom: "1px" }}>
                      Money you&apos;re leaving on the table
                    </h3>
                    <p style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>
                      Savings and income you wouldn&apos;t find without RealHQ
                    </p>
                  </div>
                  <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "22px", fontWeight: 400, color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em" }}>
                    {fmt(portfolio.unactionedOpps, portfolio.currency)}{" "}
                    <small style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "11px", color: "var(--tx3, #555568)", fontWeight: 400 }}>
                      /yr
                    </small>
                  </div>
                </div>
                {opportunities.map((opp, i) => (
                  <Link
                    key={i}
                    href={opp.route}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      alignItems: "center",
                      gap: "16px",
                      padding: "13px 20px",
                      borderBottom: i < opportunities.length - 1 ? "1px solid var(--bdr-lt, #1a1a26)" : "none",
                      cursor: "pointer",
                      transition: "background .1s",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2, #18181f)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--tx, #e4e4ec)", lineHeight: 1.3 }}>
                        {opp.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>{opp.desc}</div>
                    </div>
                    <span
                      style={{
                        font: "500 9px/1 'JetBrains Mono', monospace",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        letterSpacing: ".3px",
                        whiteSpace: "nowrap",
                        background: i === 0 ? "var(--acc-lt, rgba(124,106,240,.10))" : "var(--grn-lt, rgba(52,211,153,.07))",
                        color: i === 0 ? "var(--acc, #7c6af0)" : "var(--grn, #34d399)",
                        border: i === 0 ? "1px solid var(--acc-bdr, rgba(124,106,240,.22))" : "1px solid var(--grn-bdr, rgba(52,211,153,.22))",
                      }}
                    >
                      {i === 0 ? "New income" : "Quick win"}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, color: "var(--tx, #e4e4ec)", minWidth: "70px", textAlign: "right" }}>
                      {fmt(opp.value, portfolio.currency)}
                    </span>
                    <span style={{ color: "var(--tx3, #555568)", fontSize: "14px", transition: "color .12s" }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Portfolio section label */}
        <div
          style={{
            font: "500 9px/1 'JetBrains Mono', monospace",
            color: "var(--tx3, #555568)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "12px",
            paddingTop: "4px",
          }}
        >
          Portfolio
        </div>

        {/* Lease Expiry + Properties Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {/* Lease Expiry Card */}
          <div
            style={{
              background: "var(--s1, #111116)",
              border: "1px solid var(--bdr, #252533)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--bdr, #252533)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                Lease Expiry
              </h4>
              <Link
                href="/rent-clock"
                style={{
                  fontSize: "11px",
                  color: "var(--acc, #7c6af0)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                View all →
              </Link>
            </div>

            {/* Lease rows */}
            {[
              { name: "Coastal Pharmacy", location: "Brickell", rent: "$149k/yr", days: "90 days", danger: true },
              { name: "Broward Medical", location: "Ft Lauderdale", rent: "$147k/yr", days: "120 days", danger: true },
              { name: "SunState Accountants", location: "Coral Gables", rent: "$240k/yr", days: "284 days", danger: false },
              { name: "HR Dynamics", location: "Orlando", rent: "$147k/yr", days: "284 days", danger: false },
            ].map((lease, i) => (
              <Link
                key={i}
                href="/rent-clock"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 18px",
                  borderBottom: i === 3 ? "none" : "1px solid var(--bdr-lt, #1a1a26)",
                  cursor: "pointer",
                  transition: "background .1s",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--tx, #e4e4ec)",
                      lineHeight: 1.3,
                    }}
                  >
                    {lease.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>
                    {lease.location} · {lease.rent}
                  </div>
                </div>
                <span></span>
                <span
                  style={{
                    font: "500 9px/1 'JetBrains Mono', monospace",
                    padding: "3px 7px",
                    borderRadius: "5px",
                    letterSpacing: ".3px",
                    whiteSpace: "nowrap",
                    background: lease.danger ? "var(--red-lt, rgba(248,113,113,.07))" : "var(--s3, #1f1f28)",
                    color: lease.danger ? "var(--red, #f87171)" : "var(--tx3, #555568)",
                    border: lease.danger ? "1px solid var(--red-bdr, rgba(248,113,113,.22))" : "1px solid var(--bdr, #252533)",
                  }}
                >
                  {lease.days}
                </span>
                <span style={{ color: "var(--tx3, #555568)", fontSize: "12px", transition: "color .12s" }}>
                  →
                </span>
              </Link>
            ))}
          </div>

          {/* Properties Card */}
          <div
            style={{
              background: "var(--s1, #111116)",
              border: "1px solid var(--bdr, #252533)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--bdr, #252533)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                Properties
              </h4>
              <Link
                href="/properties"
                style={{
                  fontSize: "11px",
                  color: "var(--acc, #7c6af0)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                View all 5 →
              </Link>
            </div>

            {/* Property rows */}
            {[
              { name: "Coral Gables Office Park", type: "Office", sqft: "42,000 sqft", occupancy: "84%", value: "$14–16M" },
              { name: "Brickell Retail Center", type: "Retail", sqft: "18,000 sqft", occupancy: "100%", value: "$9–11M" },
              { name: "Tampa Industrial Park", type: "Industrial", sqft: "28,000 sqft", occupancy: "100%", value: "$7–9M" },
            ].map((property, i) => (
              <Link
                key={i}
                href="/properties"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 18px",
                  borderBottom: i === 2 ? "none" : "1px solid var(--bdr-lt, #1a1a26)",
                  cursor: "pointer",
                  transition: "background .1s",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--tx, #e4e4ec)",
                      lineHeight: 1.3,
                    }}
                  >
                    {property.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>
                    {property.type} · {property.sqft}
                  </div>
                </div>
                <span
                  style={{
                    font: "500 11px/1 'JetBrains Mono', monospace",
                    color: "var(--tx2, #8888a0)",
                  }}
                >
                  {property.occupancy}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--tx, #e4e4ec)",
                    letterSpacing: "-.01em",
                    textAlign: "right",
                  }}
                >
                  {property.value}{" "}
                  <span
                    style={{
                      font: "500 8px/1 'JetBrains Mono', monospace",
                      color: "var(--tx3, #555568)",
                      letterSpacing: ".8px",
                    }}
                  >
                    EST
                  </span>
                </span>
                <span style={{ color: "var(--tx3, #555568)", fontSize: "12px", transition: "color .12s" }}>
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Deal Finder + Pipeline section */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ font: "500 9px/1 'JetBrains Mono', monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>
            Grow
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Deal Finder */}
            <div
              style={{
                background: "var(--s1, #111116)",
                border: "1px solid var(--bdr, #252533)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--bdr, #252533)",
                }}
              >
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                  Deal Finder
                </h4>
                <Link href="/scout" style={{ fontSize: "12px", color: "var(--acc, #7c6af0)", fontWeight: 600, textDecoration: "none" }}>
                  View all →
                </Link>
              </div>
              <div>
                {[
                  { name: "Brickell Key Professional Centre", sub: "Office · 7.4% cap · above your avg yield · adjacent to portfolio", match: "94%", value: "$6.2M" },
                  { name: "Sunrise Strip Commercial", sub: "Retail · 6.9% cap · diversifies your mix · Broward county", match: "88%", value: "$4.1M" },
                  { name: "Brandon Logistics Hub", sub: "Industrial · 7.1% cap · long WAULT · below typical deal size", match: "81%", value: "$8.9M" },
                ].map((deal, i) => (
                  <Link
                    key={i}
                    href="/scout"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      alignItems: "center",
                      gap: "16px",
                      padding: "13px 20px",
                      borderBottom: i < 2 ? "1px solid var(--bdr-lt, #1a1a26)" : "none",
                      cursor: "pointer",
                      transition: "background .1s",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2, #18181f)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--tx, #e4e4ec)", lineHeight: 1.3 }}>
                        {deal.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>{deal.sub}</div>
                    </div>
                    <span
                      style={{
                        font: "500 9px/1 'JetBrains Mono', monospace",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        letterSpacing: ".3px",
                        whiteSpace: "nowrap",
                        background: "var(--acc-lt, rgba(124,106,240,.10))",
                        color: "var(--acc, #7c6af0)",
                        border: "1px solid var(--acc-bdr, rgba(124,106,240,.22))",
                      }}
                    >
                      {deal.match}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, color: "var(--tx, #e4e4ec)", minWidth: "70px", textAlign: "right" }}>
                      {deal.value}
                    </span>
                    <span style={{ color: "var(--tx3, #555568)", fontSize: "14px", transition: "color .12s" }}>→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pipeline */}
            <div
              style={{
                background: "var(--s1, #111116)",
                border: "1px solid var(--bdr, #252533)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--bdr, #252533)",
                }}
              >
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                  Pipeline
                </h4>
                <Link href="/scout/pipeline" style={{ fontSize: "12px", color: "var(--acc, #7c6af0)", fontWeight: 600, textDecoration: "none" }}>
                  Configure →
                </Link>
              </div>
              <div style={{ padding: "18px" }}>
                {/* Pipeline stages */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: "1px",
                    background: "var(--bdr-lt, #1a1a26)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    marginBottom: "14px",
                  }}
                >
                  {[
                    { label: "Watch", value: "7", active: true },
                    { label: "Analysed", value: "4", active: false },
                    { label: "Approach", value: "2", active: false },
                    { label: "Offer", value: "1", active: false },
                    { label: "DD", value: "1", active: false },
                    { label: "Exchange", value: "0", active: false },
                  ].map((stage, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--s2, #18181f)",
                        padding: "10px 8px",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "background .1s",
                        borderBottom: stage.active ? "2px solid var(--acc, #7c6af0)" : "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s3, #1f1f28)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--s2, #18181f)")}
                    >
                      <div
                        style={{
                          font: "500 8px/1 'JetBrains Mono', monospace",
                          color: stage.active ? "var(--acc, #7c6af0)" : "var(--tx3, #555568)",
                          textTransform: "uppercase",
                          letterSpacing: ".6px",
                          marginBottom: "4px",
                        }}
                      >
                        {stage.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Instrument Serif', Georgia, serif",
                          fontSize: "18px",
                          color: stage.value === "0" ? "var(--tx3, #555568)" : "var(--tx, #e4e4ec)",
                        }}
                      >
                        {stage.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pipeline deals */}
                {[
                  { name: "Brickell Key Professional Centre", location: "Office · Miami-Dade", stage: "DD", value: "$6.2M", active: true },
                  { name: "Sunrise Strip Commercial", location: "Retail · Broward", stage: "Approached", value: "$4.1M", active: false },
                ].map((deal, i) => (
                  <Link
                    key={i}
                    href="/scout/pipeline"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: i < 1 ? "1px solid var(--bdr-lt, #1a1a26)" : "none",
                      gap: "10px",
                      cursor: "pointer",
                      transition: "background .1s",
                      borderRadius: "6px",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2, #18181f)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx, #e4e4ec)" }}>
                        {deal.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>{deal.location}</div>
                    </div>
                    <span
                      style={{
                        font: "500 9px/1 'JetBrains Mono', monospace",
                        padding: "3px 7px",
                        borderRadius: "5px",
                        background: deal.active ? "var(--acc-lt, rgba(124,106,240,.10))" : "var(--s3, #1f1f28)",
                        color: deal.active ? "var(--acc, #7c6af0)" : "var(--tx3, #555568)",
                        border: deal.active ? "1px solid var(--acc-bdr, rgba(124,106,240,.22))" : "1px solid var(--bdr, #252533)",
                      }}
                    >
                      {deal.stage}
                    </span>
                    <span style={{ font: "500 12px 'JetBrains Mono', monospace", color: "var(--tx, #e4e4ec)" }}>
                      {deal.value}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible: Financing & Rates */}
        <div
          onClick={() => setFinancingOpen(!financingOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "32px 0 14px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div
            style={{
              font: "500 9px/1 'JetBrains Mono', monospace",
              color: "var(--tx3, #555568)",
              textTransform: "uppercase",
              letterSpacing: "2px",
              margin: 0,
            }}
          >
            Financing &amp; Rates
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--tx3, #555568)",
              transition: "transform .2s",
              width: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "5px",
              background: "var(--s2, #18181f)",
              transform: financingOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </div>
          <div style={{ flex: 1, height: "1px", background: "var(--bdr, #252533)" }} />
        </div>

        {/* Collapsible body */}
        <div
          style={{
            overflow: "hidden",
            transition: "max-height .35s ease, opacity .25s ease",
            maxHeight: financingOpen ? "600px" : "0",
            opacity: financingOpen ? 1 : 0,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginBottom: "14px",
            }}
          >
            {/* Market Rates Card */}
            <div
              style={{
                background: "var(--s1, #111116)",
                border: "1px solid var(--bdr, #252533)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--bdr, #252533)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                  Market Rates
                </h4>
                <Link
                  href="/financing"
                  style={{
                    fontSize: "11px",
                    color: "var(--acc, #7c6af0)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Upload loan docs →
                </Link>
              </div>

              <div style={{ padding: "18px" }}>
                {/* Financing grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {[
                    { label: "SOFR 30-Day", value: "5.32%", note: "Live", pulse: true },
                    { label: "10Y Treasury", value: "4.28%", note: "+12bps this week", pulse: false },
                    { label: "CRE Spread", value: "+175–250", note: "bps over SOFR", pulse: false },
                    { label: "All-in Range", value: "7.1–7.8%", note: "Current rates", pulse: false },
                  ].map((cell, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--s2, #18181f)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          font: "500 8px/1 'JetBrains Mono', monospace",
                          color: "var(--tx3, #555568)",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          marginBottom: "6px",
                        }}
                      >
                        {cell.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Instrument Serif', Georgia, serif",
                          fontSize: "17px",
                          color: "var(--tx, #e4e4ec)",
                          letterSpacing: "-.01em",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        {cell.pulse && (
                          <span
                            style={{
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              background: "var(--grn, #34d399)",
                              animation: "pulse 2s infinite",
                            }}
                          />
                        )}
                        {cell.value}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--tx3, #555568)", marginTop: "3px" }}>
                        {cell.note}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--s2, #18181f)",
                    border: "1px solid var(--bdr, #252533)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "var(--tx3, #555568)",
                    lineHeight: 1.5,
                    textAlign: "center",
                  }}
                >
                  Upload loan documents to see LTV, coverage ratios, and refinance windows.{" "}
                  <Link href="/financing" style={{ color: "var(--acc, #7c6af0)", fontWeight: 600 }}>
                    Upload now →
                  </Link>
                </div>
              </div>
            </div>

            {/* Market Benchmarks Card */}
            <div
              style={{
                background: "var(--s1, #111116)",
                border: "1px solid var(--bdr, #252533)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--bdr, #252533)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                  Market Benchmarks
                </h4>
                <span style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>
                  FL Mixed · Q1 2026
                </span>
              </div>

              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {[
                    { label: "Cap Rate", value: "6.6%", comparison: "mkt 6.5% ✓", status: "good" },
                    { label: "NOI Margin", value: "67%", comparison: "mkt 58% ✓", status: "good" },
                    { label: "Occupancy", value: "91%", comparison: "mkt 94% ↓", status: "warn" },
                    { label: "Rent/sqft", value: "$25.12", comparison: "mkt $14.50 ✓", status: "good" },
                    { label: "OpEx/sqft", value: "$8.18", comparison: "mkt $4.29 ↑↑", status: "bad" },
                    { label: "Ins/sqft", value: "$2.43", comparison: "mkt $1.11 ↑↑", status: "bad" },
                  ].map((metric, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--s2, #18181f)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          font: "500 8px/1 'JetBrains Mono', monospace",
                          color: "var(--tx3, #555568)",
                          textTransform: "uppercase",
                          letterSpacing: ".8px",
                          marginBottom: "5px",
                        }}
                      >
                        {metric.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Instrument Serif', Georgia, serif",
                          fontSize: "16px",
                          color: "var(--tx, #e4e4ec)",
                        }}
                      >
                        {metric.value}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          marginTop: "2px",
                          color:
                            metric.status === "good"
                              ? "var(--grn, #34d399)"
                              : metric.status === "warn"
                              ? "var(--amb, #fbbf24)"
                              : "var(--red, #f87171)",
                        }}
                      >
                        {metric.comparison}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions & Projects Card */}
            <div
              style={{
                background: "var(--s1, #111116)",
                border: "1px solid var(--bdr, #252533)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--bdr, #252533)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx, #e4e4ec)" }}>
                  Transactions &amp; Projects
                </h4>
                <span style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>4 active</span>
              </div>

              {/* Transaction rows */}
              {[
                { name: "Brickell Key Professional Centre", subtitle: "Acquisition · 58% DD complete · survey due 4 Apr", progress: 58, value: "$6.2M" },
                { name: "Coral Gables — Suite 4B", subtitle: "Letting · HoTs agreed · solicitor instructed", progress: 40, value: "$85k/yr" },
                { name: "Tampa roof replacement", subtitle: "Capex · contractor on site · due Jun 2026", progress: 65, value: "$120k" },
                { name: "CG office refurb — Suite 4B", subtitle: "Fit-out · design approved · build starts 7 Apr", progress: 25, value: "$48k" },
              ].map((txn, i) => (
                <Link
                  key={i}
                  href="/transactions"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 18px",
                    borderBottom: i === 3 ? "none" : "1px solid var(--bdr-lt, #1a1a26)",
                    cursor: "pointer",
                    transition: "background .1s",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--tx, #e4e4ec)",
                        lineHeight: 1.3,
                      }}
                    >
                      {txn.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--tx3, #555568)" }}>
                      {txn.subtitle}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "3px",
                        background: "var(--s3, #1f1f28)",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: "2px",
                          background: "var(--acc, #7c6af0)",
                          width: `${txn.progress}%`,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        font: "500 9px/1 'JetBrains Mono', monospace",
                        color: "var(--tx3, #555568)",
                      }}
                    >
                      {txn.progress}%
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--tx, #e4e4ec)",
                      letterSpacing: "-.01em",
                      textAlign: "right",
                    }}
                  >
                    {txn.value}
                  </span>
                  <span style={{ color: "var(--tx3, #555568)", fontSize: "12px", transition: "color .12s" }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
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
                <Link href="/assets" style={{ fontSize: "12px", color: "#7c6af0", textDecoration: "none" }}>View all →</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {rawPortfolio.assets.slice(0, 3).map((asset) => {
                  const value = portfolio.currency === "USD" ? (asset.valuationUSD ?? 0) : (asset.valuationGBP ?? 0);
                  const typeLabel = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);
                  return (
                    <Link key={asset.id} href={`/assets/${asset.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "var(--s1)", border: "0.5px solid var(--bdr)", borderRadius: "14px", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s" }}
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
                          <div style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "6px", background: "#E8F5EE", color: "#34d399", display: "inline-block", textTransform: "uppercase", letterSpacing: "0.03em" }}>{typeLabel}</div>
                        </div>
                        <div style={{ padding: "8px 15px", background: "#f7f7f5", borderTop: "0.5px solid #f3f4f6", font: "600 11px/1 Inter, system-ui, sans-serif", color: "#6b7280", display: "flex", justifyContent: "flex-end", transition: "color .12s" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--tx)"}
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
            <div className="animate-stagger-4" style={{ background: "var(--s1)", border: "0.5px solid var(--bdr)", borderRadius: "14px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ padding: "12px 18px", borderBottom: "0.5px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--tx)", margin: 0 }}>Where your money is</p>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>RealHQ has found these — ranked by what they&apos;re worth to you annually</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "17px", color: "#34d399" }}>{fmt(portfolio.unactionedOpps, portfolio.currency)}/yr</span>
                  <Link href="/audit">
                    <button style={{ padding: "5px 12px", background: "#34d399", color: "#fff", border: "none", borderRadius: "7px", font: "600 11px Inter, system-ui, sans-serif", cursor: "pointer" }}>
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
                <div style={{ background: "var(--s1)", border: "0.5px solid var(--bdr)", borderRadius: "14px", overflow: "hidden", marginBottom: "48px" }}>
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
                          <Link href="/rent-clock" style={{ font: isUrgent ? "600 11px/1 Inter, system-ui, sans-serif" : "600 11px/1 Inter, system-ui, sans-serif", color: isUrgent ? "#34d399" : "#6b7280", textDecoration: "none" }}>
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
