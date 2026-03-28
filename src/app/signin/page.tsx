"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  async function handleOAuth(provider: "google" | "azure-ad") {
    await signIn(provider, { callbackUrl });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else if (result?.url) {
      router.push(result.url);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg, #09090b)" }}>
      {/* Nav */}
      <nav
        className="h-[52px] flex items-center justify-center px-8 flex-shrink-0"
        style={{
          backgroundColor: "var(--bg, #09090b)",
          borderBottom: "1px solid var(--bdr, #252533)",
        }}
      >
        <Link href="/" className="flex items-center">
          <span
            className="text-[19px]"
            style={{
              fontFamily: "var(--serif, 'Instrument Serif', Georgia, serif)",
              color: "var(--tx, #e4e4ec)",
            }}
          >
            <span style={{ color: "var(--acc, #7c6af0)", fontStyle: "italic" }}>R</span>ealHQ
          </span>
        </Link>
      </nav>

      {/* Page */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[400px]">
          <h1
            className="text-[32px] font-normal text-center mb-1.5"
            style={{
              fontFamily: "var(--serif, 'Instrument Serif', Georgia, serif)",
              color: "var(--tx, #e4e4ec)",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </h1>
          <p
            className="text-center text-sm font-light mb-8"
            style={{ color: "var(--tx3, #555568)" }}
          >
            Sign in to your portfolio.
          </p>

          {/* OAuth Buttons */}
          <button
            onClick={() => handleOAuth("google")}
            className="w-full h-[46px] flex items-center justify-center gap-2.5 mb-2 rounded-[10px] text-[13px] font-medium transition-all duration-150 hover:bg-[var(--s2)] hover:border-[var(--tx3)]"
            style={{
              background: "var(--s1, #111116)",
              border: "1px solid var(--bdr, #252533)",
              color: "var(--tx, #e4e4ec)",
            }}
          >
            <div
              className="w-[18px] h-[18px] rounded flex items-center justify-center text-[11px]"
              style={{ background: "var(--s3, #1f1f28)" }}
            >
              G
            </div>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth("azure-ad")}
            className="w-full h-[46px] flex items-center justify-center gap-2.5 mb-6 rounded-[10px] text-[13px] font-medium transition-all duration-150 hover:bg-[var(--s2)] hover:border-[var(--tx3)]"
            style={{
              background: "var(--s1, #111116)",
              border: "1px solid var(--bdr, #252533)",
              color: "var(--tx, #e4e4ec)",
            }}
          >
            <div
              className="w-[18px] h-[18px] rounded flex items-center justify-center text-[11px]"
              style={{ background: "var(--s3, #1f1f28)" }}
            >
              M
            </div>
            Continue with Microsoft
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3.5 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--bdr, #252533)" }} />
            <span
              className="text-[11px]"
              style={{ color: "var(--tx3, #555568)" }}
            >
              or sign in with email
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--bdr, #252533)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3.5">
              <label
                className="block text-[11px] font-medium mb-1.5"
                style={{ color: "var(--tx2, #8888a0)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ian@example.com"
                required
                className="w-full px-4 py-3 rounded-[9px] text-sm outline-none transition-all duration-200"
                style={{
                  background: "var(--s1, #111116)",
                  border: "1.5px solid var(--bdr, #252533)",
                  color: "var(--tx, #e4e4ec)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--acc-bdr, rgba(124,106,240,.22))";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--acc-dim, rgba(124,106,240,.06))";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--bdr, #252533)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div className="mb-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-[11px] font-medium"
                  style={{ color: "var(--tx2, #8888a0)" }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] transition-opacity duration-150 hover:opacity-80"
                  style={{ color: "var(--acc, #7c6af0)" }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="w-full px-4 py-3 rounded-[9px] text-sm outline-none transition-all duration-200"
                style={{
                  background: "var(--s1, #111116)",
                  border: "1.5px solid var(--bdr, #252533)",
                  color: "var(--tx, #e4e4ec)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--acc-bdr, rgba(124,106,240,.22))";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--acc-dim, rgba(124,106,240,.06))";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--bdr, #252533)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {error && (
                <div
                  className="mt-1.5 text-[11px] px-2.5 py-1.5 rounded-md"
                  style={{
                    color: "var(--red, #f87171)",
                    background: "var(--red-lt, rgba(248,113,113,.07))",
                    border: "1px solid var(--red-bdr, rgba(248,113,113,.22))",
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[46px] rounded-[10px] text-sm font-semibold transition-all duration-150 disabled:opacity-50 mt-5"
              style={{
                background: "var(--acc, #7c6af0)",
                color: "#fff",
                border: "none",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#6d5ce0";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,106,240,.25)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--acc, #7c6af0)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          <p
            className="text-center text-xs mt-5"
            style={{ color: "var(--tx3, #555568)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium transition-opacity duration-150 hover:opacity-80"
              style={{ color: "var(--acc, #7c6af0)" }}
            >
              Start free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
