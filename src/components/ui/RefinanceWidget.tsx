"use client";

import { useState, useEffect } from "react";
import type { AssetLoan } from "@/lib/data/financing";

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function daysLabel(days: number) {
  if (days <= 0) return "Matured";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}

function maturityColor(days: number) {
  if (days <= 60) return "#f87171";
  if (days <= 180) return "#fbbf24";
  return "#34d399";
}

interface Props {
  loans: AssetLoan[];
  currency: string;
  /** "user" for live user portfolio; any other id = demo */
  portfolioId: string;
}

export function RefinanceWidget({ loans, currency, portfolioId }: Props) {
  const [sofr, setSofr] = useState<{ value: number; date: string } | null>(null);

  useEffect(() => {
    fetch("/api/macro/sofr")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSofr(d?.sofr ?? null))
      .catch(() => {});
  }, []);

  const sym = currency === "GBP" ? "£" : "$";

  if (loans.length === 0) return null;

  const totalDebtService = loans.reduce((s, l) => s + l.annualDebtService, 0);
  const totalBalance = loans.reduce((s, l) => s + l.outstandingBalance, 0);
  const totalRefiSavings = loans.reduce((s, l) => {
    const diff = l.interestRate - l.marketRate;
    return s + (diff > 0 ? Math.round((l.outstandingBalance * diff) / 100) : 0);
  }, 0);
  const urgentCount = loans.filter(
    (l) => l.daysToMaturity <= 90 || l.icr < l.icrCovenant
  ).length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
        style={{ borderBottom: "1px solid var(--bdr)" }}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
            Refinance Overview
          </span>
          {portfolioId === "user" && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--amb-lt)", color: "#fbbf24" }}
            >
              Indicative
            </span>
          )}
          {sofr && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--acc-lt)", color: "#7c6af0" }}
            >
              SOFR {sofr.value.toFixed(2)}%{" "}
              <span style={{ color: "var(--tx3)", fontWeight: 400 }}>
                · {sofr.date}
              </span>
            </span>
          )}
          {urgentCount > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--red-lt)", color: "#f87171" }}
            >
              {urgentCount} urgent
            </span>
          )}
        </div>
        <div className="text-[10.5px]" style={{ color: "var(--tx3)" }}>
          {loans.length} facilit{loans.length === 1 ? "y" : "ies"} · {fmt(totalBalance, sym)} total
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10.5px]">
          <thead>
            <tr
              style={{
                backgroundColor: "var(--s2)",
                borderBottom: "1px solid var(--bdr)",
              }}
            >
              {[
                "Property",
                "Rate",
                "Market",
                "LTV",
                "Debt Service/yr",
                "Maturity",
                "Refi Savings/yr",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3.5 py-2.5 text-left font-semibold"
                  style={{ color: "var(--tx2)", whiteSpace: "nowrap" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--s2)" }}>
            {loans.map((loan) => {
              const rateDiff = loan.interestRate - loan.marketRate;
              const refiSavings =
                rateDiff > 0
                  ? Math.round((loan.outstandingBalance * rateDiff) / 100)
                  : 0;
              const isUrgent =
                loan.daysToMaturity <= 90 || loan.icr < loan.icrCovenant;

              return (
                <tr
                  key={loan.assetId}
                  className="transition-colors hover:bg-white/5"
                  style={
                    isUrgent ? { backgroundColor: "var(--amb-lt)" } : undefined
                  }
                >
                  {/* Property */}
                  <td
                    className="px-3.5 py-2.5 font-medium max-w-[160px] truncate"
                    style={{ color: "var(--tx)" }}
                  >
                    <div className="truncate">
                      {loan.assetName.split(" ").slice(0, 3).join(" ")}
                    </div>
                    {loan.rateReference && (
                      <div
                        className="text-[9px] mt-0.5"
                        style={{ color: "var(--tx3)" }}
                      >
                        {loan.rateReference}
                      </div>
                    )}
                  </td>

                  {/* Rate */}
                  <td
                    className="px-3.5 py-2.5 font-mono font-semibold"
                    style={{
                      color: rateDiff > 0.5 ? "#f87171" : "var(--tx)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {loan.interestRate.toFixed(1)}%
                    <span
                      className="ml-1 text-[9px] font-sans"
                      style={{ color: "var(--tx3)" }}
                    >
                      {loan.rateType === "variable" ? "var" : "fix"}
                    </span>
                  </td>

                  {/* Market */}
                  <td
                    className="px-3.5 py-2.5 font-mono"
                    style={{ color: "#34d399" }}
                  >
                    {loan.marketRate.toFixed(1)}%
                  </td>

                  {/* LTV */}
                  <td className="px-3.5 py-2.5" style={{ whiteSpace: "nowrap" }}>
                    <span
                      className="font-mono font-semibold"
                      style={{
                        color:
                          loan.currentLTV >= loan.ltvCovenant
                            ? "#f87171"
                            : loan.currentLTV >= loan.ltvCovenant - 5
                            ? "#fbbf24"
                            : "var(--tx)",
                      }}
                    >
                      {loan.currentLTV}%
                    </span>
                    <span
                      className="ml-1 text-[9px]"
                      style={{ color: "var(--tx3)" }}
                    >
                      / {loan.ltvCovenant}%
                    </span>
                  </td>

                  {/* Debt Service/yr */}
                  <td
                    className="px-3.5 py-2.5 font-mono font-semibold"
                    style={{ color: "var(--tx)", whiteSpace: "nowrap" }}
                  >
                    {fmt(loan.annualDebtService, sym)}
                    <div
                      className="text-[9px] font-sans font-normal"
                      style={{ color: "var(--tx3)" }}
                    >
                      ICR {loan.icr.toFixed(2)}x
                      {loan.icr < loan.icrCovenant && (
                        <span style={{ color: "#f87171" }}> !</span>
                      )}
                    </div>
                  </td>

                  {/* Maturity */}
                  <td
                    className="px-3.5 py-2.5"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <span
                      className="font-semibold"
                      style={{ color: maturityColor(loan.daysToMaturity) }}
                    >
                      {daysLabel(loan.daysToMaturity)}
                    </span>
                    <div
                      className="text-[9px]"
                      style={{ color: "var(--tx3)" }}
                    >
                      {loan.maturityDate}
                    </div>
                  </td>

                  {/* Refi Savings/yr */}
                  <td
                    className="px-3.5 py-2.5 font-mono font-bold"
                    style={{
                      color: refiSavings > 0 ? "#34d399" : "var(--tx3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {refiSavings > 0 ? `${fmt(refiSavings, sym)}/yr` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{
          borderTop: "1px solid var(--bdr)",
          backgroundColor: "var(--s2)",
        }}
      >
        <div className="flex items-center gap-4 flex-wrap text-[10.5px]">
          <span style={{ color: "var(--tx2)" }}>
            Annual debt service:{" "}
            <span
              className="font-semibold font-mono"
              style={{ color: "var(--tx)" }}
            >
              {fmt(totalDebtService, sym)}/yr
            </span>
          </span>
          {totalRefiSavings > 0 && (
            <span style={{ color: "var(--tx2)" }}>
              Refi opportunity:{" "}
              <span
                className="font-bold font-mono"
                style={{ color: "#34d399" }}
              >
                {fmt(totalRefiSavings, sym)}/yr
              </span>
            </span>
          )}
        </div>

        {/* CTA — Wave 6 not built; disabled */}
        <button
          disabled
          title="Full Refinance Centre launches in Wave 6"
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-not-allowed"
          style={{
            backgroundColor: "var(--s2)",
            color: "var(--tx3)",
            border: "1px solid var(--bdr)",
          }}
        >
          Explore refinancing — coming soon
        </button>
      </div>
    </div>
  );
}
