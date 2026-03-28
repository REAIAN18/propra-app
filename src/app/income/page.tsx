"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { AdditionalIncomeOpp } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useIncomeOpportunities } from "@/hooks/useIncomeOpportunities";
import { useNav } from "@/components/layout/NavContext";
import type { AssetIncomeOpportunities } from "@/app/api/user/income-opportunities/route";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

const typeIcons: Record<string, ReactNode> = {
  "5g_mast": (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 20V13M4 3H18M7.5 7H14.5M11 13L6.5 5M11 13L15.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="13" r="1.5" fill="currentColor" />
    </svg>
  ),
  "ev_charging": (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M12 2L6 12H11L10 20L16 10H11L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "solar": (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 2V4M11 18V20M2 11H4M18 11H20M5.22 5.22L6.64 6.64M15.36 15.36L16.78 16.78M16.78 5.22L15.36 6.64M6.64 15.36L5.22 16.78" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "parking": (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 16V6H12.5C14.433 6 16 7.567 16 9.5C16 11.433 14.433 13 12.5 13H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "billboard": (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="3" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 19H14M11 15V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const typeLabels: Record<string, string> = {
  "5g_mast": "5G Mast",
  "ev_charging": "EV Charging",
  "solar": "Solar",
  "parking": "Parking",
  "billboard": "Billboard",
};

const statusConfig = {
  identified: { label: "Identified", variant: "gray" as const },
  in_progress: { label: "In Progress", variant: "blue" as const },
  live: { label: "Live", variant: "green" as const },
};

// Post income activation to persist in DB and notify RealHQ ops
async function postIncomeActivation(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch("/api/user/income-opportunities/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // network error — silent, UI state already set
  }
}

// ── Real-user view ─────────────────────────────────────────────────────────

function RealUserIncomeView() {
  const { assets, loading } = useIncomeOpportunities();
  const [activating, setActivating] = useState<Record<string, boolean>>({});
  const [scanRequested, setScanRequested] = useState(false);

  // Load existing activations to persist "Requested ✓" state on reload
  useEffect(() => {
    fetch("/api/user/income-opportunities/activations")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.activations) return;
        const activated: Record<string, boolean> = {};
        for (const act of data.activations as { assetId: string | null; opportunityType: string }[]) {
          if (act.assetId && act.opportunityType !== "scan") {
            activated[`${act.assetId}-${act.opportunityType}`] = true;
          }
        }
        if (Object.keys(activated).length > 0) {
          setActivating(prev => ({ ...prev, ...activated }));
        }
        if (data.activations.some((a: { opportunityType: string }) => a.opportunityType === "scan")) {
          setScanRequested(true);
        }
      })
      .catch(() => {});
  }, []);

  const allOpps = assets.flatMap((a) =>
    a.opportunities.map((o) => ({ ...o, assetName: a.assetName, assetLocation: a.location }))
  );
  const totalIdentified = allOpps.reduce((s, o) => s + o.annualIncome, 0);

  return (
    <AppShell>
      <TopBar title="Additional Income" />
      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title="Additional Income"
            cells={[
              { label: "Total Indicative", value: `£${fmt(totalIdentified, "")} /yr`, valueColor: "var(--grn)", sub: `${allOpps.length} opportunities across portfolio` },
              { label: "Assets Scanned", value: `${assets.length}`, sub: "Properties assessed" },
              { label: "Activation Model", value: "0 capex", sub: "RealHQ installs & manages" },
              { label: "Status", value: allOpps.length > 0 ? "Active" : "Scanning", valueColor: "var(--grn)", sub: allOpps.length > 0 ? "Opportunities identified" : "Awaiting assessment" },
            ]}
          />
        )}

        {/* Disclaimer */}
        {!loading && (
          <div className="rounded-xl px-5 py-3.5" style={{ backgroundColor: "var(--amb-lt)", border: "1px solid var(--amb-bdr)" }}>
            <div className="text-xs" style={{ color: "var(--amb)" }}>
              <span style={{ fontWeight: 600 }}>Indicative opportunities</span> based on asset type. RealHQ surveys and confirms before activation.
            </div>
          </div>
        )}

        {/* Issue / Cost / Action */}
        {!loading && allOpps.length > 0 && (
          <div className="rounded-xl px-5 py-3.5" style={{ backgroundColor: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }}>
            <div className="text-xs" style={{ color: "var(--tx2)" }}>
              {allOpps.length} income {allOpps.length === 1 ? "stream" : "streams"} not yet activated —{" "}
              <span style={{ color: "var(--grn)", fontWeight: 600 }}>£{fmt(totalIdentified, "")}/yr</span> sitting idle across your portfolio.
              RealHQ handles landlord consent, install coordination, and licensing. Zero capex from you.
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && (
          <DirectCallout
            title="RealHQ activates every income stream — zero capex from you"
            body="RealHQ handles landlord consent, install coordination, and licensing for solar, EV, and 5G. These are indicative opportunities based on your asset types — RealHQ will survey and confirm before anything is activated."
          />
        )}

        {/* Assets with opportunities */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : assets.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="mx-auto mb-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--grn-lt)" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C7.24 2 5 4.24 5 7C5 8.74 5.87 10.27 7.2 11.2C7.7 11.56 8 12.1 8 12.68V14H12V12.68C12 12.1 12.3 11.56 12.8 11.2C14.13 10.27 15 8.74 15 7C15 4.24 12.76 2 10 2Z" stroke="var(--grn)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 14H12M9 17H11" stroke="var(--grn)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-base font-semibold mb-2" style={{ color: "var(--tx)" }}>No properties added yet</div>
            <div className="text-sm mb-4" style={{ color: "var(--tx3)" }}>Add your properties to see indicative income opportunities — solar, EV charging, 5G masts, and more.</div>
            <Link
              href="/properties/add"
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "var(--grn)", color: "#fff" }}
            >
              Add a Property
            </Link>
          </div>
        ) : (
          <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <SectionHeader
                title="Opportunities by Asset"
                subtitle={`£${fmt(totalIdentified, "")}/yr indicative · RealHQ surveys before activation`}
              />
            </div>
            <div>
              {assets.map((asset, assetIdx) => {
                const assetTotal = asset.opportunities.reduce((s, o) => s + o.annualIncome, 0);
                return (
                  <div key={asset.assetId} style={{ borderBottom: assetIdx < assets.length - 1 ? "1px solid var(--bdr)" : undefined }}>
                    <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--s2)" }}>
                      <div>
                        <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{asset.assetName}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--tx3)" }}>{asset.location}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>£{fmt(assetTotal, "")}/yr</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
                      {asset.opportunities.map((opp) => {
                        const activationKey = `${asset.assetId}-${opp.type}`;
                        const isActivating = activating[activationKey];
                        return (
                          <div key={opp.id} className="flex items-start justify-between px-5 py-3 gap-3 transition-colors hover:bg-[var(--s2)]">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="shrink-0 w-5 h-5 flex items-center justify-center mt-0.5" style={{ color: "var(--grn)" }}>{typeIcons[opp.type]}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>{opp.label}</div>
                                <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>{opp.note}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <div className="text-sm font-bold" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>£{fmt(opp.annualIncome, "")}/yr</div>
                                <div className="text-xs" style={{ color: "var(--tx3)" }}>indicative</div>
                              </div>
                              <button
                                onClick={async () => {
                                  setActivating(prev => ({ ...prev, [activationKey]: true }));
                                  await postIncomeActivation({
                                    opportunityType: opp.type,
                                    assetId: asset.assetId,
                                    opportunityLabel: opp.label,
                                    annualIncome: opp.annualIncome,
                                  });
                                }}
                                disabled={isActivating}
                                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                                style={{ backgroundColor: isActivating ? "var(--tx3)" : "var(--grn)", color: "#fff" }}
                              >
                                {isActivating ? "Requested ✓" : "Activate"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--bdr)", backgroundColor: "var(--s2)" }}>
              <span className="text-xs" style={{ color: "var(--tx3)" }}>Total indicative — RealHQ confirms before activation</span>
              <span className="text-base font-bold" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>£{fmt(totalIdentified, "")}/yr</span>
            </div>
          </div>
        )}

        {/* Empty-state fallback for no opps but assets exist */}
        {!loading && assets.length > 0 && allOpps.length === 0 && (
          <div className="rounded-xl p-10 text-center" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="text-base font-semibold mb-2" style={{ color: "var(--tx)" }}>No opportunities identified</div>
            <div className="text-sm mb-4" style={{ color: "var(--tx3)" }}>RealHQ will scan your assets for income opportunities.</div>
            <button
              onClick={async () => {
                setScanRequested(true);
                await postIncomeActivation({ opportunityType: "scan", assetId: null });
              }}
              disabled={scanRequested}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: "var(--grn)", color: "#fff" }}
            >
              {scanRequested ? "Scan requested ✓" : "Request Asset Scan"}
            </button>
          </div>
        )}
      </main>
    </AppShell>
  );
}

// ── Demo portfolio view ────────────────────────────────────────────────────

export default function IncomePage() {
  const { portfolioId } = useNav();

  if (portfolioId === "user") {
    return <RealUserIncomeView />;
  }

  return <DemoIncomeView portfolioId={portfolioId} />;
}

function DemoIncomeView({ portfolioId }: { portfolioId: string }) {
  const [activating, setActivating] = useState<Record<string, boolean>>({});
  const [scanRequested, setScanRequested] = useState(false);
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const allOpps = portfolio.assets.flatMap((a) =>
    a.additionalIncomeOpportunities.map((o) => ({ ...o, assetName: a.name, assetLocation: a.location }))
  );

  const totalIdentified = allOpps.reduce((s, o) => s + o.annualIncome, 0);
  const totalWeighted = allOpps.reduce((s, o) => s + (o.annualIncome * o.probability) / 100, 0);
  const liveCount = allOpps.filter((o) => o.status === "live").length;
  const inProgressCount = allOpps.filter((o) => o.status === "in_progress").length;

  const byType = allOpps.reduce((acc, o) => {
    if (!acc[o.type]) acc[o.type] = [];
    acc[o.type].push(o);
    return acc;
  }, {} as Record<string, typeof allOpps>);

  const typeOrder: AdditionalIncomeOpp["type"][] = ["solar", "ev_charging", "5g_mast", "parking", "billboard"];

  const assetsWithOpps = portfolio.assets.filter(a => a.additionalIncomeOpportunities.length > 0);

  return (
    <AppShell>
      <TopBar title="Additional Income" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading || customLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title="Additional Income"
            cells={[
              { label: "Total Identified", value: `${fmt(totalIdentified, sym)}/yr`, valueColor: "var(--grn)", sub: `${allOpps.length} opportunities across portfolio` },
              { label: "Expected Income", value: `${fmt(totalWeighted, sym)}/yr`, sub: "Probability-weighted annual value" },
              { label: "Active / Live", value: `${liveCount + inProgressCount}`, valueColor: liveCount + inProgressCount > 0 ? "var(--grn)" : "var(--amb)", sub: `${liveCount} live · ${inProgressCount} in progress` },
              { label: "Zero Capex", value: "0", sub: "RealHQ installs & manages" },
            ]}
          />
        )}

        {/* Issue / Cost / Action */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }}
          >
            <div className="text-xs" style={{ color: "var(--tx2)" }}>
              {allOpps.filter(o => o.status === "identified").length} of {allOpps.length} income {allOpps.length === 1 ? "opportunity" : "opportunities"} not yet activated —{" "}
              <span style={{ color: "var(--grn)", fontWeight: 600 }}>{fmt(totalIdentified, sym)}/yr</span> sitting idle across the portfolio.
              RealHQ installs, licenses, and manages every income stream. Zero capex from you.
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && (
          <DirectCallout
            title="RealHQ activates every income stream — zero capex from you"
            body={`RealHQ handles landlord consent, install coordination, and licensing for solar, EV, 5G, and parking. ${allOpps.filter(o => o.status === "identified").length} ${allOpps.filter(o => o.status === "identified").length === 1 ? "opportunity" : "opportunities"} identified — RealHQ manages the full activation process.`}
          />
        )}

        {/* Type Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[0,1,2,3,4].map(i => <CardSkeleton key={i} rows={2} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {typeOrder.map((type) => {
              const opps = byType[type] || [];
              if (opps.length === 0) return null;
              const total = opps.reduce((s, o) => s + o.annualIncome, 0);
              const liveOrProgress = opps.filter(o => o.status !== "identified").length;
              return (
                <div key={type} className="rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                  <div className="mb-2 w-6 h-6 flex items-center justify-center" style={{ color: "var(--grn)" }}>{typeIcons[type]}</div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--tx)" }}>{typeLabels[type]}</div>
                  <div className="text-lg font-bold mb-1" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(total, sym)}/yr</div>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>{opps.length} {opps.length === 1 ? "asset" : "assets"}</div>
                  {liveOrProgress > 0 && (
                    <div className="mt-2">
                      <Badge variant="blue">{liveOrProgress} active</Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Opportunities by Asset */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : assetsWithOpps.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="mx-auto mb-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--grn-lt)" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C7.24 2 5 4.24 5 7C5 8.74 5.87 10.27 7.2 11.2C7.7 11.56 8 12.1 8 12.68V14H12V12.68C12 12.1 12.3 11.56 12.8 11.2C14.13 10.27 15 8.74 15 7C15 4.24 12.76 2 10 2Z" stroke="var(--grn)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 14H12M9 17H11" stroke="var(--grn)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-base font-semibold mb-2" style={{ color: "var(--tx)" }}>No opportunities identified yet</div>
            <div className="text-sm mb-4" style={{ color: "var(--tx3)" }}>RealHQ will scan your assets for income opportunities — solar, EV charging, 5G masts, and more.</div>
            <button
              onClick={async () => {
                setScanRequested(true);
                await postIncomeActivation({ opportunityType: "scan", assetId: null });
              }}
              disabled={scanRequested}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--grn)", color: "#fff" }}
            >
              {scanRequested ? "Scan requested ✓" : "Request Asset Scan"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <SectionHeader title="Opportunities by Asset" subtitle={`${fmt(totalIdentified, sym)}/yr total · ${fmt(totalWeighted, sym)}/yr probability-weighted`} />
            </div>
            <div>
              {assetsWithOpps.map((asset, assetIdx) => {
                const assetTotal = asset.additionalIncomeOpportunities.reduce((s, o) => s + o.annualIncome, 0);
                return (
                  <div key={asset.id} style={{ borderBottom: assetIdx < assetsWithOpps.length - 1 ? "1px solid var(--bdr)" : undefined }}>
                    <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--s2)" }}>
                      <div>
                        <Link href={`/assets/${asset.id}`} className="text-sm font-semibold hover:underline underline-offset-2" style={{ color: "var(--tx)" }}>{asset.name}</Link>
                        <span className="text-xs ml-2" style={{ color: "var(--tx3)" }}>{asset.location}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(assetTotal, sym)}/yr</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
                      {asset.additionalIncomeOpportunities.map((opp) => {
                        const isActivating = activating[opp.id];
                        const currentStatus = isActivating ? "in_progress" : opp.status;
                        const cfg = statusConfig[currentStatus];
                        return (
                          <div key={opp.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--s2)]">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="shrink-0 w-5 h-5 flex items-center justify-center" style={{ color: "var(--grn)" }}>{typeIcons[opp.type]}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>{opp.label}</div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs" style={{ color: "var(--tx3)" }}>{opp.probability}% probability</span>
                                  <span className="text-xs" style={{ color: "var(--bdr)" }}>·</span>
                                  <span className="text-xs" style={{ color: "var(--tx3)" }}>{fmt(Math.round(opp.annualIncome * opp.probability / 100), sym)} weighted</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <div className="text-right">
                                <div className="text-sm font-bold" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(opp.annualIncome, sym)}/yr</div>
                              </div>
                              <Badge variant={cfg.variant}>{cfg.label}</Badge>
                              {currentStatus === "identified" && (
                                <button
                                  onClick={async () => {
                                    setActivating(prev => ({ ...prev, [opp.id]: true }));
                                    await postIncomeActivation({
                                      opportunityType: opp.type,
                                      assetName: asset.name,
                                      assetLocation: asset.location,
                                      opportunityLabel: opp.label,
                                      annualIncome: opp.annualIncome,
                                      probability: opp.probability,
                                    });
                                  }}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                                  style={{ backgroundColor: "var(--grn)", color: "#fff" }}
                                >
                                  Activate
                                </button>
                              )}
                              {currentStatus === "in_progress" && (
                                <Link href="/requests" className="text-xs hidden sm:inline" style={{ color: "var(--acc)" }}>Track →</Link>
                              )}
                              {currentStatus === "live" && (
                                <span className="text-xs hidden sm:inline" style={{ color: "var(--grn)" }}>Earning live ✓</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--bdr)", backgroundColor: "var(--s2)" }}>
              <span className="text-xs" style={{ color: "var(--tx3)" }}>Total new income when all live</span>
              <span className="text-base font-bold" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(totalIdentified, sym)}/yr</span>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
