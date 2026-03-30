"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ── Types ─────────────────────────────────────────────────────────────

type Scenario = {
  id: string;
  name: string;
  thesis: string;
  type: "conservative" | "retrofit_compliance" | "retrofit_premium" | "owner_occupy" | "hold_as_is" | "alternative";
};

type Assumptions = {
  purchasePrice: number;
  capexAnnual: number;
  ltv: number;
  interestRate: number;
  holdPeriodYears: number;
  exitAppreciation: number;
  passingRent: number;
  rentGrowthPct: number;
  vacancy: number;
  opexPct: number;
};

type Results = {
  totalProfit: number;
  irr: number;
  dscr: number;
  capRate: number;
};

type UnderwriteData = {
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
  cashFlows: Array<{
    year: number;
    grossRent: number;
    vacancy: number;
    opex: number;
    noi: number;
    debtService: number;
    cashFlow: number;
  }>;
};

// ── Scenarios ─────────────────────────────────────────────────────────

const CONDITION_DRIVEN_SCENARIOS: Scenario[] = [
  {
    id: "conservative",
    name: "Conservative Hold",
    thesis: "Acquire at asking, minimal intervention, stabilize vacancy to market standards.",
    type: "conservative",
  },
  {
    id: "retrofit_compliance",
    name: "Retrofit to Compliance",
    thesis: "Invest in immediate code/safety upgrades, capture rent uplift to market ERV.",
    type: "retrofit_compliance",
  },
  {
    id: "retrofit_premium",
    name: "Retrofit to Premium",
    thesis: "Full repositioning with amenity upgrades, achieve 15-20% rent premium over market.",
    type: "retrofit_premium",
  },
];

const MARKET_DRIVEN_SCENARIOS: Scenario[] = [
  {
    id: "owner_occupy",
    name: "Owner-Occupy",
    thesis: "Convert to owner-occupied units, sell individually for maximum value realization.",
    type: "owner_occupy",
  },
  {
    id: "hold_as_is",
    name: "Hold As-Is",
    thesis: "Maintain current tenancy, optimize operations, harvest stable cash flow.",
    type: "hold_as_is",
  },
  {
    id: "alternative",
    name: "Alternative Play",
    thesis: "Explore change of use, planning uplift, or sale to strategic buyer.",
    type: "alternative",
  },
];

// ── Helper Functions ──────────────────────────────────────────────────

function formatCurrency(value: number | null, currency: string): string {
  if (value === null || value === undefined) return "—";
  const symbol = currency === "GBP" ? "£" : "$";
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}k`;
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

// ── Main Component ────────────────────────────────────────────────────

export default function UnderwriteScenariosPage() {
  const params = useParams();
  const dealId = params?.dealId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UnderwriteData | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState("conservative");
  const [assumptions, setAssumptions] = useState<Assumptions>({
    purchasePrice: 0,
    capexAnnual: 0,
    ltv: 65,
    interestRate: 5,
    holdPeriodYears: 10,
    exitAppreciation: 2.5,
    passingRent: 0,
    rentGrowthPct: 2.5,
    vacancy: 5,
    opexPct: 15,
  });

  // Determine if property is condition-driven or market-driven
  // (Simplified: use condition-driven for multifamily, market-driven for others)
  const scenarios = data?.deal.assetType.toLowerCase().includes("multi")
    ? CONDITION_DRIVEN_SCENARIOS
    : MARKET_DRIVEN_SCENARIOS;

  // Fetch initial data
  useEffect(() => {
    if (!dealId) return;

    fetch(`/api/scout/deals/${dealId}/underwrite`)
      .then((res) => res.json())
      .then((result: UnderwriteData) => {
        setData(result);
        setAssumptions({
          purchasePrice: result.assumptions.purchasePrice,
          capexAnnual: result.assumptions.capexAnnual,
          ltv: result.assumptions.ltv,
          interestRate: 5,
          holdPeriodYears: result.assumptions.holdPeriodYears,
          exitAppreciation: 2.5,
          passingRent: result.assumptions.passingRent,
          rentGrowthPct: result.assumptions.rentGrowthPct,
          vacancy: result.assumptions.vacancy,
          opexPct: result.assumptions.opexPct,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch underwrite data:", err);
        setLoading(false);
      });
  }, [dealId]);

  // Recalculate when assumptions change
  useEffect(() => {
    if (!dealId || !data) return;

    const params = new URLSearchParams({
      purchasePrice: String(assumptions.purchasePrice),
      passingRent: String(assumptions.passingRent),
      rentGrowthPct: String(assumptions.rentGrowthPct),
      exitCapRate: String(5.5), // Use default exit cap
      vacancy: String(assumptions.vacancy),
      opexPct: String(assumptions.opexPct),
      capexAnnual: String(assumptions.capexAnnual),
      ltv: String(assumptions.ltv),
      holdPeriodYears: String(assumptions.holdPeriodYears),
    });

    fetch(`/api/scout/deals/${dealId}/underwrite?${params}`)
      .then((res) => res.json())
      .then((result: UnderwriteData) => {
        setData(result);
      })
      .catch((err) => {
        console.error("Failed to recalculate:", err);
      });
  }, [dealId, assumptions, data?.deal.id]);

  // Calculate results
  const results: Results = data
    ? {
        totalProfit: data.returns.npv,
        irr: data.returns.leveragedIRR,
        dscr: calculateDSCR(data),
        capRate: calculateCapRate(data),
      }
    : { totalProfit: 0, irr: 0, dscr: 0, capRate: 0 };

  function calculateDSCR(data: UnderwriteData): number {
    if (data.cashFlows.length < 2) return 0;
    const firstYearCF = data.cashFlows[1];
    return firstYearCF.debtService > 0
      ? firstYearCF.noi / firstYearCF.debtService
      : 0;
  }

  function calculateCapRate(data: UnderwriteData): number {
    if (data.cashFlows.length < 2) return 0;
    const firstYearCF = data.cashFlows[1];
    return data.financing.purchasePrice > 0
      ? (firstYearCF.noi / data.financing.purchasePrice) * 100
      : 0;
  }

  function handleExportExcel() {
    if (!data) return;

    // Generate CSV content
    const csv = generateCSV(data, assumptions, results, activeScenario);

    // Create blob and download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `underwrite_${data.deal.address}_${activeScenario.name.replace(/\s+/g, "_")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportPDF() {
    // Use browser's built-in print functionality
    window.print();
  }

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  if (loading) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-8 text-center">Loading...</div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <TopBar />
        <div className="p-8 text-center">Failed to load deal data</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar />
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--tx)" }}>
            Underwrite Scenarios
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--tx)", opacity: 0.7 }}>
            {data.deal.address}
          </p>
        </div>

        {/* Scenario Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--s1)" }}>
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setActiveScenarioId(scenario.id)}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              style={{
                color: activeScenarioId === scenario.id ? "var(--acc)" : "var(--tx)",
                borderColor: activeScenarioId === scenario.id ? "var(--acc)" : "transparent",
                opacity: activeScenarioId === scenario.id ? 1 : 0.6,
              }}
            >
              {scenario.name}
            </button>
          ))}
        </div>

        {/* Scenario Thesis */}
        <div className="mb-6 p-4 rounded" style={{ backgroundColor: "var(--s1)" }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>
            {activeScenario.name}
          </h2>
          <p className="text-sm" style={{ color: "var(--tx)", opacity: 0.8 }}>
            {activeScenario.thesis}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Assumptions */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--tx)" }}>
              Assumptions
            </h3>

            <div className="space-y-4">
              <SliderInput
                label="Purchase Price"
                value={assumptions.purchasePrice}
                onChange={(v) => setAssumptions({ ...assumptions, purchasePrice: v })}
                min={data.deal.askingPrice * 0.7}
                max={data.deal.askingPrice * 1.3}
                step={10000}
                format={(v) => formatCurrency(v, data.deal.currency)}
              />

              <SliderInput
                label="Annual Capex"
                value={assumptions.capexAnnual}
                onChange={(v) => setAssumptions({ ...assumptions, capexAnnual: v })}
                min={0}
                max={assumptions.purchasePrice * 0.05}
                step={1000}
                format={(v) => formatCurrency(v, data.deal.currency)}
              />

              <SliderInput
                label="LTV (%)"
                value={assumptions.ltv}
                onChange={(v) => setAssumptions({ ...assumptions, ltv: v })}
                min={0}
                max={80}
                step={5}
                format={(v) => `${v}%`}
              />

              <SliderInput
                label="Interest Rate (%)"
                value={assumptions.interestRate}
                onChange={(v) => setAssumptions({ ...assumptions, interestRate: v })}
                min={2}
                max={10}
                step={0.25}
                format={(v) => `${v.toFixed(2)}%`}
              />

              <SliderInput
                label="Holding Period (years)"
                value={assumptions.holdPeriodYears}
                onChange={(v) => setAssumptions({ ...assumptions, holdPeriodYears: v })}
                min={3}
                max={15}
                step={1}
                format={(v) => `${v} years`}
              />

              <SliderInput
                label="Exit Appreciation (%)"
                value={assumptions.exitAppreciation}
                onChange={(v) => setAssumptions({ ...assumptions, exitAppreciation: v })}
                min={0}
                max={10}
                step={0.5}
                format={(v) => `${v.toFixed(1)}%`}
              />

              <SliderInput
                label="Passing Rent (annual)"
                value={assumptions.passingRent}
                onChange={(v) => setAssumptions({ ...assumptions, passingRent: v })}
                min={0}
                max={assumptions.purchasePrice * 0.15}
                step={1000}
                format={(v) => formatCurrency(v, data.deal.currency)}
              />

              <SliderInput
                label="Rent Growth (%)"
                value={assumptions.rentGrowthPct}
                onChange={(v) => setAssumptions({ ...assumptions, rentGrowthPct: v })}
                min={0}
                max={10}
                step={0.5}
                format={(v) => `${v.toFixed(1)}%`}
              />

              <SliderInput
                label="Vacancy (%)"
                value={assumptions.vacancy}
                onChange={(v) => setAssumptions({ ...assumptions, vacancy: v })}
                min={0}
                max={20}
                step={1}
                format={(v) => `${v}%`}
              />

              <SliderInput
                label="Operating Expenses (%)"
                value={assumptions.opexPct}
                onChange={(v) => setAssumptions({ ...assumptions, opexPct: v })}
                min={5}
                max={40}
                step={1}
                format={(v) => `${v}%`}
              />
            </div>
          </div>

          {/* Right Column: Results */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--tx)" }}>
              Results
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <ResultCard
                label="Total Profit (NPV)"
                value={formatCurrency(results.totalProfit, data.deal.currency)}
                status={results.totalProfit > 0 ? "good" : "bad"}
              />
              <ResultCard
                label="IRR"
                value={formatPercent(results.irr)}
                status={results.irr > 12 ? "good" : results.irr > 8 ? "neutral" : "bad"}
              />
              <ResultCard
                label="DSCR"
                value={results.dscr.toFixed(2)}
                status={results.dscr > 1.25 ? "good" : results.dscr > 1.0 ? "neutral" : "bad"}
              />
              <ResultCard
                label="Cap Rate"
                value={formatPercent(results.capRate)}
                status="neutral"
              />
            </div>

            {/* Why This Works */}
            <div className="mb-6 p-4 rounded" style={{ backgroundColor: "var(--s1)" }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--tx)" }}>
                Why This Works
              </h4>
              <ul className="text-sm space-y-1" style={{ color: "var(--tx)", opacity: 0.8 }}>
                {getWhyThisWorks(activeScenario.type, results).map((reason, i) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleExportExcel}
                className="flex-1 px-4 py-2 rounded text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "var(--acc)",
                  color: "var(--bg)",
                }}
              >
                Export to Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex-1 px-4 py-2 rounded text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "var(--s2)",
                  color: "var(--tx)",
                  border: "1px solid var(--s1)",
                }}
              >
                Export to PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Sub-Components ────────────────────────────────────────────────────

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium" style={{ color: "var(--tx)" }}>
          {label}
        </label>
        <span className="text-sm font-mono" style={{ color: "var(--acc)" }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          backgroundColor: "var(--s1)",
          accentColor: "var(--acc)",
        }}
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "good" | "neutral" | "bad";
}) {
  const statusColor =
    status === "good" ? "var(--grn)" : status === "bad" ? "var(--red)" : "var(--amb)";

  return (
    <div className="p-4 rounded" style={{ backgroundColor: "var(--s1)" }}>
      <div className="text-xs mb-1" style={{ color: "var(--tx)", opacity: 0.7 }}>
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: statusColor }}>
        {value}
      </div>
    </div>
  );
}

function getWhyThisWorks(
  scenarioType: string,
  results: Results
): string[] {
  const reasons: string[] = [];

  if (results.irr > 12) {
    reasons.push("Strong IRR exceeds target return threshold");
  }
  if (results.dscr > 1.25) {
    reasons.push("Healthy debt service coverage provides downside protection");
  }
  if (results.totalProfit > 0) {
    reasons.push("Positive NPV indicates value creation above cost of capital");
  }

  if (scenarioType === "conservative") {
    reasons.push("Minimal capex risk with stable market fundamentals");
  } else if (scenarioType === "retrofit_compliance") {
    reasons.push("Compliance upgrades unlock immediate rent growth");
  } else if (scenarioType === "retrofit_premium") {
    reasons.push("Premium positioning justifies higher exit valuation");
  }

  if (reasons.length === 0) {
    reasons.push("Review assumptions — returns may not meet investment criteria");
  }

  return reasons;
}

function generateCSV(
  data: UnderwriteData,
  assumptions: Assumptions,
  results: Results,
  scenario: Scenario
): string {
  const rows: string[] = [];

  // Header
  rows.push("RealHQ - Underwrite Analysis");
  rows.push("");
  rows.push(`Property,${data.deal.address}`);
  rows.push(`Asset Type,${data.deal.assetType}`);
  rows.push(`Scenario,${scenario.name}`);
  rows.push(`Thesis,"${scenario.thesis}"`);
  rows.push("");

  // Assumptions
  rows.push("Assumptions");
  rows.push(`Purchase Price,${assumptions.purchasePrice}`);
  rows.push(`Annual Capex,${assumptions.capexAnnual}`);
  rows.push(`LTV,${assumptions.ltv}%`);
  rows.push(`Interest Rate,${assumptions.interestRate}%`);
  rows.push(`Holding Period,${assumptions.holdPeriodYears} years`);
  rows.push(`Exit Appreciation,${assumptions.exitAppreciation}%`);
  rows.push(`Passing Rent,${assumptions.passingRent}`);
  rows.push(`Rent Growth,${assumptions.rentGrowthPct}%`);
  rows.push(`Vacancy,${assumptions.vacancy}%`);
  rows.push(`Operating Expenses,${assumptions.opexPct}%`);
  rows.push("");

  // Results
  rows.push("Results");
  rows.push(`Total Profit (NPV),${results.totalProfit.toFixed(2)}`);
  rows.push(`IRR,${results.irr.toFixed(2)}%`);
  rows.push(`DSCR,${results.dscr.toFixed(2)}`);
  rows.push(`Cap Rate,${results.capRate.toFixed(2)}%`);
  rows.push("");

  // Cash Flows
  rows.push("Year-by-Year Cash Flows");
  rows.push("Year,Gross Rent,Vacancy,Operating Expenses,NOI,Debt Service,Cash Flow");
  data.cashFlows.forEach((cf) => {
    rows.push(
      `${cf.year},${cf.grossRent.toFixed(2)},${cf.vacancy.toFixed(2)},${cf.opex.toFixed(2)},${cf.noi.toFixed(2)},${cf.debtService.toFixed(2)},${cf.cashFlow.toFixed(2)}`
    );
  });

  return rows.join("\n");
}
