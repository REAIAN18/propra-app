"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  async function handleOAuthSignIn(provider: "google" | "microsoft-entra-id") {
    setLoading(true);
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
    } else if (result?.ok) {
      router.push(callbackUrl);
    }
  }

  return (
    <div style={{ backgroundColor: "#09090b", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav
        style={{
          height: "52px",
          backgroundColor: "#09090b",
          borderBottom: "1px solid var(--bdr)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          flexShrink: 0,
        }}
      >
        <Link href="/">
          <div style={{ fontFamily: "var(--serif)", fontSize: "19px", color: "var(--tx)" }}>
            <span style={{ color: "var(--acc)", fontStyle: "italic" }}>R</span>ealHQ
          </div>
        </Link>
      </nav>

      {/* Page */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          backgroundColor: "#09090b",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <h1
            className="a1"
            style={{
              fontFamily: "var(--serif)",
              fontSize: "32px",
              fontWeight: 400,
              color: "var(--tx)",
              textAlign: "center",
              marginBottom: "6px",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </h1>
          <p
            className="a2"
            style={{
              font: "300 14px/1.5 var(--sans)",
              color: "var(--tx3)",
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            Sign in to your portfolio.
          </p>

          {/* OAuth */}
          <button
            className="a3"
            onClick={() => handleOAuthSignIn("google")}
            disabled={loading}
            style={{
              width: "100%",
              height: "46px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              font: "500 13px var(--sans)",
              color: "var(--tx)",
              cursor: loading ? "default" : "pointer",
              transition: "all .15s",
              marginBottom: "8px",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = "var(--tx3)";
                e.currentTarget.style.background = "var(--s2)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.background = "var(--s1)";
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                background: "var(--s3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
              }}
            >
              G
            </div>
            Continue with Google
          </button>

          <button
            className="a3"
            onClick={() => handleOAuthSignIn("microsoft-entra-id")}
            disabled={loading}
            style={{
              width: "100%",
              height: "46px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              font: "500 13px var(--sans)",
              color: "var(--tx)",
              cursor: loading ? "default" : "pointer",
              transition: "all .15s",
              marginBottom: "8px",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = "var(--tx3)";
                e.currentTarget.style.background = "var(--s2)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.background = "var(--s1)";
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                background: "var(--s3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
              }}
            >
              M
            </div>
            Continue with Microsoft
          </button>

          {/* Divider */}
          <div className="a4" style={{ display: "flex", alignItems: "center", gap: "14px", margin: "24px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>or sign in with email</div>
            <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="a4">
            <div style={{ marginBottom: "14px" }}>
              <label style={{ font: "500 11px var(--sans)", color: "var(--tx2)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ian@example.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1.5px solid var(--bdr)",
                  borderRadius: "9px",
                  font: "400 14px var(--sans)",
                  color: "var(--tx)",
                  outline: "none",
                  transition: "border-color .2s, box-shadow .2s",
                  marginTop: "6px",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--acc-bdr)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--acc-dim)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--bdr)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ font: "500 11px var(--sans)", color: "var(--tx2)" }}>Password</label>
                <Link
                  href="/forgot-password"
                  style={{
                    font: "400 11px var(--sans)",
                    color: "var(--acc)",
                    cursor: "pointer",
                    transition: "opacity .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
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
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1.5px solid var(--bdr)",
                  borderRadius: "9px",
                  font: "400 14px var(--sans)",
                  color: "var(--tx)",
                  outline: "none",
                  transition: "border-color .2s, box-shadow .2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--acc-bdr)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--acc-dim)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--bdr)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {error && (
                <div
                  style={{
                    display: "block",
                    font: "400 11px var(--sans)",
                    color: "var(--red)",
                    marginTop: "6px",
                    padding: "6px 10px",
                    background: "var(--red-lt)",
                    border: "1px solid var(--red-bdr)",
                    borderRadius: "6px",
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="a5"
              style={{
                width: "100%",
                height: "46px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                font: "600 14px/1 var(--sans)",
                cursor: loading ? "default" : "pointer",
                transition: "all .15s",
                marginTop: "20px",
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#6d5ce0";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,106,240,.25)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--acc)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Sign in →
            </button>
          </form>

          <div className="a5" style={{ textAlign: "center", marginTop: "20px", font: "400 12px var(--sans)", color: "var(--tx3)" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "var(--acc)",
                fontWeight: 500,
                transition: "opacity .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Start free →
            </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes enter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .a1 {
          animation: enter 0.5s ease both;
        }
        .a2 {
          animation: enter 0.5s ease both 0.08s;
        }
        .a3 {
          animation: enter 0.5s ease both 0.16s;
        }
        .a4 {
          animation: enter 0.5s ease both 0.24s;
        }
        .a5 {
          animation: enter 0.5s ease both 0.32s;
        }
      `}</style>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#09090b", minHeight: "100vh" }} />}>
      <SignInForm />
    </Suspense>
  );
}
