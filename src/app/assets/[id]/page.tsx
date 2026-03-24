"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";

// --- Types ---

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
  epcFetched: boolean;
  marketCapRate: number | null;
  marketRentSqft: number | null;
  satelliteUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  siteCoveragePct: number | null;
  avmLow: number | null;
  avmHigh: number | null;
  pdRights: string | null;
  pdRightsDetail: string | null;
  changeOfUsePotential: string | null;
  changeOfUseDetail: string | null;
  airRightsPotential: string | null;
  airRightsDetail: string | null;
  planningHistory: unknown | null;
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

interface HoldSellScenario {
  assetId: string;
  dataNeeded: boolean;
  holdIRR: number | null;
  sellIRR: number | null;
  sellPrice: number | null;
  recommendation: "hold" | "sell" | "review" | null;
  rationale: string | null;
}

// --- Helpers ---

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function daysLabel(days: number | null) {
  if (days === null) return null;
  if (days < 0) return "Expired";
  if (days < 90) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}

const holdSellConfig = {
  hold: { label: "Hold", color: "#0A8A4C", variant: "green" as const },
  sell: { label: "Sell", color: "#F5A94A", variant: "amber" as const },
  review: { label: "Review", color: "#1647E8", variant: "blue" as const },
};

const leaseStatusBg: Record<string, { bg: string; color: string; label: string }> = {
  active:        { bg: "#F0FDF4", color: "#0A8A4C", label: "Active" },
  expiring_soon: { bg: "#FFFBEB", color: "#D97706", label: "Expiring" },
  expired:       { bg: "#FEF2F2", color: "#D93025", label: "Expired" },
  vacant:        { bg: "#F3F4F6", color: "#6B7280", label: "Vacant" },
};

// --- Sub-components ---

function StatCell({
  label, value, sub, valueColor,
}: {
  label: string; value: string; sub?: string; valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: "#9CA3AF" }}>{label}</div>
      <div
        className="text-base font-bold leading-tight truncate"
        style={{
          color: valueColor ?? "#111827",
          fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
        }}
      >
        {value}
      </div>
      {sub && <div className="text-[10px]" style={{ color: "#9CA3AF" }}>{sub}</div>}
    </div>
  );
}

function OpportunityRow({
  rank, title, detail, saving, sym, href,
}: {
  rank: number; title: string; detail: string; saving: number | null; sym: string; href?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: "1px solid #F3F4F6" }}
    >
      <div
        className="flex-none w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ backgroundColor: "#FFFBEB", color: "#D97706" }}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: "#111827" }}>{title}</div>
        <div className="text-xs" style={{ color: "#6B7280" }}>{detail}</div>
      </div>
      {saving !== null && (
        <div
          className="flex-none text-sm font-semibold"
          style={{
            color: "#0A8A4C",
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
          }}
        >
          {fmt(saving, sym)}/yr
        </div>
      )}
      {href && (
        <Link
          href={href}
          className="flex-none text-xs font-medium px-2.5 py-1 rounded-md hover:opacity-80"
          style={{ backgroundColor: "#F5A94A", color: "#fff" }}
        >
          Act →
        </Link>
      )}
    </div>
  );
}

// --- Page ---

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<UserAsset | null>(null);
  const [scenario, setScenario] = useState<HoldSellScenario | null>(null);
  const [avm, setAvm] = useState<AvmData | null>(null);
  const [avmLoading, setAvmLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [sellEnquiryDone, setSellEnquiryDone] = useState(false);
  const [sellEnquiryLoading, setSellEnquiryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
        const [assetRes, hsRes, tenantsRes] = await Promise.all([
          fetch(`/api/user/assets/${id}`),
          fetch("/api/user/hold-sell-scenarios"),
          fetch("/api/user/tenants"),
        ]);

        if (assetRes.status === 404 || assetRes.status === 403) { setNotFound(true); setLoading(false); return; }
        if (!assetRes.ok) { setNotFound(true); setLoading(false); return; }

        const { asset: a } = await assetRes.json();
        setAsset(a);
        loadAvm();

        if (hsRes.ok) {
          const { scenarios } = await hsRes.json();
          const match = (scenarios as HoldSellScenario[]).find(s => s.assetId === id);
          if (match) setScenario(match);
        }

        if (tenantsRes.ok) {
          const { tenants: all } = await tenantsRes.json();
          setTenants((all as TenantRow[]).filter(t => t.assetId === id));
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
          <div className="text-sm" style={{ color: "#9CA3AF" }}>Loading…</div>
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
            <div className="text-sm font-medium mb-2" style={{ color: "#111827" }}>Asset not found</div>
            <Link href="/dashboard" className="text-xs hover:opacity-70" style={{ color: "#9CA3AF" }}>
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const sym = asset.country === "US" ? "$" : "£";
  const isUK = asset.country !== "US";

  // --- Derived values ---
  const passing = asset.passingRent ?? asset.grossIncome ?? null;
  const erv = asset.marketERV ?? null;
  const ervUpliftPct = passing && erv && passing > 0 ? Math.round(((erv - passing) / passing) * 100) : null;
  const noiFigure = asset.netIncome ?? null;
  const capRateStr = asset.marketCapRate ? `${asset.marketCapRate.toFixed(2)}%` : null;

  // AVM value range (prefer live AVM, fallback to asset fields)
  const valueLow = avm?.avmLow ?? asset.avmLow ?? null;
  const valueHigh = avm?.avmHigh ?? asset.avmHigh ?? null;
  const valueRange = valueLow && valueHigh ? `${fmt(valueLow, sym)}–${fmt(valueHigh, sym)}` : avm?.avmValue ? fmt(avm.avmValue, sym) : "—";

  // Value at ERV (erv / capRate)
  const valueAtErv = erv && asset.marketCapRate
    ? erv / (asset.marketCapRate / 100)
    : null;

  // Insurance
  const insOverpay = asset.insurancePremium && asset.marketInsurance && asset.insurancePremium > asset.marketInsurance
    ? asset.insurancePremium - asset.marketInsurance : null;
  const energyOverpay = asset.energyCost && asset.marketEnergyCost && asset.energyCost > asset.marketEnergyCost
    ? asset.energyCost - asset.marketEnergyCost : null;

  // Rent uplift opportunity
  const rentUplift = passing && erv && erv > passing ? erv - passing : null;

  // Planning history count
  const planningCount = Array.isArray(asset.planningHistory) ? (asset.planningHistory as unknown[]).length : null;

  // Hold/Sell
  const hs = scenario && !scenario.dataNeeded ? scenario : null;
  const hsCfg = hs?.recommendation ? holdSellConfig[hs.recommendation] : null;

  // --- Opportunities (ranked) ---
  const opportunities: Array<{
    title: string; detail: string; saving: number | null; href?: string;
  }> = [];

  if (rentUplift && rentUplift > 0 && tenants.length > 0) {
    const tenantNames = tenants.slice(0, 2).map(t => t.tenant).join(", ");
    opportunities.push({
      title: "Rent Uplift to ERV",
      detail: `${tenantNames}${tenants.length > 2 ? ` +${tenants.length - 2} more` : ""} — passing rent below market ERV`,
      saving: rentUplift,
      href: "/tenants",
    });
  } else if (rentUplift && rentUplift > 0) {
    opportunities.push({
      title: "Rent Uplift to ERV",
      detail: "Passing rent below market ERV — review at next rent review",
      saving: rentUplift,
    });
  }

  if (insOverpay && insOverpay > 0) {
    opportunities.push({
      title: "Insurance Premium Reduction",
      detail: `Current premium ${Math.round((insOverpay / asset.insurancePremium!) * 100)}% above market rate — retender now`,
      saving: insOverpay,
      href: "/insurance",
    });
  }

  if (energyOverpay && energyOverpay > 0) {
    opportunities.push({
      title: "Energy Cost Reduction",
      detail: `Energy costs ${Math.round((energyOverpay / asset.energyCost!) * 100)}% above market benchmark`,
      saving: energyOverpay,
      href: "/energy",
    });
  }

  if (asset.occupancy !== null && asset.occupancy < 95 && asset.marketRentSqft && asset.sqft) {
    const voidSqft = Math.round(asset.sqft * (1 - asset.occupancy / 100));
    const voidIncome = voidSqft * asset.marketRentSqft;
    opportunities.push({
      title: "Void Suite Income",
      detail: `~${voidSqft.toLocaleString()} sqft vacant — ERV income potential at market rate`,
      saving: voidIncome,
    });
  }

  if (asset.pdRights && asset.pdRights !== "none") {
    opportunities.push({
      title: "Planning Upside",
      detail: `Permitted development rights: ${asset.pdRights}. Pre-application assessment recommended.`,
      saving: null,
      href: "/planning",
    });
  }

  // --- Render ---
  return (
    <AppShell>
      <TopBar title={asset.name} />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-5xl">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs" style={{ color: "#9CA3AF" }}>
            <Link href="/dashboard" className="hover:opacity-70">Dashboard</Link>
            <span>›</span>
            <span style={{ color: "#111827" }}>{asset.name}</span>
          </div>
          <Link
            href={`/assets/${id}/edit`}
            className="text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
            style={{ backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" }}
          >
            Edit property
          </Link>
        </div>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
        >
          {/* Map / Satellite area */}
          <div className="relative" style={{ height: 220, backgroundColor: asset.satelliteUrl ? "#173404" : "#173404" }}>
            {asset.satelliteUrl ? (
              <img
                src={asset.satelliteUrl}
                alt={`Satellite view of ${asset.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              /* Placeholder satellite grid pattern */
              <div
                className="absolute inset-0 grid opacity-30"
                style={{
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gridTemplateRows: "repeat(4, 1fr)",
                  gap: "1px",
                }}
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: ["#1a3a1a", "#2d4a2d", "#1a2a1a", "#3a5a3a", "#4a6a4a"][i % 5],
                    }}
                  />
                ))}
              </div>
            )}

            {/* Building outline (green border) */}
            {(asset.satelliteUrl || asset.latitude) && (
              <div
                className="absolute"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -55%)",
                  width: "180px",
                  height: "110px",
                  border: "2px solid rgba(74, 222, 128, 0.7)",
                  borderRadius: "3px",
                }}
              />
            )}

            {/* Top-left badge: Asset type + year */}
            <div
              className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {asset.assetType}
              {/* Year built not in schema, omit for now */}
            </div>

            {/* Top-right badge: Sqft */}
            {asset.sqft && (
              <div
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                {asset.sqft.toLocaleString()} sqft
              </div>
            )}

            {/* Bottom-left badge: Confirmation + address */}
            <div
              className="absolute bottom-3 left-3 px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "#fff",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "#4ADE80" }}
              />
              <span>
                Building confirmed · {asset.address ?? asset.location}
              </span>
            </div>
          </div>

          {/* 6-stat strip */}
          <div
            className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
            style={{ borderTop: "1px solid #E5E7EB" }}
          >
            <StatCell
              label="Est. Value Range"
              value={avmLoading && !valueLow ? "…" : valueRange}
              valueColor="#111827"
              sub={avm?.confidenceScore ? `${avm.confidenceScore}% confidence` : undefined}
            />
            <StatCell
              label="Passing Rent"
              value={passing ? `${fmt(passing, sym)}/yr` : "—"}
              valueColor={passing ? "#111827" : "#9CA3AF"}
              sub={asset.sqft && passing ? `${sym}${(passing / asset.sqft).toFixed(2)}/sf` : undefined}
            />
            <StatCell
              label="ERV + Uplift"
              value={erv ? `${fmt(erv, sym)}/yr` : "—"}
              valueColor={ervUpliftPct !== null && ervUpliftPct > 0 ? "#0A8A4C" : "#111827"}
              sub={ervUpliftPct !== null ? `+${ervUpliftPct}% uplift potential` : undefined}
            />
            <StatCell
              label="NOI + Cap Rate"
              value={noiFigure ? `${fmt(noiFigure, sym)}/yr` : "—"}
              valueColor={noiFigure ? "#111827" : "#9CA3AF"}
              sub={capRateStr ? `${capRateStr} cap rate` : undefined}
            />
            <StatCell
              label="Occupancy"
              value={asset.occupancy !== null ? `${asset.occupancy}%` : "—"}
              valueColor={
                asset.occupancy !== null
                  ? asset.occupancy >= 95 ? "#0A8A4C" : asset.occupancy >= 80 ? "#F5A94A" : "#D93025"
                  : "#9CA3AF"
              }
              sub={asset.occupancy !== null && asset.occupancy < 95 ? "Void flag" : asset.sqft ? `${asset.sqft.toLocaleString()} sqft` : undefined}
            />
            <StatCell
              label="Site Coverage"
              value={asset.siteCoveragePct !== null ? `${asset.siteCoveragePct}%` : "—"}
              valueColor={asset.siteCoveragePct !== null ? "#111827" : "#9CA3AF"}
              sub={asset.sqft ? `${asset.sqft.toLocaleString()} sqft GIA` : undefined}
            />
          </div>
        </div>

        {/* ── RENT ROLL ─────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <SectionHeader title="Rent Roll" subtitle="Active leases and tenants" />
            <Link href="/tenants" className="text-xs hover:opacity-70" style={{ color: "#9CA3AF" }}>
              Tenant Management →
            </Link>
          </div>

          {tenants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    {["Tenant", "Suite / Ref", "Sqft", "Passing/sf", "ERV/sf", "Expiry", "Break", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ color: "#6B7280" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => {
                    const st = leaseStatusBg[t.leaseStatus] ?? leaseStatusBg.active;
                    const alertExpiry = t.daysToExpiry !== null && t.daysToExpiry <= 180;
                    const alertBreak = t.breakDate && t.daysToExpiry !== null && t.daysToExpiry <= 180;
                    const marketPsf = asset.marketRentSqft;
                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: "1px solid #F3F4F6",
                          backgroundColor: alertExpiry ? "#FFFBEB" : undefined,
                        }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: "#111827" }}>{t.tenant}</td>
                        <td className="px-4 py-3" style={{ color: "#6B7280" }}>{t.leaseRef}</td>
                        <td className="px-4 py-3" style={{ color: "#111827" }}>{t.sqft.toLocaleString()}</td>
                        <td
                          className="px-4 py-3 font-medium"
                          style={{
                            color: marketPsf && t.rentPerSqft < marketPsf ? "#F5A94A" : "#111827",
                            fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                          }}
                        >
                          {t.rentPerSqft > 0 ? `${t.sym}${t.rentPerSqft.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#6B7280" }}>
                          {marketPsf ? `${t.sym}${marketPsf.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3" style={{ color: alertExpiry ? "#D97706" : "#6B7280" }}>
                          {fmtDate(t.expiryDate)}
                          {alertExpiry && t.daysToExpiry !== null && (
                            <span className="ml-1 text-[10px]" style={{ color: "#D97706" }}>
                              ({daysLabel(t.daysToExpiry)})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3" style={{ color: alertBreak ? "#D97706" : "#9CA3AF" }}>
                          {fmtDate(t.breakDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Alert strip */}
              {tenants.some(t => t.daysToExpiry !== null && t.daysToExpiry <= 180) && (
                <div
                  className="mx-5 my-3 px-4 py-2.5 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}
                >
                  <span className="text-xs font-medium" style={{ color: "#92400E" }}>
                    {tenants.filter(t => t.daysToExpiry !== null && t.daysToExpiry <= 180).length} lease
                    {tenants.filter(t => t.daysToExpiry !== null && t.daysToExpiry <= 180).length !== 1 ? "s" : ""} expiring within 6 months
                  </span>
                  <Link
                    href="/tenants"
                    className="text-xs font-medium px-2.5 py-1 rounded-md hover:opacity-80"
                    style={{ backgroundColor: "#F5A94A", color: "#fff" }}
                  >
                    Engage tenants →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-8 flex flex-col items-center gap-3">
              <div className="text-sm" style={{ color: "#9CA3AF" }}>No lease data uploaded yet</div>
              <Link
                href="/documents"
                className="text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80"
                style={{ backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" }}
              >
                Upload lease documents →
              </Link>
            </div>
          )}
        </div>

        {/* ── COST BENCHMARKS ───────────────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <SectionHeader title="Cost Benchmarks" subtitle="Insurance · Energy · OpEx vs market" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x" style={{ "--tw-divide-color": "#E5E7EB" } as React.CSSProperties}>

            {/* Insurance */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold" style={{ color: "#374151" }}>Insurance</div>
                <Link href={`/insurance?asset=${id}`} className="text-[10px] hover:opacity-70" style={{ color: "#9CA3AF" }}>View →</Link>
              </div>
              {asset.insurancePremium ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px]" style={{ color: "#9CA3AF" }}>Current</span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: insOverpay ? "#F5A94A" : "#111827",
                        fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {fmt(asset.insurancePremium, sym)}/yr
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px]" style={{ color: "#9CA3AF" }}>Market rate</span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: "#0A8A4C",
                        fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {asset.marketInsurance ? `${fmt(asset.marketInsurance, sym)}/yr` : "Benchmarking…"}
                    </span>
                  </div>
                  {insOverpay && insOverpay > 0 && (
                    <div
                      className="mt-2 pt-2 flex items-center justify-between"
                      style={{ borderTop: "1px solid #E5E7EB" }}
                    >
                      <span className="text-[10px] font-medium" style={{ color: "#F5A94A" }}>
                        Overpaying {fmt(insOverpay, sym)}/yr
                      </span>
                      <Link
                        href="/insurance"
                        className="text-[10px] font-medium px-2 py-0.5 rounded hover:opacity-80"
                        style={{ backgroundColor: "#F5A94A", color: "#fff" }}
                      >
                        Retender →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>No premium data uploaded</div>
                  <div
                    className="rounded-lg px-3 py-2 text-[10px]"
                    style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}
                  >
                    Typical range for this asset type: {sym}2,000–{sym}15,000/yr depending on rebuild value and policy structure
                  </div>
                  <Link href="/documents" className="text-[10px] hover:opacity-70" style={{ color: "#1647E8" }}>
                    Upload policy document →
                  </Link>
                </div>
              )}
            </div>

            {/* Energy */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold" style={{ color: "#374151" }}>Energy</div>
                <Link href={`/energy?asset=${id}`} className="text-[10px] hover:opacity-70" style={{ color: "#9CA3AF" }}>View →</Link>
              </div>
              {asset.energyCost ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px]" style={{ color: "#9CA3AF" }}>Current</span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: energyOverpay ? "#F5A94A" : "#111827",
                        fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {fmt(asset.energyCost, sym)}/yr
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px]" style={{ color: "#9CA3AF" }}>Benchmark</span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: "#0A8A4C",
                        fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {asset.marketEnergyCost ? `${fmt(asset.marketEnergyCost, sym)}/yr` : "Benchmarking…"}
                    </span>
                  </div>
                  {energyOverpay && energyOverpay > 0 && (
                    <div
                      className="mt-2 pt-2 flex items-center justify-between"
                      style={{ borderTop: "1px solid #E5E7EB" }}
                    >
                      <span className="text-[10px] font-medium" style={{ color: "#F5A94A" }}>
                        Overpaying {fmt(energyOverpay, sym)}/yr
                      </span>
                      <Link
                        href="/energy"
                        className="text-[10px] font-medium px-2 py-0.5 rounded hover:opacity-80"
                        style={{ backgroundColor: "#1647E8", color: "#fff" }}
                      >
                        Optimise →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>No energy data uploaded</div>
                  <div
                    className="rounded-lg px-3 py-2 text-[10px]"
                    style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}
                  >
                    {isUK ? "Typical industrial/commercial range: £3–£12/sqft/yr depending on EPC rating and metering" : "Typical commercial range: $2–$8/sqft/yr depending on HVAC and metering"}
                  </div>
                  <Link href="/documents" className="text-[10px] hover:opacity-70" style={{ color: "#1647E8" }}>
                    Upload energy bills →
                  </Link>
                </div>
              )}
            </div>

            {/* OpEx */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold" style={{ color: "#374151" }}>Operating Costs</div>
                {isUK && <span className="text-[10px]" style={{ color: "#9CA3AF" }}>EPC {asset.epcRating ?? "?"}</span>}
              </div>
              {(asset.insurancePremium || asset.energyCost) ? (
                <div className="space-y-2">
                  {asset.insurancePremium && asset.energyCost && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>Total OpEx (ins + energy)</span>
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: "#111827",
                          fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                        }}
                      >
                        {fmt(asset.insurancePremium + asset.energyCost, sym)}/yr
                      </span>
                    </div>
                  )}
                  {passing && (asset.insurancePremium || asset.energyCost) && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>As % of passing rent</span>
                      <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                        {Math.round(((asset.insurancePremium ?? 0) + (asset.energyCost ?? 0)) / passing * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>Upload insurance and energy data to benchmark OpEx</div>
                  <div
                    className="rounded-lg px-3 py-2 text-[10px]"
                    style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}
                  >
                    Typical commercial OpEx: 15–30% of passing rent for well-managed assets
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── OPPORTUNITIES ─────────────────────────────────────────────────── */}
        {opportunities.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="flex items-center justify-between mb-1">
              <SectionHeader title="Opportunities" subtitle="Ranked by recoverable value" />
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#FFFBEB", color: "#D97706" }}
              >
                {opportunities.length} identified
              </span>
            </div>
            <div className="mt-2">
              {opportunities.map((opp, i) => (
                <OpportunityRow
                  key={i}
                  rank={i + 1}
                  title={opp.title}
                  detail={opp.detail}
                  saving={opp.saving}
                  sym={sym}
                  href={opp.href}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── PLANNING ──────────────────────────────────────────────────────── */}
        {(asset.pdRights || asset.changeOfUsePotential || asset.airRightsPotential || asset.siteCoveragePct !== null || planningCount !== null) && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid #E5E7EB" }}
            >
              <SectionHeader title="Planning Intelligence" subtitle="Development potential and permitted rights" />
              <Link href="/planning" className="text-xs hover:opacity-70" style={{ color: "#9CA3AF" }}>
                Full report →
              </Link>
            </div>
            <div className="px-5 py-4 space-y-3">

              {/* Metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {asset.siteCoveragePct !== null && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB" }}>
                    <div className="text-[10px] mb-1" style={{ color: "#9CA3AF" }}>Site Coverage</div>
                    <div
                      className="text-base font-bold"
                      style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                    >
                      {asset.siteCoveragePct}%
                    </div>
                  </div>
                )}
                {planningCount !== null && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB" }}>
                    <div className="text-[10px] mb-1" style={{ color: "#9CA3AF" }}>Planning History</div>
                    <div
                      className="text-base font-bold"
                      style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                    >
                      {planningCount}
                    </div>
                    <div className="text-[10px]" style={{ color: "#9CA3AF" }}>applications</div>
                  </div>
                )}
                {asset.pdRights && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB" }}>
                    <div className="text-[10px] mb-1" style={{ color: "#9CA3AF" }}>PDR Status</div>
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: asset.pdRights === "full" ? "#F0FDF4" : asset.pdRights === "partial" ? "#FFFBEB" : "#F3F4F6",
                          color: asset.pdRights === "full" ? "#0A8A4C" : asset.pdRights === "partial" ? "#D97706" : "#6B7280",
                        }}
                      >
                        {asset.pdRights}
                      </span>
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>— to verify</span>
                    </div>
                  </div>
                )}
                {asset.changeOfUsePotential && asset.changeOfUsePotential !== "none" && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB" }}>
                    <div className="text-[10px] mb-1" style={{ color: "#9CA3AF" }}>Change of Use</div>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: asset.changeOfUsePotential === "high" ? "#F0FDF4" : "#FFFBEB",
                        color: asset.changeOfUsePotential === "high" ? "#0A8A4C" : "#D97706",
                      }}
                    >
                      {asset.changeOfUsePotential}
                    </span>
                  </div>
                )}
              </div>

              {/* Detail text */}
              {(asset.pdRightsDetail || asset.changeOfUseDetail) && (
                <div className="text-xs" style={{ color: "#6B7280" }}>
                  {asset.pdRightsDetail ?? asset.changeOfUseDetail}
                </div>
              )}

              {/* Amber caveat */}
              <div
                className="rounded-lg px-4 py-3 flex items-start gap-2"
                style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-none">
                  <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="#D97706" strokeWidth="1.5" fill="none" />
                  <path d="M7 5.5V8" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7" cy="9.5" r="0.5" fill="#D97706" />
                </svg>
                <p className="text-[10px]" style={{ color: "#92400E" }}>
                  Planning intelligence is indicative only. RealHQ can commission a pre-application assessment to confirm development potential before any application.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── HOLD VS SELL ──────────────────────────────────────────────────── */}
        {hs && hsCfg ? (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Hold vs Sell" subtitle="IRR analysis and recommendation" />
              <Badge variant={hsCfg.variant}>{hsCfg.label}</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB" }}>
                <div className="text-[10px] mb-0.5" style={{ color: "#9CA3AF" }}>Hold IRR</div>
                <div className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                  {hs.holdIRR}%
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB" }}>
                <div className="text-[10px] mb-0.5" style={{ color: "#9CA3AF" }}>Sell IRR</div>
                <div className="text-lg font-bold" style={{ color: hsCfg.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                  {hs.sellIRR}%
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB" }}>
                <div className="text-[10px] mb-0.5" style={{ color: "#9CA3AF" }}>Exit Value</div>
                <div className="text-lg font-bold" style={{ color: hsCfg.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                  {hs.sellPrice ? fmt(hs.sellPrice, sym) : "—"}
                </div>
              </div>
              {valueAtErv && (
                <div className="rounded-lg p-3" style={{ backgroundColor: "#F0FDF4" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "#9CA3AF" }}>Value at ERV</div>
                  <div className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                    {fmt(valueAtErv, sym)}
                  </div>
                  <div className="text-[10px]" style={{ color: "#9CA3AF" }}>if fully reversionary</div>
                </div>
              )}
            </div>

            {/* Market cap rate context */}
            {asset.marketCapRate && (
              <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: "#6B7280" }}>
                <span>Market cap rate: <strong style={{ color: "#111827" }}>{asset.marketCapRate.toFixed(2)}%</strong></span>
                {capRateStr && <span>·</span>}
                {valueLow && valueHigh && (
                  <span>Est. value range: <strong style={{ color: "#111827" }}>{fmt(valueLow, sym)}–{fmt(valueHigh, sym)}</strong></span>
                )}
              </div>
            )}

            <div className="rounded-lg p-3 text-xs mb-3" style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}>
              {hs.rationale}
            </div>
            <div className="flex items-center justify-between">
              <Link href="/hold-sell" className="text-xs font-medium" style={{ color: hsCfg.color }}>
                Full portfolio analysis →
              </Link>
              {hs.recommendation === "sell" && (
                <button
                  onClick={async () => {
                    if (sellEnquiryDone || sellEnquiryLoading) return;
                    setSellEnquiryLoading(true);
                    try {
                      await fetch(`/api/user/assets/${id}/sell-enquiry`, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ targetPrice: hs.sellPrice }),
                      });
                      setSellEnquiryDone(true);
                    } catch { /* non-fatal */ } finally { setSellEnquiryLoading(false); }
                  }}
                  disabled={sellEnquiryDone || sellEnquiryLoading}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: "#FFF7ED", color: "#F5A94A", border: "1px solid #FED7AA" }}
                >
                  {sellEnquiryDone ? "Enquiry registered" : sellEnquiryLoading ? "Registering…" : "Register sell interest →"}
                </button>
              )}
            </div>
          </div>
        ) : scenario?.dataNeeded ? (
          <div className="rounded-xl p-5" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <SectionHeader title="Hold vs Sell" subtitle="Data needed" />
            <div className="mt-3 text-xs" style={{ color: "#9CA3AF" }}>
              Add gross income and net income to generate a hold/sell scenario.
            </div>
          </div>
        ) : null}

        {/* ── DOCUMENTS + ACTIVITY ──────────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <SectionHeader title="Documents & Activity" subtitle="Uploaded files and RealHQ actions" />
            <Link href="/documents" className="text-xs hover:opacity-70" style={{ color: "#9CA3AF" }}>
              All documents →
            </Link>
          </div>
          <div className="px-5 py-4 space-y-3">

            {/* Missing doc prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "Lease / Rent Roll", icon: "📋", uploaded: tenants.length > 0, href: "/documents" },
                { label: "Insurance Policy", icon: "🛡️", uploaded: !!asset.insurancePremium, href: "/documents" },
                { label: "Energy Bills", icon: "⚡", uploaded: !!asset.energyCost, href: "/documents" },
              ].map(doc => (
                <div
                  key={doc.label}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                  style={{
                    border: doc.uploaded ? "1px solid #E5E7EB" : "1.5px dashed #D1D5DB",
                    backgroundColor: doc.uploaded ? "#F9FAFB" : "#FAFAFA",
                  }}
                >
                  <span className="text-base">{doc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: doc.uploaded ? "#374151" : "#9CA3AF" }}>
                      {doc.label}
                    </div>
                    <div className="text-[10px]" style={{ color: doc.uploaded ? "#0A8A4C" : "#9CA3AF" }}>
                      {doc.uploaded ? "Uploaded" : "Not uploaded"}
                    </div>
                  </div>
                  {!doc.uploaded && (
                    <Link
                      href={doc.href}
                      className="text-[10px] font-medium px-2 py-0.5 rounded hover:opacity-80"
                      style={{ backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" }}
                    >
                      Upload
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Activity log */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#9CA3AF" }}>Activity</div>
              <div className="space-y-1.5">
                {avm?.valuedAt && (
                  <div className="flex items-start gap-2.5">
                    <div
                      className="mt-1 w-1.5 h-1.5 rounded-full flex-none"
                      style={{ backgroundColor: "#1647E8" }}
                    />
                    <div className="text-[10px]" style={{ color: "#6B7280" }}>
                      <span className="font-medium" style={{ color: "#374151" }}>AVM computed</span>
                      {" · "}
                      {avm.avmValue ? fmt(avm.avmValue, sym) : "—"}
                      {" · "}
                      {new Date(avm.valuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                )}
                {tenants.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <div
                      className="mt-1 w-1.5 h-1.5 rounded-full flex-none"
                      style={{ backgroundColor: "#0A8A4C" }}
                    />
                    <div className="text-[10px]" style={{ color: "#6B7280" }}>
                      <span className="font-medium" style={{ color: "#374151" }}>Lease data extracted</span>
                      {" · "}
                      {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} materialised
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <div
                    className="mt-1 w-1.5 h-1.5 rounded-full flex-none"
                    style={{ backgroundColor: "#9CA3AF" }}
                  />
                  <div className="text-[10px]" style={{ color: "#6B7280" }}>
                    <span className="font-medium" style={{ color: "#374151" }}>Property added</span>
                    {" · "}
                    {new Date(asset.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </AppShell>
  );
}
