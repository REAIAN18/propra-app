"use client";

export type PlanningStatus = "approved" | "refused" | "pending" | "withdrawn";

export interface PlanningApplication {
  ref: string;
  proximity: string;
  description: string;
  status: PlanningStatus;
  decisionDate?: string;
  fullDescription?: string;
}

interface PlanningApplicationsProps {
  applications?: PlanningApplication[];
}

const STATUS_COLORS: Record<PlanningStatus, { color: string; bg: string; label: string }> = {
  approved:  { color: "var(--grn)", bg: "rgba(52,211,153,.08)",  label: "Approved"  },
  refused:   { color: "var(--red)", bg: "rgba(248,113,113,.08)", label: "Refused"   },
  pending:   { color: "var(--amb)", bg: "rgba(251,191,36,.08)",  label: "Pending"   },
  withdrawn: { color: "var(--tx3)", bg: "rgba(255,255,255,.04)", label: "Withdrawn" },
};

export function PlanningApplications({ applications }: PlanningApplicationsProps) {
  if (!applications || applications.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
        No planning applications found
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {applications.map((app) => {
        const st = STATUS_COLORS[app.status];
        return (
          <div
            key={app.ref}
            style={{
              borderRadius: 8,
              border: "1px solid var(--s2)",
              padding: "12px 14px",
              background: "var(--s1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--mono, monospace)", color: "var(--tx3)" }}>{app.ref}</div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: st.bg,
                  color: st.color,
                  whiteSpace: "nowrap",
                }}
              >
                {st.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--tx)", lineHeight: 1.5, marginBottom: 4 }}>
              {app.description}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--tx3)" }}>
              <span>{app.proximity}</span>
              {app.decisionDate && <span>· {app.decisionDate}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
