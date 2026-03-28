"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PortfolioCalculator } from "@/components/ui/PortfolioCalculator";

const features = [
  { href: "/insurance", label: "Insurance", desc: "Compare 12 carriers. Avg $18k saved per placement.", accent: "#F5A94A" },
  { href: "/energy", label: "Energy Optimisation", desc: "Tariff review, solar PPA, demand reduction. Avg $52k saved.", accent: "#7c6af0" },
  { href: "/income", label: "Income", desc: "Solar, EV charging, 5G masts, parking. Avg $124k/yr.", accent: "#34d399" },
  { href: "/tenants", label: "Tenant Intelligence", dsc: "Lease health scores, renewal risk, and income resilience.", accent: "#F5A94A" },
  { href: "/compliance", label: "Compliance", desc: "Certificate tracker. Never miss a renewal.", accent: "#f06040" },
  { href: "/rent-clock", label: "Rent Clock", desc: "Lease expiries, rent reviews, and reversion upside.", accent: "#F5A94A" },
  { href: "/financing", label: "Financing", desc: "Debt maturity ladder, covenant monitor, refinance at market rate.", accent: "#7c6af0" },
  { href: "/hold-sell", label: "Hold vs Sell", desc: "IRR analysis on every asset. Know when to exit.", accent: "#34d399" },
  { href: "/planning", label: "Planning", desc: "Nearby applications — threats to value, opportunities to buy.", accent: "#F5A94A" },
  { href: "/work-orders", label: "Work Orders", desc: "Tender management, benchmark pricing, vetted contractor network.", accent: "#6b7280" },
  { href: "/scout", label: "Deal Scout", desc: "Acquisition pipeline — deals benchmarked against your return criteria.", accent: "#7c6af0" },
  { href: "/ask", label: "Ask RealHQ", desc: "Ask anything about your portfolio. Data-backed answer with an action button.", accent: "#34d399" },
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

      {/* ── Nav (white background) ─────────────────────────── */}
      <header className="flex items-center justify-between px-8" style={{ backgroundColor: "var(--s1)", padding: "14px 32px", borderBottom: "0.5px solid #f3f4f6" }}>
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded" style={{ backgroundColor: "#173404" }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--tx)" }}>
            RealHQ
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="#how" className="text-[13px] transition-opacity hover:opacity-70" style={{ color: "#6b7280" }}>
            How it works
          </Link>
          <Link href="/pricing" className="text-[13px] transition-opacity hover:opacity-70" style={{ color: "#6b7280" }}>
            Pricing
          </Link>
          <button
            onClick={() => router.push("/signin")}
            className="rounded-[7px] text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ padding: "7px 16px", backgroundColor: "#173404", color: "#fff" }}
          >
            Try it →
          </button>
        </div>
      </header>

      {/* ── Dark green hero section ─────────────────────────── */}
      <div style={{ backgroundColor: "#173404", padding: "56px 48px 48px" }}>
        <div className="hero-eyebrow text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: "16px" }}>
          Commercial property intelligence
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: 500, color: "#fff", marginBottom: "12px", lineHeight: "1.25", maxWidth: "560px" }}>
          Your portfolio is worth more than you think. Let&apos;s prove it.
        </h1>
        <div className="sub text-[15px]" style={{ color: "rgba(255,255,255,0.5)", marginBottom: "28px", maxWidth: "480px", lineHeight: "1.6" }}>
          Commercial property owners leave an average of $180k/yr on the table in missed rent reviews, above-market insurance, and energy overspend. RealHQ finds it all — in seconds.
        </div>

        {/* Search row */}
        <form onSubmit={handleSearch} className="search-row flex" style={{ gap: "10px", maxWidth: "560px", marginBottom: "10px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Address, company name, or postcode..."
            className="flex-1 outline-none text-sm"
            style={{
              padding: "14px 18px",
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "#fff",
            }}
          />
          <button
            type="submit"
            className="whitespace-nowrap text-sm font-medium cursor-pointer"
            style={{
              padding: "14px 24px",
              backgroundColor: "#0a8a4c",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
            }}
          >
            Find my property →
          </button>
        </form>

        {/* Alt CTAs */}
        <div className="alt-ctas grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "8px", maxWidth: "560px", marginBottom: "8px" }}>
          <button
            onClick={() => router.push("/properties/add")}
            className="alt-cta alt-upload text-xs cursor-pointer text-center"
            style={{
              padding: "10px 16px",
              borderRadius: "9px",
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)",
              border: "0.5px solid rgba(255,255,255,0.15)",
            }}
          >
            Upload a schedule instead →
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="alt-cta alt-demo text-xs font-medium cursor-pointer flex items-center justify-center"
            style={{
              padding: "10px 16px",
              borderRadius: "9px",
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "0.5px solid rgba(255,255,255,0.25)",
              gap: "6px",
            }}
          >
            <div className="dot" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80" }} />
            See a live demo — FL Mixed Portfolio →
          </button>
        </div>

        <div className="hero-hint text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          No signup needed · enter any UK or US commercial address
        </div>
      </div>

      {/* ── Social proof strip ──────────────────────────────── */}
      <div className="proof" style={{ background: "#f9fafb", padding: "24px 48px", borderBottom: "0.5px solid #e5e7eb" }}>
        <div className="proof-label text-[11px] uppercase text-center" style={{ color: "#9ca3af", letterSpacing: "0.07em", marginBottom: "14px" }}>
          What RealHQ finds on a typical commercial portfolio
        </div>
        <div className="proof-grid grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { value: "$180k", label: "avg rent uplift found" },
            { value: "$93k", label: "avg insurance overpay" },
            { value: "$156k", label: "avg energy saving" },
            { value: "$14M", label: "avg value uplift identified" },
          ].map((item) => (
            <div key={item.label} className="proof-item text-center">
              <div className="value text-[22px] font-medium" style={{ color: "#34d399" }}>{item.value}</div>
              <div className="label text-[11px]" style={{ color: "#9ca3af", marginTop: "3px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────── */}
      <div className="how" id="how" style={{ background: "var(--s1)", padding: "32px 48px" }}>
        <div className="how-label text-[11px] uppercase text-center" style={{ color: "#9ca3af", letterSpacing: "0.07em", marginBottom: "20px" }}>
          How it works
        </div>
        <div className="how-grid grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {[
            { num: "1", title: "Enter an address", desc: "RealHQ reads the building, the market, the planning history, and the opportunity. In seconds. No signup required.", bg: "#173404" },
            { num: "2", title: "Drop your documents", desc: "Leases, insurance schedules, energy bills — whatever you have. RealHQ reads all of it and builds your full portfolio analysis.", bg: "#173404" },
            { num: "3", title: "You approve. RealHQ executes.", desc: "One click. RealHQ runs the retender, sends the letters, negotiates the terms. You collect the saving.", bg: "#0a8a4c" },
          ].map((step) => (
            <div key={step.num} className="how-step text-center" style={{ padding: "0 12px" }}>
              <div className="num flex items-center justify-center mx-auto text-sm font-semibold" style={{ width: "36px", height: "36px", borderRadius: "9px", marginBottom: "12px", background: step.bg, color: "#fff" }}>
                {step.num}
              </div>
              <h3 className="text-[13px] font-medium" style={{ color: "var(--tx)", marginBottom: "6px" }}>{step.title}</h3>
              <p className="text-xs" style={{ color: "#9ca3af", lineHeight: "1.5" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <section className="flex-1 px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">

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
                  <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>{f.label}</div>
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
            <p className="text-sm mb-6" style={{ color: "var(--tx3)" }}>
              Start with an address. Your analysis is ready in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/properties/add"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#34d399", color: "#fff" }}
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
