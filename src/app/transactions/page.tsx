"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

interface RoomListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  askingPrice: number | null;
  agreedPrice: number | null;
  buyer: string | null;
  seller: string | null;
  createdAt: string;
  milestoneProgress: { completed: number; total: number };
}

interface CreateModalState {
  open: boolean;
  type: "acquisition" | "disposal";
  askingPrice: string;
  counterparty: string;
  submitting: boolean;
}

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  active:     { bg: "#E8F5EE", color: "#34d399", label: "Active" },
  exchanged:  { bg: "#EFF6FF", color: "#1E40AF", label: "Exchanged" },
  completed:  { bg: "#F0FDF4", color: "#34d399", label: "Completed" },
  withdrawn:  { bg: "var(--s2)", color: "var(--tx2)", label: "Withdrawn" },
};

const typeStyles: Record<string, { bg: string; color: string }> = {
  acquisition: { bg: "#F0FDF4", color: "#34d399" },
  disposal:    { bg: "#FFF7ED", color: "#C2410C" },
};

export default function TransactionsPage() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<CreateModalState>({
    open: false, type: "acquisition", askingPrice: "", counterparty: "", submitting: false,
  });

  useEffect(() => {
    fetch("/api/user/transactions")
      .then((r) => r.json())
      .then((d: { rooms: RoomListItem[] }) => setRooms(d.rooms ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setModal((m) => ({ ...m, submitting: true }));
    try {
      const res = await fetch("/api/user/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: modal.type,
          askingPrice: modal.askingPrice ? parseFloat(modal.askingPrice.replace(/[^0-9.]/g, "")) : undefined,
          counterparty: modal.counterparty || undefined,
        }),
      });
      if (res.ok) {
        const d = await res.json() as { room: { id: string } };
        window.location.href = `/transactions/${d.room.id}`;
      }
    } catch {
      setModal((m) => ({ ...m, submitting: false }));
    }
  }

  const sym = "£";

  return (
    <AppShell>
      <TopBar title="Transactions" />
      <main className="flex-1 px-4 lg:px-8 py-6 max-w-4xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--tx)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
              Transaction Rooms
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
              Manage acquisitions and disposals from LOI to completion
            </p>
          </div>
          <button
            onClick={() => setModal((m) => ({ ...m, open: true }))}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "#34d399", color: "#fff" }}
          >
            New transaction →
          </button>
        </div>

        {/* Rooms list */}
        {loading ? (
          <div className="text-sm text-center py-12" style={{ color: "var(--tx3)" }}>Loading…</div>
        ) : rooms.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ border: "1px dashed var(--bdr)", backgroundColor: "#FAFAFA" }}
          >
            <div className="text-sm font-semibold mb-2" style={{ color: "#374151" }}>No transactions yet</div>
            <div className="text-xs mb-4" style={{ color: "var(--tx3)" }}>
              Create a deal room for an acquisition or disposal to track NDA, documents, and milestones.
            </div>
            <button
              onClick={() => setModal((m) => ({ ...m, open: true }))}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#34d399", color: "#fff" }}
            >
              Create first transaction →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => {
              const st = statusStyles[room.status] ?? statusStyles.active;
              const tt = typeStyles[room.type] ?? typeStyles.acquisition;
              const counterparty = room.type === "acquisition" ? room.seller : room.buyer;
              const progress = room.milestoneProgress;

              return (
                <Link
                  key={room.id}
                  href={`/transactions/${room.id}`}
                  className="block rounded-xl px-5 py-4 transition-all hover:shadow-sm"
                  style={{ border: "0.5px solid var(--bdr)", backgroundColor: "var(--s1)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                          style={{ backgroundColor: tt.bg, color: tt.color }}
                        >
                          {room.type}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--tx)" }}>
                        {room.name}
                      </div>
                      {counterparty && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
                          {room.type === "acquisition" ? "Seller" : "Buyer"}: {counterparty}
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      {(room.agreedPrice ?? room.askingPrice) ? (
                        <div className="text-sm font-bold" style={{ color: "var(--tx)" }}>
                          {fmt(room.agreedPrice ?? room.askingPrice!, sym)}
                        </div>
                      ) : null}
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--tx3)" }}>
                        {new Date(room.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>

                  {/* Milestone progress bar */}
                  {progress.total > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: "var(--tx3)" }}>
                          Milestones {progress.completed}/{progress.total}
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: "#374151" }}>
                          {Math.round((progress.completed / progress.total) * 100)}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full" style={{ backgroundColor: "var(--s2)" }}>
                        <div
                          className="h-1 rounded-full transition-all"
                          style={{
                            width: `${(progress.completed / progress.total) * 100}%`,
                            backgroundColor: room.status === "completed" ? "#34d399" : "#7c6af0",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Create modal */}
      {modal.open && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setModal((m) => ({ ...m, open: false }))}
          />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-60 rounded-2xl p-6 shadow-xl max-w-sm mx-auto"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>New Transaction</div>
              <button
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                className="text-lg leading-none hover:opacity-60"
                style={{ color: "var(--tx3)" }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>Type</label>
                <div className="flex gap-2">
                  {(["acquisition", "disposal"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModal((m) => ({ ...m, type: t }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: modal.type === t ? "#34d399" : "var(--s2)",
                        color: modal.type === t ? "#fff" : "#374151",
                        border: modal.type === t ? "none" : "1px solid var(--bdr)",
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>
                  {modal.type === "acquisition" ? "Seller name" : "Buyer name"} (optional)
                </label>
                <input
                  type="text"
                  value={modal.counterparty}
                  onChange={(e) => setModal((m) => ({ ...m, counterparty: e.target.value }))}
                  placeholder="Counterparty name"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                  onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--bdr)")}
                />
              </div>

              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: "#374151" }}>
                  {modal.type === "acquisition" ? "Asking price" : "Guide price"} (optional)
                </label>
                <input
                  type="text"
                  value={modal.askingPrice}
                  onChange={(e) => setModal((m) => ({ ...m, askingPrice: e.target.value }))}
                  placeholder="£2,500,000"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                  onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--bdr)")}
                />
              </div>

              <button
                type="submit"
                disabled={modal.submitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#34d399", color: "#fff" }}
              >
                {modal.submitting ? "Creating…" : "Create transaction room →"}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  );
}
