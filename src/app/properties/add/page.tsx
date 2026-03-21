"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Prediction {
  description: string;
  placeId: string;
}

interface LookupResult {
  lat: number | null;
  lng: number | null;
  isUK: boolean;
  epcRating: string | null;
  floorAreaSqm: number | null;
  floorAreaSqft: number | null;
  hasSatellite: boolean;
}

type FlowState = "address" | "loading" | "confirm" | "type" | "saving";

type PropertyType = "Commercial" | "Residential" | "Mixed-Use";

// ─── Loading phases ───────────────────────────────────────────────────────────

const LOADING_PHASES = [
  { id: "geocoding",  label: "Geocoding address",        detail: "Resolving coordinates from address string" },
  { id: "satellite",  label: "Loading satellite imagery", detail: "Fetching roof-view for boundary analysis" },
  { id: "epc",        label: "Fetching EPC data",         detail: "Checking energy performance certificate" },
  { id: "planning",   label: "Checking planning records", detail: "Searching permitted development history" },
];
const PHASE_DELAYS = [0, 700, 1400, 2100];

// ─── Property type config ─────────────────────────────────────────────────────

const PROPERTY_TYPES: { type: PropertyType; icon: string; description: string }[] = [
  { type: "Commercial",  icon: "🏢", description: "Office, retail, industrial" },
  { type: "Residential", icon: "🏠", description: "House, flat, HMO" },
  { type: "Mixed-Use",   icon: "🏗️", description: "Residential + commercial" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddPropertyPage() {
  const router = useRouter();
  const { setPortfolioId } = useNav();

  // Address input
  const [address, setAddress] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flow state
  const [flow, setFlow] = useState<FlowState>("address");
  const [loadingPhase, setLoadingPhase] = useState<number>(0);
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Result
  const [result, setResult] = useState<LookupResult | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Add Property — RealHQ"; }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Autocomplete ────────────────────────────────────────────────────────────

  const fetchPredictions = useCallback(async (val: string) => {
    if (val.trim().length < 3) { setPredictions([]); setShowDropdown(false); return; }
    try {
      const res = await fetch(`/api/property/autocomplete?input=${encodeURIComponent(val.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setShowDropdown((data.predictions ?? []).length > 0);
      }
    } catch { /* ignore */ }
  }, []);

  function handleAddressChange(val: string) {
    setAddress(val);
    setError("");
    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
    autocompleteTimerRef.current = setTimeout(() => fetchPredictions(val), 300);
  }

  function handleSelectPrediction(desc: string) {
    setAddress(desc);
    setPredictions([]);
    setShowDropdown(false);
    triggerFetch(desc);
  }

  // ── Lookup ──────────────────────────────────────────────────────────────────

  function clearPhaseTimers() {
    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];
  }

  async function triggerFetch(addressStr: string) {
    const trimmed = addressStr.trim();
    if (!trimmed) return;
    setFlow("loading");
    setLoadingPhase(0);
    setError("");
    setResult(null);

    clearPhaseTimers();
    PHASE_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => setLoadingPhase(i), delay);
      phaseTimersRef.current.push(t);
    });

    try {
      const res = await fetch(`/api/property/lookup?address=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      setLoadingPhase(LOADING_PHASES.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      setResult(data);
      setFlow("confirm");
    } catch {
      setError("We couldn't find that address — try postcode + street name");
      setFlow("address");
    } finally {
      clearPhaseTimers();
    }
  }

  function handleFetchManual() {
    if (!address.trim()) return;
    setShowDropdown(false);
    triggerFetch(address);
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!result) return;
    setFlow("saving");
    try {
      const res = await fetch("/api/user/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: address.trim(),
          address: address.trim(),
          lat: result.lat,
          lng: result.lng,
          isUK: result.isUK,
          epcRating: result.epcRating,
          floorAreaSqm: result.floorAreaSqm,
          floorAreaSqft: result.floorAreaSqft,
          propertyType,
        }),
      });
      if (res.ok) {
        setPortfolioId("user");
        router.push("/dashboard?added=1&welcome=1");
      } else {
        setError("Could not save property. Please try again.");
        setFlow("confirm");
      }
    } catch {
      setError("Network error. Please try again.");
      setFlow("confirm");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <TopBar title="Add Property" />
      <main
        className="flex-1 overflow-y-auto p-4 lg:p-6 flex items-start justify-center"
        style={{ backgroundColor: "#F3F4F6" }}
      >
        <div className="w-full max-w-md mt-8 space-y-4">

          {/* ── State: address entry ── */}
          {(flow === "address") && (
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0A8A4C" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z" fill="#fff"/>
                    <circle cx="7" cy="5" r="1.5" fill="#0A8A4C"/>
                  </svg>
                </div>
                <h2 className="text-sm font-bold" style={{ color: "#111827" }}>Add a property</h2>
              </div>
              <p className="text-xs mb-4 ml-8" style={{ color: "#6B7280" }}>
                Enter any address — RealHQ auto-fetches satellite imagery, EPC certificate, and planning history.
              </p>

              {/* Input + autocomplete */}
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleFetchManual(); if (e.key === "Escape") setShowDropdown(false); }}
                    onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
                    placeholder="e.g. SW1A 2AA or 123 Main St"
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ border: "1px solid #D1D5DB", color: "#111827", backgroundColor: "#fff" }}
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    onClick={handleFetchManual}
                    disabled={!address.trim()}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all whitespace-nowrap hover:opacity-90"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Fetch →
                  </button>
                </div>

                {/* Autocomplete dropdown */}
                {showDropdown && predictions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
                    style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,.10)" }}
                  >
                    {predictions.map((p, i) => (
                      <button
                        key={p.placeId + i}
                        className="w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-gray-50 flex items-center gap-2"
                        style={{ color: "#111827", borderBottom: i < predictions.length - 1 ? "1px solid #F3F4F6" : undefined }}
                        onMouseDown={(e) => { e.preventDefault(); handleSelectPrediction(p.description); }}
                      >
                        <svg width="10" height="12" viewBox="0 0 10 14" fill="none" className="shrink-0">
                          <path d="M5 0C2.79 0 1 1.79 1 4c0 3.25 4 9 4 9s4-5.75 4-9c0-2.21-1.79-4-4-4z" fill="#9CA3AF"/>
                          <circle cx="5" cy="4" r="1.5" fill="#fff"/>
                        </svg>
                        <span className="truncate">{p.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs mt-2" style={{ color: "#D93025" }}>{error}</p>
              )}
            </div>
          )}

          {/* ── State: loading ── */}
          {flow === "loading" && (
            <>
              {/* Keep input visible during load */}
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
              >
                <div className="text-xs font-semibold mb-0.5" style={{ color: "#111827" }}>
                  {address}
                </div>
                <div className="text-[10.5px]" style={{ color: "#9CA3AF" }}>Analysing…</div>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
              >
                <div className="px-4 py-3 text-xs font-semibold" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", color: "#6B7280" }}>
                  RealHQ is fetching live data…
                </div>
                {LOADING_PHASES.map((phase, i) => {
                  const isDone = i < loadingPhase;
                  const isActive = i === loadingPhase;
                  const isPending = i > loadingPhase;
                  return (
                    <div
                      key={phase.id}
                      className="flex items-center gap-3 px-4 py-3 transition-all duration-300"
                      style={{
                        borderBottom: i < LOADING_PHASES.length - 1 ? "1px solid #F3F4F6" : undefined,
                        opacity: isPending ? 0.35 : 1,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{ backgroundColor: isDone ? "#0A8A4C" : isActive ? "#1647E8" : "#E5E7EB" }}
                      >
                        {isDone ? (
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5L4 7.5L8.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : isActive ? (
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#fff" }} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#9CA3AF" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold" style={{ color: isDone ? "#0A8A4C" : isActive ? "#111827" : "#9CA3AF" }}>
                          {phase.label}
                        </div>
                        {isActive && (
                          <div className="text-[10.5px] mt-0.5" style={{ color: "#9CA3AF" }}>{phase.detail}</div>
                        )}
                      </div>
                      {isDone && (
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: "#0A8A4C" }}>done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── State: confirm "Is this your property?" ── */}
          {flow === "confirm" && result && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              {/* Satellite image */}
              {result.hasSatellite && result.lat && result.lng ? (
                <div style={{ height: 160, overflow: "hidden", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/property/satellite?lat=${result.lat}&lng=${result.lng}`}
                    alt="Satellite view"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {/* Satellite label */}
                  <div
                    className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold"
                    style={{ backgroundColor: "rgba(0,0,0,.55)", color: "#fff", backdropFilter: "blur(4px)" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                    Satellite confirmed
                  </div>
                  {/* EPC badge if available */}
                  {result.epcRating && (
                    <div
                      className="absolute top-2 right-2 px-2 py-0.5 rounded text-[11px] font-bold text-white"
                      style={{
                        backgroundColor: ["A","B"].includes(result.epcRating) ? "#0A8A4C" : ["E","F","G"].includes(result.epcRating) ? "#D93025" : "#F5A94A",
                      }}
                    >
                      EPC {result.epcRating}
                    </div>
                  )}
                </div>
              ) : (
                /* Placeholder when no satellite */
                <div
                  className="flex items-center justify-center"
                  style={{ height: 80, backgroundColor: "#F3F4F6", borderBottom: "1px solid #E5E7EB" }}
                >
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>📍 Location confirmed</span>
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* "Is this your property?" prompt */}
                <div>
                  <div className="text-sm font-bold mb-0.5" style={{ color: "#111827" }}>
                    Is this your property?
                  </div>
                  <div className="text-xs" style={{ color: "#6B7280" }}>{address}</div>
                  {result.isUK && (
                    <div className="text-[10.5px] mt-0.5" style={{ color: "#9CA3AF" }}>UK market · GBP</div>
                  )}
                </div>

                {/* Data rows */}
                {(result.epcRating || result.floorAreaSqft) && (
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #F3F4F6" }}>
                    {result.epcRating && (
                      <DataRow
                        label="EPC Rating" value={result.epcRating} badge
                        badgeColor={["A","B"].includes(result.epcRating) ? "#0A8A4C" : ["E","F","G"].includes(result.epcRating) ? "#D93025" : "#F5A94A"}
                      />
                    )}
                    {result.floorAreaSqft && (
                      <DataRow label="Floor area" value={`${result.floorAreaSqft.toLocaleString()} sqft · ${result.floorAreaSqm?.toLocaleString()} m²`} />
                    )}
                    {result.lat && result.lng && (
                      <DataRow label="Coordinates" value={`${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`} />
                    )}
                  </div>
                )}

                {/* CTA buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFlow("type")}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Yes, that&rsquo;s it →
                  </button>
                  <button
                    onClick={() => { setFlow("address"); setResult(null); setAddress(""); setError(""); }}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-gray-100"
                    style={{ border: "1px solid #D1D5DB", color: "#374151", backgroundColor: "#fff" }}
                  >
                    Search again
                  </button>
                </div>

                {error && <p className="text-xs" style={{ color: "#D93025" }}>{error}</p>}
              </div>
            </div>
          )}

          {/* ── State: property type selector ── */}
          {flow === "type" && (
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              <div className="text-sm font-bold mb-1" style={{ color: "#111827" }}>What type of property is it?</div>
              <p className="text-xs mb-5" style={{ color: "#6B7280" }}>
                This helps RealHQ benchmark against the right comparables.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {PROPERTY_TYPES.map(({ type, icon, description }) => (
                  <button
                    key={type}
                    onClick={() => setPropertyType(type)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                    style={{
                      border: propertyType === type ? "2px solid #0A8A4C" : "1px solid #E5E7EB",
                      backgroundColor: propertyType === type ? "#F0FDF4" : "#fff",
                    }}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-semibold" style={{ color: propertyType === type ? "#0A8A4C" : "#111827" }}>
                      {type}
                    </span>
                    <span className="text-[10px] leading-tight" style={{ color: "#9CA3AF" }}>{description}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!propertyType}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Add to my portfolio →
                </button>
                <button
                  onClick={() => setFlow("confirm")}
                  className="px-4 py-3 rounded-lg text-sm transition-all hover:bg-gray-100"
                  style={{ border: "1px solid #D1D5DB", color: "#374151", backgroundColor: "#fff" }}
                >
                  ←
                </button>
              </div>
            </div>
          )}

          {/* ── State: saving ── */}
          {flow === "saving" && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse" style={{ backgroundColor: "#E8F5EE" }}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>Adding to your portfolio…</div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>Setting up dashboards and running opportunity scan</div>
            </div>
          )}

          {/* Skip link */}
          {(flow === "address") && (
            <p className="text-center text-xs pb-8" style={{ color: "#9CA3AF" }}>
              Already have properties?{" "}
              <button onClick={() => router.push("/dashboard")} className="underline" style={{ color: "#6B7280" }}>
                Go to dashboard
              </button>
            </p>
          )}

        </div>
      </main>
    </AppShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DataRow({
  label, value, badge, badgeColor,
}: {
  label: string;
  value: string;
  badge?: boolean;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid #F9FAFB" }}>
      <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
      {badge ? (
        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: badgeColor }}>
          {value}
        </span>
      ) : (
        <span className="text-xs font-medium font-mono" style={{ color: "#111827" }}>{value}</span>
      )}
    </div>
  );
}
