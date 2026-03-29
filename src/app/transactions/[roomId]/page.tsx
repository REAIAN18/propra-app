"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: "system" | "user";
  isAutomatic?: boolean;
  overdue?: boolean;
  dueDate?: string;
}

interface ExpectedDocument {
  type: string;
  label: string;
  required: boolean;
  documentId?: string;
  status?: "uploaded" | "pending" | "overdue";
  dueDate?: string;
}

interface Milestone {
  id: string;
  stage: string;
  status: "pending" | "in_progress" | "complete";
  dueDate?: string;
  completedAt?: string;
  tasks?: Task[];
  expectedDocuments?: ExpectedDocument[];
}

interface Party {
  role: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}

interface Cost {
  category: string;
  description?: string;
  estimated: number;
  actual: number;
  paid: boolean;
  status?: string;
}

interface Note {
  id?: string;
  date: string;
  author: string;
  text: string;
  milestoneId?: string;
  isSystem?: boolean;
}

interface Room {
  id: string;
  type: string;
  status: string;
  askingPrice?: number;
  agreedPrice?: number;
  assetName?: string;
  dealAddress?: string;
  buyer?: string;
  seller?: string;
  createdAt: string;
  milestones: Milestone[];
  parties?: Party[];
  costs?: Cost[];
  notes?: Note[];
  expectedTimeline?: Record<string, string>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

const STAGE_LABELS: Record<string, string> = {
  nda: "NDA",
  heads_of_terms: "Heads of Terms",
  due_diligence: "Due Diligence",
  legal_exchange: "Legal / Exchange",
  completion: "Completion"
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StageBar({ milestones, expectedTimeline }: { milestones: Milestone[]; expectedTimeline?: Record<string, string> }) {
  return (
    <div style={{
      display: "flex",
      gap: 0,
      marginBottom: 24,
      border: "1px solid var(--bdr)",
      borderRadius: 10,
      overflow: "hidden"
    }}>
      {milestones.map((m, i) => {
        const isDone = m.status === "complete";
        const isCurrent = m.status === "in_progress";
        const expected = expectedTimeline?.[m.id];

        return (
          <div
            key={m.id}
            style={{
              flex: 1,
              padding: "10px 8px",
              textAlign: "center",
              background: isDone ? "var(--grn-lt)" : isCurrent ? "var(--acc-lt)" : "var(--s1)",
              borderRight: i < milestones.length - 1 ? "1px solid var(--bdr)" : "none",
              font: "500 9px/1 var(--mono)",
              textTransform: "uppercase",
              letterSpacing: 0.3,
              color: isDone ? "var(--grn)" : isCurrent ? "var(--acc)" : "var(--tx3)",
              position: "relative"
            }}
          >
            {STAGE_LABELS[m.stage] ?? m.stage}
            <span style={{
              display: "block",
              font: "400 8px var(--sans)",
              marginTop: 3,
              letterSpacing: 0,
              textTransform: "none"
            }}>
              {m.completedAt
                ? new Date(m.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " ✓"
                : isCurrent
                  ? "Started " + (m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "")
                  : expected
                    ? "Est. " + new Date(expected).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                    : ""
              }
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChecklistCard({ milestone, roomId, onUpdate }: { milestone: Milestone; roomId: string; onUpdate: () => void }) {
  const tasks = milestone.tasks ?? [];
  const completed = tasks.filter(t => t.completed).length;

  async function toggleTask(taskId: string) {
    try {
      await fetch(`/api/user/transactions/${roomId}/milestones/${milestone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "toggle" })
      });
      onUpdate();
    } catch {}
  }

  const isDone = milestone.status === "complete";

  return (
    <div style={{
      background: "var(--s1)",
      border: "1px solid var(--bdr)",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 14
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--bdr)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h4 style={{font: "600 13px var(--sans)", color: "var(--tx)"}}>
          {STAGE_LABELS[milestone.stage] ?? milestone.stage}
        </h4>
        <span style={{
          font: "500 9px/1 var(--mono)",
          padding: "2px 7px",
          borderRadius: 5,
          background: isDone ? "var(--grn-lt)" : "var(--s2)",
          color: isDone ? "var(--grn)" : "var(--tx3)",
          border: `1px solid ${isDone ? "var(--grn-bdr)" : "var(--bdr)"}`
        }}>
          {isDone ? "COMPLETE" : `${completed} of ${tasks.length} complete`}
        </span>
      </div>
      <div style={{padding: "0 18px 14px"}}>
        {tasks.map((task) => (
          <div key={task.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
            borderBottom: "1px solid rgba(37, 37, 51, 0.3)"
          }}>
            <div
              onClick={() => !task.isAutomatic && toggleTask(task.id)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: `1.5px solid ${task.overdue ? "var(--red)" : "var(--bdr)"}`,
                background: task.completed
                  ? task.isAutomatic ? "var(--acc)" : "var(--grn)"
                  : "var(--s2)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: task.isAutomatic ? "default" : "pointer",
                transition: "all .12s"
              }}
            >
              {task.completed && (
                <span style={{color: "#fff", fontSize: task.isAutomatic ? 9 : 11, fontWeight: 700}}>
                  {task.isAutomatic ? "⚡" : "✓"}
                </span>
              )}
            </div>
            <span style={{
              font: "400 12px var(--sans)",
              color: task.completed ? "var(--tx3)" : task.overdue ? "var(--red)" : "var(--tx)",
              textDecoration: task.completed ? "line-through" : "none",
              flex: 1
            }}>
              {task.label}
            </span>
            {task.completedAt && (
              <span style={{font: "400 10px var(--sans)", color: "var(--tx3)", whiteSpace: "nowrap"}}>
                {new Date(task.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {task.isAutomatic && " · Auto"}
              </span>
            )}
            {task.overdue && !task.completed && (
              <span style={{font: "400 10px var(--sans)", color: "var(--red)", whiteSpace: "nowrap"}}>
                Overdue
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentRoom({ milestone }: { milestone: Milestone }) {
  const docs = milestone.expectedDocuments ?? [];

  return (
    <div style={{
      background: "var(--s1)",
      border: "1px solid var(--bdr)",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 14
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--bdr)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h4 style={{font: "600 13px var(--sans)", color: "var(--tx)"}}>
          {STAGE_LABELS[milestone.stage] ?? milestone.stage} Documents
        </h4>
        <button style={{font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer", background: "none", border: "none"}}>
          Upload →
        </button>
      </div>
      {docs.map((doc, i) => {
        const isUploaded = doc.status === "uploaded";
        const isOverdue = doc.status === "overdue";

        return (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto auto",
            gap: 10,
            alignItems: "center",
            padding: "9px 18px",
            borderBottom: i < docs.length - 1 ? "1px solid rgba(37, 37, 51, 0.3)" : "none"
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              background: isUploaded ? "var(--grn-lt)" : isOverdue ? "var(--red-lt)" : "var(--s3)",
              border: `1px solid ${isUploaded ? "var(--grn-bdr)" : isOverdue ? "var(--red-bdr)" : "var(--bdr)"}`
            }}>
              {isUploaded ? "📄" : isOverdue ? "⚠" : "📋"}
            </div>
            <div>
              <div style={{font: "500 12px var(--sans)", color: "var(--tx)", lineHeight: 1.3}}>
                {doc.label}
              </div>
            </div>
            <span style={{
              font: "500 9px/1 var(--mono)",
              padding: "2px 7px",
              borderRadius: 5,
              background: isUploaded ? "var(--grn-lt)" : isOverdue ? "var(--red-lt)" : "var(--s3)",
              color: isUploaded ? "var(--grn)" : isOverdue ? "var(--red)" : "var(--tx3)",
              border: `1px solid ${isUploaded ? "var(--grn-bdr)" : isOverdue ? "var(--red-bdr)" : "var(--bdr)"}`
            }}>
              {isUploaded ? "UPLOADED" : isOverdue ? "OVERDUE" : "PENDING"}
            </span>
            {doc.dueDate && (
              <span style={{font: "400 10px var(--sans)", color: isOverdue ? "var(--red)" : "var(--tx3)"}}>
                Due {new Date(doc.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PartiesCard({ parties }: { parties: Party[] }) {
  return (
    <div style={{
      background: "var(--s1)",
      border: "1px solid var(--bdr)",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 14
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--bdr)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h4 style={{font: "600 13px var(--sans)", color: "var(--tx)"}}>Involved Parties</h4>
        <button style={{font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer", background: "none", border: "none"}}>
          + Add party
        </button>
      </div>
      {parties.map((party, i) => {
        const initials = party.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

        return (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 12,
            alignItems: "center",
            padding: "12px 18px",
            borderBottom: i < parties.length - 1 ? "1px solid rgba(37, 37, 51, 0.3)" : "none"
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--s3)",
              border: "1px solid var(--bdr)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "600 11px var(--sans)",
              color: "var(--tx3)"
            }}>
              {initials}
            </div>
            <div>
              <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2}}>
                {party.role}
              </div>
              <div style={{font: "500 12px var(--sans)", color: "var(--tx)"}}>
                {party.name}{party.company && ` — ${party.company}`}
              </div>
              {(party.email || party.phone) && (
                <div style={{font: "300 10px var(--sans)", color: "var(--tx3)"}}>
                  {party.email}{party.email && party.phone && " · "}{party.phone}
                </div>
              )}
            </div>
            <div style={{display: "flex", gap: 4}}>
              {party.email && (
                <button style={{
                  padding: "4px 10px",
                  borderRadius: 5,
                  font: "500 9px var(--sans)",
                  border: "1px solid var(--bdr)",
                  background: "transparent",
                  color: "var(--tx3)",
                  cursor: "pointer"
                }}>
                  Email
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CostTracker({ costs }: { costs: Cost[] }) {
  const totalEst = costs.reduce((s, c) => s + c.estimated, 0);
  const totalAct = costs.reduce((s, c) => s + c.actual, 0);
  const pctSpent = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) : 0;
  const sym = "£";

  return (
    <div style={{
      background: "var(--s1)",
      border: "1px solid var(--bdr)",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 14
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--bdr)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h4 style={{font: "600 13px var(--sans)", color: "var(--tx)"}}>Transaction Costs</h4>
        <span style={{font: "500 11px var(--sans)", color: "var(--acc)"}}>
          {fmt(totalAct, sym)} of {fmt(totalEst, sym)} estimated
        </span>
      </div>
      {costs.map((cost, i) => (
        <div key={i} style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto auto",
          alignItems: "center",
          gap: 12,
          padding: "10px 18px",
          borderBottom: i < costs.length - 1 ? "1px solid rgba(37, 37, 51, 0.3)" : "none"
        }}>
          <div>
            <div style={{font: "500 12px var(--sans)", color: "var(--tx)"}}>
              {cost.category}
            </div>
            {cost.description && (
              <div style={{font: "300 10px var(--sans)", color: "var(--tx3)"}}>
                {cost.description}
              </div>
            )}
          </div>
          <span style={{font: "500 11px var(--mono)", color: "var(--tx3)"}}>
            Est. {fmt(cost.estimated, sym)}
          </span>
          <span style={{font: "500 11px var(--mono)", color: "var(--tx)"}}>
            {cost.actual > 0 ? fmt(cost.actual, sym) : "—"}
          </span>
          <span style={{
            font: "500 9px/1 var(--mono)",
            padding: "2px 7px",
            borderRadius: 4,
            background: cost.paid ? "var(--grn-lt)" : cost.actual > 0 ? "var(--amb-lt)" : "var(--s3)",
            color: cost.paid ? "var(--grn)" : cost.actual > 0 ? "var(--amb)" : "var(--tx3)",
            border: `1px solid ${cost.paid ? "var(--grn-bdr)" : cost.actual > 0 ? "var(--amb-bdr)" : "var(--bdr)"}`
          }}>
            {cost.status ?? (cost.paid ? "PAID" : cost.actual > 0 ? "PENDING" : "UNPAID")}
          </span>
          <span style={{color: "var(--tx3)", fontSize: 12}}>→</span>
        </div>
      ))}
      <div style={{
        padding: "12px 18px",
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto auto",
        gap: 12,
        alignItems: "center",
        background: "var(--s2)"
      }}>
        <div style={{font: "600 12px var(--sans)", color: "var(--tx)"}}>Total</div>
        <span style={{font: "600 11px var(--mono)", color: "var(--tx3)"}}>{fmt(totalEst, sym)}</span>
        <span style={{font: "600 11px var(--mono)", color: "var(--tx)"}}>{fmt(totalAct, sym)}</span>
        <span style={{font: "500 10px var(--sans)", color: "var(--amb)"}}>{pctSpent}% spent</span>
        <span></span>
      </div>
    </div>
  );
}

function CommunicationLog({ notes }: { notes: Note[] }) {
  return (
    <div style={{
      background: "var(--s1)",
      border: "1px solid var(--bdr)",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 14
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--bdr)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h4 style={{font: "600 13px var(--sans)", color: "var(--tx)"}}>Notes & Activity</h4>
        <button style={{font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer", background: "none", border: "none"}}>
          + Add note
        </button>
      </div>
      {notes.map((note, i) => (
        <div key={note.id ?? i} style={{
          padding: "14px 18px",
          borderBottom: i < notes.length - 1 ? "1px solid rgba(37, 37, 51, 0.3)" : "none"
        }}>
          <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 4}}>
            <span style={{font: "500 11px var(--sans)", color: "var(--tx)"}}>{note.author}</span>
            <span style={{font: "400 10px var(--sans)", color: "var(--tx3)"}}>
              {new Date(note.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {new Date(note.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div style={{
            font: "300 12px/1.6 var(--sans)",
            color: note.isSystem ? "var(--amb)" : "var(--tx2)"
          }}>
            {note.text}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TransactionDetailPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/user/transactions/${roomId}`)
      .then((r) => r.json())
      .then((d: { room: Room }) => setRoom(d.room))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  async function refetch() {
    if (!roomId) return;
    const res = await fetch(`/api/user/transactions/${roomId}`);
    const d = await res.json();
    setRoom(d.room);
  }

  if (loading || !room) {
    return (
      <AppShell>
        <TopBar title="Transaction" />
        <main style={{padding: 48, textAlign: "center", font: "400 13px var(--sans)", color: "var(--tx3)"}}>
          {loading ? "Loading..." : "Transaction not found"}
        </main>
      </AppShell>
    );
  }

  const currentMilestone = room.milestones.find(m => m.status === "in_progress") ?? room.milestones[0];
  const parties = room.parties ?? [];
  const costs = room.costs ?? [];
  const notes = room.notes ?? [];
  const sym = "£";

  return (
    <AppShell>
      <TopBar title={room.assetName ?? "Transaction"} />
      <main style={{
        padding: "28px 32px 80px",
        maxWidth: 1080,
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 4
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: 100,
            font: "500 8px/1 var(--mono)",
            letterSpacing: 0.3,
            textTransform: "uppercase",
            background: room.type === "acquisition" ? "var(--grn-lt)" : "var(--red-lt)",
            color: room.type === "acquisition" ? "var(--grn)" : "var(--red)",
            border: `1px solid ${room.type === "acquisition" ? "var(--grn-bdr)" : "var(--red-bdr)"}`
          }}>
            {room.type === "acquisition" ? "ACQUISITION" : "DISPOSAL"}
          </span>
          <span style={{font: "300 12px var(--sans)", color: "var(--tx3)"}}>
            Started {new Date(room.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>

        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20
        }}>
          <div>
            <h1 style={{
              fontFamily: "var(--serif)",
              fontSize: 24,
              fontWeight: 400,
              color: "var(--tx)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              marginBottom: 4
            }}>
              {room.assetName ?? "Unnamed Transaction"}
            </h1>
            <p style={{font: "300 13px var(--sans)", color: "var(--tx3)"}}>
              {(room.agreedPrice ?? room.askingPrice) ? fmt(room.agreedPrice ?? room.askingPrice!, sym) : ""}
              {room.dealAddress && (room.agreedPrice ?? room.askingPrice) && " · "}
              {room.dealAddress}
            </p>
          </div>
          <div style={{display: "flex", gap: 6}}>
            <button style={{
              height: 30,
              padding: "0 12px",
              background: "transparent",
              color: "var(--tx2)",
              border: "1px solid var(--bdr)",
              borderRadius: 7,
              font: "500 11px/1 var(--sans)",
              cursor: "pointer"
            }}>
              Export →
            </button>
          </div>
        </div>

        {/* Stage Bar */}
        <StageBar milestones={room.milestones} expectedTimeline={room.expectedTimeline} />

        {/* Next Action Insight */}
        {currentMilestone && currentMilestone.tasks && currentMilestone.tasks.length > 0 && (
          <div style={{
            background: "var(--s1)",
            border: "1px solid var(--acc-bdr)",
            borderRadius: 10,
            padding: "22px 24px",
            marginBottom: 24,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 24,
            alignItems: "center"
          }}>
            <div>
              <div style={{font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8}}>
                Next Action
              </div>
              <div style={{fontFamily: "var(--serif)", fontSize: 18, fontWeight: 400, color: "var(--tx)", marginBottom: 3}}>
                {currentMilestone.tasks.find(t => !t.completed)?.label ?? "All tasks complete"}
              </div>
              <div style={{fontSize: 12, color: "var(--tx3)", lineHeight: 1.6, maxWidth: 480}}>
                Current stage: {STAGE_LABELS[currentMilestone.stage] ?? currentMilestone.stage}
              </div>
            </div>
            <div style={{textAlign: "right"}}>
              <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}>
                Progress
              </div>
              <div style={{fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, color: "var(--tx)", letterSpacing: "-0.03em", lineHeight: 1}}>
                {currentMilestone.tasks.filter(t => t.completed).length}
                <small style={{fontFamily: "var(--sans)", fontSize: 14, color: "var(--tx3)"}}>
                  /{currentMilestone.tasks.length}
                </small>
              </div>
              <div style={{fontSize: 11, color: "var(--tx3)", marginTop: 4}}>tasks complete</div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 24
        }}>
          {/* Left Column: Checklists */}
          <div>
            <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12}}>
              Current Stage Tasks
            </div>
            {currentMilestone && (
              <ChecklistCard milestone={currentMilestone} roomId={roomId} onUpdate={refetch} />
            )}

            {/* Completed stages */}
            {room.milestones.filter(m => m.status === "complete").map(m => (
              <ChecklistCard key={m.id} milestone={m} roomId={roomId} onUpdate={refetch} />
            ))}
          </div>

          {/* Right Column: Documents */}
          <div>
            <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12}}>
              Document Room
            </div>
            {currentMilestone && <DocumentRoom milestone={currentMilestone} />}
            {room.milestones.filter(m => m.status === "complete" && m.expectedDocuments && m.expectedDocuments.length > 0).map(m => (
              <DocumentRoom key={m.id} milestone={m} />
            ))}
          </div>
        </div>

        {/* Parties */}
        {parties.length > 0 && (
          <>
            <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingTop: 4}}>
              Parties
            </div>
            <PartiesCard parties={parties} />
          </>
        )}

        {/* Costs */}
        {costs.length > 0 && (
          <>
            <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingTop: 4}}>
              Cost Tracker
            </div>
            <CostTracker costs={costs} />
          </>
        )}

        {/* Communication Log */}
        {notes.length > 0 && (
          <>
            <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingTop: 4}}>
              Communication Log
            </div>
            <CommunicationLog notes={notes} />
          </>
        )}
      </main>
    </AppShell>
  );
}
