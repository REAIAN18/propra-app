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

const PRESETS = [
  { label: "5 industrial, FL", portfolio: "I have 5 industrial assets in Florida" },
  { label: "8 mixed, FL", portfolio: "I have 8 mixed commercial assets in Florida" },
  { label: "10 logistics, SE England", portfolio: "I have 10 logistics assets in Southeast England" },
  { label: "3 office, London", portfolio: "I have 3 office assets in London" },
  { label: "12 warehouse, Midlands", portfolio: "I have 12 warehouse assets in the Midlands" },
];

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
          Generate personalised links for outreach emails and demo calls. The <strong style={{ color: "#8ba0b8" }}>audit link</strong> pre-fills the prospect&apos;s portfolio and shows their estimate instantly. The <strong style={{ color: "#8ba0b8" }}>demo link</strong> shows the live dashboard personalised with their company name.
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
              Company name (for demo link)
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
        </div>
      </div>
    </section>
  );
}
