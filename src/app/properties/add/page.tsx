"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";

interface LookupResult {
  lat: number | null;
  lng: number | null;
  isUK: boolean;
  epcRating: string | null;
  floorAreaSqm: number | null;
  floorAreaSqft: number | null;
  hasSatellite: boolean;
}

// Sequential loading phases — shown during the API call
const LOADING_PHASES = [
  { id: "geocoding",  label: "Geocoding address",        detail: "Resolving coordinates from address string" },
  { id: "satellite",  label: "Loading satellite imagery", detail: "Fetching roof-view for analysis" },
  { id: "epc",        label: "Fetching EPC data",         detail: "Checking energy performance certificate" },
  { id: "planning",   label: "Checking planning records", detail: "Searching permitted development history" },
];

// Timing: each phase is visible for ~700ms, staggered during the real API call
const PHASE_DELAYS = [0, 700, 1400, 2100];

export default function AddPropertyPage() {
  const router = useRouter();
  const { setPortfolioId } = useNav();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<number>(-1); // -1 = not loading
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { document.title = "Add Property — RealHQ"; }, []);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function clearPhaseTimers() {
    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];
  }

  async function handleFetch() {
    if (!address.trim()) return;
    setLoading(true);
    setLoadingPhase(0);
    setError("");
    setResult(null);

    // Fire sequential phase transitions
    clearPhaseTimers();
    PHASE_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => setLoadingPhase(i), delay);
      phaseTimersRef.current.push(t);
    });

    try {
      const res = await fetch(`/api/property/lookup?address=${encodeURIComponent(address.trim())}`);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      // Show final phase briefly before revealing result
      setLoadingPhase(LOADING_PHASES.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      setResult(data);
    } catch {
      setError("Could not fetch property data. Check the address and try again.");
    } finally {
      clearPhaseTimers();
      setLoading(false);
      setLoadingPhase(-1);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
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
        }),
      });
      if (res.ok) {
        setPortfolioId("user");
        router.push("/dashboard?added=1");
      } else {
        setError("Could not save property. Please try again.");
        setSaving(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <TopBar title="Add Property" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 flex items-start justify-center" style={{ backgroundColor: "#F3F4F6" }}>
        <div className="w-full max-w-md mt-8 space-y-4">

          {/* Address input card */}
          <div className="rounded-xl p-6" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0A8A4C" }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z" fill="#fff"/><circle cx="7" cy="5" r="1.5" fill="#0A8A4C"/></svg>
              </div>
              <h2 className="text-sm font-bold" style={{ color: "#111827" }}>Add a property</h2>
            </div>
            <p className="text-xs mb-4 ml-8" style={{ color: "#6B7280" }}>
              Enter any address — RealHQ auto-fetches satellite imagery, EPC certificate, and planning history.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleFetch(); }}
                placeholder="123 Main St, Miami, FL 33101"
                className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: "1px solid #D1D5DB", color: "#111827", backgroundColor: loading ? "#F9FAFB" : "#fff" }}
                disabled={loading}
                autoFocus
              />
              <button
                onClick={handleFetch}
                disabled={!address.trim() || loading}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all whitespace-nowrap hover:opacity-90"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                {loading ? "Analysing…" : "Fetch →"}
              </button>
            </div>
            {error && <p className="text-xs mt-2" style={{ color: "#D93025" }}>{error}</p>}
          </div>

          {/* Sequential loading states */}
          {loading && loadingPhase >= 0 && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
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
                    {/* State indicator */}
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        backgroundColor: isDone ? "#0A8A4C" : isActive ? "#1647E8" : "#E5E7EB",
                      }}
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
          )}

          {/* Results card */}
          {result && !loading && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
              {/* Satellite image */}
              {result.hasSatellite && result.lat && result.lng && (
                <div style={{ height: 156, overflow: "hidden", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/property/satellite?lat=${result.lat}&lng=${result.lng}`}
                    alt="Satellite view"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div
                    className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold"
                    style={{ backgroundColor: "rgba(0,0,0,.55)", color: "#fff", backdropFilter: "blur(4px)" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                    Satellite confirmed
                  </div>
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>{address}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{result.isUK ? "UK market · GBP" : "US market · USD"}</div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded shrink-0" style={{ backgroundColor: "#E8F5EE", color: "#0A8A4C" }}>
                    ✓ Found
                  </span>
                </div>

                {/* Data rows */}
                <div className="space-y-0 rounded-lg overflow-hidden" style={{ border: "1px solid #F3F4F6" }}>
                  {result.epcRating && (
                    <DataRow label="EPC Rating" value={result.epcRating} badge
                      badgeColor={["A","B"].includes(result.epcRating) ? "#0A8A4C" : ["E","F","G"].includes(result.epcRating) ? "#D93025" : "#F5A94A"}
                    />
                  )}
                  {result.floorAreaSqft && (
                    <DataRow label="Floor area" value={`${result.floorAreaSqft.toLocaleString()} sqft · ${result.floorAreaSqm?.toLocaleString()} m²`} />
                  )}
                  <DataRow label="Location" value={result.lat && result.lng ? `${result.lat?.toFixed(4)}, ${result.lng?.toFixed(4)}` : "Geocoded"} />
                </div>

                {/* Unlocks list */}
                <div className="rounded-lg p-3" style={{ backgroundColor: "#F0FDF4", border: "1px solid #D1FAE5" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#065F46" }}>
                    Added to dashboard instantly
                  </p>
                  {[
                    "Insurance premium benchmark vs. market rate",
                    "Energy tariff & efficiency comparison",
                    result.epcRating ? `EPC ${result.epcRating} tracked — expiry alert set` : "EPC auto-fetched for UK properties",
                    "Hold vs. sell scenario model",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3" stroke="#0A8A4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-xs" style={{ color: "#166534" }}>{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  {saving ? "Saving…" : "Add to my portfolio →"}
                </button>
              </div>
            </div>
          )}

          {/* Skip link */}
          <p className="text-center text-xs pb-8" style={{ color: "#9CA3AF" }}>
            Already have properties?{" "}
            <button onClick={() => router.push("/dashboard")} className="underline" style={{ color: "#6B7280" }}>
              Go to dashboard
            </button>
          </p>
        </div>
      </main>
    </AppShell>
  );
}

function DataRow({ label, value, badge, badgeColor }: { label: string; value: string; badge?: boolean; badgeColor?: string }) {
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
