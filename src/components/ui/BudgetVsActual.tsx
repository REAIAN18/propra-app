"use client";

import { useState, useEffect } from "react";

interface BudgetData {
  budgetedRevenue: number;
  budgetedOpEx: number;
  budgetedNOI: number;
  budgetedInsurance: number;
  budgetedEnergy: number;
  budgetedMaintenance: number;
  budgetedManagement: number;
}

interface ActualData {
  grossRevenue: number;
  insurance: number;
  energy: number;
  maintenance: number;
  management: number;
  noi: number;
}

interface BudgetVsActualProps {
  assetId: string;
  year?: number;
  currency?: "USD" | "GBP";
}

function fmt(v: number, currency: string) {
  const sym = currency === "GBP" ? "£" : "$";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(1)}k`;
  return `${sym}${v.toLocaleString()}`;
}

interface VarianceBarProps {
  label: string;
  actual: number;
  budget: number;
  currency: string;
}

function VarianceBar({ label, actual, budget, currency }: VarianceBarProps) {
  const pct = budget > 0 ? (actual / budget) * 100 : 100;
  const isOver = pct > 100;
  const isUnder = pct < 100;
  const variance = budget > 0 ? ((actual - budget) / budget) * 100 : 0;

  let statusText = "On target ✓";
  if (isOver) {
    statusText = `+${Math.abs(variance).toFixed(0)}% over`;
    if (variance > 20) statusText += " ⚠";
  } else if (isUnder) {
    statusText = `−${Math.abs(variance).toFixed(0)}% under ✓`;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
          {label}
        </span>
        <span style={{ font: "500 11px var(--mono)", color: "var(--tx)" }}>
          {fmt(actual, currency)} / {fmt(budget, currency)} budget
        </span>
      </div>
      <div className="var-bar" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          className="var-track"
          style={{
            flex: 1,
            height: 6,
            background: "var(--s3)",
            borderRadius: 3,
            position: "relative",
            overflow: "visible",
          }}
        >
          <div
            className={`var-actual ${isOver ? "over" : "under"}`}
            style={{
              height: "100%",
              borderRadius: 3,
              position: "absolute",
              top: 0,
              left: 0,
              width: `${Math.min(pct, 150)}%`,
              background: isOver ? "var(--red)" : "var(--grn)",
            }}
          />
          <div
            className="var-budget"
            style={{
              position: "absolute",
              top: -3,
              height: 12,
              width: 2,
              background: "var(--tx3)",
              left: "100%",
            }}
          />
        </div>
        <div
          className={`var-pct ${isOver ? "over" : "under"}`}
          style={{
            font: "500 10px var(--mono)",
            minWidth: 80,
            textAlign: "right",
            color: isOver ? "var(--red)" : "var(--grn)",
          }}
        >
          {statusText}
        </div>
      </div>
    </div>
  );
}

export function BudgetVsActual({ assetId, year, currency = "USD" }: BudgetVsActualProps) {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [actual, setActual] = useState<ActualData | null>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = year || new Date().getFullYear();

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        // Load budget
        const budgetRes = await fetch(
          `/api/financials/budget?assetId=${assetId}&year=${currentYear}`
        );
        const budgetData = await budgetRes.json();

        // Load actual YTD financials
        const actualRes = await fetch(
          `/api/financials/monthly?assetId=${assetId}&year=${currentYear}`
        );
        const actualData = await actualRes.json();

        if (budgetData.budget) {
          setBudget(budgetData.budget);
        }

        // Use YTD totals from API
        if (actualData.totals) {
          setActual({
            grossRevenue: actualData.totals.grossRevenue || 0,
            insurance: actualData.totals.insuranceCost || 0,
            energy: actualData.totals.energyCost || 0,
            maintenance: actualData.totals.maintenanceCost || 0,
            management: 0, // TODO: add management cost field
            noi: actualData.totals.noi || 0,
          });
        }
      } catch (error) {
        console.error("Error loading budget/actual data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [assetId, currentYear]);

  if (loading) {
    return (
      <div
        style={{
          background: "var(--s1)",
          border: "1px solid var(--bdr)",
          borderRadius: 10,
          padding: "18px",
          marginBottom: 14,
        }}
      >
        <div style={{ font: "500 12px var(--sans)", color: "var(--tx3)" }}>
          Loading budget data...
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div
        style={{
          background: "var(--s1)",
          border: "1px solid var(--bdr)",
          borderRadius: 10,
          padding: "24px 18px",
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        <div style={{ font: "500 13px var(--sans)", color: "var(--tx)", marginBottom: 6 }}>
          No budget set for {currentYear}
        </div>
        <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginBottom: 12 }}>
          Create a budget to track variance against actuals
        </div>
        <button
          onClick={() => {
            // TODO: Open budget creation modal
            console.log("Create budget for", assetId, currentYear);
          }}
          style={{
            font: "500 11px var(--sans)",
            color: "var(--acc)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Create budget →
        </button>
      </div>
    );
  }

  if (!actual) {
    return null;
  }

  const sym = currency === "GBP" ? "£" : "$";
  const budgetNOI = budget.budgetedNOI / 12 * new Date().getMonth(); // Pro-rata YTD
  const varianceNOI = budgetNOI > 0 ? ((actual.noi - budgetNOI) / budgetNOI) * 100 : 0;

  return (
    <>
      <div
        className="sec"
        style={{
          font: "500 9px/1 var(--mono)",
          color: "var(--tx3)",
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 12,
          paddingTop: 4,
        }}
      >
        Budget vs Actual — {currentYear}
      </div>
      <div
        className="card"
        style={{
          background: "var(--s1)",
          border: "1px solid var(--bdr)",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          className="card-hd"
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--bdr)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
            Year-to-Date Variance
          </h4>
          <span
            className="card-link"
            style={{
              font: "500 11px var(--sans)",
              color: "var(--acc)",
              cursor: "pointer",
            }}
            onClick={() => {
              // TODO: Open budget edit modal
              console.log("Edit budget", budget);
            }}
          >
            Edit budget →
          </span>
        </div>
        <div style={{ padding: 18 }}>
          <VarianceBar
            label="Gross Revenue"
            actual={actual.grossRevenue}
            budget={budget.budgetedRevenue / 12 * new Date().getMonth()}
            currency={currency}
          />
          <VarianceBar
            label="Insurance"
            actual={actual.insurance}
            budget={budget.budgetedInsurance / 12 * new Date().getMonth()}
            currency={currency}
          />
          <VarianceBar
            label="Energy"
            actual={actual.energy}
            budget={budget.budgetedEnergy / 12 * new Date().getMonth()}
            currency={currency}
          />
          <VarianceBar
            label="Maintenance"
            actual={actual.maintenance}
            budget={budget.budgetedMaintenance / 12 * new Date().getMonth()}
            currency={currency}
          />

          {/* NOI Summary */}
          <div
            style={{
              padding: "12px 16px",
              background: "var(--grn-lt)",
              border: "1px solid var(--grn-bdr)",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>
              NOI — YTD
            </span>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 20,
                  color: "var(--grn)",
                }}
              >
                {fmt(actual.noi, currency)}
              </span>
              <span
                style={{
                  font: "400 11px var(--sans)",
                  color: "var(--tx3)",
                  marginLeft: 8,
                }}
              >
                vs {fmt(budgetNOI, currency)} budget (
                {varianceNOI > 0 ? "+" : ""}
                {varianceNOI.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
