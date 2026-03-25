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
        caveat: "Development potential identified but not confirmed. Listing status, flood zone, and prior planning history must all be reviewed before assuming any development value.",
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
        caveat: "Moderate potential subject to full commercial viability appraisal and local planning policy review.",
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
        caveat: "High site coverage limits additional development. Review recommended for intensification or change of use only.",
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
    };
  });

  const potentialCount = assetsWithPlanning.filter((a) => a.potentialLevel).length;

  return (
    <AppShell>
      <TopBar />
      <div className="p-6" style={{ background: "#f7f7f5", minHeight: "100vh" }}>

        {/* Note */}
        <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
          PRO-638 — Planning Intelligence · RealHQ
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 mb-4 text-[12px] text-[#6b7280] leading-relaxed">
          <strong>Critical design rules:</strong><br />
          • Must show WHY development potential was flagged — not just that it was. Each flag needs a rationale: recent sale nearby / zoning change / neighbour application / site underdevelopment<br />
          • Remove the generic yellow &quot;subject to appraisal&quot; box — replace with specific rationale<br />
          • Language: always cautious — &quot;subject to full appraisal&quot;, &quot;to be verified&quot;, &quot;check required&quot;<br />
          • RealHQ is actioning this — show that RealHQ is commissioning a pre-application assessment. One approve button.<br />
          • Per-asset cards with site coverage diagram
        </div>

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

              {/* Caveat */}
              {assetPlanning.caveat && (
                <div className="mx-5 mb-3.5 p-3 bg-[#fef3c7] rounded-[8px] text-[12px] text-[#92400e] leading-relaxed">
                  {assetPlanning.caveat}
                </div>
              )}

              {/* RealHQ Action */}
              <div className="mx-5 mb-3.5 p-3 bg-[#eaf3de] border border-[#c0dd97] rounded-[9px] flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0a8a4c] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-[#173404] mb-0.5">
                    RealHQ is commissioning a pre-application assessment
                  </div>
                  <div className="text-[11px] text-[#3b6d11] leading-relaxed">
                    A planning consultant will review the site and provide a go/no-go recommendation. No commitment required until you approve.
                  </div>
                </div>
                <button className="px-4 py-2 bg-[#0a8a4c] text-white rounded-[8px] text-[12px] font-medium hover:bg-[#097d44] whitespace-nowrap">
                  Approve →
                </button>
              </div>

              {/* Action Row */}
              {assetPlanning.planningAppsCount && assetPlanning.planningAppsCount > 0 && (
                <div className="px-5 pb-3.5 flex gap-2">
                  <button className="px-3.5 py-2 bg-[#f9fafb] text-[#374151] border border-[#e5e7eb] rounded-[8px] text-[12px] hover:bg-gray-50">
                    View {assetPlanning.planningAppsCount} applications →
                  </button>
                </div>
              )}
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
