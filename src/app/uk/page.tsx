"use client";

import { useState } from "react";
import Link from "next/link";

// UK market variant — SE UK logistics owner-operators
// Swaps: currency (£), portfolio examples, energy (EPC/MEES/Ofgem), insurance (UK lines)

const TICKER_INSIGHTS = [
  { text: "Insurance retender: Thurrock Distribution Centre — £62k/yr overpay identified", color: "#F5A94A" },
  { text: "Alert: DHL break clause exercisable in 68 days — £1.19M income at risk", color: "#f06040" },
  { text: "Energy: Basildon Logistics Park EPC C — MEES upgrade required by 2027, £38k fine exposure", color: "#f06040" },
  { text: "Income: Rooftop solar at Gravesend Logistics Centre — £41k/yr new income, zero capex", color: "#0A8A4C" },
  { text: "Compliance: Thurrock asbestos survey expires in 14 days — £35k fine exposure", color: "#f06040" },
  { text: "Hold/Sell: Gravesend Logistics Centre — sell IRR 290bps above hold", color: "#0A8A4C" },
  { text: "Income: EV charging across 4 SE Logistics sites — £159k/yr opportunity", color: "#0A8A4C" },
  { text: "Insurance: Kent portfolio overpaying £89k/yr across 6 assets — market not benchmarked since 2021", color: "#F5A94A" },
  { text: "Lease: Basildon Engineering renewal — £50k/yr reversion at ERV", color: "#F5A94A" },
  { text: "Financing: Dartford Trade Park 155bps above market — £54k/yr excess debt service", color: "#1647E8" },
  { text: "Energy: Ofgem cap uplift — Grays Industrial Estate overpaying £29k/yr on unit rate", color: "#F5A94A" },
  { text: "Planning: New 450-unit residential proposed 180m from Dartford — density signal", color: "#6B7280" },
];

function InsightsTicker() {
  const items = [...TICKER_INSIGHTS, ...TICKER_INSIGHTS];
  return (
    <div className="overflow-hidden" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#0a1520" }}>
      <div className="flex animate-ticker whitespace-nowrap py-2.5 gap-0">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0 px-6">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs" style={{ color: "#9CA3AF" }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtGBP(v: number) {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  return `£${Math.round(v / 1_000)}k`;
}

function calcTotal(assets: number) {
  const ins = Math.round(assets * 1_300);
  const eng = Math.round(assets * 3_800);
  const inc = Math.round(70_000 + Math.min(assets, 20) * 2_000);
  return ins + eng + inc;
}

// UK-specific PortfolioCalculator (GBP)
function UKPortfolioCalculator({ onTotalChange }: { onTotalChange?: (total: number) => void }) {
  const [assets, setAssets] = useState(8);

  const insurance = Math.round(assets * 1_300);
  const energy = Math.round(assets * 3_800);
  const income = Math.round(70_000 + Math.min(assets, 20) * 2_000);
  const total = insurance + energy + income;
  const arcaFee = Math.round(insurance * 0.15 + energy * 0.10 + income * 0.10);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
          Quick estimate
        </div>
        <div className="text-base font-semibold" style={{ color: "#111827" }}>
          How much is your portfolio leaving behind?
        </div>
      </div>

      <div className="px-6 py-6 text-center" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
        <div className="text-xs mb-2" style={{ color: "#9CA3AF" }}>We estimate</div>
        <div
          className="text-4xl font-bold leading-none mb-2"
          style={{ color: "#F5A94A", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
        >
          {fmtGBP(total)}/yr
        </div>
        <div className="text-sm" style={{ color: "#6B7280" }}>in recoverable value across your portfolio</div>
        <div className="text-xs mt-1" style={{ color: "#D1D5DB" }}>RealHQ success fee on delivery: {fmtGBP(arcaFee)}/yr</div>
      </div>

      <div className="px-6 py-5" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium" style={{ color: "#6B7280" }}>Number of assets</label>
          <span className="text-xl font-bold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
            {assets}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          value={assets}
          onChange={(e) => {
            const n = Number(e.target.value);
            setAssets(n);
            const ins = Math.round(n * 1_300);
            const eng = Math.round(n * 3_800);
            const inc = Math.round(70_000 + Math.min(n, 20) * 2_000);
            onTotalChange?.(ins + eng + inc);
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0A8A4C ${((assets - 1) / 29) * 100}%, #E5E7EB ${((assets - 1) / 29) * 100}%)`,
            accentColor: "#0A8A4C",
          }}
        />
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: "#D1D5DB" }}>
          <span>1</span>
          <span>30</span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
        {[
          { label: "Insurance overpay (est.)", value: insurance, color: "#F5A94A", fee: "15% of saving" },
          { label: "Energy overpay (est.)", value: energy, color: "#1647E8", fee: "10% of yr 1 saving" },
          { label: "Additional income (est.)", value: income, color: "#0A8A4C", fee: "10% of first year" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
              <span className="text-sm" style={{ color: "#6B7280" }}>{row.label}</span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold" style={{ color: row.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmtGBP(row.value)}/yr</div>
              <div className="text-xs" style={{ color: "#D1D5DB" }}>{row.fee}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href={`/audit?market=uk&assets=${assets}`}
          className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          Get your free audit →
        </Link>
        <p className="text-xs text-center" style={{ color: "#D1D5DB" }}>
          No account required ·{" "}
          <Link href={`/signup?market=uk&assets=${assets}`} style={{ color: "#9CA3AF" }} className="underline underline-offset-2">
            sign up for your real portfolio
          </Link>
        </p>
      </div>
    </div>
  );
}

const features = [
  { href: "/insurance", label: "Insurance", desc: "Employers liability, public liability, property all-risks. Avg £15k saved per placement.", accent: "#F5A94A" },
  { href: "/energy", label: "Energy", desc: "Switch Ofgem-regulated supplier. Avg £47k saved in year one.", accent: "#1647E8" },
  { href: "/income", label: "Income", desc: "Solar, EV charging, 5G masts, parking. Avg £112k/yr new income.", accent: "#0A8A4C" },
  { href: "/tenants", label: "Tenant Intelligence", desc: "Lease health scores, renewal risk, and income resilience across your portfolio.", accent: "#F5A94A" },
  { href: "/compliance", label: "Compliance", desc: "EPC, MEES, asbestos, fire safety. Never miss a renewal or a deadline.", accent: "#f06040" },
  { href: "/rent-clock", label: "Rent Clock", desc: "Lease expiries, rent reviews, and ERV reversion upside.", accent: "#F5A94A" },
  { href: "/financing", label: "Financing", desc: "Debt maturity ladder, covenant monitor, refinance at market rate.", accent: "#1647E8" },
  { href: "/hold-sell", label: "Hold vs Sell", desc: "IRR analysis on every asset. Know when to exit.", accent: "#0A8A4C" },
  { href: "/planning", label: "Planning", desc: "Nearby applications — threats to value, opportunities to buy.", accent: "#F5A94A" },
  { href: "/work-orders", label: "Work Orders", desc: "Tender management, benchmark pricing, vetted UK contractor network.", accent: "#6B7280" },
  { href: "/scout", label: "AI Scout", desc: "Acquisition pipeline, AI-scored deals.", accent: "#1647E8" },
  { href: "/ask", label: "Ask RealHQ", desc: "Ask anything about your portfolio. Data-backed answer with an action button.", accent: "#0A8A4C" },
];

const steps = [
  {
    step: "01",
    title: "Issue found",
    desc: "RealHQ benchmarks every asset against live UK market data — insurance, energy, rent, MEES compliance, and income.",
    color: "#f06040",
  },
  {
    step: "02",
    title: "Cost priced exactly",
    desc: "Every gap is quantified to the pound. Not a vague opportunity — a specific annual number.",
    color: "#F5A94A",
  },
  {
    step: "03",
    title: "RealHQ fixes it",
    desc: "One click. RealHQ manages the process end-to-end and charges commission only on what it delivers.",
    color: "#0A8A4C",
  },
];

export default function UKHome() {
  const [heroTotal, setHeroTotal] = useState(() => calcTotal(8));

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F9FAFB" }}>
      {/* ── Top nav ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4 shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#111827", letterSpacing: "0.12em" }}
          >
            RealHQ
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="hidden sm:inline text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#6B7280" }}
          >
            Pricing
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#6B7280" }}
          >
            Demo
          </Link>
          <Link
            href="/audit?market=uk"
            className="hidden sm:inline text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#6B7280" }}
          >
            Free Audit
          </Link>
          <Link
            href="/book"
            className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E8" }}
          >
            Book a call →
          </Link>
          <Link
            href="/signup?market=uk"
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
            Commission-only · You pay nothing until RealHQ delivers
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.1] mb-6"
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              color: "#111827",
            }}
          >
            Your portfolio has{" "}
            <span
              key={heroTotal}
              className="animate-fade-in"
              style={{ color: "#F5A94A" }}
            >
              {fmtGBP(heroTotal)}
            </span>{" "}
            of hidden value.
          </h1>

          <p className="text-lg mb-3 max-w-xl" style={{ color: "#6B7280" }}>
            RealHQ identifies every pound you&apos;re leaving behind across insurance, energy, and income.
            Then it recovers it.
          </p>
          <p className="text-base mb-10 max-w-xl" style={{ color: "#9CA3AF" }}>
            Built for UK owner-operators with 3–30 commercial assets. No setup fees. No contracts. No risk.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
            <Link
              href="/audit?market=uk"
              className="flex items-center justify-center sm:inline-flex px-7 py-4 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Get your free portfolio audit →
            </Link>
            <Link
              href="/book"
              className="flex items-center justify-center sm:inline-flex px-6 py-4 rounded-xl text-base font-medium transition-all duration-150 hover:opacity-80 active:scale-[0.98]"
              style={{ backgroundColor: "transparent", color: "#6B7280", border: "1px solid #E5E7EB" }}
            >
              Book a 20-min call
            </Link>
          </div>
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mb-16" style={{ color: "#9CA3AF" }}>
            {["No setup fees", "No contracts", "Success-only commission"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </span>
            ))}
            <span className="text-sm" style={{ color: "#D1D5DB" }}>·</span>
            <Link href="/dashboard" className="text-sm underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: "#9CA3AF" }}>
              explore the demo
            </Link>
          </div>

          {/* ── Credibility strip ─────────────────────────────── */}
          <div
            className="rounded-2xl mb-16 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E7EB]"
            style={{ backgroundColor: "#0a1520", border: "1px solid #E5E7EB" }}
          >
            {[
              { value: "£441k", label: "Avg. opportunity", sub: "per 5-asset SE UK portfolio", accent: "#F5A94A" },
              { value: "Commission-only", label: "You pay nothing", sub: "until RealHQ delivers", accent: "#0A8A4C" },
              { value: "15 min", label: "Time to see", sub: "your portfolio gaps", accent: "#1647E8" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center px-4 py-5 sm:py-6">
                <div
                  className="text-xl sm:text-2xl font-bold leading-tight mb-1"
                  style={{
                    fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                    color: s.accent,
                  }}
                >
                  {s.value}
                </div>
                <div className="text-xs font-medium mb-0.5" style={{ color: "#111827" }}>{s.label}</div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Stats ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-16">
            {[
              { label: "Avg insurance saving", value: "£15k", sub: "per placement", detail: "15% of saving — success only", accent: "#F5A94A" },
              { label: "Avg energy saving", value: "£47k/yr", sub: "first year", detail: "10% of yr 1 saving — success only", accent: "#1647E8" },
              { label: "New income identified", value: "£112k/yr", sub: "per portfolio", detail: "10% of first year income", accent: "#0A8A4C" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
              >
                <div
                  className="text-3xl font-bold leading-none mb-2"
                  style={{
                    color: s.accent,
                    fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-medium mb-0.5" style={{ color: "#111827" }}>{s.label}</div>
                <div className="text-xs mb-3" style={{ color: "#9CA3AF" }}>{s.sub}</div>
                <div
                  className="pt-3 text-xs"
                  style={{ borderTop: "1px solid #E5E7EB", color: "#D1D5DB" }}
                >
                  {s.detail}
                </div>
              </div>
            ))}
          </div>

          {/* ── Recent findings ───────────────────────────────── */}
          <div className="mb-16">
            <div className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
              What RealHQ finds
            </div>
            <div className="space-y-2">
              {[
                { asset: "Thurrock Distribution Centre", location: "Essex, UK", type: "Insurance", finding: "£62k/yr overpay vs market — placed with single carrier, never retendered since 2019", amount: "£62k", accent: "#F5A94A" },
                { asset: "Basildon Logistics Park", location: "Essex, UK", type: "Energy", finding: "£43k/yr above Ofgem market rate — auto-renewed without comparison for 2 years", amount: "£43k", accent: "#1647E8" },
                { asset: "Gravesend Logistics Centre", location: "Kent, UK", type: "Income", finding: "Rooftop solar deal in progress — £41k/yr new income, zero capex required", amount: "£41k", accent: "#0A8A4C" },
                { asset: "Dartford Trade Park", location: "Kent, UK", type: "Financing", finding: "155bps above market rate — £54k/yr excess debt service identified", amount: "£54k", accent: "#1647E8" },
                { asset: "Grays Industrial Estate", location: "Essex, UK", type: "Compliance", finding: "EPC rating D — MEES upgrade required before 2027, £38k fine exposure if unaddressed", amount: "£38k", accent: "#f06040" },
              ].map((item) => (
                <div
                  key={item.asset}
                  className="rounded-xl px-4 py-3.5 flex items-start gap-4 transition-all duration-150 hover:bg-[#fff]"
                  style={{ border: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}
                >
                  <div
                    className="shrink-0 mt-0.5 text-xs font-semibold px-2 py-1 rounded"
                    style={{ backgroundColor: `${item.accent}18`, color: item.accent, minWidth: "72px", textAlign: "center" }}
                  >
                    {item.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium" style={{ color: "#111827" }}>{item.asset}</span>
                      <span className="text-xs" style={{ color: "#D1D5DB" }}>·</span>
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>{item.location}</span>
                    </div>
                    <div className="text-xs" style={{ color: "#6B7280" }}>{item.finding}</div>
                  </div>
                  <div className="shrink-0 text-base font-bold" style={{ color: item.accent, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                    {item.amount}/yr
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link href="/dashboard" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#9CA3AF" }}>
                See full live demo →
              </Link>
            </div>
          </div>

          {/* ── Portfolio Calculator ──────────────────────────── */}
          <div className="mb-16">
            <UKPortfolioCalculator onTotalChange={setHeroTotal} />
          </div>

          {/* ── UK-specific context ────────────────────────────── */}
          <div className="mb-16 rounded-2xl p-6" style={{ backgroundColor: "#0a1520", border: "1px solid #E5E7EB" }}>
            <div className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
              Built for the UK market
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  title: "EPC & MEES compliance",
                  desc: "Track energy performance certificates across your portfolio. Flag assets at risk of MEES non-compliance before 2027 enforcement.",
                  accent: "#f06040",
                },
                {
                  title: "Ofgem energy benchmarking",
                  desc: "Compare your unit rates against live Ofgem data. Identify overpays and switch to market-rate contracts.",
                  accent: "#1647E8",
                },
                {
                  title: "UK insurance lines",
                  desc: "Employers liability, public liability, property all-risks, D&O. Retender across 12+ UK carriers.",
                  accent: "#F5A94A",
                },
              ].map((item) => (
                <div key={item.title}>
                  <div className="h-1 w-8 rounded-full mb-3" style={{ backgroundColor: item.accent }} />
                  <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>{item.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── How it works ──────────────────────────────────── */}
          <div className="mb-16">
            <div
              className="text-xs font-medium uppercase tracking-widest mb-6"
              style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}
            >
              How RealHQ works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
                >
                  <div className="text-xs font-bold mb-3" style={{ color: item.color }}>
                    {item.step}
                  </div>
                  <div className="text-base font-semibold mb-2" style={{ color: "#111827" }}>
                    {item.title}
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
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
              style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}
            >
              What&apos;s inside
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {features.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg group"
                  style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
                >
                  <div
                    className="h-1 w-8 rounded-full mb-3 transition-all duration-150 group-hover:w-12"
                    style={{ backgroundColor: f.accent }}
                  />
                  <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>
                    {f.label}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
                    {f.desc}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Bottom CTA ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-2xl p-8 flex flex-col"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
            >
              <div
                className="text-lg font-bold mb-2"
                style={{
                  fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  color: "#111827",
                }}
              >
                Start with your portfolio
              </div>
              <p className="text-sm mb-6 flex-1" style={{ color: "#9CA3AF" }}>
                Sign in with your email — no password, no credit card. See your first insight in minutes.
              </p>
              <Link
                href="/signup?market=uk"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                See your portfolio →
              </Link>
              <div className="mt-3 text-xs" style={{ color: "#D1D5DB" }}>
                Or{" "}
                <Link href="/dashboard" style={{ color: "#9CA3AF" }} className="underline underline-offset-2">
                  explore the demo
                </Link>{" "}
                first — no sign-in needed.
              </div>
              <div className="mt-2 text-xs" style={{ color: "#D1D5DB" }}>
                Or{" "}
                <Link href="/audit?market=uk" style={{ color: "#9CA3AF" }} className="underline underline-offset-2">
                  get a quick estimate first
                </Link>{" "}
                — no sign-in needed.
              </div>
            </div>

            <div
              className="rounded-2xl p-8 flex flex-col"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
            >
              <div
                className="text-lg font-bold mb-2"
                style={{
                  fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  color: "#111827",
                }}
              >
                Talk to us
              </div>
              <p className="text-sm mb-6 flex-1" style={{ color: "#9CA3AF" }}>
                We&apos;ll run RealHQ against your actual portfolio and show you the specific numbers within 48 hours.
              </p>
              <Link
                href="/book"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E8" }}
              >
                Book a 20-min call →
              </Link>
              <div className="mt-3 text-xs" style={{ color: "#D1D5DB" }}>
                No commitment. Commission-only if you proceed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-12 py-6 text-center text-xs"
        style={{ borderTop: "1px solid #E5E7EB", color: "#6B7280" }}
      >
        <Link href="/" className="hover:opacity-70 transition-opacity">RealHQ</Link>
        {" · "}
        <Link href="/pricing" className="hover:opacity-70 transition-opacity">Pricing</Link>
        {" · "}
        <Link href="/dashboard" className="hover:opacity-70 transition-opacity">Demo</Link>
        {" · "}
        <Link href="/audit?market=uk" className="hover:opacity-70 transition-opacity">Free Audit</Link>
        {" · "}
        <Link href="/partners" className="hover:opacity-70 transition-opacity">Partner Programme</Link>
        {" · "}
        <Link href="/book" className="hover:opacity-70 transition-opacity">Book a call</Link>
      </footer>
    </div>
  );
}
