"use client";

import { useState } from "react";

type ServiceLead = {
  id: string;
  email: string | null;
  userId: string | null;
  serviceType: string;
  propertyAddress: string | null;
  currentPremium: number | null;
  insurer: string | null;
  renewalDate: string | null;
  coverageType: string | null;
  supplier: string | null;
  unitRate: number | null;
  annualSpend: number | null;
  notes: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:        { label: "Pending",        color: "#F5A94A", bg: "#F5A94A22" },
  in_progress:    { label: "In Progress",    color: "#1647E8", bg: "#1647E822" },
  quotes_ready:   { label: "Quotes Ready",   color: "#5BF0AC", bg: "#5BF0AC22" },
  done:           { label: "Done",           color: "#0A8A4C", bg: "#0A8A4C22" },
  not_proceeding: { label: "Not Proceeding", color: "#8ba0b8", bg: "#8ba0b822" },
};

const SERVICE_CONFIG: Record<string, { label: string; color: string }> = {
  insurance_retender: { label: "Insurance Retender", color: "#F5A94A" },
  energy_switch:      { label: "Energy Switch",       color: "#1647E8" },
  income_activation:  { label: "Income Activation",   color: "#0A8A4C" },
  rent_review:        { label: "Rent Review",          color: "#F5A94A" },
  transaction_sale:   { label: "Transaction / Sale",   color: "#F5A94A" },
};

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ServiceLeadsClient({ initialLeads }: { initialLeads: ServiceLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const filtered = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterType !== "all" && l.serviceType !== filterType) return false;
    return true;
  });

  const pendingCount = leads.filter((l) => l.status === "pending").length;

  async function updateLead(id: string, patch: { status?: string; adminNotes?: string }) {
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch("/api/admin/service-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.ok) {
        const updated = await res.json() as ServiceLead;
        setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      }
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterStatus("all")}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: filterStatus === "all" ? "#1a2d45" : "transparent",
              color: filterStatus === "all" ? "#e8eef5" : "#5a7a96",
              border: "1px solid #1a2d45",
            }}
          >
            All {leads.length}
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = leads.filter((l) => l.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: filterStatus === key ? cfg.bg : "transparent",
                  color: filterStatus === key ? cfg.color : "#5a7a96",
                  border: `1px solid ${filterStatus === key ? cfg.color : "#1a2d45"}`,
                }}
              >
                {cfg.label} {count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1 rounded-lg text-xs outline-none"
          style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#8ba0b8" }}
        >
          <option value="all">All types</option>
          {Object.entries(SERVICE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: "#2a1a0a", border: "1px solid #F5A94A44" }}>
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#F5A94A" }} />
          <span className="text-xs font-semibold" style={{ color: "#F5A94A" }}>
            {pendingCount} pending lead{pendingCount !== 1 ? "s" : ""} — act within 24 hours
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl px-8 py-12 flex flex-col items-center gap-2 text-center"
          style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
          <div className="text-sm font-medium" style={{ color: "#5a7a96" }}>No leads match this filter</div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
          <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
            {filtered.map((lead) => {
              const svcCfg = SERVICE_CONFIG[lead.serviceType] ?? { label: lead.serviceType.replace(/_/g, " "), color: "#8ba0b8" };
              const stCfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.pending;
              const isExpanded = expandedId === lead.id;
              const isInsurance = lead.serviceType === "insurance_retender";
              const isEnergy = lead.serviceType === "energy_switch";
              const notes = editNotes[lead.id] ?? lead.adminNotes ?? "";

              return (
                <div key={lead.id} style={{ backgroundColor: "#111e2e" }}>
                  {/* Main row */}
                  <div
                    className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-[#0d1825] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                  >
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: `${svcCfg.color}22`, color: svcCfg.color }}>
                          {svcCfg.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: stCfg.bg, color: stCfg.color }}>
                          {stCfg.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>
                        {lead.email ?? "Anonymous"}
                      </div>
                      {lead.propertyAddress && (
                        <div className="text-xs mt-0.5" style={{ color: "#8ba0b8" }}>{lead.propertyAddress}</div>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs" style={{ color: "#5a7a96" }}>
                        {isInsurance && lead.insurer && (
                          <span>Insurer: <strong style={{ color: "#e8eef5" }}>{lead.insurer}</strong></span>
                        )}
                        {isInsurance && lead.currentPremium && (
                          <span>Premium: <strong style={{ color: "#F5A94A" }}>${lead.currentPremium.toLocaleString()}/yr</strong></span>
                        )}
                        {isInsurance && lead.renewalDate && (
                          <span>Renewal: <strong style={{ color: "#e8eef5" }}>{lead.renewalDate}</strong></span>
                        )}
                        {isEnergy && lead.supplier && (
                          <span>Supplier: <strong style={{ color: "#e8eef5" }}>{lead.supplier}</strong></span>
                        )}
                        {isEnergy && lead.annualSpend && (
                          <span>Annual: <strong style={{ color: "#1647E8" }}>${lead.annualSpend.toLocaleString()}</strong></span>
                        )}
                        {lead.notes && <span style={{ color: "#8ba0b8" }}>{lead.notes}</span>}
                      </div>
                      {lead.adminNotes && !isExpanded && (
                        <div className="mt-1.5 text-xs italic" style={{ color: "#5a7a96" }}>
                          Note: {lead.adminNotes}
                        </div>
                      )}
                    </div>

                    {/* Right */}
                    <div className="shrink-0 text-right">
                      <div className="text-xs mb-1.5" style={{ color: "#5a7a96" }}>{timeAgo(lead.createdAt)}</div>
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}?subject=Your RealHQ ${svcCfg.label} Request`}
                          className="text-xs font-semibold hover:opacity-80 block mb-1"
                          style={{ color: "#0A8A4C" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Email →
                        </a>
                      )}
                      <div className="text-xs" style={{ color: "#3d5a72" }}>
                        {isExpanded ? "▲ collapse" : "▼ manage"}
                      </div>
                    </div>
                  </div>

                  {/* Expanded management panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "#1a2d45", backgroundColor: "#0d1825" }}>
                      <div className="flex flex-wrap gap-4 items-start">
                        {/* Status update */}
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs mb-1.5 font-medium" style={{ color: "#8ba0b8" }}>Status</label>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                key={key}
                                disabled={saving[lead.id]}
                                onClick={() => updateLead(lead.id, { status: key })}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                style={{
                                  backgroundColor: lead.status === key ? cfg.bg : "transparent",
                                  color: lead.status === key ? cfg.color : "#5a7a96",
                                  border: `1px solid ${lead.status === key ? cfg.color : "#1a2d45"}`,
                                }}
                              >
                                {cfg.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Admin notes */}
                        <div className="flex-1 min-w-[240px]">
                          <label className="block text-xs mb-1.5 font-medium" style={{ color: "#8ba0b8" }}>Admin notes</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => setEditNotes((n) => ({ ...n, [lead.id]: e.target.value }))}
                              placeholder="e.g. Spoke to client, quotes from Hiscox + QBE ready"
                              className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
                            />
                            <button
                              disabled={saving[lead.id]}
                              onClick={() => updateLead(lead.id, { adminNotes: notes })}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                            >
                              {saving[lead.id] ? "…" : "Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
            <span className="text-xs" style={{ color: "#3d5a72" }}>
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""} · click row to manage status
            </span>
            <span className="text-xs" style={{ color: "#3d5a72" }}>RealHQ commission: 15% of saving on placement</span>
          </div>
        </div>
      )}
    </div>
  );
}
