"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      localStorage.setItem("realhq_signed_up", "1");
      router.push("/properties/add");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#F9FAFB" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
        <span
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: "#111827", letterSpacing: "0.12em" }}
        >
          RealHQ
        </span>
      </div>

      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
      >
        <h1
          className="text-2xl font-semibold mb-1"
          style={{
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
            color: "#111827",
          }}
        >
          See your portfolio
        </h1>
        <p className="text-sm mb-7" style={{ color: "#9CA3AF" }}>
          Your first insight is waiting.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150"
              style={{
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#111827",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#DC2626" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] mt-1"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            {loading ? "Setting up your dashboard…" : "See your portfolio →"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs" style={{ color: "#D1D5DB" }}>
        Already have an account?{" "}
        <Link href="/signin" style={{ color: "#9CA3AF" }}>
          Sign in →
        </Link>
      </p>

      <Link href="/" className="mt-3 text-xs transition-colors duration-150" style={{ color: "#D1D5DB" }}>
        ← Back to RealHQ
      </Link>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
