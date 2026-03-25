"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PortfolioCalculator } from "@/components/ui/PortfolioCalculator";

const features = [
  { href: "/insurance", label: "Insurance", desc: "Compare 12 carriers. Avg $18k saved per placement.", accent: "#F5A94A" },
  { href: "/energy", label: "Energy Optimisation", desc: "Tariff review, solar PPA, demand reduction. Avg $52k saved.", accent: "#1647E8" },
  { href: "/income", label: "Income", desc: "Solar, EV charging, 5G masts, parking. Avg $124k/yr.", accent: "#0A8A4C" },
  { href: "/tenants", label: "Tenant Intelligence", dsc: "Lease health scores, renewal risk, and income resilience.", accent: "#F5A94A" },
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f7f7f5" }}>

      {/* ── Dark green hero section ─────────────────────────── */}
      <div style={{ backgroundColor: "#173404" }}>

        {/* Nav */}
        <header className="flex items-center justify-between px-6 lg:px-12 py-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-[18px] h-[18px] rounded" style={{ backgroundColor: "#173404", border: "1px solid rgba(255,255,255,0.15)" }} />
            <span className="text-sm font-semibold" style={{ color: "#ffffff" }}>
              RealHQ
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="#how" className="text-sm transition-opacity hover:opacity-70" style={{ color: "#6B7280" }}>
              How it works
            </Link>
            <Link href="/pricing" className="hidden sm:inline text-sm transition-opacity hover:opacity-70" style={{ color: "#6B7280" }}>
              Pricing
            </Link>
            <Link
              href="/signin"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#173404", color: "#fff", border: "0.5px solid rgba(255,255,255,0.2)" }}
            >
              Try it →
            </Link>
          </div>
        </header>

        {/* Hero content */}
        <section className="px-6 lg:px-12 pt-14 pb-16 lg:pt-20 lg:pb-24 max-w-5xl mx-auto w-full">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase mb-4" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
              Commercial property intelligence
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-[2rem] leading-[1.25] mb-3"
              style={{ fontWeight: 500, color: "#ffffff", maxWidth: "560px" }}
            >
              Your portfolio is worth more than you think. Let&apos;s prove it.
            </h1>
            <p className="text-[15px] mb-7 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", maxWidth: "480px" }}>
              Commercial property owners leave an average of $180k/yr on the table in missed rent reviews, above-market insurance, and energy overspend. RealHQ finds it all — in seconds.
            </p>

            {/* Entry point 1: Search input */}
            <form onSubmit={handleSearch} className="flex gap-2.5 mb-2.5" style={{ maxWidth: "560px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Address, company name, or postcode..."
                className="flex-1 rounded-[10px] px-[18px] py-[14px] text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                }}
              />
              <button
                type="submit"
                className="px-6 py-3.5 rounded-[10px] text-sm font-medium whitespace-nowrap transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#ffffff" }}
              >
                Find my property →
              </button>
            </form>

            {/* Entry points 2 & 3: Upload + Demo CTAs */}
            <div className="grid grid-cols-2 gap-2 mb-2" style={{ maxWidth: "560px" }}>
              <Link
                href="/properties/add"
                className="px-4 py-2.5 rounded-[9px] text-xs text-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "0.5px solid rgba(255,255,255,0.15)" }}
              >
                Upload a schedule instead →
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2.5 rounded-[9px] text-xs font-medium text-center flex items-center justify-center gap-1.5 transition-all duration-150 hover:opacity-90"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", border: "0.5px solid rgba(255,255,255,0.25)" }}
              >
                <span className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ backgroundColor: "#4ade80" }} />
                See a live demo — FL Mixed Portfolio →
              </Link>
            </div>

            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>No signup needed · enter any UK or US commercial address</p>
          </div>
        </section>
      </div>

      {/* ── Social proof strip ──────────────────────────────── */}
      <div style={{ backgroundColor: "#f9fafb", borderBottom: "0.5px solid #e5e7eb" }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-6">
          <div className="text-[11px] uppercase text-center mb-3.5" style={{ color: "#9ca3af", letterSpacing: "0.07em" }}>
            What RealHQ finds on a typical commercial portfolio
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: "$180k", label: "avg rent uplift found" },
              { value: "$93k", label: "avg insurance overpay" },
              { value: "$156k", label: "avg energy saving" },
              { value: "$14M", label: "avg value uplift identified" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[22px] font-medium mb-0.5" style={{ color: "#0A8A4C" }}>{s.value}</div>
                <div className="text-[11px]" style={{ color: "#9ca3af" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <section className="flex-1 px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">

          {/* ── How it works ──────────────────────────────────── */}
          <div className="py-8" id="how" style={{ backgroundColor: "#fff" }}>
            <div className="text-[11px] uppercase text-center mb-5" style={{ color: "#9ca3af", letterSpacing: "0.07em" }}>
              How it works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { num: "1", title: "Enter an address", desc: "RealHQ reads the building, the market, the planning history, and the opportunity. In seconds. No signup required.", bg: "#173404" },
                { num: "2", title: "Drop your documents", desc: "Leases, insurance schedules, energy bills — whatever you have. RealHQ reads all of it and builds your full portfolio analysis.", bg: "#173404" },
                { num: "3", title: "You approve. RealHQ executes.", desc: "One click. RealHQ runs the retender, sends the letters, negotiates the terms. You collect the saving.", bg: "#0A8A4C" },
              ].map((item) => (
                <div key={item.num} className="text-center px-3">
                  <div className="w-9 h-9 rounded-[9px] mx-auto mb-3 flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: item.bg, color: "#fff" }}>
                    {item.num}
                  </div>
                  <div className="text-[13px] font-medium mb-1.5" style={{ color: "#111827" }}>{item.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{item.desc}</div>
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
