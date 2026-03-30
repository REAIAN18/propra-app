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
  milestones: Array<{ id: string; stage: string; status: string }>;
  parties?: Array<{role: string; name: string}>;
  costs?: Array<{estimated: number; actual: number; paid: boolean}>;
  tasks?: Array<{overdue: boolean}>;
  nextAction?: string;
  daysActive?: number;
}

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

export default function TransactionsPage() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetch("/api/user/transactions")
      .then((r) => r.json())
      .then((d: { rooms: RoomListItem[] }) => setRooms(d.rooms ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeRooms = rooms.filter(r => r.status === "active");
  const completedRooms = rooms.filter(r => r.status === "completed");

  // Calculate KPIs
  const totalValue = activeRooms.reduce((sum, r) => sum + (r.agreedPrice ?? r.askingPrice ?? 0), 0);
  const totalCosts = activeRooms.reduce((sum, r) => {
    const costs = r.costs ?? [];
    return sum + costs.reduce((s, c) => s + (c.actual || 0), 0);
  }, 0);
  const estimatedCosts = activeRooms.reduce((sum, r) => {
    const costs = r.costs ?? [];
    return sum + costs.reduce((s, c) => s + c.estimated, 0);
  }, 0);
  const avgDays = activeRooms.length > 0
    ? Math.round(activeRooms.reduce((sum, r) => sum + (r.daysActive ?? 0), 0) / activeRooms.length)
    : 0;
  const tasksDue = activeRooms.reduce((sum, r) => {
    const tasks = r.tasks ?? [];
    return sum + tasks.filter(t => t.overdue).length;
  }, 0);

  const sym = "£";

  const acquisitionCount = activeRooms.filter(r => r.type === "acquisition").length;
  const disposalCount = activeRooms.filter(r => r.type === "disposal").length;

  return (
    <AppShell>
      <TopBar title="Transactions" />
      <main style={{
        flex: 1,
        padding: "28px 32px 80px",
        maxWidth: 1080,
        margin: "0 auto",
        width: "100%"
      }}>
        {/* Header */}
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
              Transactions
            </h1>
            <p style={{
              font: "300 13px var(--sans)",
              color: "var(--tx3)"
            }}>
              Active acquisitions and disposals with full tracking.
            </p>
          </div>
          <div style={{display: "flex", gap: 6}}>
            {completedRooms.length > 0 && (
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  background: "transparent",
                  color: "var(--tx2)",
                  border: "1px solid var(--bdr)",
                  borderRadius: 7,
                  font: "500 11px/1 var(--sans)",
                  cursor: "pointer",
                  transition: "all .12s"
                }}
              >
                Completed ({completedRooms.length})
              </button>
            )}
            <Link
              href="/scout"
              style={{
                height: 30,
                padding: "0 14px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                font: "600 11px/1 var(--sans)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
              }}
            >
              + New transaction
            </Link>
          </div>
        </div>

        {/* KPIs */}
        {!loading && activeRooms.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 1,
            background: "var(--bdr)",
            border: "1px solid var(--bdr)",
            borderRadius: "var(--r)",
            overflow: "hidden",
            marginBottom: 24
          }}>
            <div style={{background: "var(--s1)", padding: "14px 16px"}}>
              <div style={{font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6}}>
                Active
              </div>
              <div style={{fontFamily: "var(--serif)", fontSize: 20, color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1}}>
                {activeRooms.length}
              </div>
              <div style={{font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: 3}}>
                {acquisitionCount} acquisition · {disposalCount} disposal
              </div>
            </div>
            <div style={{background: "var(--s1)", padding: "14px 16px"}}>
              <div style={{font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6}}>
                Total Value
              </div>
              <div style={{fontFamily: "var(--serif)", fontSize: 20, color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1}}>
                {fmt(totalValue, sym)}
              </div>
              <div style={{font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: 3}}>
                across active deals
              </div>
            </div>
            <div style={{background: "var(--s1)", padding: "14px 16px"}}>
              <div style={{font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6}}>
                Costs to Date
              </div>
              <div style={{fontFamily: "var(--serif)", fontSize: 20, color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1}}>
                {fmt(totalCosts, sym)}
              </div>
              <div style={{font: "400 10px var(--sans)", color: "var(--amb)", marginTop: 3}}>
                {fmt(estimatedCosts, sym)} estimated total
              </div>
            </div>
            <div style={{background: "var(--s1)", padding: "14px 16px"}}>
              <div style={{font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6}}>
                Avg Timeline
              </div>
              <div style={{fontFamily: "var(--serif)", fontSize: 20, color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1}}>
                {avgDays}<span style={{fontFamily: "var(--sans)", fontSize: 10, color: "var(--tx3)", fontWeight: 400}}>days</span>
              </div>
              <div style={{font: "400 10px var(--sans)", color: "var(--grn)", marginTop: 3}}>
                on track
              </div>
            </div>
            <div style={{background: "var(--s1)", padding: "14px 16px"}}>
              <div style={{font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6}}>
                Tasks Due
              </div>
              <div style={{fontFamily: "var(--serif)", fontSize: 20, color: tasksDue > 0 ? "var(--amb)" : "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1}}>
                {tasksDue}
              </div>
              {tasksDue > 0 && (
                <div style={{font: "400 10px var(--sans)", color: "var(--amb)", marginTop: 3}}>
                  {tasksDue} overdue
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Transactions */}
        {!loading && activeRooms.length > 0 && (
          <>
            <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingTop: 4}}>
              Active Transactions
            </div>
            <div style={{marginBottom: 24}}>
              {activeRooms.map((room) => {
                const parties = room.parties ?? [];
                const costs = room.costs ?? [];
                const totalCost = costs.reduce((s, c) => s + (c.actual || 0), 0);
                const estCost = costs.reduce((s, c) => s + c.estimated, 0);
                const tasks = room.tasks ?? [];
                const overdueTasks = tasks.filter(t => t.overdue).length;

                return (
                  <Link
                    key={room.id}
                    href={`/transactions/${room.id}`}
                    style={{
                      display: "block",
                      background: "var(--s1)",
                      border: "1px solid var(--bdr)",
                      borderRadius: "var(--r)",
                      marginBottom: 14,
                      cursor: "pointer",
                      textDecoration: "none"
                    }}
                  >
                    <div style={{padding: 18}}>
                      <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: "100px",
                          font: "500 8px/1 var(--mono)",
                          letterSpacing: 0.3,
                          textTransform: "uppercase",
                          background: room.type === "acquisition" ? "var(--grn-lt)" : "var(--red-lt)",
                          color: room.type === "acquisition" ? "var(--grn)" : "var(--red)",
                          border: `1px solid ${room.type === "acquisition" ? "var(--grn-bdr)" : "var(--red-bdr)"}`
                        }}>
                          {room.type === "acquisition" ? "ACQUISITION" : "DISPOSAL"}
                        </span>
                        <span style={{font: "600 15px var(--sans)", color: "var(--tx)"}}>
                          {room.name || "Unnamed Transaction"}
                        </span>
                        {(room.agreedPrice ?? room.askingPrice) && (
                          <span style={{font: "500 11px var(--mono)", color: "var(--tx2)", marginLeft: "auto"}}>
                            {fmt(room.agreedPrice ?? room.askingPrice!, sym)}
                          </span>
                        )}
                      </div>
                      <div style={{font: "300 11px var(--sans)", color: "var(--tx3)", marginBottom: 14}}>
                        Created {new Date(room.createdAt).toLocaleDateString("en-GB", {day: "numeric", month: "short"})} · {room.daysActive ?? 0} days active
                      </div>

                      {/* Mini stage bar */}
                      <div style={{
                        display: "flex",
                        gap: 0,
                        border: "1px solid var(--bdr)",
                        borderRadius: 6,
                        overflow: "hidden",
                        marginBottom: 12
                      }}>
                        {room.milestones.map((m, i) => (
                          <div key={m.id} style={{
                            flex: 1,
                            padding: 6,
                            textAlign: "center",
                            background: m.status === "complete" ? "var(--grn-lt)" : m.status === "in_progress" ? "var(--acc-lt)" : "var(--s1)",
                            font: "500 8px/1 var(--mono)",
                            color: m.status === "complete" ? "var(--grn)" : m.status === "in_progress" ? "var(--acc)" : "var(--tx3)",
                            borderLeft: i > 0 ? "1px solid var(--bdr)" : "none"
                          }}>
                            {m.stage.toUpperCase().replace(/_/g, " ")} {m.status === "complete" ? "✓" : ""}
                          </div>
                        ))}
                      </div>

                      <div style={{display: "flex", gap: 16, font: "400 11px var(--sans)", color: "var(--tx3)", flexWrap: "wrap"}}>
                        {room.nextAction && (
                          <span><strong style={{color: "var(--tx)"}}>Next action:</strong> {room.nextAction}</span>
                        )}
                        {parties.length > 0 && (
                          <span><strong style={{color: "var(--tx)"}}>Parties:</strong> {parties.length} involved</span>
                        )}
                        {costs.length > 0 && (
                          <span><strong style={{color: "var(--tx)"}}>Costs:</strong> {fmt(totalCost, sym)} / {fmt(estCost, sym)} est.</span>
                        )}
                        {overdueTasks > 0 && (
                          <span style={{color: "var(--amb)"}}><strong>⚠ {overdueTasks} tasks overdue</strong></span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && activeRooms.length === 0 && (
          <div style={{
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
            borderRadius: "var(--r)",
            padding: "32px 24px",
            textAlign: "center"
          }}>
            <div style={{font: "500 14px var(--sans)", color: "var(--tx2)", marginBottom: 6}}>
              No active transactions
            </div>
            <div style={{font: "300 12px var(--sans)", color: "var(--tx3)", marginBottom: 16}}>
              Track acquisitions and disposals from NDA to completion
            </div>
            <Link
              href="/scout"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 38,
                padding: "0 16px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                font: "600 12px/1 var(--sans)",
                cursor: "pointer",
                textDecoration: "none"
              }}
            >
              Browse Scout pipeline →
            </Link>
          </div>
        )}

        {/* Completed transactions (collapsible) */}
        {showCompleted && completedRooms.length > 0 && (
          <>
            <div style={{font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingTop: 24}}>
              Completed Transactions
            </div>
            <div>
              {completedRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/transactions/${room.id}`}
                  style={{
                    display: "block",
                    background: "var(--s1)",
                    border: "1px solid var(--bdr)",
                    borderRadius: "var(--r)",
                    padding: "14px 18px",
                    marginBottom: 8,
                    cursor: "pointer",
                    textDecoration: "none"
                  }}
                >
                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    <span style={{font: "500 13px var(--sans)", color: "var(--tx)"}}>
                      {room.name || "Unnamed Transaction"}
                    </span>
                    <span style={{
                      font: "500 9px/1 var(--mono)",
                      padding: "2px 7px",
                      borderRadius: 5,
                      background: "var(--grn-lt)",
                      color: "var(--grn)",
                      border: "1px solid var(--grn-bdr)"
                    }}>
                      COMPLETE
                    </span>
                    {(room.agreedPrice ?? room.askingPrice) && (
                      <span style={{font: "500 11px var(--mono)", color: "var(--tx2)", marginLeft: "auto"}}>
                        {fmt(room.agreedPrice ?? room.askingPrice!, sym)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {loading && (
          <div style={{textAlign: "center", padding: 48, font: "400 13px var(--sans)", color: "var(--tx3)"}}>
            Loading transactions...
          </div>
        )}
      </main>
    </AppShell>
  );
}
