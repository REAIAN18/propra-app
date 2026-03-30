"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { EnrichmentResult } from "@/app/api/audit/enrich/route";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

// ── Benchmark data — per single asset, calibrated ranges ───────────────────
// Annual savings & income: insurance re-broking + energy retender + new income streams
// Source: FL commercial / SE UK logistics market data. Defensible per PRO-472.
const BENCHMARKS: Record<string, {
  insuranceLow: number; insuranceHigh: number;
  energyLow: number; energyHigh: number;
  incomeLow: number; incomeHigh: number;
}> = {
  //                   ins           energy        income        total range
  industrial:  { insuranceLow: 2500, insuranceHigh: 7000, energyLow: 2500, energyHigh: 8000, incomeLow: 3000, incomeHigh: 7000 },  // $8k–$22k
  logistics:   { insuranceLow: 3000, insuranceHigh: 8000, energyLow: 3000, energyHigh: 9000, incomeLow: 3000, incomeHigh: 8000 },  // $9k–$25k
  office:      { insuranceLow: 3500, insuranceHigh: 9500, energyLow: 3500, energyHigh:10000, incomeLow: 3000, incomeHigh: 8500 },  // $10k–$28k
  retail:      { insuranceLow: 2500, insuranceHigh: 6000, energyLow: 2000, energyHigh: 6000, incomeLow: 2500, incomeHigh: 6000 },  // $7k–$18k
  mixed:       { insuranceLow: 2500, insuranceHigh: 7000, energyLow: 2500, energyHigh: 7000, incomeLow: 3000, incomeHigh: 6000 },  // $8k–$20k
  warehouse:   { insuranceLow: 3000, insuranceHigh: 8000, energyLow: 3000, energyHigh: 9000, incomeLow: 3000, incomeHigh: 8000 },  // $9k–$25k
};

const CAP_RATE = 0.065; // 6.5% — standard for FL commercial / SE UK logistics


function detectAssetType(input: string): string {
  const l = input.toLowerCase();
  if (l.includes("industrial")) return "industrial";
  if (l.includes("logistic") || l.includes("distribution")) return "logistics";
  if (l.includes("office")) return "office";
  if (l.includes("retail") || l.includes("shop")) return "retail";
  if (l.includes("warehouse")) return "warehouse";
  return "mixed";
}

function detectAssetCount(input: string): number {
  // Try to find numbers in input like "I have 5 assets" or 5 address lines
  const match = input.match(/\b(\d+)\b/);
  if (match) return Math.min(30, Math.max(1, parseInt(match[1])));
  // Count newlines (multiple addresses)
  const lines = input.split("\n").filter((l) => l.trim().length > 0);
  return Math.max(1, lines.length);
}

function fmt(v: number, sym = "$") {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function detectCurrencySym(location: string): "$" | "£" {
  const l = location.toLowerCase();
  if (l.includes("england") || l.includes(" uk") || l.includes("united kingdom") ||
      l.includes("kent") || l.includes("surrey") || l.includes("essex") ||
      l.includes("hertford") || l.includes("london") || l.includes("southeast england") ||
      l.includes("se england")) return "£";
  return "$";
}

function applyFx(v: number, sym: "$" | "£"): number {
  return sym === "£" ? Math.round(v * 0.8) : v;
}

interface Estimate {
  insurance: number;  // midpoint for breakdown cards
  energy: number;
  income: number;
  total: number;      // midpoint for email capture
  annualLow: number;
  annualHigh: number;
  valueUpliftLow: number;
  valueUpliftHigh: number;
  assetType: string;
  assetCount: number;
}

// Deterministic hash so the same portfolio input always yields the same numbers.
// Uses a simple djb2-style hash so there's no crypto dependency.
function hashInput(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function computeEstimate(portfolioInput: string): Estimate {
  const assetType = detectAssetType(portfolioInput);
  const assetCount = detectAssetCount(portfolioInput);
  const bench = BENCHMARKS[assetType] ?? BENCHMARKS.mixed;

  // Diminishing returns: 1 asset = 1x, 5 assets ≈ 4.3x, 10 ≈ 7.9x, 20 ≈ 14.9x
  const scale = Math.pow(assetCount, 0.85);

  // Deterministic midpoint position within range (40–60%) — stable across refreshes
  const varFactor = 0.4 + (hashInput(portfolioInput.trim().toLowerCase()) % 1000) / 5000;

  const annualLow  = Math.round((bench.insuranceLow  + bench.energyLow  + bench.incomeLow)  * scale);
  const annualHigh = Math.round((bench.insuranceHigh + bench.energyHigh + bench.incomeHigh) * scale);

  const insurance = Math.round((bench.insuranceLow + (bench.insuranceHigh - bench.insuranceLow) * varFactor) * scale);
  const energy    = Math.round((bench.energyLow    + (bench.energyHigh    - bench.energyLow)    * varFactor) * scale);
  const income    = Math.round((bench.incomeLow    + (bench.incomeHigh    - bench.incomeLow)    * varFactor) * scale);

  return {
    insurance,
    energy,
    income,
    total: insurance + energy + income,
    annualLow,
    annualHigh,
    valueUpliftLow:  Math.round(annualLow  / CAP_RATE),
    valueUpliftHigh: Math.round(annualHigh / CAP_RATE),
    assetType,
    assetCount,
  };
}

// Detect if the input looks like a specific street address (has a number + street)
function _extractAddresses(input: string): string[] {
  const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.filter((line) => /^\d+\s+[A-Za-z]/.test(line));
}

const ASSET_TYPE_OPTIONS = [
  { value: "industrial", label: "Industrial" },
  { value: "logistics", label: "Logistics" },
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
  { value: "mixed", label: "Mixed" },
];

const COUNT_PRESETS = [1, 2, 5, 8, 12, 20];

// Smooth count-up animation — makes the number feel earned, not instant
function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setVal(Math.round(from + (target - from) * ease));
      if (t >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

function AuditPageInner() {
  const searchParams = useSearchParams();

  // Wizard state
  const [assetCount, setAssetCount] = useState(0);
  const [assetType, setAssetType] = useState("");
  const [location, setLocation] = useState("");

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enrichments, setEnrichments] = useState<EnrichmentResult[]>([]);
  const [enriching, _setEnriching] = useState(false);

  // Synthesise a natural-language portfolio string from wizard fields
  function buildPortfolioInput(count: number, type: string, loc: string): string {
    if (count === 0) return "";
    const typeStr = type || "mixed";
    const locStr = loc.trim() ? ` in ${loc.trim()}` : "";
    return `I have ${count} ${typeStr} asset${count !== 1 ? "s" : ""}${locStr}`;
  }

  // Pre-fill from URL params (for outreach links)
  useEffect(() => {
    const portfolioParam = searchParams.get("portfolio");
    const emailParam = searchParams.get("email");
    if (portfolioParam) {
      const detectedCount = detectAssetCount(portfolioParam);
      const detectedType = detectAssetType(portfolioParam);
      setAssetCount(detectedCount);
      setAssetType(detectedType);
      // Extract location hint if present
      const locMatch = portfolioParam.match(/in ([A-Za-z ,]+)$/i);
      if (locMatch) setLocation(locMatch[1].trim());
    }
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  // Live estimate — updates whenever wizard fields change
  useEffect(() => {
    if (assetCount === 0) {
      setEstimate(null);
      return;
    }
    const input = buildPortfolioInput(assetCount, assetType, location);
    setEstimate(computeEstimate(input));
    setEmailSent(false);
    setEnrichments([]);
  }, [assetCount, assetType, location]);

  const portfolioInput = buildPortfolioInput(assetCount, assetType, location);
  const sym = detectCurrencySym(location);
  const displayEstimate = estimate
    ? {
        ...estimate,
        insurance:       applyFx(estimate.insurance, sym),
        energy:          applyFx(estimate.energy, sym),
        income:          applyFx(estimate.income, sym),
        total:           applyFx(estimate.total, sym),
        annualLow:       applyFx(estimate.annualLow, sym),
        annualHigh:      applyFx(estimate.annualHigh, sym),
        valueUpliftLow:  applyFx(estimate.valueUpliftLow, sym),
        valueUpliftHigh: applyFx(estimate.valueUpliftHigh, sym),
      }
    : null;
  const animatedUpliftHigh = useCountUp(displayEstimate?.valueUpliftHigh ?? 0);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !estimate) return;
    setSubmitting(true);

    try {
      // POST to simple API endpoint — store lead
      await fetch("/api/audit-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          portfolioInput,
          estimate,
          enrichments: enrichments.length > 0 ? enrichments : undefined,
          createdAt: new Date().toISOString(),
        }),
      }).catch(() => {
        // Fail silently — store in localStorage as fallback
      });
    } finally {
      // Always store locally as backup
      try {
        const leads = JSON.parse(localStorage.getItem("realhq_audit_leads") ?? "[]");
        leads.push({ email, portfolioInput, estimate, createdAt: new Date().toISOString() });
        localStorage.setItem("realhq_audit_leads", JSON.stringify(leads));
      } catch {}

      setEmailSent(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--s2)" }}>
      {/* ── Nav ────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--bdr)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#34d399" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "var(--tx)", letterSpacing: "0.12em" }}
          >
            RealHQ
          </span>
        </Link>
        <Link
          href="/signup"
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--tx2)" }}
        >
          See your portfolio →
        </Link>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1 px-6 lg:px-12 py-12 lg:py-20">
        <div className="max-w-2xl mx-auto">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #34d399", color: "#34d399" }}>
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#34d399" }} />
            Instant estimate · 30 seconds · No account needed
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl leading-[1.1] mb-4"
            style={{ fontFamily: SERIF, color: "var(--tx)" }}
          >
            See what your portfolio<br />
            is <span style={{ color: "#F5A94A" }}>leaving behind</span>
          </h1>
          <p className="text-lg mb-10 max-w-lg" style={{ color: "var(--tx2)" }}>
            Enter your address. We&apos;ll show you what we find.
          </p>

          {/* ── Wizard input ───────────────────────────────── */}
          <div
            className="rounded-2xl p-6 sm:p-8 mb-8 space-y-7"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            {/* Step 1 — Asset count */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--tx3)", letterSpacing: "0.1em" }}>
                1 · How many properties?
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setAssetCount(n)}
                    className="h-10 w-12 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90"
                    style={{
                      backgroundColor: assetCount === n ? "#34d399" : "var(--s2)",
                      color: assetCount === n ? "#fff" : "var(--tx2)",
                      border: `1px solid ${assetCount === n ? "#34d399" : "var(--bdr)"}`,
                    }}
                  >
                    {n === 20 ? "20+" : n}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={assetCount === 0 ? "" : assetCount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setAssetCount(Number.isFinite(v) && v > 0 ? Math.min(200, v) : 0);
                  }}
                  placeholder="Other"
                  className="h-10 w-20 rounded-xl px-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "var(--s2)",
                    border: `1px solid ${assetCount > 0 && !COUNT_PRESETS.includes(assetCount) ? "#34d399" : "var(--bdr)"}`,
                    color: "var(--tx)",
                  }}
                />
              </div>
            </div>

            {/* Step 2 — Asset type */}
            {assetCount > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--tx3)", letterSpacing: "0.1em" }}>
                  2 · What type?
                </div>
                <div className="flex flex-wrap gap-2">
                  {ASSET_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAssetType(opt.value)}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90"
                      style={{
                        backgroundColor: assetType === opt.value ? "#E8F5EE" : "var(--s2)",
                        color: assetType === opt.value ? "#34d399" : "var(--tx2)",
                        border: `1px solid ${assetType === opt.value ? "#34d399" : "var(--bdr)"}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 — Location (optional) */}
            {assetCount > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--tx3)", letterSpacing: "0.1em" }}>
                  3 · Where? <span className="font-normal normal-case" style={{ color: "#D1D5DB" }}>(optional)</span>
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. South Florida, Southeast England, London…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "var(--s2)",
                    border: "1px solid var(--bdr)",
                    color: "var(--tx)",
                    caretColor: "#34d399",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--bdr)")}
                />
              </div>
            )}
          </div>

          {/* ── Estimate output ────────────────────────────── */}
          {estimate && displayEstimate && (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--bdr)" }} />
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--tx3)" }}>
                  Preliminary estimate · {estimate.assetCount} asset{estimate.assetCount !== 1 ? "s" : ""} · {estimate.assetType}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--bdr)" }} />
              </div>

              {/* Total */}
              <div
                className="rounded-2xl p-6 sm:p-8 mb-4"
                style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
              >
                {/* Line 1: annual savings range */}
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--tx3)", letterSpacing: "0.1em" }}>
                  Est. annual savings &amp; income
                </p>
                <div
                  className="text-3xl sm:text-4xl font-bold mb-1 tabular-nums"
                  style={{ fontFamily: SERIF, color: "#F5A94A" }}
                >
                  {fmt(displayEstimate!.annualLow, sym)} – {fmt(displayEstimate!.annualHigh, sym)}<span className="text-lg font-normal" style={{ color: "var(--tx3)" }}> /yr</span>
                </div>
                <p className="text-xs mb-5" style={{ color: "var(--tx3)" }}>
                  Across insurance re-broking, energy retender &amp; new income streams
                </p>

                {/* Line 2: value uplift */}
                <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#34d399", letterSpacing: "0.1em" }}>
                    Implied asset value uplift at 6.5% cap rate
                  </p>
                  <div
                    className="text-2xl sm:text-3xl font-bold tabular-nums"
                    style={{ fontFamily: SERIF, color: "#34d399" }}
                  >
                    +{fmt(displayEstimate!.valueUpliftLow, sym)} – +{fmt(animatedUpliftHigh, sym)}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--bdr)", paddingTop: "1.25rem" }}>
                  <Link
                    href={`/signup?assets=${estimate.assetCount}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#34d399", color: "#fff" }}
                  >
                    Start your full analysis →
                  </Link>
                  <p className="mt-2 text-xs" style={{ color: "#D1D5DB" }}>
                    Or enter your email below to get the estimate sent to you first
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {[
                  { label: "Insurance saving", value: displayEstimate.insurance, accent: "#F5A94A", desc: "Re-broking with specialist carriers" },
                  { label: "Energy saving", value: displayEstimate.energy, accent: "#F5A94A", desc: "Supplier switch + procurement" },
                  { label: "New income", value: displayEstimate.income, accent: "#34d399", desc: "Solar, EV charging, masts, parking" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
                  >
                    <div
                      className="text-2xl font-bold mb-1"
                      style={{ fontFamily: SERIF, color: item.accent }}
                    >
                      {fmt(item.value, sym)}
                    </div>
                    <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                      {item.label}
                    </div>
                    <div className="text-xs" style={{ color: "var(--tx3)" }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Property enrichment cards ───────────────── */}
              {enriching && (
                <div className="mb-6 flex items-center gap-2 text-xs" style={{ color: "var(--tx3)" }}>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="var(--bdr)" strokeWidth="1.5" />
                    <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Enriching with public property data…
                </div>
              )}
              {enrichments.filter((e) => e.floodZone || e.property || e.narrative).map((enr, i) => (
                <div key={i} className="mb-4 rounded-xl p-4 space-y-3"
                  style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--tx2)" }}>{enr.address}</p>
                  <div className="flex flex-wrap gap-3">
                    {enr.floodZone && (
                      <div className="flex items-start gap-2 flex-1 min-w-[160px]">
                        <span className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: enr.floodZone.isHighRisk ? "#FF8080" : "#34d399" }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "var(--tx)" }}>
                            Flood Zone {enr.floodZone.zone}
                          </p>
                          <p className="text-xs" style={{ color: "var(--tx3)" }}>{enr.floodZone.description}</p>
                          {enr.floodZone.isHighRisk && (
                            <p className="text-xs mt-0.5" style={{ color: "#F5A94A" }}>
                              RealHQ can identify flood-specific discounts
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {enr.property?.assessedValue && (
                      <div className="flex items-start gap-2 flex-1 min-w-[160px]">
                        <span className="mt-0.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "var(--tx3)" }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "var(--tx)" }}>
                            Assessed {enr.property.assessedValue >= 1_000_000
                              ? `$${(enr.property.assessedValue / 1_000_000).toFixed(1)}M`
                              : `$${Math.round(enr.property.assessedValue / 1000)}k`}
                            {enr.property.yearBuilt ? `, built ${enr.property.yearBuilt}` : ""}
                          </p>
                          <p className="text-xs" style={{ color: "var(--tx3)" }}>
                            {enr.property.sqft ? `${enr.property.sqft.toLocaleString()} sq ft · ` : ""}
                            {enr.property.useCode ?? "FL county record"}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
                            Enables rebuild cost benchmarking for insurance
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {enr.narrative && (
                    <div className="pt-2 mt-1" style={{ borderTop: "1px solid var(--bdr)" }}>
                      <p className="text-xs italic leading-relaxed" style={{ color: "var(--tx2)" }}>
                        {enr.narrative}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Disclaimer */}
              <p className="text-xs mb-8 text-center" style={{ color: "#3d5a75" }}>
                Preliminary estimate based on {estimate.assetType} asset class data.
                Upload your documents for a full analysis.
              </p>

              {/* ── Email capture ──────────────────────────── */}
              {!emailSent ? (
                <div
                  className="rounded-2xl p-6 sm:p-8"
                  style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
                >
                  <h2
                    className="text-xl sm:text-2xl mb-2"
                    style={{ fontFamily: SERIF, color: "var(--tx)" }}
                  >
                    Get your {fmt(displayEstimate!.annualLow, sym)}–{fmt(displayEstimate!.annualHigh, sym)}/yr breakdown
                  </h2>
                  <p className="text-sm mb-5" style={{ color: "var(--tx2)" }}>
                    Enter your email and we&apos;ll send you the breakdown — or upload your documents now for a full analysis.
                  </p>
                  <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        backgroundColor: "var(--s2)",
                        border: "1px solid var(--bdr)",
                        color: "var(--tx)",
                        caretColor: "#34d399",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--bdr)")}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 whitespace-nowrap"
                      style={{ backgroundColor: "#34d399", color: "#fff" }}
                    >
                      {submitting ? "Sending…" : "Send my breakdown →"}
                    </button>
                  </form>
                </div>
              ) : (
                <div
                  className="rounded-2xl p-6 sm:p-8"
                  style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#34d399" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8L6.5 11.5L13 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-base font-semibold" style={{ color: "var(--tx)" }}>
                      Check your inbox
                    </span>
                  </div>
                  <p className="text-sm mb-6" style={{ color: "var(--tx2)" }}>
                    Your estimate breakdown is on its way to <strong style={{ color: "var(--tx)" }}>{email}</strong>.
                    {" "}For a full analysis of your actual portfolio, upload your documents on the next screen.
                  </p>

                  {/* CTAs */}
                  <div style={{ borderTop: "1px solid var(--bdr)", paddingTop: "1.5rem" }} className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Link
                        href={`/signup?email=${encodeURIComponent(email)}&assets=${estimate?.assetCount ?? ""}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: "#34d399", color: "#fff" }}
                      >
                        Start your full analysis →
                      </Link>
                      <Link
                        href={`/signup?email=${encodeURIComponent(email)}&assets=${estimate?.assetCount ?? ""}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: "transparent", color: "#7c6af0", border: "1px solid #7c6af0" }}
                      >
                        Create your free account →
                      </Link>
                    </div>
                    <Link
                      href={`/dashboard?welcome=1&opp=${estimate?.total ?? 0}`}
                      className="text-xs hover:opacity-70 transition-opacity"
                      style={{ color: "var(--tx3)" }}
                    >
                      Explore live demo first →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── How it works ─────────────────────────────── */}
          <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--bdr)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#D1D5DB", letterSpacing: "0.1em" }}>How RealHQ works</p>
            <div className="flex flex-col sm:flex-row gap-6">
              {[
                { step: "1", title: "It just starts with an address.", desc: "No documents needed." },
                { step: "2", title: "RealHQ builds a picture of your asset from public data.", desc: "Insurance, energy, income — all in one view." },
                { step: "3", title: "See what we found. Then decide what to do next.", desc: "" },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3 flex-1">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: "var(--s1)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: "var(--tx)" }}>{s.title}</p>
                    <p className="text-xs" style={{ color: "var(--tx3)" }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense>
      <AuditPageInner />
    </Suspense>
  );
}
