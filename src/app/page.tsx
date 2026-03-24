"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PortfolioCalculator } from "@/components/ui/PortfolioCalculator";

const features = [
  { href: "/insurance", label: "Insurance", desc: "Compare 12 carriers. Avg $18k saved per placement.", accent: "#F5A94A" },
  { href: "/energy", label: "Energy Optimisation", desc: "Tariff review, solar PPA, demand reduction. Avg $52k saved.", accent: "#1647E8" },
  { href: "/income", label: "Income", desc: "Solar, EV charging, 5G masts, parking. Avg $124k/yr.", accent: "#0A8A4C" },
  { href: "/tenants", label: "Tenant Intelligence", desc: "Lease health scores, renewal risk, and income resilience.", accent: "#F5A94A" },
  { href: "/compliance", label: "Compliance", desc: "Certificate tracker. Never miss a renewal.", accent: "#f06040" },
  { href: "/rent-clock", label: "Rent Clock", desc: "Lease expiries, rent reviews, and reversion upside.", accent: "#F5A94A" },
  { href: "/financing", label: "Financing", desc: "Debt maturity ladder, covenant monitor, refinance at market rate.", accent: "#1647E8" },
  { href: "/hold-sell", label: "Hold vs Sell", desc: "IRR analysis on every asset. Know when to exit.", accent: "#0A8A4C" },
  { href: "/planning", label: "Planning", desc: "Nearby applications — threats to value, opportunities to buy.", accent: "#F5A94A" },
  { href: "/work-orders", label: "Work Orders", desc: "Tender management, benchmark pricing, vetted contractor network.", accent: "#6b7280" },
  { href: "/scout", label: "Deal Scout", desc: "Acquisition pipeline — deals benchmarked against your return criteria.", accent: "#1647E8" },
  { href: "/ask", label: "Ask RealHQ", desc: "Ask anything about your portfolio. Data-backed answer with an action button.", accent: "#0A8A4C" },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/properties/add?q=${encodeURIComponent(q)}` : "/properties/add");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#ffffff" }}>

      {/* ── Dark green hero section ─────────────────────────── */}
      <div style={{ backgroundColor: "#0D2B1E" }}>

        {/* Nav */}
        <header className="flex items-center justify-between px-6 lg:px-12 py-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#3FD18A" }} />
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#ffffff", letterSpacing: "0.12em" }}>
              RealHQ
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "#9CA3AF" }}>
              Demo
            </Link>
            <Link href="/audit" className="hidden sm:inline text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "#9CA3AF" }}>
              Free Audit
            </Link>
            <Link
              href="/signin"
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "rgba(63,209,138,0.15)", color: "#3FD18A", border: "1px solid rgba(63,209,138,0.3)" }}
            >
              Sign in
            </Link>
          </div>
        </header>

        {/* Hero content */}
        <section className="px-6 lg:px-12 pt-14 pb-16 lg:pt-20 lg:pb-24 max-w-5xl mx-auto w-full">
          <div className="max-w-2xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1] mb-5"
              style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#ffffff" }}
            >
              Your portfolio is worth more than you think. Let&apos;s prove it.
            </h1>
            <p className="text-lg mb-10 max-w-xl leading-relaxed" style={{ color: "#9CA3AF" }}>
              Commercial property owners leave an average of $180k/yr on the table in missed rent reviews, above-market insurance, and energy overspend. RealHQ finds it all — in seconds.
            </p>

            {/* Entry point 1: Search input */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4 max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Address, company name, or postcode..."
                className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  border: "1px solid #E5E7EB",
                  "--tw-ring-color": "#3FD18A",
                } as React.CSSProperties}
              />
              <button
                type="submit"
                className="px-5 py-3.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#ffffff" }}
              >
                Find my property →
              </button>
            </form>

            {/* Entry point 2: Upload schedule */}
            <div className="mb-5">
              <Link
                href="/properties/add"
                className="text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: "#6EE7B7" }}
              >
                Upload a schedule instead →
              </Link>
            </div>

            {/* Entry point 3: Demo CTA */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "rgba(10,138,76,0.2)", color: "#3FD18A", border: "1px solid rgba(10,138,76,0.4)" }}
            >
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#3FD18A" }} />
              See a live demo — FL Mixed Portfolio →
            </Link>
            <p className="mt-2 text-xs" style={{ color: "#4B5563" }}>No sign-in needed. Goes straight to a pre-populated portfolio.</p>
          </div>
        </section>
      </div>

      {/* ── Social proof strip ──────────────────────────────── */}
      <div style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-12 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0" style={{ borderColor: "#E5E7EB" }}>
          {[
            { value: "$180k", label: "Avg rent uplift found", sub: "open market reviews" },
            { value: "$93k", label: "Avg insurance overpay", sub: "per portfolio per year" },
            { value: "$156k", label: "Avg energy saving", sub: "tariff + demand + solar" },
            { value: "$14M", label: "Avg value uplift identified", sub: "at typical cap rate" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-5 sm:py-6 text-center">
              <div className="text-xl sm:text-2xl font-bold mb-0.5" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{s.value}</div>
              <div className="text-xs font-medium mb-0.5" style={{ color: "#111827" }}>{s.label}</div>
              <div className="text-xs" style={{ color: "#6B7280" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <section className="flex-1 px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">

          {/* ── How it works ──────────────────────────────────── */}
          <div className="mb-16">
            <div className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "#6b7280", letterSpacing: "0.1em" }}>
              How RealHQ works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "01", title: "Address", desc: "Enter any address or company name. RealHQ pulls EPC, planning history, insurance benchmarks, and energy data automatically.", color: "#0A8A4C" },
                { step: "02", title: "Upload", desc: "Upload your lease schedule, energy bills, or insurance policy. RealHQ reads them and fills every field.", color: "#1647E8" },
                { step: "03", title: "You approve. RealHQ executes.", desc: "Every finding comes with a pre-drafted action. Review it, approve it, and RealHQ handles the rest.", color: "#F5A94A" },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
                >
                  <div className="text-xs font-bold mb-3" style={{ color: item.color }}>{item.step}</div>
                  <div className="text-base font-semibold mb-2" style={{ color: "#111827" }}>{item.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Portfolio Calculator ──────────────────────────── */}
          <div className="mb-16">
            <PortfolioCalculator />
          </div>

          {/* ── Feature modules ───────────────────────────────── */}
          <div className="mb-16">
            <div className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "#6b7280", letterSpacing: "0.1em" }}>
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
                  <div className="h-1 w-8 rounded-full mb-3 transition-all duration-150 group-hover:w-12" style={{ backgroundColor: f.accent }} />
                  <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>{f.label}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>{f.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Bottom CTA ────────────────────────────────────── */}
          <div className="rounded-2xl p-8" style={{ backgroundColor: "#0D2B1E" }}>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "#ffffff", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
            >
              Start with your portfolio
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9CA3AF" }}>
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
                className="inline-flex items-center gap-2 justify-center px-5 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-80 active:scale-[0.98]"
                style={{ backgroundColor: "rgba(63,209,138,0.12)", color: "#3FD18A", border: "1px solid rgba(63,209,138,0.25)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#3FD18A" }} />
                See a live demo — FL Mixed Portfolio →
              </Link>
            </div>
            <div className="mt-3 text-xs" style={{ color: "#4B5563" }}>No sign-in needed to explore the demo.</div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="px-6 lg:px-12 py-6 text-center text-xs" style={{ borderTop: "1px solid #e5e7eb", color: "#6b7280" }}>
        <Link href="/" className="hover:opacity-70 transition-opacity">RealHQ</Link>
        {" · "}
        <Link href="/dashboard" className="hover:opacity-70 transition-opacity">Demo</Link>
        {" · "}
        <Link href="/audit" className="hover:opacity-70 transition-opacity">Free Audit</Link>
      </footer>
    </div>
  );
}
