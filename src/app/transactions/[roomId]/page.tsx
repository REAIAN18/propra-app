"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Milestone {
  id: string;
  stage: string;
  status: "pending" | "in_progress" | "complete";
  completedAt: string | null;
  notes: string | null;
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
  nda:            { bg: "#F0FDF4", color: "#34d399" },
  title_register: { bg: "#EFF6FF", color: "#1E40AF" },
  searches:       { bg: "#FFF7ED", color: "#C2410C" },
  survey:         { bg: "#FFFBEB", color: "#fbbf24" },
  contracts:      { bg: "#FEF2F2", color: "#f87171" },
  enquiries:      { bg: "#F5F3FF", color: "#7C3AED" },
  finance:        { bg: "#ECFDF5", color: "#065F46" },
  other:          { bg: "var(--s2)", color: "var(--tx2)" },
};

const STATUS_COLORS = {
  pending:     { bg: "var(--s2)", color: "var(--tx2)" },
  in_progress: { bg: "#EFF6FF", color: "#1E40AF" },
  complete:    { bg: "#F0FDF4", color: "#34d399" },
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
                <div className="text-center text-[9px] leading-tight" style={{ color: isComplete ? "#34d399" : "var(--tx2)" }}>
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
                  style={{ minWidth: 12, backgroundColor: isComplete ? "#34d399" : "var(--bdr)" }}
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
              <span className="text-xs flex-1" style={{ color: "#374151" }}>
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
                <div className="text-xs font-semibold mb-2" style={{ color: "#374151" }}>
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
                      style={{ backgroundColor: "#34d399", color: "#fff" }}
                    >
                      {saving ? "Saving…" : "Mark complete ✓"}
                    </button>
                  )}
                  {m.status !== "in_progress" && m.status !== "complete" && (
                    <button
                      onClick={() => save(m.id, "in_progress")}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "#EFF6FF", color: "#1E40AF" }}
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
          style={{ backgroundColor: "#34d399", color: "#fff" }}
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
                  <span className="text-xs flex-1 truncate" style={{ color: "#374151" }}>{doc.name}</span>
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
                      style={{ color: "#34d399" }}
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
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>Document name</label>
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
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>Category</label>
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
                <span style={{ color: "#374151" }}>Mark as confidential</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={uploading || !form.name}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#34d399", color: "#fff" }}
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
      .then((d: { room: Room }) => setRoom(d.room))
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
            <div className="text-sm font-semibold mb-2" style={{ color: "#374151" }}>Transaction room not found</div>
            <Link href="/transactions" className="text-xs" style={{ color: "#34d399" }}>← Back to transactions</Link>
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
    active:    { bg: "#E8F5EE", color: "#34d399" },
    exchanged: { bg: "#EFF6FF", color: "#1E40AF" },
    completed: { bg: "#F0FDF4", color: "#34d399" },
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
                  style={{ backgroundColor: room.type === "acquisition" ? "#F0FDF4" : "#FFF7ED", color: room.type === "acquisition" ? "#34d399" : "#C2410C" }}
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
                  <div className="text-xl font-bold" style={{ color: "#34d399", fontFamily: "var(--font-dm-serif), Georgia, serif" }}>
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
              style={{ backgroundColor: "var(--s2)", color: "#374151" }}
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
                style={{ backgroundColor: "#34d399", color: "#fff" }}
              >
                Send NDA →
              </button>
            </div>
          ) : room.ndaSignature.status === "signed" ? (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#F0FDF4" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#34d399" }}>
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
                <div className="text-xs font-medium" style={{ color: "#fbbf24" }}>
                  NDA {room.ndaSignature.status} — {room.ndaSignature.signerName}
                </div>
                <div className="text-[10px]" style={{ color: "var(--tx3)" }}>{room.ndaSignature.signerEmail}</div>
              </div>
              <button
                onClick={() => setNdaModal(true)}
                className="ml-4 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                style={{ backgroundColor: "var(--s2)", color: "#374151" }}
              >
                Resend
              </button>
            </div>
          )}
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
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>Agreed price</label>
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
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>Solicitor reference</label>
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
                  style={{ backgroundColor: "#34d399", color: "#fff" }}
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
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>Signer name</label>
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
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>Email address</label>
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
                  style={{ backgroundColor: "#34d399", color: "#fff" }}
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
