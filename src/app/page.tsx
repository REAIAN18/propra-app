import Link from "next/link";

const features = [
  { href: "/insurance", label: "Insurance", desc: "Compare 12 carriers. Avg $18k saved per placement.", accent: "#F5A94A" },
  { href: "/energy", label: "Energy", desc: "Switch supplier. Avg $52k saved in year one.", accent: "#1647E8" },
  { href: "/income", label: "Income", desc: "Solar, EV charging, 5G masts, parking. Avg $124k/yr.", accent: "#0A8A4C" },
  { href: "/compliance", label: "Compliance", desc: "Certificate tracker. Never miss a renewal.", accent: "#f06040" },
  { href: "/rent-clock", label: "Rent Clock", desc: "Lease expiries, rent reviews, and reversion upside.", accent: "#F5A94A" },
  { href: "/hold-sell", label: "Hold vs Sell", desc: "Return analysis on every asset. Know when to exit.", accent: "#0A8A4C" },
  { href: "/scout", label: "AI Scout", desc: "Acquisition pipeline, AI-scored deals.", accent: "#1647E8" },
  { href: "/ask", label: "Ask Arca", desc: "Ask anything about your portfolio. AI-powered.", accent: "#0A8A4C" },
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
            href="/dashboard"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#8ba0b8" }}
          >
            Demo
          </Link>
          <Link
            href="/signin"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Get started →
          </Link>
        </div>
      </header>

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
            <span style={{ color: "#F5A94A" }}>$194k</span>{" "}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-16">
            <Link
              href="/signup"
              className="px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Get started free →
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-80 active:scale-[0.98]"
              style={{ backgroundColor: "transparent", color: "#8ba0b8", border: "1px solid #1a2d45" }}
            >
              See Demo
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                Get started free →
              </Link>
              <div className="mt-3 text-xs" style={{ color: "#3d5a72" }}>
                Or{" "}
                <Link href="/dashboard" style={{ color: "#5a7a96" }} className="underline underline-offset-2">
                  explore the demo
                </Link>{" "}
                first — no sign-in needed.
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
                href="mailto:hello@arcahq.ai?subject=Portfolio%20analysis%20request"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                hello@arcahq.ai →
              </a>
              <div className="mt-3 text-xs" style={{ color: "#3d5a72" }}>
                No commitment. Commission-only if you proceed.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
