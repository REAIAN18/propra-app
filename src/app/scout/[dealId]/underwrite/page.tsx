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
};

type ScenarioAssumptions = {
  purchasePrice: number;
  passingRent: number;
  rentGrowthPct: number;
  exitCapRate: number;
  vacancy: number;
  opexPct: number;
  capexAnnual: number;
  ltv: number;
};

type Scenario = {
  id: "base" | "bear" | "bull";
  name: string;
  label: string;
  color: string;
  thesis: string;
  assumptions: ScenarioAssumptions;
};

const SCENARIO_DEFAULTS: Record<"base" | "bear" | "bull", Scenario> = {
  base: {
    id: "base",
    name: "Base Case",
    label: "Base",
    color: "var(--acc)",
    thesis: "Market-rate assumptions. Stable rent growth, normalized capex, conservative cap rate exit.",
    assumptions: {
      purchasePrice: 0,
      passingRent: 0,
      rentGrowthPct: 2.5,
      exitCapRate: 5.5,
      vacancy: 5,
      opexPct: 15,
      capexAnnual: 10000,
      ltv: 65,
    },
  },
  bear: {
    id: "bear",
    name: "Bear Case",
    label: "Bear",
    color: "var(--red)",
    thesis: "Downside scenario. Lower rent growth, higher vacancy, higher opex costs, lower exit cap rate.",
    assumptions: {
      purchasePrice: 0,
      passingRent: 0,
      rentGrowthPct: 0.5,
      exitCapRate: 6.5,
      vacancy: 12,
      opexPct: 22,
      capexAnnual: 15000,
      ltv: 65,
    },
  },
  bull: {
    id: "bull",
    name: "Bull Case",
    label: "Bull",
    color: "var(--grn)",
    thesis: "Upside scenario. Strong rent growth, minimal vacancy, efficient ops, higher exit multiple.",
    assumptions: {
      purchasePrice: 0,
      passingRent: 0,
      rentGrowthPct: 4.5,
      exitCapRate: 4.5,
      vacancy: 2,
      opexPct: 10,
      capexAnnual: 5000,
      ltv: 65,
    },
  },
};

export default function UnderwritePage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [data, setData] = useState<UnderwritingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingIM, setGeneratingIM] = useState(false);
  const [generatingTeaser, setGeneratingTeaser] = useState(false);
  const [activeScenario, setActiveScenario] = useState<"base" | "bear" | "bull">("base");

  // Editable assumptions per scenario
  const [scenarios, setScenarios] = useState<Record<"base" | "bear" | "bull", Scenario>>(SCENARIO_DEFAULTS);

  // Results per scenario
  const [scenarioResults, setScenarioResults] = useState<Record<"base" | "bear" | "bull", UnderwritingData | null>>({
    base: null,
    bear: null,
    bull: null,
  });

  // Fetch initial deal data and calculate all scenarios
  useEffect(() => {
    if (!dealId) return;
    fetchAllScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  // Refetch when scenarios change (debounced)
  useEffect(() => {
    if (!scenarioResults.base) return;
    const timer = setTimeout(() => {
      fetchAllScenarios();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios]);

  const fetchAllScenarios = async () => {
    setLoading(true);
    try {
      const results: Record<"base" | "bear" | "bull", UnderwritingData | null> = {
        base: null,
        bear: null,
        bull: null,
      };

      for (const scenarioId of ["base", "bear", "bull"] as const) {
        const scenario = scenarios[scenarioId];
        const params = new URLSearchParams({
          purchasePrice: String(scenario.assumptions.purchasePrice || 0),
          passingRent: String(scenario.assumptions.passingRent || 0),
          rentGrowthPct: String(scenario.assumptions.rentGrowthPct),
          exitCapRate: String(scenario.assumptions.exitCapRate),
          vacancy: String(scenario.assumptions.vacancy),
          opexPct: String(scenario.assumptions.opexPct),
          capexAnnual: String(scenario.assumptions.capexAnnual),
          ltv: String(scenario.assumptions.ltv),
          holdPeriodYears: "10",
        });

        const res = await fetch(`/api/scout/deals/${dealId}/underwrite?${params}`);
        const json = await res.json();

        if (res.ok) {
          results[scenarioId] = json;
          // Initialize scenarios on first load
          if (!scenario.assumptions.purchasePrice) {
            setScenarios((prev) => ({
              ...prev,
              [scenarioId]: {
                ...prev[scenarioId],
                assumptions: {
                  ...prev[scenarioId].assumptions,
                  purchasePrice: json.assumptions.purchasePrice,
                  passingRent: json.assumptions.passingRent,
                },
              },
            }));
          }
        }
      }

      setScenarioResults(results);
    } catch (error) {
      console.error("Failed to fetch underwriting scenarios:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateScenarioAssumption = (scenarioId: "base" | "bear" | "bull", key: keyof ScenarioAssumptions, value: number) => {
    setScenarios((prev) => ({
      ...prev,
      [scenarioId]: {
        ...prev[scenarioId],
        assumptions: {
          ...prev[scenarioId].assumptions,
          [key]: value,
        },
      },
    }));
  };

  const resetScenario = (scenarioId: "base" | "bear" | "bull") => {
    setScenarios((prev) => ({
      ...prev,
      [scenarioId]: SCENARIO_DEFAULTS[scenarioId],
    }));
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

  if (loading && !scenarioResults.base) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh" }}>
          <div className="text-center text-[var(--tx3)] mt-12">Loading scenarios...</div>
        </div>
      </AppShell>
    );
  }

  const activeData = scenarioResults[activeScenario];
  if (!activeData) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh" }}>
          <div className="text-center text-[var(--tx3)] mt-12">Failed to load scenario data</div>
        </div>
      </AppShell>
    );
  }

  const sym = activeData.deal.currency === "GBP" ? "£" : "$";

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}k`;
    return `${sym}${Math.round(val).toLocaleString()}`;
  };

  const formatCurrencyFull = (val: number) => {
    return `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const currentScenario = scenarios[activeScenario];

  return (
    <AppShell>
      <TopBar />
      <div className="p-6" style={{ background: "var(--bg)", minHeight: "100vh", maxWidth: "1000px", margin: "0 auto" }}>

        {/* Page Header */}
        <div className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">
          {activeData.deal.address} · {formatCurrency(activeData.deal.askingPrice)}
        </div>
        <h1 className="text-[28px] font-medium text-[var(--tx)] mb-2">Underwriting Scenarios</h1>
        <p className="text-[13px] text-[var(--tx3)] mb-6">
          Three scenarios: Base Case, Bear Case, and Bull Case. Each with distinct assumptions and projected returns.
        </p>

        {/* Scenario Tabs */}
        <div className="flex gap-3 mb-6">
          {(["base", "bear", "bull"] as const).map((scenarioId) => (
            <button
              key={scenarioId}
              onClick={() => setActiveScenario(scenarioId)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeScenario === scenarioId
                  ? "bg-[var(--s2)] border border-[var(--acc)] text-[var(--tx)]"
                  : "bg-[var(--s1)] border border-[var(--bdr)] text-[var(--tx2)] hover:border-[var(--tx3)]"
              }`}
              style={
                activeScenario === scenarioId
                  ? { borderColor: scenarios[scenarioId].color }
                  : {}
              }
            >
              {scenarios[scenarioId].name}
            </button>
          ))}
        </div>

        {/* Scenario Thesis */}
        <div className="bg-[var(--s2)] border border-[var(--bdr)] rounded-[14px] p-4 mb-6">
          <div className="text-[12px] text-[var(--tx3)]">
            <strong>Thesis:</strong> {currentScenario.thesis}
          </div>
        </div>

        {/* Assumptions Card */}
        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[14px] mb-4">
          <div className="px-5 py-3.5 border-b border-[var(--bdr)] flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-[var(--tx)]">Assumptions</h4>
            <button
              onClick={() => resetScenario(activeScenario)}
              className="text-[11px] text-[var(--acc)] hover:underline cursor-pointer"
            >
              Reset scenario
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Purchase Price */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Purchase price</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{formatCurrencyFull(currentScenario.assumptions.purchasePrice)}</span>
                </div>
                <input
                  type="range"
                  min={activeData.deal.askingPrice * 0.8}
                  max={activeData.deal.askingPrice * 1.2}
                  step={10000}
                  value={currentScenario.assumptions.purchasePrice}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "purchasePrice", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((currentScenario.assumptions.purchasePrice - activeData.deal.askingPrice * 0.8) / (activeData.deal.askingPrice * 0.4)) * 100}%, var(--bdr) ${((currentScenario.assumptions.purchasePrice - activeData.deal.askingPrice * 0.8) / (activeData.deal.askingPrice * 0.4)) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Passing Rent */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Passing rent</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{formatCurrency(currentScenario.assumptions.passingRent)}/yr</span>
                </div>
                <input
                  type="range"
                  min={currentScenario.assumptions.passingRent * 0.5}
                  max={currentScenario.assumptions.passingRent * 1.5}
                  step={1000}
                  value={currentScenario.assumptions.passingRent}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "passingRent", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((currentScenario.assumptions.passingRent - currentScenario.assumptions.passingRent * 0.5) / (currentScenario.assumptions.passingRent)) * 100}%, var(--bdr) ${((currentScenario.assumptions.passingRent - currentScenario.assumptions.passingRent * 0.5) / (currentScenario.assumptions.passingRent)) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Rent Growth */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Rent growth (%/yr)</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{currentScenario.assumptions.rentGrowthPct.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={currentScenario.assumptions.rentGrowthPct}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "rentGrowthPct", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(currentScenario.assumptions.rentGrowthPct / 5) * 100}%, var(--bdr) ${(currentScenario.assumptions.rentGrowthPct / 5) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Exit Cap Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Exit cap rate</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{currentScenario.assumptions.exitCapRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={8}
                  step={0.1}
                  value={currentScenario.assumptions.exitCapRate}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "exitCapRate", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((currentScenario.assumptions.exitCapRate - 4) / 4) * 100}%, var(--bdr) ${((currentScenario.assumptions.exitCapRate - 4) / 4) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Vacancy */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Vacancy</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{currentScenario.assumptions.vacancy.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={currentScenario.assumptions.vacancy}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "vacancy", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(currentScenario.assumptions.vacancy / 20) * 100}%, var(--bdr) ${(currentScenario.assumptions.vacancy / 20) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* OpEx */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">OpEx (%)</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{currentScenario.assumptions.opexPct.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={currentScenario.assumptions.opexPct}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "opexPct", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${((currentScenario.assumptions.opexPct - 5) / 25) * 100}%, var(--bdr) ${((currentScenario.assumptions.opexPct - 5) / 25) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* Capex */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">Capex (annual)</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{formatCurrency(currentScenario.assumptions.capexAnnual)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50000}
                  step={1000}
                  value={currentScenario.assumptions.capexAnnual}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "capexAnnual", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(currentScenario.assumptions.capexAnnual / 50000) * 100}%, var(--bdr) ${(currentScenario.assumptions.capexAnnual / 50000) * 100}%, var(--bdr) 100%)`
                  }}
                />
              </div>

              {/* LTV */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--tx3)]">LTV</span>
                  <span className="text-[11px] font-medium text-[var(--tx)]">{currentScenario.assumptions.ltv.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={currentScenario.assumptions.ltv}
                  onChange={(e) => updateScenarioAssumption(activeScenario, "ltv", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--bdr)] rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--acc) 0%, var(--acc) ${(currentScenario.assumptions.ltv / 80) * 100}%, var(--bdr) ${(currentScenario.assumptions.ltv / 80) * 100}%, var(--bdr) 100%)`
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
              {activeData.returns.leveragedIRR.toFixed(1)}%
            </div>
          </div>
          <div className="bg-[var(--s1)] px-3 py-4 text-center">
            <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
              Equity Multiple
            </div>
            <div className="text-[22px] font-serif text-[var(--grn)]">
              {activeData.returns.equityMultiple.toFixed(2)}×
            </div>
          </div>
          <div className="bg-[var(--s1)] px-3 py-4 text-center">
            <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
              Cash-on-Cash
            </div>
            <div className="text-[22px] font-serif text-[var(--grn)]">
              {activeData.returns.cashOnCash.toFixed(1)}%
            </div>
          </div>
          <div className="bg-[var(--s1)] px-3 py-4 text-center">
            <div className="text-[8px] font-mono font-medium text-[var(--tx3)] uppercase tracking-wider mb-1">
              NPV
            </div>
            <div className="text-[22px] font-serif text-[var(--grn)]">
              {formatCurrency(activeData.returns.npv)}
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
                {activeData.cashFlows.map((row, idx) => (
                  <tr key={row.year} className={idx < activeData.cashFlows.length - 1 ? "border-b border-[var(--bdr)]" : ""}>
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
