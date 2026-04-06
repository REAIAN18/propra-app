"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

type CashFlowRow = {
  year: number;
  grossRent: number;
  vacancy: number;
  opex: number;
  noi: number;
  debtService: number;
  cashFlow: number;
};

type SensitivityCell = {
  label: string;
  value: number;
};

type UnderwritingData = {
  deal: {
    id: string;
    address: string;
    assetType: string;
    askingPrice: number;
    currency: string;
  };
  assumptions: {
    purchasePrice: number;
    passingRent: number;
    rentGrowthPct: number;
    exitCapRate: number;
    vacancy: number;
    opexPct: number;
    capexAnnual: number;
    ltv: number;
    holdPeriodYears: number;
  };
  returns: {
    leveragedIRR: number;
    equityMultiple: number;
    cashOnCash: number;
    npv: number;
  };
  financing: {
    purchasePrice: number;
    debtAmount: number;
    equityNeeded: number;
    ltv: number;
    interestRate: number;
    annualDebtService: number;
  };
  cashFlows: CashFlowRow[];
  sensitivity?: {
    capRates: SensitivityCell[];
    growthRates: SensitivityCell[];
    matrix: number[][];
    currentCapRateIdx: number;
    currentGrowthIdx: number;
  };
};

export default function UnderwritePage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [data, setData] = useState<UnderwritingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingIM, setGeneratingIM] = useState(false);
  const [generatingTeaser, setGeneratingTeaser] = useState(false);

  // Editable assumptions (local state for sliders)
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [passingRent, setPassingRent] = useState(0);
  const [rentGrowthPct, setRentGrowthPct] = useState(2.5);
  const [exitCapRate, setExitCapRate] = useState(5.5);
  const [vacancy, setVacancy] = useState(5);
  const [opexPct, setOpexPct] = useState(15);
  const [capexAnnual, setCapexAnnual] = useState(10000);
  const [ltv, setLtv] = useState(65);

  // Fetch initial data
  useEffect(() => {
    if (!dealId) return;
    fetchUnderwriting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  // Refetch when assumptions change (debounced)
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      fetchUnderwriting();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasePrice, passingRent, rentGrowthPct, exitCapRate, vacancy, opexPct, capexAnnual, ltv]);

  const fetchUnderwriting = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        purchasePrice: String(purchasePrice || data?.deal.askingPrice || 0),
        passingRent: String(passingRent || data?.assumptions.passingRent || 0),
        rentGrowthPct: String(rentGrowthPct),
        exitCapRate: String(exitCapRate),
        vacancy: String(vacancy),
        opexPct: String(opexPct),
        capexAnnual: String(capexAnnual),
        ltv: String(ltv),
        holdPeriodYears: "10",
      });

      const res = await fetch(`/api/scout/deals/${dealId}/underwrite?${params}`);
      const json = await res.json();

      if (res.ok) {
        setData(json);
        // Initialize sliders on first load
        if (!purchasePrice) {
          setPurchasePrice(json.assumptions.purchasePrice);
          setPassingRent(json.assumptions.passingRent);
          setRentGrowthPct(json.assumptions.rentGrowthPct);
          setExitCapRate(json.assumptions.exitCapRate);
          setVacancy(json.assumptions.vacancy);
          setOpexPct(json.assumptions.opexPct);
          setCapexAnnual(json.assumptions.capexAnnual);
          setLtv(json.assumptions.ltv);
        }
      }
    } catch (error) {
      console.error("Failed to fetch underwriting:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetDefaults = () => {
    if (!data) return;
    setPurchasePrice(data.deal.askingPrice);
    setPassingRent(data.assumptions.passingRent);
    setRentGrowthPct(2.5);
    setExitCapRate(5.5);
    setVacancy(5);
    setOpexPct(15);
    setCapexAnnual(10000);
    setLtv(65);
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
          <div className="text-center text-[var(--tx3)] mt-12">Loading underwriting...</div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh" }}>
          <div className="text-center text-[var(--tx3)] mt-12">Failed to load underwriting data</div>
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
        <h1 className="text-[28px] font-medium text-[var(--tx)] mb-2">Full Underwriting</h1>
        <p className="text-[13px] text-[var(--tx3)] mb-6">
          10-year DCF, adjustable assumptions, sensitivity analysis, and leveraged returns.
        </p>

        {/* Assumptions Card */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">Assumptions</h4>
            <button
              onClick={resetDefaults}
              className="text-[11px] text-[var(--acc)] hover:underline cursor-pointer"
            >
              Reset to defaults
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Purchase Price */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Purchase price</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{formatCurrencyFull(purchasePrice)}</span>
                </div>
                <input
                  type="range"
                  min={data.deal.askingPrice * 0.8}
                  max={data.deal.askingPrice * 1.2}
                  step={10000}
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((purchasePrice - data.deal.askingPrice * 0.8) / (data.deal.askingPrice * 0.4)) * 100}%, var(--bdr) ${((purchasePrice - data.deal.askingPrice * 0.8) / (data.deal.askingPrice * 0.4)) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Passing Rent */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Passing rent</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{formatCurrency(passingRent)}/yr</span>
                </div>
                <input
                  type="range"
                  min={passingRent * 0.5}
                  max={passingRent * 1.5}
                  step={1000}
                  value={passingRent}
                  onChange={(e) => setPassingRent(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((passingRent - passingRent * 0.5) / (passingRent)) * 100}%, var(--bdr) ${((passingRent - passingRent * 0.5) / (passingRent)) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Rent Growth */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Rent growth (%/yr)</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{rentGrowthPct.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={rentGrowthPct}
                  onChange={(e) => setRentGrowthPct(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(rentGrowthPct / 5) * 100}%, var(--bdr) ${(rentGrowthPct / 5) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Exit Cap Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Exit cap rate</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{exitCapRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={8}
                  step={0.1}
                  value={exitCapRate}
                  onChange={(e) => setExitCapRate(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((exitCapRate - 4) / 4) * 100}%, var(--bdr) ${((exitCapRate - 4) / 4) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Vacancy */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Vacancy</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{vacancy.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={vacancy}
                  onChange={(e) => setVacancy(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(vacancy / 20) * 100}%, var(--bdr) ${(vacancy / 20) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* OpEx */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">OpEx (%)</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{opexPct.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={opexPct}
                  onChange={(e) => setOpexPct(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((opexPct - 5) / 25) * 100}%, var(--bdr) ${((opexPct - 5) / 25) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Capex */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Capex (annual)</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{formatCurrency(capexAnnual)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50000}
                  step={1000}
                  value={capexAnnual}
                  onChange={(e) => setCapexAnnual(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(capexAnnual / 50000) * 100}%, var(--bdr) ${(capexAnnual / 50000) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* LTV */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">LTV</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{ltv.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={ltv}
                  onChange={(e) => setLtv(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(ltv / 80) * 100}%, var(--bdr) ${(ltv / 80) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Returns Summary */}
        <div className="grid grid-cols-4 gap-[1px] bg-[var(--bdr)] border border-[var(--bdr)] rounded-[14px] overflow-hidden mb-4">
          <div className="bg-[var(--s1)] px-3 py-4 text-center">
            <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
              Leveraged IRR
            </div>
            <div className="text-[22px] font-serif text-[var(--grn)]">
              {data.returns.leveragedIRR.toFixed(1)}%
            </div>
          </div>
          <div className="bg-[var(--s1)] px-3 py-4 text-center">
            <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
              Equity Multiple
            </div>
            <div className="text-[22px] font-serif text-[var(--grn)]">
              {data.returns.equityMultiple.toFixed(2)}×
            </div>
          </div>
          <div className="bg-[var(--s1)] px-3 py-4 text-center">
            <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
              Cash-on-Cash
            </div>
            <div className="text-[22px] font-serif text-[var(--grn)]">
              {data.returns.cashOnCash.toFixed(1)}%
            </div>
          </div>
          <div className="bg-[var(--s1)] px-3 py-4 text-center">
            <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
              NPV
            </div>
            <div className="text-[22px] font-serif text-[var(--grn)]">
              {formatCurrency(data.returns.npv)}
            </div>
          </div>
        </div>

        {/* 10-Year Cash Flow Table */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">10-Year Cash Flow Projection</h4>
            <button className="text-[11px] text-[var(--acc)] hover:underline cursor-pointer">
              Download as Excel →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  <th className="px-3 py-2 text-left text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">Year</th>
                  <th className="px-3 py-2 text-right text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">Gross Rent</th>
                  <th className="px-3 py-2 text-right text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">Vacancy</th>
                  <th className="px-3 py-2 text-right text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">OpEx</th>
                  <th className="px-3 py-2 text-right text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">NOI</th>
                  <th className="px-3 py-2 text-right text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">Debt Service</th>
                  <th className="px-3 py-2 text-right text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {data.cashFlows.map((row, idx) => (
                  <tr key={row.year} className={idx < data.cashFlows.length - 1 ? "border-b border-[var(--bdr)]" : ""}>
                    <td className="px-3 py-2 text-[var(--tx)]">
                      {row.year === 0 ? "Yr 0" : row.year === 10 ? "Yr 10 + Exit" : `Yr ${row.year}`}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--tx)]">
                      {row.year === 0 ? "—" : formatCurrency(row.grossRent)}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--red)]">
                      {row.year === 0 ? "—" : `−${formatCurrency(row.vacancy)}`}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--red)]">
                      {row.year === 0 ? "—" : `−${formatCurrency(row.opex)}`}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--grn)]">
                      {row.year === 0 ? "—" : formatCurrency(row.noi)}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--red)]">
                      {row.year === 0 ? "—" : `−${formatCurrency(row.debtService)}`}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${row.cashFlow < 0 ? "text-[var(--red)]" : "text-[var(--grn)]"}`}>
                      {row.cashFlow < 0 ? `−${formatCurrency(Math.abs(row.cashFlow))}` : formatCurrency(row.cashFlow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sensitivity Matrix */}
        {data.sensitivity && (
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--bdr)]">
              <h4 className="text-[13px] font-medium text-[var(--tx)]">Sensitivity — IRR by Cap Rate × Rent Growth</h4>
              <p className="text-[11px] text-[var(--tx3)] mt-0.5">
                Levered IRR at each combination. Highlighted cell = current assumption.
              </p>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider">
                      Exit Cap Rate ↓ / Growth →
                    </th>
                    {data.sensitivity.growthRates.map((g, gi) => (
                      <th
                        key={gi}
                        className={`px-3 py-2 text-center text-[8px] font-mono font-medium uppercase tracking-wider ${
                          gi === data.sensitivity!.currentGrowthIdx ? "text-[var(--acc)]" : "text-[var(--tx3)]"
                        }`}
                      >
                        {g.label} growth
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sensitivity.capRates.map((cr, ci) => (
                    <tr key={ci} className={ci < data.sensitivity!.capRates.length - 1 ? "border-b border-[var(--bdr)]" : ""}>
                      <td className={`px-3 py-3 font-mono text-[10px] font-medium ${
                        ci === data.sensitivity!.currentCapRateIdx ? "text-[var(--acc)]" : "text-[var(--tx2)]"
                      }`}>
                        {cr.value.toFixed(1)}% cap
                      </td>
                      {data.sensitivity.matrix[ci].map((irr, gi) => {
                        const isCurrent = ci === data.sensitivity!.currentCapRateIdx && gi === data.sensitivity!.currentGrowthIdx;
                        const irrColor = irr >= 15 ? "text-[var(--grn)]" : irr >= 10 ? "text-[var(--tx)]" : "text-[var(--red)]";
                        return (
                          <td
                            key={gi}
                            className={`px-3 py-3 text-center font-mono text-[12px] font-semibold rounded ${irrColor} ${
                              isCurrent ? "bg-[var(--acc-lt)] border border-[var(--acc-bdr)]" : ""
                            }`}
                          >
                            {irr.toFixed(1)}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
            className="flex-1 px-4 py-3 bg-[var(--acc)] text-white rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--grn)" }}
          >
            {generatingTeaser ? "Generating..." : "Generate 2-Page Teaser →"}
          </button>
        </div>
        <div className="flex gap-2 mb-3">
          <button className="flex-1 px-4 py-3 bg-[var(--grn)] text-white rounded-lg text-[13px] font-medium hover:opacity-90">
            Add to pipeline →
          </button>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => router.push(`/scout/${dealId}/finance`)}
            className="flex-1 px-4 py-3 bg-[var(--s1)] text-[var(--tx)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:bg-[var(--s2)]"
          >
            View finance options →
          </button>
        </div>
        <button
          onClick={() => router.push('/scout')}
          className="w-full px-4 py-3 bg-[var(--s1)] text-[var(--tx)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:bg-[var(--s2)]"
        >
          ← Back to deals
        </button>
      </div>
    </AppShell>
  );
}
