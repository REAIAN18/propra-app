"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPreview } from "@/components/ui/DashboardPreview";

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
            COMMERCIAL REAL ESTATE INTELLIGENCE
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
            There&apos;s money hiding<br />in your <em style={{ fontStyle: "italic", color: "var(--acc)", position: "relative" }}>
              real estate
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
            </em>
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
            RealHQ uncovers hidden savings, unlocks new revenue, and adds value across your entire portfolio — in just a few clicks.
          </p>

          <div
            className="animate-stagger-3"
            style={{
              font: "600 15px/1 var(--sans)",
              color: "var(--tx)",
              marginBottom: "36px",
            }}
          >
            You approve. <span style={{ color: "var(--acc)" }}>RealHQ executes.</span>
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
              Start free <span style={{ opacity: 0.6 }}>→</span>
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
              See a live demo →
            </button>
          </div>

          <p
            className="animate-stagger-4"
            style={{
              font: "400 12px var(--sans)",
              color: "var(--tx3)",
              marginTop: "14px",
            }}
          >
            Free to start. No credit card required. No sign-up needed to explore the demo.
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
              flexWrap: "wrap",
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
                15–25%
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                insurance overpayment
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
                up to 30%
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                energy wastage
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
                5–15%
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                rents below market
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
                $000s
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                untapped ancillary income
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
                hidden
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>
                planning & alternative use value
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--bdr), transparent)",
        }}
      />

      {/* Problem Section */}
      <section
        id="problem"
        style={{
          padding: "120px 40px",
          textAlign: "center",
          backgroundColor: "#09090b",
        }}
      >
        <div
          style={{
            font: "500 9px/1 var(--mono)",
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: "3px",
            marginBottom: "20px",
          }}
        >
          THE PROBLEM
        </div>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(32px,4.5vw,56px)",
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: "-.03em",
            color: "var(--tx)",
            maxWidth: "700px",
            margin: "0 auto 24px",
          }}
        >
          The average CRE portfolio loses{" "}
          <span
            style={{
              color: "var(--red)",
              fontFamily: "var(--mono)",
              fontSize: ".75em",
            }}
          >
            11–15%
          </span>{" "}
          of gross income to invisible leaks
        </h2>
        <p
          style={{
            font: "300 17px/1.7 var(--sans)",
            color: "var(--tx3)",
            maxWidth: "540px",
            margin: "0 auto",
          }}
        >
          Overpaying insurance. Missed rent reviews. Expired compliance that can void your cover. Revenue sitting on your roof that nobody told you about. You can&apos;t manage what you can&apos;t see.
        </p>

        {/* Leaks Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: "1px",
            maxWidth: "1060px",
            margin: "60px auto 0",
            background: "var(--bdr)",
            border: "1px solid var(--bdr)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* Insurance Leak */}
          <div
            style={{
              background: "var(--s1)",
              padding: "36px 32px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                fontSize: "16px",
                background: "var(--red-lt)",
                border: "1px solid var(--red-bdr)",
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "28px",
                color: "var(--tx)",
                letterSpacing: "-.03em",
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              $93k{" "}
              <small
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "12px",
                  color: "var(--tx3)",
                  fontWeight: 400,
                }}
              >
                /yr
              </small>
            </div>
            <div
              style={{
                font: "600 13px var(--sans)",
                color: "var(--tx)",
                marginBottom: "4px",
              }}
            >
              Insurance overcharges
            </div>
            <div
              style={{
                font: "300 12px/1.5 var(--sans)",
                color: "var(--tx3)",
              }}
            >
              Policies 15–25% above market that never get retendered because nobody&apos;s tracking them.
            </div>
          </div>

          {/* Energy Leak */}
          <div
            style={{
              background: "var(--s1)",
              padding: "36px 32px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                fontSize: "16px",
                background: "var(--amb-lt)",
                border: "1px solid var(--amb-bdr)",
              }}
            >
              ⚡
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "28px",
                color: "var(--tx)",
                letterSpacing: "-.03em",
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              $156k{" "}
              <small
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "12px",
                  color: "var(--tx3)",
                  fontWeight: 400,
                }}
              >
                /yr
              </small>
            </div>
            <div
              style={{
                font: "600 13px var(--sans)",
                color: "var(--tx)",
                marginBottom: "4px",
              }}
            >
              Energy waste
            </div>
            <div
              style={{
                font: "300 12px/1.5 var(--sans)",
                color: "var(--tx3)",
              }}
            >
              Tariffs, demand charges and consumption above state benchmarks across every asset.
            </div>
          </div>

          {/* Rent Leak */}
          <div
            style={{
              background: "var(--s1)",
              padding: "36px 32px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                fontSize: "16px",
                background: "var(--acc-lt)",
                border: "1px solid var(--acc-bdr)",
              }}
            >
              ↗
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "28px",
                color: "var(--tx)",
                letterSpacing: "-.03em",
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              $485k{" "}
              <small
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "12px",
                  color: "var(--tx3)",
                  fontWeight: 400,
                }}
              >
                /yr
              </small>
            </div>
            <div
              style={{
                font: "600 13px var(--sans)",
                color: "var(--tx)",
                marginBottom: "4px",
              }}
            >
              Below-market rents
            </div>
            <div
              style={{
                font: "300 12px/1.5 var(--sans)",
                color: "var(--tx3)",
              }}
            >
              Leases sitting under comparable rates. Evidence exists — nobody&apos;s pulling it together.
            </div>
          </div>

          {/* Compliance Leak */}
          <div
            style={{
              background: "var(--s1)",
              padding: "36px 32px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                fontSize: "16px",
                background: "var(--red-lt)",
                border: "1px solid var(--red-bdr)",
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "28px",
                color: "var(--tx)",
                letterSpacing: "-.03em",
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              $116k{" "}
              <small
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "12px",
                  color: "var(--tx3)",
                  fontWeight: 400,
                }}
              >
                exposure
              </small>
            </div>
            <div
              style={{
                font: "600 13px var(--sans)",
                color: "var(--tx)",
                marginBottom: "4px",
              }}
            >
              Expired compliance
            </div>
            <div
              style={{
                font: "300 12px/1.5 var(--sans)",
                color: "var(--tx3)",
              }}
            >
              Fire inspections, energy audits, environmental certificates — expired items that trigger fines and can void your insurance entirely.
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--bdr), transparent)",
        }}
      />

      {/* Journey Section (How it works) */}
      <section
        id="how"
        style={{
          padding: "120px 40px",
          backgroundColor: "#09090b",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "80px" }}>
          <div
            style={{
              font: "500 9px/1 var(--mono)",
              color: "var(--tx3)",
              textTransform: "uppercase",
              letterSpacing: "3px",
              marginBottom: "20px",
            }}
          >
            HOW IT WORKS
          </div>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px,4.5vw,52px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: "var(--tx)",
              maxWidth: "640px",
              margin: "0 auto 16px",
            }}
          >
            Type an address.
            <br />
            We do the rest.
          </h2>
          <p
            style={{
              font: "300 17px/1.7 var(--sans)",
              color: "var(--tx3)",
              maxWidth: "460px",
              margin: "0 auto",
            }}
          >
            Zero questions on first load. Instant results from what we already know about your portfolio.
          </p>
        </div>

        {/* Steps */}
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 0,
            position: "relative",
          }}
        >
          {/* Vertical line */}
          <div
            style={{
              content: '""',
              position: "absolute",
              left: "28px",
              top: "40px",
              bottom: "40px",
              width: "1px",
              background: "var(--bdr)",
            }}
          />

          {/* Step 1 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              gap: "28px",
              padding: "32px 0",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--serif)",
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--acc)",
                position: "relative",
                zIndex: 2,
              }}
            >
              1
            </div>
            <div>
              <div
                style={{
                  font: "500 9px/1 var(--mono)",
                  color: "var(--acc)",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                }}
              >
                STEP 01
              </div>
              <h3
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  fontWeight: 400,
                  color: "var(--tx)",
                  letterSpacing: "-.02em",
                  marginBottom: "6px",
                }}
              >
                Add your portfolio
              </h3>
              <p
                style={{
                  font: "300 14px/1.7 var(--sans)",
                  color: "var(--tx3)",
                  maxWidth: "480px",
                  marginBottom: "16px",
                }}
              >
                Type a property address, search by company name, or upload your portfolio schedule. RealHQ auto-builds a complete profile — asset data, market context, comparable properties, tenant register, and cost benchmarks. No spreadsheets. No questions.
              </p>
              <div
                style={{
                  font: "400 12px/1.5 var(--sans)",
                  color: "var(--tx2)",
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "8px",
                  display: "inline-block",
                }}
              >
                <code
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    color: "var(--acc)",
                    background: "var(--acc-lt)",
                    padding: "1px 5px",
                    borderRadius: "4px",
                  }}
                >
                  123 Brickell Ave, Miami FL
                </code>{" "}
                or search or upload → full profile in seconds
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              gap: "28px",
              padding: "32px 0",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--serif)",
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--acc)",
                position: "relative",
                zIndex: 2,
              }}
            >
              2
            </div>
            <div>
              <div
                style={{
                  font: "500 9px/1 var(--mono)",
                  color: "var(--acc)",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                }}
              >
                STEP 02
              </div>
              <h3
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  fontWeight: 400,
                  color: "var(--tx)",
                  letterSpacing: "-.02em",
                  marginBottom: "6px",
                }}
              >
                RealHQ finds the money
              </h3>
              <p
                style={{
                  font: "300 14px/1.7 var(--sans)",
                  color: "var(--tx3)",
                  maxWidth: "480px",
                  marginBottom: "16px",
                }}
              >
                We auto-enrich your profile with live market data, benchmark every cost line, scan for missed income, flag expiring leases and compliance gaps. You see findings — not raw data.
              </p>
              <div
                style={{
                  font: "400 12px/1.5 var(--sans)",
                  color: "var(--tx2)",
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "8px",
                  display: "inline-block",
                }}
              >
                Insurance overcharges, below-market rents, untapped ancillary revenue, compliance exposure — surfaced automatically
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              gap: "28px",
              padding: "32px 0",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--serif)",
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--acc)",
                position: "relative",
                zIndex: 2,
              }}
            >
              3
            </div>
            <div>
              <div
                style={{
                  font: "500 9px/1 var(--mono)",
                  color: "var(--acc)",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                }}
              >
                STEP 03
              </div>
              <h3
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  fontWeight: 400,
                  color: "var(--tx)",
                  letterSpacing: "-.02em",
                  marginBottom: "6px",
                }}
              >
                You approve. RealHQ executes.
              </h3>
              <p
                style={{
                  font: "300 14px/1.7 var(--sans)",
                  color: "var(--tx3)",
                  maxWidth: "480px",
                  marginBottom: "16px",
                }}
              >
                Every finding comes with a ready-to-go action. Retender insurance, send rent review letters, file compliance, generate lender packs. You make the decision. We handle the work.
              </p>
              <div
                style={{
                  font: "400 12px/1.5 var(--sans)",
                  color: "var(--tx2)",
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "8px",
                  display: "inline-block",
                }}
              >
                Every action is one click — but nothing fires until you say so
              </div>
            </div>
          </div>
        </div>

        {/* Approve Banner */}
        <div style={{ padding: "0 40px", marginTop: "60px" }}>
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              background: "var(--s1)",
              border: "1px solid var(--acc-bdr)",
              borderRadius: "14px",
              padding: "48px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Radial gradient */}
            <div
              style={{
                content: '""',
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "500px",
                height: "300px",
                background: "radial-gradient(circle, rgba(124,106,240,.06) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  font: "500 9px/1 var(--mono)",
                  color: "var(--acc)",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                  marginBottom: "16px",
                }}
              >
                THE OPERATING MODEL
              </div>
              <h3
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "clamp(28px,4vw,44px)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  letterSpacing: "-.03em",
                  color: "var(--tx)",
                  marginBottom: "12px",
                }}
              >
                You approve. <em style={{ fontStyle: "italic", color: "var(--acc)" }}>RealHQ executes.</em>
              </h3>
              <p
                style={{
                  font: "300 15px/1.7 var(--sans)",
                  color: "var(--tx3)",
                  maxWidth: "500px",
                  margin: "0 auto",
                }}
              >
                This isn&apos;t a dashboard that shows you charts and leaves you to figure it out. Every insight comes with an action. Every action is pre-built. You just say yes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <div style={{ paddingTop: "80px", paddingBottom: "80px", backgroundColor: "#09090b" }}>
        <DashboardPreview />
      </div>

      {/* Section Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--bdr), transparent)",
          marginTop: 0,
        }}
      />

      {/* Profile Section */}
      <section
        style={{
          padding: "120px 40px",
          backgroundColor: "#09090b",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "80px" }}>
          <div
            style={{
              font: "500 9px/1 var(--mono)",
              color: "var(--tx3)",
              textTransform: "uppercase",
              letterSpacing: "3px",
              marginBottom: "20px",
            }}
          >
            HOW IT ALL CONNECTS
          </div>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px,4.5vw,52px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: "var(--tx)",
              maxWidth: "640px",
              margin: "0 auto 16px",
            }}
          >
            One profile.
            <br />
            Every purpose.
          </h2>
          <p
            style={{
              font: "300 17px/1.7 var(--sans)",
              color: "var(--tx3)",
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            Your property data lives in one connected profile. RealHQ re-packages it for every audience — same data, different packaging, every purpose.
          </p>
        </div>

        {/* Profile Grid */}
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "14px",
          }}
        >
          {/* Lender Packs */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "28px 28px 24px",
              position: "relative",
              transition: "all .3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--acc-bdr)";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 16px 50px rgba(0,0,0,.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "14px" }}>🏦</div>
            <div style={{ font: "600 15px var(--sans)", color: "var(--tx)", marginBottom: "6px" }}>
              Lender Packs
            </div>
            <p style={{ font: "300 13px/1.6 var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
              Auto-generated financing packages with rent rolls, valuations, NOI breakdowns and cap rate analysis. One click. Bank-ready.
            </p>
            <span
              style={{
                font: "500 9px/1 var(--mono)",
                padding: "3px 8px",
                borderRadius: "5px",
                letterSpacing: ".3px",
                background: "var(--grn-lt)",
                color: "var(--grn)",
                border: "1px solid var(--grn-bdr)",
                display: "inline-block",
              }}
            >
              Auto-generated
            </span>
          </div>

          {/* Insurance Submissions */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "28px 28px 24px",
              position: "relative",
              transition: "all .3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--acc-bdr)";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 16px 50px rgba(0,0,0,.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "14px" }}>👱</div>
            <div style={{ font: "600 15px var(--sans)", color: "var(--tx)", marginBottom: "6px" }}>
              Insurance Submissions
            </div>
            <p style={{ font: "300 13px/1.6 var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
              Complete submissions with property specs, claims history, rebuild costs and compliance status. Get competitive quotes in seconds.
            </p>
            <span
              style={{
                font: "500 9px/1 var(--mono)",
                padding: "3px 8px",
                borderRadius: "5px",
                letterSpacing: ".3px",
                background: "var(--grn-lt)",
                color: "var(--grn)",
                border: "1px solid var(--grn-bdr)",
                display: "inline-block",
              }}
            >
              Auto-generated
            </span>
          </div>

          {/* Marketing Brochures */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "28px 28px 24px",
              position: "relative",
              transition: "all .3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--acc-bdr)";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 16px 50px rgba(0,0,0,.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "14px" }}>📑</div>
            <div style={{ font: "600 15px var(--sans)", color: "var(--tx)", marginBottom: "6px" }}>
              Marketing Brochures
            </div>
            <p style={{ font: "300 13px/1.6 var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
              When it&apos;s time to sell, RealHQ generates marketing materials from the same profile — with photography prompts, tenant summaries and financials.
            </p>
            <span
              style={{
                font: "500 9px/1 var(--mono)",
                padding: "3px 8px",
                borderRadius: "5px",
                letterSpacing: ".3px",
                background: "var(--grn-lt)",
                color: "var(--grn)",
                border: "1px solid var(--grn-bdr)",
                display: "inline-block",
              }}
            >
              Auto-generated
            </span>
          </div>

          {/* Stakeholder Portals */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "28px 28px 24px",
              position: "relative",
              transition: "all .3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--acc-bdr)";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 16px 50px rgba(0,0,0,.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "14px" }}>🔗</div>
            <div style={{ font: "600 15px var(--sans)", color: "var(--tx)", marginBottom: "6px" }}>
              Stakeholder Portals
            </div>
            <p style={{ font: "300 13px/1.6 var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
              Share exactly what you choose with lenders, insurers, buyers and partners. Track every view. Control every detail. Revoke any time.
            </p>
            <span
              style={{
                font: "500 9px/1 var(--mono)",
                padding: "3px 8px",
                borderRadius: "5px",
                letterSpacing: ".3px",
                background: "var(--grn-lt)",
                color: "var(--grn)",
                border: "1px solid var(--grn-bdr)",
                display: "inline-block",
              }}
            >
              View tracking
            </span>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--bdr), transparent)",
        }}
      />

      {/* Find Section (What we find) */}
      <section
        id="features"
        style={{
          padding: "120px 40px",
          backgroundColor: "#09090b",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "80px" }}>
          <div
            style={{
              font: "500 9px/1 var(--mono)",
              color: "var(--tx3)",
              textTransform: "uppercase",
              letterSpacing: "3px",
              marginBottom: "20px",
            }}
          >
            WHAT WE FIND
          </div>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px,4.5vw,52px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: "var(--tx)",
              maxWidth: "640px",
              margin: "0 auto 16px",
            }}
          >
            Reduce. Optimise. Grow.
          </h2>
          <p
            style={{
              font: "300 17px/1.7 var(--sans)",
              color: "var(--tx3)",
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            Three lenses on your portfolio. Every finding comes with a pre-built action.
          </p>
        </div>

        {/* Find Grid */}
        <div
          style={{
            maxWidth: "1060px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "24px",
          }}
        >
          {/* REDUCE Card */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "36px 32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                font: "500 10px/1 var(--mono)",
                color: "var(--acc)",
                letterSpacing: "2px",
                marginBottom: "16px",
              }}
            >
              REDUCE
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: "26px",
                fontWeight: 400,
                color: "var(--tx)",
                letterSpacing: "-.02em",
                marginBottom: "8px",
              }}
            >
              Cut the fat
            </h3>
            <p
              style={{
                font: "300 13px/1.7 var(--sans)",
                color: "var(--tx3)",
                marginBottom: "24px",
              }}
            >
              We benchmark every cost line and surface exactly where you&apos;re overpaying — then retender or renegotiate for you.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "Insurance 15–25% above market? Retendered in seconds",
                "Energy above state benchmark? Tariff and demand fixes ready",
                "Compliance expired? Flagged with fine exposure before it costs you",
                "OpEx running 2x above market? We show exactly where",
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    font: "400 12px var(--sans)",
                    color: "var(--tx2)",
                    padding: "8px 0",
                    borderBottom: i < 3 ? "1px solid var(--bdr-lt)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--acc)",
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* OPTIMISE Card */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "36px 32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                font: "500 10px/1 var(--mono)",
                color: "var(--acc)",
                letterSpacing: "2px",
                marginBottom: "16px",
              }}
            >
              OPTIMISE
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: "26px",
                fontWeight: 400,
                color: "var(--tx)",
                letterSpacing: "-.02em",
                marginBottom: "8px",
              }}
            >
              Unlock income
            </h3>
            <p
              style={{
                font: "300 13px/1.7 var(--sans)",
                color: "var(--tx3)",
                marginBottom: "24px",
              }}
            >
              Find money hiding in your existing assets — from rent uplifts with ready-to-send evidence to revenue nobody else sees.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "Rents below market? Comparable evidence and letters ready",
                "Ancillary income — solar, EV, 5G, signage — identified and modelled",
                "Gross-to-net margin gap? Exact path to close it",
                "Hold, sell or refinance? Three-scenario modelling per asset",
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    font: "400 12px var(--sans)",
                    color: "var(--tx2)",
                    padding: "8px 0",
                    borderBottom: i < 3 ? "1px solid var(--bdr-lt)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--acc)",
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* GROW Card */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "36px 32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                font: "500 10px/1 var(--mono)",
                color: "var(--acc)",
                letterSpacing: "2px",
                marginBottom: "16px",
              }}
            >
              GROW
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: "26px",
                fontWeight: 400,
                color: "var(--tx)",
                letterSpacing: "-.02em",
                marginBottom: "8px",
              }}
            >
              Acquire smarter
            </h3>
            <p
              style={{
                font: "300 13px/1.7 var(--sans)",
                color: "var(--tx3)",
                marginBottom: "24px",
              }}
            >
              AI-powered deal sourcing matched to your criteria, plus a pipeline that tracks every deal from watch to exchange.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "Deals scored and matched to your portfolio criteria",
                "Full pipeline from watch to exchange in one view",
                "Live market rates — SOFR, treasury, CRE spreads",
                "Buyer portals with view tracking for disposals",
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    font: "400 12px var(--sans)",
                    color: "var(--tx2)",
                    padding: "8px 0",
                    borderBottom: i < 3 ? "1px solid var(--bdr-lt)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--acc)",
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ancillary Income Callout */}
        <div
          style={{
            maxWidth: "1060px",
            margin: "40px auto 0",
            background: "var(--s1)",
            border: "1px solid var(--acc-bdr)",
            borderRadius: "14px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "32px",
            alignItems: "center",
            padding: "36px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              width: "300px",
              height: "100%",
              background: "radial-gradient(circle at right center, rgba(124,106,240,.05) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                font: "500 9px/1 var(--mono)",
                color: "var(--acc)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
              THE MONEY NOBODY ELSE SEES
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: "22px",
                fontWeight: 400,
                color: "var(--tx)",
                marginBottom: "6px",
                letterSpacing: "-.01em",
              }}
            >
              Ancillary income hiding on your assets
            </h3>
            <p
              style={{
                font: "300 13px/1.7 var(--sans)",
                color: "var(--tx3)",
                maxWidth: "500px",
              }}
            >
              Solar leases, EV charging, 5G mast rentals, signage rights, roof space, parking — revenue streams sitting dormant across your portfolio that property managers don&apos;t look for and spreadsheets can&apos;t find. RealHQ identifies them, models the income, and connects you to providers.
            </p>
          </div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: "42px",
              color: "var(--tx)",
              letterSpacing: "-.03em",
              lineHeight: 1,
              textAlign: "right",
              position: "relative",
              zIndex: 1,
            }}
          >
            $187k
            <small
              style={{
                display: "block",
                fontFamily: "var(--sans)",
                fontSize: "12px",
                color: "var(--tx3)",
                fontWeight: 400,
                marginTop: "4px",
              }}
            >
              /yr found across 4 assets
            </small>
          </div>
        </div>

        {/* Hold/Sell/Refinance Callout */}
        <div
          style={{
            maxWidth: "1060px",
            margin: "14px auto 0",
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
            borderRadius: "14px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "32px",
            alignItems: "center",
            padding: "36px 40px",
          }}
        >
          <div>
            <div
              style={{
                font: "500 9px/1 var(--mono)",
                color: "var(--amb)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
              EXIT STRATEGY
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: "22px",
                fontWeight: 400,
                color: "var(--tx)",
                marginBottom: "6px",
                letterSpacing: "-.01em",
              }}
            >
              Know when to hold. Know when to sell.
            </h3>
            <p
              style={{
                font: "300 13px/1.7 var(--sans)",
                color: "var(--tx3)",
                maxWidth: "500px",
              }}
            >
              Three-scenario modelling for every asset — hold and optimise, sell now, or refinance and restructure. When it&apos;s time to sell, RealHQ auto-generates your disposal toolkit: marketing materials, buyer portals, and view tracking.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span
              style={{
                font: "500 10px/1 var(--mono)",
                padding: "6px 12px",
                borderRadius: "6px",
                letterSpacing: ".3px",
                background: "var(--grn-lt)",
                color: "var(--grn)",
                border: "1px solid var(--grn-bdr)",
              }}
            >
              Hold
            </span>
            <span
              style={{
                font: "500 10px/1 var(--mono)",
                padding: "6px 12px",
                borderRadius: "6px",
                letterSpacing: ".3px",
                background: "var(--acc-lt)",
                color: "var(--acc)",
                border: "1px solid var(--acc-bdr)",
              }}
            >
              Sell
            </span>
            <span
              style={{
                font: "500 10px/1 var(--mono)",
                padding: "6px 12px",
                borderRadius: "6px",
                letterSpacing: ".3px",
                background: "var(--amb-lt)",
                color: "var(--amb)",
                border: "1px solid var(--amb-bdr)",
              }}
            >
              Refinance
            </span>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--bdr), transparent)",
        }}
      />

      {/* Calculator Section */}
      <section
        id="calculator"
        style={{
          padding: "120px 40px",
          backgroundColor: "#09090b",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px,4.5vw,52px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: "var(--tx)",
              maxWidth: "600px",
              margin: "0 auto 16px",
            }}
          >
            How much are you leaving on the table?
          </h2>
          <p
            style={{
              font: "300 17px/1.7 var(--sans)",
              color: "var(--tx3)",
              maxWidth: "440px",
              margin: "0 auto",
            }}
          >
            Model your portfolio upside in 30 seconds.
          </p>
        </div>

        {/* Calculator Widget */}
        <div
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          {/* Calculator Input */}
          <div
            style={{
              padding: "32px 36px 28px",
              borderBottom: "1px solid var(--bdr)",
            }}
          >
            <div
              style={{
                font: "500 9px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: "12px",
              }}
            >
              PORTFOLIO GROSS INCOME
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "36px",
                  color: "var(--tx)",
                  letterSpacing: "-.03em",
                  minWidth: "140px",
                }}
              >
                $5M <small style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--tx3)", fontWeight: 400 }}>/yr</small>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                defaultValue="5"
                style={{
                  flex: 1,
                  height: "4px",
                  background: "var(--s3)",
                  borderRadius: "2px",
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              />
            </div>
          </div>

          {/* Results */}
          <div
            style={{
              padding: "32px 36px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "20px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "8px",
                }}
              >
                CURRENT INCOME
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  color: "var(--tx)",
                  letterSpacing: "-.03em",
                  lineHeight: 1,
                }}
              >
                $5.0M
              </div>
              <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>annual gross</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "8px",
                }}
              >
                POTENTIAL UPSIDE
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  color: "var(--grn)",
                  letterSpacing: "-.03em",
                  lineHeight: 1,
                }}
              >
                +$650k
              </div>
              <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>avg portfolio uplift</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "8px",
                }}
              >
                IMPROVED IRR
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  color: "var(--acc)",
                  letterSpacing: "-.03em",
                  lineHeight: 1,
                }}
              >
                +1.8%
              </div>
              <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>typical improvement</div>
            </div>
          </div>

          {/* Bar visualization */}
          <div style={{ padding: "0 36px 28px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                font: "400 10px var(--sans)",
                color: "var(--tx3)",
                marginBottom: "8px",
              }}
            >
              <span>Current</span>
              <span>With RealHQ optimizations</span>
            </div>
            <div
              style={{
                height: "8px",
                background: "var(--s3)",
                borderRadius: "4px",
                overflow: "hidden",
                position: "relative",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: "77%",
                  height: "100%",
                  background: "var(--tx3)",
                  borderRadius: "4px 0 0 4px",
                }}
              />
              <div
                style={{
                  width: "23%",
                  height: "100%",
                  background: "var(--acc)",
                }}
              />
            </div>
          </div>

          {/* Note */}
          <div
            style={{
              padding: "0 36px 24px",
              font: "400 11px var(--sans)",
              color: "var(--tx3)",
              textAlign: "center",
            }}
          >
            <span style={{ fontStyle: "italic" }}>Illustrative model</span> based on average findings across portfolios. Your actual results will vary.
          </div>
        </div>

        {/* Market strip */}
        <div
          style={{
            maxWidth: "780px",
            margin: "24px auto 0",
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
            borderRadius: "10px",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            font: "400 13px var(--sans)",
            color: "var(--tx3)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--grn-lt)",
              border: "1px solid var(--grn-bdr)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          Add your portfolio to see actual opportunities based on your specific assets and market conditions
        </div>
      </section>

      {/* Section Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--bdr), transparent)",
        }}
      />

      {/* Testimonials/Proof Section */}
      <section
        id="proof"
        style={{
          padding: "120px 40px",
          backgroundColor: "#09090b",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(28px,3.5vw,42px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: "var(--tx)",
            }}
          >
            Trusted by portfolio owners who found money
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "14px",
          }}
        >
          {/* Testimonial 1 */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "28px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "16px",
                fontStyle: "italic",
                color: "var(--tx)",
                lineHeight: 1.45,
                letterSpacing: "-.01em",
                marginBottom: "20px",
                position: "relative",
                paddingLeft: "20px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "-.1em",
                  left: "-2px",
                  fontSize: "32px",
                  color: "var(--acc)",
                  opacity: .3,
                  fontFamily: "var(--serif)",
                }}
              >
                &ldquo;
              </span>
              Found $280k in insurance overcharges across 6 assets that our broker never flagged. Retendered and saved 23% year one.
            </div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx2)" }}>Sarah Chen</div>
            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>Portfolio Director, Multi-family</div>
            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--bdr)" }}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  color: "var(--acc)",
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                $280k
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>first-year savings</div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "28px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "16px",
                fontStyle: "italic",
                color: "var(--tx)",
                lineHeight: 1.45,
                letterSpacing: "-.01em",
                marginBottom: "20px",
                position: "relative",
                paddingLeft: "20px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "-.1em",
                  left: "-2px",
                  fontSize: "32px",
                  color: "var(--acc)",
                  opacity: .3,
                  fontFamily: "var(--serif)",
                }}
              >
                &ldquo;
              </span>
              Three rent reviews we&apos;d missed, all with comparable evidence ready to send. Uplifted $180k annual income in one afternoon.
            </div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx2)" }}>Marcus Thompson</div>
            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>Asset Manager, Office</div>
            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--bdr)" }}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  color: "var(--acc)",
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                $180k
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>additional annual income</div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              padding: "28px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "16px",
                fontStyle: "italic",
                color: "var(--tx)",
                lineHeight: 1.45,
                letterSpacing: "-.01em",
                marginBottom: "20px",
                position: "relative",
                paddingLeft: "20px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "-.1em",
                  left: "-2px",
                  fontSize: "32px",
                  color: "var(--acc)",
                  opacity: .3,
                  fontFamily: "var(--serif)",
                }}
              >
                &ldquo;
              </span>
              Solar opportunity on an industrial roof that nobody had mentioned. RealHQ modeled it, connected us to installers. Now $47k/yr passive.
            </div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx2)" }}>Elena Rodriguez</div>
            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>Owner, Industrial</div>
            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--bdr)" }}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  color: "var(--acc)",
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                $47k
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>new ancillary income</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--bdr), transparent)",
        }}
      />

      {/* CTA Section */}
      <section
        style={{
          padding: "140px 40px",
          textAlign: "center",
          position: "relative",
          backgroundColor: "#09090b",
        }}
      >
        {/* Radial gradient background */}
        <div
          style={{
            content: '""',
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(124,106,240,.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(36px,5vw,64px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: "var(--tx)",
              maxWidth: "700px",
              margin: "0 auto 20px",
            }}
          >
            Start finding <em style={{ fontStyle: "italic", color: "var(--acc)" }}>money</em> today
          </h2>
          <p
            style={{
              font: "300 17px/1.6 var(--sans)",
              color: "var(--tx3)",
              maxWidth: "460px",
              margin: "0 auto 14px",
            }}
          >
            Add your first property and see what RealHQ finds in under 60 seconds.
          </p>
          <div
            style={{
              font: "600 15px/1.6 var(--sans)",
              color: "var(--tx)",
              marginBottom: "36px",
            }}
          >
            Free to start. <span style={{ color: "var(--acc)" }}>No credit card required.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px" }}>
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
            style={{
              font: "400 12px var(--sans)",
              color: "var(--tx3)",
              marginTop: "16px",
            }}
          >
            No sign-up needed to explore the demo
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "40px",
          borderTop: "1px solid var(--bdr)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
        }}
      >
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: "15px",
            color: "var(--tx3)",
          }}
        >
          Real<span style={{ color: "var(--acc)", fontStyle: "italic" }}>HQ</span>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Link
            href="/signin"
            style={{
              font: "400 12px var(--sans)",
              color: "var(--tx3)",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/properties/add"
            style={{
              font: "400 12px var(--sans)",
              color: "var(--tx3)",
            }}
          >
            Get started
          </Link>
        </div>
        <div
          style={{
            font: "400 11px var(--sans)",
            color: "var(--tx3)",
          }}
        >
          © 2026 RealHQ
        </div>
      </footer>
    </div>
  );
}
