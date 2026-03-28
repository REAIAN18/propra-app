"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: "system" | "user";
  isAutomatic: boolean;
}

interface Milestone {
  id: string;
  stage: string;
  status: "pending" | "in_progress" | "complete";
  completedAt: string | null;
  notes: string | null;
  tasks?: Task[];
}

interface TxDocument {
  id: string;
  name: string;
  category: string;
  uploadedBy: string;
  fileUrl: string | null;
  confidential: boolean;
  uploadedAt: string;
}

interface NDASignature {
  id: string;
  signerName: string;
  signerEmail: string;
  signedAt: string | null;
  status: string;
}

interface Party {
  id: string;
  role: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}

interface Cost {
  id: string;
  category: string;
  description: string;
  estimated: number;
  actual: number;
  paid: boolean;
  status: string;
}

interface Room {
  id: string;
  type: string;
  status: string;
  askingPrice: number | null;
  agreedPrice: number | null;
  buyer: string | null;
  seller: string | null;
  solicitorRef: string | null;
  assetName: string | null;
  dealAddress: string | null;
  createdAt: string;
  milestones: Milestone[];
  documents: TxDocument[];
  ndaSignature: NDASignature | null;
  parties?: Party[];
  costs?: Cost[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

const MILESTONE_LABELS: Record<string, string> = {
  nda_signed:           "NDA Signed",
  heads_agreed:         "Heads Agreed",
  instructed_solicitor: "Solicitors Instructed",
  searches_ordered:     "Searches Ordered",
  survey_instructed:    "Survey Instructed",
  contracts_exchanged:  "Contracts Exchanged",
  completion:           "Completion",
};

const CATEGORY_LABELS: Record<string, string> = {
  nda:            "NDA",
  title_register: "Title",
  searches:       "Searches",
  survey:         "Survey",
  contracts:      "Contracts",
  enquiries:      "Enquiries",
  finance:        "Finance",
  other:          "Other",
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  nda:            { bg: "var(--grn-lt)", color: "var(--grn)" },
  title_register: { bg: "var(--acc-lt)", color: "var(--acc)" },
  searches:       { bg: "var(--amb-lt)", color: "var(--red)" },
  survey:         { bg: "#FFFBEB", color: "var(--amb)" },
  contracts:      { bg: "#FEF2F2", color: "#f87171" },
  enquiries:      { bg: "#F5F3FF", color: "#7C3AED" },
  finance:        { bg: "#ECFDF5", color: "#065F46" },
  other:          { bg: "var(--s2)", color: "var(--tx2)" },
};

const STATUS_COLORS = {
  pending:     { bg: "var(--s2)", color: "var(--tx2)" },
  in_progress: { bg: "var(--acc-lt)", color: "var(--acc)" },
  complete:    { bg: "var(--grn-lt)", color: "var(--grn)" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function MilestoneTracker({
  milestones, roomId, onUpdate,
}: {
  milestones: Milestone[];
  roomId: string;
  onUpdate: (id: string, status: string, notes?: string) => void;
}) {
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(milestoneId: string, status: string) {
    setSaving(true);
    try {
      await fetch(`/api/user/transactions/${roomId}/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: noteText || undefined }),
      });
      onUpdate(milestoneId, status, noteText || undefined);
    } catch { /* no-op */ }
    setSaving(false);
    setActiveNote(null);
    setNoteText("");
  }

  return (
    <div>
      {/* Horizontal pipeline for desktop */}
      <div className="hidden md:flex items-center gap-0 overflow-x-auto pb-2">
        {milestones.map((m, i) => {
          const sc = STATUS_COLORS[m.status] ?? STATUS_COLORS.pending;
          const isComplete = m.status === "complete";
          return (
            <div key={m.id} className="flex items-center min-w-0">
              <button
                className="flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg transition-all hover:bg-gray-50"
                style={{ minWidth: 88 }}
                onClick={() => setActiveNote(activeNote === m.id ? null : m.id)}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: sc.bg, color: sc.color, border: `1.5px solid ${isComplete ? sc.color : "var(--bdr)"}` }}
                >
                  {isComplete ? "✓" : i + 1}
                </div>
                <div className="text-center text-[9px] leading-tight" style={{ color: isComplete ? "var(--grn)" : "var(--tx2)" }}>
                  {MILESTONE_LABELS[m.stage] ?? m.stage}
                </div>
                {m.completedAt && (
                  <div className="text-[8px]" style={{ color: "var(--tx3)" }}>
                    {new Date(m.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                )}
              </button>
              {i < milestones.length - 1 && (
                <div
                  className="h-0.5 flex-1"
                  style={{ minWidth: 12, backgroundColor: isComplete ? "var(--grn)" : "var(--bdr)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-1">
        {milestones.map((m) => {
          const sc = STATUS_COLORS[m.status] ?? STATUS_COLORS.pending;
          return (
            <button
              key={m.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-gray-50"
              style={{ border: "0.5px solid var(--bdr)" }}
              onClick={() => setActiveNote(activeNote === m.id ? null : m.id)}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ backgroundColor: sc.bg, color: sc.color }}
              >
                {m.status === "complete" ? "✓" : "·"}
              </div>
              <span className="text-xs flex-1" style={{ color: "var(--tx2)" }}>
                {MILESTONE_LABELS[m.stage] ?? m.stage}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: sc.bg, color: sc.color }}
              >
                {m.status.replace("_", " ")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inline action panel */}
      {activeNote && milestones.find((m) => m.id === activeNote) && (
        <div
          className="mt-3 rounded-xl p-4"
          style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s2)" }}
        >
          {(() => {
            const m = milestones.find((x) => x.id === activeNote)!;
            return (
              <>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--tx2)" }}>
                  {MILESTONE_LABELS[m.stage]}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Optional notes…"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none mb-2"
                  style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
                <div className="flex gap-2">
                  {m.status !== "complete" && (
                    <button
                      onClick={() => save(m.id, "complete")}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "var(--grn)", color: "#fff" }}
                    >
                      {saving ? "Saving…" : "Mark complete ✓"}
                    </button>
                  )}
                  {m.status !== "in_progress" && m.status !== "complete" && (
                    <button
                      onClick={() => save(m.id, "in_progress")}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "var(--acc-lt)", color: "var(--acc)" }}
                    >
                      Mark in progress
                    </button>
                  )}
                  {m.status === "complete" && (
                    <button
                      onClick={() => save(m.id, "pending")}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                      style={{ backgroundColor: "var(--s2)", color: "var(--tx2)" }}
                    >
                      Reset to pending
                    </button>
                  )}
                  <button
                    onClick={() => { setActiveNote(null); setNoteText(""); }}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-70"
                    style={{ color: "var(--tx3)" }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function DocumentVault({
  documents, roomId, onAdd,
}: {
  documents: TxDocument[];
  roomId: string;
  onAdd: (doc: TxDocument) => void;
}) {
  const [uploadModal, setUploadModal] = useState(false);
  const [form, setForm] = useState({ name: "", category: "other", confidential: false });
  const [uploading, setUploading] = useState(false);

  const grouped = Object.keys(CATEGORY_LABELS).reduce<Record<string, TxDocument[]>>((acc, cat) => {
    acc[cat] = documents.filter((d) => d.category === cat);
    return acc;
  }, {});

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/user/transactions/${roomId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, category: form.category, confidential: form.confidential }),
      });
      if (res.ok) {
        const d = await res.json() as { document: TxDocument };
        onAdd(d.document);
        setUploadModal(false);
        setForm({ name: "", category: "other", confidential: false });
      }
    } catch { /* no-op */ }
    setUploading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold" style={{ color: "var(--tx3)" }}>Document Vault</div>
        <button
          onClick={() => setUploadModal(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--grn)", color: "#fff" }}
        >
          Upload document
        </button>
      </div>

      <div className="space-y-1">
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const docs = grouped[cat] ?? [];
          const cc = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
          if (docs.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[10px] font-semibold uppercase tracking-wide px-1 mb-1 mt-2" style={{ color: "var(--tx3)" }}>
                {label}
              </div>
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ border: "0.5px solid var(--s2)", backgroundColor: "var(--s1)" }}
                >
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ backgroundColor: cc.bg, color: cc.color }}
                  >
                    {label}
                  </span>
                  <span className="text-xs flex-1 truncate" style={{ color: "var(--tx2)" }}>{doc.name}</span>
                  {doc.confidential && (
                    <span className="text-[9px]" style={{ color: "var(--tx3)" }}>Confidential</span>
                  )}
                  <span className="text-[10px] flex-shrink-0" style={{ color: "var(--tx3)" }}>
                    {doc.uploadedBy} · {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      download={doc.name}
                      className="text-[10px] font-medium transition-opacity hover:opacity-70"
                      style={{ color: "var(--grn)" }}
                    >
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {documents.length === 0 && (
          <div className="py-4 text-center text-xs" style={{ color: "var(--tx3)" }}>
            No documents uploaded yet
          </div>
        )}
      </div>

      {uploadModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setUploadModal(false)} />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-60 rounded-2xl p-5 shadow-xl max-w-sm mx-auto"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="text-sm font-semibold mb-4" style={{ color: "var(--tx)" }}>Upload Document</div>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "var(--tx2)" }}>Document name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Title Register — 12 High Street"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "var(--tx2)" }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                >
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.confidential}
                  onChange={(e) => setForm((f) => ({ ...f, confidential: e.target.checked }))}
                />
                <span style={{ color: "var(--tx2)" }}>Mark as confidential</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={uploading || !form.name}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--grn)", color: "#fff" }}
                >
                  {uploading ? "Saving…" : "Save document →"}
                </button>
                <button
                  type="button"
                  onClick={() => setUploadModal(false)}
                  className="px-3 py-2 rounded-lg text-xs transition-all hover:opacity-70"
                  style={{ color: "var(--tx3)" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function TaskChecklist({
  milestone,
  onToggle,
}: {
  milestone: Milestone;
  onToggle: (taskId: string) => void;
}) {
  if (!milestone.tasks || milestone.tasks.length === 0) return null;

  const tasks = milestone.tasks;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
          Task Checklist
        </div>
        <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
          {completedCount}/{tasks.length} complete
        </div>
      </div>
      <div className="space-y-0">
        {tasks.map((task) => {
          const isOverdue = !task.completed && task.completedAt && new Date(task.completedAt) < new Date();
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2.5 border-b"
              style={{ borderBottomColor: "rgba(37,37,51,0.5)" }}
            >
              <div
                onClick={() => !task.isAutomatic && onToggle(task.id)}
                className={`flex-shrink-0 w-[18px] h-[18px] rounded-md flex items-center justify-center transition-all ${
                  task.isAutomatic ? "" : "cursor-pointer"
                }`}
                style={{
                  border: `1.5px solid ${
                    task.completed
                      ? task.isAutomatic
                        ? "var(--acc)"
                        : "var(--grn)"
                      : isOverdue
                      ? "var(--red)"
                      : "var(--bdr)"
                  }`,
                  backgroundColor: task.completed
                    ? task.isAutomatic
                      ? "var(--acc)"
                      : "var(--grn)"
                    : "var(--s2)",
                }}
              >
                {task.completed && (
                  <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>
                    {task.isAutomatic ? "⚡" : "✓"}
                  </span>
                )}
              </div>
              <span
                className="flex-1 text-xs"
                style={{
                  color: task.completed ? "var(--tx3)" : isOverdue ? "var(--red)" : "var(--tx)",
                  textDecoration: task.completed ? "line-through" : "none",
                }}
              >
                {task.label}
              </span>
              {task.completedAt && (
                <span
                  className="text-[10px] flex-shrink-0"
                  style={{ color: isOverdue && !task.completed ? "var(--red)" : "var(--tx3)" }}
                >
                  {task.completed
                    ? `${new Date(task.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}${
                        task.isAutomatic ? " · Auto" : ""
                      }`
                    : isOverdue
                    ? `Overdue · Due ${new Date(task.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                    : `Due ${new Date(task.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PartyManagement({ parties }: { parties?: Party[] }) {
  if (!parties || parties.length === 0) return null;

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
          Involved Parties
        </div>
      </div>
      <div className="space-y-0">
        {parties.map((party, idx) => (
          <div
            key={party.id}
            className={`flex items-center gap-3 py-3 ${idx < parties.length - 1 ? "border-b" : ""}`}
            style={{ borderBottomColor: "rgba(37,37,51,0.5)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold"
              style={{
                backgroundColor: party.role === "BUYER" ? "var(--acc-lt)" : "var(--s3)",
                color: party.role === "BUYER" ? "var(--acc)" : "var(--tx3)",
                border: `1px solid ${party.role === "BUYER" ? "var(--acc-bdr)" : "var(--bdr)"}`,
              }}
            >
              {party.role === "BUYER" ? "You" : getInitials(party.name)}
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--tx3)" }}>
                {party.role}
              </div>
              <div className="text-xs font-medium" style={{ color: "var(--tx)" }}>
                {party.name}
                {party.company && ` — ${party.company}`}
              </div>
              {(party.email || party.phone) && (
                <div className="text-[10px] mt-0.5" style={{ color: "var(--tx3)" }}>
                  {party.email && <span>{party.email}</span>}
                  {party.email && party.phone && <span> · </span>}
                  {party.phone && <span>{party.phone}</span>}
                </div>
              )}
            </div>
            {party.email && party.role !== "BUYER" && (
              <button
                className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: "transparent", border: "1px solid var(--bdr)", color: "var(--tx3)" }}
              >
                Email
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CostTracker({ costs, currency = "£" }: { costs?: Cost[]; currency?: string }) {
  if (!costs || costs.length === 0) return null;

  const totalEstimated = costs.reduce((sum, c) => sum + c.estimated, 0);
  const totalActual = costs.reduce((sum, c) => sum + c.actual, 0);
  const percentSpent = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

  const fmt = (n: number) => {
    return n === 0 ? "—" : `${currency}${n.toLocaleString()}`;
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
          Transaction Costs
        </div>
        <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
          {fmt(totalActual)} of {fmt(totalEstimated)} estimated
        </div>
      </div>
      <div className="space-y-0">
        {costs.map((cost, idx) => (
          <div
            key={cost.id}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 py-2.5 items-center ${idx < costs.length - 1 ? "border-b" : ""}`}
            style={{ borderBottomColor: "rgba(37,37,51,0.5)" }}
          >
            <div>
              <div className="text-xs font-medium" style={{ color: "var(--tx)" }}>
                {cost.category}
              </div>
              <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
                {cost.description}
              </div>
            </div>
            <span className="text-[11px] font-mono" style={{ color: "var(--tx3)" }}>
              {fmt(cost.estimated)}
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--tx)" }}>
              {fmt(cost.actual)}
            </span>
            <span
              className="text-[9px] font-mono font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: cost.paid ? "var(--grn-lt)" : cost.actual > 0 ? "var(--amb-lt)" : "var(--s3)",
                color: cost.paid ? "var(--grn)" : cost.actual > 0 ? "var(--amb)" : "var(--tx3)",
                border: `1px solid ${cost.paid ? "var(--grn-bdr)" : cost.actual > 0 ? "var(--amb-bdr)" : "var(--bdr)"}`,
              }}
            >
              {cost.status}
            </span>
          </div>
        ))}

        {/* Totals row */}
        <div
          className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-2.5 items-center mt-2"
          style={{ backgroundColor: "var(--s2)", marginLeft: -18, marginRight: -18, paddingLeft: 18, paddingRight: 18 }}
        >
          <div className="text-xs font-semibold" style={{ color: "var(--tx)" }}>
            Total
          </div>
          <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--tx3)" }}>
            {fmt(totalEstimated)}
          </span>
          <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--tx)" }}>
            {fmt(totalActual)}
          </span>
          <span className="text-[10px] font-medium" style={{ color: percentSpent > 75 ? "var(--amb)" : "var(--tx3)" }}>
            {percentSpent}% spent
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Mock task data generator ──────────────────────────────────────────────────

// ── Timeline View (Gantt chart) ──────────────────────────────────────────────

interface TimelineItem {
  stage: string;
  label: string;
  expectedStart: number; // % from left
  expectedWidth: number; // % width
  actualStart?: number;
  actualWidth?: number;
  isLate?: boolean;
}

function TimelineView({ milestones }: { milestones: Milestone[] }) {
  const timeline: TimelineItem[] = [
    { stage: "nda", label: "NDA", expectedStart: 0, expectedWidth: 10, actualStart: 0, actualWidth: 8, isLate: false },
    { stage: "hot", label: "Heads of Terms", expectedStart: 12, expectedWidth: 18, actualStart: 10, actualWidth: 20, isLate: false },
    { stage: "dd", label: "Due Diligence", expectedStart: 32, expectedWidth: 26, actualStart: 32, actualWidth: 26, isLate: false },
    { stage: "legal", label: "Legal / Exchange", expectedStart: 60, expectedWidth: 25 },
    { stage: "completion", label: "Completion", expectedStart: 87, expectedWidth: 13 },
  ];

  const todayPosition = 58; // Mock: currently in DD stage

  return (
    <div className="space-y-2">
      {timeline.map((item) => (
        <div key={item.stage} className="flex items-center gap-3">
          <div className="w-32 text-xs font-medium" style={{ color: "var(--tx2)" }}>
            {item.label}
          </div>
          <div className="flex-1 h-7 relative rounded" style={{ backgroundColor: "var(--s2)" }}>
            {/* Expected bar */}
            <div
              className="absolute top-1 h-5 rounded"
              style={{
                left: `${item.expectedStart}%`,
                width: `${item.expectedWidth}%`,
                backgroundColor: "var(--s3)",
                border: "1px solid var(--bdr)",
              }}
            />
            {/* Actual bar (if started) */}
            {item.actualStart !== undefined && (
              <div
                className="absolute top-1 h-5 rounded"
                style={{
                  left: `${item.actualStart}%`,
                  width: `${item.actualWidth}%`,
                  backgroundColor: item.isLate ? "var(--red-lt)" : "var(--grn-lt)",
                  border: `1px solid ${item.isLate ? "var(--red-bdr)" : "var(--grn-bdr)"}`,
                }}
              />
            )}
          </div>
        </div>
      ))}
      {/* Today marker */}
      <div className="relative h-0" style={{ marginTop: "-140px" }}>
        <div
          className="absolute top-0 w-0.5 rounded-full"
          style={{
            left: `calc(${todayPosition}% + 132px)`,
            height: "140px",
            backgroundColor: "var(--acc)",
          }}
        />
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] pt-2" style={{ color: "var(--tx3)" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: "var(--s3)", border: "1px solid var(--bdr)" }} />
          Expected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }} />
          Actual (on track)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: "var(--red-lt)", border: "1px solid var(--red-bdr)" }} />
          Actual (late)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--acc)" }} />
          Today
        </span>
      </div>
    </div>
  );
}

// ── Communication Log ─────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  author: string;
  date: string;
  stage: string;
  body: string;
  isSystem?: boolean;
  isWarning?: boolean;
}

function CommunicationLog() {
  const [newNote, setNewNote] = useState("");
  const [selectedStage, setSelectedStage] = useState("dd");

  const logs: LogEntry[] = [
    { id: "1", author: "You", date: "Mar 25, 2026 · 2:14 PM", stage: "DD", body: "Called Apex Surveying — survey on track for Mar 29 delivery. David mentioned a minor roof issue he wants to flag but nothing structural. Will include in report." },
    { id: "2", author: "System", date: "Mar 18, 2026 · 9:00 AM", stage: "DD", body: "⚠ Title search task overdue. Expected completion: Mar 18. Please contact your attorney to order.", isSystem: true, isWarning: true },
    { id: "3", author: "You", date: "Mar 15, 2026 · 11:22 AM", stage: "DD", body: "All 3 estoppel certificates received. Tenant rents confirmed matching seller's schedule. No outstanding disputes." },
    { id: "4", author: "System", date: "Mar 12, 2026 · 3:45 PM", stage: "DD", body: "📄 Document uploaded: Lease abstracts (3 files) by seller's agent via portal.", isSystem: true },
    { id: "5", author: "Jennifer Kim", date: "Mar 8, 2026 · 10:15 AM", stage: "DD", body: "Survey and Phase I commissioned. Apex Surveying and EnviroTech confirmed. Both deposits paid." },
  ];

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    // TODO: POST to API
    console.log("Add note:", { note: newNote, stage: selectedStage });
    setNewNote("");
  }

  return (
    <div className="space-y-3">
      {/* Log entries */}
      {logs.map((log) => (
        <div key={log.id} className="pb-3" style={{ borderBottom: "1px solid var(--bdr-lt)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium" style={{ color: log.isSystem ? "var(--tx3)" : "var(--tx)" }}>
              {log.author}
            </span>
            <span className="text-[10px]" style={{ color: "var(--tx3)" }}>
              {log.date}
            </span>
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--s3)", color: "var(--tx3)" }}
            >
              {log.stage}
            </span>
          </div>
          <div
            className="text-xs leading-relaxed"
            style={{ color: log.isWarning ? "var(--amb)" : "var(--tx2)" }}
          >
            {log.body}
          </div>
        </div>
      ))}

      {/* Add note form */}
      <form onSubmit={handleAddNote} className="pt-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this transaction..."
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
          style={{
            backgroundColor: "var(--s2)",
            border: "1px solid var(--bdr)",
            color: "var(--tx)",
            minHeight: "50px",
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-2.5 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: "var(--s3)", border: "1px solid var(--bdr)", color: "var(--tx2)" }}
          >
            <option value="nda">NDA</option>
            <option value="hot">HoT</option>
            <option value="dd">DD</option>
            <option value="legal">Legal</option>
            <option value="completion">Completion</option>
          </select>
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--acc)", color: "#fff" }}
          >
            Add note →
          </button>
        </div>
      </form>
    </div>
  );
}

function generateMockTasks(stage: string): Task[] {
  const tasksByStage: Record<string, Task[]> = {
    nda: [
      { id: "nda-1", label: "RealHQ generated NDA", completed: true, completedAt: "2026-02-12", completedBy: "system", isAutomatic: true },
      { id: "nda-2", label: "NDA sent to counterparty", completed: true, completedAt: "2026-02-12", completedBy: "user", isAutomatic: false },
      { id: "nda-3", label: "NDA countersigned", completed: true, completedAt: "2026-02-14", completedBy: "user", isAutomatic: false },
      { id: "nda-4", label: "File signed copy", completed: true, completedAt: "2026-02-14", completedBy: "user", isAutomatic: false },
    ],
    hot: [
      { id: "hot-1", label: "Agree purchase price", completed: true, completedAt: "2026-02-18", completedBy: "user", isAutomatic: false },
      { id: "hot-2", label: "Agree conditions (subject to survey + financing)", completed: true, completedAt: "2026-02-20", completedBy: "user", isAutomatic: false },
      { id: "hot-3", label: "RealHQ generated LOI", completed: true, completedAt: "2026-02-20", completedBy: "system", isAutomatic: true },
      { id: "hot-4", label: "LOI signed by both parties", completed: true, completedAt: "2026-02-24", completedBy: "user", isAutomatic: false },
    ],
    dd: [
      { id: "dd-1", label: "Commission building survey", completed: true, completedAt: "2026-03-08", completedBy: "user", isAutomatic: false },
      { id: "dd-2", label: "Order environmental Phase I", completed: true, completedAt: "2026-03-08", completedBy: "user", isAutomatic: false },
      { id: "dd-3", label: "Request lease abstracts from seller", completed: true, completedAt: "2026-03-12", completedBy: "user", isAutomatic: false },
      { id: "dd-4", label: "Verify tenant estoppel certificates", completed: true, completedAt: "2026-03-15", completedBy: "user", isAutomatic: false },
      { id: "dd-5", label: "Order title search & commitment", completed: false, completedAt: "2026-03-18", completedBy: "user", isAutomatic: false },
      { id: "dd-6", label: "Review zoning compliance letter", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
    ],
    legal: [
      { id: "legal-1", label: "Instruct solicitor", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "legal-2", label: "Draft purchase contract", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "legal-3", label: "Raise enquiries", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "legal-4", label: "Review replies", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "legal-5", label: "Agree final contract", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "legal-6", label: "Exchange contracts", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
    ],
    completion: [
      { id: "comp-1", label: "Transfer funds", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "comp-2", label: "Register title", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "comp-3", label: "Handover keys", completed: false, completedAt: null, completedBy: "user", isAutomatic: false },
      { id: "comp-4", label: "Update property records", completed: false, completedAt: null, completedBy: "system", isAutomatic: true },
    ],
  };
  return tasksByStage[stage] ?? [];
}

function generateMockParties(type: string): Party[] {
  if (type === "acquisition") {
    return [
      { id: "p1", role: "BUYER", name: "Your Name / Entity", email: "you@example.com" },
      { id: "p2", role: "SELLER", name: "Commerce Park Holdings LLC", company: "Commerce Park Holdings LLC", email: "seller@example.com", phone: "(813) 555-0142" },
      { id: "p3", role: "BUYER'S ATTORNEY", name: "Jennifer Kim", company: "Kim & Associates", email: "jkim@kimlaw.com", phone: "(305) 555-0198" },
      { id: "p4", role: "SELLER'S ATTORNEY", name: "Robert Lawson", company: "Lawson Realty Law", email: "rlawson@lawsonlaw.com", phone: "(813) 555-0256" },
      { id: "p5", role: "SURVEYOR", name: "David Chen", company: "Apex Surveying", email: "dchen@apexsurvey.com", phone: "(305) 555-0311" },
      { id: "p6", role: "LENDER", name: "Chase Commercial Banking", company: "Chase Commercial", email: "sarah.webb@chase.com" },
    ];
  } else {
    return [
      { id: "p1", role: "SELLER", name: "Your Name / Entity", email: "you@example.com" },
      { id: "p2", role: "BUYER", name: "Acquisition Corp", email: "buyer@example.com", phone: "(555) 123-4567" },
      { id: "p3", role: "SELLER'S ATTORNEY", name: "Your Solicitor", company: "Law Firm LLP", email: "solicitor@example.com" },
      { id: "p4", role: "BUYER'S ATTORNEY", name: "Their Solicitor", company: "Another Law Firm", email: "theirlawyer@example.com" },
    ];
  }
}

function generateMockCosts(): Cost[] {
  return [
    { id: "c1", category: "Legal Fees", description: "Buyer's counsel", estimated: 8500, actual: 3200, paid: false, status: "RETAINER PAID" },
    { id: "c2", category: "Building Survey", description: "Full building survey", estimated: 4500, actual: 4500, paid: true, status: "PAID" },
    { id: "c3", category: "Environmental Phase I", description: "EnviroTech FL", estimated: 2800, actual: 2800, paid: true, status: "PAID" },
    { id: "c4", category: "Title Search & Insurance", description: "Not yet ordered", estimated: 3200, actual: 0, paid: false, status: "UNPAID" },
    { id: "c5", category: "Transfer Tax / Recording", description: "Documentary stamp tax", estimated: 6475, actual: 0, paid: false, status: "AT CLOSING" },
    { id: "c6", category: "Lender Arrangement Fee", description: "0.5% of loan", estimated: 6013, actual: 0, paid: false, status: "AT CLOSING" },
  ];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TransactionRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ agreedPrice: "", solicitorRef: "" });
  const [updating, setUpdating] = useState(false);
  const [ndaModal, setNdaModal] = useState(false);
  const [ndaForm, setNdaForm] = useState({ name: "", email: "" });
  const [ndaSending, setNdaSending] = useState(false);

  const loadRoom = useCallback(() => {
    if (!roomId) return;
    fetch(`/api/user/transactions/${roomId}`)
      .then((r) => r.json())
      .then((d: { room: Room }) => {
        // Add mock tasks, parties, and costs
        const roomWithEnhancements = {
          ...d.room,
          milestones: d.room.milestones.map((m) => ({
            ...m,
            tasks: generateMockTasks(m.stage),
          })),
          parties: generateMockParties(d.room.type),
          costs: generateMockCosts(),
        };
        setRoom(roomWithEnhancements);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  function handleMilestoneUpdate(id: string, status: string, notes?: string) {
    setRoom((r) => {
      if (!r) return r;
      return {
        ...r,
        milestones: r.milestones.map((m) =>
          m.id === id
            ? { ...m, status: status as Milestone["status"], notes: notes ?? m.notes, completedAt: status === "complete" ? new Date().toISOString() : null }
            : m
        ),
      };
    });
  }

  function handleDocAdded(doc: TxDocument) {
    setRoom((r) => r ? { ...r, documents: [doc, ...r.documents] } : r);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      const body: Record<string, unknown> = {};
      if (updateForm.agreedPrice) body.agreedPrice = parseFloat(updateForm.agreedPrice.replace(/[^0-9.]/g, ""));
      if (updateForm.solicitorRef) body.solicitorRef = updateForm.solicitorRef;
      const res = await fetch(`/api/user/transactions/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json() as { room: Partial<Room> };
        setRoom((r) => r ? { ...r, ...d.room } : r);
        setUpdateModal(false);
      }
    } catch { /* no-op */ }
    setUpdating(false);
  }

  async function handleNDA(e: React.FormEvent) {
    e.preventDefault();
    setNdaSending(true);
    try {
      const res = await fetch(`/api/user/transactions/${roomId}/nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: ndaForm.name, signerEmail: ndaForm.email }),
      });
      if (res.ok) {
        const d = await res.json() as { nda: NDASignature };
        setRoom((r) => r ? { ...r, ndaSignature: d.nda } : r);
        setNdaModal(false);
      }
    } catch { /* no-op */ }
    setNdaSending(false);
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Transaction Room" />
        <main className="flex-1 flex items-center justify-center py-12">
          <span className="text-sm" style={{ color: "var(--tx3)" }}>Loading…</span>
        </main>
      </AppShell>
    );
  }

  if (!room) {
    return (
      <AppShell>
        <TopBar title="Transaction Room" />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-sm font-semibold mb-2" style={{ color: "var(--tx2)" }}>Transaction room not found</div>
            <Link href="/transactions" className="text-xs" style={{ color: "var(--grn)" }}>← Back to transactions</Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const sym = "£";
  const dealName = room.assetName ?? room.dealAddress ?? "Unnamed deal";
  const typeLabel = room.type === "acquisition" ? "Acquisition" : "Disposal";
  const counterparty = room.type === "acquisition" ? room.seller : room.buyer;
  const completedMilestones = room.milestones.filter((m) => m.status === "complete").length;

  const statusStyle = {
    active:    { bg: "var(--grn-lt)", color: "var(--grn)" },
    exchanged: { bg: "var(--acc-lt)", color: "var(--acc)" },
    completed: { bg: "var(--grn-lt)", color: "var(--grn)" },
    withdrawn: { bg: "var(--s2)", color: "var(--tx2)" },
  }[room.status] ?? { bg: "var(--s2)", color: "var(--tx2)" };

  return (
    <AppShell>
      <TopBar title={dealName} />
      <main className="flex-1 px-4 lg:px-8 py-6 max-w-4xl mx-auto w-full space-y-6">

        {/* Back + breadcrumb */}
        <Link href="/transactions" className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: "var(--tx3)" }}>
          ← Transactions
        </Link>

        {/* ── Section 1: Deal Header ───────────────────────────────────────── */}
        <div className="rounded-xl px-5 py-4" style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s1)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                  style={{ backgroundColor: room.type === "acquisition" ? "var(--grn-lt)" : "var(--amb-lt)", color: room.type === "acquisition" ? "var(--grn)" : "var(--red)" }}
                >
                  {typeLabel}
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                >
                  {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </span>
              </div>
              <h1 className="text-lg font-bold mb-0.5" style={{ color: "var(--tx)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                {dealName}
              </h1>
              {counterparty && (
                <div className="text-xs" style={{ color: "var(--tx3)" }}>
                  {room.type === "acquisition" ? "Seller" : "Buyer"}: {counterparty}
                </div>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              {room.agreedPrice ? (
                <>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>Agreed price</div>
                  <div className="text-xl font-bold" style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), Georgia, serif" }}>
                    {fmt(room.agreedPrice, sym)}
                  </div>
                </>
              ) : room.askingPrice ? (
                <>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>Asking price</div>
                  <div className="text-xl font-bold" style={{ color: "var(--tx)", fontFamily: "var(--font-dm-serif), Georgia, serif" }}>
                    {fmt(room.askingPrice, sym)}
                  </div>
                </>
              ) : null}
              {room.solicitorRef && (
                <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>Ref: {room.solicitorRef}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "0.5px solid var(--s2)" }}>
            <div className="text-xs" style={{ color: "var(--tx3)" }}>
              {completedMilestones}/{room.milestones.length} milestones complete
            </div>
            <button
              onClick={() => {
                setUpdateForm({ agreedPrice: room.agreedPrice?.toString() ?? "", solicitorRef: room.solicitorRef ?? "" });
                setUpdateModal(true);
              }}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: "var(--s2)", color: "var(--tx2)" }}
            >
              Update deal →
            </button>
          </div>
        </div>

        {/* ── Section 2: Milestone Tracker ─────────────────────────────────── */}
        <div className="rounded-xl px-5 py-4" style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s1)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--tx3)" }}>
            Transaction Milestones
          </div>
          <MilestoneTracker milestones={room.milestones} roomId={room.id} onUpdate={handleMilestoneUpdate} />

          {/* Task checklist for active/in-progress milestones */}
          {room.milestones
            .filter((m) => m.status === "in_progress" || (m.status === "pending" && !room.milestones.some((x) => x.status === "in_progress")))
            .slice(0, 1)
            .map((milestone) => (
              <TaskChecklist
                key={milestone.id}
                milestone={milestone}
                onToggle={(taskId) => {
                  setRoom((r) => {
                    if (!r) return r;
                    return {
                      ...r,
                      milestones: r.milestones.map((m) =>
                        m.id === milestone.id
                          ? {
                              ...m,
                              tasks: m.tasks?.map((t) =>
                                t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
                              ),
                            }
                          : m
                      ),
                    };
                  });
                }}
              />
            ))}

          {/* Party Management within milestone section */}
          <PartyManagement parties={room.parties} />

          {/* Cost Tracker within milestone section */}
          <CostTracker costs={room.costs} currency={sym} />
        </div>

        {/* ── Section 3: Document Vault ────────────────────────────────────── */}
        <div className="rounded-xl px-5 py-4" style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s1)" }}>
          <DocumentVault documents={room.documents} roomId={room.id} onAdd={handleDocAdded} />
        </div>

        {/* ── Section 4: NDA Workflow ──────────────────────────────────────── */}
        <div className="rounded-xl px-5 py-4" style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s1)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--tx3)" }}>
            NDA Status
          </div>

          {!room.ndaSignature ? (
            <div className="flex items-center justify-between">
              <div className="text-xs" style={{ color: "var(--tx2)" }}>
                No NDA on file — send to counterparty before sharing sensitive documents
              </div>
              <button
                onClick={() => setNdaModal(true)}
                className="ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor: "var(--grn)", color: "#fff" }}
              >
                Send NDA →
              </button>
            </div>
          ) : room.ndaSignature.status === "signed" ? (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--grn-lt)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--grn)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "var(--grn)" }}>
                  NDA signed — {room.ndaSignature.signerName}
                </div>
                <div className="text-[10px]" style={{ color: "var(--tx3)" }}>
                  {room.ndaSignature.signedAt
                    ? new Date(room.ndaSignature.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : room.ndaSignature.signerEmail}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium" style={{ color: "var(--amb)" }}>
                  NDA {room.ndaSignature.status} — {room.ndaSignature.signerName}
                </div>
                <div className="text-[10px]" style={{ color: "var(--tx3)" }}>{room.ndaSignature.signerEmail}</div>
              </div>
              <button
                onClick={() => setNdaModal(true)}
                className="ml-4 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                style={{ backgroundColor: "var(--s2)", color: "var(--tx2)" }}
              >
                Resend
              </button>
            </div>
          )}
        </div>

        {/* ── Section 5: Timeline View ─────────────────────────────────────── */}
        <div className="rounded-xl px-5 py-4" style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s1)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--tx3)" }}>
            Timeline
          </div>
          <TimelineView milestones={room.milestones} />
        </div>

        {/* ── Section 6: Communication Log ─────────────────────────────────── */}
        <div className="rounded-xl px-5 py-4" style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s1)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--tx3)" }}>
            Communication Log
          </div>
          <CommunicationLog />
        </div>

      </main>

      {/* Update deal modal */}
      {updateModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setUpdateModal(false)} />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-60 rounded-2xl p-5 shadow-xl max-w-sm mx-auto"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="text-sm font-semibold mb-4" style={{ color: "var(--tx)" }}>Update Deal</div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "var(--tx2)" }}>Agreed price</label>
                <input
                  type="text"
                  value={updateForm.agreedPrice}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, agreedPrice: e.target.value }))}
                  placeholder="£2,500,000"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "var(--tx2)" }}>Solicitor reference</label>
                <input
                  type="text"
                  value={updateForm.solicitorRef}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, solicitorRef: e.target.value }))}
                  placeholder="ref/2026/001"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--grn)", color: "#fff" }}
                >
                  {updating ? "Saving…" : "Save →"}
                </button>
                <button type="button" onClick={() => setUpdateModal(false)} className="px-3 py-2 rounded-lg text-xs" style={{ color: "var(--tx3)" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* NDA modal */}
      {ndaModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setNdaModal(false)} />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-60 rounded-2xl p-5 shadow-xl max-w-sm mx-auto"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>Send NDA</div>
            <div className="text-xs mb-4" style={{ color: "var(--tx3)" }}>
              A standard mutual NDA will be generated and recorded. The counterparty&apos;s details will be stored on file.
            </div>
            <form onSubmit={handleNDA} className="space-y-3">
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "var(--tx2)" }}>Signer name</label>
                <input
                  required
                  type="text"
                  value={ndaForm.name}
                  onChange={(e) => setNdaForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "var(--tx2)" }}>Email address</label>
                <input
                  required
                  type="email"
                  value={ndaForm.email}
                  onChange={(e) => setNdaForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@company.com"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={ndaSending}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--grn)", color: "#fff" }}
                >
                  {ndaSending ? "Processing…" : "Record NDA →"}
                </button>
                <button type="button" onClick={() => setNdaModal(false)} className="px-3 py-2 rounded-lg text-xs" style={{ color: "var(--tx3)" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </AppShell>
  );
}
