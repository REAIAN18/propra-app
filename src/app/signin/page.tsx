"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOAuthSignin(provider: "google" | "azure-ad") {
    await signIn(provider, { callbackUrl });
  }

  async function handleEmailSignin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
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

      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Nav */}
        <nav
          style={{
            height: "52px",
            borderBottom: "1px solid var(--bdr)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 32px",
          }}
        >
          <Link href="/">
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "19px",
                color: "var(--tx)",
              }}
            >
              <span style={{ color: "var(--acc)", fontStyle: "italic" }}>R</span>
              ealHQ
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

            {/* OAuth buttons */}
            <button
              className="a3"
              onClick={() => handleOAuthSignin("google")}
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
                cursor: "pointer",
                transition: "all 0.15s",
                marginBottom: "8px",
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
              onClick={() => handleOAuthSignin("azure-ad")}
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
                cursor: "pointer",
                transition: "all 0.15s",
                marginBottom: "8px",
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
            <div
              className="a4"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                margin: "24px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
              <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>
                or sign in with email
              </div>
              <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSignin} className="a4">
              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    font: "500 11px var(--sans)",
                    color: "var(--tx2)",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="ian@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--acc-bdr)";
                    e.target.style.boxShadow = "0 0 0 3px var(--acc-dim)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--bdr)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <label style={{ font: "500 11px var(--sans)", color: "var(--tx2)" }}>
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{
                      font: "400 11px var(--sans)",
                      color: "var(--acc)",
                      transition: "opacity 0.15s",
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--acc-bdr)";
                    e.target.style.boxShadow = "0 0 0 3px var(--acc-dim)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--bdr)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {error && (
                  <div
                    style={{
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
                style={{
                  width: "100%",
                  height: "46px",
                  background: loading ? "var(--tx3)" : "var(--acc)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  font: "600 14px/1 var(--sans)",
                  cursor: loading ? "default" : "pointer",
                  transition: "all 0.15s",
                  marginTop: "20px",
                }}
              >
                {loading ? "Signing in..." : "Sign in →"}
              </button>
            </form>

            <div
              className="a5"
              style={{
                textAlign: "center",
                marginTop: "20px",
                font: "400 12px var(--sans)",
                color: "var(--tx3)",
              }}
            >
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: "var(--acc)", fontWeight: 500 }}>
                Start free →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
