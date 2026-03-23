import Link from "next/link";
import { PortfolioCalculator } from "@/components/ui/PortfolioCalculator";


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
  { href: "/work-orders", label: "Work Orders", desc: "Tender management, benchmark pricing, vetted contractor network.", accent: "#6b7280" },
  { href: "/scout", label: "Deal Scout", desc: "Acquisition pipeline — deals benchmarked against your return criteria.", accent: "#1647E8" },
  { href: "/ask", label: "Ask RealHQ", desc: "Ask anything about your portfolio. Data-backed answer with an action button.", accent: "#0A8A4C" },
];

const steps = [
  {
    step: "01",
    title: "Issue found",
    desc: "RealHQ benchmarks every asset against live market data — insurance, energy, rent, compliance, and income.",
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
    title: "Action it",
    desc: "One click to act on any finding — RealHQ connects you to the right provider, pre-briefed with your data.",
    color: "#0A8A4C",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#ffffff" }}>
      {/* ── Top nav ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4 shrink-0"
        style={{ borderBottom: "1px solid #e5e7eb" }}
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
            href="/dashboard"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#6b7280" }}
          >
            Demo
          </Link>
          <Link
            href="/audit"
            className="hidden sm:inline text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#6b7280" }}
          >
            Free Audit
          </Link>
          <Link
            href="/properties/add"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            See your portfolio →
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex-1 px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto">

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.1] mb-4"
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              color: "#111827",
            }}
          >
            The property value engine for every commercial asset owner.
          </h1>

          {/* Mantra */}
          <p className="text-base mb-6 tracking-wide" style={{ color: "#9ca3af" }}>
            Earn · Reduce · Enhance · Acquire · Repeat
          </p>

          <p className="text-lg mb-3 max-w-xl" style={{ color: "#374151" }}>
            From one unit to one hundred — RealHQ works every asset, every day. Always finding. Always delivering.
          </p>
          <p className="text-base mb-10 max-w-xl" style={{ color: "#6b7280" }}>
            From 1 to 100 commercial assets.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
            <Link
              href="/properties/add"
              className="flex items-center justify-center sm:inline-flex px-7 py-4 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              See your portfolio →
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center sm:inline-flex px-6 py-4 rounded-xl text-base font-medium transition-all duration-150 hover:opacity-80 active:scale-[0.98]"
              style={{ backgroundColor: "transparent", color: "#374151", border: "1px solid #e5e7eb" }}
            >
              Explore the demo →
            </Link>
          </div>
          <p className="text-sm mb-16" style={{ color: "#9ca3af" }}>
            It just starts with an address.
          </p>

          {/* ── Credibility strip ─────────────────────────────── */}
          <div
            className="rounded-2xl mb-16 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#e5e7eb]"
            style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
          >
            {[
              { value: "$492k", label: "Avg. opportunity", sub: "per 5-asset FL portfolio", accent: "#F5A94A" },
              { value: "Always on", label: "Every asset. Every day.", sub: "Finding what your portfolio is leaving behind", accent: "#0A8A4C" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center px-4 py-5 sm:py-6">
                <div
                  className="text-xl sm:text-2xl font-bold leading-tight mb-1"
                  style={{
                    color: s.accent,
                  }}
                >
                  {s.value}
                </div>
                <div className="text-xs font-medium mb-0.5" style={{ color: "#111827" }}>{s.label}</div>
                <div className="text-xs" style={{ color: "#6b7280" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Stats ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-16">
            {[
              { label: "Avg insurance saving", value: "$18k", sub: "per placement", detail: "Re-broking with specialist carriers", accent: "#F5A94A" },
              { label: "Avg energy saving", value: "$52k/yr", sub: "first year", detail: "Supplier switch + procurement", accent: "#1647E8" },
              { label: "New income identified", value: "$124k/yr", sub: "per portfolio", detail: "Solar, EV charging, 5G masts, parking", accent: "#0A8A4C" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
              >
                <div
                  className="text-3xl font-bold leading-none mb-2"
                  style={{
                    color: s.accent,
                  }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-medium mb-0.5" style={{ color: "#111827" }}>{s.label}</div>
                <div className="text-xs mb-3" style={{ color: "#6b7280" }}>{s.sub}</div>
                <div
                  className="pt-3 text-xs"
                  style={{ borderTop: "1px solid #e5e7eb", color: "#9ca3af" }}
                >
                  {s.detail}
                </div>
              </div>
            ))}
          </div>

          {/* ── Recent findings ───────────────────────────────── */}
          <div className="mb-16">
            <div className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "#6b7280", letterSpacing: "0.1em" }}>
              What RealHQ finds
            </div>
            <div className="space-y-2">
              {[
                { asset: "Coral Gables Office Park", location: "Miami-Dade, FL", type: "Insurance", finding: "$28k/yr overpay vs market — placed with single carrier, never retendered", amount: "$28k", accent: "#F5A94A" },
                { asset: "Orlando Business Center", location: "Orange County, FL", type: "Energy", finding: "$38k/yr above EIA benchmark — HVAC demand profile never optimised", amount: "$38k", accent: "#1647E8" },
                { asset: "Tampa Industrial Park", location: "Hillsborough, FL", type: "Income", finding: "Rooftop solar deal in progress — $45k/yr new income, zero capex", amount: "$45k", accent: "#0A8A4C" },
                { asset: "Brickell Retail Center", location: "Miami-Dade, FL", type: "Financing", finding: "140bps above market rate — $62k/yr excess debt service identified", amount: "$62k", accent: "#1647E8" },
                { asset: "Thurrock Distribution Centre", location: "Essex, UK", type: "Insurance", finding: "£23k/yr overpay vs market — legacy FRI warehouse policy, never retendered", amount: "£23k", accent: "#F5A94A" },
              ].map((item) => (
                <div
                  key={item.asset}
                  className="rounded-xl px-4 py-3.5 flex items-start gap-4 transition-all duration-150 hover:bg-gray-50"
                  style={{ border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}
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
                      <span className="text-xs" style={{ color: "#d1d5db" }}>·</span>
                      <span className="text-xs" style={{ color: "#6b7280" }}>{item.location}</span>
                    </div>
                    <div className="text-xs" style={{ color: "#6b7280" }}>{item.finding}</div>
                  </div>
                  <div className="shrink-0 text-base font-bold" style={{ color: item.accent }}>
                    {item.amount}/yr
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link href="/dashboard" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#6b7280" }}>
                See full live demo →
              </Link>
            </div>
          </div>

          {/* ── Portfolio Calculator ──────────────────────────── */}
          <div className="mb-16">
            <PortfolioCalculator />
          </div>

          {/* ── How it works ──────────────────────────────────── */}
          <div className="mb-16">
            <div
              className="text-xs font-medium uppercase tracking-widest mb-6"
              style={{ color: "#6b7280", letterSpacing: "0.1em" }}
            >
              How RealHQ works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
                >
                  <div className="text-xs font-bold mb-3" style={{ color: item.color }}>
                    {item.step}
                  </div>
                  <div className="text-base font-semibold mb-2" style={{ color: "#111827" }}>
                    {item.title}
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
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
              style={{ color: "#6b7280", letterSpacing: "0.1em" }}
            >
              What&apos;s inside
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {features.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg group"
                  style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
                >
                  <div
                    className="h-1 w-8 rounded-full mb-3 transition-all duration-150 group-hover:w-12"
                    style={{ backgroundColor: f.accent }}
                  />
                  <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>
                    {f.label}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>
                    {f.desc}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Portfolio outcome examples ─────────────────────── */}
          <div className="mb-16">
            <div
              className="text-xs font-medium uppercase tracking-widest mb-2"
              style={{ color: "#6b7280", letterSpacing: "0.1em" }}
            >
              Portfolio outcomes
            </div>
            <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>
              Examples based on real portfolio benchmarks.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  market: "Florida, mixed-use",
                  detail: "8 assets · Naples &amp; Fort Myers",
                  stream: "Insurance retender",
                  saving: "$47k",
                  savingLabel: "saving recovered",
                  accent: "#F5A94A",
                  period: "year 1",
                },
                {
                  market: "SE England, industrial",
                  detail: "4 assets · M25 corridor",
                  stream: "Energy switching",
                  saving: "£28k",
                  savingLabel: "cost reduction",
                  accent: "#1647E8",
                  period: "year 1",
                },
                {
                  market: "Miami, retail",
                  detail: "3 units · Brickell",
                  stream: "EV charging income",
                  saving: "$31k",
                  savingLabel: "new income activated",
                  accent: "#0A8A4C",
                  period: "per year",
                },
              ].map((ex) => (
                <div
                  key={ex.market}
                  className="rounded-2xl p-5 flex flex-col"
                  style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
                >
                  <div className="h-0.5 w-8 rounded-full mb-4" style={{ backgroundColor: ex.accent }} />
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "#111827" }}>{ex.market}</div>
                  <div className="text-xs mb-3" style={{ color: "#9ca3af" }} dangerouslySetInnerHTML={{ __html: ex.detail }} />
                  <div className="text-xs mb-3 font-medium" style={{ color: ex.accent }}>{ex.stream}</div>
                  <div className="mt-auto pt-3 border-t" style={{ borderColor: "#e5e7eb" }}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs" style={{ color: "#6b7280" }}>{ex.savingLabel}</span>
                      <span className="text-sm font-bold" style={{ color: ex.accent }}>{ex.saving}</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#9ca3af" }}>{ex.period}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom CTA ────────────────────────────────────── */}
          <div
            className="rounded-2xl p-8 flex flex-col"
            style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
          >
            <div
              className="text-lg font-bold mb-2"
              style={{
                color: "#111827",
              }}
            >
              Start with your portfolio
            </div>
            <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
              Start with an address. Your analysis is ready in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/properties/add"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                See your portfolio →
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-80 active:scale-[0.98]"
                style={{ backgroundColor: "transparent", color: "#374151", border: "1px solid #e5e7eb" }}
              >
                Explore the demo →
              </Link>
            </div>
            <div className="mt-3 text-xs" style={{ color: "#9ca3af" }}>
              No sign-in needed to explore the demo.
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-12 py-6 text-center text-xs"
        style={{ borderTop: "1px solid #e5e7eb", color: "#6b7280" }}
      >
        <Link href="/" className="hover:opacity-70 transition-opacity">RealHQ</Link>
        {" · "}
        <Link href="/dashboard" className="hover:opacity-70 transition-opacity">Demo</Link>
        {" · "}
        <Link href="/audit" className="hover:opacity-70 transition-opacity">Free Audit</Link>
      </footer>
    </div>
  );
}
