"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function SignupForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOAuthSignIn(provider: "google" | "microsoft-entra-id") {
    setLoading(true);
    await signIn(provider, { callbackUrl: "/properties/add" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Sign in after successful signup
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign in failed. Please try signing in.");
        setLoading(false);
      } else if (result?.ok) {
        router.push("/properties/add");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
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
            Start free
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
            Add your first property in seconds. No credit card required.
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
            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>or sign up with email</div>
            <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="a4">
            {/* First + Last name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              <div>
                <label style={{ font: "500 11px var(--sans)", color: "var(--tx2)", marginBottom: "6px", display: "block" }}>
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ian"
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
              </div>
              <div>
                <label style={{ font: "500 11px var(--sans)", color: "var(--tx2)", marginBottom: "6px", display: "block" }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Richardson"
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
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ font: "500 11px var(--sans)", color: "var(--tx2)", marginBottom: "6px", display: "block" }}>
                Work email
              </label>
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
              <label style={{ font: "500 11px var(--sans)", color: "var(--tx2)", marginBottom: "6px", display: "block" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
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
              Create account →
            </button>
          </form>

          <div className="a5" style={{ textAlign: "center", marginTop: "14px", font: "400 11px var(--sans)", color: "var(--tx3)" }}>
            By signing up you agree to our{" "}
            <a href="#" style={{ color: "var(--tx3)", textDecoration: "underline", transition: "color .15s" }}
               onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tx2)")}
               onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tx3)")}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" style={{ color: "var(--tx3)", textDecoration: "underline", transition: "color .15s" }}
               onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tx2)")}
               onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tx3)")}>
              Privacy Policy
            </a>
          </div>

          <div className="a5" style={{ textAlign: "center", marginTop: "20px", font: "400 12px var(--sans)", color: "var(--tx3)" }}>
            Already have an account?{" "}
            <Link
              href="/signin"
              style={{
                color: "var(--acc)",
                fontWeight: 500,
                transition: "opacity .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Sign in →
            </Link>
          </div>

          {/* Proof strip */}
          <div className="a5" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--bdr-lt)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: "16px", color: "var(--tx)", letterSpacing: "-0.01em" }}>15–25%</div>
              <div style={{ font: "400 9px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>avg insurance overpay</div>
            </div>
            <div style={{ width: "1px", height: "20px", background: "var(--bdr)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: "16px", color: "var(--tx)", letterSpacing: "-0.01em" }}>$921k</div>
              <div style={{ font: "400 9px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>avg uncaptured value</div>
            </div>
            <div style={{ width: "1px", height: "20px", background: "var(--bdr)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: "16px", color: "var(--tx)", letterSpacing: "-0.01em" }}>seconds</div>
              <div style={{ font: "400 9px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>to first insights</div>
            </div>
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#09090b", minHeight: "100vh" }} />}>
      <SignupForm />
    </Suspense>
  );
}
