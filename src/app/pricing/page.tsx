import Link from "next/link";
import type { Metadata } from "next";
import { PricingCalculator } from "./PricingCalculator";

export const metadata: Metadata = {
  title: "Pricing — RealHQ",
  description:
    "RealHQ benchmarks every cost line across insurance, energy, rent, income, financing, and acquisitions — then goes and fixes what it finds.",
};

const services = [
  {
    label: "Insurance",
    accent: "#F5A94A",
    what: "RealHQ benchmarks your premiums against 12+ carriers and manages the full retender — market approach, negotiation, and placement.",
    example: "$18k/yr recovered on a mixed-use portfolio.",
    fee: "15% of saving",
    feeNote: "One-time on year-1 saving. Nothing in subsequent years.",
  },
  {
    label: "Energy",
    accent: "#7c6af0",
    what: "RealHQ compares live supplier tariffs against your current rate and executes the switch directly via supplier API — no broker, no forms, no break in supply.",
    example: "$52k saved in year one on a logistics portfolio.",
    fee: "10% of year-1 saving",
    feeNote: "Based on the difference from your current contracted rate.",
  },
  {
    label: "Additional Income",
    accent: "#34d399",
    what: "RealHQ identifies and activates solar, EV charging, 5G mast, and parking income across your assets — no capex required.",
    example: "$124k/yr new income identified across a 10-asset portfolio.",
    fee: "10% of year-1 income",
    feeNote: "Charged only when new income is contracted and live.",
  },
  {
    label: "Rent Reviews",
    accent: "#F5A94A",
    what: "RealHQ identifies below-market leases, triggers rent reviews at the optimal moment, and drives negotiations to market ERV.",
    example: "$54k/yr uplift secured on a Brickell retail lease renewal.",
    fee: "8% of first-year uplift",
    feeNote: "Charged only when new rent is agreed and contracted.",
  },
  {
    label: "Financing",
    accent: "#7c6af0",
    what: "RealHQ sources competing lender terms across banks and debt funds, manages the refinancing process, and monitors covenants.",
    example: "$97k/yr excess debt service recovered across 5 assets.",
    fee: "1% arrangement fee",
    feeNote: "On placed debt facility. Payable only on completion.",
  },
  {
    label: "Acquisitions",
    accent: "#34d399",
    what: "RealHQ screens market listings against your criteria, scores deals by fit and projected IRR, and manages the full transaction.",
    example: "$40k fee on a $4M industrial acquisition.",
    fee: "0.5–1% of deal value",
    feeNote: "Advisory fee on completed acquisitions.",
  },
];

const otherFees = [
  { label: "Contractor tendering", fee: "3% of contract value", example: "$7.5k on a $250k refurb" },
  { label: "Transaction management (sale)", fee: "0.25% of deal value", example: "$10k on a $4M sale" },
  { label: "Work order cost reduction", fee: "8% of saving vs benchmark", example: "Saved $12k on a quoted $80k job" },
];

const faqs = [
  {
    q: "What does RealHQ charge?",
    a: "RealHQ charges a success fee only when value is delivered. 15% of insurance saving, 10% of energy year-1 saving, 10% of new income year-1, 8% of rent review uplift, 1% arrangement fee on placed debt, 0.5–1% on acquisitions.",
  },
  {
    q: "How long does it take to see results?",
    a: "Insurance placements typically close in 4–8 weeks. Energy switches in 2–6 weeks. Rent reviews vary by lease terms — 8–16 weeks is typical. Upload your documents and you'll see a quantified opportunity in under 60 seconds.",
  },
  {
    q: "Do I need to switch providers or manage anything?",
    a: "No. Energy switches execute directly in the platform via supplier API — you click confirm, the software handles the rest. Insurance, rent reviews, and financing are handled by RealHQ — from benchmarking through to placement, negotiation, and completion. You approve the outcome at each stage.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel any time before a deal is agreed. Once RealHQ delivers savings and you've signed off, the success fee applies. There are no lock-ins, no retainers, and no penalties.",
  },
  {
    q: "Is there a minimum portfolio size?",
    a: "No minimum. RealHQ works on single assets and large portfolios alike. The economics work at any scale because the fee is always proportional to what RealHQ recovers.",
  },
  {
    q: "Can I run RealHQ on just one service?",
    a: "Yes. You can instruct RealHQ on any individual service independently. Most clients start with insurance or energy — the fastest wins — and expand from there.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--s2)", fontFamily: "var(--font-geist-sans)" }}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--bdr)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#34d399" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "var(--tx)", letterSpacing: "0.12em" }}
          >
            RealHQ
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--tx2)" }}
          >
            Demo
          </Link>
          <Link
            href="/book"
            className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "transparent", color: "#7c6af0", border: "1px solid #7c6af0" }}
          >
            Book a call →
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#34d399", color: "#fff" }}
          >
            See your portfolio →
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pt-16 pb-12">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #34d399", color: "#166534" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
            RealHQ · Service fees
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1] mb-5"
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              color: "var(--tx)",
            }}
          >
            Service fees aligned<br />
            <em style={{ color: "#34d399" }}>with your outcomes.</em>
          </h1>

          <p className="text-lg leading-relaxed max-w-xl mx-auto mb-8" style={{ color: "var(--tx2)" }}>
            RealHQ benchmarks every cost line, identifies what you are overpaying, and closes the gap.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#34d399", color: "#fff" }}
            >
              See your portfolio →
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ border: "1px solid #D1D5DB", color: "var(--tx2)", backgroundColor: "transparent" }}
            >
              Book a call →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Service grid ────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "var(--tx3)", letterSpacing: "0.1em" }}>
            Core services
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
              >
                <div>
                  <div className="h-0.5 w-8 rounded-full mb-3" style={{ backgroundColor: s.accent }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: s.accent, letterSpacing: "0.1em" }}
                  >
                    {s.label}
                  </span>
                </div>

                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--tx2)" }}>
                  {s.what}
                </p>

                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "var(--s2)", border: `1px solid ${s.accent}22` }}
                >
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--tx3)" }}>
                    Example
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{
                      fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      color: s.accent,
                    }}
                  >
                    {s.example}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--tx3)" }}>
                    RealHQ fee
                  </p>
                  <p
                    className="text-xl font-semibold"
                    style={{
                      fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      color: "var(--tx)",
                    }}
                  >
                    {s.fee}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--tx3)" }}>
                    {s.feeNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Other fees ──────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "var(--tx3)", letterSpacing: "0.1em" }}>
            Additional services
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
              {otherFees.map((f) => (
                <div key={f.label} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>{f.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>{f.example}</div>
                  </div>
                  <div
                    className="text-sm font-semibold shrink-0"
                    style={{
                      fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      color: "var(--tx2)",
                    }}
                  >
                    {f.fee}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Zero-risk statement ──────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl p-8 sm:p-12 text-center"
            style={{
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
            }}
          >
            <p
              className="text-3xl sm:text-4xl leading-[1.2] mb-4"
              style={{
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                color: "var(--tx)",
              }}
            >
              &ldquo;RealHQ benchmarks every cost line<br />
              <span style={{ color: "#34d399" }}>and closes what it finds.&rdquo;</span>
            </p>
            <p className="text-base" style={{ color: "var(--tx2)" }}>
              If RealHQ doesn&rsquo;t find and close a saving, you owe nothing. Every engagement starts with a free portfolio audit.
            </p>
          </div>
        </div>
      </section>

      {/* ── Net gain calculator ─────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-xs font-medium uppercase tracking-widest mb-6 text-center" style={{ color: "var(--tx3)", letterSpacing: "0.1em" }}>
            Run the numbers
          </div>
          <PricingCalculator />
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl mb-8 text-center"
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              color: "var(--tx)",
            }}
          >
            Questions
          </h2>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl p-5"
                style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--tx)" }}>
                  {faq.q}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--tx2)" }}>
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
          <Link
            href="/book"
            className="flex-1 inline-flex items-center justify-center px-6 py-4 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#34d399", color: "#fff" }}
          >
            Book a 20-min call →
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center px-6 py-4 rounded-xl text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ border: "1px solid var(--bdr)", color: "var(--tx2)", backgroundColor: "transparent" }}
          >
            See the demo →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-12 py-6 text-center text-xs"
        style={{ borderTop: "1px solid var(--bdr)", color: "var(--tx2)" }}
      >
        <Link href="/" className="hover:opacity-70 transition-opacity">
          RealHQ
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
