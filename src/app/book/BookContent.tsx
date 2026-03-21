"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { fmtK, computeOpportunity } from "@/lib/opportunity";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

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
  if (assets) bookedParams.set("assets", String(assets));
  if (isUK) bookedParams.set("portfolio", "se-logistics");
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://realhq.com";
  calParams.set("redirect_url", `${APP_URL}/booked?${bookedParams.toString()}`);
  const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK ?? "https://cal.com/realhq/portfolio-review";
  const calUrl = `${CAL_LINK}${calParams.toString() ? `?${calParams.toString()}` : ""}`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F9FAFB" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 lg:px-12 py-4"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#111827", letterSpacing: "0.12em" }}
          >
            RealHQ
          </span>
        </Link>
        <span className="text-xs" style={{ color: "#9CA3AF" }}>Commission-only. You pay nothing until RealHQ delivers.</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">

          {/* Personalised greeting */}
          {hasPersonalisation && (
            <div className="mb-6 text-xs font-medium uppercase tracking-widest" style={{ color: "#9CA3AF", letterSpacing: "0.1em" }}>
              {company || (firstName ? `For ${firstName}` : "Your analysis")}
            </div>
          )}

          {/* Headline */}
          <h1
            className="text-3xl sm:text-4xl font-semibold leading-tight mb-4"
            style={{ fontFamily: SERIF, color: "#111827" }}
          >
            {opp
              ? `${fmtK(opp.total)}/yr sitting in your portfolio.`
              : firstName
              ? `${firstName} — let's look at your portfolio.`
              : "Your portfolio has hidden opportunity."}
          </h1>

          <p className="text-base leading-relaxed mb-10" style={{ color: "#6B7280" }}>
            {opp
              ? `Based on ${assets} asset${assets !== 1 ? "s" : ""}, RealHQ estimates ${fmtK(opp.ins, sym)} in insurance overpay, ${fmtK(opp.energy, sym)} in energy overpay, and ${fmtK(opp.income, sym)} in new income — before we've looked at a single document. The actual numbers are usually higher.`
              : `Most property portfolios overpay on insurance and energy, and leave income on the table. RealHQ surfaces exactly where, with specific numbers. 20 minutes is enough to show you the gaps.`}
          </p>

          {/* Opportunity breakdown — only shown when assets known */}
          {opp && (
            <div
              className="rounded-2xl overflow-hidden mb-10"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "#E5E7EB" }}>
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
                    <div className="text-xs" style={{ color: "#9CA3AF" }}>{item.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>est. / yr</div>
                  </div>
                ))}
              </div>
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}
              >
                <span className="text-xs" style={{ color: "#9CA3AF" }}>Total estimated opportunity</span>
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
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <div className="text-sm font-semibold mb-2" style={{ color: "#111827" }}>
              {firstName ? `Book a 20-minute call, ${firstName}` : "Book a 20-minute call"}
            </div>
            <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
              We&apos;ll walk through the numbers specific to{" "}
              {company ? <strong style={{ color: "#111827" }}>{company}</strong> : "your portfolio"}.
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
            <div className="mt-4 text-xs" style={{ color: "#9CA3AF" }}>
              Can&apos;t find a time?{" "}
              <a
                href={`mailto:ian@realhq.com?subject=Portfolio review call${name ? ` — ${name}` : ""}${company ? ` (${company})` : ""}&body=Hi Ian,%0A%0AI'd like to schedule a portfolio review call. Please let me know your availability.%0A%0AThanks`}
                className="underline hover:opacity-80"
                style={{ color: "#0A8A4C" }}
              >
                Email ian@realhq.com directly →
              </a>
            </div>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center gap-6" style={{ color: "#9CA3AF" }}>
            {[
              "Commission-only — pay nothing until RealHQ delivers",
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
        style={{ borderTop: "1px solid #E5E7EB", color: "#D1D5DB" }}
      >
        <span>RealHQ · hello@realhq.com</span>
        <Link href="/dashboard" className="hover:opacity-70 transition-opacity" style={{ color: "#9CA3AF" }}>
          Explore the demo →
        </Link>
      </footer>
    </div>
  );
}
