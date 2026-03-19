"use client";

import { useState } from "react";

// Benchmark figures matching PortfolioCalculator + /lib/opportunity
function computeOpp(portfolio: string): number {
  const match = portfolio.match(/\b(\d+)\b/);
  const n = match ? Math.min(30, Math.max(1, parseInt(match[1]))) : 5;
  const ins = Math.round(n * 1_500);
  const eng = Math.round(n * 4_333);
  const inc = Math.round(80_000 + Math.min(n, 20) * 2_200);
  return ins + eng + inc;
}

function fmtK(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(v / 1_000)}k`;
}

function buildEmailTemplate(portfolio: string, company: string, auditLink: string): string {
  const match = portfolio.match(/\b(\d+)\b/);
  const n = match ? Math.min(30, Math.max(1, parseInt(match[1]))) : 5;
  const ins = Math.round(n * 1_500);
  const eng = Math.round(n * 4_333);
  const inc = Math.round(80_000 + Math.min(n, 20) * 2_200);
  const total = ins + eng + inc;

  const prospect = company.trim() || "your portfolio";
  const insStr = fmtK(ins);
  const engStr = fmtK(eng);
  const incStr = fmtK(inc);
  const totalStr = fmtK(total);

  return `Subject: ${totalStr}/yr left on the table — ${prospect}

Hi [name],

I ran a quick benchmark on ${prospect} and the numbers came back at ${totalStr}/yr in recoverable value:

- Insurance: ${insStr}/yr overpay vs current market
- Energy: ${engStr}/yr gap vs market rate
- Additional income (solar, EV, 5G): ${incStr}/yr untapped

These are estimates based on your portfolio size. The real numbers — specific to your policies, tariffs, and assets — are usually sharper.

Arca is commission-only: you pay nothing until we deliver a saving or new income stream.

Your personalised estimate: ${auditLink}

Happy to walk through the numbers in 20 minutes if any of this resonates.

Ian Baron
Arca
hello@arcahq.ai`;
}

const PRESETS = [
  { label: "5 industrial, FL", portfolio: "I have 5 industrial assets in Florida" },
  { label: "8 mixed, FL", portfolio: "I have 8 mixed commercial assets in Florida" },
  { label: "10 logistics, SE England", portfolio: "I have 10 logistics assets in Southeast England" },
  { label: "3 office, London", portfolio: "I have 3 office assets in London" },
  { label: "12 warehouse, Midlands", portfolio: "I have 12 warehouse assets in the Midlands" },
];

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "#5a7a96" }}>{label}</span>
        <button
          onClick={copy}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: copied ? "#0f2a1c" : "#111e2e",
            color: copied ? "#0A8A4C" : "#8ba0b8",
            border: `1px solid ${copied ? "#0A8A4C" : "#1a2d45"}`,
          }}
        >
          {copied ? "Copied ✓" : "Copy email"}
        </button>
      </div>
      <pre
        className="text-xs rounded-lg px-3 py-3 overflow-x-auto whitespace-pre-wrap"
        style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#8ba0b8", fontFamily: "monospace", lineHeight: "1.5" }}
      >
        {text}
      </pre>
    </div>
  );
}

function CopyRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div>
      <div className="text-xs font-medium mb-1.5" style={{ color: "#5a7a96" }}>{label}</div>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
      >
        <span className="flex-1 text-xs font-mono truncate" style={{ color: "#8ba0b8" }}>
          {url}
        </span>
        <button
          onClick={copy}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: copied ? "#0f2a1c" : "#0A8A4C",
            color: copied ? "#0A8A4C" : "#fff",
            border: copied ? "1px solid #0A8A4C" : "none",
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function OutreachLinkGen() {
  const [portfolio, setPortfolio] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://propra-app-production.up.railway.app";

  // Audit link — pre-fills estimate for first-touch outreach
  const auditParams = new URLSearchParams();
  if (portfolio.trim()) auditParams.set("portfolio", portfolio.trim());
  if (email.trim()) auditParams.set("email", email.trim());
  const auditLink = `${appUrl}/audit${auditParams.toString() ? `?${auditParams.toString()}` : ""}`;

  // Demo link — personalised dashboard for pre-call / during call
  const opp = portfolio.trim() ? computeOpp(portfolio) : 506000;
  const demoParams = new URLSearchParams({ welcome: "1", opp: String(opp) });
  if (company.trim()) demoParams.set("company", company.trim());
  const demoLink = `${appUrl}/dashboard?${demoParams.toString()}`;

  // Book link — warm follow-up / post-first-reply CTA (single screen, single action)
  const bookParams = new URLSearchParams();
  if (name.trim()) bookParams.set("name", name.trim());
  if (company.trim()) bookParams.set("company", company.trim());
  const match = portfolio.match(/\b(\d+)\b/);
  const assetCount = match ? Math.min(30, Math.max(1, parseInt(match[1]))) : 0;
  if (assetCount > 0) bookParams.set("assets", String(assetCount));
  const bookLink = `${appUrl}/book${bookParams.toString() ? `?${bookParams.toString()}` : ""}`;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold" style={{ color: "#e8eef5" }}>
          Outreach Link Generator
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#1647e822", color: "#1647E8" }}>
          HoG tool
        </span>
      </div>
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
      >
        <p className="text-xs" style={{ color: "#5a7a96" }}>
          Generate personalised links for outreach. The <strong style={{ color: "#8ba0b8" }}>audit link</strong> pre-fills the estimate. The <strong style={{ color: "#8ba0b8" }}>demo link</strong> opens the live dashboard personalised. The <strong style={{ color: "#8ba0b8" }}>book link</strong> is a focused conversion page — one screen, one CTA, send after a reply.
        </p>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPortfolio(p.portfolio)}
              className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: "#111e2e", color: "#8ba0b8", border: "1px solid #1a2d45" }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#5a7a96" }}>
              Portfolio description
            </label>
            <input
              type="text"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="I have 6 industrial assets in Florida"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#5a7a96" }}>
              Company name
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Properties"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#5a7a96" }}>
              Contact name (for book link)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#5a7a96" }}>
              Prospect email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prospect@company.com"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <CopyRow label="Audit link (first-touch outreach)" url={auditLink} />
          <CopyRow label="Demo link (for pre-call or during call)" url={demoLink} />
          <CopyRow label="Book link (warm follow-up — single CTA to book a call)" url={bookLink} />
        </div>

        {portfolio.trim() && (
          <CopyBlock
            label="Email template (edit before sending)"
            text={buildEmailTemplate(portfolio, company, auditLink)}
          />
        )}
      </div>
    </section>
  );
}
