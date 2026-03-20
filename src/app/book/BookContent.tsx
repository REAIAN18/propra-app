"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { fmtK, computeOpportunity } from "@/lib/opportunity";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

export function BookContent() {
  const params = useSearchParams();
  const name = params.get("name") ?? "";
  const company = params.get("company") ?? "";
  const assetsRaw = parseInt(params.get("assets") ?? "0", 10);
  const assets = Number.isFinite(assetsRaw) && assetsRaw > 0 ? assetsRaw : 0;
  const portfolio = params.get("portfolio") ?? "";
  const isUK = portfolio === "se-logistics" || params.get("currency") === "GBP";
  const currency: "GBP" | "USD" = isUK ? "GBP" : "USD";
  const sym = currency === "GBP" ? "£" : "$";

  const email = params.get("email") ?? "";
  const firstName = name.split(" ")[0];
  const hasPersonalisation = !!(firstName || company || assets);
  const opp = assets > 0 ? computeOpportunity(assets, currency) : null;

  // Capture page visit as a lead when arriving via personalized outreach link
  const capturedRef = useRef(false);
  useEffect(() => {
    if (!hasPersonalisation || capturedRef.current) return;
    capturedRef.current = true;
    fetch("/api/leads/book-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: company || undefined,
        name: name || undefined,
        email: email || undefined,
        assets: assets || undefined,
        estimatedOpp: opp?.total,
      }),
    }).catch(() => {});
  }, [hasPersonalisation, company, name, assets, opp]);

  const calParams = new URLSearchParams();
  if (name) calParams.set("name", name);
  if (email) calParams.set("email", email);
  // After booking, redirect to /booked with context so we can show personalised confirmation + sign-up CTA
  const bookedParams = new URLSearchParams();
  if (name) bookedParams.set("name", name);
  if (email) bookedParams.set("email", email);
  if (company) bookedParams.set("company", company);
  if (isUK) bookedParams.set("portfolio", "se-logistics");
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://arcahq.ai";
  calParams.set("redirect_url", `${APP_URL}/booked?${bookedParams.toString()}`);
  const calUrl = `https://cal.com/arcahq/portfolio-review${calParams.toString() ? `?${calParams.toString()}` : ""}`;

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
            Arca
          </span>
        </Link>
        <span className="text-xs" style={{ color: "#5a7a96" }}>Commission-only. You pay nothing until Arca delivers.</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">

          {/* Personalised greeting */}
          {hasPersonalisation && (
            <div className="mb-6 text-xs font-medium uppercase tracking-widest" style={{ color: "#5a7a96", letterSpacing: "0.1em" }}>
              {company || (firstName ? `For ${firstName}` : "Your analysis")}
            </div>
          )}

          {/* Headline */}
          <h1
            className="text-3xl sm:text-4xl font-semibold leading-tight mb-4"
            style={{ fontFamily: SERIF, color: "#e8eef5" }}
          >
            {opp
              ? `${fmtK(opp.total)}/yr sitting in your portfolio.`
              : firstName
              ? `${firstName} — let's look at your portfolio.`
              : "Your portfolio has hidden opportunity."}
          </h1>

          <p className="text-base leading-relaxed mb-10" style={{ color: "#8ba0b8" }}>
            {opp
              ? `Based on ${assets} asset${assets !== 1 ? "s" : ""}, Arca estimates ${fmtK(opp.ins, sym)} in insurance overpay, ${fmtK(opp.energy, sym)} in energy overpay, and ${fmtK(opp.income, sym)} in new income — before we've looked at a single document. The actual numbers are usually higher.`
              : `Most property portfolios overpay on insurance and energy, and leave income on the table. Arca surfaces exactly where, with specific numbers. 20 minutes is enough to show you the gaps.`}
          </p>

          {/* Opportunity breakdown — only shown when assets known */}
          {opp && (
            <div
              className="rounded-2xl overflow-hidden mb-10"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "#1a2d45" }}>
                {[
                  { label: "Insurance overpay", value: fmtK(opp.ins, sym), color: "#F5A94A" },
                  { label: "Energy overpay", value: fmtK(opp.energy, sym), color: "#F5A94A" },
                  { label: "New income", value: fmtK(opp.income, sym), color: "#0A8A4C" },
                ].map((item) => (
                  <div key={item.label} className="px-4 py-5 text-center">
                    <div
                      className="text-xl font-bold mb-1"
                      style={{ fontFamily: SERIF, color: item.color }}
                    >
                      {item.value}
                    </div>
                    <div className="text-xs" style={{ color: "#5a7a96" }}>{item.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>est. / yr</div>
                  </div>
                ))}
              </div>
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}
              >
                <span className="text-xs" style={{ color: "#5a7a96" }}>Total estimated opportunity</span>
                <span
                  className="text-lg font-bold"
                  style={{ fontFamily: SERIF, color: "#F5A94A" }}
                >
                  {fmtK(opp.total, sym)}/yr
                </span>
              </div>
            </div>
          )}

          {/* CTA card */}
          <div
            className="rounded-2xl p-8 mb-6"
            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C40" }}
          >
            <div className="text-sm font-semibold mb-2" style={{ color: "#e8eef5" }}>
              {firstName ? `Book a 20-minute call, ${firstName}` : "Book a 20-minute call"}
            </div>
            <p className="text-sm mb-6" style={{ color: "#8ba0b8" }}>
              We&apos;ll walk through the numbers specific to{" "}
              {company ? <strong style={{ color: "#e8eef5" }}>{company}</strong> : "your portfolio"}.
              No slides. No pitch deck. Just your numbers on screen.
            </p>
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.01] active:scale-[0.98]"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Choose a time →
            </a>
            <div className="mt-4 text-xs" style={{ color: "#3d5a72" }}>
              Or reply to the email from Ian — whichever is easier.
            </div>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center gap-6" style={{ color: "#5a7a96" }}>
            {[
              "Commission-only — pay nothing until Arca delivers",
              "No contracts, no setup",
              "Analysis in 48 hours",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 lg:px-12 py-5 flex items-center justify-between text-xs"
        style={{ borderTop: "1px solid #1a2d45", color: "#3d5a72" }}
      >
        <span>Arca · hello@arcahq.ai</span>
        <Link href="/dashboard" className="hover:opacity-70 transition-opacity" style={{ color: "#5a7a96" }}>
          Explore the demo →
        </Link>
      </footer>
    </div>
  );
}
