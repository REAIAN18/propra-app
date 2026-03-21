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

type FollowUpForm = {
  email: string;
  firstName: string;
  company: string;
  assetCount: string;
  assetType: string;
  estimateTotal: string;
  callNote: string;
  currencySym: "$" | "£";
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

function defaultFollowUpForm(lead: ServiceLead): FollowUpForm {
  return {
    email: lead.email ?? "",
    firstName: "",
    company: "",
    assetCount: "",
    assetType: "",
    estimateTotal: "",
    callNote: "",
    currencySym: "$",
  };
}

export function ServiceLeadsClient({ initialLeads }: { initialLeads: ServiceLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [followUpOpenId, setFollowUpOpenId] = useState<string | null>(null);
  const [followUpForms, setFollowUpForms] = useState<Record<string, FollowUpForm>>({});
  const [sendingFollowUp, setSendingFollowUp] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const filtered = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterType !== "all" && l.serviceType !== filterType) return false;
    return true;
  });

  const pendingCount = leads.filter((l) => l.status === "pending").length;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function updateLead(id: string, patch: { status?: string; adminNotes?: string }) {
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/admin/service-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json() as ServiceLead;
        setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      }
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  async function sendFollowUp(leadId: string) {
    const form = followUpForms[leadId];
    if (!form) return;
    setSendingFollowUp((s) => ({ ...s, [leadId]: true }));
    try {
      const res = await fetch("/api/admin/send-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          company: form.company || undefined,
          assetCount: Number(form.assetCount),
          assetType: form.assetType || undefined,
          estimateTotal: Number(form.estimateTotal),
          callNote: form.callNote || undefined,
          currencySym: form.currencySym,
        }),
      });
      if (res.ok) {
        showToast("Follow-up sent!", true);
        setFollowUpOpenId(null);
        const lead = leads.find((l) => l.id === leadId);
        const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        const newNotes = `Follow-up sent ${dateStr}`;
        const newStatus = lead?.status === "pending" ? "in_progress" : undefined;
        await updateLead(leadId, {
          adminNotes: newNotes,
          ...(newStatus ? { status: newStatus } : {}),
        });
        setEditNotes((n) => ({ ...n, [leadId]: newNotes }));
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        showToast(data.error ?? "Failed to send", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setSendingFollowUp((s) => ({ ...s, [leadId]: false }));
    }
  }

  function openFollowUp(lead: ServiceLead) {
    if (!followUpForms[lead.id]) {
      setFollowUpForms((f) => ({ ...f, [lead.id]: defaultFollowUpForm(lead) }));
    }
    setFollowUpOpenId((id) => (id === lead.id ? null : lead.id));
  }

  function updateFollowUpField(leadId: string, field: keyof FollowUpForm, value: string) {
    setFollowUpForms((f) => ({
      ...f,
      [leadId]: { ...(f[leadId] ?? {}), [field]: value } as FollowUpForm,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg"
          style={{
            backgroundColor: toast.ok ? "#0A8A4C" : "#8b1a1a",
            color: "#fff",
            border: `1px solid ${toast.ok ? "#0A8A4C" : "#c53030"}`,
          }}
        >
          {toast.msg}
        </div>
      )}

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

              return (
                <div key={lead.id} style={{ backgroundColor: "#111e2e" }}>
                  {/* Main row */}
                  <div
                    className="px-5 py-4 grid gap-3 hover:bg-[#0d1825] transition-colors"
                    style={{ gridTemplateColumns: "1fr 160px auto" }}
                  >
                    {/* Left — identity + financial fields + inline notes */}
                    <div className="min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: `${svcCfg.color}22`, color: svcCfg.color }}>
                          {svcCfg.label}
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
                      {/* Inline admin notes — click to edit */}
                      <div
                        className="mt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editNotes[lead.id] !== undefined ? (
                          <div className="flex gap-2 items-start">
                            <input
                              autoFocus
                              type="text"
                              value={editNotes[lead.id]}
                              onChange={(e) => setEditNotes((n) => ({ ...n, [lead.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateLead(lead.id, { adminNotes: editNotes[lead.id] });
                                  setEditNotes((n) => { const c = { ...n }; delete c[lead.id]; return c; });
                                }
                                if (e.key === "Escape") {
                                  setEditNotes((n) => { const c = { ...n }; delete c[lead.id]; return c; });
                                }
                              }}
                              onBlur={() => {
                                updateLead(lead.id, { adminNotes: editNotes[lead.id] });
                                setEditNotes((n) => { const c = { ...n }; delete c[lead.id]; return c; });
                              }}
                              placeholder="Add admin note…"
                              className="flex-1 px-2 py-1 rounded text-xs outline-none"
                              style={{ backgroundColor: "#0B1622", border: "1px solid #0A8A4C40", color: "#e8eef5" }}
                            />
                          </div>
                        ) : (
                          <span
                            className="text-xs cursor-text"
                            style={{ color: lead.adminNotes ? "#5a7a96" : "#2a3d52", fontStyle: lead.adminNotes ? "normal" : "italic" }}
                            onClick={() => setEditNotes((n) => ({ ...n, [lead.id]: lead.adminNotes ?? "" }))}
                          >
                            {lead.adminNotes
                              ? lead.adminNotes.slice(0, 90) + (lead.adminNotes.length > 90 ? "…" : "")
                              : "+ add note"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Centre — inline status select + last updated */}
                    <div className="flex flex-col gap-1.5 justify-start" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        disabled={saving[lead.id]}
                        onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                        className="text-xs rounded-lg px-2 py-1.5 outline-none w-full disabled:opacity-50"
                        style={{
                          backgroundColor: stCfg.bg,
                          color: stCfg.color,
                          border: `1px solid ${stCfg.color}40`,
                        }}
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key} style={{ backgroundColor: "#0B1622", color: cfg.color }}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs" style={{ color: "#3d5a72" }}>
                        {saving[lead.id] ? "saving…" : `updated ${timeAgo(lead.updatedAt)}`}
                      </div>
                    </div>

                    {/* Right — email + expand */}
                    <div className="shrink-0 text-right flex flex-col items-end gap-1.5 pt-0.5">
                      <div className="text-xs" style={{ color: "#5a7a96" }}>{timeAgo(lead.createdAt)}</div>
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}?subject=Your RealHQ ${svcCfg.label} Request`}
                          className="text-xs font-semibold hover:opacity-80"
                          style={{ color: "#0A8A4C" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Email →
                        </a>
                      )}
                      <button
                        className="text-xs"
                        style={{ color: "#3d5a72" }}
                        onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded management panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "#1a2d45", backgroundColor: "#0d1825" }}>
                      {/* Follow-up email toggle */}
                      <div className="pt-1" style={{ borderColor: "#1a2d45" }}>
                        <button
                          onClick={() => openFollowUp(lead)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                          style={{
                            backgroundColor: followUpOpenId === lead.id ? "#1a2d45" : "#1647E822",
                            color: followUpOpenId === lead.id ? "#8ba0b8" : "#1647E8",
                            border: "1px solid #1647E8",
                          }}
                        >
                          {followUpOpenId === lead.id ? "▲ Close follow-up" : "✉ Send follow-up email"}
                        </button>

                        {followUpOpenId === lead.id && (() => {
                          const form = followUpForms[lead.id] ?? defaultFollowUpForm(lead);
                          const sending = sendingFollowUp[lead.id] ?? false;
                          const canSend = form.email.trim() && form.firstName.trim() && form.assetCount && form.estimateTotal;
                          return (
                            <div className="mt-4 rounded-xl p-4 space-y-3" style={{ backgroundColor: "#111e2e", border: "1px solid #1647E844" }}>
                              <div className="text-xs font-semibold mb-2" style={{ color: "#8ba0b8" }}>Post-demo follow-up email</div>

                              {/* Row 1 */}
                              <div className="flex flex-wrap gap-3">
                                <div className="flex-1 min-w-[160px]">
                                  <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>Email *</label>
                                  <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => updateFollowUpField(lead.id, "email", e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                                    style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                  />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                  <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>First name *</label>
                                  <input
                                    type="text"
                                    value={form.firstName}
                                    onChange={(e) => updateFollowUpField(lead.id, "firstName", e.target.value)}
                                    placeholder="e.g. Sarah"
                                    className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                                    style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                  />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                  <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>Company</label>
                                  <input
                                    type="text"
                                    value={form.company}
                                    onChange={(e) => updateFollowUpField(lead.id, "company", e.target.value)}
                                    placeholder="e.g. Apex Capital"
                                    className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                                    style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                  />
                                </div>
                              </div>

                              {/* Row 2 */}
                              <div className="flex flex-wrap gap-3">
                                <div className="flex-1 min-w-[110px]">
                                  <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>Asset count *</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={form.assetCount}
                                    onChange={(e) => updateFollowUpField(lead.id, "assetCount", e.target.value)}
                                    placeholder="12"
                                    className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                                    style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                  />
                                </div>
                                <div className="flex-1 min-w-[160px]">
                                  <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>Asset type</label>
                                  <input
                                    type="text"
                                    value={form.assetType}
                                    onChange={(e) => updateFollowUpField(lead.id, "assetType", e.target.value)}
                                    placeholder="e.g. industrial warehouse"
                                    className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                                    style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                  />
                                </div>
                                <div className="flex-1 min-w-[130px]">
                                  <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>Savings estimate *</label>
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={form.currencySym}
                                      onChange={(e) => updateFollowUpField(lead.id, "currencySym", e.target.value)}
                                      className="px-2 py-1.5 rounded-lg text-xs outline-none"
                                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                    >
                                      <option value="$">$</option>
                                      <option value="£">£</option>
                                    </select>
                                    <input
                                      type="number"
                                      min={0}
                                      value={form.estimateTotal}
                                      onChange={(e) => updateFollowUpField(lead.id, "estimateTotal", e.target.value)}
                                      placeholder="45000"
                                      className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                                      style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Row 3 — call note */}
                              <div>
                                <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>Call note (1–3 sentences)</label>
                                <textarea
                                  rows={3}
                                  value={form.callNote}
                                  onChange={(e) => updateFollowUpField(lead.id, "callNote", e.target.value)}
                                  placeholder="e.g. We discussed the portfolio's insurance exposure and identified three assets with above-market premiums..."
                                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                                  style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#e8eef5" }}
                                />
                              </div>

                              {/* Send button */}
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => setFollowUpOpenId(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                  style={{ color: "#5a7a96" }}
                                >
                                  Cancel
                                </button>
                                <button
                                  disabled={sending || !canSend}
                                  onClick={() => sendFollowUp(lead.id)}
                                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                                  style={{ backgroundColor: "#1647E8", color: "#fff" }}
                                >
                                  {sending ? "Sending…" : "Send follow-up email →"}
                                </button>
                              </div>
                            </div>
                          );
                        })()}
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
