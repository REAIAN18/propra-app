"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { planningApplications } from "@/lib/data/planning-data";
import { Portfolio, PlanningApplication } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

type ImpactFilter = "all" | "threat" | "opportunity" | "neutral";

function impactVariant(impact: PlanningApplication["impact"]): "red" | "green" | "amber" {
  if (impact === "threat") return "red";
  if (impact === "opportunity") return "green";
  return "amber";
}

function statusVariant(status: PlanningApplication["status"]): "amber" | "green" | "red" | "gray" {
  if (status === "In Application") return "amber";
  if (status === "Approved") return "green";
  if (status === "Refused") return "gray";
  return "red"; // Appeal
}

function impactColor(impact: PlanningApplication["impact"]) {
  if (impact === "threat") return "#f06040";
  if (impact === "opportunity") return "#0A8A4C";
  return "#F5A94A";
}

export default function PlanningPage() {
  const { portfolioId } = useNav();
  const [filter, setFilter] = useState<ImpactFilter>("all");
  const loading = useLoading(450, portfolioId);
  const portfolio = portfolios[portfolioId];

  const assetIds = new Set(portfolio.assets.map((a) => a.id));
  const applications = planningApplications.filter((p) => assetIds.has(p.assetId));

  const threats = applications.filter((p) => p.impact === "threat");
  const opportunities = applications.filter((p) => p.impact === "opportunity");
  const inApplication = applications.filter((p) => p.status === "In Application" || p.status === "Appeal");
  const topThreat = threats.sort((a, b) => b.impactScore - a.impactScore)[0];

  const filtered = filter === "all" ? applications : applications.filter((p) => p.impact === filter);

  // Group by asset
  const byAsset = portfolio.assets
    .map((a) => ({
      asset: a,
      apps: filtered.filter((p) => p.assetId === a.id),
    }))
    .filter(({ apps }) => apps.length > 0);

  return (
    <AppShell>
      <TopBar title="Planning Intelligence" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard
              label="Active Applications"
              value={`${inApplication.length}`}
              sub="In application or appeal"
              accent="amber"
            />
            <MetricCard
              label="Threats"
              value={`${threats.length}`}
              sub="Risk to income or ERV"
              accent="red"
              trend="down"
              trendLabel="Monitor closely"
            />
            <MetricCard
              label="Opportunities"
              value={`${opportunities.length}`}
              sub="Value creation signals"
              accent="green"
              trend="up"
              trendLabel="Act on these"
            />
            <MetricCard
              label="Top Threat Score"
              value={topThreat ? `${topThreat.impactScore}/10` : "—"}
              sub={topThreat?.refNumber ?? "No active threats"}
              accent={topThreat ? "red" : "green"}
            />
          </div>
        )}

        {/* Issue / Cost / Action */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: "#f06040", fontWeight: 600 }}>Issue:</span>{" "}
              {threats.length} planning threat{threats.length !== 1 ? "s" : ""} identified across{" "}
              {new Set(threats.map((t) => t.assetId)).size} asset
              {new Set(threats.map((t) => t.assetId)).size !== 1 ? "s" : ""}{" "}
              ·{" "}
              <span style={{ color: "#f06040", fontWeight: 600 }}>Cost:</span>{" "}
              <span style={{ color: "#f06040" }}>
                {inApplication.length} application{inApplication.length !== 1 ? "s" : ""}
              </span>{" "}
              pending decision — outcome could affect ERV and hold/sell thesis ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
              monitors all local authority portals, alerts on new submissions within 1 mile, scores impact automatically
            </div>
          </div>
        )}

        {/* Filter Bar */}
        {!loading && (
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "threat", "opportunity", "neutral"] as ImpactFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  backgroundColor:
                    filter === f
                      ? f === "threat"
                        ? "#f06040"
                        : f === "opportunity"
                        ? "#0A8A4C"
                        : f === "neutral"
                        ? "#F5A94A"
                        : "#1647E8"
                      : "#111e2e",
                  color: filter === f ? "#0B1622" : "#8ba0b8",
                  border: `1px solid ${
                    filter === f
                      ? "transparent"
                      : "#1a2d45"
                  }`,
                }}
              >
                {f === "all"
                  ? `All (${applications.length})`
                  : f === "threat"
                  ? `Threats (${threats.length})`
                  : f === "opportunity"
                  ? `Opportunities (${opportunities.length})`
                  : `Neutral (${applications.filter((p) => p.impact === "neutral").length})`}
              </button>
            ))}
          </div>
        )}

        {/* Applications by Asset */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="space-y-4">
            {byAsset.map(({ asset, apps }) => (
              <div
                key={asset.id}
                className="rounded-xl transition-all duration-150 hover:shadow-lg"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
              >
                <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
                  <SectionHeader
                    title={asset.name}
                    subtitle={`${asset.location} · ${apps.length} planning application${apps.length !== 1 ? "s" : ""}`}
                  />
                </div>
                <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                  {apps
                    .sort((a, b) => b.impactScore - a.impactScore)
                    .map((app) => (
                      <div
                        key={app.id}
                        className="px-5 py-4 transition-colors hover:bg-[#0d1825]"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className="text-xs font-mono font-medium"
                                style={{ color: "#5a7a96" }}
                              >
                                {app.refNumber}
                              </span>
                              <Badge variant={impactVariant(app.impact)}>
                                {app.impact === "threat"
                                  ? "Threat"
                                  : app.impact === "opportunity"
                                  ? "Opportunity"
                                  : "Neutral"}
                              </Badge>
                              <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                            </div>
                            <div
                              className="text-sm font-medium mb-0.5"
                              style={{ color: "#e8eef5" }}
                            >
                              {app.description}
                            </div>
                            <div className="text-xs" style={{ color: "#5a7a96" }}>
                              {app.type} · {app.applicant} · {app.distanceFt.toLocaleString()}ft away
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>
                              Impact score
                            </div>
                            <div
                              className="text-2xl font-bold"
                              style={{
                                color: impactColor(app.impact),
                                fontFamily:
                                  "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                              }}
                            >
                              {app.impactScore}
                              <span className="text-sm font-normal" style={{ color: "#3d5a72" }}>
                                /10
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div
                          className="h-1 rounded-full mb-3"
                          style={{ backgroundColor: "#1a2d45" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${app.impactScore * 10}%`,
                              backgroundColor: impactColor(app.impact),
                            }}
                          />
                        </div>

                        {/* Notes */}
                        <div
                          className="rounded-lg px-3 py-2.5 text-xs mb-3"
                          style={{ backgroundColor: "#0d1825", color: "#8ba0b8" }}
                        >
                          <span className="font-medium" style={{ color: "#5a7a96" }}>
                            Arca analysis:{" "}
                          </span>
                          {app.notes}
                        </div>

                        {/* Dates + Action */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-4 text-xs" style={{ color: "#3d5a72" }}>
                            <span>Submitted {app.submittedDate}</span>
                            {app.decisionDate && <span>Decided {app.decisionDate}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {app.impact === "threat" && (
                              <a
                                href="/hold-sell"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                                style={{ backgroundColor: "#1d0f0a", color: "#f06040", border: "1px solid #3d1a10" }}
                              >
                                Review Hold/Sell →
                              </a>
                            )}
                            {app.impact === "opportunity" && (
                              <a
                                href="/income"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                                style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #1a4d2e" }}
                              >
                                Model upside →
                              </a>
                            )}
                            {app.impact === "neutral" && (
                              <span className="text-xs" style={{ color: "#3d5a72" }}>
                                Monitor
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {byAsset.length === 0 && (
              <div
                className="rounded-xl px-5 py-10 text-center"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
              >
                <div className="text-sm" style={{ color: "#5a7a96" }}>
                  No planning applications match the selected filter.
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}
