"use client";

import { useState } from "react";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://propra-app-production.up.railway.app";

const PRESETS = [
  { label: "5 industrial, FL", portfolio: "I have 5 industrial assets in Florida" },
  { label: "8 mixed, FL", portfolio: "I have 8 mixed commercial assets in Florida" },
  { label: "10 logistics, SE England", portfolio: "I have 10 logistics assets in Southeast England" },
  { label: "3 office, London", portfolio: "I have 3 office assets in London" },
];

export function OutreachLinkGen() {
  const [portfolio, setPortfolio] = useState("");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const params = new URLSearchParams();
  if (portfolio.trim()) params.set("portfolio", portfolio.trim());
  if (email.trim()) params.set("email", email.trim());
  const link = `${APP_URL}/audit${params.toString() ? `?${params.toString()}` : ""}`;

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

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
          Generate a personalised <code style={{ color: "#8ba0b8" }}>/audit</code> link that pre-fills the prospect&apos;s portfolio description and email. Paste into outreach emails — prospect sees their opportunity estimate instantly.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#5a7a96" }}>
              Portfolio description
            </label>
            <input
              type="text"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="I have 6 industrial assets in Florida"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "#0B1622",
                border: "1px solid #1a2d45",
                color: "#e8eef5",
              }}
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
              style={{
                backgroundColor: "#0B1622",
                border: "1px solid #1a2d45",
                color: "#e8eef5",
              }}
            />
          </div>
        </div>

        {/* Generated URL */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
        >
          <span className="flex-1 text-xs font-mono truncate" style={{ color: "#8ba0b8" }}>
            {link}
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
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
      </div>
    </section>
  );
}
