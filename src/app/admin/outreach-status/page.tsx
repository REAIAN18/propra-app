import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WAVE1_FL_PROSPECTS } from "@/lib/wave1-fl-prospects";
import { WAVE1_SEUK_PROSPECTS } from "@/lib/wave1-seuk-prospects";

export const metadata = { title: "Outreach Status — RealHQ Admin" };

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

function fmt(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeUntil(date: Date): string {
  const secs = Math.floor((date.getTime() - Date.now()) / 1000);
  if (secs <= 0) return "overdue";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.floor(hrs / 24)}d`;
}

export default async function OutreachStatusPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const allProspects = [...WAVE1_FL_PROSPECTS, ...WAVE1_SEUK_PROSPECTS];
  const allKeys = allProspects.map((p) => p.prospectKey);

  const [statuses, allScheduled, sentToday, totalBounced] = await Promise.all([
    prisma.prospectStatus.findMany({
      where: { prospectKey: { in: allKeys } },
    }),
    prisma.scheduledEmail.findMany({
      where: { prospectKey: { in: allKeys } },
      orderBy: { sendAfter: "asc" },
    }),
    prisma.scheduledEmail.count({
      where: {
        prospectKey: { in: allKeys },
        sentAt: { gte: todayStart },
      },
    }),
    prisma.prospectStatus.count({
      where: {
        prospectKey: { in: allKeys },
        emailBounced: true,
      },
    }),
  ]);

  const statusMap = Object.fromEntries(statuses.map((s) => [s.prospectKey, s]));
  const scheduledByKey: Record<string, typeof allScheduled> = {};
  for (const e of allScheduled) {
    if (!e.prospectKey) continue;
    if (!scheduledByKey[e.prospectKey]) scheduledByKey[e.prospectKey] = [];
    scheduledByKey[e.prospectKey].push(e);
  }

  const pending = allScheduled.filter((e) => !e.sentAt);
  const upcomingPending = pending.filter((e) => e.sendAfter > now);
  const overduePending = pending.filter((e) => e.sendAfter <= now);

  // Summary stats
  const totalQueued = allScheduled.length;
  const totalSent = allScheduled.filter((e) => e.sentAt).length;

  // Group upcoming by date
  const byDate: Record<string, typeof allScheduled> = {};
  for (const e of upcomingPending) {
    const key = fmtFull(e.sendAfter);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(e);
  }

  // Status badge config
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    contacted:  { label: "contacted",  color: "#1647E8", bg: "#1647E822" },
    bounced:    { label: "bounced",    color: "#FF8080", bg: "#FF808022" },
    clicked:    { label: "clicked",    color: "#F5A94A", bg: "#F5A94A22" },
    booked:     { label: "booked",     color: "#0A8A4C", bg: "#0A8A4C22" },
    demo_booked: { label: "demo booked", color: "#0A8A4C", bg: "#0A8A4C22" },
    to_contact: { label: "to contact", color: "#5a7a96", bg: "#1a2d45" },
  };

  function touchCell(
    prospectKey: string,
    touchNum: number,
  ): { state: "sent" | "scheduled" | "pending" | "none"; date?: string } {
    const ps = statusMap[prospectKey];
    const sentAtField = touchNum === 1 ? ps?.touch1SentAt : touchNum === 2 ? ps?.touch2SentAt : ps?.touch3SentAt;
    if (sentAtField) return { state: "sent", date: sentAtField };

    // Look for a scheduled email for this touch
    const scheduled = scheduledByKey[prospectKey]?.find((e) => e.touchNumber === touchNum && !e.sentAt);
    if (scheduled) return { state: "scheduled", date: fmtFull(scheduled.sendAfter) };

    // Check if sent via sentAt on ScheduledEmail (fallback)
    const sentEmail = scheduledByKey[prospectKey]?.find((e) => e.touchNumber === touchNum && e.sentAt);
    if (sentEmail) return { state: "sent", date: fmtFull(sentEmail.sentAt!) };

    return { state: "none" };
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>
              ← Admin
            </Link>
          </div>
          <div className="flex items-center gap-2.5 mb-2 mt-3">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#e8eef5", letterSpacing: "0.12em" }}>
              RealHQ Admin
            </span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
            Outreach Status
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
            Wave-1 delivery tracker — touch timeline, bounce status, and scheduled sends.
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total queued", value: totalQueued, color: "#8ba0b8" },
            { label: "Sent today", value: sentToday, color: "#0A8A4C" },
            { label: "Pending", value: upcomingPending.length + overduePending.length, color: upcomingPending.length + overduePending.length > 0 ? "#F5A94A" : "#0A8A4C" },
            { label: "Bounced", value: totalBounced, color: totalBounced > 0 ? "#FF8080" : "#0A8A4C" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
              <p className="text-xs mb-1" style={{ color: "#5a7a96" }}>{s.label}</p>
              <p className="text-3xl font-semibold" style={{ color: s.color, fontFamily: SERIF }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Overdue alert */}
        {overduePending.length > 0 && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#1a0a0a", border: "1px solid #5a1a1a" }}>
            <span style={{ color: "#FF8080", fontSize: 16 }}>⚠</span>
            <p className="text-sm" style={{ color: "#FF8080" }}>
              <span className="font-semibold">{overduePending.length} email{overduePending.length !== 1 ? "s" : ""} overdue</span>
              {" — past send time but not yet processed. "}
              <Link href="/admin/email-queue" className="underline hover:opacity-80">
                Trigger cron →
              </Link>
            </p>
          </div>
        )}

        {/* FL Prospect timeline */}
        {WAVE1_FL_PROSPECTS.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#1a2d45" }}>
              <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                🇺🇸 Florida — Wave 1 Touch Timeline
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a2d45" }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: "#5a7a96" }}>Prospect</th>
                    <th className="px-3 py-3 text-center font-medium" style={{ color: "#5a7a96" }}>T1</th>
                    <th className="px-3 py-3 text-center font-medium" style={{ color: "#5a7a96" }}>T2</th>
                    <th className="px-3 py-3 text-center font-medium" style={{ color: "#5a7a96" }}>T3</th>
                    <th className="px-3 py-3 text-left font-medium" style={{ color: "#5a7a96" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {WAVE1_FL_PROSPECTS.map((p) => {
                    const ps = statusMap[p.prospectKey];
                    const status = ps?.status ?? "to_contact";
                    const bounced = ps?.emailBounced;
                    const clicked = ps?.emailClicked;
                    const displayStatus = bounced ? "bounced" : clicked ? "clicked" : status;
                    const cfg = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG["to_contact"];

                    return (
                      <tr key={p.prospectKey} style={{ borderBottom: "1px solid #1a2d45" }}>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: "#e8eef5" }}>{p.firstName}</p>
                          <p style={{ color: "#5a7a96" }}>{p.company}</p>
                        </td>
                        {[1, 2, 3].map((t) => {
                          const cell = touchCell(p.prospectKey, t);
                          return (
                            <td key={t} className="px-3 py-3 text-center">
                              {cell.state === "sent" && (
                                <div>
                                  <span className="font-semibold" style={{ color: "#0A8A4C" }}>✓</span>
                                  {cell.date && <p className="mt-0.5" style={{ color: "#3d5a72" }}>{cell.date}</p>}
                                </div>
                              )}
                              {cell.state === "scheduled" && (
                                <div>
                                  <span style={{ color: "#F5A94A" }}>⏱</span>
                                  {cell.date && <p className="mt-0.5" style={{ color: "#5a7a96" }}>{cell.date}</p>}
                                </div>
                              )}
                              {cell.state === "none" && (
                                <span style={{ color: "#2a4060" }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3">
                          <span
                            className="px-2 py-0.5 rounded font-medium text-[11px]"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SE UK Prospect timeline (shown only if populated) */}
        {WAVE1_SEUK_PROSPECTS.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#1a2d45" }}>
              <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                🇬🇧 SE England — Wave 1 Touch Timeline
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a2d45" }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: "#5a7a96" }}>Prospect</th>
                    <th className="px-3 py-3 text-center font-medium" style={{ color: "#5a7a96" }}>T1</th>
                    <th className="px-3 py-3 text-center font-medium" style={{ color: "#5a7a96" }}>T2</th>
                    <th className="px-3 py-3 text-center font-medium" style={{ color: "#5a7a96" }}>T3</th>
                    <th className="px-3 py-3 text-left font-medium" style={{ color: "#5a7a96" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {WAVE1_SEUK_PROSPECTS.map((p) => {
                    const ps = statusMap[p.prospectKey];
                    const status = ps?.status ?? "to_contact";
                    const bounced = ps?.emailBounced;
                    const clicked = ps?.emailClicked;
                    const displayStatus = bounced ? "bounced" : clicked ? "clicked" : status;
                    const cfg = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG["to_contact"];

                    return (
                      <tr key={p.prospectKey} style={{ borderBottom: "1px solid #1a2d45" }}>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: "#e8eef5" }}>{p.firstName}</p>
                          <p style={{ color: "#5a7a96" }}>{p.company}</p>
                        </td>
                        {[1, 2, 3].map((t) => {
                          const cell = touchCell(p.prospectKey, t);
                          return (
                            <td key={t} className="px-3 py-3 text-center">
                              {cell.state === "sent" && (
                                <div>
                                  <span className="font-semibold" style={{ color: "#0A8A4C" }}>✓</span>
                                  {cell.date && <p className="mt-0.5" style={{ color: "#3d5a72" }}>{cell.date}</p>}
                                </div>
                              )}
                              {cell.state === "scheduled" && (
                                <div>
                                  <span style={{ color: "#F5A94A" }}>⏱</span>
                                  {cell.date && <p className="mt-0.5" style={{ color: "#5a7a96" }}>{cell.date}</p>}
                                </div>
                              )}
                              {cell.state === "none" && (
                                <span style={{ color: "#2a4060" }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3">
                          <span
                            className="px-2 py-0.5 rounded font-medium text-[11px]"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upcoming sends by date */}
        {upcomingPending.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#1a2d45" }}>
              <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                Upcoming sends ({upcomingPending.length})
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {Object.entries(byDate).map(([dateLabel, emails]) => {
                const nameLookup: Record<string, string> = {};
                for (const p of allProspects) nameLookup[p.prospectKey] = `${p.firstName} · ${p.company}`;
                return (
                  <div key={dateLabel}>
                    <div className="px-5 py-2.5" style={{ backgroundColor: "#0a1520", borderBottom: "1px solid #1a2d45" }}>
                      <span className="text-xs font-semibold" style={{ color: "#8ba0b8" }}>{dateLabel}</span>
                      <span className="text-xs ml-2" style={{ color: "#3d5a72" }}>{emails.length} email{emails.length !== 1 ? "s" : ""}</span>
                    </div>
                    {emails.map((e) => {
                      const label = e.prospectKey ? (nameLookup[e.prospectKey] ?? e.prospectKey) : e.to;
                      return (
                        <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium" style={{ color: "#e8eef5" }}>{label}</p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: "#5a7a96" }}>{e.subject}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {e.touchNumber && (
                              <span
                                className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                                style={{ backgroundColor: "#1a2d45", color: "#8ba0b8" }}
                              >
                                T{e.touchNumber}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: "#5a7a96" }}>{timeUntil(e.sendAfter)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No upcoming sends */}
        {upcomingPending.length === 0 && totalSent > 0 && (
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <p className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>All scheduled sends complete</p>
            <p className="text-xs mt-1" style={{ color: "#5a7a96" }}>No upcoming emails in the queue for wave-1 prospects.</p>
          </div>
        )}

        {/* Empty state */}
        {totalQueued === 0 && (
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <p className="text-sm font-semibold" style={{ color: "#8ba0b8" }}>No outreach scheduled yet</p>
            <p className="text-xs mt-1" style={{ color: "#5a7a96" }}>
              Use{" "}
              <Link href="/admin/prospects" className="hover:opacity-80" style={{ color: "#1647E8" }}>
                Outreach Pipeline
              </Link>{" "}
              to queue wave-1 sends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
