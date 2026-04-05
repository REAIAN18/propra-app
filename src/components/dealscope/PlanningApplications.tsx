"use client";

import { useState } from "react";

export type PlanningStatus = "approved" | "refused" | "pending" | "withdrawn";

export interface PlanningApplication {
  ref: string;
  proximity: string;
  description: string;
  status: PlanningStatus;
  decisionDate?: string;
  decisionType?: string;
  objections?: number;
  fullDescription?: string;
}

interface PlanningApplicationsProps {
  applications?: PlanningApplication[];
}

const STATUS_COLOR: Record<PlanningStatus, string> = {
  approved:  "var(--grn)",
  refused:   "var(--red)",
  pending:   "var(--amb)",
  withdrawn: "var(--tx3, #6b7280)",
};

const STATUS_LABEL: Record<PlanningStatus, string> = {
  approved:  "Approved",
  refused:   "Refused",
  pending:   "Pending decision",
  withdrawn: "Withdrawn",
};

export function PlanningApplications({ applications = [] }: PlanningApplicationsProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = (i: number) =>
    setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  if (applications.length === 0) {
    return (
      <div style={{ color: "var(--tx3, #6b7280)", fontSize: 13, padding: "12px 0" }}>
        No planning history available.
      </div>
    );
  }

  return (
    <div id="planList">
      {applications.map((app, i) => {
        const color = STATUS_COLOR[app.status];
        const isOpen = !!expanded[i];
        return (
          <div
            key={i}
            className="plan-row"
            onClick={() => toggle(i)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid var(--s2)",
              cursor: "pointer",
            }}
          >
            <div
              className="plan-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
                marginTop: 5,
              }}
            />
            <div style={{ flex: 1 }}>
              <div className="plan-ref" style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", marginBottom: 2 }}>
                {app.ref} · {app.proximity}
              </div>
              <div className="plan-desc" style={{ fontSize: 13, color: "var(--tx)", marginBottom: 2 }}>
                {app.description} —{" "}
                <strong style={{ color }}>{STATUS_LABEL[app.status]}</strong>
              </div>
              <div className="plan-date" style={{ fontSize: 11, color: "var(--tx3, #6b7280)" }}>
                {app.decisionDate
                  ? `Decision: ${app.decisionDate}${app.decisionType ? ` · ${app.decisionType}` : ""}${app.objections ? ` · ${app.objections} objection${app.objections !== 1 ? "s" : ""}` : ""}`
                  : app.status === "pending"
                  ? "Awaiting decision"
                  : ""}
              </div>
              {isOpen && app.fullDescription && (
                <div
                  className="plan-expand"
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--tx3, #6b7280)",
                    lineHeight: 1.6,
                    paddingTop: 8,
                    borderTop: "1px solid var(--s2)",
                  }}
                >
                  {app.fullDescription}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
