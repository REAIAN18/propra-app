"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

// ── Types ─────────────────────────────────────────────────────────────
type PlanningRationale = {
  type: "recent_sale" | "zoning_change" | "neighbor_application" | "site_underdevelopment";
  title: string;
  description: string;
};

type PlanningApplication = {
  reference: string;
  description: string;
  status: "approved" | "refused" | "pending";
  submittedDate: string;
  decidedDate?: string;
  distance: string;
  impact: "positive" | "negative" | "neutral";
  impactReason: string;
};

type AssetPlanning = {
  assetId: string;
  potentialLevel: "high" | "moderate" | "review" | null;
  siteCoveragePct: number | null;
  undevelopedAcres: number | null;
  planningAppsCount: number | null;
  planningAppsApproved: number | null;
  pdrLikelihood: "likely" | "possible" | "unlikely" | "verify" | null;
  listedStatus: "not_listed" | "check_required" | "listed" | null;
  floodZone: string | null;
  rationale: PlanningRationale[];
  caveat: string | null;
  applications: PlanningApplication[];
  devNarrative?: string;
};

// ── Main Page ─────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Planning — RealHQ";
    setLoading(false);
  }, []);

  // Demo data for each asset (in Wave 2, this would come from API)
  const assetsWithPlanning: AssetPlanning[] = portfolio.assets.map((asset, idx) => {
    // Demo logic: first 3 assets have varying levels of potential
    if (idx === 0) {
      return {
        assetId: asset.id,
        potentialLevel: "high",
        siteCoveragePct: 28,
        undevelopedAcres: 4.63,
        planningAppsCount: 3,
        planningAppsApproved: 2,
        pdrLikelihood: "verify",
        listedStatus: "check_required",
        floodZone: "Zone AE",
        rationale: [
          {
            type: "recent_sale",
            title: "Recent sale of alternative use next door",
            description: `${idx + 500} ${asset.address?.split(",")[1] || "nearby"} sold Jan 2025 for mixed-use redevelopment at $259/sqft. Same zoning class as this site.`,
          },
          {
            type: "zoning_change",
            title: "Zoning change — county updated commercial corridor 2024",
            description: "This address falls within the updated corridor. Residential-over-commercial now permitted by right. Density allowance increased.",
          },
          {
            type: "neighbor_application",
            title: "Neighbouring application granted — ref APP-2024-0847",
            description: "Mixed use granted 200m away. Same use class, same zoning corridor, approved Oct 2024.",
          },
        ],
        caveat: "This assessment is indicative only. A full planning appraisal should be commissioned before any decisions are made.",
        applications: [
          {
            reference: "APP-2024-0847",
            description: "Mixed-use development — 120 units with ground floor commercial",
            status: "approved",
            submittedDate: "2024-03-15",
            decidedDate: "2024-10-12",
            distance: "0.2mi",
            impact: "negative",
            impactReason: "Classified as NEGATIVE because: competing use (office + residential), within 0.2mi, 120 units adds supply to your submarket and may impact rental demand.",
          },
          {
            reference: "APP-2024-1203",
            description: "Restaurant and outdoor seating area",
            status: "approved",
            submittedDate: "2024-07-22",
            decidedDate: "2024-11-08",
            distance: "0.3mi",
            impact: "positive",
            impactReason: "Classified as POSITIVE because: complementary amenity (dining), enhances neighborhood appeal, likely to attract tenants and increase footfall.",
          },
          {
            reference: "APP-2025-0089",
            description: "Single-family home extension",
            status: "pending",
            submittedDate: "2025-01-14",
            distance: "0.8mi",
            impact: "neutral",
            impactReason: "Classified as NEUTRAL because: residential use, distance >0.5mi, scale too small to materially impact commercial property values.",
          },
        ],
        devNarrative: "Site has substantial development headroom given low 28% coverage. Zoning permits mixed-use development up to 6 stories. Comparable developments nearby suggest strong market appetite. Subject to full feasibility study, flood mitigation assessment, and confirmation of permitted development rights.",
      };
    } else if (idx === 1) {
      return {
        assetId: asset.id,
        potentialLevel: "moderate",
        siteCoveragePct: 45,
        undevelopedAcres: 2.1,
        planningAppsCount: 1,
        planningAppsApproved: 1,
        pdrLikelihood: "possible",
        listedStatus: "not_listed",
        floodZone: "Zone X",
        rationale: [
          {
            type: "site_underdevelopment",
            title: "Site underdevelopment relative to area norms",
            description: "45% site coverage vs 68% average for comparable industrial sites in the area. May indicate redevelopment headroom.",
          },
        ],
        caveat: "This assessment is indicative only. A full planning appraisal should be commissioned before any decisions are made.",
        applications: [
          {
            reference: "APP-2024-0632",
            description: "Warehouse expansion — additional 15,000 sqft",
            status: "approved",
            submittedDate: "2024-05-10",
            decidedDate: "2024-09-20",
            distance: "0.4mi",
            impact: "neutral",
            impactReason: "Classified as NEUTRAL because: similar industrial use, moderate distance, expansion reflects market demand but doesn't directly impact your property.",
          },
        ],
        devNarrative: "Site shows moderate intensification potential. Current 45% coverage vs area average of 68% suggests scope for additional building. Industrial zoning permits expansion. Market demand for industrial space remains strong in this corridor.",
      };
    } else if (idx === 2) {
      return {
        assetId: asset.id,
        potentialLevel: "review",
        siteCoveragePct: 72,
        undevelopedAcres: 0.3,
        planningAppsCount: 0,
        planningAppsApproved: 0,
        pdrLikelihood: "unlikely",
        listedStatus: "not_listed",
        floodZone: "Zone X",
        rationale: [],
        caveat: "This assessment is indicative only. A full planning appraisal should be commissioned before any decisions are made.",
        applications: [],
        devNarrative: "High site coverage (72%) limits traditional expansion. Review recommended for vertical intensification (additional floors) or change of use opportunities only.",
      };
    }

    // Remaining assets: no notable potential
    return {
      assetId: asset.id,
      potentialLevel: null,
      siteCoveragePct: 65,
      undevelopedAcres: 0.5,
      planningAppsCount: 0,
      planningAppsApproved: 0,
      pdrLikelihood: "unlikely",
      listedStatus: "not_listed",
      floodZone: "Zone X",
      rationale: [],
      caveat: null,
      applications: [],
    };
  });

  const potentialCount = assetsWithPlanning.filter((a) => a.potentialLevel).length;

  return (
    <AppShell>
      <TopBar />
      <div className="p-6" style={{ background: "#f7f7f5", minHeight: "100vh" }}>


        {/* Hero Section */}
        <div className="bg-[#173404] rounded-[14px] p-6 mb-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
            {portfolio.assets.length} Asset Portfolio · Planning Intelligence
          </p>
          <h2 className="text-[20px] font-medium text-white mb-2">
            {potentialCount} of your {portfolio.assets.length} assets have development potential worth exploring.
          </h2>
          <p className="text-[13px] text-white/45 leading-relaxed">
            Subject to full appraisal, listing status, and conservation checks. RealHQ has flagged the opportunities and is commissioning assessments — nothing is confirmed until reviewed.
          </p>
        </div>

        {/* Asset Cards */}
        {assetsWithPlanning.map((assetPlanning, idx) => {
          const asset = portfolio.assets[idx];
          if (!assetPlanning.potentialLevel) return null; // Skip assets with no potential

          const potentialBadge = assetPlanning.potentialLevel === "high"
            ? { label: "High potential", color: "#E8F5EE", textColor: "#0A8A4C" }
            : assetPlanning.potentialLevel === "moderate"
            ? { label: "Moderate potential", color: "#fef3c7", textColor: "#92400e" }
            : { label: "Review recommended", color: "#fef3c7", textColor: "#92400e" };

          const siteCoveragePct = assetPlanning.siteCoveragePct ?? 50;
          const undevelopedPct = 100 - siteCoveragePct;

          return (
            <div key={asset.id} className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden mb-3">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-[#f3f4f6] flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-[#111827]">{asset.address?.split(",")[0] || "Address pending"}</div>
                  <div className="text-[11px] text-[#6b7280] mt-0.5">
                    {asset.sqft?.toLocaleString()} sqft · {asset.address?.split(",")[1]?.trim() || "Location pending"} · {((asset.sqft ?? 0) / 43560).toFixed(2)} acres total
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-[10px] text-[11px] font-medium"
                  style={{ background: potentialBadge.color, color: potentialBadge.textColor }}
                >
                  {potentialBadge.label}
                </span>
              </div>

              {/* Body Grid */}
              <div className="grid grid-cols-2 gap-4 p-5">
                {/* Left: Stats */}
                <div className="space-y-0">
                  <div className="flex justify-between py-2.5 border-b border-[#f9fafb]">
                    <span className="text-[12px] text-[#374151]">Site coverage</span>
                    <span className="text-[12px] font-medium text-[#0A8A4C]">
                      {siteCoveragePct}% · {undevelopedPct}% undeveloped
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-[#f9fafb]">
                    <span className="text-[12px] text-[#374151]">Undeveloped land</span>
                    <span className="text-[12px] font-medium text-[#111827]">
                      {assetPlanning.undevelopedAcres?.toFixed(2)} acres
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-[#f9fafb]">
                    <span className="text-[12px] text-[#374151]">Planning applications</span>
                    <span className="text-[12px] font-medium text-[#111827]">
                      {assetPlanning.planningAppsCount} found · {assetPlanning.planningAppsApproved} approved
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-[#f9fafb]">
                    <span className="text-[12px] text-[#374151]">PDR likelihood</span>
                    <span className={`text-[12px] font-medium ${
                      assetPlanning.pdrLikelihood === "likely" ? "text-[#0A8A4C]" :
                      assetPlanning.pdrLikelihood === "verify" ? "text-[#d97706]" : "text-[#6b7280]"
                    }`}>
                      {assetPlanning.pdrLikelihood === "likely" ? "Likely" :
                       assetPlanning.pdrLikelihood === "possible" ? "Possible" :
                       assetPlanning.pdrLikelihood === "verify" ? "To be verified" : "Unlikely"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-[#f9fafb]">
                    <span className="text-[12px] text-[#374151]">Listed / conservation</span>
                    <span className="text-[12px] font-medium text-[#6b7280]">
                      {assetPlanning.listedStatus === "not_listed" ? "Not listed" :
                       assetPlanning.listedStatus === "listed" ? "Listed" : "Check required"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[12px] text-[#374151]">Flood zone</span>
                    <span className={`text-[12px] font-medium ${
                      assetPlanning.floodZone?.includes("AE") ? "text-[#d97706]" : "text-[#6b7280]"
                    }`}>
                      {assetPlanning.floodZone ?? "Zone X"}
                    </span>
                  </div>
                </div>

                {/* Right: Site Diagram */}
                <div className="bg-[#f9fafb] rounded-[10px] p-3.5 flex flex-col">
                  <div className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-2">Site diagram</div>
                  <div className="bg-[#e5e7eb] rounded-[8px] h-[100px] mb-2.5 flex items-center justify-center overflow-hidden relative">
                    <svg width="180" height="90" viewBox="0 0 180 90">
                      <rect width="180" height="90" fill="#d1fae5" rx="4"/>
                      <rect
                        x="20"
                        y="10"
                        width={siteCoveragePct * 0.7}
                        height="70"
                        fill="#0A8A4C"
                        rx="3"
                        opacity="0.75"
                      />
                      <text x={20 + (siteCoveragePct * 0.7) / 2} y="48" fontSize="9" fill="white" textAnchor="middle" fontWeight="600">
                        Building {siteCoveragePct}%
                      </text>
                      <text x="135" y="42" fontSize="9" fill="#0A8A4C" textAnchor="middle">
                        Undeveloped
                      </text>
                      <text x="135" y="53" fontSize="9" fill="#0A8A4C" textAnchor="middle">
                        {undevelopedPct}%
                      </text>
                    </svg>
                  </div>
                  <p className="text-[11px] text-[#6b7280] leading-relaxed">
                    {undevelopedPct}% of the {((asset.sqft ?? 0) / 43560).toFixed(2)} acre site is undeveloped. Subject to full appraisal.
                  </p>
                </div>
              </div>

              {/* Why Flagged Section */}
              {assetPlanning.rationale.length > 0 && (
                <>
                  <div className="px-5 pb-2.5">
                    <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">
                      Why RealHQ flagged this
                    </p>
                  </div>
                  <div className="px-5 pb-3.5 flex flex-col gap-2">
                    {assetPlanning.rationale.map((r, ridx) => (
                      <div key={ridx} className="flex items-start gap-2.5 p-3 bg-[#E8F5EE] rounded-[8px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0A8A4C] flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="text-[12px] font-medium text-[#0A8A4C] mb-0.5">
                            {r.title}
                          </div>
                          <div className="text-[11px] text-[#374151] leading-relaxed">
                            {r.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Planning Applications Timeline */}
              {assetPlanning.applications.length > 0 && (
                <>
                  <div className="px-5 pb-2.5 pt-2">
                    <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">
                      Nearby Planning Applications
                    </p>
                  </div>
                  <div className="px-5 pb-3.5 flex flex-col gap-2">
                    {assetPlanning.applications.map((app, aidx) => (
                      <div key={aidx} className="border border-[#e5e7eb] rounded-[8px] overflow-hidden">
                        <div className="p-3 bg-[#f9fafb]">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex-1">
                              <div className="text-[12px] font-medium text-[#111827] mb-0.5">
                                {app.description}
                              </div>
                              <div className="text-[10px] text-[#6b7280]">
                                Ref: {app.reference} · {app.distance} away · Submitted {new Date(app.submittedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                {app.decidedDate && ` · Decided ${new Date(app.decidedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${
                              app.impact === "positive" ? "bg-[#E8F5EE] text-[#0A8A4C]" :
                              app.impact === "negative" ? "bg-[#fee2e2] text-[#dc2626]" :
                              "bg-[#fef3c7] text-[#92400e]"
                            }`}>
                              {app.impact}
                            </span>
                          </div>
                          <div className={`px-2.5 py-2 rounded-[6px] text-[11px] leading-relaxed ${
                            app.impact === "positive" ? "bg-[#E8F5EE] text-[#374151]" :
                            app.impact === "negative" ? "bg-[#fee2e2] text-[#374151]" :
                            "bg-[#fef3c7] text-[#374151]"
                          }`}>
                            <span className="font-medium">AI Classification:</span> {app.impactReason}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Development Narrative */}
              {assetPlanning.devNarrative && (
                <>
                  <div className="px-5 pb-2.5">
                    <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">
                      Development Potential
                    </p>
                  </div>
                  <div className="px-5 pb-3.5">
                    <div className="p-3 bg-[#f9fafb] rounded-[8px] text-[12px] text-[#374151] leading-relaxed">
                      {assetPlanning.devNarrative}
                    </div>
                  </div>
                </>
              )}

              {/* Caveat */}
              {assetPlanning.caveat && (
                <div className="mx-5 mb-3.5 p-3 bg-[#fef3c7] rounded-[8px] text-[12px] text-[#92400e] leading-relaxed">
                  {assetPlanning.caveat}
                </div>
              )}

              {/* RealHQ Action - Single CTA */}
              <div className="mx-5 mb-3.5">
                <button className="w-full px-4 py-3 bg-[#0a8a4c] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#097d44] transition-colors">
                  Request full appraisal →
                </button>
                <p className="text-[10px] text-[#6b7280] text-center mt-2">
                  RealHQ commissions the assessment — no forms, no uploads required from you
                </p>
              </div>
            </div>
          );
        })}

        {/* Assets with No Potential */}
        {assetsWithPlanning.filter((a) => !a.potentialLevel).length > 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-5">
            <div className="text-[13px] font-medium text-[#111827] mb-2">
              Remaining {assetsWithPlanning.filter((a) => !a.potentialLevel).length} assets
            </div>
            <p className="text-[12px] text-[#6b7280] leading-relaxed">
              No notable development potential identified for remaining assets based on site coverage, zoning, and planning history. RealHQ will continue monitoring for policy changes or neighboring activity.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
