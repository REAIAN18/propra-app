"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ASSET_TYPES = [
  "Office",
  "Retail",
  "Industrial",
  "Warehouse",
  "Flex / Mixed",
  "Other",
];

interface AssetRow {
  name: string;
  type: string;
  location: string;
  grossIncome: string;
}

function emptyAsset(): AssetRow {
  return { name: "", type: "Office", location: "", grossIncome: "" };
}

const inputBase =
  "w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150";
const inputStyle = {
  backgroundColor: "#0B1622",
  border: "1px solid #1a2d45",
  color: "#e8eef5",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetRow[]>([emptyAsset()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateAsset(i: number, field: keyof AssetRow, value: string) {
    setAssets((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function addRow() {
    setAssets((prev) => [...prev, emptyAsset()]);
  }

  function removeRow(i: number) {
    if (assets.length === 1) return;
    setAssets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = assets.filter((a) => a.name.trim() && a.location.trim());
    if (valid.length === 0) {
      setError("Add at least one asset with a name and location.");
      return;
    }
    setLoading(true);
    setError("");

    // For now store in sessionStorage and redirect to dashboard
    // Full AI analysis will be wired in once backend pipeline is ready
    try {
      sessionStorage.setItem("arca_user_assets", JSON.stringify(valid));
    } catch {
      // ignore if sessionStorage unavailable
    }

    router.push("/dashboard?portfolio=user");
  }

  const hasValidAsset = assets.some((a) => a.name.trim() && a.location.trim());

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0B1622" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
        <span
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
        >
          Arca
        </span>
      </div>

      <div
        className="w-full max-w-2xl rounded-2xl p-8"
        style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#3d5a72" }}
          >
            <span
              className="h-5 w-5 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}
            >
              ✓
            </span>
            Account
          </div>
          <div className="h-px flex-1" style={{ backgroundColor: "#1a2d45" }} />
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#0A8A4C" }}
          >
            <span
              className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              2
            </span>
            Your portfolio
          </div>
          <div className="h-px flex-1" style={{ backgroundColor: "#1a2d45" }} />
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#3d5a72" }}
          >
            <span
              className="h-5 w-5 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "#0d1c2b", color: "#3d5a72", border: "1px solid #1a2d45" }}
            >
              3
            </span>
            Insights
          </div>
        </div>

        <h1
          className="text-2xl font-semibold mb-1"
          style={{
            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
            color: "#e8eef5",
          }}
        >
          Tell us about your assets
        </h1>
        <p className="text-sm mb-7" style={{ color: "#5a7a96" }}>
          Add your properties below. Arca will analyse each one and find hidden value — takes 2 minutes.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Asset rows */}
          <div className="flex flex-col gap-3">
            {assets.map((asset, i) => (
              <div
                key={i}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: "#0d1c2b", border: "1px solid #1a2d45" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "#5a7a96" }}>
                    Asset {i + 1}
                  </span>
                  {assets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-xs transition-opacity hover:opacity-70"
                      style={{ color: "#3d5a72" }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      Property name <span style={{ color: "#f06040" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lakeside Office Park"
                      value={asset.name}
                      onChange={(e) => updateAsset(i, "name", e.target.value)}
                      className={inputBase}
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                    />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      Asset type
                    </label>
                    <select
                      value={asset.type}
                      onChange={(e) => updateAsset(i, "type", e.target.value)}
                      className={inputBase}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                    >
                      {ASSET_TYPES.map((t) => (
                        <option key={t} value={t} style={{ backgroundColor: "#0B1622" }}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      City / State <span style={{ color: "#f06040" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Miami, FL"
                      value={asset.location}
                      onChange={(e) => updateAsset(i, "location", e.target.value)}
                      className={inputBase}
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                    />
                  </div>

                  {/* Gross income */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      Gross income / yr{" "}
                      <span style={{ color: "#3d5a72" }}>(optional)</span>
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: "#5a7a96" }}
                      >
                        $
                      </span>
                      <input
                        type="text"
                        placeholder="240,000"
                        value={asset.grossIncome}
                        onChange={(e) => updateAsset(i, "grossIncome", e.target.value)}
                        className={inputBase}
                        style={{ ...inputStyle, paddingLeft: "1.75rem" }}
                        onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add row */}
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70 w-fit"
            style={{ color: "#5a7a96" }}
          >
            <span
              className="h-6 w-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ backgroundColor: "#0d1c2b", border: "1px solid #1a2d45", color: "#5a7a96" }}
            >
              +
            </span>
            Add another asset
          </button>

          {error && (
            <p className="text-xs" style={{ color: "#f06040" }}>
              {error}
            </p>
          )}

          {/* Info note */}
          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ backgroundColor: "#0d1c2b", color: "#5a7a96", border: "1px solid #1a2d45" }}
          >
            Arca will run insurance, energy, and income benchmarks against each asset using market data. You&apos;ll see the numbers in under 60 seconds.
          </div>

          <button
            type="submit"
            disabled={loading || !hasValidAsset}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] mt-1"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            {loading ? "Analysing your portfolio…" : "See my portfolio analysis →"}
          </button>

          <p className="text-center text-xs" style={{ color: "#3d5a72" }}>
            Commission-only. No setup fees. No contracts.
          </p>
        </form>
      </div>

      <Link href="/dashboard" className="mt-6 text-xs transition-colors duration-150" style={{ color: "#3d5a72" }}>
        ← View demo portfolio instead
      </Link>
    </div>
  );
}
