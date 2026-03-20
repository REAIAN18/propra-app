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
  createdAt: Date;
  updatedAt: Date;
};

const SERVICE_CONFIG: Record<string, { label: string; color: string }> = {
  insurance_retender: { label: "Insurance Retender", color: "#F5A94A" },
  energy_switch: { label: "Energy Switch", color: "#1647E8" },
  income_activation: { label: "Income Activation", color: "#0A8A4C" },
  income_scan: { label: "Income Scan Request", color: "#0A8A4C" },
  financing_refinance: { label: "Financing / Refinance", color: "#1647E8" },
  rent_review: { label: "Rent Review", color: "#F5A94A" },
  work_order_tender: { label: "Work Order Tender", color: "#F5A94A" },
  acquisition_offer: { label: "Acquisition Offer", color: "#0A8A4C" },
  acquisition_pass: { label: "Acquisition Pass", color: "#8ba0b8" },
  tenant_action: { label: "Tenant Action", color: "#1647E8" },
  planning_flag: { label: "Planning Flag", color: "#F5A94A" },
  compliance_renewal: { label: "Compliance Renewal", color: "#f06040" },
  transaction_sale: { label: "Transaction / Sale", color: "#F5A94A" },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "#F5A94A" },
  { value: "in_progress", label: "In Progress", color: "#1647E8" },
  { value: "quotes_ready", label: "Quotes Ready", color: "#5BF0AC" },
  { value: "done", label: "Done", color: "#0A8A4C" },
  { value: "not_proceeding", label: "Not Proceeding", color: "#5a7a96" },
];

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LeadRow({ lead }: { lead: ServiceLead }) {
  const [status, setStatus] = useState(lead.status);
  const [adminNotes, setAdminNotes] = useState(lead.adminNotes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const cfg = SERVICE_CONFIG[lead.serviceType] ?? { label: lead.serviceType, color: "#8ba0b8" };
  const statusCfg = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  const isInsurance = lead.serviceType === "insurance_retender";
  const isEnergy = lead.serviceType === "energy_switch";

  async function saveChanges(newStatus?: string, newNotes?: string) {
    setSaving(true);
    const res = await fetch("/api/admin/service-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        status: newStatus ?? status,
        adminNotes: newNotes ?? adminNotes,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (newStatus) setStatus(newStatus);
      if (newNotes !== undefined) setAdminNotes(newNotes);
    }
    setSaving(false);
    setEditingNotes(false);
  }

  return (
    <div
      className="px-5 py-4"
      style={{
        backgroundColor: "#111e2e",
        borderLeft: `3px solid ${statusCfg.color}`,
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5"
            style={{ background: `${cfg.color}22`, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              {lead.email ?? "Anonymous"}
            </div>
            {lead.propertyAddress && (
              <div className="text-xs mt-0.5" style={{ color: "#8ba0b8" }}>{lead.propertyAddress}</div>
            )}
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs" style={{ color: "#5a7a96" }}>
              {isInsurance && lead.insurer && <span>Insurer: <strong style={{ color: "#e8eef5" }}>{lead.insurer}</strong></span>}
              {isInsurance && lead.currentPremium && <span>Premium: <strong style={{ color: "#F5A94A" }}>${lead.currentPremium.toLocaleString()}/yr</strong></span>}
              {isInsurance && lead.renewalDate && <span>Renewal: <strong style={{ color: "#e8eef5" }}>{lead.renewalDate}</strong></span>}
              {isEnergy && lead.supplier && <span>Supplier: <strong style={{ color: "#e8eef5" }}>{lead.supplier}</strong></span>}
              {isEnergy && lead.annualSpend && <span>Annual spend: <strong style={{ color: "#1647E8" }}>${lead.annualSpend.toLocaleString()}</strong></span>}
              {lead.notes && <span style={{ color: "#8ba0b8" }}>{lead.notes}</span>}
            </div>

            {/* Admin notes */}
            {editingNotes ? (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  className="flex-1 px-2 py-1 rounded text-xs outline-none"
                  style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveChanges(undefined, adminNotes);
                    if (e.key === "Escape") setEditingNotes(false);
                  }}
                  autoFocus
                />
                <button
                  onClick={() => saveChanges(undefined, adminNotes)}
                  disabled={saving}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: "#0A8A4C22", color: "#0A8A4C" }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="mt-1.5 text-xs hover:opacity-70 transition-opacity"
                style={{ color: adminNotes ? "#8ba0b8" : "#3d5a72" }}
              >
                {adminNotes || "+ Add notes"}
              </button>
            )}
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-xs" style={{ color: "#5a7a96" }}>{timeAgo(lead.createdAt)}</div>

          {/* Status selector */}
          <select
            value={status}
            onChange={(e) => saveChanges(e.target.value)}
            disabled={saving}
            className="text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
            style={{
              backgroundColor: `${statusCfg.color}22`,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.color}44`,
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {saved && <span className="text-xs" style={{ color: "#0A8A4C" }}>Saved ✓</span>}
            {lead.email && (
              <a
                href={`mailto:${lead.email}?subject=Your Arca ${cfg.label} Request`}
                className="text-xs font-semibold hover:opacity-80"
                style={{ color: "#0A8A4C" }}
              >
                Reply →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ServiceLeadManager({ initialLeads }: { initialLeads: ServiceLead[] }) {
  const [filter, setFilter] = useState<string>("active");

  const filtered =
    filter === "active"
      ? initialLeads.filter((l) => l.status !== "done" && l.status !== "not_proceeding")
      : filter === "done"
      ? initialLeads.filter((l) => l.status === "done" || l.status === "not_proceeding")
      : initialLeads;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-5 py-3" style={{ backgroundColor: "#0d1825", borderBottom: "1px solid #1a2d45" }}>
        {[
          { key: "active", label: `Active (${initialLeads.filter(l => l.status !== "done" && l.status !== "not_proceeding").length})` },
          { key: "all", label: `All (${initialLeads.length})` },
          { key: "done", label: `Done (${initialLeads.filter(l => l.status === "done" || l.status === "not_proceeding").length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="text-xs px-3 py-1 rounded-full transition-all"
            style={{
              backgroundColor: filter === tab.key ? "#1647E822" : "transparent",
              color: filter === tab.key ? "#1647E8" : "#5a7a96",
              border: filter === tab.key ? "1px solid #1647E844" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto text-xs" style={{ color: "#3d5a72" }}>
          Click status dropdown to update · click notes to edit
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{ color: "#5a7a96", backgroundColor: "#111e2e" }}>
          No {filter === "done" ? "completed" : "active"} service leads
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
          {filtered.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
