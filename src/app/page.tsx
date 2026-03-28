"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: "56px",
          background: scrolled ? "rgba(9,9,11,.95)" : "rgba(9,9,11,.72)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderBottom: scrolled ? "1px solid var(--bdr)" : "1px solid rgba(255,255,255,.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          transition: "background .3s, border-bottom-color .3s",
        }}
      >
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: "19px",
            fontWeight: 400,
            color: "var(--tx)",
            letterSpacing: ".01em",
          }}
        >
          Real<span style={{ color: "var(--acc)", fontStyle: "italic" }}>HQ</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <Link
            href="#how"
            style={{
              font: "400 13px var(--sans)",
              color: "var(--tx3)",
              letterSpacing: ".01em",
            }}
          >
            How it works
          </Link>
          <Link
            href="#pricing"
            style={{
              font: "400 13px var(--sans)",
              color: "var(--tx3)",
              letterSpacing: ".01em",
            }}
          >
            Pricing
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.push("/signin")}
            style={{
              height: "34px",
              padding: "0 16px",
              background: "transparent",
              color: "var(--tx2)",
              border: "1px solid var(--bdr)",
              borderRadius: "8px",
              font: "500 12px/1 var(--sans)",
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
          <button
            onClick={() => router.push("/properties/add")}
            style={{
              height: "34px",
              padding: "0 18px",
              background: "var(--acc)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              font: "600 12px/1 var(--sans)",
              cursor: "pointer",
            }}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "120px 40px 80px",
          position: "relative",
          backgroundColor: "#09090b",
        }}
      >
        {/* Radial gradient background */}
        <div
          style={{
            content: '""',
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "800px",
            background: "radial-gradient(circle, rgba(124,106,240,.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            className="animate-stagger-1"
            style={{
              font: "500 10px/1 var(--mono)",
              color: "var(--acc)",
              textTransform: "uppercase",
              letterSpacing: "3px",
              marginBottom: "24px",
            }}
          >
            PROPERTY INTELLIGENCE
          </div>

          <h1
            className="animate-stagger-2"
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(46px,7vw,86px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-.04em",
              color: "var(--tx)",
              maxWidth: "900px",
              marginBottom: "24px",
            }}
          >
            There&apos;s <em style={{ fontStyle: "italic", color: "var(--acc)", position: "relative" }}>
              money
              <span style={{
                content: '""',
                position: "absolute",
                bottom: ".08em",
                left: 0,
                right: 0,
                height: "2px",
                background: "var(--acc)",
                opacity: .3,
                borderRadius: "1px",
                display: "block",
              }} />
            </em> hiding in your real estate.
          </h1>

          <p
            className="animate-stagger-3"
            style={{
              font: "300 18px/1.6 var(--sans)",
              color: "var(--tx3)",
              maxWidth: "540px",
              marginBottom: "12px",
              margin: "0 auto 12px",
            }}
          >
            Every asset earning what it should. RealHQ finds the gaps — then fills them.
          </p>

          <div
            className="animate-stagger-3"
            style={{
              font: "600 15px/1 var(--sans)",
              color: "var(--tx)",
              marginBottom: "36px",
            }}
          >
            Free to start. <span style={{ color: "var(--acc)" }}>No credit card required.</span>
          </div>

          <div
            className="animate-stagger-4"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            <button
              onClick={() => router.push("/properties/add")}
              style={{
                height: "46px",
                padding: "0 30px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                font: "600 14px/1 var(--sans)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Start free →
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                height: "46px",
                padding: "0 24px",
                background: "transparent",
                color: "var(--tx2)",
                border: "1px solid var(--bdr)",
                borderRadius: "10px",
                font: "500 14px/1 var(--sans)",
                cursor: "pointer",
              }}
            >
              See demo
            </button>
          </div>

          <p
            className="animate-stagger-4"
            style={{
              font: "400 12px var(--sans)",
              color: "var(--tx3)",
            }}
          >
            No sign-up needed to explore the demo
          </p>

          {/* Hero proof stats */}
          <div
            className="animate-stagger-5"
            style={{
              marginTop: "48px",
              display: "flex",
              alignItems: "center",
              gap: "18px",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "20px",
                  color: "var(--tx)",
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                $180k
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                avg rent uplift
              </div>
            </div>
            <div style={{ width: "1px", height: "24px", background: "var(--bdr)" }} />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "20px",
                  color: "var(--tx)",
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                $93k
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                avg insurance saving
              </div>
            </div>
            <div style={{ width: "1px", height: "24px", background: "var(--bdr)" }} />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "20px",
                  color: "var(--tx)",
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                12 mins
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                avg time to insight
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
