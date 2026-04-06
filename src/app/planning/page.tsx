"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

// ── Types ─────────────────────────────────────────────────────────────
type PlanningApplication = {
  id: string;
  reference: string;
  address: string;
  description: string;
  distance: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  impact: "positive" | "negative" | "neutral";
  impactReason?: string;
  submittedDate: string;
  lat?: number;
  lng?: number;
};

type DevPotential = {
  level: "high" | "medium" | "low";
  upliftValue: number;
  description: string;
  zoningSummary: {
    zone: string;
    maxHeight: string;
    maxFAR: string;
    currentFAR: string;
    permittedUses: string;
    setback: string;
    parking: string;
  };
  options: Array<{
    title: string;
    description: string;
    cost: number;
    gdv: number;
    net: number;
  }>;
};

// ── API response types ─────────────────────────────────────────────────
type ApiEntry = {
  id: string;
  refNumber: string;
  description: string;
  applicant?: string;
  type: string;
  status: string;
  distanceFt?: number;
  lat?: number;
  lng?: number;
  impact: "opportunity" | "threat" | "neutral";
  impactScore: number;
  submittedDate: string;
  decisionDate?: string;
  notes: string;
  holdSellLink?: string;
  alertAcked?: boolean;
  sourceUrl?: string | null;
};

type ApiAsset = {
  assetId: string;
  assetName: string;
  location: string;
  assetLat?: number;
  assetLng?: number;
  planningHistory: ApiEntry[];
  planningImpactSignal?: string | null;
  devPotential?: {
    level: "high" | "medium" | "low";
    upliftEstimate: number;
    description: string;
    zoningSummary?: Record<string, string>;
    options?: Array<{ title: string; description: string; cost: number; gdv: number; net: number }>;
  } | null;
};

function ftToMi(ft: number): string {
  return `${(ft / 5280).toFixed(1)}mi`;
}

function mapImpact(impact: string): "positive" | "negative" | "neutral" {
  if (impact === "opportunity") return "positive";
  if (impact === "threat") return "negative";
  return "neutral";
}

function mapStatus(status: string): "PENDING" | "APPROVED" | "REJECTED" {
  if (status === "approved") return "APPROVED";
  if (status === "rejected" || status === "withdrawn") return "REJECTED";
  return "PENDING";
}

// ── Google Maps dark theme styles ──────────────────────────────────────
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#111116" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#09090b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#555568" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1f1f28" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#252533" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8888a0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#09090b" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#252533" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#8888a0" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#8888a0" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#18181f" }] },
];

// ── Main Page ─────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [applications, setApplications] = useState<PlanningApplication[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapKey, setMapKey] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  const mapScriptLoaded = useRef(false);
  const [devPotential, setDevPotential] = useState<DevPotential>({
    level: "medium",
    upliftValue: 0,
    description: "",
    zoningSummary: { zone: "—", maxHeight: "—", maxFAR: "—", currentFAR: "—", permittedUses: "—", setback: "—", parking: "—" },
    options: [],
  });

  useEffect(() => {
    document.title = "Planning — RealHQ";
    fetch("/api/user/planning")
      .then((r) => r.json())
      .then((data: { assets?: ApiAsset[] }) => {
        const assets = data.assets ?? [];
        // Flatten all planning entries across assets
        const apps: PlanningApplication[] = assets.flatMap((asset) =>
          (asset.planningHistory ?? []).map((e) => ({
            id: e.id,
            reference: e.refNumber,
            address: asset.location,
            description: e.description,
            distance: e.distanceFt ? ftToMi(e.distanceFt) : "—",
            status: mapStatus(e.status),
            impact: mapImpact(e.impact),
            impactReason: e.notes,
            submittedDate: e.submittedDate ? new Date(e.submittedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—",
            lat: e.lat,
            lng: e.lng,
          }))
        );
        setApplications(apps);

        // Set map center from first asset lat/lng
        const firstAsset = assets[0];
        if (firstAsset?.assetLat && firstAsset?.assetLng) {
          setMapCenter({ lat: firstAsset.assetLat, lng: firstAsset.assetLng });
        }

        // Use devPotential from first asset if available
        if (firstAsset?.devPotential) {
          const dp = firstAsset.devPotential;
          setDevPotential({
            level: dp.level ?? "medium",
            upliftValue: dp.upliftEstimate ?? 0,
            description: dp.description ?? "",
            zoningSummary: dp.zoningSummary as DevPotential["zoningSummary"] ?? devPotential.zoningSummary,
            options: dp.options ?? [],
          });
        }
      })
      .catch(() => {});

    // Fetch map key for authenticated users
    fetch("/api/user/planning/map-key")
      .then((r) => r.json())
      .then((d: { key?: string | null }) => {
        if (d.key) setMapKey(d.key);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Google Maps JS API once we have the key
  useEffect(() => {
    if (!mapKey || mapScriptLoaded.current) return;
    mapScriptLoaded.current = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapKey}`;
    script.async = true;
    script.onload = () => setMapsReady(true);
    document.head.appendChild(script);
  }, [mapKey]);

  // Initialise or update Google Maps when ready
  const initMap = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!google?.maps || !mapRef.current) return;

    const center = mapCenter ?? { lat: 25.7617, lng: -80.1918 };

    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      });
    } else {
      mapInstance.current.setCenter(center);
    }

    const gMap = mapInstance.current;

    // Clear existing overlays by re-creating (simple approach)
    // Distance circles
    [402, 805, 1609].forEach((radius) => {
      new google.maps.Circle({
        map: gMap,
        center,
        radius,
        strokeColor: "#252533",
        strokeOpacity: 1,
        strokeWeight: 1,
        fillOpacity: 0,
      });
    });

    // Property centre pin
    new google.maps.Marker({
      position: center,
      map: gMap,
      zIndex: 10,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#7c6af0",
        fillOpacity: 1,
        strokeColor: "#09090b",
        strokeWeight: 2,
        scale: 10,
      },
      title: "Your property",
    });

    // Application pins
    const infoWindow = new google.maps.InfoWindow();
    applications.forEach((app) => {
      if (app.lat == null || app.lng == null) return;
      const fillColor =
        app.impact === "positive" ? "#34d399" :
        app.impact === "negative" ? "#f87171" : "#fbbf24";
      const marker = new google.maps.Marker({
        position: { lat: app.lat, lng: app.lng },
        map: gMap,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor,
          fillOpacity: 1,
          strokeColor: "#09090b",
          strokeWeight: 1,
          scale: 7,
        },
        title: app.description,
      });
      marker.addListener("click", () => {
        const statusLabel = app.status === "APPROVED" ? "Approved" : app.status === "REJECTED" ? "Refused" : "Pending";
        infoWindow.setContent(
          `<div style="background:#111116;color:#e4e4ec;padding:10px 12px;border-radius:8px;max-width:220px;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">` +
          `<div style="font-weight:600;margin-bottom:4px">${app.description}</div>` +
          `<div style="color:#8888a0">${app.distance} away · ${statusLabel}</div>` +
          `<div style="margin-top:4px;font-size:11px;color:${fillColor};text-transform:uppercase;font-weight:600">${app.impact}</div>` +
          `</div>`
        );
        infoWindow.open(gMap, marker);
      });
    });
  }, [mapCenter, applications]);

  useEffect(() => {
    if (!mapsReady || viewMode !== "map") return;
    initMap();
  }, [mapsReady, viewMode, initMap]);

  const stats = {
    total: applications.length,
    negative: applications.filter((a) => a.impact === "negative").length,
    positive: applications.filter((a) => a.impact === "positive").length,
    monitoring: "Active",
  };

  const impactColor = (impact: string) => {
    if (impact === "positive") return "var(--grn)";
    if (impact === "negative") return "var(--red)";
    return "var(--amb)";
  };

  const statusColor = (status: string) => {
    if (status === "APPROVED") return "ok";
    if (status === "REJECTED") return "danger";
    return "warn";
  };

  return (
    <AppShell>
      <TopBar />
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "28px 32px 40px", maxWidth: "1080px", margin: "0 auto" }}>

        {/* Property Title */}
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
          {portfolio.assets[0]?.location?.split(",")[0] || "Portfolio Planning"}
        </div>

        {/* Tab Bar - Planning active */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--bdr)", marginBottom: "24px" }}>
          {["Overview", "Tenants", "Financials", "Income", "Work Orders", "Compliance", "Planning", "Documents"].map((tab) => (
            <div
              key={tab}
              style={{
                padding: "10px 18px",
                font: "500 12px var(--sans)",
                color: tab === "Planning" ? "var(--acc)" : "var(--tx3)",
                cursor: "pointer",
                borderBottom: tab === "Planning" ? "2px solid var(--acc)" : "2px solid transparent",
                transition: "all .12s",
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1px", background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Applications</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.total}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>within 1 mile · last 12mo</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Negative</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--red)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.negative}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--red)" }}>{stats.negative} could impact value</span></div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Positive</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.positive}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--grn)" }}>neighbourhood improving</span></div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Dev Potential</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--acc)", letterSpacing: "-.02em", lineHeight: 1, textTransform: "capitalize" }}>{devPotential.level}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>+${(devPotential.upliftValue / 1000).toFixed(0)}k potential uplift</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Monitoring</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.monitoring}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>Checked weekly</div>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px" }}>Nearby Applications</div>
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--bdr)", borderRadius: "7px", overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "6px 14px",
                font: "500 10px var(--sans)",
                color: viewMode === "list" ? "var(--acc)" : "var(--tx3)",
                background: viewMode === "list" ? "var(--acc-dim)" : "var(--s1)",
                cursor: "pointer",
                border: "none",
                borderRight: "1px solid var(--bdr)",
                transition: "all .12s",
              }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("map")}
              style={{
                padding: "6px 14px",
                font: "500 10px var(--sans)",
                color: viewMode === "map" ? "var(--acc)" : "var(--tx3)",
                background: viewMode === "map" ? "var(--acc-dim)" : "var(--s1)",
                cursor: "pointer",
                border: "none",
                transition: "all .12s",
              }}
            >
              Map
            </button>
          </div>
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div style={{ border: "1px solid var(--bdr)", borderRadius: "var(--r)", height: "360px", marginBottom: "24px", position: "relative", overflow: "hidden", background: "var(--s2)" }}>
            {/* Google Maps container */}
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

            {/* Legend overlay */}
            <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", gap: "10px", font: "400 9px var(--sans)", color: "var(--tx3)", background: "rgba(9,9,11,0.75)", padding: "5px 10px", borderRadius: "6px", pointerEvents: "none" }}>
              {[
                { label: "Your property", color: "var(--acc)" },
                { label: "Positive", color: "var(--grn)" },
                { label: "Neutral", color: "var(--amb)" },
                { label: "Negative", color: "var(--red)" },
              ].map((item) => (
                <span key={item.label}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: item.color, marginRight: "3px" }} />
                  {item.label}
                </span>
              ))}
            </div>
            <div style={{ position: "absolute", bottom: "12px", right: "12px", font: "400 8px var(--mono)", color: "var(--tx3)", background: "rgba(9,9,11,0.75)", padding: "4px 8px", borderRadius: "5px", pointerEvents: "none" }}>Rings: 0.25mi · 0.5mi · 1mi</div>
          </div>
        )}

        {/* Application List */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>All Applications — Last 12 Months</h4>
            <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>Filter by impact ↓</span>
          </div>

          {applications.map((app) => (
            <div key={app.id}>
              <div
                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 18px",
                  borderBottom: "1px solid var(--bdr-lt)",
                  borderLeft: `3px solid ${impactColor(app.impact)}`,
                  cursor: "pointer",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{app.description}</div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)" }}>{app.address} · {app.distance} away · {app.submittedDate}</div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "100px", font: "600 9px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: `var(--${app.impact === "positive" ? "grn" : app.impact === "negative" ? "red" : "amb"}-lt)`, color: impactColor(app.impact), border: `1px solid var(--${app.impact === "positive" ? "grn" : app.impact === "negative" ? "red" : "amb"}-bdr)` }}>
                  {app.impact.toUpperCase()}
                </span>
                <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>{app.distance}</span>
                <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: ".3px", whiteSpace: "nowrap" }} className={`tag-${statusColor(app.status)}`}>
                  {app.status}
                </span>
                <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
              </div>

              {/* AI Explanation (expanded) */}
              {expandedApp === app.id && app.impactReason && (
                <div style={{ padding: "14px 18px", background: "var(--s2)", borderRadius: "8px", margin: "0 18px 18px", font: "300 12px/1.7 var(--sans)", color: "var(--tx2)" }}>
                  <div style={{ font: "500 8px/1 var(--mono)", padding: "2px 6px", borderRadius: "4px", background: "var(--acc-dim)", color: "var(--acc)", border: "1px solid var(--acc-bdr)", marginBottom: "8px", display: "inline-block" }}>AI CLASSIFICATION</div>
                  <br />
                  <strong style={{ color: "var(--tx)", fontWeight: 500 }}>Classified as {app.impact.toUpperCase()} because:</strong> {app.impactReason}
                  {app.impact === "negative" && (
                    <div style={{ marginTop: "8px" }}>
                      <a href="#" style={{ color: "var(--red)", font: "500 11px var(--sans)" }}>Draft objection letter →</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dev Potential Summary */}
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Development Potential</div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--acc-bdr)", borderRadius: "var(--r)", padding: "22px 24px", marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "center" }}>
          <div>
            <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Your Property</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "18px", fontWeight: 400, color: "var(--tx)", marginBottom: "3px", textTransform: "capitalize" }}>{devPotential.level} development potential</div>
            <div style={{ fontSize: "12px", color: "var(--tx3)", lineHeight: 1.6, maxWidth: "480px" }}>{devPotential.description}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: "32px", fontWeight: 400, color: "var(--grn)", letterSpacing: "-.03em", lineHeight: 1 }}>+${(devPotential.upliftValue / 1000).toFixed(0)}k</div>
            <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>potential value uplift</div>
            <button style={{ marginTop: "14px", display: "inline-block", padding: "8px 16px", background: "var(--acc)", color: "#fff", border: "none", borderRadius: "7px", font: "600 11px/1 var(--sans)", cursor: "pointer" }}>Full report →</button>
          </div>
        </div>

        {/* Zoning + Options Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          {/* Zoning Summary */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Zoning Summary</h4>
            </div>
            <div style={{ padding: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {Object.entries(devPotential.zoningSummary).map(([key, value]) => (
                  <div key={key}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>{key.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pre-Application Options */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Pre-Application Options</h4>
            </div>
            <div style={{ padding: "18px" }}>
              {devPotential.options.map((option, idx) => (
                <div key={idx} style={{ marginBottom: idx < devPotential.options.length - 1 ? "12px" : 0 }}>
                  <div style={{ font: "500 11px var(--sans)", color: "var(--tx)", marginBottom: "3px" }}>{option.title}</div>
                  <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>{option.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .tag-ok {
          background: var(--grn-lt);
          color: var(--grn);
          border: 1px solid var(--grn-bdr);
        }
        .tag-warn {
          background: var(--amb-lt);
          color: var(--amb);
          border: 1px solid var(--amb-bdr);
        }
        .tag-danger {
          background: var(--red-lt);
          color: var(--red);
          border: 1px solid var(--red-bdr);
        }
      `}</style>
    </AppShell>
  );
}
