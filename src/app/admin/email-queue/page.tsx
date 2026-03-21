import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TriggerCronButton } from "./TriggerCronButton";
import { WAVE1_FL_PROSPECTS } from "@/data/wave1-fl-prospects";

export const dynamic = "force-dynamic";
export const metadata = { title: "Outreach Status — RealHQ Admin" };

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function OutreachStatusPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");

  const now = new Date();
  const prospectKeys = WAVE1_FL_PROSPECTS.map((p) => p.prospectKey);

  const [
    totalQueued,
    totalSent,
    totalUpcoming,
    bouncedCount,
    allScheduled,
    prospectStatuses,
    upcomingSends,
  ] = await Promise.all([
    // Total queued (not sent)
    prisma.scheduledEmail.count({ where: { sentAt: null } }),
    // Total sent
    prisma.scheduledEmail.count({ where: { sentAt: { not: null } } }),
    // Pending / upcoming (not sent, sendAfter > now)
    prisma.scheduledEmail.count({ where: { sentAt: null, sendAfter: { gt: now } } }),
    // Bounced prospects
    prisma.prospectStatus.count({ where: { emailBounced: true } }),
    // All scheduled emails for wave-1 prospects (for the timeline table)
    prisma.scheduledEmail.findMany({
      where: { prospectKey: { in: prospectKeys } },
      orderBy: { sendAfter: "asc" },
      select: {
        id: true,
        prospectKey: true,
        touchNumber: true,
        sentAt: true,
        sendAfter: true,
        subject: true,
      },
    }),
    // ProspectStatus for all wave-1 keys
    prisma.prospectStatus.findMany({
      where: { prospectKey: { in: prospectKeys } },
    }),
    // Upcoming sends (sentAt=null, sendAfter > now, any market)
    prisma.scheduledEmail.findMany({
      where: { sentAt: null, sendAfter: { gt: now } },
      orderBy: { sendAfter: "asc" },
      take: 60,
      select: {
        id: true,
        prospectKey: true,
        touchNumber: true,
        sendAfter: true,
        subject: true,
        to: true,
      },
    }),
  ]);

  // Build lookup maps
  const statusByKey = Object.fromEntries(prospectStatuses.map((s) => [s.prospectKey, s]));

  // Group scheduled emails by prospectKey + touchNumber
  const emailsByKey: Record<string, Record<number, typeof allScheduled[0]>> = {};
  for (const e of allScheduled) {
    if (!e.prospectKey) continue;
    if (!emailsByKey[e.prospectKey]) emailsByKey[e.prospectKey] = {};
    const touch = e.touchNumber ?? 1;
    // Keep whichever has sentAt, or most recent
    const existing = emailsByKey[e.prospectKey][touch];
    if (!existing || (e.sentAt && !existing.sentAt)) {
      emailsByKey[e.prospectKey][touch] = e;
    }
  }

  // Build prospect name lookup from WAVE1_FL_PROSPECTS + any non-wave1 in upcoming sends
  const prospectLookup = Object.fromEntries(
    WAVE1_FL_PROSPECTS.map((p) => [p.prospectKey, { name: p.name, company: p.company }])
  );

  // Group upcoming sends by date (YYYY-MM-DD)
  const upcomingByDate: Record<string, typeof upcomingSends> = {};
  for (const e of upcomingSends) {
    const dateKey = e.sendAfter.toISOString().slice(0, 10);
    if (!upcomingByDate[dateKey]) upcomingByDate[dateKey] = [];
    upcomingByDate[dateKey].push(e);
  }
  const upcomingDates = Object.keys(upcomingByDate).sort();

  function touchCell(prospectKey: string, touch: number) {
    const email = emailsByKey[prospectKey]?.[touch];
    if (!email) return <span style={{ color: "#3d5a72" }}>—</span>;
    if (email.sentAt) {
      return (
        <span style={{ color: "#0A8A4C" }} title={email.sentAt.toISOString()}>
          Sent {fmtDate(email.sentAt)}
        </span>
      );
    }
    const isOverdue = email.sendAfter <= now;
    return (
      <span style={{ color: isOverdue ? "#FF8080" : "#F5A94A" }} title={email.sendAfter.toISOString()}>
        {isOverdue ? "Overdue" : "Queued"} {fmtDate(email.sendAfter)}
      </span>
    );
  }

  function statusBadge(prospectKey: string) {
    const s = statusByKey[prospectKey];
    if (!s) return <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}>not_sent</span>;

    const cfg: Record<string, { label: string; color: string; bg: string }> = {
      contacted:  { label: "contacted",  color: "#F5A94A", bg: "#F5A94A22" },
      bounced:    { label: "bounced",    color: "#FF8080", bg: "#FF808022" },
      clicked:    { label: "clicked",    color: "#0A8A4C", bg: "#0A8A4C22" },
      not_sent:   { label: "not sent",   color: "#5a7a96", bg: "#1a2d45"   },
      responded:  { label: "responded",  color: "#8b5cf6", bg: "#8b5cf622" },
    };
    const c = cfg[s.status] ?? { label: s.status, color: "#8ba0b8", bg: "#1a2d45" };
    return (
      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ backgroundColor: c.bg, color: c.color }}
      >
        {c.label}
        {s.emailBounced ? " ⚠" : ""}
        {s.emailClicked ? " ✓" : ""}
      </span>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-6xl mx-auto space-y-8">

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
            Wave-1 FL prospect touch timeline, upcoming send schedule, and queue health.
          </p>
          <div className="mt-3">
            <TriggerCronButton />
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total queued",    value: totalQueued,   color: totalQueued > 0 ? "#F5A94A" : "#8ba0b8", sub: "sentAt = null" },
            { label: "Sent",            value: totalSent,     color: "#0A8A4C",                               sub: "delivered" },
            { label: "Upcoming",        value: totalUpcoming, color: "#1647E8",                               sub: "sendAfter > now" },
            { label: "Bounced",         value: bouncedCount,  color: bouncedCount > 0 ? "#FF8080" : "#8ba0b8", sub: "prospects" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
              <p className="text-xs mb-1" style={{ color: "#5a7a96" }}>{k.label}</p>
              <p className="text-3xl font-semibold tabular-nums" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs mt-1" style={{ color: "#3d5a72" }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Per-prospect timeline table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#1a2d45" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              Wave-1 FL — Per-Prospect Touch Timeline
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
              {WAVE1_FL_PROSPECTS.length} prospects · T1 / T2 / T3 touches
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2d45" }}>
                  {["Prospect", "Company", "T1", "T2", "T3", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold"
                      style={{ color: "#5a7a96", whiteSpace: "nowrap" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WAVE1_FL_PROSPECTS.map((p, i) => (
                  <tr
                    key={p.prospectKey}
                    style={{
                      borderBottom: i < WAVE1_FL_PROSPECTS.length - 1 ? "1px solid #1a2d45" : undefined,
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "#e8eef5", whiteSpace: "nowrap" }}>
                      {p.name.startsWith("[") ? (
                        <span style={{ color: "#5a7a96", fontStyle: "italic" }}>{p.name}</span>
                      ) : p.name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#8ba0b8", whiteSpace: "nowrap" }}>{p.company}</td>
                    <td className="px-4 py-3" style={{ whiteSpace: "nowrap" }}>{touchCell(p.prospectKey, 1)}</td>
                    <td className="px-4 py-3" style={{ whiteSpace: "nowrap" }}>{touchCell(p.prospectKey, 2)}</td>
                    <td className="px-4 py-3" style={{ whiteSpace: "nowrap" }}>{touchCell(p.prospectKey, 3)}</td>
                    <td className="px-4 py-3">{statusBadge(p.prospectKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming sends */}
        <div className="rounded-xl" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#1a2d45" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              Upcoming Sends ({totalUpcoming})
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
              Grouped by send date — showing up to 60 emails
            </p>
          </div>
          {upcomingDates.length === 0 ? (
            <p className="px-5 py-4 text-xs" style={{ color: "#5a7a96" }}>No upcoming emails scheduled.</p>
          ) : (
            <div>
              {upcomingDates.map((dateKey, di) => {
                const emails = upcomingByDate[dateKey];
                const dateLabel = fmtDate(new Date(dateKey + "T12:00:00Z"));
                return (
                  <div key={dateKey}>
                    {/* Date group header */}
                    <div
                      className="px-5 py-2 flex items-center gap-3"
                      style={{
                        backgroundColor: "#0a1520",
                        borderTop: di > 0 ? "1px solid #1a2d45" : undefined,
                        borderBottom: "1px solid #1a2d45",
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ color: "#8ba0b8" }}>{dateLabel}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}
                      >
                        {emails.length} email{emails.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                      {emails.map((e) => {
                        const lookup = e.prospectKey ? prospectLookup[e.prospectKey] : null;
                        const prospectDisplay = lookup
                          ? lookup.name.startsWith("[")
                            ? lookup.company
                            : `${lookup.name} · ${lookup.company}`
                          : e.to;
                        return (
                          <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium" style={{ color: "#e8eef5" }}>
                                  {prospectDisplay}
                                </span>
                                {e.touchNumber != null && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ backgroundColor: "#1647E822", color: "#1647E8" }}
                                  >
                                    T{e.touchNumber}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate" style={{ color: "#5a7a96", maxWidth: "480px" }}>
                                {e.subject.slice(0, 60)}{e.subject.length > 60 ? "…" : ""}
                              </p>
                            </div>
                            <p className="text-xs shrink-0 tabular-nums" style={{ color: "#5a7a96" }}>
                              {fmtDateTime(e.sendAfter)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
