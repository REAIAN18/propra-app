"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { EnrichmentResult } from "@/app/api/audit/enrich/route";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

// ── Benchmark data derived from fl-mixed + se-logistics datasets ───────────
const BENCHMARKS: Record<string, { insurance: number; energy: number; income: number }> = {
  industrial:  { insurance: 22000, energy: 44000, income: 38000 },
  logistics:   { insurance: 24000, energy: 48000, income: 42000 },
  office:      { insurance: 28000, energy: 50000, income: 55000 },
  retail:      { insurance: 18000, energy: 32000, income: 28000 },
  mixed:       { insurance: 25000, energy: 46000, income: 44000 },
  warehouse:   { insurance: 20000, energy: 40000, income: 35000 },
};

const DEFAULT_BENCHMARK = BENCHMARKS.mixed;

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
  insurance: number;
  energy: number;
  income: number;
  total: number;
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
  const bench = BENCHMARKS[assetType] ?? DEFAULT_BENCHMARK;
  // Deterministic variance factor (0.85–1.15) seeded from input so numbers are stable across page refreshes
  const factor = 0.85 + (hashInput(portfolioInput.trim().toLowerCase()) % 1000) / 3333;
  const insurance = Math.round(bench.insurance * assetCount * factor);
  const energy = Math.round(bench.energy * assetCount * factor);
  const income = Math.round(bench.income * assetCount * factor);
  return { insurance, energy, income, total: insurance + energy + income, assetType, assetCount };
}

// Detect if the input looks like a specific street address (has a number + street)
function extractAddresses(input: string): string[] {
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

const COUNT_PRESETS = [2, 5, 8, 12, 20];

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
  const [enriching, setEnriching] = useState(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetCount, assetType, location]);

  const portfolioInput = buildPortfolioInput(assetCount, assetType, location);
  const sym = detectCurrencySym(location);
  const displayEstimate = estimate
    ? {
        ...estimate,
        insurance: applyFx(estimate.insurance, sym),
        energy: applyFx(estimate.energy, sym),
        income: applyFx(estimate.income, sym),
        total: applyFx(estimate.insurance + estimate.energy + estimate.income, sym),
      }
    : null;
  const animatedTotal = useCountUp(displayEstimate?.total ?? 0);

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
        const leads = JSON.parse(localStorage.getItem("arca_audit_leads") ?? "[]");
        leads.push({ email, portfolioInput, estimate, createdAt: new Date().toISOString() });
        localStorage.setItem("arca_audit_leads", JSON.stringify(leads));
      } catch {}

      setEmailSent(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0B1622" }}>
      {/* ── Nav ────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4 shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#111827", letterSpacing: "0.12em" }}
          >
            RealHQ
          </span>
        </Link>
        <Link
          href="/book"
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "#6B7280" }}
        >
          Book a call →
        </Link>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1 px-6 lg:px-12 py-12 lg:py-20">
        <div className="max-w-2xl mx-auto">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #0A8A4C", color: "#0A8A4C" }}>
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
            Instant estimate · 30 seconds · No account needed
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl leading-[1.1] mb-4"
            style={{ fontFamily: SERIF, color: "#111827" }}
          >
            See what your portfolio<br />
            is <span style={{ color: "#F5A94A" }}>leaving behind</span>
          </h1>
          <p className="text-lg mb-6 max-w-lg" style={{ color: "#6B7280" }}>
            Tell us about your portfolio. We calculate your insurance, energy, and income
            opportunity in under 30 seconds — no sign-up, no contracts.
          </p>

          {/* Trust strip — visible before wizard so skeptical owners feel safe */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10">
            {[
              "Commission-only — we earn when you save",
              "Full analysis in 48 hours",
              "No contracts or lock-in",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm" style={{ color: "#9CA3AF" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </span>
            ))}
          </div>

          {/* ── Wizard input ───────────────────────────────── */}
          <div
            className="rounded-2xl p-6 sm:p-8 mb-8 space-y-7"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            {/* Step 1 — Asset count */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
                1 · How many properties?
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setAssetCount(n)}
                    className="h-10 w-12 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90"
                    style={{
                      backgroundColor: assetCount === n ? "#0A8A4C" : "#0B1622",
                      color: assetCount === n ? "#fff" : "#6B7280",
                      border: `1px solid ${assetCount === n ? "#0A8A4C" : "#E5E7EB"}`,
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
                    backgroundColor: "#0B1622",
                    border: `1px solid ${assetCount > 0 && !COUNT_PRESETS.includes(assetCount) ? "#0A8A4C" : "#E5E7EB"}`,
                    color: "#111827",
                  }}
                />
              </div>
            </div>

            {/* Step 2 — Asset type */}
            {assetCount > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
                  2 · What type?
                </div>
                <div className="flex flex-wrap gap-2">
                  {ASSET_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAssetType(opt.value)}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90"
                      style={{
                        backgroundColor: assetType === opt.value ? "#0A8A4C22" : "#0B1622",
                        color: assetType === opt.value ? "#0A8A4C" : "#6B7280",
                        border: `1px solid ${assetType === opt.value ? "#0A8A4C" : "#E5E7EB"}`,
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
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
                  3 · Where? <span className="font-normal normal-case" style={{ color: "#D1D5DB" }}>(optional)</span>
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. South Florida, Southeast England, London…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "#0B1622",
                    border: "1px solid #E5E7EB",
                    color: "#111827",
                    caretColor: "#0A8A4C",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
            )}
          </div>

          {/* ── Estimate output ────────────────────────────── */}
          {estimate && displayEstimate && (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-px flex-1" style={{ backgroundColor: "#E5E7EB" }} />
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
                  Preliminary estimate · {estimate.assetCount} asset{estimate.assetCount !== 1 ? "s" : ""} · {estimate.assetType}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "#E5E7EB" }} />
              </div>

              {/* Total */}
              <div
                className="rounded-2xl p-6 sm:p-8 mb-4 text-center"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: "#6B7280" }}>
                  Estimated annual opportunity
                </p>
                <div
                  className="text-5xl sm:text-6xl font-bold mb-2 tabular-nums"
                  style={{ fontFamily: SERIF, color: "#F5A94A" }}
                >
                  {fmt(animatedTotal, sym)}
                </div>
                <p className="text-sm mb-5" style={{ color: "#9CA3AF" }}>
                  per year across insurance, energy &amp; income
                </p>
                <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "1.25rem" }}>
                  <Link
                    href={`/book?assets=${estimate.assetCount}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Book a 20-min call to claim this →
                  </Link>
                  <p className="mt-2 text-xs" style={{ color: "#D1D5DB" }}>
                    Or enter your email below to get the breakdown first
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {[
                  { label: "Insurance saving", value: displayEstimate.insurance, accent: "#F5A94A", desc: "Re-broking with specialist carriers" },
                  { label: "Energy saving", value: displayEstimate.energy, accent: "#F5A94A", desc: "Supplier switch + procurement" },
                  { label: "New income", value: displayEstimate.income, accent: "#0A8A4C", desc: "Solar, EV charging, masts, parking" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
                  >
                    <div
                      className="text-2xl font-bold mb-1"
                      style={{ fontFamily: SERIF, color: item.accent }}
                    >
                      {fmt(item.value, sym)}
                    </div>
                    <div className="text-sm font-medium mb-1" style={{ color: "#111827" }}>
                      {item.label}
                    </div>
                    <div className="text-xs" style={{ color: "#9CA3AF" }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Property enrichment cards ───────────────── */}
              {enriching && (
                <div className="mb-6 flex items-center gap-2 text-xs" style={{ color: "#9CA3AF" }}>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="#E5E7EB" strokeWidth="1.5" />
                    <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Enriching with public property data…
                </div>
              )}
              {enrichments.filter((e) => e.floodZone || e.property || e.narrative).map((enr, i) => (
                <div key={i} className="mb-4 rounded-xl p-4 space-y-3"
                  style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                  <p className="text-xs font-semibold truncate" style={{ color: "#6B7280" }}>{enr.address}</p>
                  <div className="flex flex-wrap gap-3">
                    {enr.floodZone && (
                      <div className="flex items-start gap-2 flex-1 min-w-[160px]">
                        <span className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: enr.floodZone.isHighRisk ? "#FF8080" : "#0A8A4C" }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "#111827" }}>
                            Flood Zone {enr.floodZone.zone}
                          </p>
                          <p className="text-xs" style={{ color: "#9CA3AF" }}>{enr.floodZone.description}</p>
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
                        <span className="mt-0.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#9CA3AF" }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "#111827" }}>
                            Assessed {enr.property.assessedValue >= 1_000_000
                              ? `$${(enr.property.assessedValue / 1_000_000).toFixed(1)}M`
                              : `$${Math.round(enr.property.assessedValue / 1000)}k`}
                            {enr.property.yearBuilt ? `, built ${enr.property.yearBuilt}` : ""}
                          </p>
                          <p className="text-xs" style={{ color: "#9CA3AF" }}>
                            {enr.property.sqft ? `${enr.property.sqft.toLocaleString()} sq ft · ` : ""}
                            {enr.property.useCode ?? "FL county record"}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                            Enables rebuild cost benchmarking for insurance
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {enr.narrative && (
                    <div className="pt-2 mt-1" style={{ borderTop: "1px solid #E5E7EB" }}>
                      <p className="text-xs italic leading-relaxed" style={{ color: "#6B7280" }}>
                        {enr.narrative}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Disclaimer */}
              <p className="text-xs mb-8 text-center" style={{ color: "#3d5a75" }}>
                Preliminary benchmarks based on {estimate.assetType} asset class averages.
                Full analysis delivered within 48 hours.
              </p>

              {/* ── Email capture ──────────────────────────── */}
              {!emailSent ? (
                <div
                  className="rounded-2xl p-6 sm:p-8"
                  style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
                >
                  <h2
                    className="text-xl sm:text-2xl mb-2"
                    style={{ fontFamily: SERIF, color: "#111827" }}
                  >
                    Get your {fmt(estimate.total)} breakdown
                  </h2>
                  <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
                    We&apos;ll send a property-by-property breakdown within 48 hours.
                    No account. No spam. No obligation.
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
                        backgroundColor: "#0B1622",
                        border: "1px solid #E5E7EB",
                        color: "#111827",
                        caretColor: "#0A8A4C",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                      onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 whitespace-nowrap"
                      style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
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
                    <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#0A8A4C" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8L6.5 11.5L13 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-base font-semibold" style={{ color: "#111827" }}>
                      Check your inbox
                    </span>
                  </div>
                  <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                    Your estimate breakdown is on its way to <strong style={{ color: "#111827" }}>{email}</strong>.
                    {" "}For a full analysis of your actual documents, book a call.
                  </p>

                  {/* CTAs */}
                  <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "1.5rem" }} className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Link
                        href={`/book?assets=${estimate?.assetCount ?? ""}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                      >
                        Book a 20-min call →
                      </Link>
                      <Link
                        href={`/signup?email=${encodeURIComponent(email)}&assets=${estimate?.assetCount ?? ""}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E8" }}
                      >
                        Create your free account →
                      </Link>
                    </div>
                    <Link
                      href={`/dashboard?welcome=1&opp=${estimate?.total ?? 0}`}
                      className="text-xs hover:opacity-70 transition-opacity"
                      style={{ color: "#9CA3AF" }}
                    >
                      Explore live demo first →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── How it works ─────────────────────────────── */}
          <div className="mt-12 pt-8" style={{ borderTop: "1px solid #E5E7EB" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#D1D5DB", letterSpacing: "0.1em" }}>How RealHQ works</p>
            <div className="flex flex-col sm:flex-row gap-6">
              {[
                { step: "1", title: "You enter your portfolio", desc: "30 seconds. No documents needed." },
                { step: "2", title: "We calculate your opportunity", desc: "Insurance, energy & income — benchmarked to your asset class." },
                { step: "3", title: "RealHQ delivers the savings", desc: "Commission-only. We earn when you do." },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3 flex-1">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: "#fff", color: "#9CA3AF", border: "1px solid #E5E7EB" }}>
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: "#111827" }}>{s.title}</p>
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>{s.desc}</p>
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
