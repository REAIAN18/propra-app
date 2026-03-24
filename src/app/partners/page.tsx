"use client";

import { useState } from "react";
import Link from "next/link";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

const ROLES = [
  "Property Manager / Managing Agent",
  "Chartered Surveyor",
  "Commercial Solicitor",
  "Accountant / Tax Adviser",
  "Mortgage Broker / Debt Adviser",
  "Commercial Estate Agent",
  "Other",
];

const STREAMS = [
  { label: "Insurance retender", fee: "15%", note: "of saving delivered" },
  { label: "Energy optimisation", fee: "10%", note: "of year-1 saving" },
  { label: "Additional income", fee: "10%", note: "of year-1 income" },
  { label: "Rent reviews", fee: "8%", note: "of year-1 uplift" },
  { label: "Financing", fee: "1%", note: "arrangement fee" },
  { label: "Acquisitions", fee: "0.5–1%", note: "of deal value" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "You introduce",
    desc: "Send your client to RealHQ or share their contact with us. We take it from there — no extra work for you.",
    color: "#1647E8",
  },
  {
    step: "02",
    title: "RealHQ delivers",
    desc: "RealHQ benchmarks every line, executes the fix — carrier placement, supplier switch, rent review — and recovers the saving.",
    color: "#F5A94A",
  },
  {
    step: "03",
    title: "You earn 2%",
    desc: "We pay you 2% of our commission on every income stream we deliver — for 12 months after the introduction.",
    color: "#0A8A4C",
  },
];

export default function PartnersPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    clientBase: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.company.trim() || !form.role) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.name.trim() && form.email.trim() && form.company.trim() && form.role;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F9FAFB" }}>
      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4 shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#111827", letterSpacing: "0.12em" }}>
            RealHQ
          </span>
        </Link>
        <a
          href="/book"
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "#6B7280" }}
        >
          Book a call →
        </a>
      </header>

      <main className="flex-1 px-6 lg:px-12 py-12 lg:py-20">
        <div className="max-w-2xl mx-auto">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #0A8A4C", color: "#0A8A4C" }}>
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
            Referral Programme · 2% commission for 12 months
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl leading-[1.1] mb-4" style={{ fontFamily: SERIF, color: "#111827" }}>
            Earn commission<br />on every portfolio<br />
            <span style={{ color: "#F5A94A" }}>you introduce</span>
          </h1>
          <p className="text-lg mb-10 max-w-lg" style={{ color: "#6B7280" }}>
            If you work with commercial property owners, RealHQ pays you 2% of every commission
            we earn — across insurance, energy, income, rent reviews, and financing — for 12 months.
            No work required beyond the introduction.
          </p>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl p-5"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
              >
                <div className="text-xs font-bold mb-3" style={{ color: item.color }}>{item.step}</div>
                <div className="text-sm font-semibold mb-1.5" style={{ color: "#111827" }}>{item.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Commission table */}
          <div className="mb-12 rounded-xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#9CA3AF", backgroundColor: "#F9FAFB", letterSpacing: "0.08em", borderBottom: "1px solid #E5E7EB" }}>
              What you earn · 2% of RealHQ&apos;s fee on each stream
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {STREAMS.map((s) => (
                <div key={s.label} className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: "#fff" }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{s.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>RealHQ earns {s.fee} {s.note}</div>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#0A8A4C", fontFamily: SERIF }}>
                    2% of that
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 text-xs" style={{ backgroundColor: "#F9FAFB", borderTop: "1px solid #E5E7EB", color: "#9CA3AF" }}>
              Example: a 5-asset portfolio saving $102k on insurance → RealHQ earns $15,300 → you earn $306 on that stream alone. Multiply across all streams and 12 months.
            </div>
          </div>

          {/* Who this is for */}
          <div className="mb-12 rounded-xl p-6" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#111827" }}>Who this is for</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Property managers & managing agents with commercial portfolios",
                "Chartered surveyors advising owner-occupiers or investors",
                "Commercial solicitors handling acquisitions or lease renewals",
                "Accountants with CRE clients overpaying on tax-deductible costs",
                "Mortgage brokers who see the full debt picture",
                "Commercial estate agents with vendor or buyer relationships",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 text-sm" style={{ color: "#6B7280" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Application form or confirmation */}
          {submitted ? (
            <div className="rounded-2xl p-8" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#0A8A4C" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-base font-semibold" style={{ color: "#111827" }}>Application received</span>
              </div>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                Thanks, {form.name.split(" ")[0]}. We&apos;ll be in touch within 24 hours to set up your referral agreement and give you everything you need to start introducing clients.
              </p>
              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Book a call to discuss →
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <h2 className="text-xl sm:text-2xl mb-2" style={{ fontFamily: SERIF, color: "#111827" }}>
                Apply to become a partner
              </h2>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                We&apos;ll set up a referral agreement and give you a personalised referral link within 24 hours.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Full name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
                      onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                      onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Work email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="jane@firm.com"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
                      onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                      onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Company / firm *</label>
                    <input
                      type="text"
                      required
                      value={form.company}
                      onChange={(e) => set("company", e.target.value)}
                      placeholder="Smith & Partners"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
                      onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                      onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Your role *</label>
                    <select
                      required
                      value={form.role}
                      onChange={(e) => set("role", e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: form.role ? "#111827" : "#9CA3AF" }}
                      onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                      onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    >
                      <option value="" disabled>Select your role</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r} style={{ backgroundColor: "#fff", color: "#111827" }}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                    Describe your client base <span style={{ color: "#D1D5DB" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.clientBase}
                    onChange={(e) => set("clientBase", e.target.value)}
                    placeholder="e.g. I manage 20 commercial portfolios across South Florida, mostly industrial and mixed-use"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
                    onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                    Anything else? <span style={{ color: "#D1D5DB" }}>(optional)</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    rows={3}
                    placeholder="Questions about the programme, specific clients in mind, how you'd like to work together…"
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
                    onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>

                {error && (
                  <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  {submitting ? "Submitting…" : "Apply to partner with RealHQ →"}
                </button>
              </form>
            </div>
          )}

          {/* Trust */}
          <div className="mt-10 flex flex-wrap items-center gap-6" style={{ color: "#9CA3AF" }}>
            {[
              "No exclusivity required",
              "Simple referral agreement",
              "Paid within 30 days of delivery",
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

      <footer
        className="px-6 lg:px-12 py-5 flex items-center justify-between text-xs"
        style={{ borderTop: "1px solid #E5E7EB", color: "#D1D5DB" }}
      >
        <span>RealHQ · <a href="mailto:hello@realhq.com" style={{ color: "#9CA3AF" }}>hello@realhq.com</a></span>
        <Link href="/" className="hover:opacity-70 transition-opacity" style={{ color: "#9CA3AF" }}>
          ← Back to RealHQ
        </Link>
      </footer>
    </div>
  );
}
