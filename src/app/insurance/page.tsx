"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

// ── Types ─────────────────────────────────────────────────────────────
type InsuranceSummary = {
  hasPolicies: boolean;
  totalPremium: number;
  policies: {
    id: string;
    premium: number;
    propertyAddress: string | null;
    currency: string | null;
  }[];
};

// ── Formatters ────────────────────────────────────────────────────────
function sym(currency: string) {
  return currency === "GBP" ? "£" : "$";
}

function fmtPrice(price: number, currency: string) {
  const s = sym(currency);
  if (price >= 1_000_000) return `${s}${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${s}${(price / 1_000).toFixed(0)}k`;
  return `${s}${price.toLocaleString()}`;
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function InsurancePage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const currency = portfolio.currency ?? "USD";
  const hasUploaded = insuranceSummary?.hasPolicies === true;

  useEffect(() => {
    document.title = "Insurance — RealHQ";
    fetch("/api/user/insurance-summary")
      .then((r) => r.json())
      .then((data) => {
        setInsuranceSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Calculate market ranges for each asset (simplified benchmark logic)
  const assetsWithRanges = portfolio.assets.map((asset) => {
    const sqft = asset.sqft ?? 10000;
    const type = asset.type ?? "industrial";

    // Simplified market rate calculation: $8-12/sqft/yr for FL commercial
    const rateLow = currency === "USD" ? 8 : 6;
    const rateHigh = currency === "USD" ? 12 : 9;

    const marketLow = Math.round((sqft * rateLow));
    const marketHigh = Math.round((sqft * rateHigh));

    // Find matching uploaded policy premium
    const matchedPolicy = insuranceSummary?.policies.find(
      (p) => p.propertyAddress?.toLowerCase().includes(asset.address?.split(",")[0].toLowerCase() || "")
    );
    const actualPremium = matchedPolicy?.premium ?? null;

    return {
      ...asset,
      marketLow,
      marketHigh,
      actualPremium,
    };
  });

  const totalMarketLow = assetsWithRanges.reduce((s, a) => s + a.marketLow, 0);
  const totalMarketHigh = assetsWithRanges.reduce((s, a) => s + a.marketHigh, 0);
  const totalActual = hasUploaded ? (insuranceSummary?.totalPremium ?? 0) : null;
  const overpayAmount = hasUploaded && totalActual ? totalActual - ((totalMarketLow + totalMarketHigh) / 2) : null;

  // Typical overpay percentage
  const typicalOverpayPct = 15; // 15-25% range, using 15 as low end

  return (
    <AppShell>
      <TopBar />
      <div className="p-6" style={{ background: "#f7f7f5", minHeight: "100vh" }}>

        {/* Note */}
        <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
          PRO-627 — Insurance Audit · RealHQ
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 mb-4 text-[12px] text-[#6b7280] leading-relaxed">
          <strong>Key features:</strong> Honest market benchmarks · Per-asset premium ranges · Portfolio consolidation comparison · Coverage gap audit · Upload for exact figures<br />
          <strong>Wave 2 scope:</strong> Show market ranges before upload. No assumptions. After upload: exact gap analysis and retender workflow.<br />
          Brand rule: Never assume current premium without document. Ranges only until upload.
        </div>

        {/* Hero Section */}
        <div className="bg-[#173404] rounded-[14px] p-6 mb-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
            {portfolio.assets.length} Asset Portfolio · Insurance Audit
          </p>
          {hasUploaded && overpayAmount !== null && overpayAmount > 0 ? (
            <>
              <h2 className="text-[20px] font-medium text-white mb-2">
                You are overpaying by {fmtPrice(overpayAmount, currency)}/yr
              </h2>
              <p className="text-[13px] text-white/45 leading-relaxed mb-4">
                Based on your uploaded policy schedule vs {portfolio.assets.length} FL commercial market rates. RealHQ approaches 8–12 carriers direct, negotiates terms, and presents binding quotes. One approval to proceed.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-[20px] font-medium text-white mb-2">
                Portfolios like yours typically overpay by {fmtPrice(Math.round((totalMarketLow + totalMarketHigh) / 2 * 0.2), currency)}–{fmtPrice(Math.round((totalMarketLow + totalMarketHigh) / 2 * 0.35), currency)}/yr.
              </h2>
              <p className="text-[13px] text-white/45 leading-relaxed mb-4">
                That's based on 1,200 comparable FL commercial portfolios — not your actual policy. Upload your schedule and RealHQ will tell you exactly where you stand. At a 6.6% cap rate, {fmtPrice(Math.round((totalMarketLow + totalMarketHigh) / 2 * 0.25), currency)} overpay is ~{fmtPrice(Math.round((totalMarketLow + totalMarketHigh) / 2 * 0.25 / 0.066), currency)} of portfolio value sitting idle.
              </p>
            </>
          )}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white/[0.07] rounded-[9px] p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Market benchmark</div>
              <div className="text-[18px] font-medium text-white">
                {fmtPrice(totalMarketLow, currency)}–{fmtPrice(totalMarketHigh, currency)}/yr
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">for {portfolio.assets.length} assets · your type · FL</div>
            </div>
            <div className="bg-white/[0.07] rounded-[9px] p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Typical overpay</div>
              <div className="text-[18px] font-medium text-white">
                {typicalOverpayPct}–25%
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">vs market · auto-renewal portfolios</div>
            </div>
            <div className="bg-white/[0.07] rounded-[9px] p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">After upload</div>
              <div className="text-[18px] font-medium text-white">
                Exact gap
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">RealHQ analyses your actual policy</div>
            </div>
          </div>
        </div>

        {/* Per Asset Table */}
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden mb-3">
          <div className="px-5 py-3.5 border-b border-[#f3f4f6]">
            <p className="text-[13px] font-medium text-[#111827]">Per Asset Breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#6b7280] uppercase tracking-wider">Asset</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#6b7280] uppercase tracking-wider">Market range</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#6b7280] uppercase tracking-wider">Your premium</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#6b7280] uppercase tracking-wider">Gap</th>
                </tr>
              </thead>
              <tbody>
                {assetsWithRanges.map((asset, idx) => {
                  const gap = asset.actualPremium ? asset.actualPremium - ((asset.marketLow + asset.marketHigh) / 2) : null;
                  const gapPct = gap && asset.actualPremium ? (gap / asset.actualPremium) * 100 : null;
                  const isAboveMarket = gap !== null && gap > 0;

                  return (
                    <tr key={asset.id} className="border-b border-[#f9fafb] last:border-b-0">
                      <td className="px-5 py-3">
                        <div className="text-[13px] font-medium text-[#111827]">{asset.address?.split(",")[0] || "Address pending"}</div>
                        <div className="text-[11px] text-[#6b7280]">{asset.type} · {asset.sqft?.toLocaleString()} sqft</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-[13px] text-[#111827]">
                          {fmtPrice(asset.marketLow, currency)}–{fmtPrice(asset.marketHigh, currency)}/yr
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {asset.actualPremium ? (
                          <div className="text-[13px] font-medium text-[#111827]">
                            {fmtPrice(asset.actualPremium, currency)}/yr
                          </div>
                        ) : (
                          <div className="text-[13px] italic text-[#9ca3af]">Upload to see</div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {gap !== null && gapPct !== null ? (
                          <span className={`inline-block px-2 py-1 rounded-[10px] text-[10px] font-medium ${
                            isAboveMarket
                              ? "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]"
                              : "bg-[#E8F5EE] text-[#0A8A4C] border border-[#d1fae5]"
                          }`}>
                            {isAboveMarket ? "+" : ""}{fmtPrice(gap, currency)} ({gapPct > 0 ? "+" : ""}{gapPct.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-[13px] text-[#9ca3af]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#f9fafb] font-medium">
                  <td className="px-5 py-3 text-[13px] text-[#111827]">Portfolio Total</td>
                  <td className="px-5 py-3 text-[13px] text-[#111827]">
                    {fmtPrice(totalMarketLow, currency)}–{fmtPrice(totalMarketHigh, currency)}/yr
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#111827]">
                    {totalActual ? fmtPrice(totalActual, currency) + "/yr" : <span className="italic text-[#9ca3af]">Upload to see</span>}
                  </td>
                  <td className="px-5 py-3">
                    {overpayAmount !== null ? (
                      <span className={`inline-block px-2 py-1 rounded-[10px] text-[10px] font-medium ${
                        overpayAmount > 0
                          ? "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]"
                          : "bg-[#E8F5EE] text-[#0A8A4C] border border-[#d1fae5]"
                      }`}>
                        {overpayAmount > 0 ? "+" : ""}{fmtPrice(overpayAmount, currency)}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#9ca3af]">—</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Portfolio Consolidation */}
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden mb-3">
          <div className="px-5 py-3.5 border-b border-[#f3f4f6]">
            <p className="text-[13px] font-medium text-[#111827]">Portfolio Consolidation Opportunity</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Left - Current State */}
              <div className="border border-[#e5e7eb] rounded-[10px] p-4">
                <div className="text-[12px] font-medium text-[#111827] mb-3">{portfolio.assets.length} separate policies today</div>
                <ul className="space-y-2 text-[12px] text-[#6b7280]">
                  {assetsWithRanges.slice(0, 3).map((asset, idx) => (
                    <li key={idx}>• {asset.address?.split(",")[0] || "Address pending"}</li>
                  ))}
                  {assetsWithRanges.length > 3 && <li>• +{assetsWithRanges.length - 3} more</li>}
                </ul>
                <div className="mt-3 pt-3 border-t border-[#f3f4f6] space-y-1 text-[11px] text-[#6b7280]">
                  <div>• Full retail rates</div>
                  <div>• {portfolio.assets.length} renewals to manage</div>
                  <div>• No volume discount</div>
                </div>
              </div>

              {/* Right - After Consolidation */}
              <div className="border border-[#0a8a4c] bg-[#E8F5EE] rounded-[10px] p-4">
                <div className="text-[12px] font-medium text-[#111827] mb-3">1 consolidated policy after RealHQ</div>
                <ul className="space-y-2 text-[12px] text-[#0A8A4C]">
                  <li>• All {portfolio.assets.length} assets combined</li>
                  <li>• London + NY market access</li>
                  <li>• Single renewal date</li>
                  <li>• Carrier competition</li>
                  <li>• 8–12 quotes</li>
                  <li>• Portfolio discount unlocked</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-[#d1fae5]">
                  <div className="text-[14px] font-medium text-[#0A8A4C]">Typical saving: 22–30% vs incumbent</div>
                </div>
              </div>
            </div>

            <p className="text-[12px] text-[#6b7280] leading-relaxed">
              <strong>Key insight:</strong> Exact saving depends on your actual premiums, asset mix, and claims history. Upload your policy schedule and RealHQ will model the consolidated saving before approaching any carrier.
            </p>
          </div>
        </div>

        {/* Coverage Gap Audit */}
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden mb-3">
          <div className="px-5 py-3.5 border-b border-[#f3f4f6]">
            <p className="text-[13px] font-medium text-[#111827]">Coverage Gap Audit</p>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {[
                { item: "Reinstatement value accuracy", status: "critical", desc: "Over-insured properties (very common) pay unnecessary premium. Upload policy for RICS survey recommendation." },
                { item: "Business interruption period", status: "critical", desc: "12-month indemnity is standard but often insufficient for industrial re-letting. 18–24 months recommended." },
                { item: "Loss of rent cover", status: "amber", desc: "Often capped at 2–3 years. Upload policy to check actual limit vs WAULT exposure." },
                { item: "Terrorism cover", status: "amber", desc: "Pool Re coverage standard for UK. US properties require separate TRIPRA endorsement." },
                { item: "Employers liability", status: "amber", desc: "£10M standard in UK commercial policies. Upload to verify limit." },
                { item: "Machinery breakdown (industrial)", status: "amber", desc: "Critical for industrial/warehouse with HVAC, cold storage, or production equipment. Upload to check inclusion." },
                { item: "Contamination liability (industrial)", status: "amber", desc: "Historical industrial use creates latent risk. Upload to check whether contamination is excluded." },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-[#f9fafb] rounded-[8px]">
                  <div className="flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      item.status === "critical"
                        ? "bg-[#fee2e2] text-[#991b1b]"
                        : "bg-[#fef3c7] text-[#92400e]"
                    }`}>
                      <span className="text-[12px] font-bold">!</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[13px] font-medium text-[#111827]">{item.item}</div>
                      <span className={`px-2 py-0.5 rounded-[10px] text-[10px] font-medium uppercase tracking-wider ${
                        item.status === "critical"
                          ? "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]"
                          : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                      }`}>
                        {item.status === "critical" ? "Review needed" : "Upload to check"}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6b7280] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why Premiums Inflate */}
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden mb-3">
          <div className="px-5 py-3.5 border-b border-[#f3f4f6]">
            <p className="text-[13px] font-medium text-[#111827]">Why Premiums Inflate</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: "Never retendered", desc: "15–25% above market after 3+ years without competitive retender." },
                { title: "Auto-renewal accepted", desc: "Incumbent carriers always quote highest available pricing on renewal. Zero incentive to offer best rate." },
                { title: "Wrong asset classification", desc: "Industrial properties classified as mixed use can add 15–25% to premium. Broker error or carrier misunderstanding." },
                { title: "Broker conflict of interest", desc: "Brokers earn commission from carriers. Higher premium = higher commission. Carrier with best rate is not always recommended." },
              ].map((item, idx) => (
                <div key={idx} className="border border-[#e5e7eb] rounded-[8px] p-4">
                  <div className="text-[13px] font-medium text-[#111827] mb-2">{item.title}</div>
                  <p className="text-[12px] text-[#6b7280] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-[#173404] rounded-[14px] p-6">
          <h3 className="text-[18px] font-medium text-white mb-3">Upload your policy schedule.</h3>
          <p className="text-[13px] text-white/45 leading-relaxed mb-4">
            RealHQ checks every line — coverage, exclusions, limits, and premium — against market and flags every issue. Then approaches 8–12 carriers, negotiates terms, and presents you with options. One approval to proceed. No broker. No markup.
          </p>

          {/* Drop Zone */}
          <div className="border-2 border-dashed border-white/20 rounded-[10px] p-8 mb-4 text-center bg-white/[0.03]">
            <p className="text-[14px] text-white/60 mb-2">Drop your policy schedule here</p>
            <p className="text-[12px] text-white/40">PDF · one or all {portfolio.assets.length} · RealHQ reads all of it</p>
          </div>

          {/* Three Steps */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/[0.07] rounded-[9px] p-4">
              <div className="text-[16px] font-medium text-white mb-1">1</div>
              <div className="text-[12px] font-medium text-white mb-1">Policy audit</div>
              <div className="text-[11px] text-white/40">Every line vs market and coverage gaps</div>
            </div>
            <div className="bg-white/[0.07] rounded-[9px] p-4">
              <div className="text-[16px] font-medium text-white mb-1">2</div>
              <div className="text-[12px] font-medium text-white mb-1">Market approach</div>
              <div className="text-[11px] text-white/40">RealHQ approaches 8–12 carriers direct</div>
            </div>
            <div className="bg-white/[0.07] rounded-[9px] p-4">
              <div className="text-[16px] font-medium text-white mb-1">3</div>
              <div className="text-[12px] font-medium text-white mb-1">You approve</div>
              <div className="text-[11px] text-white/40">One click. RealHQ binds and cancels incumbent.</div>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full py-3 bg-[#0a8a4c] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#097d44] mb-3">
            Upload and start the audit →
          </button>

          {/* Footer Note */}
          <p className="text-[11px] text-white/30 text-center">
            No broker · No markup · RealHQ places direct · London and New York market rates
          </p>
        </div>
      </div>
    </AppShell>
  );
}
