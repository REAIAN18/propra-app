"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = 1 | 2 | 3;

interface Prediction {
  description: string;
  place_id: string;
}

interface BoundaryPoint {
  lat: number;
  lng: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [address, setAddress] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [boundaryPolygon, setBoundaryPolygon] = useState<BoundaryPoint[] | null>(null);
  const [cyclingText, setCyclingText] = useState("Reading address...");

  // Autocomplete
  useEffect(() => {
    if (address.length > 3) {
      fetchPredictions();
    } else {
      setPredictions([]);
      setShowAutocomplete(false);
    }
  }, [address]);

  async function fetchPredictions() {
    try {
      const res = await fetch(`/api/property/autocomplete?input=${encodeURIComponent(address)}`);
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions || []);
        setShowAutocomplete(true);
      }
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  }

  async function selectAddress(prediction: Prediction) {
    setAddress(prediction.description);
    setShowAutocomplete(false);
    setStep(2);
    setLoading(true);

    // Cycling loading text
    const streetName = prediction.description.split(",")[0];
    const messages = [
      `Reading ${streetName}`,
      "Pulling building records",
      "Checking planning history",
      "Almost ready",
    ];
    let msgIndex = 0;
    const textInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setCyclingText(messages[msgIndex]);
    }, 1500);

    // Call lookup API
    try {
      const res = await fetch(`/api/property/lookup?address=${encodeURIComponent(prediction.description)}`);
      if (res.ok) {
        const data = await res.json();
        setLat(data.lat);
        setLng(data.lng);
        setBoundaryPolygon(data.boundaryPolygon);
      }
    } catch (err) {
      console.error("Lookup error:", err);
    }

    // Progress simulation
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 16;
      setEnrichmentProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(progressInterval);
        clearInterval(textInterval);
        setTimeout(() => {
          setStep(3);
          setLoading(false);
        }, 500);
      }
    }, 500);
  }

  function skipToDashboard() {
    router.push("/dashboard");
  }

  function addAnother() {
    setStep(1);
    setAddress("");
    setEnrichmentProgress(0);
  }

  return (
    <>
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
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes scanline {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
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
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          fontFamily: "var(--sans)",
        }}
      >
        {/* Nav */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            height: "52px",
            background: "rgba(9,9,11,.88)",
            backdropFilter: "blur(24px)",
            borderBottom: "1px solid var(--bdr)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
          }}
        >
          <div style={{ fontFamily: "var(--serif)", fontSize: "17px", color: "var(--tx)" }}>
            <span style={{ color: "var(--acc)", fontStyle: "italic" }}>R</span>
            ealHQ
          </div>

          {/* Progress dots */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: step === 1 ? "var(--acc)" : step > 1 ? "var(--grn)" : "var(--bdr)",
              }}
            />
            <div
              style={{
                width: "32px",
                height: "1px",
                background: step > 1 ? "var(--grn)" : "var(--bdr)",
              }}
            />
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: step === 2 ? "var(--acc)" : step > 2 ? "var(--grn)" : "var(--bdr)",
              }}
            />
            <div
              style={{
                width: "32px",
                height: "1px",
                background: step > 2 ? "var(--grn)" : "var(--bdr)",
              }}
            />
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: step === 3 ? "var(--acc)" : "var(--bdr)",
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
              transition: "color 0.15s",
            }}
          >
            Skip to dashboard →
          </button>
        </nav>

        {/* Step 1: Address Entry */}
        {step === 1 && (
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "60px 24px 120px" }}>
            <div
              className="a1"
              style={{
                font: "500 9px/1 var(--mono)",
                color: "var(--acc)",
                textTransform: "uppercase",
                letterSpacing: "3px",
                marginBottom: "20px",
              }}
            >
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
              Type an address and RealHQ does the rest — ownership, market context, comparables,
              benchmarks, and your first findings. No spreadsheets.
            </p>

            {/* Search box */}
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
                type="text"
                placeholder="Try an address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "18px 22px 18px 48px",
                  background: "var(--s1)",
                  border: "1.5px solid var(--bdr)",
                  borderRadius: "12px",
                  font: "400 16px var(--sans)",
                  color: "var(--tx)",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--acc-bdr)";
                  e.target.style.boxShadow = "0 0 0 4px var(--acc-dim), 0 8px 32px rgba(0,0,0,.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--bdr)";
                  e.target.style.boxShadow = "none";
                }}
              />

              {/* Autocomplete dropdown */}
              {showAutocomplete && predictions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "var(--s1)",
                    border: "1px solid var(--bdr)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    zIndex: 10,
                    boxShadow: "0 16px 48px rgba(0,0,0,.4)",
                  }}
                >
                  {predictions.slice(0, 5).map((pred) => (
                    <div
                      key={pred.place_id}
                      onClick={() => selectAddress(pred)}
                      style={{
                        padding: "12px 18px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--bdr-lt)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--s2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>
                        {pred.description.split(",")[0]}
                      </div>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                        {pred.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Find property button */}
            {address.length > 3 && !showAutocomplete && (
              <button
                onClick={() => selectAddress({ description: address, place_id: "" })}
                style={{
                  width: "100%",
                  padding: "14px 22px",
                  background: "var(--acc)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  font: "600 14px var(--sans)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  marginBottom: "16px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#8a7af5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--acc)";
                }}
              >
                Find my property →
              </button>
            )}

            {/* Alternate entry options */}
            <div className="a4" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
              <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>or</div>
              <div style={{ flex: 1, height: "1px", background: "var(--bdr)" }} />
            </div>

            <div className="a4" style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
              <Link
                href="/properties/upload-schedule"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "9px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "16px", marginBottom: "6px" }}>📄</div>
                <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                  Upload a schedule
                </div>
                <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                  Drag a rent roll, portfolio schedule, or property list. We'll read it.
                </div>
              </Link>

              <Link
                href="/properties/search-company"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "9px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "16px", marginBottom: "6px" }}>🏢</div>
                <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                  Search by company
                </div>
                <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                  Enter a company name and we'll find properties linked to it.
                </div>
              </Link>
            </div>

            {/* Hint bar */}
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
                  animation: "pulse 2s infinite",
                  flexShrink: 0,
                }}
              />
              Works for any US or UK commercial address. We pull from public records, planning
              databases, and market data in real time.
            </div>
          </div>
        )}

        {/* Step 2: Enrichment Loading */}
        {step === 2 && (
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "60px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                style={{
                  font: "500 9px/1 var(--mono)",
                  color: "var(--acc)",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                  marginBottom: "12px",
                }}
              >
                Step 2 of 3
              </div>
              <h2
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  fontWeight: 400,
                  color: "var(--tx)",
                  marginBottom: "6px",
                }}
              >
                Building your property profile
              </h2>
              <p style={{ font: "300 14px var(--sans)", color: "var(--tx3)" }}>
                This takes seconds, not hours. We're pulling live data from multiple sources.
              </p>
            </div>

            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {/* Satellite image */}
              <div
                style={{
                  height: "200px",
                  background: "var(--s2)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {lat && lng ? (
                  <>
                    <img
                      src={`/api/property/satellite?lat=${lat}&lng=${lng}&zoom=19&width=640&height=200&maptype=satellite`}
                      alt="Satellite view"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "brightness(0.7) saturate(0.8)",
                      }}
                    />
                    {boundaryPolygon && boundaryPolygon.length >= 3 && (
                      <svg
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                        }}
                        viewBox="0 0 640 200"
                        preserveAspectRatio="xMidYMid slice"
                      >
                        <polygon
                          points={boundaryPolygon
                            .map((p) => {
                              // Convert lat/lng to pixel coordinates (simplified mercator projection)
                              const scale = Math.pow(2, 19) * 256 / 360;
                              const x = (p.lng - lng) * scale + 320;
                              const y = 100 - (p.lat - lat) * scale;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2"
                          strokeOpacity="0.8"
                        />
                      </svg>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <div style={{ fontSize: "48px", opacity: 0.2 }}>🛰️</div>
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, var(--acc), transparent)",
                    animation: "scanline 2s linear infinite",
                    opacity: 0.6,
                  }}
                />
              </div>

              <div style={{ padding: "20px" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--tx)", marginBottom: "2px" }}>
                  {address.split(",")[0]}
                </div>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx3)", marginBottom: "16px" }}>
                  {address}
                </div>

                {/* Cycling status text */}
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "3px solid transparent",
                      borderTopColor: "var(--acc)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                      margin: "0 auto 20px",
                    }}
                  />
                  <div style={{ font: "500 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>
                    {cyclingText}
                  </div>
                  <div style={{ font: "300 12px var(--sans)", color: "var(--tx3)" }}>
                    Pulling live data from multiple sources
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: "20px" }}>
                  <div style={{ height: "3px", background: "var(--s3)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "var(--acc)",
                        borderRadius: "2px",
                        width: `${enrichmentProgress}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "6px", textAlign: "center" }}>
                    Typically under 15 seconds
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px 120px" }}>
            <div className="a1" style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "20px" }}>
              Step 3 of 3
            </div>

            <h2
              className="a2"
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(28px,4vw,38px)",
                fontWeight: 400,
                color: "var(--tx)",
                marginBottom: "6px",
              }}
            >
              Your first property is live
            </h2>

            <p
              className="a2"
              style={{
                font: "300 16px/1.6 var(--sans)",
                color: "var(--tx3)",
                marginBottom: "32px",
                maxWidth: "480px",
              }}
            >
              Here's what we found from public data alone. Upload documents for deeper analysis.
            </p>

            {/* Property header */}
            <div
              className="a3"
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  height: "160px",
                  background: "var(--s2)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {lat && lng ? (
                  <>
                    <img
                      src={`/api/property/satellite?lat=${lat}&lng=${lng}&zoom=19&width=960&height=160&maptype=satellite`}
                      alt="Satellite view"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "brightness(0.7) saturate(0.8)",
                      }}
                    />
                    {boundaryPolygon && boundaryPolygon.length >= 3 && (
                      <svg
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                        }}
                        viewBox="0 0 960 160"
                        preserveAspectRatio="xMidYMid slice"
                      >
                        <polygon
                          points={boundaryPolygon
                            .map((p) => {
                              const scale = Math.pow(2, 19) * 256 / 360;
                              const x = (p.lng - lng) * scale + 480;
                              const y = 80 - (p.lat - lat) * scale;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2"
                          strokeOpacity="0.8"
                        />
                      </svg>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <div style={{ fontSize: "40px", opacity: 0.15 }}>🌎</div>
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "12px",
                    font: "500 10px/1 var(--mono)",
                    color: "#fff",
                    background: "rgba(0,0,0,.7)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  📍 {address}
                </div>
              </div>
              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: "var(--tx)" }}>
                    {address.split(",")[0]}
                  </div>
                  <div style={{ font: "400 12px var(--sans)", color: "var(--tx3)" }}>
                    Commercial · Public record data
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      font: "500 8px/1 var(--mono)",
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      marginBottom: "4px",
                    }}
                  >
                    Owner
                  </div>
                  <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                    Data loading...
                  </div>
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div
              className="a3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
                marginBottom: "24px",
              }}
            >
              {[
                { label: "Estimated Value", value: "Calculating...", sub: "Based on market data" },
                { label: "Market Cap Rate", value: "6.6%", sub: "Regional average · Q1 2026" },
                { label: "Market Rent", value: "$24/sqft", sub: "Above regional avg" },
                { label: "Nearby Planning", value: "Scanning...", sub: "Public planning data" },
              ].map((metric, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--s1)",
                    border: "1px solid var(--bdr)",
                    borderRadius: "10px",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      font: "500 8px/1 var(--mono)",
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      marginBottom: "6px",
                    }}
                  >
                    {metric.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "22px",
                      color: "var(--tx)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {metric.value}
                  </div>
                  <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                    {metric.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Initial findings */}
            <div className="a4" style={{ margin: "32px 0 24px" }}>
              <div style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>
                What we found so far
              </div>
              <div style={{ font: "300 12px var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
                From public data and market benchmarks. Upload your leases and insurance schedules for exact figures.
              </div>

              {[
                {
                  icon: "⚠️",
                  iconColor: "red",
                  name: "Insurance likely above market",
                  detail: "Commercial properties this size typically overpay 15–25%. Upload your schedule to check.",
                  tag: "Quick win",
                  tagColor: "grn",
                },
                {
                  icon: "⚡",
                  iconColor: "amb",
                  name: "Energy spend above benchmark",
                  detail: "Tariff optimisation and demand reduction likely available.",
                  tag: "Opportunity",
                  tagColor: "acc",
                },
                {
                  icon: "🛰️",
                  iconColor: "acc",
                  name: "Ancillary income potential",
                  detail: "Roof space (solar), EV charging, 5G — upload docs to model.",
                  tag: "Opportunity",
                  tagColor: "acc",
                },
              ].map((finding, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    background: "var(--s1)",
                    border: "1px solid var(--bdr)",
                    borderRadius: "9px",
                    marginBottom: "6px",
                    transition: "all 0.15s",
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
                      background: `var(--${finding.iconColor}-lt)`,
                      border: `1px solid var(--${finding.iconColor}-bdr)`,
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
                  <div
                    style={{
                      font: "600 8px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "4px",
                      letterSpacing: "0.3px",
                      whiteSpace: "nowrap",
                      background: `var(--${finding.tagColor}-lt)`,
                      color: `var(--${finding.tagColor})`,
                      border: `1px solid var(--${finding.tagColor}-bdr)`,
                    }}
                  >
                    {finding.tag}
                  </div>
                </div>
              ))}
            </div>

            {/* Document upload */}
            <div className="a4" style={{ margin: "32px 0" }}>
              <div style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>
                Want exact numbers instead of estimates?
              </div>
              <div style={{ font: "300 12px var(--sans)", color: "var(--tx3)", marginBottom: "14px" }}>
                Drop your documents. RealHQ extracts the data automatically — no manual entry.
              </div>

              <div
                style={{
                  border: "1.5px dashed var(--bdr)",
                  borderRadius: "12px",
                  padding: "32px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: "var(--s1)",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>📄</div>
                <div style={{ font: "500 13px var(--sans)", color: "var(--tx)", marginBottom: "4px" }}>
                  Drag files here or click to browse
                </div>
                <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>
                  We read everything — leases, insurance schedules, energy bills, rent rolls, valuations
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
                  {["PDF", "XLSX", "DOCX", "Images"].map((type) => (
                    <span
                      key={type}
                      style={{
                        font: "500 9px/1 var(--mono)",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: "var(--s2)",
                        color: "var(--tx3)",
                        border: "1px solid var(--bdr)",
                        letterSpacing: "0.3px",
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
                  style={{
                    font: "400 12px var(--sans)",
                    color: "var(--tx3)",
                    transition: "color 0.15s",
                  }}
                >
                  Skip for now — I'll upload later →
                </Link>
              </div>
            </div>

            {/* Bottom CTAs */}
            <div className="a4" style={{ display: "flex", gap: "10px", marginTop: "32px" }}>
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
                  transition: "all 0.15s",
                }}
              >
                Go to dashboard →
              </button>
              <button
                onClick={addAnother}
                style={{
                  height: "46px",
                  padding: "0 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  color: "var(--tx2)",
                  border: "1px solid var(--bdr)",
                  borderRadius: "10px",
                  font: "500 14px/1 var(--sans)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                + Add another property
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
