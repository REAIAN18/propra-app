"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const isVerify = searchParams.get("verify") === "1";
  const hasError = searchParams.get("error") === "1";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(isVerify);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    hasError ? "Something went wrong. Please try again." : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const result = await signIn("resend", {
      email: email.trim().toLowerCase(),
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Could not send the magic link. Please try again.");
    } else {
      setSubmitted(true);
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-8"
      style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
    >
      {submitted ? (
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 10l5 5 9-9"
                stroke="#0A8A4C"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            className="text-xl font-semibold mb-2"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              color: "#e8eef5",
            }}
          >
            Check your email
          </h1>
          <p className="text-sm mb-6" style={{ color: "#5a7a96" }}>
            We sent a sign-in link to{" "}
            <span style={{ color: "#8ba0b8" }}>{email || "your email"}</span>.
            Click it to access your Arca portfolio.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
            className="text-xs transition-colors duration-150"
            style={{ color: "#3d5a72" }}
          >
            Wrong email? Try again
          </button>
        </div>
      ) : (
        <>
          <h1
            className="text-xl font-semibold mb-1"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              color: "#e8eef5",
            }}
          >
            Sign in to Arca
          </h1>
          <p className="text-sm mb-6" style={{ color: "#5a7a96" }}>
            No password. We&apos;ll email you a magic link.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150"
              style={{
                backgroundColor: "#0B1622",
                border: "1px solid #1a2d45",
                color: "#e8eef5",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#0A8A4C";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#1a2d45";
              }}
            />

            {error && (
              <p className="text-xs" style={{ color: "#f06040" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              {loading ? "Sending…" : "Send magic link →"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: "#3d5a72" }}>
            Don&apos;t have an account?{" "}
            <span style={{ color: "#5a7a96" }}>
              Just enter your email — we&apos;ll create it automatically.
            </span>
          </p>
        </>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0B1622" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "#0A8A4C" }}
        />
        <span
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
        >
          Arca
        </span>
      </div>

      <Suspense
        fallback={
          <div
            className="w-full max-w-sm rounded-2xl p-8"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          />
        }
      >
        <SignInForm />
      </Suspense>

      <Link
        href="/"
        className="mt-8 text-xs transition-colors duration-150"
        style={{ color: "#3d5a72" }}
      >
        ← Back to Arca
      </Link>
    </div>
  );
}
