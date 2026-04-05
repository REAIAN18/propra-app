"use client";

export interface EPCUpgrade {
  label: string;
  cost: string;
  savings: string;
}

export interface EPCCardProps {
  rating?: string;
  currentScore?: number;
  potentialRating?: string;
  potentialScore?: number;
  certificateDate?: string;
  validUntil?: string;
  assessmentType?: string;
  floorArea?: string;
  mainHeating?: string;
  co2Emissions?: string;
  meesCompliance?: string;
  meesDeadline?: string;
  meesAction?: string;
  upgradePath?: EPCUpgrade[];
  totalUpgradeCost?: string;
  annualSavings?: string;
  paybackPeriod?: string;
  valueUplift?: string;
}

function ratingColors(r?: string): { bg: string; color: string } {
  if (!r) return { bg: "rgba(255,255,255,.06)", color: "#a0a0ab" };
  const u = r.toUpperCase();
  if (u <= "B") return { bg: "rgba(45,212,168,.08)",  color: "#2dd4a8" };
  if (u <= "D") return { bg: "rgba(234,176,32,.08)",  color: "#eab020" };
  return          { bg: "rgba(240,96,96,.08)",        color: "#f06060" };
}

const card: React.CSSProperties = {
  background: "var(--s1, #0d0d14)",
  border: "1px solid var(--s2, #15151e)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
};

const cardTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--tx3, #555566)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 10,
};

const dr: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px 0",
  fontSize: 12,
};

const drL: React.CSSProperties = { color: "var(--tx3, #555566)" };

const drV: React.CSSProperties = {
  color: "var(--tx, #e8e8f0)",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 500,
};

const drVAmb: React.CSSProperties = { ...drV, color: "#eab020" };
const drVGrn: React.CSSProperties = { ...drV, color: "#2dd4a8" };

const sep: React.CSSProperties = {
  borderTop: "1px solid var(--s3, #1f1f2c)",
  margin: "8px 0",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--tx2, #8e8ea0)",
  marginBottom: 6,
};

export function EPCCard({
  rating,
  currentScore,
  potentialRating,
  potentialScore,
  certificateDate,
  validUntil,
  assessmentType,
  floorArea,
  mainHeating,
  co2Emissions,
  meesCompliance,
  meesDeadline,
  meesAction,
  upgradePath,
  totalUpgradeCost,
  annualSavings,
  paybackPeriod,
  valueUplift,
}: EPCCardProps) {
  const { bg, color } = ratingColors(rating);

  return (
    <div style={card}>
      <div style={cardTitle}>Energy performance</div>

      {/* Rating badge + scores */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16,
            fontWeight: 600,
            color,
          }}
        >
          {rating ?? "—"}
        </div>
        <div>
          {(rating || currentScore != null) && (
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx, #e8e8f0)" }}>
              Current rating: {rating ?? "—"}{currentScore != null ? ` (${currentScore})` : ""}
            </div>
          )}
          {(potentialRating || potentialScore != null) && (
            <div style={{ fontSize: 10, color: "var(--tx3, #555566)" }}>
              Potential rating: {potentialRating ?? "—"}{potentialScore != null ? ` (${potentialScore})` : ""}
            </div>
          )}
        </div>
      </div>

      {/* Certificate details */}
      {certificateDate && <div style={dr}><span style={drL}>Certificate date</span><span style={drV}>{certificateDate}</span></div>}
      {validUntil      && <div style={dr}><span style={drL}>Valid until</span><span style={drV}>{validUntil}</span></div>}
      {assessmentType  && <div style={dr}><span style={drL}>Assessment type</span><span style={{ ...drV, fontFamily: "'DM Sans', sans-serif" }}>{assessmentType}</span></div>}
      {floorArea       && <div style={dr}><span style={drL}>Floor area (EPC)</span><span style={drV}>{floorArea}</span></div>}
      {mainHeating     && <div style={dr}><span style={drL}>Main heating</span><span style={{ ...drV, fontFamily: "'DM Sans', sans-serif" }}>{mainHeating}</span></div>}
      {co2Emissions    && <div style={dr}><span style={drL}>CO₂ emissions</span><span style={drV}>{co2Emissions}</span></div>}

      {/* MEES STATUS */}
      {(meesCompliance || meesDeadline || meesAction) && (
        <>
          <div style={sep} />
          <div style={sectionLabel}>MEES STATUS</div>
          {meesCompliance && <div style={dr}><span style={drL}>Current compliance</span><span style={drVAmb}>{meesCompliance}</span></div>}
          {meesDeadline   && <div style={dr}><span style={drL}>Deadline</span><span style={drVAmb}>{meesDeadline}</span></div>}
          {meesAction     && <div style={dr}><span style={drL}>Action required</span><span style={{ ...drV, fontFamily: "'DM Sans', sans-serif" }}>{meesAction}</span></div>}
        </>
      )}

      {/* UPGRADE PATH */}
      {upgradePath && upgradePath.length > 0 && (
        <>
          <div style={sep} />
          <div style={sectionLabel}>UPGRADE PATH (EPC recommendations)</div>
          {upgradePath.map((u, i) => (
            <div key={i} style={dr}>
              <span style={drL}>{u.label}</span>
              <span style={drV}>{u.cost} · saves {u.savings}</span>
            </div>
          ))}
        </>
      )}

      {/* Totals */}
      {(totalUpgradeCost || annualSavings || paybackPeriod || valueUplift) && (
        <>
          <div style={sep} />
          {totalUpgradeCost && <div style={dr}><span style={drL}>Total upgrade cost</span><span style={drV}>{totalUpgradeCost}</span></div>}
          {annualSavings    && <div style={dr}><span style={drL}>Annual savings</span><span style={drVGrn}>{annualSavings}</span></div>}
          {paybackPeriod    && <div style={dr}><span style={drL}>Payback period</span><span style={drVGrn}>{paybackPeriod}</span></div>}
          {valueUplift      && <div style={dr}><span style={drL}>Value uplift (est.)</span><span style={drVGrn}>{valueUplift}</span></div>}
        </>
      )}
    </div>
  );
}
