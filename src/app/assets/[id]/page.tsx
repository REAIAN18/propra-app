"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";

// ── Types ────────────────────────────────────────────────────────────────────

interface UserAsset {
  id: string;
  name: string;
  assetType: string;
  location: string;
  address: string | null;
  postcode: string | null;
  country: string | null;
  sqft: number | null;
  grossIncome: number | null;
  netIncome: number | null;
  passingRent: number | null;
  marketERV: number | null;
  insurancePremium: number | null;
  marketInsurance: number | null;
  energyCost: number | null;
  marketEnergyCost: number | null;
  occupancy: number | null;
  epcRating: string | null;
  marketCapRate: number | null;
  satelliteUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  avmLow: number | null;
  avmHigh: number | null;
  avmValue: number | null;
  createdAt: string;
}

interface AvmData {
  avmValue: number | null;
  avmLow: number | null;
  avmHigh: number | null;
  confidenceScore: number;
  method: string;
  capRateUsed: number | null;
  compsUsed: number;
  valuedAt: string;
  changePct: number | null;
  currency: string;
}

interface TenantRow {
  id: string;
  leaseRef: string;
  tenant: string;
  assetId: string;
  sqft: number;
  rentPerSqft: number;
  annualRent: number;
  expiryDate: string | null;
  breakDate: string | null;
  reviewDate: string | null;
  daysToExpiry: number | null;
  leaseStatus: string;
  covenantGrade: string;
  revertPotential: number | null;
  currency: string;
  sym: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysLabel(days: number | null) {
  if (days === null) return null;
  if (days < 0) return "Expired";
  if (days < 90) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<UserAsset | null>(null);
  const [avm, setAvm] = useState<AvmData | null>(null);
  const [avmLoading, setAvmLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [planningData, setPlanningData] = useState<any[]>([]);
  const [planningView, setPlanningView] = useState<"list" | "map">("map");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  async function loadAvm(refresh = false) {
    if (!id) return;
    setAvmLoading(true);
    try {
      const res = await fetch(`/api/user/assets/${id}/valuation${refresh ? "?refresh=true" : ""}`);
      if (res.ok) setAvm(await res.json() as AvmData);
    } catch { /* non-fatal */ } finally {
      setAvmLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [assetRes, tenantsRes] = await Promise.all([
          fetch(`/api/user/assets/${id}`),
          fetch("/api/user/tenants"),
        ]);

        if (assetRes.status === 404 || assetRes.status === 403) { setNotFound(true); setLoading(false); return; }
        if (!assetRes.ok) { setNotFound(true); setLoading(false); return; }

        const { asset: a } = await assetRes.json();
        setAsset(a);
        loadAvm();

        if (tenantsRes.ok) {
          const { tenants: all } = await tenantsRes.json();
          setTenants((all as TenantRow[]).filter(t => t.assetId === id));
        }

        // Load planning data
        const planningRes = await fetch("/api/user/planning");
        if (planningRes.ok) {
          const { assets: planningAssets } = await planningRes.json();
          const assetPlanning = planningAssets.find((pa: any) => pa.assetId === id);
          setPlanningData(assetPlanning?.planningHistory ?? []);
        }
      } catch { setNotFound(true); } finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Asset" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-sm" style={{ color: "var(--tx3)" }}>Loading…</div>
        </main>
      </AppShell>
    );
  }

  if (notFound || !asset) {
    return (
      <AppShell>
        <TopBar title="Asset" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>Asset not found</div>
            <Link href="/dashboard" className="text-xs hover:opacity-70" style={{ color: "var(--tx3)" }}>
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const sym = asset.country === "US" ? "$" : "£";
  const isUK = asset.country !== "US";

  // Derived values
  const passing = asset.passingRent ?? asset.grossIncome ?? null;
  const erv = asset.marketERV ?? null;
  const ervUplift = passing && erv && passing > 0 ? Math.round(((erv - passing) / passing) * 100) : null;
  const valueLow = avm?.avmLow ?? asset.avmLow ?? null;
  const valueHigh = avm?.avmHigh ?? asset.avmHigh ?? null;
  const valueRange = valueLow && valueHigh ? `${fmt(valueLow, sym)}–${fmt(valueHigh, sym)}` : avm?.avmValue ? fmt(avm.avmValue, sym) : "—";
  const capRate = asset.marketCapRate ?? (passing && avm?.avmValue ? (passing / avm.avmValue) * 100 : null);

  // Opportunities
  const insOverpay = asset.insurancePremium && asset.marketInsurance && asset.insurancePremium > asset.marketInsurance
    ? asset.insurancePremium - asset.marketInsurance : null;
  const energyOverpay = asset.energyCost && asset.marketEnergyCost && asset.energyCost > asset.marketEnergyCost
    ? asset.energyCost - asset.marketEnergyCost : null;
  const rentUplift = passing && erv && erv > passing ? erv - passing : null;

  const opportunities: Array<{ icon: string; title: string; desc: string; value: number | null }> = [];
  if (rentUplift && rentUplift > 0) {
    opportunities.push({
      icon: "💰",
      title: `Rent review ${ervUplift ? `— market supports ${ervUplift}% uplift` : "due"}`,
      desc: `ERV ${erv && asset.sqft ? fmt(erv / asset.sqft, sym) : "—"}/sqft vs passing ${passing && asset.sqft ? fmt(passing / asset.sqft, sym) : "—"}/sqft = ${fmt(rentUplift, sym)} headroom.`,
      value: rentUplift,
    });
  }
  if (energyOverpay && energyOverpay > 0) {
    opportunities.push({
      icon: "⚡",
      title: "Energy optimisation",
      desc: "Tariff optimisation and consumption reduction identified.",
      value: energyOverpay,
    });
  }
  if (insOverpay && insOverpay > 0) {
    opportunities.push({
      icon: "🛡️",
      title: "Insurance retender",
      desc: "Current premium above market benchmark.",
      value: insOverpay,
    });
  }

  return (
    <AppShell>
      <TopBar title={asset.name} />

      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--bg)", padding: "18px" }}>

        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tx3)" }}>
            <Link href="/dashboard" className="hover:opacity-70">Dashboard</Link>
            <span>›</span>
            <span style={{ color: "var(--tx)" }}>{asset.name}</span>
          </div>
          <Link
            href={`/assets/${id}/edit`}
            className="text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80"
            style={{ backgroundColor: "var(--s1)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}
          >
            Edit property
          </Link>
        </div>

        {/* ── HERO ── dark green, satellite on right, 4-KPI grid */}
        <div
          className="rounded-2xl p-6 mb-3 flex gap-5"
          style={{ backgroundColor: "#173404" }}
        >
          {/* Left */}
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em" }}>
              {asset.assetType} · {isUK ? "UK" : "US"}
            </p>
            <h2 className="text-xl font-medium text-white mb-1">{asset.name}</h2>
            <p className="text-[13px] mb-3" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
              {asset.address ?? asset.location}
              {asset.sqft && ` · ${asset.sqft.toLocaleString()} sqft`}
              {asset.epcRating && ` · EPC ${asset.epcRating}`}
            </p>

            {/* 4-KPI grid */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[9px] uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>AVM value</div>
                <div className="text-base font-medium text-white">{valueRange}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {avm?.compsUsed ? `${avm.compsUsed} comps` : "Land Registry + comps"}
                </div>
              </div>
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[9px] uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>Passing rent</div>
                <div className="text-base font-medium text-white">{passing ? `${fmt(passing, sym)}/yr` : "—"}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {passing && asset.sqft ? `${sym}${(passing / asset.sqft).toFixed(2)}/sqft` : "—"}
                </div>
              </div>
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[9px] uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>Market ERV</div>
                <div className="text-base font-medium text-white">
                  {erv && asset.sqft ? `${sym}${(erv / asset.sqft).toFixed(2)}/sqft` : "—"}
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {rentUplift ? `${fmt(rentUplift, sym)} reversion` : "—"}
                </div>
              </div>
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[9px] uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>Gross yield</div>
                <div className="text-base font-medium text-white">{capRate ? `${capRate.toFixed(1)}%` : "—"}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  vs {asset.marketCapRate ? `${asset.marketCapRate.toFixed(1)}%` : "—"} market
                </div>
              </div>
            </div>
          </div>

          {/* Right — Satellite view */}
          <div
            className="w-[200px] h-[150px] rounded-xl flex-shrink-0 relative overflow-hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            {asset.satelliteUrl ? (
              <img src={asset.satelliteUrl} alt="Satellite" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                Satellite loading…
              </div>
            )}
            <div
              className="absolute bottom-1.5 left-1.5 text-[9px] text-white px-2 py-1 rounded"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              Satellite · zoom 19 · OSM polygon
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div
          className="flex gap-0.5 p-1 rounded-xl mb-3"
          style={{ backgroundColor: "var(--s1)", border: "0.5px solid var(--bdr)" }}
        >
          {["overview", "tenants", "opportunities", "planning", "energy", "insurance", "documents"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                backgroundColor: activeTab === tab ? "var(--s2)" : "transparent",
                color: activeTab === tab ? "var(--tx)" : "var(--tx3)",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-2.5">
            {/* Valuation Summary */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "0.5px solid var(--bdr)" }}>
              <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ borderBottom: "0.5px solid var(--s2)" }}
              >
                <p className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Valuation Summary</p>
                <button
                  onClick={() => loadAvm(true)}
                  disabled={avmLoading}
                  className="px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--grn)", color: "var(--tx)" }}
                >
                  {avmLoading ? "Updating…" : "Update AVM →"}
                </button>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: "0.5px solid var(--bdr-lt)" }}>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>AVM valuation</div>
                  <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    {valueRange}
                    {avm && <Badge variant="green">Updated {Math.floor((Date.now() - new Date(avm.valuedAt).getTime()) / 86400000)}d ago</Badge>}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: "0.5px solid var(--bdr-lt)" }}>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>Purchase price</div>
                  <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    —
                  </div>
                </div>
                <div className="flex justify-between items-center py-2.5" style={{ borderBottom: "0.5px solid var(--bdr-lt)" }}>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>Unrealised gain</div>
                  <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    {avm && avm.changePct !== null && avm.changePct !== undefined
                      ? `${avm.changePct >= 0 ? "+" : ""}${avm.changePct.toFixed(1)}%`
                      : "—"}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>Land Registry comparables</div>
                  <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    {avm?.compsUsed ?? 0} found
                  </div>
                </div>
              </div>
            </div>

            {/* Opportunities */}
            {opportunities.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "0.5px solid var(--bdr)" }}>
                <div
                  className="px-5 py-3.5"
                  style={{ borderBottom: "0.5px solid var(--s2)" }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>
                    Opportunities · {fmt(opportunities.reduce((s, o) => s + (o.value ?? 0), 0), sym)} total identified
                  </p>
                </div>
                <div className="px-5 py-4 space-y-2">
                  {opportunities.map((opp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: "var(--bdr-lt)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ backgroundColor: "var(--s1)" }}
                      >
                        {opp.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium mb-0.5" style={{ color: "var(--tx)" }}>{opp.title}</div>
                        <div className="text-[11px]" style={{ color: "var(--tx3)" }}>{opp.desc}</div>
                      </div>
                      <div className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--tx)" }}>
                        {opp.value ? `+${fmt(opp.value, sym)}/yr` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TENANTS TAB */}
        {activeTab === "tenants" && (
          <div className="space-y-3.5">
            {tenants.length > 0 ? (
              <>
                {/* KPIs */}
                {(() => {
                  const grossRent = tenants.reduce((sum, t) => sum + t.annualRent, 0);
                  const topTenant = tenants.reduce((max, t) => t.annualRent > max.annualRent ? t : max, tenants[0]);
                  const concentration = grossRent > 0 ? Math.round((topTenant.annualRent / grossRent) * 100) : 0;
                  const wault = tenants.length > 0
                    ? tenants.reduce((sum, t) => sum + ((t.daysToExpiry ?? 0) * t.annualRent), 0) / (grossRent * 365)
                    : 0;
                  const upcomingEvents = [
                    ...tenants.filter(t => t.reviewDate && new Date(t.reviewDate) < new Date(Date.now() + 365 * 86400000)),
                    ...tenants.filter(t => t.breakDate && new Date(t.breakDate) < new Date(Date.now() + 365 * 86400000)),
                    ...tenants.filter(t => t.expiryDate && new Date(t.expiryDate) < new Date(Date.now() + 365 * 86400000))
                  ].length;

                  return (
                    <div
                      className="grid gap-[1px] rounded-[10px] overflow-hidden"
                      style={{ backgroundColor: "var(--bdr)", border: "1px solid var(--bdr)", gridTemplateColumns: "repeat(6, 1fr)" }}
                    >
                      <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Tenants</div>
                        <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{tenants.length}</div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>+ {asset.sqft && tenants.length > 0 ? Math.max(0, Math.floor((asset.sqft - tenants.reduce((s, t) => s + t.sqft, 0)) / 1000)) : 0} vacant units</div>
                      </div>
                      <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Gross Rent</div>
                        <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{fmt(grossRent, sym)}<small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: 400 }}>/yr</small></div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--grn)" }}>100% of occupied let</span></div>
                      </div>
                      <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Collection</div>
                        <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>100%</div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--grn)" }}>All current</span></div>
                      </div>
                      <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>WAULT</div>
                        <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{wault.toFixed(1)}<small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: 400 }}>yrs</small></div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>weighted avg unexpired</div>
                      </div>
                      <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Concentration</div>
                        <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{concentration}%</div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: concentration > 25 ? "var(--amb)" : "var(--tx3)" }}>top tenant = {topTenant.tenant.substring(0, 15)}</span></div>
                      </div>
                      <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Upcoming Events</div>
                        <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: upcomingEvents > 0 ? "var(--amb)" : "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{upcomingEvents}</div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: upcomingEvents > 0 ? "var(--amb)" : "var(--tx3)" }}>reviews · breaks · expiries</span></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Monthly Collection Summary */}
                <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                  <div className="px-[18px] py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bdr)" }}>
                    <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>This Month&apos;s Rent</h4>
                    <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>
                      {fmt(tenants.reduce((s, t) => s + t.annualRent / 12, 0), sym)} / {fmt(tenants.reduce((s, t) => s + t.annualRent / 12, 0), sym)} due
                    </span>
                  </div>
                  {tenants.map((t, i) => (
                    <div
                      key={t.id}
                      className="px-[18px] py-[11px] cursor-pointer transition-all hover:brightness-110 grid items-center gap-3"
                      style={{
                        gridTemplateColumns: "auto 1fr auto auto auto",
                        borderBottom: i < tenants.length - 1 ? "1px solid rgba(37,37,51,0.3)" : "none"
                      }}
                    >
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, backgroundColor: "var(--grn)" }} />
                      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{t.tenant}</div>
                      <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>{fmt(t.annualRent / 12, sym)}/mo</span>
                      <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: "0.3px", whiteSpace: "nowrap", backgroundColor: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" }}>PAID</span>
                      <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
                    </div>
                  ))}
                </div>

                {/* Upcoming Events */}
                {(() => {
                  const today = new Date();
                  const next12mo = new Date(today.getTime() + 365 * 86400000);
                  const events = [
                    ...tenants.filter(t => t.reviewDate && new Date(t.reviewDate) < next12mo).map(t => ({ type: "REVIEW", tenant: t, date: new Date(t.reviewDate!), color: "var(--amb)" })),
                    ...tenants.filter(t => t.breakDate && new Date(t.breakDate) < next12mo).map(t => ({ type: "BREAK", tenant: t, date: new Date(t.breakDate!), color: "var(--red)" })),
                    ...tenants.filter(t => t.expiryDate && new Date(t.expiryDate) < next12mo).map(t => ({ type: "EXPIRY", tenant: t, date: new Date(t.expiryDate!), color: "var(--tx3)" }))
                  ].sort((a, b) => a.date.getTime() - b.date.getTime());

                  return events.length > 0 ? (
                    <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                      <div className="px-[18px] py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bdr)" }}>
                        <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Upcoming Events — Next 12 Months</h4>
                        <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>View rent clock →</span>
                      </div>
                      {events.slice(0, 5).map((evt, i) => (
                        <div
                          key={i}
                          className="px-[18px] py-[11px] cursor-pointer transition-all hover:brightness-110 grid items-center gap-3"
                          style={{
                            gridTemplateColumns: "1fr auto auto auto auto",
                            borderBottom: i < Math.min(events.length, 5) - 1 ? "1px solid rgba(37,37,51,0.3)" : "none"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>
                              {evt.type === "REVIEW" ? "Rent Review" : evt.type === "BREAK" ? "Break Clause" : "Lease Expiry"} — {evt.tenant.tenant}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                              {evt.type === "REVIEW" ? `Current: ${fmt(evt.tenant.annualRent / 12, sym)}/mo` : evt.type === "BREAK" ? `Risk: ${fmt(evt.tenant.annualRent / 12, sym)}/mo` : `Lease ending`}
                            </div>
                          </div>
                          <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: "0.3px", whiteSpace: "nowrap", backgroundColor: evt.type === "BREAK" ? "var(--red-lt)" : evt.type === "REVIEW" ? "var(--amb-lt)" : "rgba(31,31,40,1)", color: evt.color, border: `1px solid ${evt.type === "BREAK" ? "var(--red-bdr)" : evt.type === "REVIEW" ? "var(--amb-bdr)" : "var(--bdr)"}` }}>
                            {evt.date.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}
                          </span>
                          <span style={{ font: "500 11px/1 var(--mono)", color: evt.type === "BREAK" ? "var(--red)" : "var(--tx2)" }}>
                            {evt.type === "BREAK" ? `−${fmt(evt.tenant.annualRent / 12, sym)}/mo risk` : evt.type === "REVIEW" ? `Review due` : `${fmt(evt.tenant.annualRent / 12, sym)}/mo`}
                          </span>
                          <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: "0.3px", whiteSpace: "nowrap", backgroundColor: evt.type === "REVIEW" ? "var(--acc-lt)" : evt.type === "BREAK" ? "var(--red-lt)" : "rgba(31,31,40,1)", color: evt.type === "REVIEW" ? "var(--acc)" : evt.color, border: `1px solid ${evt.type === "REVIEW" ? "var(--acc-bdr)" : evt.type === "BREAK" ? "var(--red-bdr)" : "var(--bdr)"}` }}>
                            {evt.type}
                          </span>
                          <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* Tenant Schedule */}
                <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                  <div className="px-[18px] py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bdr)" }}>
                    <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>All Tenants</h4>
                    <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>View lease schedule →</span>
                  </div>
                  {tenants.map((t, i) => {
                    const covenantVariant = t.covenantGrade === "strong" ? { bg: "var(--grn-lt)", color: "var(--grn)", border: "var(--grn-bdr)", label: "A+" }
                      : t.covenantGrade === "satisfactory" ? { bg: "var(--amb-lt)", color: "var(--amb)", border: "var(--amb-bdr)", label: "B+" }
                      : t.covenantGrade === "weak" ? { bg: "var(--red-lt)", color: "var(--red)", border: "var(--red-bdr)", label: "C" }
                      : { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)", label: "?" };

                    return (
                      <div
                        key={t.id}
                        className="px-[18px] py-[11px] cursor-pointer transition-all hover:brightness-110 grid items-center gap-3"
                        style={{
                          gridTemplateColumns: "1fr auto auto auto auto auto",
                          borderBottom: i < tenants.length - 1 ? "1px solid rgba(37,37,51,0.3)" : "none"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{t.tenant}</div>
                          <div style={{ fontSize: "11px", color: "var(--tx3)" }}>{t.sqft.toLocaleString()} sq ft · Since {new Date().getFullYear() - Math.floor((t.daysToExpiry ?? 0) / 365) - 5}</div>
                        </div>
                        <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>{fmt(t.annualRent / 12, sym)}/mo</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "100px", font: "600 9px/1 var(--mono)", letterSpacing: "0.3px", backgroundColor: covenantVariant.bg, color: covenantVariant.color, border: `1px solid ${covenantVariant.border}` }}>
                          {covenantVariant.label}
                        </span>
                        <span style={{ font: "400 10px var(--sans)", color: t.expiryDate && new Date(t.expiryDate) < new Date(Date.now() + 365 * 86400000) ? "var(--amb)" : "var(--tx3)" }}>
                          Exp: {t.expiryDate ? new Date(t.expiryDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                        </span>
                        <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: "0.3px", whiteSpace: "nowrap", backgroundColor: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" }}>ON TIME</span>
                        <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                <div className="text-sm mb-3" style={{ color: "var(--tx3)" }}>No lease data uploaded yet</div>
                <Link
                  href="/documents"
                  className="inline-block text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90"
                  style={{ backgroundColor: "var(--acc)", color: "var(--tx)" }}
                >
                  Upload lease documents →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* PLANNING TAB */}
        {activeTab === "planning" && (
          <div className="space-y-3.5">
            {/* KPIs */}
            {(() => {
              const totalApps = planningData.length;
              const negative = planningData.filter(app => app.impact === "threat").length;
              const positive = planningData.filter(app => app.impact === "opportunity").length;
              const devPotential = "Medium"; // Placeholder
              const devUplift = 420000; // Placeholder

              return (
                <div
                  className="grid gap-[1px] rounded-[10px] overflow-hidden"
                  style={{ backgroundColor: "var(--bdr)", border: "1px solid var(--bdr)", gridTemplateColumns: "repeat(5, 1fr)" }}
                >
                  <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Applications</div>
                    <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{totalApps}</div>
                    <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>within 1 mile · last 12mo</div>
                  </div>
                  <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Negative</div>
                    <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--red)", letterSpacing: "-0.02em", lineHeight: 1 }}>{negative}</div>
                    <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--red)" }}>{negative > 0 ? `${negative} could impact value` : "none identified"}</span></div>
                  </div>
                  <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Positive</div>
                    <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-0.02em", lineHeight: 1 }}>{positive}</div>
                    <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--grn)" }}>{positive > 0 ? "neighbourhood improving" : "none identified"}</span></div>
                  </div>
                  <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Dev Potential</div>
                    <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--acc)", letterSpacing: "-0.02em", lineHeight: 1 }}>{devPotential}</div>
                    <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>+{fmt(devUplift, sym)} potential uplift</div>
                  </div>
                  <div className="px-4 py-3.5 cursor-pointer transition-all hover:brightness-110" style={{ backgroundColor: "var(--s1)" }}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Monitoring</div>
                    <div style={{ fontFamily: "var(--serif, 'DM Serif Display', Georgia, serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-0.02em", lineHeight: 1 }}>Active</div>
                    <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>Checked weekly</div>
                  </div>
                </div>
              );
            })()}

            {/* View Toggle and Section Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px" }}>Nearby Applications</div>
              <div style={{ display: "flex", gap: 0, border: "1px solid var(--bdr)", borderRadius: "7px", overflow: "hidden" }}>
                <button
                  onClick={() => setPlanningView("list")}
                  style={{
                    padding: "6px 14px",
                    font: "500 10px var(--sans)",
                    color: planningView === "list" ? "var(--acc)" : "var(--tx3)",
                    background: planningView === "list" ? "var(--acc-lt)" : "var(--s1)",
                    cursor: "pointer",
                    border: "none",
                    borderRight: "1px solid var(--bdr)",
                    transition: "all .12s"
                  }}
                >
                  List
                </button>
                <button
                  onClick={() => setPlanningView("map")}
                  style={{
                    padding: "6px 14px",
                    font: "500 10px var(--sans)",
                    color: planningView === "map" ? "var(--acc)" : "var(--tx3)",
                    background: planningView === "map" ? "var(--acc-lt)" : "var(--s1)",
                    cursor: "pointer",
                    border: "none",
                    transition: "all .12s"
                  }}
                >
                  Map
                </button>
              </div>
            </div>

            {/* Map View */}
            {planningView === "map" && (
              <div style={{
                background: "var(--s2)",
                border: "1px solid var(--bdr)",
                borderRadius: "10px",
                height: "320px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden"
              }}>
                {/* Distance rings */}
                <div style={{ position: "absolute", border: "1px dashed var(--bdr)", borderRadius: "50%", width: "120px", height: "120px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                <div style={{ position: "absolute", border: "1px dashed var(--bdr)", borderRadius: "50%", width: "220px", height: "220px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                <div style={{ position: "absolute", border: "1px dashed var(--bdr)", borderRadius: "50%", width: "340px", height: "340px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

                {/* Your property pin */}
                <div style={{
                  position: "absolute",
                  top: "45%",
                  left: "48%",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  background: "var(--acc)",
                  color: "var(--tx)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2,
                  border: "2px solid var(--bg)",
                  fontSize: "14px",
                  fontWeight: 700
                }}>
                  <span style={{ transform: "rotate(45deg)" }}>★</span>
                </div>

                {/* Sample application pins */}
                {planningData.slice(0, 5).map((app, idx) => {
                  const positions = [
                    { top: "32%", left: "42%" },
                    { top: "55%", left: "62%" },
                    { top: "38%", left: "58%" },
                    { top: "62%", left: "40%" },
                    { top: "28%", left: "54%" }
                  ];
                  const pos = positions[idx] || { top: "50%", left: "50%" };
                  const bgColor = app.impact === "threat" ? "var(--red)" : app.impact === "opportunity" ? "var(--grn)" : "var(--amb)";
                  const symbol = app.impact === "threat" ? "−" : app.impact === "opportunity" ? "+" : "·";

                  return (
                    <div
                      key={app.id}
                      style={{
                        position: "absolute",
                        top: pos.top,
                        left: pos.left,
                        width: "24px",
                        height: "24px",
                        borderRadius: "50% 50% 50% 0",
                        transform: "rotate(-45deg)",
                        background: bgColor,
                        color: "var(--tx)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: 700
                      }}
                      title={app.description}
                    >
                      <span style={{ transform: "rotate(45deg)" }}>{symbol}</span>
                    </div>
                  );
                })}

                {/* Legend */}
                <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", gap: "10px", font: "400 9px var(--sans)", color: "var(--tx3)" }}>
                  <span><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--acc)", marginRight: "3px" }} />Your property</span>
                  <span><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--grn)", marginRight: "3px" }} />Positive</span>
                  <span><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--amb)", marginRight: "3px" }} />Neutral</span>
                  <span><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--red)", marginRight: "3px" }} />Negative</span>
                </div>
                <div style={{ position: "absolute", bottom: "12px", right: "12px", font: "400 8px var(--mono)", color: "var(--tx3)" }}>Rings: 0.25mi · 0.5mi · 1mi</div>
                <div style={{ position: "absolute", top: "12px", right: "12px", font: "300 10px var(--sans)", color: "var(--tx3)" }}>Map view — Google Maps integration</div>
              </div>
            )}

            {/* Application List */}
            <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
              <div className="px-[18px] py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bdr)" }}>
                <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>All Applications — Last 12 Months</h4>
                <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>Filter by impact ↓</span>
              </div>

              {planningData.length === 0 ? (
                <div style={{ padding: "32px 18px", textAlign: "center", font: "300 12px var(--sans)", color: "var(--tx3)" }}>
                  No planning applications found within 1 mile
                </div>
              ) : (
                planningData.map((app, idx) => {
                  const impactColor = app.impact === "threat" ? "var(--red)" : app.impact === "opportunity" ? "var(--grn)" : "var(--amb)";
                  const impactLabel = app.impact === "threat" ? "NEGATIVE" : app.impact === "opportunity" ? "POSITIVE" : "NEUTRAL";
                  const impactBg = app.impact === "threat" ? "var(--red-lt)" : app.impact === "opportunity" ? "var(--grn-lt)" : "var(--amb-lt)";
                  const impactBdr = app.impact === "threat" ? "var(--red-bdr)" : app.impact === "opportunity" ? "var(--grn-bdr)" : "var(--amb-bdr)";
                  const isExpanded = expandedApp === app.id;

                  return (
                    <div key={app.id}>
                      <div
                        onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                        className="px-[18px] py-[11px] cursor-pointer transition-all hover:brightness-110 grid items-center gap-3"
                        style={{
                          gridTemplateColumns: "1fr auto auto auto auto",
                          borderBottom: "1px solid rgba(37,37,51,0.3)",
                          borderLeft: `3px solid ${impactColor}`
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{app.description}</div>
                          <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                            {app.type} · {app.distanceFt ? `${(app.distanceFt / 5280).toFixed(1)}mi` : "—"} away · {app.submittedDate}
                          </div>
                        </div>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 10px",
                          borderRadius: "100px",
                          font: "600 9px/1 var(--mono)",
                          letterSpacing: "0.3px",
                          textTransform: "uppercase",
                          background: impactBg,
                          color: impactColor,
                          border: `1px solid ${impactBdr}`
                        }}>
                          {impactLabel}
                        </span>
                        <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>
                          {app.distanceFt ? `${(app.distanceFt / 5280).toFixed(1)}mi` : "—"}
                        </span>
                        <span style={{
                          font: "500 9px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "5px",
                          letterSpacing: "0.3px",
                          whiteSpace: "nowrap",
                          backgroundColor: app.status.toLowerCase().includes("approve") ? "var(--grn-lt)" : app.status.toLowerCase().includes("reject") ? "var(--red-lt)" : "var(--amb-lt)",
                          color: app.status.toLowerCase().includes("approve") ? "var(--grn)" : app.status.toLowerCase().includes("reject") ? "var(--red)" : "var(--amb)",
                          border: app.status.toLowerCase().includes("approve") ? "1px solid var(--grn-bdr)" : app.status.toLowerCase().includes("reject") ? "1px solid var(--red-bdr)" : "1px solid var(--amb-bdr)"
                        }}>
                          {app.status.toUpperCase()}
                        </span>
                        <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
                      </div>

                      {/* AI Reasoning - Expanded */}
                      {isExpanded && app.notes && (
                        <div style={{
                          padding: "14px 18px",
                          background: "var(--s2)",
                          borderRadius: "0",
                          margin: "0 18px 18px",
                          font: "300 12px/1.7 var(--sans)",
                          color: "var(--tx2)",
                          borderBottom: "1px solid rgba(37,37,51,0.3)"
                        }}>
                          <div style={{
                            font: "500 8px/1 var(--mono)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "var(--acc-lt)",
                            color: "var(--acc)",
                            border: "1px solid var(--acc-bdr)",
                            marginBottom: "8px",
                            display: "inline-block"
                          }}>
                            AI CLASSIFICATION
                          </div>
                          <br />
                          <strong style={{ color: "var(--tx)", fontWeight: 500 }}>Classified as {impactLabel} because:</strong> {app.notes}
                          {app.impact === "threat" && (
                            <div style={{ marginTop: "8px" }}>
                              <a href="#" style={{ color: "var(--red)", font: "500 11px var(--sans)" }}>Draft objection letter →</a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Dev Potential Summary */}
            <div style={{
              background: "var(--s1)",
              border: "1px solid var(--acc-bdr)",
              borderRadius: "10px",
              padding: "22px 24px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "24px",
              alignItems: "center"
            }}>
              <div>
                <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Your Property</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "18px", fontWeight: 400, color: "var(--tx)", marginBottom: "3px" }}>Medium development potential</div>
                <div style={{ fontSize: "12px", color: "var(--tx3)", lineHeight: 1.6, maxWidth: "480px" }}>
                  Current zoning permits mixed-use up to 5 storeys. Options include: vertical extension (2 additional floors), rear lot conversion, or change of use to residential on upper floors.
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: "32px", fontWeight: 400, color: "var(--grn)", letterSpacing: "-0.03em", lineHeight: 1 }}>+{fmt(420000, sym)}</div>
                <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>potential value uplift</div>
                <div style={{ marginTop: "14px" }}>
                  <button style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    background: "var(--acc)",
                    color: "var(--tx)",
                    border: "none",
                    borderRadius: "7px",
                    font: "600 11px/1 var(--sans)",
                    cursor: "pointer"
                  }}>
                    Full report →
                  </button>
                </div>
              </div>
            </div>

            {/* Zoning Summary + Pre-Application Options */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                <div className="px-[18px] py-3.5" style={{ borderBottom: "1px solid var(--bdr)" }}>
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Zoning Summary</h4>
                </div>
                <div style={{ padding: "18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>Zone</div>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Mixed Use</div>
                    </div>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>Max Height</div>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>75 ft / 5 storeys</div>
                    </div>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>Max FAR</div>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>3.0 (current: 2.6)</div>
                    </div>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>Permitted Uses</div>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Office, Retail, Resi</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                <div className="px-[18px] py-3.5" style={{ borderBottom: "1px solid var(--bdr)" }}>
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Pre-Application Options</h4>
                </div>
                <div style={{ padding: "18px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ font: "500 11px var(--sans)", color: "var(--tx)", marginBottom: "3px" }}>Vertical extension (+2 floors)</div>
                    <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>Add office space. Est: +{fmt(420000, sym)} net.</div>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ font: "500 11px var(--sans)", color: "var(--tx)", marginBottom: "3px" }}>Rear lot conversion</div>
                    <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>Convert parking. Est: +{fmt(140000, sym)} net.</div>
                  </div>
                  <div>
                    <div style={{ font: "500 11px var(--sans)", color: "var(--tx)", marginBottom: "3px" }}>Change of use (resi)</div>
                    <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>Convert upper floors. Est: +{fmt(340000, sym)} net.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OTHER TABS — Placeholder */}
        {!["overview", "tenants", "planning"].includes(activeTab) && (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--s1)", border: "0.5px solid var(--bdr)" }}>
            <div className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </div>
            <div className="text-xs" style={{ color: "var(--tx3)" }}>Section under construction</div>
          </div>
        )}

      </main>
    </AppShell>
  );
}
