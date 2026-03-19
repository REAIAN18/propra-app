"use client";

import { useState } from "react";

const ASSET_TYPES = ["industrial", "office", "retail", "mixed-use", "logistics", "warehouse", "residential"];

const MARKETS = [
  { id: "fl", label: "🇺🇸 Florida (USD)", sym: "$", fx: 1 },
  { id: "seuk", label: "🇬🇧 SE England (GBP)", sym: "£", fx: 0.8 },
];

function fmtK(v: number, sym = "$") {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v}`;
}

function computeEstimate(assetCount: number, fx = 1) {
  const ins = Math.round(assetCount * 1_500 * fx);
  const eng = Math.round(assetCount * 4_333 * fx);
  const inc = Math.round((80_000 + Math.min(assetCount, 20) * 2_200) * fx);
  return ins + eng + inc;
}

export function PostDemoMailer() {
  const [open, setOpen] = useState(false);
  const [marketId, setMarketId] = useState("fl");
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    company: "",
    assetCount: "8",
    assetType: "industrial",
    callNote: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const market = MARKETS.find((m) => m.id === marketId) ?? MARKETS[0];
  const assetCountNum = Math.max(1, parseInt(form.assetCount) || 1);
  const estimateTotal = computeEstimate(assetCountNum, market.fx);

  async function handleSend() {
    if (!form.email || !form.firstName || !form.assetCount) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          company: form.company || null,
          assetCount: assetCountNum,
          assetType: form.assetType,
          estimateTotal,
          currencySym: market.sym,
          callNote: form.callNote || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed");
      }
      setSent(true);
      setForm({ email: "", firstName: "", company: "", assetCount: "8", assetType: "industrial", callNote: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#0d1825] transition-colors text-left"
        style={{ backgroundColor: "#111e2e" }}
        onClick={() => { setOpen(o => !o); setSent(false); setError(null); }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Post-Demo Follow-up</div>
          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Send a personalised follow-up email immediately after a demo call</div>
        </div>
        <span className="text-xs font-medium ml-4 shrink-0" style={{ color: "#0A8A4C" }}>{open ? "Close ↑" : "Open ↓"}</span>
      </button>

      {open && (
        <div className="px-5 py-5 space-y-4" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
          {sent && (
            <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ backgroundColor: "#0a8a4c22", color: "#0A8A4C" }}>
              Follow-up sent ✓
            </div>
          )}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "#cc1a1a22", color: "#CC1A1A" }}>
              {error}
            </div>
          )}

          {/* Market selector */}
          <div className="flex gap-2">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMarketId(m.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: marketId === m.id ? "#1a2d45" : "transparent",
                  color: marketId === m.id ? "#e8eef5" : "#5a7a96",
                  border: `1px solid ${marketId === m.id ? "#2a4060" : "#1a2d45"}`,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Row 1: name + email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>First name *</label>
              <input
                type="text"
                placeholder="Sarah"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Email *</label>
              <input
                type="email"
                placeholder="sarah@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
          </div>

          {/* Row 2: company + asset type + count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Company</label>
              <input
                type="text"
                placeholder="Acme Properties"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Asset type</label>
              <select
                value={form.assetType}
                onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              >
                {ASSET_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Asset count *</label>
              <input
                type="number"
                min="1"
                max="500"
                value={form.assetCount}
                onChange={e => setForm(f => ({ ...f, assetCount: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
          </div>

          {/* Computed estimate preview */}
          <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <span className="text-xs" style={{ color: "#5a7a96" }}>Estimate in email</span>
            <span className="text-sm font-bold" style={{ color: "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
              {fmtK(estimateTotal, market.sym)}/yr
            </span>
          </div>

          {/* Call notes */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Call note (optional — appears as a highlighted callout)</label>
            <textarea
              rows={3}
              placeholder="e.g. You mentioned the industrial park in Tampa hasn't been retendered on insurance since 2019 — that's exactly where we'd start."
              value={form.callNote}
              onChange={e => setForm(f => ({ ...f, callNote: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !form.email || !form.firstName || !form.assetCount}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            {sending ? "Sending…" : "Send follow-up email"}
          </button>
        </div>
      )}
    </div>
  );
}
