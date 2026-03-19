"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PORTFOLIO_VALUE_OPTIONS = [
  "Under $1M",
  "$1M – $5M",
  "$5M – $20M",
  "$20M – $50M",
  "$50M – $100M",
  "Over $100M",
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    assetCount: "",
    portfolioValue: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          company: form.company,
          assetCount: form.assetCount ? parseInt(form.assetCount, 10) : undefined,
          portfolioValue: form.portfolioValue || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Success: redirect to demo dashboard with welcome flag
      router.push("/dashboard?welcome=1");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150";
  const inputStyle = {
    backgroundColor: "#0B1622",
    border: "1px solid #1a2d45",
    color: "#e8eef5",
  };

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
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
      >
        {/* Commission-only badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C", color: "#0A8A4C" }}
        >
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
          Commission-only · No credit card · No upfront fees
        </div>

        <h1
          className="text-2xl font-semibold mb-1"
          style={{
            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
            color: "#e8eef5",
          }}
        >
          See your portfolio analysis
        </h1>
        <p className="text-sm mb-7" style={{ color: "#5a7a96" }}>
          Takes 2 minutes. We&apos;ll show you exactly what Arca can recover from your portfolio.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
              Full name
            </label>
            <input
              type="text"
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
              onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
              Work email
            </label>
            <input
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
              onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
              Phone <span style={{ color: "#3d5a72" }}>(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
              onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
            />
          </div>

          {/* Company */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
              Company name
            </label>
            <input
              type="text"
              placeholder="Acme Property Holdings"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
              onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
            />
          </div>

          {/* Asset count + portfolio value in a row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                No. of assets
              </label>
              <input
                type="number"
                min="1"
                placeholder="12"
                value={form.assetCount}
                onChange={(e) => set("assetCount", e.target.value)}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                Portfolio value
              </label>
              <select
                value={form.portfolioValue}
                onChange={(e) => set("portfolioValue", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
              >
                <option value="" style={{ backgroundColor: "#0B1622" }}>Select…</option>
                {PORTFOLIO_VALUE_OPTIONS.map((v) => (
                  <option key={v} value={v} style={{ backgroundColor: "#0B1622" }}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#f06040" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !form.name.trim() || !form.email.trim() || !form.company.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] mt-1"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            {loading ? "Setting up your dashboard…" : "See my portfolio analysis →"}
          </button>

          <p className="text-center text-xs" style={{ color: "#3d5a72" }}>
            No credit card. No setup fee. Commission only if Arca delivers.
          </p>
        </form>
      </div>

      {/* Already have an account */}
      <p className="mt-6 text-xs" style={{ color: "#3d5a72" }}>
        Already have an account?{" "}
        <Link href="/signin" style={{ color: "#5a7a96" }}>
          Sign in →
        </Link>
      </p>

      <Link href="/" className="mt-3 text-xs transition-colors duration-150" style={{ color: "#3d5a72" }}>
        ← Back to Arca
      </Link>
    </div>
  );
}
