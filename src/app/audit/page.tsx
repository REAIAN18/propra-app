"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

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

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1000)}k`;
  return `$${v.toLocaleString()}`;
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

function AuditPageInner() {
  const searchParams = useSearchParams();
  const [portfolioInput, setPortfolioInput] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from URL params (for HoG outreach links)
  useEffect(() => {
    const portfolio = searchParams.get("portfolio");
    const emailParam = searchParams.get("email");
    if (portfolio) {
      setPortfolioInput(portfolio);
      // Auto-compute estimate so prospect sees numbers immediately
      setEstimate(computeEstimate(portfolio));
    }
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  function handleEstimate() {
    if (!portfolioInput.trim()) return;
    setEstimate(computeEstimate(portfolioInput));
    setSubmitted(false);
    setEmailSent(false);
  }

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
        style={{ borderBottom: "1px solid #1a2d45" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
          >
            Arca
          </span>
        </Link>
        <a
          href="https://cal.com/arca/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "#8ba0b8" }}
        >
          Book a call →
        </a>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1 px-6 lg:px-12 py-12 lg:py-20">
        <div className="max-w-2xl mx-auto">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C", color: "#0A8A4C" }}>
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
            Free Portfolio Audit · No account needed
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl leading-[1.1] mb-4"
            style={{ fontFamily: SERIF, color: "#e8eef5" }}
          >
            See what your portfolio<br />
            is <span style={{ color: "#F5A94A" }}>leaving behind</span>
          </h1>
          <p className="text-lg mb-10 max-w-lg" style={{ color: "#8ba0b8" }}>
            Enter your assets below. Arca estimates your insurance, energy, and income
            opportunity in seconds — no sign-up required.
          </p>

          {/* ── Input form ─────────────────────────────────── */}
          <div
            className="rounded-2xl p-6 sm:p-8 mb-8"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <label className="block text-sm font-medium mb-3" style={{ color: "#e8eef5" }}>
              Your portfolio
            </label>
            <p className="text-sm mb-4" style={{ color: "#5a7a96" }}>
              Enter 1–5 addresses, or describe your portfolio: e.g.{" "}
              <em>&ldquo;I have 6 industrial assets in Southeast England&rdquo;</em>
            </p>
            <textarea
              value={portfolioInput}
              onChange={(e) => setPortfolioInput(e.target.value)}
              rows={5}
              placeholder={"12 Park Industrial Estate, Sheffield\n\nor: I have 4 logistics assets in the Midlands"}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all"
              style={{
                backgroundColor: "#0B1622",
                border: "1px solid #1a2d45",
                color: "#e8eef5",
                caretColor: "#0A8A4C",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
              onBlur={(e) => (e.target.style.borderColor = "#1a2d45")}
            />
            <button
              onClick={handleEstimate}
              disabled={!portfolioInput.trim()}
              className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Show my opportunity →
            </button>
          </div>

          {/* ── Estimate output ────────────────────────────── */}
          {estimate && (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-px flex-1" style={{ backgroundColor: "#1a2d45" }} />
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#5a7a96" }}>
                  Preliminary estimate · {estimate.assetCount} asset{estimate.assetCount !== 1 ? "s" : ""} · {estimate.assetType}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "#1a2d45" }} />
              </div>

              {/* Total */}
              <div
                className="rounded-2xl p-6 sm:p-8 mb-4 text-center"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: "#8ba0b8" }}>
                  Estimated annual opportunity
                </p>
                <div
                  className="text-5xl sm:text-6xl font-bold mb-2"
                  style={{ fontFamily: SERIF, color: "#F5A94A" }}
                >
                  {fmt(estimate.total)}
                </div>
                <p className="text-sm" style={{ color: "#5a7a96" }}>
                  per year across insurance, energy &amp; income
                </p>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {[
                  { label: "Insurance saving", value: estimate.insurance, accent: "#F5A94A", desc: "Re-broking with specialist carriers" },
                  { label: "Energy saving", value: estimate.energy, accent: "#1647E8", desc: "Supplier switch + procurement" },
                  { label: "New income", value: estimate.income, accent: "#0A8A4C", desc: "Solar, EV charging, masts, parking" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
                  >
                    <div
                      className="text-2xl font-bold mb-1"
                      style={{ fontFamily: SERIF, color: item.accent }}
                    >
                      {fmt(item.value)}
                    </div>
                    <div className="text-sm font-medium mb-1" style={{ color: "#e8eef5" }}>
                      {item.label}
                    </div>
                    <div className="text-xs" style={{ color: "#5a7a96" }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <p className="text-xs mb-8 text-center" style={{ color: "#3d5a75" }}>
                Preliminary benchmarks based on {estimate.assetType} asset class averages.
                Full analysis delivered within 48 hours.
              </p>

              {/* ── Email capture ──────────────────────────── */}
              {!emailSent ? (
                <div
                  className="rounded-2xl p-6 sm:p-8"
                  style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C40" }}
                >
                  <h2
                    className="text-xl sm:text-2xl mb-2"
                    style={{ fontFamily: SERIF, color: "#e8eef5" }}
                  >
                    Get the full analysis
                  </h2>
                  <p className="text-sm mb-5" style={{ color: "#8ba0b8" }}>
                    We&apos;ll send a detailed breakdown for each asset within 48 hours.
                    No account. No spam.
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
                        border: "1px solid #1a2d45",
                        color: "#e8eef5",
                        caretColor: "#0A8A4C",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                      onBlur={(e) => (e.target.style.borderColor = "#1a2d45")}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 whitespace-nowrap"
                      style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                    >
                      {submitting ? "Sending…" : "Send full report →"}
                    </button>
                  </form>
                </div>
              ) : (
                <div
                  className="rounded-2xl p-6 sm:p-8"
                  style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C40" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#0A8A4C" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8L6.5 11.5L13 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-base font-semibold" style={{ color: "#e8eef5" }}>
                      Check your inbox
                    </span>
                  </div>
                  <p className="text-sm mb-6" style={{ color: "#8ba0b8" }}>
                    Your estimate breakdown is on its way to <strong style={{ color: "#e8eef5" }}>{email}</strong>.
                    {" "}For a full analysis of your actual documents, book a call.
                  </p>

                  {/* Book a call CTA */}
                  <div style={{ borderTop: "1px solid #1a2d45", paddingTop: "1.5rem" }}>
                    <p className="text-sm font-medium mb-3" style={{ color: "#e8eef5" }}>
                      Want to talk through the numbers now?
                    </p>
                    <a
                      href="https://cal.com/arca/demo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E8" }}
                    >
                      Book a 20-min call →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Trust row ──────────────────────────────────── */}
          <div className="mt-12 flex flex-wrap items-center gap-6" style={{ color: "#5a7a96" }}>
            {[
              "Commission-only — pay nothing until Arca delivers",
              "No account required",
              "No contracts",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </span>
            ))}
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
