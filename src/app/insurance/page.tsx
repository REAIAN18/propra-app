"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarChart } from "@/components/ui/BarChart";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { PageHero } from "@/components/ui/PageHero";
import { ArcaDirectCallout } from "@/components/ui/ArcaDirectCallout";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

const CURRENT_CARRIERS = ["Zurich", "AXA", "Aviva", "Chubb", "FM Global", "RSA", "Hartford", "Travelers"];
const COMPETING_CARRIERS = ["Markel", "QBE", "Allianz", "Hiscox", "Beazley", "Sompo", "Arch", "Liberty Mutual"];

const retenderSteps = [
  { label: "Portfolio audit", desc: "Review current premiums vs market", done: false },
  { label: "Market approach", desc: "Arca approaches 8–12 carriers", done: false },
  { label: "Indicative terms", desc: "Receive competitive quotes", done: false },
  { label: "Best & final", desc: "Negotiate final premium", done: false },
  { label: "Placement", desc: "Bind new policy, cancel incumbent", done: false },
];

type InsuranceSummary = {
  hasPolicies: boolean;
  totalPremium: number;
  earliestRenewal: string | null;
  policies: {
    id: string;
    insurer: string;
    premium: number;
    renewalDate: string | null;
    propertyAddress: string | null;
    coverageType: string | null;
    sumInsured: number;
    filename: string;
  }[];
};

type RetenderFormData = {
  propertyAddress: string;
  currentPremium: string;
  insurer: string;
  renewalDate: string;
  coverageType: string;
  email: string;
};

export default function InsurancePage() {
  const { portfolioId } = useNav();
  const [retenderStarted, setRetenderStarted] = useState(false);
  const [instructedCarrier, setInstructedCarrier] = useState<string | null>(null);
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary | null>(null);
  const [showRetenderForm, setShowRetenderForm] = useState(false);
  const [retenderSubmitted, setRetenderSubmitted] = useState(false);
  const [retenderForm, setRetenderForm] = useState<RetenderFormData>({
    propertyAddress: "",
    currentPremium: "",
    insurer: "",
    renewalDate: "",
    coverageType: "",
    email: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/user/insurance-summary")
      .then((r) => r.json())
      .then((data) => setInsuranceSummary(data))
      .catch(() => {});
  }, []);

  const hasRealData = insuranceSummary?.hasPolicies === true;

  // Real data KPIs
  const realTotalPremium = insuranceSummary?.totalPremium ?? 0;
  const realPolicies = insuranceSummary?.policies ?? [];
  // Benchmark: FL market rate is ~85% of user premium (i.e. 15% potential saving)
  const benchmarkPremium = Math.round(realTotalPremium * 0.82);
  const realOverpay = realTotalPremium - benchmarkPremium;
  const realOverpayPct = realTotalPremium > 0 ? Math.round((realOverpay / realTotalPremium) * 100) : 0;
  const realCommission = Math.round(realOverpay * 0.15);

  // Demo data KPIs
  const totalCurrentPremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalMarketPremium = portfolio.assets.reduce((s, a) => s + a.marketInsurance, 0);
  const totalOverpay = totalCurrentPremium - totalMarketPremium;
  const overpayPct = Math.round((totalOverpay / totalCurrentPremium) * 100);

  const displayPremium = hasRealData ? realTotalPremium : totalCurrentPremium;
  const displayMarket = hasRealData ? benchmarkPremium : totalMarketPremium;
  const displayOverpay = hasRealData ? realOverpay : totalOverpay;
  const displayOverpayPct = hasRealData ? realOverpayPct : overpayPct;
  const displayCommission = hasRealData ? realCommission : Math.round(totalOverpay * 0.15);

  const totalNetIncome = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalPortfolioValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const impliedCapRate = totalPortfolioValue > 0 ? totalNetIncome / totalPortfolioValue : 0.055;
  const insuranceCapUplift = impliedCapRate > 0 && displayOverpay > 0 ? Math.round(displayOverpay / impliedCapRate) : 0;

  const barData = hasRealData
    ? realPolicies.map((p, i) => ({
        label: p.propertyAddress?.split(",")[0] ?? `Policy ${i + 1}`,
        value: p.premium,
        benchmark: Math.round(p.premium * 0.82),
      }))
    : portfolio.assets.map((a) => ({
        label: a.name.split(" ").slice(0, 2).join(" "),
        value: a.insurancePremium,
        benchmark: a.marketInsurance,
      }));

  const coverageTypes = ["All risks · $50M limit", "All risks · $35M limit", "Named perils · $50M limit", "All risks · $25M limit"];
  const carrierQuotes = [
    { carrier: CURRENT_CARRIERS[0], premium: displayPremium, coverage: coverageTypes[0], saving: 0, recommended: false },
    { carrier: COMPETING_CARRIERS[0], premium: Math.round(displayMarket * 1.08), coverage: coverageTypes[1], saving: Math.round(displayPremium - displayMarket * 1.08), recommended: false },
    { carrier: COMPETING_CARRIERS[1], premium: displayMarket, coverage: coverageTypes[0], saving: displayOverpay, recommended: true },
    { carrier: COMPETING_CARRIERS[2], premium: Math.round(displayMarket * 0.95), coverage: coverageTypes[3], saving: Math.round(displayPremium - displayMarket * 0.95), recommended: false },
  ];

  async function handleRetenderSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/leads/insurance-retender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retenderForm),
      });
      setRetenderSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <TopBar title="Insurance" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading || customLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title={hasRealData ? `Insurance — Your Portfolio` : `Insurance — ${portfolio.name}`}
            cells={[
              { label: "Current Premium", value: fmt(displayPremium, sym), sub: hasRealData ? `${realPolicies.length} polic${realPolicies.length === 1 ? "y" : "ies"} uploaded` : "Annual across portfolio" },
              { label: "Market Rate", value: fmt(displayMarket, sym), valueColor: "#5BF0AC", sub: "Arca benchmark" },
              { label: "Annual Overpay", value: fmt(displayOverpay, sym), valueColor: "#FF8080", sub: `${displayOverpayPct}% above market` },
              { label: "Commission", value: fmt(displayCommission, sym), valueColor: "#5BF0AC", sub: "15% of saving · success-only" },
            ]}
          />
        )}

        {/* Issue → Cost → Arca Action bar */}
        {!loading && (
          <div className="rounded-xl px-5 py-3.5" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: "#f06040", fontWeight: 600 }}>Issue:</span>{" "}
              {hasRealData ? realPolicies.length : portfolio.assets.length} asset{(hasRealData ? realPolicies.length : portfolio.assets.length) !== 1 ? "s" : ""} paying {displayOverpayPct}% above market rate ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Cost:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(displayOverpay, sym)}/yr</span> excess premium
              {insuranceCapUplift > 0 ? ` · ~${fmt(insuranceCapUplift, sym)} lost in portfolio value at ${(impliedCapRate * 100).toFixed(1)}% cap rate` : ""} ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
              approaches 12+ carriers direct, manages retender end-to-end — 15% of saving, success-only
            </div>
          </div>
        )}

        {/* Upload CTA when no real data */}
        {!loading && !hasRealData && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#0d1630", border: "1px solid #1647E8" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 3v10M5 8l5-5 5 5" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15h14" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#e8eef5" }}>Showing demo data</div>
              <div className="text-xs" style={{ color: "#5a7a96" }}>Upload your insurance schedule to see your real premiums, renewal dates, and savings.</div>
            </div>
            <Link href="/documents" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "#1647E8", color: "#fff" }}>
              Upload →
            </Link>
          </div>
        )}

        {/* Arca Direct callout */}
        {!loading && (
          <ArcaDirectCallout
            title="Arca places this direct — no broker, no markup"
            body={`Portfolio consolidation across ${hasRealData ? realPolicies.length : portfolio.assets.length} assets unlocks London & New York market rates. Typical saving 22–30% vs incumbent. Arca manages the entire retender end to end.`}
          />
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <CardSkeleton rows={5} />
            <CardSkeleton rows={5} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-2 rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Premium vs Market Rate</div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Per asset — current vs Arca benchmark</div>
                </div>
                <div className="flex items-center gap-3 lg:gap-4 text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: "#FF8080" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#FF8080" }} />
                    Current
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#0A8A4C" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#0A8A4C" }} />
                    Market
                  </span>
                </div>
              </div>
              <BarChart data={barData} height={160} color="#FF8080" benchmarkColor="#0A8A4C" formatValue={(v) => fmt(v, sym)} />
            </div>

            {/* Retender Workflow */}
            <div className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>Retender Workflow</div>
              <div className="text-xs mb-4" style={{ color: "#5a7a96" }}>Arca manages end-to-end</div>
              <div className="space-y-3 mb-5">
                {retenderSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: step.done ? "#0A8A4C" : retenderStarted && i === retenderSteps.findIndex(s => !s.done) ? "#1647E8" : "#1a2d45",
                        color: step.done || (retenderStarted && i === retenderSteps.findIndex(s => !s.done)) ? "#fff" : "#5a7a96",
                      }}
                    >
                      {step.done ? "✓" : i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: step.done ? "#0A8A4C" : "#e8eef5" }}>{step.label}</div>
                      <div className="text-xs" style={{ color: "#5a7a96" }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              {!retenderStarted ? (
                <button
                  onClick={() => setRetenderStarted(true)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Get Better Quotes — save {fmt(displayOverpay, sym)}
                </button>
              ) : (
                <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}>
                  <div className="font-semibold mb-1" style={{ color: "#0A8A4C" }}>Review started</div>
                  <div style={{ color: "#5a7a96" }}>Arca is approaching 8–12 carriers for competitive quotes. Expect results within 5 business days.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Get Competing Quotes — Lead Capture (PRO-142) */}
        {!loading && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader
                title="Get competing quotes from 12 carriers"
                subtitle="Arca's relationships unlock London & New York market. Typical saving 22–30%. Success-only fee — 15% of first year saving."
              />
            </div>

            {retenderSubmitted ? (
              <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#0f2a1c" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l4 4 8-8" stroke="#0A8A4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>Request received</div>
                <div className="text-xs max-w-xs" style={{ color: "#5a7a96" }}>Our team will have competing quotes from 12 carriers within 48 hours.</div>
              </div>
            ) : showRetenderForm ? (
              <form onSubmit={handleRetenderSubmit} className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#8ba0b8" }}>Property address</label>
                    <input
                      type="text"
                      placeholder="123 Main St, Miami, FL"
                      value={retenderForm.propertyAddress}
                      onChange={(e) => setRetenderForm(f => ({ ...f, propertyAddress: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1"
                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#8ba0b8" }}>Current annual premium ({sym})</label>
                    <input
                      type="number"
                      placeholder="e.g. 85000"
                      value={retenderForm.currentPremium}
                      onChange={(e) => setRetenderForm(f => ({ ...f, currentPremium: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#8ba0b8" }}>Current insurer</label>
                    <input
                      type="text"
                      placeholder="e.g. Zurich, AXA"
                      value={retenderForm.insurer}
                      onChange={(e) => setRetenderForm(f => ({ ...f, insurer: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#8ba0b8" }}>Renewal date</label>
                    <input
                      type="date"
                      value={retenderForm.renewalDate}
                      onChange={(e) => setRetenderForm(f => ({ ...f, renewalDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#8ba0b8" }}>Coverage type</label>
                    <input
                      type="text"
                      placeholder="e.g. All risks, Property + liability"
                      value={retenderForm.coverageType}
                      onChange={(e) => setRetenderForm(f => ({ ...f, coverageType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#8ba0b8" }}>Your email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={retenderForm.email}
                      onChange={(e) => setRetenderForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    {submitting ? "Sending…" : "Start Retender →"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRetenderForm(false)}
                    className="text-xs"
                    style={{ color: "#5a7a96" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm max-w-md" style={{ color: "#8ba0b8" }}>
                  Tell us about your policy. Our team will run a parallel retender across 12 carriers and deliver competing quotes within 48 hours. Zero cost if we don&apos;t save you money.
                </p>
                <button
                  onClick={() => setShowRetenderForm(true)}
                  className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Start Retender →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Carrier Quote Comparison */}
        {!loading && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Illustrative Market Rates" subtitle="Benchmark projections based on Arca market data — actual quotes obtained after retender engagement" />
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] px-5 py-2.5 text-xs font-medium" style={{ color: "#5a7a96", borderBottom: "1px solid #1a2d45" }}>
                <span>Carrier</span>
                <span className="text-right pr-8">Annual Premium</span>
                <span className="px-4">Coverage</span>
                <span className="text-right">Saving vs current</span>
              </div>
              <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                {carrierQuotes.map((q) => {
                  const isCurrentCarrier = q.saving === 0;
                  const isInstructed = instructedCarrier === q.carrier;
                  return (
                    <div
                      key={q.carrier}
                      className="grid grid-cols-[1fr_auto_1fr_auto] px-5 py-4 items-center gap-4 transition-colors hover:bg-[#0d1825]"
                      style={q.recommended ? { backgroundColor: "#0a1f10" } : {}}
                    >
                      <div className="flex items-center gap-2.5">
                        {q.recommended && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                            Recommended
                          </span>
                        )}
                        <span className="text-sm font-medium" style={{ color: isCurrentCarrier ? "#5a7a96" : "#e8eef5" }}>
                          {q.carrier}
                          {isCurrentCarrier && <span className="ml-1.5 text-xs" style={{ color: "#3d5a72" }}>(current)</span>}
                        </span>
                      </div>
                      <div className="text-right pr-8">
                        <div className="text-base font-bold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: isCurrentCarrier ? "#FF8080" : q.recommended ? "#0A8A4C" : "#e8eef5" }}>
                          {fmt(q.premium, sym)}/yr
                        </div>
                      </div>
                      <div className="px-4">
                        <span className="text-xs" style={{ color: "#8ba0b8" }}>{q.coverage}</span>
                      </div>
                      <div className="flex items-center gap-3 justify-end">
                        {isCurrentCarrier ? (
                          <span className="text-xs" style={{ color: "#3d5a72" }}>—</span>
                        ) : (
                          <>
                            <div className="text-right">
                              <div className="text-sm font-bold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#0A8A4C" }}>
                                {fmt(q.saving, sym)}
                              </div>
                              <div className="text-xs" style={{ color: "#3d5a72" }}>
                                {Math.round((q.saving / displayPremium) * 100)}% saving
                              </div>
                            </div>
                            {isInstructed ? (
                              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                                ✓ Instructed
                              </div>
                            ) : (
                              <button
                                onClick={() => { setInstructedCarrier(q.carrier); setRetenderStarted(true); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
                                style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#111e2e", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                              >
                                {q.recommended ? "Instruct Arca →" : "Select →"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y" style={{ borderColor: "#1a2d45" }}>
              {carrierQuotes.map((q) => {
                const isCurrentCarrier = q.saving === 0;
                const isInstructed = instructedCarrier === q.carrier;
                return (
                  <div key={q.carrier} className="px-4 py-4" style={q.recommended ? { backgroundColor: "#0a1f10" } : {}}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: isCurrentCarrier ? "#5a7a96" : "#e8eef5" }}>{q.carrier}</span>
                          {isCurrentCarrier && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}>current</span>}
                          {q.recommended && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>Recommended</span>}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{q.coverage}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: isCurrentCarrier ? "#FF8080" : q.recommended ? "#0A8A4C" : "#e8eef5" }}>
                          {fmt(q.premium, sym)}/yr
                        </div>
                        {!isCurrentCarrier && <div className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>saves {fmt(q.saving, sym)}</div>}
                      </div>
                    </div>
                    {!isCurrentCarrier && (
                      isInstructed ? (
                        <div className="mt-2 w-full py-2 rounded-lg text-center text-xs font-semibold" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>✓ Instructed</div>
                      ) : (
                        <button
                          onClick={() => { setInstructedCarrier(q.carrier); setRetenderStarted(true); }}
                          className="mt-2 w-full py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                          style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#111e2e", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                        >
                          {q.recommended ? "Instruct Arca →" : "Select →"}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
              <span className="text-xs" style={{ color: "#5a7a96" }}>Best saving vs current incumbent</span>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#0A8A4C" }}>
                  {fmt(displayOverpay, sym)}/yr
                </span>
                {!instructedCarrier && (
                  <button
                    onClick={() => { setInstructedCarrier(COMPETING_CARRIERS[1]); setRetenderStarted(true); }}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Instruct Arca →
                  </button>
                )}
                {instructedCarrier && (
                  <div className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                    ✓ Arca instructed
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Asset Breakdown — only shown for demo data */}
        {!loading && !hasRealData && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Asset-by-Asset Breakdown" subtitle={`${portfolio.assets.length} assets · ${fmt(totalOverpay, sym)} total recoverable`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {portfolio.assets
                .slice()
                .sort((a, b) => (b.insurancePremium - b.marketInsurance) - (a.insurancePremium - a.marketInsurance))
                .map((asset) => {
                  const overpay = asset.insurancePremium - asset.marketInsurance;
                  const pct = Math.round((overpay / asset.insurancePremium) * 100);
                  return (
                    <div key={asset.id} className="px-5 py-4 transition-colors hover:bg-[#0d1825]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link href={`/assets/${asset.id}`} className="text-sm font-medium hover:underline underline-offset-2" style={{ color: "#e8eef5" }}>{asset.name}</Link>
                            <Badge variant={pct > 25 ? "red" : pct > 15 ? "amber" : "gray"}>{pct}% overpay</Badge>
                          </div>
                          <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>{asset.location} · {asset.type}</div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45", maxWidth: 240 }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct * 2.5)}%`, backgroundColor: "#FF8080" }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Current</div>
                            <div className="text-sm font-semibold" style={{ color: "#FF8080" }}>{fmt(asset.insurancePremium, sym)}</div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Market</div>
                            <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>{fmt(asset.marketInsurance, sym)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Saving</div>
                            <div className="text-base font-bold" style={{ color: "#5BF0AC", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(overpay, sym)}</div>
                          </div>
                          <button
                            onClick={() => setRetenderStarted(true)}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C", color: "#0A8A4C" }}
                          >
                            Include →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
              <span className="text-xs" style={{ color: "#5a7a96" }}>Total annual saving on placement</span>
              <span className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(totalOverpay, sym)}</span>
            </div>
          </div>
        )}

        {/* Real Policies Table — shown when user has uploaded docs */}
        {!loading && hasRealData && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Your Policies" subtitle={`${realPolicies.length} polic${realPolicies.length === 1 ? "y" : "ies"} from uploaded documents`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {realPolicies.map((policy) => {
                const benchmarkPrem = Math.round(policy.premium * 0.82);
                const saving = policy.premium - benchmarkPrem;
                return (
                  <div key={policy.id} className="px-5 py-4 hover:bg-[#0d1825] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{policy.insurer}</span>
                          {policy.coverageType && <Badge variant="gray">{policy.coverageType}</Badge>}
                        </div>
                        {policy.propertyAddress && <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>{policy.propertyAddress}</div>}
                        {policy.renewalDate && <div className="text-xs" style={{ color: "#5a7a96" }}>Renewal: {policy.renewalDate}</div>}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-xs" style={{ color: "#5a7a96" }}>Premium</div>
                          <div className="text-sm font-semibold" style={{ color: "#FF8080" }}>{fmt(policy.premium, sym)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs" style={{ color: "#5a7a96" }}>Potential saving</div>
                          <div className="text-sm font-bold" style={{ color: "#5BF0AC", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(saving, sym)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
