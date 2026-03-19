"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

const RESEND_COOLDOWN = 60; // seconds

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const isVerify = searchParams.get("verify") === "1";
  const hasError = searchParams.get("error") === "1";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(isVerify);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState(
    hasError ? "Something went wrong. Please try again." : ""
  );
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

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
      startCooldown();
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !email.trim()) return;
    setResending(true);
    setError("");

    const result = await signIn("resend", {
      email: email.trim().toLowerCase(),
      callbackUrl,
      redirect: false,
    });

    setResending(false);

    if (result?.error) {
      setError("Could not resend. Please try again.");
    } else {
      startCooldown();
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
              fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
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
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="text-xs font-medium px-4 py-2 rounded-lg transition-all duration-150 disabled:opacity-50"
              style={{
                backgroundColor: resendCooldown > 0 ? "#1a2d45" : "#0A8A4C22",
                color: resendCooldown > 0 ? "#5a7a96" : "#0A8A4C",
                border: "1px solid",
                borderColor: resendCooldown > 0 ? "#1a2d45" : "#0A8A4C44",
              }}
            >
              {resending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend link"}
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail("");
                setResendCooldown(0);
                if (cooldownRef.current) clearInterval(cooldownRef.current);
              }}
              className="text-xs transition-colors duration-150"
              style={{ color: "#3d5a72" }}
            >
              Wrong email? Try again
            </button>
          </div>
          {error && <p className="text-xs mt-3" style={{ color: "#f06040" }}>{error}</p>}
        </div>
      ) : (
        <>
          <h1
            className="text-xl font-semibold mb-1"
            style={{
              fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
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
