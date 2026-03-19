import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Arca",
  description:
    "Commission-only. No upfront cost. No retainer. Arca earns when you earn — across insurance, energy, and rent.",
};

const services = [
  {
    label: "Insurance",
    accent: "#F5A94A",
    what: "Arca benchmarks your premiums against 12+ carriers and manages the full retender — market approach, negotiation, and placement.",
    example: "$18k/yr recovered on a 14-asset mixed portfolio.",
    fee: "20% of first-year savings",
    feeNote: "One-time. Nothing in subsequent years.",
    icon: "🏛",
  },
  {
    label: "Energy",
    accent: "#1647E8",
    what: "Arca sources competitive tariffs across suppliers, runs the switch end-to-end, and ensures no break in supply.",
    example: "$52k saved in year one on a 20-asset logistics portfolio.",
    fee: "10% of first-year savings",
    feeNote: "Based on the difference from your current contract.",
    icon: "⚡",
  },
  {
    label: "Rent",
    accent: "#0A8A4C",
    what: "Arca identifies below-market leases, triggers rent reviews at the optimal moment, and drives negotiations to market rate.",
    example: "$31k/yr uplift secured on 6 retail units.",
    fee: "20% of first-year uplift",
    feeNote: "Charged only when new rent is agreed and contracted.",
    icon: "🏢",
  },
];

const faqs = [
  {
    q: "What does Arca charge?",
    a: "20% of first-year savings on insurance and rent uplift; 10% on energy savings. Nothing upfront. Nothing if Arca doesn't deliver.",
  },
  {
    q: "How long does it take to see results?",
    a: "Insurance placements typically close in 4–8 weeks. Energy switches in 2–6 weeks. Rent reviews vary by lease terms — 8–16 weeks is typical. You'll see a quantified opportunity within 48 hours of connecting your portfolio.",
  },
  {
    q: "Do I need to switch providers or manage anything?",
    a: "No. Arca handles the process end-to-end — market approach, negotiation, paperwork. You approve the outcome and sign nothing until you're satisfied.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel any time before a deal is agreed. Once Arca delivers savings and you've signed off, the success fee applies. There are no lock-ins, no retainers, and no penalties.",
  },
  {
    q: "Is there a minimum portfolio size?",
    a: "No minimum. Arca works on single assets and 200-asset portfolios alike. The economics work at any scale because the fee is always proportional to what Arca recovers.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0B1622", fontFamily: "var(--font-geist-sans)" }}>
      {/* ── Nav ─────────────────────────────────────────────── */}
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
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#8ba0b8" }}
          >
            Demo
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
            Get started →
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pt-16 pb-12">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C", color: "#0A8A4C" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
            Commission-only · No upfront cost
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1] mb-5"
            style={{
              fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
              color: "#e8eef5",
            }}
          >
            No upfront cost.<br />No retainer.<br />
            <em style={{ color: "#0A8A4C" }}>We earn when you earn.</em>
          </h1>

          <p className="text-lg leading-relaxed max-w-xl mx-auto" style={{ color: "#8ba0b8" }}>
            Arca works on a pure commission basis. You pay nothing until we recover money you were already losing.
          </p>
        </div>
      </section>

      {/* ── Service columns ─────────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-6 flex flex-col gap-5"
              style={{ backgroundColor: "#0f1c2e", border: "1px solid #1a2d45" }}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: s.accent, letterSpacing: "0.1em" }}
                >
                  {s.label}
                </span>
              </div>

              {/* What Arca does */}
              <p className="text-sm leading-relaxed" style={{ color: "#8ba0b8" }}>
                {s.what}
              </p>

              {/* Example savings — Issue → Cost */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "#0B1622", border: `1px solid ${s.accent}22` }}
              >
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#8ba0b8" }}>
                  Example saving
                </p>
                <p
                  className="text-xl font-semibold"
                  style={{
                    fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                    color: s.accent,
                  }}
                >
                  {s.example}
                </p>
              </div>

              {/* Fee — Action */}
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#8ba0b8" }}>
                  Arca fee
                </p>
                <p
                  className="text-2xl font-semibold"
                  style={{
                    fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                    color: "#e8eef5",
                  }}
                >
                  {s.fee}
                </p>
                <p className="text-xs mt-1" style={{ color: "#8ba0b8" }}>
                  {s.feeNote}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Zero-risk statement ──────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl p-8 sm:p-12 text-center"
            style={{
              background: "linear-gradient(135deg, #0f2a1c 0%, #0f1c2e 50%, #0b1928 100%)",
              border: "1px solid #0A8A4C44",
            }}
          >
            <p
              className="text-3xl sm:text-4xl leading-[1.2] mb-4"
              style={{
                fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                color: "#e8eef5",
              }}
            >
              &ldquo;No upfront cost. No retainer.<br />
              <span style={{ color: "#0A8A4C" }}>We earn when you earn.&rdquo;</span>
            </p>
            <p className="text-base" style={{ color: "#8ba0b8" }}>
              If Arca doesn&rsquo;t find and close a saving, you owe nothing. Every engagement starts with a free portfolio audit.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl mb-8 text-center"
            style={{
              fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
              color: "#e8eef5",
            }}
          >
            Questions
          </h2>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl p-5"
                style={{ backgroundColor: "#0f1c2e", border: "1px solid #1a2d45" }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: "#e8eef5" }}>
                  {faq.q}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#8ba0b8" }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTAs ────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-20">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://cal.com/arca/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-6 py-4 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Book a 20-min call →
          </a>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center px-6 py-4 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ border: "1px solid #1a2d45", color: "#8ba0b8", backgroundColor: "transparent" }}
          >
            See the demo →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-12 py-6 text-center text-xs"
        style={{ borderTop: "1px solid #1a2d45", color: "#8ba0b8" }}
      >
        <Link href="/" className="hover:opacity-70 transition-opacity">
          Arca
        </Link>
        {" · "}
        <Link href="/pricing" className="hover:opacity-70 transition-opacity">
          Pricing
        </Link>
        {" · "}
        <Link href="/dashboard" className="hover:opacity-70 transition-opacity">
          Demo
        </Link>
      </footer>
    </div>
  );
}
