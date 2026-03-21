"use client";

import { useState, useEffect } from "react";
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

export default function AddPropertyPage() {
  const router = useRouter();
  const { setPortfolioId } = useNav();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Add Property — RealHQ"; }, []);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleFetch() {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/property/lookup?address=${encodeURIComponent(address.trim())}`);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Could not fetch property data. Check the address and try again.");
    } finally {
      setLoading(false);
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

  const sym = result?.isUK ? "£" : "$";

  return (
    <AppShell>
      <TopBar title="Add Property" />
      <main className="flex-1 p-4 lg:p-6 flex items-start justify-center">
        <div className="w-full max-w-md mt-8 space-y-4">
          {/* Address input */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "#111827" }}>Add a property</h2>
            <p className="text-sm mb-5" style={{ color: "#6B7280" }}>Enter the address and Arca will automatically fetch EPC, floor area, and location data.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleFetch(); }}
                placeholder="123 Main St, Miami, FL"
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
                disabled={loading}
              />
              <button
                onClick={handleFetch}
                disabled={!address.trim() || loading}
                className="px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all whitespace-nowrap"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                {loading ? "Fetching…" : "Fetch →"}
              </button>
            </div>
            {error && <p className="text-xs mt-2" style={{ color: "#D93025" }}>{error}</p>}
          </div>

          {/* Results card */}
          {result && (
            <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                <span className="text-sm font-semibold" style={{ color: "#111827" }}>Property found</span>
              </div>

              {/* Satellite image */}
              {result.hasSatellite && result.lat && result.lng && (
                <div className="rounded-xl overflow-hidden" style={{ height: 160 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/property/satellite?lat=${result.lat}&lng=${result.lng}`}
                    alt="Satellite view"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Data rows */}
              <div className="space-y-2">
                <DataRow label="Address" value={address} />
                {result.epcRating && (
                  <DataRow
                    label="EPC Rating"
                    value={result.epcRating}
                    badge
                    badgeColor={["A","B"].includes(result.epcRating) ? "#0A8A4C" : ["E","F","G"].includes(result.epcRating) ? "#D93025" : "#F5A94A"}
                  />
                )}
                {result.floorAreaSqft && (
                  <DataRow label="Floor area" value={`${result.floorAreaSqft.toLocaleString()} sqft (${result.floorAreaSqm?.toLocaleString()} m²)`} />
                )}
                <DataRow label="Market" value={result.isUK ? "UK — GBP" : "US — USD"} />
                <DataRow label="Geocoded" value={result.lat && result.lng ? "✓ Location confirmed" : "Address accepted"} />
              </div>

              {/* What unlocks */}
              <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: "#F0FDF4" }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#065F46" }}>Added to dashboard instantly</p>
                {[
                  "Insurance premium benchmark vs market rate",
                  "Energy tariff comparison",
                  result.epcRating ? `EPC rating ${result.epcRating} — expiry tracked` : "EPC rating auto-fetched for UK properties",
                  "Hold vs sell scenario model",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#0A8A4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-xs" style={{ color: "#166534" }}>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                {saving ? "Saving…" : "Add to portfolio →"}
              </button>
            </div>
          )}

          {/* Skip link */}
          <p className="text-center text-xs" style={{ color: "#9CA3AF" }}>
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
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
      <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
      {badge ? (
        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: badgeColor }}>
          {value}
        </span>
      ) : (
        <span className="text-xs font-medium" style={{ color: "#111827" }}>{value}</span>
      )}
    </div>
  );
}
