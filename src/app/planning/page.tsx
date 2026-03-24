"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { flPlanningApplications, sePlanningApplications, type PlanningApplication } from "@/lib/data/planning";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";
import { usePlanningData } from "@/hooks/usePlanningData";
import type { PlanningEntry } from "@/app/api/user/planning/route";

const portfolioApplications: Record<string, PlanningApplication[]> = {
  "fl-mixed": flPlanningApplications,
  "se-logistics": sePlanningApplications,
};

function impactColor(impact: PlanningApplication["impact"] | PlanningEntry["impact"]) {
  if (impact === "threat") return "#DC2626";
  if (impact === "opportunity") return "#0A8A4C";
  return "#F5A94A";
}

function impactVariant(impact: PlanningApplication["impact"] | PlanningEntry["impact"]): "red" | "green" | "amber" {
  if (impact === "threat") return "red";
  if (impact === "opportunity") return "green";
  return "amber";
}

function statusVariant(status: string): "red" | "green" | "amber" | "blue" | "gray" {
  if (status === "Approved") return "green";
  if (status === "Refused") return "red";
  if (status === "Appeal") return "amber";
  if (status === "In Application") return "blue";
  return "gray";
}

function ImpactScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#DC2626" : score >= 6 ? "#F5A94A" : "#0A8A4C";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "#E5E7EB" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color, minWidth: 16 }}>{score}</span>
    </div>
  );
}

const holdSellLabel: Record<string, string> = {
  sell: "Consider Sell",
  hold: "Strengthens Hold",
  monitor: "Monitor",
};

const holdSellColor: Record<string, string> = {
  sell: "#DC2626",
  hold: "#0A8A4C",
  monitor: "#F5A94A",
};

// ── Dev potential helpers ──────────────────────────────────────────────────

interface DevPotentialData {
  id: string;
  name: string;
  assetType: string | null;
  siteCoveragePct: number | null;
  pdRights: string | null;
  pdRightsDetail: string | null;
  changeOfUsePotential: string | null;
  changeOfUseDetail: string | null;
  airRightsPotential: string | null;
  airRightsDetail: string | null;
  devPotentialAssessedAt: string | null;
}

function ratingPill(value: string | null) {
  if (!value) return null;
  const v = value.toLowerCase();
  let bg = "#F3F4F6";
  let color = "#9CA3AF";
  let label = value;
  if (v === "high" || v === "full") { bg = "#DCFCE7"; color = "#0A8A4C"; label = v === "full" ? "Full PDR" : "High"; }
  else if (v === "medium" || v === "partial") { bg = "#FEF3C7"; color = "#B45309"; label = v === "partial" ? "Partial PDR" : "Medium"; }
  else if (v === "low" || v === "restricted") { bg = "#F3F4F6"; color = "#6B7280"; label = v === "restricted" ? "Restricted" : "Low"; }
  else if (v === "none") { bg = "#F9FAFB"; color = "#D1D5DB"; label = "None"; }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}>{label}</span>
  );
}

function DevPotentialCard({ data }: { data: DevPotentialData | null; loading: boolean }) {
  if (!data) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
      <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: "#F3F4F6", backgroundColor: "#F9FAFB" }}>
        <span className="text-sm font-semibold" style={{ color: "#111827" }}>{data.name}</span>
        {data.assetType && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E5E7EB", color: "#6B7280" }}>{data.assetType}</span>
        )}
      </div>
      <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
        {data.siteCoveragePct !== null && (
          <div className="px-5 py-3 flex items-center gap-3">
            <span className="text-xs w-28 shrink-0" style={{ color: "#9CA3AF" }}>Site Coverage</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: "#111827" }}>{data.siteCoveragePct}%</span>
            <span className="text-xs" style={{ color: "#9CA3AF" }}>
              {data.siteCoveragePct < 40 ? "Low density — significant headroom" : data.siteCoveragePct < 70 ? "Medium density" : "High density"}
            </span>
          </div>
        )}
        <div className="px-5 py-3 flex items-start gap-3">
          <span className="text-xs w-28 shrink-0 pt-0.5" style={{ color: "#9CA3AF" }}>PDR Status</span>
          <div className="flex items-start gap-2 flex-wrap">
            {ratingPill(data.pdRights)}
            {data.pdRightsDetail && (
              <span className="text-xs leading-snug" style={{ color: "#6B7280" }}>{data.pdRightsDetail}</span>
            )}
          </div>
        </div>
        <div className="px-5 py-3 flex items-start gap-3">
          <span className="text-xs w-28 shrink-0 pt-0.5" style={{ color: "#9CA3AF" }}>Change of Use</span>
          <div className="flex items-start gap-2 flex-wrap">
            {ratingPill(data.changeOfUsePotential)}
            {data.changeOfUseDetail && (
              <span className="text-xs leading-snug" style={{ color: "#6B7280" }}>{data.changeOfUseDetail}</span>
            )}
          </div>
        </div>
        <div className="px-5 py-3 flex items-start gap-3">
          <span className="text-xs w-28 shrink-0 pt-0.5" style={{ color: "#9CA3AF" }}>Air Rights</span>
          <div className="flex items-start gap-2 flex-wrap">
            {ratingPill(data.airRightsPotential)}
            {data.airRightsDetail && (
              <span className="text-xs leading-snug" style={{ color: "#6B7280" }}>{data.airRightsDetail}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DevPotentialCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: "#F3F4F6", backgroundColor: "#F9FAFB" }}>
        <div className="h-4 rounded w-40" style={{ backgroundColor: "#E5E7EB" }} />
      </div>
      <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="px-5 py-3 flex items-center gap-3">
            <div className="h-3 rounded w-24 shrink-0" style={{ backgroundColor: "#F3F4F6" }} />
            <div className="h-3 rounded w-16" style={{ backgroundColor: "#E5E7EB" }} />
            <div className="h-3 rounded w-48" style={{ backgroundColor: "#F3F4F6" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Real user planning view ────────────────────────────────────────────────

function RealUserPlanningView() {
  const { assets, loading } = usePlanningData();
  const [actioned, setActioned] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [devPotential, setDevPotential] = useState<Record<string, DevPotentialData>>({});
  const [devLoading, setDevLoading] = useState(false);

  // Fetch dev potential for each asset once the asset list loads
  useEffect(() => {
    if (loading || assets.length === 0) return;
    setDevLoading(true);
    Promise.all(
      assets.map(a =>
        fetch(`/api/user/assets/${a.assetId}/development-potential`)
          .then(r => r.ok ? r.json() as Promise<{ asset: DevPotentialData }> : null)
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<string, DevPotentialData> = {};
      results.forEach((r, i) => {
        if (r?.asset) map[assets[i].assetId] = r.asset;
      });
      setDevPotential(map);
      setDevLoading(false);
    });
  }, [loading, assets]);

  const allEntries = assets.flatMap((a) =>
    a.planningHistory.map((e) => ({ ...e, assetName: a.assetName, location: a.location }))
  );

  const threats = allEntries.filter((e) => e.impact === "threat");
  const opportunities = allEntries.filter((e) => e.impact === "opportunity");
  const highImpact = allEntries.filter((e) => e.impactScore >= 7);
  const totalImpactScore = allEntries.length
    ? Math.round((allEntries.reduce((s, e) => s + e.impactScore, 0) / allEntries.length) * 10) / 10
    : 0;
  const netImpact = opportunities.length - threats.length;
  const topThreat = [...threats].sort((a, b) => b.impactScore - a.impactScore)[0];

  const hasData = allEntries.length > 0;

  return (
    <AppShell>
      <TopBar title="Planning Intelligence" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">

          {/* Page Hero — only when we have real data */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
            </div>
          ) : hasData ? (
            <PageHero
              title="Planning Intelligence"
              cells={[
                { label: "Tracked Applications", value: `${allEntries.length}`, sub: "Recorded on portfolio" },
                { label: "Opportunities", value: `${opportunities.length}`, valueColor: "#0A8A4C", sub: "Positive planning impact" },
                { label: "Threats", value: `${threats.length}`, valueColor: threats.length > 0 ? "#FF8080" : "#0A8A4C", sub: threats.length > 0 ? "Competitive risk" : "No active threats" },
                { label: "Avg Impact Score", value: `${totalImpactScore}/10`, valueColor: netImpact >= 0 ? "#0A8A4C" : "#FF8080", sub: netImpact >= 0 ? "Net positive outlook" : "Net negative outlook" },
              ]}
            />
          ) : null}

          {/* Issue → Cost → RealHQ Action bar */}
          {!loading && hasData && (
            <div
              className="rounded-xl px-5 py-3.5"
              style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <div className="text-xs" style={{ color: "#6B7280" }}>
                {threats.length > 0 ? (
                  <>{threats.length} competitive threat{threats.length !== 1 ? "s" : ""} detected near your assets
                    {topThreat ? ` — ${topThreat.assetName}: ${topThreat.description.slice(0, 55)}…` : ""}.{" "}
                    {highImpact.length > 0 && <>{highImpact.length} application{highImpact.length !== 1 ? "s" : ""} scored ≥7/10. </>}
                    RealHQ is tracking {threats.length === 1 ? "it" : "both"} and has updated your hold/sell analysis.
                  </>
                ) : (
                  <>No competitive threats recorded. RealHQ monitors planning activity continuously and links signals to your hold/sell analysis.</>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasData && (
            <div className="rounded-xl p-10 text-center max-w-lg mx-auto mt-8"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#F0FDF4" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="2" stroke="#0A8A4C" strokeWidth="1.5" />
                  <path d="M7 7H13M7 10H11" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-base font-semibold mb-2" style={{ color: "#111827" }}>
                No planning history recorded
              </h2>
              <p className="text-sm mb-5" style={{ color: "#9CA3AF" }}>
                No planning history recorded yet. Add your properties and RealHQ will automatically
                monitor planning applications and permitted development rights across your assets.
              </p>
              <Link
                href="/properties/add"
                className="inline-block px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Add a property →
              </Link>
            </div>
          )}

          {/* Applications list */}
          {!loading && hasData && (
            <div>
              <SectionHeader
                title="Nearby Planning Applications"
                subtitle={`${allEntries.length} applications across your portfolio`}
              />
              <div className="space-y-3">
                {[...allEntries]
                  .sort((a, b) => b.impactScore - a.impactScore)
                  .map((entry) => {
                    const isExpanded = expanded === entry.id;
                    const isActioned = actioned.has(entry.id);
                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{
                          backgroundColor: "#fff",
                          border: `1px solid ${isExpanded ? impactColor(entry.impact) + "40" : "#E5E7EB"}`,
                        }}
                      >
                        <button
                          className="w-full text-left px-5 py-4 flex flex-wrap items-start gap-x-4 gap-y-2 hover:bg-[#F9FAFB] transition-colors"
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                        >
                          <div
                            className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: impactColor(entry.impact) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                                {entry.assetName}
                              </span>
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                                {entry.refNumber}
                              </span>
                              <Badge variant={statusVariant(entry.status)}>
                                {entry.status}
                              </Badge>
                              <Badge variant={impactVariant(entry.impact)}>
                                {entry.impact === "threat" ? "Threat" : entry.impact === "opportunity" ? "Opportunity" : "Neutral"}
                              </Badge>
                            </div>
                            <p className="text-xs leading-snug" style={{ color: "#8aa3b8" }}>
                              {entry.type}{entry.distanceFt ? ` · ${entry.distanceFt.toLocaleString()} ft away` : ""}{entry.applicant ? ` · ${entry.applicant}` : ""}
                            </p>
                            <p className="text-xs mt-1 leading-snug"
                              style={{ color: "#9CA3AF", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {entry.description}
                            </p>
                          </div>
                          <div className="w-28 shrink-0">
                            <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Impact score</div>
                            <ImpactScoreBar score={entry.impactScore} />
                          </div>
                          {entry.holdSellLink && (
                            <div
                              className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 mt-0.5"
                              style={{
                                color: holdSellColor[entry.holdSellLink],
                                backgroundColor: holdSellColor[entry.holdSellLink] + "18",
                              }}
                            >
                              {holdSellLabel[entry.holdSellLink]}
                            </div>
                          )}
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                            className={`mt-1 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            style={{ color: "#9CA3AF" }}>
                            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="px-5 py-4 border-t" style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Application Type</div>
                                <div className="text-sm font-medium" style={{ color: "#111827" }}>{entry.type}</div>
                              </div>
                              {entry.distanceFt && (
                                <div>
                                  <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Distance</div>
                                  <div className="text-sm font-medium" style={{ color: "#111827" }}>
                                    {entry.distanceFt >= 5280 ? `${(entry.distanceFt / 5280).toFixed(1)} miles` : `${entry.distanceFt.toLocaleString()} ft`}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Submitted</div>
                                <div className="text-sm font-medium" style={{ color: "#111827" }}>
                                  {new Date(entry.submittedDate).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
                                  {entry.decisionDate && (
                                    <span style={{ color: "#0A8A4C" }}>
                                      {" "}· Decision: {new Date(entry.decisionDate).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="mb-4">
                              <div className="text-xs mb-1.5" style={{ color: "#9CA3AF" }}>RealHQ Analysis</div>
                              <p className="text-sm leading-relaxed" style={{ color: "#8aa3b8" }}>{entry.notes}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              {entry.holdSellLink && (
                                <Link href="/hold-sell"
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                  style={{
                                    backgroundColor: holdSellColor[entry.holdSellLink] + "22",
                                    color: holdSellColor[entry.holdSellLink],
                                    border: `1px solid ${holdSellColor[entry.holdSellLink]}33`,
                                  }}
                                >
                                  View Hold vs Sell Analysis →
                                </Link>
                              )}
                              <button
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{
                                  backgroundColor: isActioned ? "#F0FDF4" : "#0A8A4C22",
                                  color: "#0A8A4C",
                                  border: "1px solid #BBF7D0",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActioned((prev) => { const next = new Set(prev); next.add(entry.id); return next; });
                                }}
                              >
                                {isActioned ? "✓ Flagged for Review" : "Flag for Review"}
                              </button>
                              <button
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{ backgroundColor: "#E5E7EB55", color: "#8aa3b8", border: "1px solid #E5E7EB" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpanded(null);
                                  // Persist acknowledgement via Wave 2 API (non-fatal if pre-migration)
                                  fetch(`/api/user/planning/${entry.id}/ack`, { method: "PATCH" }).catch(() => null);
                                  setActioned((prev) => { const next = new Set(prev); next.add(entry.id); return next; });
                                }}
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Development Potential section — real users only */}
          {!loading && assets.length > 0 && (
            <div>
              <SectionHeader
                title="Development Potential"
                subtitle="What your assets can become"
              />
              <div className="space-y-3">
                {devLoading
                  ? assets.map(a => <DevPotentialCardSkeleton key={a.assetId} />)
                  : assets.map(a => (
                      <DevPotentialCard
                        key={a.assetId}
                        data={devPotential[a.assetId] ?? null}
                        loading={devLoading}
                      />
                    ))
                }
              </div>
            </div>
          )}
        </div>

        {!loading && (
          <DirectCallout
            title="RealHQ monitors planning activity and links signals to your hold/sell decisions"
            body="Planning intelligence is included as part of the RealHQ platform. Threats, opportunities, and approval decisions are tracked automatically and fed into your portfolio analysis at no extra cost."
          />
        )}
      </main>
    </AppShell>
  );
}

// ── Demo portfolio view ────────────────────────────────────────────────────

export default function PlanningPage() {
  const { portfolioId } = useNav();

  if (portfolioId === "user") {
    return <RealUserPlanningView />;
  }

  return <DemoPlanningPage portfolioId={portfolioId} />;
}

function DemoPlanningPage({ portfolioId }: { portfolioId: string }) {
  const loading = useLoading(450, portfolioId);
  const applications = portfolioApplications[portfolioId] ?? flPlanningApplications;
  const [actioned, setActioned] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const threats = applications.filter((a) => a.impact === "threat");
  const opportunities = applications.filter((a) => a.impact === "opportunity");
  const highImpact = applications.filter((a) => a.impactScore >= 7);
  const totalImpactScore =
    Math.round((applications.reduce((s, a) => s + a.impactScore, 0) / applications.length) * 10) / 10;
  const netImpact = opportunities.length - threats.length;
  const topThreat = [...threats].sort((a, b) => b.impactScore - a.impactScore)[0];

  return (
    <AppShell>
      <TopBar title="Planning Intelligence" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Page Hero */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
            </div>
          ) : (
            <PageHero
              title="Planning Intelligence"
              cells={[
                { label: "Nearby Applications", value: `${applications.length}`, sub: "Within 1 mile of portfolio" },
                { label: "Opportunities", value: `${opportunities.length}`, valueColor: "#0A8A4C", sub: "Positive planning impact" },
                { label: "Threats", value: `${threats.length}`, valueColor: threats.length > 0 ? "#FF8080" : "#0A8A4C", sub: threats.length > 0 ? "Competitive risk" : "No active threats" },
                { label: "Avg Impact Score", value: `${totalImpactScore}/10`, valueColor: netImpact >= 0 ? "#0A8A4C" : "#FF8080", sub: netImpact >= 0 ? "Net positive outlook" : "Net negative outlook" },
              ]}
            />
          )}

          {/* Issue → Cost → RealHQ Action bar */}
          {!loading && (
            <div
              className="rounded-xl px-5 py-3.5"
              style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <div className="text-xs" style={{ color: "#6B7280" }}>
                {threats.length > 0 ? (
                  <>{threats.length} competitive threat{threats.length !== 1 ? "s" : ""} detected within 1 mile
                    {topThreat ? ` — ${topThreat.assetName}: ${topThreat.description.slice(0, 55)}…` : ""}.{" "}
                    {highImpact.length > 0 && <>{highImpact.length} application{highImpact.length !== 1 ? "s" : ""} scored ≥7/10. </>}
                    RealHQ is tracking {threats.length === 1 ? "it" : "both"} and has updated your hold/sell analysis.
                  </>
                ) : (
                  <>No competitive threats detected near your assets. RealHQ monitors planning activity continuously.</>
                )}
              </div>
            </div>
          )}

          {/* Applications list */}
          <div>
            <SectionHeader
              title="Planning Applications"
              subtitle={`${applications.length} applications near your assets`}
            />
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[...applications]
                  .sort((a, b) => b.impactScore - a.impactScore)
                  .map((app) => {
                    const isExpanded = expanded === app.id;
                    const isActioned = actioned.has(app.id);
                    return (
                      <div
                        key={app.id}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{
                          backgroundColor: "#fff",
                          border: `1px solid ${isExpanded ? impactColor(app.impact) + "40" : "#E5E7EB"}`,
                        }}
                      >
                        <button
                          className="w-full text-left px-5 py-4 flex flex-wrap items-start gap-x-4 gap-y-2 hover:bg-[#F9FAFB] transition-colors"
                          onClick={() => setExpanded(isExpanded ? null : app.id)}
                        >
                          <div
                            className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: impactColor(app.impact) }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                                {app.assetName}
                              </span>
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                                {app.refNumber}
                              </span>
                              <Badge variant={statusVariant(app.status)}>
                                {app.status}
                              </Badge>
                              <Badge variant={impactVariant(app.impact)}>
                                {app.impact === "threat"
                                  ? "Threat"
                                  : app.impact === "opportunity"
                                  ? "Opportunity"
                                  : "Neutral"}
                              </Badge>
                            </div>
                            <p className="text-xs leading-snug" style={{ color: "#8aa3b8" }}>
                              {app.type} · {app.distanceFt.toLocaleString()} ft away · {app.applicant}
                            </p>
                            <p
                              className="text-xs mt-1 leading-snug"
                              style={{ color: "#9CA3AF", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {app.description}
                            </p>
                          </div>

                          <div className="w-28 shrink-0">
                            <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                              Impact score
                            </div>
                            <ImpactScoreBar score={app.impactScore} />
                          </div>

                          {app.holdSellLink && (
                            <div
                              className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 mt-0.5"
                              style={{
                                color: holdSellColor[app.holdSellLink],
                                backgroundColor: holdSellColor[app.holdSellLink] + "18",
                              }}
                            >
                              {holdSellLabel[app.holdSellLink]}
                            </div>
                          )}

                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            className={`mt-1 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            style={{ color: "#9CA3AF" }}
                          >
                            <path
                              d="M4 6L8 10L12 6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div
                            className="px-5 py-4 border-t"
                            style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                                  Application Type
                                </div>
                                <div className="text-sm font-medium" style={{ color: "#111827" }}>
                                  {app.type}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                                  Distance
                                </div>
                                <div className="text-sm font-medium" style={{ color: "#111827" }}>
                                  {app.distanceFt >= 5280
                                    ? `${(app.distanceFt / 5280).toFixed(1)} miles`
                                    : `${app.distanceFt.toLocaleString()} ft`}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>
                                  Submitted
                                </div>
                                <div className="text-sm font-medium" style={{ color: "#111827" }}>
                                  {new Date(app.submittedDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                  {app.decisionDate && (
                                    <span style={{ color: "#0A8A4C" }}>
                                      {" "}· Decision:{" "}
                                      {new Date(app.decisionDate).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mb-4">
                              <div className="text-xs mb-1.5" style={{ color: "#9CA3AF" }}>
                                RealHQ Analysis
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: "#8aa3b8" }}>
                                {app.notes}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {app.holdSellLink && (
                                <Link
                                  href="/hold-sell"
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                  style={{
                                    backgroundColor: holdSellColor[app.holdSellLink] + "22",
                                    color: holdSellColor[app.holdSellLink],
                                    border: `1px solid ${holdSellColor[app.holdSellLink]}33`,
                                  }}
                                >
                                  View Hold vs Sell Analysis →
                                </Link>
                              )}
                              <button
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{
                                  backgroundColor: isActioned ? "#F0FDF4" : "#0A8A4C22",
                                  color: "#0A8A4C",
                                  border: "1px solid #BBF7D0",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActioned((prev) => {
                                    const next = new Set(prev);
                                    next.add(app.id);
                                    return next;
                                  });
                                }}
                              >
                                {isActioned ? "✓ Flagged for Review" : "Flag for Review"}
                              </button>
                              <button
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{
                                  backgroundColor: "#E5E7EB55",
                                  color: "#8aa3b8",
                                  border: "1px solid #E5E7EB",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpanded(null);
                                }}
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Portfolio impact summary */}
          {!loading && (
            <div>
              <SectionHeader
                title="Portfolio Impact Summary"
                subtitle="How planning activity affects your Hold vs Sell decisions"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="rounded-xl p-5 flex flex-col"
                  style={{ backgroundColor: "#fff", border: "1px solid #BBF7D0" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                    <span className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>
                      {opportunities.length} Opportunity Signal{opportunities.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {opportunities.length === 0 ? (
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>
                      No positive planning signals near current portfolio.
                    </p>
                  ) : (
                    <ul className="space-y-2 flex-1">
                      {[...opportunities]
                        .sort((a, b) => b.impactScore - a.impactScore)
                        .slice(0, 3)
                        .map((app) => (
                          <li key={app.id} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5" style={{ color: "#0A8A4C" }}>
                              ↑
                            </span>
                            <span className="text-xs leading-snug" style={{ color: "#8aa3b8" }}>
                              <span className="font-medium" style={{ color: "#111827" }}>
                                {app.assetName}:
                              </span>{" "}
                              {app.notes.slice(0, 110)}…
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                  <div className="mt-4 pt-3" style={{ borderTop: "1px solid #E5E7EB" }}>
                    <Link href="/hold-sell" className="text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: "#0A8A4C" }}>
                      Review hold/sell analysis →
                    </Link>
                  </div>
                </div>

                <div
                  className="rounded-xl p-5 flex flex-col"
                  style={{ backgroundColor: "#fff", border: "1px solid #DC262633" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#DC2626" }} />
                    <span className="text-sm font-semibold" style={{ color: "#DC2626" }}>
                      {threats.length} Threat Signal{threats.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {threats.length === 0 ? (
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>
                      No competitive threats identified near current portfolio.
                    </p>
                  ) : (
                    <ul className="space-y-2 flex-1">
                      {[...threats]
                        .sort((a, b) => b.impactScore - a.impactScore)
                        .slice(0, 3)
                        .map((app) => (
                          <li key={app.id} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5" style={{ color: "#DC2626" }}>
                              ↓
                            </span>
                            <span className="text-xs leading-snug" style={{ color: "#8aa3b8" }}>
                              <span className="font-medium" style={{ color: "#111827" }}>
                                {app.assetName}:
                              </span>{" "}
                              {app.notes.slice(0, 110)}…
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                  <div className="mt-4 pt-3" style={{ borderTop: "1px solid #E5E7EB" }}>
                    <Link href="/hold-sell" className="text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: "#DC2626" }}>
                      Review hold/sell analysis →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RealHQ Direct callout */}
        {!loading && (
          <DirectCallout
            title="RealHQ monitors planning activity and links signals to your hold/sell decisions"
            body="Planning intelligence is included as part of the RealHQ platform. Threats, opportunities, and approval decisions are tracked automatically and fed into your portfolio analysis at no extra cost."
          />
        )}
      </main>
    </AppShell>
  );
}
