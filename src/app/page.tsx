import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 lg:p-8">
      <div className="w-full max-w-2xl text-center">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "#8ba0b8", letterSpacing: "0.12em" }}>
            Arca
          </span>
        </div>

        {/* Headline */}
        <h1
          className="mb-4 text-4xl lg:text-5xl leading-tight"
          style={{
            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
            color: "#e8eef5",
          }}
        >
          Property Intelligence
        </h1>

        <p className="mb-3 text-base lg:text-lg" style={{ color: "#8ba0b8" }}>
          The operating system for commercial real estate.
        </p>
        <p className="mb-10 text-sm" style={{ color: "#5a7a96" }}>
          Every asset, every decision, every transaction — maximise income, reduce costs, uncover value.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-10 text-sm">
          {[
            { label: "Avg insurance saving", value: "$18k", sub: "per placement", accent: "#F5A94A" },
            { label: "Avg energy saving", value: "$52k/yr", sub: "first year", accent: "#1647E8" },
            { label: "New income identified", value: "$124k/yr", sub: "per portfolio", accent: "#0A8A4C" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div
                className="text-2xl lg:text-3xl font-bold mb-1"
                style={{
                  color: stat.accent,
                  fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                }}
              >
                {stat.value}
              </div>
              <div className="text-xs font-medium" style={{ color: "#8ba0b8" }}>{stat.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Issue → Cost → Action pattern */}
        <div className="mb-10 rounded-xl p-5" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
          <div className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "#5a7a96", letterSpacing: "0.1em" }}>
            How Arca works
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Issue identified", desc: "Arca scans your portfolio for overspend, risk, and missed income.", color: "#f06040" },
              { step: "02", title: "Cost quantified", desc: "Every issue is priced — you see exactly what it's costing you annually.", color: "#F5A94A" },
              { step: "03", title: "Action button", desc: "One click to let Arca fix it. Commission-only on success.", color: "#0A8A4C" },
            ].map((item) => (
              <div key={item.step} className="text-left">
                <div className="text-xs font-bold mb-2" style={{ color: item.color }}>{item.step}</div>
                <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>{item.title}</div>
                <div className="text-xs" style={{ color: "#5a7a96" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            View Demo Dashboard →
          </Link>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#111e2e", color: "#F5A94A", border: "1px solid #1a2d45" }}
          >
            MVP · Commission-only
          </span>
        </div>

        {/* Nav links */}
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          {[
            { href: "/insurance", label: "Insurance" },
            { href: "/energy", label: "Energy" },
            { href: "/income", label: "Income" },
            { href: "/compliance", label: "Compliance" },
            { href: "/hold-sell", label: "Hold vs Sell" },
            { href: "/scout", label: "AI Scout" },
            { href: "/ask", label: "Ask Arca" },
          ].map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "#5a7a96" }}
            >
              {nav.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
