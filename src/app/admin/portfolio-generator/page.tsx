"use client";

import { useState } from "react";
import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

const ASSET_TYPES = ["industrial", "office", "retail", "warehouse", "flex", "mixed"] as const;

interface AssetBrief {
  name: string;
  location: string;
  type: string;
  sqft: string;
  valuation: string;
  annualIncome: string;
  insurancePremium: string;
  energySpend: string;
  leaseInfo: string;
}

function emptyAsset(): AssetBrief {
  return {
    name: "",
    location: "",
    type: "industrial",
    sqft: "",
    valuation: "",
    annualIncome: "",
    insurancePremium: "",
    energySpend: "",
    leaseInfo: "",
  };
}

function inputStyle(hasError?: boolean) {
  return {
    backgroundColor: "#0B1622",
    border: `1px solid ${hasError ? "#f06040" : "#1a2d45"}`,
    color: "#e8eef5",
  } as React.CSSProperties;
}

export default function PortfolioGeneratorPage() {
  const [clientName, setClientName] = useState("");
  const [shortName, setShortName] = useState("");
  const [currency, setCurrency] = useState<"USD" | "GBP">("USD");
  const [brief, setBrief] = useState("");
  const [assets, setAssets] = useState<AssetBrief[]>([emptyAsset()]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  function updateAsset(i: number, field: keyof AssetBrief, value: string) {
    setAssets((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function addAsset() {
    if (assets.length < 10) setAssets((prev) => [...prev, emptyAsset()]);
  }

  function removeAsset(i: number) {
    if (assets.length > 1) setAssets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleGenerate() {
    setError("");
    setResult("");

    if (!clientName.trim()) {
      setError("Client company name is required.");
      return;
    }

    const validAssets = assets.filter((a) => a.name.trim() && a.location.trim() && a.sqft && a.valuation && a.annualIncome);
    if (validAssets.length === 0) {
      setError("At least one complete asset is required (name, location, sqft, valuation, annual income).");
      return;
    }

    setGenerating(true);

    const payload = {
      clientName: clientName.trim(),
      shortName: shortName.trim(),
      currency,
      brief: brief.trim(),
      assets: validAssets.map((a) => ({
        name: a.name.trim(),
        location: a.location.trim(),
        type: a.type,
        sqft: Number(a.sqft),
        valuation: Number(a.valuation),
        annualIncome: Number(a.annualIncome),
        ...(a.insurancePremium ? { insurancePremium: Number(a.insurancePremium) } : {}),
        ...(a.energySpend ? { energySpend: Number(a.energySpend) } : {}),
        ...(a.leaseInfo.trim() ? { leaseInfo: a.leaseInfo.trim() } : {}),
      })),
    };

    try {
      const res = await fetch("/api/admin/portfolio-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
      } else {
        setResult(JSON.stringify(data.portfolio, null, 2));
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setGenerating(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: "#5a7a96" }}>
            <Link href="/admin" className="hover:opacity-70">← Admin</Link>
            <span>/</span>
            <Link href="/admin/portfolios" className="hover:opacity-70">Client Portfolios</Link>
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
            Portfolio Generator
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
            Describe a client&apos;s assets in plain English — Claude builds the Portfolio JSON automatically.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl p-6 space-y-6" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Client details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Client company name *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Starlight Industrial Holdings"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle()}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Short name</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Starlight"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle()}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "GBP")}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle()}
              >
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>
              Brief — optional context (market, strategy, known issues)
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={2}
              placeholder="SE England logistics portfolio. Primary tenant is DHL. Owner is looking to sell 2 assets in 2026."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={inputStyle()}
            />
          </div>
        </div>

        {/* Assets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              Assets <span style={{ color: "#5a7a96" }}>({assets.length})</span>
            </h2>
            {assets.length < 10 && (
              <button
                type="button"
                onClick={addAsset}
                className="text-xs px-3 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ backgroundColor: "#1a2d45", color: "#e8eef5" }}
              >
                + Add asset
              </button>
            )}
          </div>

          {assets.map((asset, i) => (
            <div
              key={i}
              className="rounded-xl p-5 space-y-4"
              style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "#5a7a96" }}>
                  Asset {i + 1}
                </span>
                {assets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAsset(i)}
                    className="text-xs hover:opacity-70 transition-opacity"
                    style={{ color: "#f06040" }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Asset name *</label>
                  <input
                    type="text"
                    value={asset.name}
                    onChange={(e) => updateAsset(i, "name", e.target.value)}
                    placeholder="Tampa Industrial Park"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Location *</label>
                  <input
                    type="text"
                    value={asset.location}
                    onChange={(e) => updateAsset(i, "location", e.target.value)}
                    placeholder="Tampa, FL"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Asset type *</label>
                  <select
                    value={asset.type}
                    onChange={(e) => updateAsset(i, "type", e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Size (sqft) *</label>
                  <input
                    type="number"
                    value={asset.sqft}
                    onChange={(e) => updateAsset(i, "sqft", e.target.value)}
                    placeholder="50000"
                    min={0}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>
                    Rough valuation ({currency === "GBP" ? "£" : "$"}) *
                  </label>
                  <input
                    type="number"
                    value={asset.valuation}
                    onChange={(e) => updateAsset(i, "valuation", e.target.value)}
                    placeholder="8000000"
                    min={0}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>
                    Rough annual income ({currency === "GBP" ? "£" : "$"}) *
                  </label>
                  <input
                    type="number"
                    value={asset.annualIncome}
                    onChange={(e) => updateAsset(i, "annualIncome", e.target.value)}
                    placeholder="600000"
                    min={0}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  />
                </div>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>
                    Insurance premium ({currency === "GBP" ? "£" : "$"}/yr) — optional
                  </label>
                  <input
                    type="number"
                    value={asset.insurancePremium}
                    onChange={(e) => updateAsset(i, "insurancePremium", e.target.value)}
                    placeholder="42000"
                    min={0}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>
                    Energy spend ({currency === "GBP" ? "£" : "$"}/yr) — optional
                  </label>
                  <input
                    type="number"
                    value={asset.energySpend}
                    onChange={(e) => updateAsset(i, "energySpend", e.target.value)}
                    placeholder="84000"
                    min={0}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>
                  Known lease info — optional
                </label>
                <input
                  type="text"
                  value={asset.leaseInfo}
                  onChange={(e) => updateAsset(i, "leaseInfo", e.target.value)}
                  placeholder="Amazon occupies 80% on a lease expiring 2029. 20% vacant."
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle()}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "#f0604022", border: "1px solid #f0604044", color: "#f06040" }}
          >
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#1647E8", color: "#fff" }}
        >
          {generating ? "Generating…" : "Generate Portfolio JSON"}
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Generated Portfolio JSON</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs px-3 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ backgroundColor: "#1a2d45", color: copied ? "#0A8A4C" : "#e8eef5" }}
                >
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
                <Link
                  href="/admin/portfolios"
                  className="text-xs px-3 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ backgroundColor: "#1647E822", color: "#1647E8" }}
                >
                  Save to portfolio builder →
                </Link>
              </div>
            </div>
            <p className="text-xs" style={{ color: "#5a7a96" }}>
              Copy this JSON, then paste it into the Portfolio Builder to create a shareable dashboard link.
            </p>
            <textarea
              readOnly
              value={result}
              rows={24}
              className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none resize-y"
              style={{
                backgroundColor: "#0B1622",
                border: "1px solid #1a2d45",
                color: "#e8eef5",
                lineHeight: "1.6",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
