"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

type DealFinance = {
  loanAmount: number;
  loanRate: number;
  loanTerm: number;
  ltvPct: number;
  equityRequired: number;
  mezzAmount: number | null;
  mezzRate: number | null;
  totalCapital: number;
  leveragedIRR: number | null;
  cashOnCash: number | null;
};

type InvestorContact = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  type: string;
  status: string;
};

export default function EquityRaisePage({ params }: { params: Promise<{ dealId: string }> }) {
  const [dealId, setDealId] = useState<string>("");
  const [deal, setDeal] = useState<any>(null);
  const [finance, setFinance] = useState<DealFinance | null>(null);
  const [investors, setInvestors] = useState<InvestorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [equityStructure, setEquityStructure] = useState<"100" | "50-50" | "80-20">("100");

  useEffect(() => {
    params.then((p) => {
      setDealId(p.dealId);
      fetchData(p.dealId);
    });
  }, [params]);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [dealRes, financeRes, investorsRes] = await Promise.all([
        fetch(`/api/scout/deals/${id}`),
        fetch(`/api/scout/deals/${id}/finance`),
        fetch(`/api/user/investor-contacts`),
      ]);

      if (dealRes.ok) setDeal(await dealRes.json());
      if (financeRes.ok) setFinance(await financeRes.json());
      if (investorsRes.ok) setInvestors(await investorsRes.json());
    } catch (error) {
      console.error("Error fetching equity raise data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !deal) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-8 text-[var(--tx3)]">Loading...</div>
      </AppShell>
    );
  }

  const price = deal.askingPrice ?? deal.guidePrice ?? 0;
  const equityReq = finance?.equityRequired ?? price * 0.35;
  const leveragedIRR = finance?.leveragedIRR ?? 11.8;

  // Calculate equity structure options
  const structure100 = {
    equity: equityReq,
    irr: leveragedIRR,
  };

  const structure5050 = {
    equity: equityReq / 2,
    irr: leveragedIRR * 0.8, // After JV structure costs
  };

  const structure8020 = {
    gpEquity: equityReq * 0.2,
    lpEquity: equityReq * 0.8,
    gpIRR: leveragedIRR * 1.54, // GP gets promote
    lpIRR: leveragedIRR * 0.85,
  };

  return (
    <AppShell>
      <TopBar />
      <div className="p-8 max-w-[1080px]">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/scout`}
            className="text-[11px] text-[var(--tx3)] hover:text-[var(--tx)] mb-2 inline-block"
          >
            ← Back to Scout
          </Link>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx3)] mb-2">
            {deal.address}
          </div>
          <h1 className="text-[24px] font-serif text-[var(--tx)] mb-2">Equity Raise</h1>
          <div className="text-[13px] text-[var(--tx3)]">
            Capital stack modeling, investor outreach, and fundraising tools
          </div>
        </div>

        {/* Capital Stack Visualization */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-6 mb-4">
          <h3 className="text-[15px] font-medium text-[var(--tx)] mb-4">Capital Stack</h3>
          <div className="flex gap-1 h-[200px] mb-4">
            <div
              className="bg-[#4a5568] rounded flex flex-col items-center justify-center text-center p-3"
              style={{ flex: finance?.ltvPct ?? 65 }}
            >
              <div className="text-[11px] font-mono uppercase text-white/60 mb-1">Debt</div>
              <div className="text-[16px] font-serif text-white">
                ${((finance?.loanAmount ?? price * 0.65) / 1000).toFixed(0)}k
              </div>
              <div className="text-[10px] text-white/50 mt-1">
                {finance?.ltvPct ?? 65}% LTV
              </div>
            </div>
            <div
              className="bg-[var(--acc)] rounded flex flex-col items-center justify-center text-center p-3"
              style={{ flex: 100 - (finance?.ltvPct ?? 65) }}
            >
              <div className="text-[11px] font-mono uppercase text-white/80 mb-1">Equity</div>
              <div className="text-[16px] font-serif text-white">
                ${(equityReq / 1000).toFixed(0)}k
              </div>
              <div className="text-[10px] text-white/70 mt-1">
                {(100 - (finance?.ltvPct ?? 65)).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Equity Requirement Options */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-medium text-[var(--tx)]">
              Equity Requirement — ${(equityReq / 1000).toFixed(0)}k
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* 100% Own */}
            <button
              onClick={() => setEquityStructure("100")}
              className={`bg-[var(--s2)] border rounded-lg p-4 text-center transition-all ${
                equityStructure === "100"
                  ? "border-[var(--acc-bdr)] ring-2 ring-[var(--acc-dim)]"
                  : "border-[var(--bdr)] hover:border-[var(--tx3)]"
              }`}
            >
              <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-1">
                100% Own Equity
              </div>
              <div className="text-[17px] font-serif text-[var(--tx)]">
                ${(structure100.equity / 1000).toFixed(0)}k
              </div>
              <div className="text-[10px] text-[var(--grn)] mt-1">
                {structure100.irr.toFixed(1)}% IRR to you
              </div>
            </button>

            {/* 50/50 JV */}
            <button
              onClick={() => setEquityStructure("50-50")}
              className={`bg-[var(--s2)] border rounded-lg p-4 text-center transition-all ${
                equityStructure === "50-50"
                  ? "border-[var(--acc-bdr)] ring-2 ring-[var(--acc-dim)]"
                  : "border-[var(--bdr)] hover:border-[var(--tx3)]"
              }`}
            >
              <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-1">
                50/50 JV
              </div>
              <div className="text-[17px] font-serif text-[var(--acc)]">
                ${(structure5050.equity / 1000).toFixed(0)}k each
              </div>
              <div className="text-[10px] text-[var(--tx3)] mt-1">
                {structure5050.irr.toFixed(1)}% IRR (after promote)
              </div>
            </button>

            {/* 80/20 LP/GP */}
            <button
              onClick={() => setEquityStructure("80-20")}
              className={`bg-[var(--s2)] border rounded-lg p-4 text-center transition-all ${
                equityStructure === "80-20"
                  ? "border-[var(--acc-bdr)] ring-2 ring-[var(--acc-dim)]"
                  : "border-[var(--bdr)] hover:border-[var(--tx3)]"
              }`}
            >
              <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-1">
                80/20 LP/GP
              </div>
              <div className="text-[17px] font-serif text-[var(--acc)]">
                ${(structure8020.gpEquity / 1000).toFixed(0)}k your equity
              </div>
              <div className="text-[10px] text-[var(--grn)] mt-1">
                {structure8020.gpIRR.toFixed(1)}% GP IRR (with promote)
              </div>
            </button>
          </div>
        </div>

        {/* Investors List */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-medium text-[var(--tx)]">Investors</h3>
            <Link
              href="/settings/investors"
              className="text-[11px] text-[var(--acc)] hover:text-[var(--acc)]/80"
            >
              + Add investor
            </Link>
          </div>

          {investors.length === 0 ? (
            <div className="text-center py-8 text-[var(--tx3)] text-[13px]">
              No investors added yet. Add investors to share deal opportunities.
            </div>
          ) : (
            <div className="space-y-1">
              {investors.map((investor) => (
                <div
                  key={investor.id}
                  className="flex items-center justify-between p-3 hover:bg-[var(--s2)] rounded transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-[var(--tx)]">
                      {investor.name}
                    </div>
                    {investor.company && (
                      <div className="text-[11px] text-[var(--tx3)]">{investor.company}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono uppercase px-2 py-1 bg-[var(--s3)] text-[var(--tx3)] rounded">
                      {investor.type}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-1 rounded ${
                        investor.status === "interested"
                          ? "bg-[var(--grn-lt)] text-[var(--grn)] border border-[var(--grn-bdr)]"
                          : investor.status === "contacted"
                          ? "bg-[var(--acc-lt)] text-[var(--acc)] border border-[var(--acc-bdr)]"
                          : "bg-[var(--s3)] text-[var(--tx3)]"
                      }`}
                    >
                      {investor.status}
                    </span>
                    <span className="text-[var(--tx3)] text-[14px]">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-3">
          <button
            disabled
            className="flex-1 px-5 py-3 bg-[var(--acc)] text-white rounded-lg text-[13px] font-semibold hover:bg-[#6d5ce0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Investment Memorandum →
          </button>
          <button
            disabled
            className="flex-1 px-5 py-3 bg-[var(--grn)] text-white rounded-lg text-[13px] font-semibold hover:bg-[#2ab57d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate 2-Page Teaser →
          </button>
        </div>
        <div className="flex gap-3">
          <button
            disabled
            className="flex-1 px-5 py-2.5 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send IM to selected investors →
          </button>
          <button
            disabled
            className="flex-1 px-5 py-2.5 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Share via portal →
          </button>
        </div>
      </div>
    </AppShell>
  );
}
