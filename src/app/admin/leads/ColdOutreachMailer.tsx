"use client";

import { useState } from "react";

const MARKETS = [
  { id: "fl", label: "🇺🇸 Florida (USD)", sym: "$", fx: 1 },
  { id: "seuk", label: "🇬🇧 SE England (GBP)", sym: "£", fx: 0.8 },
] as const;

const FL_AREAS = ["Tampa Bay", "Orlando", "Miami", "Jacksonville", "Fort Lauderdale", "Sarasota", "Naples"];
const SEUK_AREAS = ["Kent", "Essex", "Surrey", "Hertfordshire", "West Sussex", "Berkshire", "Hampshire"];

type Market = "fl" | "seuk";
type Touch = 1 | 2 | 3;

function subjectPreview(market: Market, touch: Touch, area: string): string {
  if (!area) return "—";
  if (market === "fl") {
    if (touch === 1) return `Your insurance bill, ${area} industrial`;
    if (touch === 2) return `Rent roll and income gaps — ${area} industrial`;
    return `Re: Your insurance bill, ${area} industrial`;
  }
  if (touch === 1) return `Energy contracts and MEES — ${area} industrial`;
  if (touch === 2) return `Rent reviews and income — ${area} industrial`;
  return `Re: Energy contracts and MEES — ${area} industrial`;
}

export function ColdOutreachMailer() {
  const [open, setOpen] = useState(false);
  const [marketId, setMarketId] = useState<Market>("fl");
  const [touch, setTouch] = useState<Touch>(1);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    company: "",
    assetCount: "8",
    area: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const market = MARKETS.find((m) => m.id === marketId) ?? MARKETS[0];
  const areaOptions = marketId === "fl" ? FL_AREAS : SEUK_AREAS;
  const preview = subjectPreview(marketId, touch, form.area || areaOptions[0]);

  async function handleSend() {
    if (!form.email || !form.firstName || !form.area || !form.assetCount) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-cold-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          company: form.company || null,
          assetCount: parseInt(form.assetCount) || 8,
          area: form.area,
          touch,
          market: marketId,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed");
      }
      setSent(true);
      setForm({ email: "", firstName: "", company: "", assetCount: "8", area: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#0d1825] transition-colors text-left"
        style={{ backgroundColor: "#111e2e" }}
        onClick={() => { setOpen(o => !o); setSent(false); setError(null); }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Cold Outreach Sender</div>
          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Send Touch 1 (intro), Touch 2 (rent + income), or Touch 3 (case study) cold emails directly to a prospect</div>
        </div>
        <span className="text-xs font-medium ml-4 shrink-0" style={{ color: "#0A8A4C" }}>{open ? "Close ↑" : "Open ↓"}</span>
      </button>

      {open && (
        <div className="px-5 py-5 space-y-4" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
          {sent && (
            <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ backgroundColor: "#0a8a4c22", color: "#0A8A4C" }}>
              Email sent ✓
            </div>
          )}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "#cc1a1a22", color: "#CC1A1A" }}>
              {error}
            </div>
          )}

          {/* Market + Touch selectors */}
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "#8ba0b8" }}>Market</div>
              <div className="flex gap-2">
                {MARKETS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMarketId(m.id); setForm(f => ({ ...f, area: "" })); }}
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
            </div>
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "#8ba0b8" }}>Touch</div>
              <div className="flex gap-2">
                {([1, 2, 3] as Touch[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTouch(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: touch === t ? "#1a2d45" : "transparent",
                      color: touch === t ? "#e8eef5" : "#5a7a96",
                      border: `1px solid ${touch === t ? "#2a4060" : "#1a2d45"}`,
                    }}
                  >
                    {t === 1 ? "Touch 1 — intro" : t === 2 ? "Touch 2 — rent + income" : "Touch 3 — case study"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 1: name + email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>First name *</label>
              <input
                type="text"
                placeholder="Jules"
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
                placeholder="jules@canmoor.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
          </div>

          {/* Row 2: company + area + assets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Company</label>
              <input
                type="text"
                placeholder={marketId === "fl" ? "Smith Industrial LLC" : "Canmoor Asset Mgmt"}
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Area / county *</label>
              <select
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: form.area ? "#e8eef5" : "#5a7a96" }}
              >
                <option value="">Select area…</option>
                {areaOptions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="__custom">Other (type below)</option>
              </select>
              {form.area === "__custom" && (
                <input
                  type="text"
                  placeholder="Enter area / city"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none mt-2"
                  style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#8ba0b8" }}>Asset count *</label>
              <input
                type="number"
                min="1"
                max="200"
                value={form.assetCount}
                onChange={e => setForm(f => ({ ...f, assetCount: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
          </div>

          {/* Subject preview */}
          <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <span className="text-xs mt-0.5 shrink-0" style={{ color: "#5a7a96" }}>Subject</span>
            <span className="text-xs font-medium" style={{ color: "#e8eef5" }}>
              {preview}
            </span>
          </div>

          {/* Touch description */}
          <div className="text-xs" style={{ color: "#5a7a96" }}>
            {touch === 1
              ? market.id === "fl"
                ? "Touch 1: short cold intro — insurance retender hook, 20-min CTA. From ian@realhq.com."
                : "Touch 1: short cold intro — energy/MEES hook, 20-min CTA. From ian@realhq.com."
              : touch === 2
              ? market.id === "fl"
                ? "Touch 2: rent roll + income angle — ERV drift and EV/5G/solar gaps. Different hook from T1. From ian@realhq.com."
                : "Touch 2: rent ERV drift + income angle — below-market leases and 5G/EV/solar gaps. Different hook from T1. From ian@realhq.com."
              : market.id === "fl"
              ? "Touch 3: case study email — FL mixed-use 8-asset example with numbers, personalised book link."
              : "Touch 3: case study email — SE Kent/Essex 5-unit example with numbers, personalised book link."}
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !form.email || !form.firstName || !form.area || form.area === "__custom" || !form.assetCount}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            {sending ? "Sending…" : `Send Touch ${touch} →`}
          </button>
        </div>
      )}
    </div>
  );
}
