"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

function BookedContent() {
  const params = useSearchParams();
  const name = params.get("name") ?? "";
  const company = params.get("company") ?? "";
  const portfolio = params.get("portfolio") ?? "";
  const isUK = portfolio === "se-logistics" || params.get("currency") === "GBP";
  const assetsRaw = parseInt(params.get("assets") ?? "0", 10);
  const assets = Number.isFinite(assetsRaw) && assetsRaw > 0 ? assetsRaw : undefined;

  const email = params.get("email") ?? "";
  const firstName = name.split(" ")[0];
  const signupHref = isUK ? "/signup?market=uk" : "/signup";

  // Capture confirmed booking as a high-intent lead event
  const capturedRef = useRef(false);
  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    fetch("/api/leads/book-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || undefined,
        email: email || undefined,
        company: company || undefined,
        assets: assets || undefined,
        portfolio: portfolio || undefined,
        serviceType: "demo_booked",
      }),
    }).catch(() => {});
  }, [name, email, company, assets, portfolio]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0B1622" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4"
        style={{ borderBottom: "1px solid #1a2d45" }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
          >
            RealHQ
          </span>
        </Link>
        <span className="text-xs" style={{ color: "#5a7a96" }}>Commission-only. You pay nothing until RealHQ delivers.</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg text-center">

          {/* Confirmation icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C40" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L9.5 17.5L20 7" stroke="#0A8A4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Headline */}
          <h1
            className="text-3xl sm:text-4xl font-semibold mb-4"
            style={{ fontFamily: SERIF, color: "#e8eef5" }}
          >
            {firstName ? `${firstName} — you're booked.` : "You're booked."}
          </h1>

          <p className="text-base mb-3" style={{ color: "#8ba0b8" }}>
            Check your email for the calendar confirmation.
            {company ? ` Ian will review ${company}'s profile before the call.` : " Ian will review your portfolio details before the call."}
          </p>
          <p className="text-sm mb-10" style={{ color: "#5a7a96" }}>
            The call takes 20 minutes. You&apos;ll leave with specific numbers — not a pitch.
          </p>

          {/* What to expect */}
          <div
            className="rounded-2xl overflow-hidden mb-8 text-left"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div
              className="px-5 py-3 text-xs font-medium uppercase tracking-widest"
              style={{ color: "#5a7a96", borderBottom: "1px solid #1a2d45", letterSpacing: "0.1em" }}
            >
              What happens on the call
            </div>
            {[
              { n: "1", title: "Your numbers, not slides", desc: isUK ? "Ian will show live insurance benchmarks, Ofgem energy rates, and income opportunities specific to SE logistics assets." : "Ian will show live insurance benchmarks, FL energy rates, and income opportunities specific to your portfolio." },
              { n: "2", title: "A clear opportunity figure", desc: "You'll leave with a specific £/$ number — total annual opportunity across insurance, energy, and income." },
              { n: "3", title: "No obligation", desc: "Commission-only means we only earn if we deliver savings. The call is free. The analysis is free. You decide if it's worth proceeding." },
            ].map((item) => (
              <div key={item.n} className="flex gap-4 px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                  style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}
                >
                  {item.n}
                </div>
                <div>
                  <div className="text-sm font-medium mb-0.5" style={{ color: "#e8eef5" }}>{item.title}</div>
                  <div className="text-sm" style={{ color: "#5a7a96" }}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div className="flex gap-4 px-5 py-4">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}
              >
                4
              </div>
              <div>
                <div className="text-sm font-medium mb-0.5" style={{ color: "#e8eef5" }}>Access your live dashboard</div>
                <div className="text-sm" style={{ color: "#5a7a96" }}>Sign up below and explore your portfolio intelligence dashboard before the call — it&apos;s live on your portfolio data within 48 hours of onboarding.</div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={signupHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Get early dashboard access →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-80"
              style={{ backgroundColor: "#111e2e", color: "#8ba0b8", border: "1px solid #1a2d45" }}
            >
              Explore the demo first
            </Link>
          </div>

          <p className="mt-6 text-xs" style={{ color: "#3d5a72" }}>
            Questions? Reply to Ian&apos;s email or write to{" "}
            <a href="mailto:hello@realhq.com" style={{ color: "#5a7a96" }}>hello@realhq.com</a>
          </p>
        </div>
      </main>

      <footer
        className="px-6 lg:px-12 py-5 text-center text-xs"
        style={{ borderTop: "1px solid #1a2d45", color: "#3d5a72" }}
      >
        RealHQ · Commission-only portfolio intelligence · realhq.com
      </footer>
    </div>
  );
}

export default function BookedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0B1622" }}>
        <div className="text-sm" style={{ color: "#5a7a96" }}>Loading…</div>
      </div>
    }>
      <BookedContent />
    </Suspense>
  );
}
