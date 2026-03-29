"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = 1 | 2 | 3;

export default function AddPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [address, setAddress] = useState("");
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);

  function handleAddressSubmit() {
    if (!address.trim()) return;
    
    // Move to step 2 (enrichment)
    setStep(2);
    
    // Simulate enrichment process
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setEnrichmentProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        // Move to step 3 after enrichment
        setTimeout(() => setStep(3), 500);
      }
    }, 800);
  }

  function skipToDashboard() {
    router.push("/dashboard");
  }

  return (
    <div style={{ backgroundColor: "#09090b", minHeight: "100vh" }}>
      {/* Nav with step progress */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: "52px",
          background: "rgba(9,9,11,.88)",
          backgroundColor: "#09090b",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--bdr)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}
      >
        <div style={{ fontFamily: "var(--serif)", fontSize: "17px", color: "var(--tx)" }}>
          <span style={{ color: "var(--acc)", fontStyle: "italic" }}>R</span>ealHQ
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: step >= 1 ? (step === 1 ? "var(--acc)" : "var(--grn)") : "var(--bdr)",
            }}
          />
          <div
            style={{
              width: "32px",
              height: "1px",
              background: step >= 2 ? "var(--grn)" : "var(--bdr)",
            }}
          />
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: step >= 2 ? (step === 2 ? "var(--acc)" : "var(--grn)") : "var(--bdr)",
            }}
          />
          <div
            style={{
              width: "32px",
              height: "1px",
              background: step >= 3 ? "var(--grn)" : "var(--bdr)",
            }}
          />
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: step >= 3 ? "var(--grn)" : "var(--bdr)",
            }}
          />
        </div>

        <button
          onClick={skipToDashboard}
          style={{
            font: "400 12px var(--sans)",
            color: "var(--tx3)",
            cursor: "pointer",
            background: "none",
            border: "none",
            transition: "color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tx2)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tx3)")}
        >
          Skip to dashboard →
        </button>
      </nav>

      {/* Step 1: Address Entry */}
      {step === 1 && (
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "60px 24px 120px", backgroundColor: "#09090b" }}>
          <div className="a1" style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "20px" }}>
            Step 1 of 3
          </div>
          <h1
            className="a2"
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px,5vw,48px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "var(--tx)",
              marginBottom: "12px",
            }}
          >
            Add your first property
          </h1>
          <p
            className="a3"
            style={{
              font: "300 16px/1.6 var(--sans)",
              color: "var(--tx3)",
              marginBottom: "40px",
              maxWidth: "480px",
            }}
          >
            Type an address and RealHQ does the rest — ownership, market context, comparables, benchmarks, and your first findings. No spreadsheets.
          </p>

          <div className="a3" style={{ position: "relative", marginBottom: "16px" }}>
            <div
              style={{
                position: "absolute",
                left: "18px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "16px",
                color: "var(--tx3)",
                pointerEvents: "none",
              }}
            >
              🔍
            </div>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Brickell Ave, Miami FL..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddressSubmit()}
              style={{
                width: "100%",
                padding: "18px 22px 18px 48px",
                background: "var(--s1)",
                border: "1.5px solid var(--bdr)",
                borderRadius: "12px",
                font: "400 16px var(--sans)",
                color: "var(--tx)",
                outline: "none",
                transition: "border-color .2s, box-shadow .2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--acc-bdr)";
                e.currentTarget.style.boxShadow = "0 0 0 4px var(--acc-dim), 0 8px 32px rgba(0,0,0,.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--bdr)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            onClick={handleAddressSubmit}
            disabled={!address.trim()}
            style={{
              width: "100%",
              height: "46px",
              background: "var(--acc)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              font: "600 14px/1 var(--sans)",
              cursor: address.trim() ? "pointer" : "default",
              transition: "all .15s",
              opacity: address.trim() ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (address.trim()) {
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
            Find my property →
          </button>

          <div className="a4" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>or</div>
            <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
          </div>

          <div className="a4" style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "9px",
                cursor: "pointer",
                transition: "all .15s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--tx3)";
                e.currentTarget.style.background = "var(--s2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bdr)";
                e.currentTarget.style.background = "var(--s1)";
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "6px" }}>📄</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Upload a schedule</div>
              <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                Drag a rent roll, portfolio schedule, or property list. We&apos;ll read it.
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "9px",
                cursor: "pointer",
                transition: "all .15s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--tx3)";
                e.currentTarget.style.background = "var(--s2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bdr)";
                e.currentTarget.style.background = "var(--s1)";
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "6px" }}>🏢</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Search by company</div>
              <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                Enter a company name and we&apos;ll find properties linked to it.
              </div>
            </div>
          </div>

          <div
            className="a4"
            style={{
              marginTop: "32px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "8px",
              font: "400 12px var(--sans)",
              color: "var(--tx3)",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--grn)",
                flexShrink: 0,
              }}
            />
            We&apos;ll auto-fetch ownership, planning, comparables, and market benchmarks
          </div>
        </div>
      )}

      {/* Step 2: Enrichment Loading */}
      {step === 2 && (
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "60px 24px", backgroundColor: "#09090b" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontSize: "28px",
                fontWeight: 400,
                color: "var(--tx)",
                marginBottom: "6px",
              }}
            >
              Analysing your property...
            </h1>
            <p style={{ font: "300 14px var(--sans)", color: "var(--tx3)" }}>
              Gathering ownership, market data, and your first findings
            </p>
          </div>

          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                height: "200px",
                background: "var(--s2)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "12px",
                  font: "500 10px/1 var(--mono)",
                  color: "#fff",
                  background: "rgba(0,0,0,.6)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  letterSpacing: ".5px",
                }}
              >
                SATELLITE LOADING...
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--tx)", marginBottom: "2px" }}>
                {address}
              </div>
              <div style={{ font: "400 12px var(--sans)", color: "var(--tx3)", marginBottom: "16px" }}>
                Commercial · Enriching data...
              </div>

              {/* Enrichment steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {[
                  { label: "Address verified", detail: "Geocoded and validated", done: true },
                  { label: "Land Registry", detail: "Ownership records retrieved", done: enrichmentProgress >= 40 },
                  { label: "Planning data", detail: "Nearby applications found", done: enrichmentProgress >= 60 },
                  { label: "Market benchmarks", detail: "Comparables identified", done: enrichmentProgress >= 80 },
                  { label: "First findings", detail: "Initial analysis complete", done: enrichmentProgress >= 100 },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 0",
                      borderBottom: i < 4 ? "1px solid var(--bdr-lt)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        flexShrink: 0,
                        background: item.done ? "var(--grn-lt)" : enrichmentProgress > i * 20 ? "var(--acc-lt)" : "var(--s2)",
                        border: `1px solid ${item.done ? "var(--grn-bdr)" : enrichmentProgress > i * 20 ? "var(--acc-bdr)" : "var(--bdr)"}`,
                        color: item.done ? "var(--grn)" : enrichmentProgress > i * 20 ? "var(--acc)" : "var(--tx3)",
                      }}
                    >
                      {item.done ? "✓" : enrichmentProgress > i * 20 ? "..." : "○"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: "500 12px var(--sans)", color: item.done ? "var(--tx)" : "var(--tx3)" }}>
                        {item.label}
                      </div>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "20px" }}>
                <div style={{ height: "3px", background: "var(--s3)", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      background: "var(--acc)",
                      borderRadius: "2px",
                      width: `${enrichmentProgress}%`,
                      transition: "width .6s ease",
                    }}
                  />
                </div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "6px", textAlign: "center" }}>
                  {enrichmentProgress}% complete
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: First Results */}
      {step === 3 && (
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px 120px", backgroundColor: "#09090b" }}>
          <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "20px" }}>
            Step 3 of 3
          </div>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(28px,4vw,38px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "var(--tx)",
              marginBottom: "12px",
            }}
          >
            Your first property is live
          </h1>
          <p
            style={{
              font: "300 16px/1.6 var(--sans)",
              color: "var(--tx3)",
              marginBottom: "32px",
              maxWidth: "520px",
            }}
          >
            We&apos;ve analysed {address}. Here&apos;s what we found so far — upload documents to unlock deeper insights.
          </p>

          {/* Key metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {[
              { label: "Estimated Value", value: "$9.8M", sub: "+12% vs comps", est: true, pos: true },
              { label: "Market Cap Rate", value: "7.2%", sub: "vs 7.5% area avg", pos: true },
              { label: "Market Rent", value: "$28/sqft", sub: "ERV estimate", est: true },
              { label: "Nearby Planning", value: "3 apps", sub: "in 500m radius" },
            ].map((metric, i) => (
              <div
                key={i}
                style={{
                  background: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "10px",
                  padding: "16px 18px",
                }}
              >
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>
                  {metric.label}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {metric.value}
                  {metric.est && (
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "8px",
                        color: "var(--amb)",
                        background: "var(--amb-lt)",
                        border: "1px solid var(--amb-bdr)",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        marginLeft: "4px",
                        verticalAlign: "middle",
                        letterSpacing: ".3px",
                      }}
                    >
                      EST
                    </span>
                  )}
                </div>
                <div style={{ font: "400 10px var(--sans)", color: metric.pos ? "var(--grn)" : "var(--tx3)", marginTop: "3px" }}>
                  {metric.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Findings section */}
          <div style={{ margin: "32px 0 24px" }}>
            <h2 style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>
              What we found so far
            </h2>
            <p style={{ font: "300 12px var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
              Initial opportunities and risks — upload lease docs for full analysis
            </p>

            {[
              {
                icon: "⚠️",
                type: "red",
                name: "Insurance overpay detected",
                detail: "Premium 31% above market benchmark for this property type",
                val: "$28k/yr",
                tag: { label: "QUICK WIN", type: "quick" },
              },
              {
                icon: "💡",
                type: "grn",
                name: "Lease renewal upcoming",
                detail: "Meridian Legal (18k sqft) expires in 348 days — market rent +16%",
                val: "+$72k/yr",
                tag: { label: "OPPORTUNITY", type: "opp" },
              },
              {
                icon: "📊",
                type: "amb",
                name: "Below-market rental income",
                detail: "Passing rent $25/sqft vs $29/sqft ERV",
                val: "$180k gap",
                tag: { label: "UPSIDE", type: "opp" },
              },
            ].map((finding, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "9px",
                  marginBottom: "6px",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--acc-bdr)";
                  e.currentTarget.style.background = "var(--s2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--bdr)";
                  e.currentTarget.style.background = "var(--s1)";
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                    background: `var(--${finding.type}-lt)`,
                    border: `1px solid var(--${finding.type}-bdr)`,
                  }}
                >
                  {finding.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{finding.name}</div>
                  <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                    {finding.detail}
                  </div>
                </div>
                <div style={{ font: "500 12px var(--mono)", color: "var(--tx)", textAlign: "right", whiteSpace: "nowrap" }}>
                  {finding.val}
                </div>
                <span
                  style={{
                    font: "600 8px/1 var(--mono)",
                    padding: "3px 7px",
                    borderRadius: "4px",
                    letterSpacing: ".3px",
                    whiteSpace: "nowrap",
                    background: `var(--${finding.tag.type === "quick" ? "grn" : "acc"}-lt)`,
                    color: `var(--${finding.tag.type === "quick" ? "grn" : "acc"})`,
                    border: `1px solid var(--${finding.tag.type === "quick" ? "grn" : "acc"}-bdr)`,
                  }}
                >
                  {finding.tag.label}
                </span>
              </div>
            ))}
          </div>

          {/* Upload section */}
          <div style={{ margin: "32px 0" }}>
            <h2 style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>
              Upload documents for deeper analysis
            </h2>
            <p style={{ font: "300 12px var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
              Leases, rent rolls, or property schedules unlock full tenant health, covenant analysis, and income optimisation
            </p>

            <div
              style={{
                border: "1.5px dashed var(--bdr)",
                borderRadius: "12px",
                padding: "32px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all .2s",
                background: "var(--s1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--acc-bdr)";
                e.currentTarget.style.background = "var(--acc-dim)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bdr)";
                e.currentTarget.style.background = "var(--s1)";
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>📄</div>
              <div style={{ font: "500 13px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>
                Drop files here or click to upload
              </div>
              <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>
                PDF, XLSX, DOCX accepted · Max 50MB
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
                {["PDF", "XLSX", "DOCX"].map((type) => (
                  <span
                    key={type}
                    style={{
                      font: "500 9px/1 var(--mono)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: "var(--s2)",
                      color: "var(--tx3)",
                      border: "1px solid var(--bdr)",
                      letterSpacing: ".3px",
                    }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <Link
                href="/dashboard"
                style={{ font: "400 12px var(--sans)", color: "var(--tx3)", transition: "color .15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--acc)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tx3)")}
              >
                I&apos;ll do this later
              </Link>
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ display: "flex", gap: "10px", marginTop: "32px" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                flex: 1,
                height: "46px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                font: "600 14px/1 var(--sans)",
                cursor: "pointer",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#6d5ce0";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,106,240,.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--acc)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Go to dashboard →
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes enter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .a1 {
          animation: enter 0.4s ease both;
        }
        .a2 {
          animation: enter 0.4s ease both 0.07s;
        }
        .a3 {
          animation: enter 0.4s ease both 0.14s;
        }
        .a4 {
          animation: enter 0.4s ease both 0.21s;
        }

        @media (max-width: 600px) {
          .results-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
