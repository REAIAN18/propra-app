"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PageHero } from "@/components/ui/PageHero";

// --- Types ---

interface UserAsset {
  id: string;
  name: string;
  assetType: string;
  location: string;
  address: string | null;
  sqft: number | null;
  grossIncome: number | null;
  netIncome: number | null;
  insurancePremium: number | null;
  marketInsurance: number | null;
  energyCost: number | null;
  marketEnergyCost: number | null;
  occupancy: number | null;
  epcRating: string | null;
  epcFetched: boolean;
  country: string | null;
  marketCapRate: number | null;
  createdAt: string;
}

interface HoldSellScenario {
  assetId: string;
  assetName: string;
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

const holdSellConfig = {
  hold: { label: "Hold", color: "#0A8A4C", variant: "green" as const },
  sell: { label: "Sell", color: "#F5A94A", variant: "amber" as const },
  review: { label: "Review", color: "#1647E8", variant: "blue" as const },
};

const EPC_COLORS: Record<string, string> = {
  A: "#0A8A4C",
  B: "#4CAF50",
  C: "#8BC34A",
  D: "#CDDC39",
  E: "#FFC107",
  F: "#FF9800",
  G: "#F44336",
};

function DataNeeded({ label, href }: { label: string; href?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm" style={{ color: "#9CA3AF" }}>
        {label}
      </span>
      {href ? (
        <Link
          href={href}
          className="text-xs px-2 py-0.5 rounded-md hover:opacity-80"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          Add data →
        </Link>
      ) : (
        <span
          className="text-xs px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          Data needed
        </span>
      )}
    </div>
  );
}

// --- Page ---

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<UserAsset | null>(null);
  const [scenario, setScenario] = useState<HoldSellScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [assetRes, hsRes] = await Promise.all([
          fetch(`/api/user/assets/${id}`),
          fetch("/api/user/hold-sell-scenarios"),
        ]);

        if (assetRes.status === 404 || assetRes.status === 403) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!assetRes.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const { asset: a } = await assetRes.json();
        setAsset(a);

        if (hsRes.ok) {
          const { scenarios } = await hsRes.json();
          const match = (scenarios as HoldSellScenario[]).find(
            (s) => s.assetId === id
          );
          if (match) setScenario(match);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Asset" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-sm" style={{ color: "#9CA3AF" }}>
            Loading…
          </div>
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
            <div
              className="text-sm font-medium mb-2"
              style={{ color: "#111827" }}
            >
              Asset not found
            </div>
            <Link
              href="/dashboard"
              className="text-xs hover:opacity-70"
              style={{ color: "#9CA3AF" }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const sym = asset.country === "US" ? "$" : "£";
  const isUK = asset.country !== "US";

  // Financials
  const hasIncome = asset.grossIncome && asset.netIncome;
  const g2n =
    hasIncome
      ? Math.round((asset.netIncome! / asset.grossIncome!) * 100)
      : null;

  const insOverpay =
    asset.insurancePremium && asset.marketInsurance
      ? asset.insurancePremium - asset.marketInsurance
      : null;
  const energyOverpay =
    asset.energyCost && asset.marketEnergyCost
      ? asset.energyCost - asset.marketEnergyCost
      : null;

  const totalOpportunity =
    (insOverpay && insOverpay > 0 ? insOverpay : 0) +
    (energyOverpay && energyOverpay > 0 ? energyOverpay : 0);

  const hs = scenario && !scenario.dataNeeded ? scenario : null;
  const hsCfg = hs?.recommendation ? holdSellConfig[hs.recommendation] : null;

  // EPC
  const epcRating = asset.epcRating?.toUpperCase();
  const epcColor = epcRating ? EPC_COLORS[epcRating] ?? "#9CA3AF" : "#9CA3AF";

  // Hero cells
  const heroCells = [
    {
      label: "Net Income",
      value: asset.netIncome ? fmt(asset.netIncome, sym) : "—",
      valueColor: asset.netIncome ? undefined : "#9CA3AF",
      sub: asset.netIncome ? "Annual NOI" : "Data needed",
    },
    {
      label: "G2N Ratio",
      value: g2n !== null ? `${g2n}%` : "—",
      valueColor:
        g2n !== null ? (g2n >= 75 ? "#5BF0AC" : "#F5A94A") : "#9CA3AF",
      sub: g2n !== null ? `Gross ${fmt(asset.grossIncome!, sym)}` : "Data needed",
    },
    {
      label: "Occupancy",
      value: asset.occupancy !== null ? `${asset.occupancy}%` : "—",
      valueColor:
        asset.occupancy !== null
          ? asset.occupancy >= 90
            ? "#5BF0AC"
            : "#F5A94A"
          : "#9CA3AF",
      sub: asset.sqft ? `${asset.sqft.toLocaleString()} sqft` : "sqft unknown",
    },
    {
      label: "Hold / Sell",
      value: hs?.recommendation ? holdSellConfig[hs.recommendation].label : "—",
      valueColor: hsCfg?.color ?? "#6B7280",
      sub: hs
        ? `Hold ${hs.holdIRR}% · Exit ${hs.sellIRR}%`
        : "Analysis pending",
    },
  ];

  return (
    <AppShell>
      <TopBar title={asset.name} />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Breadcrumb + Edit button */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "#9CA3AF" }}
          >
            <Link href="/dashboard" className="hover:opacity-70">
              Dashboard
            </Link>
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

        {/* Page Hero */}
        <PageHero
          title={`${asset.name} — ${asset.assetType}`}
          subtitle={[
            asset.address ?? asset.location,
            asset.sqft ? `${asset.sqft.toLocaleString()} sqft` : null,
            asset.occupancy !== null ? `${asset.occupancy}% occupied` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          cells={heroCells}
        />

        {/* EPC Badge */}
        {isUK && (
          <div
            className="rounded-xl px-5 py-3.5 flex items-center gap-4"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                style={{
                  backgroundColor: epcRating ? epcColor : "#E5E7EB",
                  color: epcRating ? "#fff" : "#9CA3AF",
                }}
              >
                {epcRating ?? "?"}
              </div>
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ color: "#111827" }}
                >
                  EPC Rating
                </div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>
                  {epcRating
                    ? `Rated ${epcRating}`
                    : asset.epcFetched
                    ? "Not found in register"
                    : "EPC pending — checking register"}
                </div>
              </div>
            </div>
            {!epcRating && (
              <Link
                href="/energy"
                className="ml-auto text-xs hover:opacity-70"
                style={{ color: "#9CA3AF" }}
              >
                Energy →
              </Link>
            )}
          </div>
        )}

        {/* Issue / Cost / Action */}
        {totalOpportunity > 0 && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="text-xs" style={{ color: "#6B7280" }}>
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Issue:</span>{" "}
              {[
                insOverpay && insOverpay > 0
                  ? `insurance ${Math.round((insOverpay / asset.insurancePremium!) * 100)}% above market`
                  : null,
                energyOverpay && energyOverpay > 0
                  ? `energy ${Math.round((energyOverpay / asset.energyCost!) * 100)}% above market`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}{" "}
              ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>
                Opportunity:
              </span>{" "}
              <span style={{ color: "#F5A94A" }}>
                {fmt(totalOpportunity, sym)}/yr
              </span>{" "}
              recoverable — RealHQ retenders insurance and switches energy
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Insurance */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="Insurance" subtitle="" />
              <Link
                href={`/insurance?asset=${id}`}
                className="text-xs hover:opacity-70"
                style={{ color: "#9CA3AF" }}
              >
                View →
              </Link>
            </div>
            {asset.insurancePremium ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "#9CA3AF" }}
                    >
                      Current premium
                    </div>
                    <div
                      className="text-lg font-semibold"
                      style={{
                        color: "#F5A94A",
                        fontFamily:
                          "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {fmt(asset.insurancePremium, sym)}/yr
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 10H16M12 6L16 10L12 14"
                      stroke="#9CA3AF"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-right">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "#9CA3AF" }}
                    >
                      Market rate
                    </div>
                    <div
                      className="text-lg font-semibold"
                      style={{
                        color: "#0A8A4C",
                        fontFamily:
                          "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {asset.marketInsurance
                        ? `${fmt(asset.marketInsurance, sym)}/yr`
                        : "Benchmarking…"}
                    </div>
                  </div>
                </div>
                {insOverpay && insOverpay > 0 && (
                  <div
                    className="mt-3 pt-3 flex items-center justify-between"
                    style={{ borderTop: "1px solid #E5E7EB" }}
                  >
                    <span className="text-xs" style={{ color: "#F5A94A" }}>
                      Overpaying {fmt(insOverpay, sym)}/yr
                    </span>
                    <Link
                      href="/insurance"
                      className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                      style={{ backgroundColor: "#F5A94A", color: "#F9FAFB" }}
                    >
                      Retender →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <DataNeeded label="No insurance data yet" href="/insurance" />
            )}
          </div>

          {/* Energy */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="Energy" subtitle="" />
              <Link
                href={`/energy?asset=${id}`}
                className="text-xs hover:opacity-70"
                style={{ color: "#9CA3AF" }}
              >
                View →
              </Link>
            </div>
            {asset.energyCost ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "#9CA3AF" }}
                    >
                      Current cost
                    </div>
                    <div
                      className="text-lg font-semibold"
                      style={{
                        color: "#FF8080",
                        fontFamily:
                          "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {fmt(asset.energyCost, sym)}/yr
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 10H16M12 6L16 10L12 14"
                      stroke="#9CA3AF"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-right">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "#9CA3AF" }}
                    >
                      Market rate
                    </div>
                    <div
                      className="text-lg font-semibold"
                      style={{
                        color: "#0A8A4C",
                        fontFamily:
                          "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {asset.marketEnergyCost
                        ? `${fmt(asset.marketEnergyCost, sym)}/yr`
                        : "Benchmarking…"}
                    </div>
                  </div>
                </div>
                {energyOverpay && energyOverpay > 0 && (
                  <div
                    className="mt-3 pt-3 flex items-center justify-between"
                    style={{ borderTop: "1px solid #E5E7EB" }}
                  >
                    <span className="text-xs" style={{ color: "#F5A94A" }}>
                      Overpaying {fmt(energyOverpay, sym)}/yr
                    </span>
                    <Link
                      href="/energy"
                      className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                      style={{ backgroundColor: "#1647E8", color: "#fff" }}
                    >
                      Switch →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <DataNeeded label="No energy data yet" href="/energy" />
            )}
          </div>
        </div>

        {/* Income / Financials */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <SectionHeader title="Financials" subtitle="Income & metrics" />
            <Link
              href={`/rent-clock?asset=${id}`}
              className="text-xs hover:opacity-70"
              style={{ color: "#9CA3AF" }}
            >
              Rent Clock →
            </Link>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                Gross Income
              </div>
              {asset.grossIncome ? (
                <div
                  className="text-base font-bold"
                  style={{
                    color: "#111827",
                    fontFamily:
                      "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {fmt(asset.grossIncome, sym)}/yr
                </div>
              ) : (
                <span className="text-xs" style={{ color: "#9CA3AF" }}>
                  —
                </span>
              )}
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                Net Income
              </div>
              {asset.netIncome ? (
                <div
                  className="text-base font-bold"
                  style={{
                    color: "#0A8A4C",
                    fontFamily:
                      "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {fmt(asset.netIncome, sym)}/yr
                </div>
              ) : (
                <span className="text-xs" style={{ color: "#9CA3AF" }}>
                  —
                </span>
              )}
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                Occupancy
              </div>
              {asset.occupancy !== null ? (
                <div
                  className="text-base font-bold"
                  style={{
                    color: asset.occupancy >= 90 ? "#0A8A4C" : "#F5A94A",
                    fontFamily:
                      "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {asset.occupancy}%
                </div>
              ) : (
                <span className="text-xs" style={{ color: "#9CA3AF" }}>
                  —
                </span>
              )}
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                Floor Area
              </div>
              {asset.sqft ? (
                <div
                  className="text-base font-bold"
                  style={{
                    color: "#111827",
                    fontFamily:
                      "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {asset.sqft.toLocaleString()} sqft
                </div>
              ) : (
                <span className="text-xs" style={{ color: "#9CA3AF" }}>
                  —
                </span>
              )}
            </div>
          </div>
          {!hasIncome && (
            <div
              className="px-5 pb-4"
            >
              <div
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}
              >
                <span className="text-xs" style={{ color: "#92400E" }}>
                  Add income data to unlock hold/sell analysis and opportunity scores
                </span>
                <Link
                  href={`/assets/${id}/edit`}
                  className="text-xs font-medium ml-4 px-3 py-1.5 rounded-md hover:opacity-80 shrink-0"
                  style={{ backgroundColor: "#F5A94A", color: "#fff" }}
                >
                  Add data →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Hold / Sell */}
        {hs && hsCfg ? (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="flex items-center justify-between mb-3">
              <SectionHeader
                title="Hold / Sell Analysis"
                subtitle={`${hsCfg.label} recommendation`}
              />
              <Badge variant={hsCfg.variant}>{hsCfg.label}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div
                className="rounded-lg p-2.5"
                style={{ backgroundColor: "#F9FAFB" }}
              >
                <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                  Hold IRR
                </div>
                <div
                  className="text-lg font-bold"
                  style={{
                    color: "#0A8A4C",
                    fontFamily:
                      "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {hs.holdIRR}%
                </div>
              </div>
              <div
                className="rounded-lg p-2.5"
                style={{ backgroundColor: "#F9FAFB" }}
              >
                <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                  Sell IRR
                </div>
                <div
                  className="text-lg font-bold"
                  style={{
                    color: hsCfg.color,
                    fontFamily:
                      "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {hs.sellIRR}%
                </div>
              </div>
              <div
                className="rounded-lg p-2.5"
                style={{ backgroundColor: "#F9FAFB" }}
              >
                <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                  Exit value
                </div>
                <div
                  className="text-lg font-bold"
                  style={{
                    color: hsCfg.color,
                    fontFamily:
                      "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  }}
                >
                  {fmt(hs.sellPrice!, sym)}
                </div>
              </div>
            </div>
            <div
              className="rounded-lg p-3 text-xs mb-3"
              style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}
            >
              {hs.rationale}
            </div>
            <Link
              href="/hold-sell"
              className="text-xs font-medium"
              style={{ color: hsCfg.color }}
            >
              Full portfolio hold/sell analysis →
            </Link>
          </div>
        ) : scenario?.dataNeeded ? (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <SectionHeader
              title="Hold / Sell Analysis"
              subtitle="Data needed"
            />
            <div className="mt-3 text-xs" style={{ color: "#9CA3AF" }}>
              Add gross income and net income to generate a hold/sell scenario for
              this asset.
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
