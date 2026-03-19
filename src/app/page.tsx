"use client";

import { useState } from "react";
import Link from "next/link";
import { PortfolioCalculator } from "@/components/ui/PortfolioCalculator";

const TICKER_INSIGHTS = [
  { text: "Insurance retender: Thurrock Distribution Centre — £62k/yr overpay identified", color: "#F5A94A" },
  { text: "Alert: DHL break clause exercisable in 68 days — £1.19M income at risk", color: "#f06040" },
  { text: "Income: Rooftop solar at Tampa Industrial Park — $45k/yr in progress", color: "#0A8A4C" },
  { text: "Loan: Orlando Business Center maturing in 42 days — ICR covenant breach", color: "#f06040" },
  { text: "Energy: Coral Gables Office Park paying $50k/yr above market — switch ready", color: "#F5A94A" },
  { text: "Compliance: Thurrock asbestos survey expires in 14 days — £35k fine exposure", color: "#f06040" },
  { text: "Hold/Sell: Gravesend Logistics Centre — sell IRR 290bps above hold", color: "#0A8A4C" },
  { text: "Income: EV charging across 4 SE Logistics sites — £159k/yr opportunity", color: "#0A8A4C" },
  { text: "Insurance: FL Mixed portfolio overpaying $102k/yr across 5 assets", color: "#F5A94A" },
  { text: "Lease: Basildon Engineering renewal — £50k/yr reversion at ERV", color: "#F5A94A" },
  { text: "Financing: Brickell Retail Center 140bps above market — $62k/yr excess interest", color: "#1647E8" },
  { text: "Planning: New 450-unit residential proposed 180m from Dartford — density signal", color: "#8ba0b8" },
];

function InsightsTicker() {
  const items = [...TICKER_INSIGHTS, ...TICKER_INSIGHTS]; // duplicate for seamless loop
  return (
    <div className="overflow-hidden" style={{ borderBottom: "1px solid #1a2d45", backgroundColor: "#0a1520" }}>
      <div className="flex animate-ticker whitespace-nowrap py-2.5 gap-0">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0 px-6">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs" style={{ color: "#5a7a96" }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function calcTotal(assets: number) {
  const ins = Math.round(assets * 1_500);
  const eng = Math.round(assets * 4_333);
  const inc = Math.round(80_000 + Math.min(assets, 20) * 2_200);
  return ins + eng + inc;
}

function fmtHero(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(v / 1_000)}k`;
}

const features = [
  { href: "/insurance", label: "Insurance", desc: "Compare 12 carriers. Avg $18k saved per placement.", accent: "#F5A94A" },
  { href: "/energy", label: "Energy", desc: "Switch supplier. Avg $52k saved in year one.", accent: "#1647E8" },
  { href: "/income", label: "Income", desc: "Solar, EV charging, 5G masts, parking. Avg $124k/yr.", accent: "#0A8A4C" },
  { href: "/tenants", label: "Tenant Intelligence", desc: "Lease health scores, renewal risk, and income resilience across your portfolio.", accent: "#F5A94A" },
  { href: "/compliance", label: "Compliance", desc: "Certificate tracker. Never miss a renewal.", accent: "#f06040" },
  { href: "/rent-clock", label: "Rent Clock", desc: "Lease expiries, rent reviews, and reversion upside.", accent: "#F5A94A" },
  { href: "/financing", label: "Financing", desc: "Debt maturity ladder, covenant monitor, refinance at market rate.", accent: "#1647E8" },
  { href: "/hold-sell", label: "Hold vs Sell", desc: "IRR analysis on every asset. Know when to exit.", accent: "#0A8A4C" },
  { href: "/planning", label: "Planning", desc: "Nearby applications — threats to value, opportunities to buy.", accent: "#F5A94A" },
  { href: "/work-orders", label: "Work Orders", desc: "Tender management, benchmark pricing, vetted contractor network.", accent: "#8ba0b8" },
  { href: "/scout", label: "AI Scout", desc: "Acquisition pipeline, AI-scored deals.", accent: "#1647E8" },
  { href: "/ask", label: "Ask Arca", desc: "Ask anything about your portfolio. Data-backed answer with an action button.", accent: "#0A8A4C" },
];

const steps = [
  {
    step: "01",
    title: "Issue found",
    desc: "Arca benchmarks every asset against live market data — insurance, energy, rent, compliance, and income.",
    color: "#f06040",
  },
  {
    step: "02",
    title: "Cost priced exactly",
    desc: "Every gap is quantified to the dollar. Not a vague opportunity — a specific annual number.",
    color: "#F5A94A",
  },
  {
    step: "03",
    title: "Arca fixes it",
    desc: "One click. Arca manages the process end-to-end and charges commission only on what it delivers.",
    color: "#0A8A4C",
  },
];

export default function Home() {
  const [heroTotal, setHeroTotal] = useState(() => calcTotal(8));

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0B1622" }}>
      {/* ── Top nav ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4 shrink-0"
        style={{ borderBottom: "1px solid #1a2d45" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
          >
            Arca
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="hidden sm:inline text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#8ba0b8" }}
          >
            Pricing
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#8ba0b8" }}
          >
            Demo
          </Link>
          <Link
            href="/audit"
            className="hidden sm:inline text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#8ba0b8" }}
          >
            Free Audit
          </Link>
          <Link
            href="/partners"
            className="hidden lg:inline text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#8ba0b8" }}
          >
            Partners
          </Link>
          <a
            href="https://cal.com/arca/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E8" }}
          >
            Book a call →
          </a>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            See your portfolio →
          </Link>
        </div>
      </header>

      {/* ── Live insights ticker ─────────────────────────── */}
      <InsightsTicker />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex-1 px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto">

          {/* Trust badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C", color: "#0A8A4C" }}>
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
            Commission-only · You pay nothing until Arca delivers
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.1] mb-6"
            style={{
              fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
              color: "#e8eef5",
            }}
          >
            Your portfolio has{" "}
            <span
              key={heroTotal}
              className="animate-fade-in"
              style={{ color: "#F5A94A" }}
            >
              {fmtHero(heroTotal)}
            </span>{" "}
            of hidden value.
          </h1>

          <p className="text-lg mb-3 max-w-xl" style={{ color: "#8ba0b8" }}>
            Arca identifies every dollar you&apos;re leaving behind across insurance, energy, and income.
            Then it recovers it.
          </p>
          <p className="text-base mb-10 max-w-xl" style={{ color: "#5a7a96" }}>
            Built for owner-operators with 3–30 commercial assets. No setup fees. No contracts. No risk.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-16">
            <Link
              href="/audit"
              className="flex items-center justify-center sm:inline-flex px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Get a free estimate →
            </Link>
            <a
              href="https://cal.com/arca/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center sm:inline-flex px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E8" }}
            >
              Book a 20-min call →
            </a>
            <Link
              href="/dashboard"
              className="flex items-center justify-center sm:inline-flex px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-80 active:scale-[0.98]"
              style={{ backgroundColor: "transparent", color: "#8ba0b8", border: "1px solid #1a2d45" }}
            >
              See it live →
            </Link>
            <div className="flex items-center gap-4 flex-wrap" style={{ color: "#5a7a96" }}>
              {["No setup fees", "No contracts", "Success-only commission"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Credibility strip ─────────────────────────────── */}
          <div
            className="rounded-2xl mb-16 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1a2d45]"
            style={{ backgroundColor: "#0a1520", border: "1px solid #1a2d45" }}
          >
            {[
              { value: "$506k", label: "Avg. opportunity", sub: "per 5-asset FL portfolio", accent: "#F5A94A" },
              { value: "Commission-only", label: "You pay nothing", sub: "until Arca delivers", accent: "#0A8A4C" },
              { value: "15 min", label: "Time to see", sub: "your portfolio gaps", accent: "#1647E8" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center px-4 py-5 sm:py-6">
                <div
                  className="text-xl sm:text-2xl font-bold leading-tight mb-1"
                  style={{
                    fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                    color: s.accent,
                  }}
                >
                  {s.value}
                </div>
                <div className="text-xs font-medium mb-0.5" style={{ color: "#e8eef5" }}>{s.label}</div>
                <div className="text-xs" style={{ color: "#5a7a96" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Stats ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-16">
            {[
              { label: "Avg insurance saving", value: "$18k", sub: "per placement", detail: "15% of saving — success only", accent: "#F5A94A" },
              { label: "Avg energy saving", value: "$52k/yr", sub: "first year", detail: "10% of yr 1 saving — success only", accent: "#1647E8" },
              { label: "New income identified", value: "$124k/yr", sub: "per portfolio", detail: "10% of first year income", accent: "#0A8A4C" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
              >
                <div
                  className="text-3xl font-bold leading-none mb-2"
                  style={{
                    color: s.accent,
                    fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-medium mb-0.5" style={{ color: "#e8eef5" }}>{s.label}</div>
                <div className="text-xs mb-3" style={{ color: "#5a7a96" }}>{s.sub}</div>
                <div
                  className="pt-3 text-xs"
                  style={{ borderTop: "1px solid #1a2d45", color: "#3d5a72" }}
                >
                  {s.detail}
                </div>
              </div>
            ))}
          </div>

          {/* ── Recent findings ───────────────────────────────── */}
          <div className="mb-16">
            <div className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "#5a7a96", letterSpacing: "0.1em" }}>
              What Arca finds
            </div>
            <div className="space-y-2">
              {[
                { asset: "Coral Gables Office Park", location: "Miami-Dade, FL", type: "Insurance", finding: "$28k/yr overpay vs market — placed with single carrier, never retendered", amount: "$28k", accent: "#F5A94A" },
                { asset: "Orlando Business Center", location: "Orange County, FL", type: "Energy", finding: "$50k/yr above market rate — auto-renewed without comparison for 3 years", amount: "$50k", accent: "#1647E8" },
                { asset: "Tampa Industrial Park", location: "Hillsborough, FL", type: "Income", finding: "Rooftop solar deal in progress — $45k/yr new income, zero capex", amount: "$45k", accent: "#0A8A4C" },
                { asset: "Brickell Retail Center", location: "Miami-Dade, FL", type: "Financing", finding: "140bps above market rate — $62k/yr excess debt service identified", amount: "$62k", accent: "#1647E8" },
                { asset: "Thurrock Distribution Centre", location: "Essex, UK", type: "Insurance", finding: "£62k/yr overpay — 12 carriers approached, new terms bound in 5 weeks", amount: "£62k", accent: "#F5A94A" },
              ].map((item) => (
                <div
                  key={item.asset}
                  className="rounded-xl px-4 py-3.5 flex items-start gap-4 transition-all duration-150 hover:bg-[#111e2e]"
                  style={{ border: "1px solid #1a2d45", backgroundColor: "#0d1825" }}
                >
                  <div
                    className="shrink-0 mt-0.5 text-xs font-semibold px-2 py-1 rounded"
                    style={{ backgroundColor: `${item.accent}18`, color: item.accent, minWidth: "72px", textAlign: "center" }}
                  >
                    {item.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{item.asset}</span>
                      <span className="text-xs" style={{ color: "#3d5a72" }}>·</span>
                      <span className="text-xs" style={{ color: "#5a7a96" }}>{item.location}</span>
                    </div>
                    <div className="text-xs" style={{ color: "#8ba0b8" }}>{item.finding}</div>
                  </div>
                  <div className="shrink-0 text-base font-bold" style={{ color: item.accent, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                    {item.amount}/yr
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link href="/dashboard" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#5a7a96" }}>
                See full live demo →
              </Link>
            </div>
          </div>

          {/* ── Portfolio Calculator ──────────────────────────── */}
          <div className="mb-16">
            <PortfolioCalculator onTotalChange={setHeroTotal} />
          </div>

          {/* ── How it works ──────────────────────────────────── */}
          <div className="mb-16">
            <div
              className="text-xs font-medium uppercase tracking-widest mb-6"
              style={{ color: "#5a7a96", letterSpacing: "0.1em" }}
            >
              How Arca works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
                >
                  <div className="text-xs font-bold mb-3" style={{ color: item.color }}>
                    {item.step}
                  </div>
                  <div className="text-base font-semibold mb-2" style={{ color: "#e8eef5" }}>
                    {item.title}
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: "#5a7a96" }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Feature modules ───────────────────────────────── */}
          <div className="mb-16">
            <div
              className="text-xs font-medium uppercase tracking-widest mb-6"
              style={{ color: "#5a7a96", letterSpacing: "0.1em" }}
            >
              What&apos;s inside
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {features.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg group"
                  style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
                >
                  <div
                    className="h-1 w-8 rounded-full mb-3 transition-all duration-150 group-hover:w-12"
                    style={{ backgroundColor: f.accent }}
                  />
                  <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>
                    {f.label}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "#5a7a96" }}>
                    {f.desc}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Bottom CTA ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sign-up CTA */}
            <div
              className="rounded-2xl p-8 flex flex-col"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div
                className="text-lg font-bold mb-2"
                style={{
                  fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                  color: "#e8eef5",
                }}
              >
                Start with your portfolio
              </div>
              <p className="text-sm mb-6 flex-1" style={{ color: "#5a7a96" }}>
                Sign in with your email — no password, no credit card. See your first insight in minutes.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                See your portfolio →
              </Link>
              <div className="mt-3 text-xs" style={{ color: "#3d5a72" }}>
                Or{" "}
                <Link href="/dashboard" style={{ color: "#5a7a96" }} className="underline underline-offset-2">
                  explore the demo
                </Link>{" "}
                first — no sign-in needed.
              </div>
              <div className="mt-2 text-xs" style={{ color: "#3d5a72" }}>
                Or{" "}
                <Link href="/audit" style={{ color: "#5a7a96" }} className="underline underline-offset-2">
                  get a quick estimate first
                </Link>{" "}
                — no sign-in needed.
              </div>
            </div>

            {/* Contact CTA */}
            <div
              className="rounded-2xl p-8 flex flex-col"
              style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}
            >
              <div
                className="text-lg font-bold mb-2"
                style={{
                  fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                  color: "#e8eef5",
                }}
              >
                Talk to us
              </div>
              <p className="text-sm mb-6 flex-1" style={{ color: "#5a7a96" }}>
                We&apos;ll run Arca against your actual portfolio and show you the specific numbers within 48 hours.
              </p>
              <a
                href="https://cal.com/arca/demo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Book a 20-min call →
              </a>
              <div className="mt-3 text-xs" style={{ color: "#3d5a72" }}>
                No commitment. Commission-only if you proceed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-12 py-6 text-center text-xs"
        style={{ borderTop: "1px solid #1a2d45", color: "#8ba0b8" }}
      >
        <Link href="/" className="hover:opacity-70 transition-opacity">Arca</Link>
        {" · "}
        <Link href="/pricing" className="hover:opacity-70 transition-opacity">Pricing</Link>
        {" · "}
        <Link href="/dashboard" className="hover:opacity-70 transition-opacity">Demo</Link>
        {" · "}
        <Link href="/audit" className="hover:opacity-70 transition-opacity">Free Audit</Link>
        {" · "}
        <Link href="/partners" className="hover:opacity-70 transition-opacity">Partner Programme</Link>
        {" · "}
        <a href="https://cal.com/arca/demo" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">Book a call</a>
      </footer>
    </div>
  );
}
