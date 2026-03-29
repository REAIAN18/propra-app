import { MonthlyPerformanceChart } from "./MonthlyPerformanceChart";

interface IncomeStreamCardProps {
  id: string;
  title: string;
  provider: string;
  category: "EV" | "5G" | "SOLAR" | "PARKING" | "BILLBOARD";
  status: "LIVE" | "RENEWAL DUE";
  annualIncome: number;
  contractEnd: string | null;
  escalation: number | null;
  vsEstimate: number | null;
  monthlyActuals: Array<{ month: string; amount: number }>;
  renewalAlertDays: number | null;
  currency?: string;
}

export function IncomeStreamCard({
  id,
  title,
  provider,
  category,
  status,
  annualIncome,
  contractEnd,
  escalation,
  vsEstimate,
  monthlyActuals,
  renewalAlertDays,
  currency = "£",
}: IncomeStreamCardProps) {
  const categoryClass = category.toLowerCase();
  const statusClass = status === "LIVE" ? "ok" : "warn";

  return (
    <div className="card a2">
      <div className="card-hd">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h4>
            {title} — {provider}
          </h4>
          <span className={`cat-badge ${categoryClass}`}>{category}</span>
          <span className={`row-tag ${statusClass}`}>{status}</span>
        </div>
      </div>

      <div style={{ padding: "18px" }}>
        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <div>
            <div
              style={{
                font: "500 11px var(--sans)",
                color: "var(--tx3)",
                marginBottom: "4px",
              }}
            >
              Annual Income
            </div>
            <div style={{ font: "600 18px var(--sans)", color: "var(--tx)" }}>
              {currency}
              {annualIncome.toLocaleString()}
            </div>
          </div>

          <div>
            <div
              style={{
                font: "500 11px var(--sans)",
                color: "var(--tx3)",
                marginBottom: "4px",
              }}
            >
              Contract End
            </div>
            <div style={{ font: "600 18px var(--sans)", color: "var(--tx)" }}>
              {contractEnd
                ? new Date(contractEnd).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>

          <div>
            <div
              style={{
                font: "500 11px var(--sans)",
                color: "var(--tx3)",
                marginBottom: "4px",
              }}
            >
              Escalation
            </div>
            <div style={{ font: "600 18px var(--sans)", color: "var(--tx)" }}>
              {escalation !== null ? `${escalation}%` : "—"}
            </div>
          </div>

          <div>
            <div
              style={{
                font: "500 11px var(--sans)",
                color: "var(--tx3)",
                marginBottom: "4px",
              }}
            >
              vs Estimate
            </div>
            <div
              style={{
                font: "600 18px var(--sans)",
                color: vsEstimate && vsEstimate > 0 ? "var(--grn)" : "var(--tx)",
              }}
            >
              {vsEstimate !== null
                ? `${vsEstimate > 0 ? "+" : ""}${vsEstimate}%`
                : "—"}
            </div>
          </div>
        </div>

        {/* Monthly Performance */}
        {monthlyActuals.length > 0 && (
          <>
            <div
              style={{
                font: "500 11px var(--sans)",
                color: "var(--tx3)",
                marginBottom: "8px",
              }}
            >
              Monthly Performance
            </div>
            <MonthlyPerformanceChart
              monthlyActuals={monthlyActuals}
              currency={currency}
            />
          </>
        )}

        {/* Renewal Alert */}
        {renewalAlertDays !== null && renewalAlertDays > 0 && renewalAlertDays <= 90 && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              background: "var(--amb-lt)",
              border: "1px solid var(--amb-bdr)",
              borderRadius: "8px",
            }}
          >
            <div style={{ font: "600 12px var(--sans)", color: "var(--amb)" }}>
              ⚠️ Renewal due in {renewalAlertDays} days
            </div>
            <div
              style={{
                font: "400 11px var(--sans)",
                color: "var(--amb)",
                marginTop: "4px",
              }}
            >
              Contract expires{" "}
              {contractEnd
                ? new Date(contractEnd).toLocaleDateString("en-GB")
                : ""}
              . Review terms and prepare renewal negotiation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
