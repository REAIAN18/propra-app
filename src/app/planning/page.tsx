"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { flPlanningApplications, sePlanningApplications, type PlanningApplication } from "@/lib/data/planning";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";

const portfolioApplications: Record<string, PlanningApplication[]> = {
  "fl-mixed": flPlanningApplications,
  "se-logistics": sePlanningApplications,
};

function impactColor(impact: PlanningApplication["impact"]) {
  if (impact === "threat") return "#f06040";
  if (impact === "opportunity") return "#0A8A4C";
  return "#F5A94A";
}

function impactVariant(impact: PlanningApplication["impact"]): "red" | "green" | "amber" {
  if (impact === "threat") return "red";
  if (impact === "opportunity") return "green";
  return "amber";
}

function statusVariant(status: PlanningApplication["status"]): "red" | "green" | "amber" | "blue" | "gray" {
  if (status === "Approved") return "green";
  if (status === "Refused") return "red";
  if (status === "Appeal") return "amber";
  if (status === "In Application") return "blue";
  return "gray";
}

function ImpactScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#f06040" : score >= 6 ? "#F5A94A" : "#0A8A4C";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "#1a2d45" }}>
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
  sell: "#f06040",
  hold: "#0A8A4C",
  monitor: "#F5A94A",
};

const STATIC_PORTFOLIO_IDS = new Set(["fl-mixed", "se-logistics"]);

export default function PlanningPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const isCustomPortfolio = !STATIC_PORTFOLIO_IDS.has(portfolioId);
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

  if (!loading && isCustomPortfolio) {
    return (
      <AppShell>
        <TopBar title="Planning Intelligence" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <div className="rounded-xl p-8 text-center max-w-lg mx-auto mt-12"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#1a2d45" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="2" stroke="#5a7a96" strokeWidth="1.5" />
                  <path d="M7 7H13M7 10H11" stroke="#5a7a96" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-base font-semibold mb-2" style={{ color: "#e8eef5" }}>
                Planning data loading
              </h2>
              <p className="text-sm" style={{ color: "#5a7a96" }}>
                Planning intelligence is being sourced for this portfolio.
                Arca will surface nearby planning applications and their impact within 48 hours of onboarding.
              </p>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

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
                { label: "Opportunities", value: `${opportunities.length}`, valueColor: "#5BF0AC", sub: "Positive planning impact" },
                { label: "Threats", value: `${threats.length}`, valueColor: threats.length > 0 ? "#FF8080" : "#5BF0AC", sub: threats.length > 0 ? "Competitive risk" : "No active threats" },
                { label: "Avg Impact Score", value: `${totalImpactScore}/10`, valueColor: netImpact >= 0 ? "#5BF0AC" : "#FF8080", sub: netImpact >= 0 ? "Net positive outlook" : "Net negative outlook" },
              ]}
            />
          )}

          {/* Issue → Cost → Arca Action bar */}
          {!loading && (
            <div
              className="rounded-xl px-5 py-3.5"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="text-xs" style={{ color: "#8ba0b8" }}>
                <span style={{ color: "#f06040", fontWeight: 600 }}>Issue:</span>{" "}
                {threats.length} competitive threat{threats.length !== 1 ? "s" : ""} within 1 mile
                {topThreat ? ` — ${topThreat.assetName}: ${topThreat.description.slice(0, 55)}…` : ""} ·{" "}
                <span style={{ color: "#F5A94A", fontWeight: 600 }}>Risk:</span>{" "}
                {highImpact.length} high-impact application{highImpact.length !== 1 ? "s" : ""} scored ≥7/10 ·{" "}
                <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
                monitors every application, links planning signals to Hold vs Sell recommendations
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
                          backgroundColor: "#111e2e",
                          border: `1px solid ${isExpanded ? impactColor(app.impact) + "40" : "#1a2d45"}`,
                        }}
                      >
                        <button
                          className="w-full text-left px-5 py-4 flex flex-wrap items-start gap-x-4 gap-y-2 hover:bg-[#0d1825] transition-colors"
                          onClick={() => setExpanded(isExpanded ? null : app.id)}
                        >
                          <div
                            className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: impactColor(app.impact) }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                                {app.assetName}
                              </span>
                              <span className="text-xs" style={{ color: "#5a7a96" }}>
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
                              style={{ color: "#5a7a96", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {app.description}
                            </p>
                          </div>

                          <div className="w-28 shrink-0">
                            <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>
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
                            style={{ color: "#5a7a96" }}
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
                            style={{ borderColor: "#1a2d45", backgroundColor: "#0d1825" }}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>
                                  Application Type
                                </div>
                                <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>
                                  {app.type}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>
                                  Distance
                                </div>
                                <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>
                                  {app.distanceFt >= 5280
                                    ? `${(app.distanceFt / 5280).toFixed(1)} miles`
                                    : `${app.distanceFt.toLocaleString()} ft`}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>
                                  Submitted
                                </div>
                                <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>
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
                              <div className="text-xs mb-1.5" style={{ color: "#5a7a96" }}>
                                Arca Analysis
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
                                  backgroundColor: isActioned ? "#0f2a1c" : "#0A8A4C22",
                                  color: "#0A8A4C",
                                  border: "1px solid #0A8A4C33",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActioned((prev) => {
                                    const next = new Set(prev);
                                    next.add(app.id);
                                    return next;
                                  });
                                  fetch("/api/leads/planning-flag", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      appId: app.id,
                                      refNumber: app.refNumber,
                                      assetName: app.assetName,
                                      applicant: app.applicant,
                                      type: app.type,
                                      impact: app.impact,
                                      impactScore: app.impactScore,
                                      holdSellLink: app.holdSellLink,
                                    }),
                                  }).catch(() => {});
                                }}
                              >
                                {isActioned ? "✓ Flagged for Review" : "Flag for Review"}
                              </button>
                              <button
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{
                                  backgroundColor: "#1a2d4555",
                                  color: "#8aa3b8",
                                  border: "1px solid #1a2d45",
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
                  style={{ backgroundColor: "#111e2e", border: "1px solid #0A8A4C33" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                    <span className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>
                      {opportunities.length} Opportunity Signal{opportunities.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {opportunities.length === 0 ? (
                    <p className="text-xs" style={{ color: "#5a7a96" }}>
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
                              <span className="font-medium" style={{ color: "#e8eef5" }}>
                                {app.assetName}:
                              </span>{" "}
                              {app.notes.slice(0, 110)}…
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                  <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1a2d45" }}>
                    <Link href="/hold-sell" className="text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: "#0A8A4C" }}>
                      Review hold/sell analysis →
                    </Link>
                  </div>
                </div>

                <div
                  className="rounded-xl p-5 flex flex-col"
                  style={{ backgroundColor: "#111e2e", border: "1px solid #f0604033" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#f06040" }} />
                    <span className="text-sm font-semibold" style={{ color: "#f06040" }}>
                      {threats.length} Threat Signal{threats.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {threats.length === 0 ? (
                    <p className="text-xs" style={{ color: "#5a7a96" }}>
                      No competitive threats identified near current portfolio.
                    </p>
                  ) : (
                    <ul className="space-y-2 flex-1">
                      {[...threats]
                        .sort((a, b) => b.impactScore - a.impactScore)
                        .slice(0, 3)
                        .map((app) => (
                          <li key={app.id} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5" style={{ color: "#f06040" }}>
                              ↓
                            </span>
                            <span className="text-xs leading-snug" style={{ color: "#8aa3b8" }}>
                              <span className="font-medium" style={{ color: "#e8eef5" }}>
                                {app.assetName}:
                              </span>{" "}
                              {app.notes.slice(0, 110)}…
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                  <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1a2d45" }}>
                    <Link href="/hold-sell" className="text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: "#f06040" }}>
                      Review hold/sell analysis →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
