"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

type CapitalStack = {
  debt: { amount: number; percentage: number; label: string };
  equity: { amount: number; percentage: number; label: string };
  total: number;
};

type DebtTerms = {
  loanAmount: number;
  ltv: number;
  sofrRate: number;
  spreadBps: number;
  allInRate: number;
  termYears: number;
  structure: string;
  annualDebtService: number;
  dscr: number;
  dscr_status: "good" | "acceptable" | "weak";
  cashAfterDebt: number;
};

type Lender = {
  name: string;
  description: string;
  rateRange: string;
  ltv: string;
};

type EquityScenario = {
  structure: string;
  equityRequired: number;
  irr: number;
  description: string;
  color: string;
};

type FinanceData = {
  deal: {
    id: string;
    address: string;
    assetType: string;
    askingPrice: number;
    currency: string;
    region: string | null;
  };
  capitalStack: CapitalStack;
  debtTerms: DebtTerms;
  lenders: Lender[];
  equityScenarios: EquityScenario[];
};

export default function FinancePage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingIM, setGeneratingIM] = useState(false);
  const [generatingTeaser, setGeneratingTeaser] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    fetchFinance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scout/deals/${dealId}/finance`);
      const json = await res.json();

      if (res.ok) {
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateIM = async () => {
    setGeneratingIM(true);
    try {
      const res = await fetch(`/api/scout/deals/${dealId}/im`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confidential: true }),
      });
      const json = await res.json();

      if (res.ok && json.pdfUrl) {
        // Open PDF in new tab
        const link = document.createElement("a");
        link.href = json.pdfUrl;
        link.download = `IM-${data?.deal.address.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
        link.click();
      } else {
        alert("Failed to generate Investment Memorandum. Please try again.");
      }
    } catch (error) {
      console.error("Failed to generate IM:", error);
      alert("Failed to generate Investment Memorandum. Please try again.");
    } finally {
      setGeneratingIM(false);
    }
  };

  const generateTeaser = async () => {
    setGeneratingTeaser(true);
    try {
      const res = await fetch(`/api/scout/deals/${dealId}/teaser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confidential: true }),
      });
      const json = await res.json();

      if (res.ok && json.pdfUrl) {
        // Open PDF in new tab
        const link = document.createElement("a");
        link.href = json.pdfUrl;
        link.download = `Teaser-${data?.deal.address.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
        link.click();
      } else {
        alert("Failed to generate Teaser. Please try again.");
      }
    } catch (error) {
      console.error("Failed to generate teaser:", error);
      alert("Failed to generate Teaser. Please try again.");
    } finally {
      setGeneratingTeaser(false);
    }
  };

  if (loading && !data) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh" }}>
          <div className="text-center text-[var(--tx3)] mt-12">Loading finance data...</div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh" }}>
          <div className="text-center text-[var(--tx3)] mt-12">Failed to load finance data</div>
        </div>
      </AppShell>
    );
  }

  const sym = data.deal.currency === "GBP" ? "£" : "$";

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}k`;
    return `${sym}${Math.round(val).toLocaleString()}`;
  };

  const formatCurrencyFull = (val: number) => {
    return `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <AppShell>
      <TopBar />
      <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh", maxWidth: "800px", margin: "0 auto" }}>

        {/* Page Header */}
        <div className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">
          {data.deal.address} · {formatCurrency(data.deal.askingPrice)}
        </div>
        <h1 className="text-[28px] font-medium text-[var(--tx)] mb-2">Deal Finance</h1>
        <p className="text-[13px] text-[var(--tx3)] mb-6">
          How to fund this acquisition. Indicative debt terms, equity requirement, and capital stack options.
        </p>

        {/* Capital Stack Visualization */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">Capital Stack</h4>
            <button className="text-[11px] text-[var(--acc)] hover:underline cursor-pointer">
              Adjust split →
            </button>
          </div>
          <div className="flex items-end gap-1 p-6" style={{ height: "240px" }}>
            {/* Debt Bar */}
            <div
              className="rounded-t-lg flex flex-col justify-end p-3 text-center transition-all hover:opacity-90"
              style={{
                height: `${data.capitalStack.debt.percentage * 100}%`,
                flex: 2,
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderBottom: "none",
              }}
            >
              <div className="text-[9px] font-mono font-medium uppercase tracking-wider mb-1" style={{ color: "#38bdf8" }}>
                {data.capitalStack.debt.label}
              </div>
              <div className="text-[17px] font-serif text-[var(--tx)]">
                {formatCurrency(data.capitalStack.debt.amount)}
              </div>
              <div className="text-[10px] font-light text-[var(--tx3)] mt-1">
                {(data.capitalStack.debt.percentage * 100).toFixed(0)}% LTV
              </div>
            </div>

            {/* Equity Bar */}
            <div
              className="rounded-t-lg flex flex-col justify-end p-3 text-center transition-all hover:opacity-90"
              style={{
                height: `${data.capitalStack.equity.percentage * 100}%`,
                flex: 1,
                background: "rgba(124, 106, 240, 0.15)",
                border: "1px solid rgba(124, 106, 240, 0.3)",
                borderBottom: "none",
              }}
            >
              <div className="text-[9px] font-mono font-medium uppercase tracking-wider mb-1" style={{ color: "var(--acc)" }}>
                {data.capitalStack.equity.label}
              </div>
              <div className="text-[17px] font-serif text-[var(--tx)]">
                {formatCurrency(data.capitalStack.equity.amount)}
              </div>
              <div className="text-[10px] font-light text-[var(--tx3)] mt-1">
                {(data.capitalStack.equity.percentage * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Indicative Debt Terms */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">Indicative Debt Terms</h4>
            <span className="text-[11px] text-[var(--tx3)]">
              Based on {data.deal.region} {data.deal.assetType} · {formatCurrency(data.deal.askingPrice)}
            </span>
          </div>
          <div className="divide-y divide-[var(--bdr)]">
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-[11px] text-[var(--tx3)]">Loan amount ({data.debtTerms.ltv.toFixed(0)}% LTV)</span>
              <span className="text-[13px] font-mono font-medium text-[var(--tx)]">{formatCurrencyFull(data.debtTerms.loanAmount)}</span>
            </div>
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-[11px] text-[var(--tx3)]">Indicative rate</span>
              <span className="text-[13px] font-mono font-medium text-[var(--tx)]">
                SOFR + {data.debtTerms.spreadBps}bps ({data.debtTerms.allInRate.toFixed(2)}% all-in)
              </span>
            </div>
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-[11px] text-[var(--tx3)]">Term</span>
              <span className="text-[13px] font-mono font-medium text-[var(--tx)]">
                {data.debtTerms.termYears} year · {data.debtTerms.structure}
              </span>
            </div>
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-[11px] text-[var(--tx3)]">Annual debt service</span>
              <span className="text-[13px] font-mono font-medium text-[var(--tx)]">{formatCurrencyFull(data.debtTerms.annualDebtService)}</span>
            </div>
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-[11px] text-[var(--tx3)]">DSCR</span>
              <span
                className={`text-[13px] font-mono font-medium ${
                  data.debtTerms.dscr_status === "good"
                    ? "text-[var(--grn)]"
                    : data.debtTerms.dscr_status === "acceptable"
                    ? "text-[var(--amb)]"
                    : "text-[var(--red)]"
                }`}
              >
                {data.debtTerms.dscr.toFixed(2)}× {data.debtTerms.dscr_status === "good" && "(above 1.25× minimum)"}
              </span>
            </div>
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-[11px] text-[var(--tx3)]">Cash after debt service</span>
              <span className={`text-[13px] font-mono font-medium ${data.debtTerms.cashAfterDebt > 0 ? "text-[var(--grn)]" : "text-[var(--red)]"}`}>
                {formatCurrencyFull(data.debtTerms.cashAfterDebt)}/yr
              </span>
            </div>
          </div>
        </div>

        {/* Active Lenders */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)]">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">
              Active Lenders — {data.deal.region} {data.deal.assetType}
            </h4>
          </div>
          <div className="divide-y divide-[var(--bdr)]">
            {data.lenders.map((lender, idx) => (
              <div key={idx} className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center hover:bg-[var(--s2)] transition-colors">
                <div>
                  <div className="text-[12px] font-medium text-[var(--tx)]">{lender.name}</div>
                  <div className="text-[10px] text-[var(--tx3)]">{lender.description}</div>
                </div>
                <span className="text-[11px] font-mono text-[var(--tx)]">{lender.rateRange}</span>
                <span className="text-[11px] font-mono text-[var(--tx)]">{lender.ltv}</span>
                <button className="text-[var(--acc)] text-[14px] hover:opacity-80">→</button>
              </div>
            ))}
          </div>
        </div>

        {/* Equity Section Header */}
        <div className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-3 mt-6">Equity</div>

        {/* Equity Requirement */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">
              Equity Requirement — {formatCurrency(data.capitalStack.equity.amount)}
            </h4>
            <button className="text-[11px] text-[var(--acc)] hover:underline cursor-pointer">
              Model JV structure →
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {data.equityScenarios.map((scenario, idx) => (
                <div key={idx} className="bg-[var(--s2)] rounded-lg p-3 text-center">
                  <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
                    {scenario.structure}
                  </div>
                  <div className="text-[17px] font-serif text-[var(--tx)] mb-1">
                    {formatCurrency(scenario.equityRequired)}
                    {scenario.structure !== "100% Own Equity" && <span className="text-[11px] text-[var(--tx3)]"> your equity</span>}
                  </div>
                  <div
                    className={`text-[10px] font-light ${
                      scenario.color === "green" ? "text-[var(--grn)]" : "text-[var(--acc)]"
                    }`}
                  >
                    {scenario.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Placeholder for Investors (future feature) */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4 opacity-50">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">Investors</h4>
            <button className="text-[11px] text-[var(--acc)] hover:underline cursor-pointer">
              + Add investor
            </button>
          </div>
          <div className="p-5 text-center text-[11px] text-[var(--tx3)]">
            Investor management coming soon
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={generateIM}
            disabled={generatingIM}
            className="flex-1 px-4 py-3 bg-[var(--acc)] text-white rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingIM ? "Generating..." : "Generate Investment Memorandum →"}
          </button>
          <button
            onClick={generateTeaser}
            disabled={generatingTeaser}
            className="flex-1 px-4 py-3 bg-[var(--grn)] text-white rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingTeaser ? "Generating..." : "Generate 2-Page Teaser →"}
          </button>
        </div>
        <button className="w-full px-4 py-3 bg-[var(--s1)] text-[var(--tx)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:bg-[var(--s2)] mb-3">
          Send IM to selected investors →
        </button>
        <button className="w-full px-4 py-3 bg-[var(--s1)] text-[var(--tx)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:bg-[var(--s2)] mb-3">
          Share via portal →
        </button>

        {/* Back Button */}
        <button
          onClick={() => router.push(`/scout/${dealId}/underwrite`)}
          className="w-full px-4 py-3 bg-[var(--s1)] text-[var(--tx)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:bg-[var(--s2)]"
        >
          ← Back to underwriting
        </button>
      </div>
    </AppShell>
  );
}
