import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TriggerCronButton } from "./TriggerCronButton";

export const metadata = { title: "Email Queue — Arca Admin" };

export default async function EmailQueuePage() {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) redirect("/dashboard");

  const now = new Date();

  const [pending, recentlySent, totalPending, totalSent] = await Promise.all([
    prisma.scheduledEmail.findMany({
      where: { sentAt: null },
      orderBy: { sendAfter: "asc" },
      take: 50,
    }),
    prisma.scheduledEmail.findMany({
      where: { sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      take: 30,
    }),
    prisma.scheduledEmail.count({ where: { sentAt: null } }),
    prisma.scheduledEmail.count({ where: { sentAt: { not: null } } }),
  ]);

  const overdue = pending.filter((e) => e.sendAfter <= now);

  function timeAgo(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

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
              Arca Admin
            </span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
            Email Queue
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
            Nurture emails scheduled for delivery. Cron: <code style={{ color: "#8ba0b8", fontSize: 12 }}>{APP_URL}/api/cron/send-emails</code>
          </p>
          <div className="mt-3">
            <TriggerCronButton />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <p className="text-xs mb-1" style={{ color: "#5a7a96" }}>Pending</p>
            <p className="text-3xl font-semibold" style={{ color: totalPending > 0 ? "#F5A94A" : "#0A8A4C" }}>
              {totalPending}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <p className="text-xs mb-1" style={{ color: "#5a7a96" }}>Overdue</p>
            <p className="text-3xl font-semibold" style={{ color: overdue.length > 0 ? "#FF8080" : "#0A8A4C" }}>
              {overdue.length}
            </p>
            <p className="text-xs mt-1" style={{ color: "#5a7a96" }}>
              {overdue.length > 0 ? "not yet picked up by cron" : "all on schedule"}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <p className="text-xs mb-1" style={{ color: "#5a7a96" }}>Sent total</p>
            <p className="text-3xl font-semibold" style={{ color: "#0A8A4C" }}>{totalSent}</p>
          </div>
        </div>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "#1a0a0a", border: "1px solid #5a1a1a" }}
          >
            <span style={{ color: "#FF8080", fontSize: 16 }}>⚠</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#FF8080" }}>
                {overdue.length} email{overdue.length !== 1 ? "s" : ""} overdue
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#8ba0b8" }}>
                These emails are past their send time but haven&apos;t been processed.
                Trigger the cron manually or set up a cron job at{" "}
                <code style={{ fontSize: 11 }}>/api/cron/send-emails?secret=CRON_SECRET</code>.
              </p>
            </div>
          </div>
        )}

        {/* Pending queue */}
        <div className="rounded-xl" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#1a2d45" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              Pending ({totalPending})
            </h2>
          </div>
          {pending.length === 0 ? (
            <p className="px-5 py-4 text-xs" style={{ color: "#5a7a96" }}>No pending emails. Queue is empty.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {pending.map((email) => {
                const isOverdue = email.sendAfter <= now;
                return (
                  <div key={email.id} className="px-5 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium truncate" style={{ color: "#e8eef5" }}>
                          {email.to}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: isOverdue ? "#FF808033" : "#1a2d45",
                            color: isOverdue ? "#FF8080" : "#8ba0b8",
                          }}
                        >
                          {timeUntil(email.sendAfter)}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#5a7a96" }}>
                        {email.subject}
                      </p>
                      <p className="text-xs" style={{ color: "#3d5a72" }}>
                        from {email.from.split(" <")[0]}
                      </p>
                    </div>
                    <p className="text-xs shrink-0" style={{ color: "#5a7a96" }}>
                      queued {timeAgo(email.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently sent */}
        <div className="rounded-xl" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#1a2d45" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              Recently sent ({totalSent})
            </h2>
          </div>
          {recentlySent.length === 0 ? (
            <p className="px-5 py-4 text-xs" style={{ color: "#5a7a96" }}>No emails sent yet.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {recentlySent.map((email) => (
                <div key={email.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium truncate" style={{ color: "#e8eef5" }}>
                        {email.to}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#0A8A4C22", color: "#0A8A4C" }}
                      >
                        sent
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#5a7a96" }}>
                      {email.subject}
                    </p>
                    <p className="text-xs" style={{ color: "#3d5a72" }}>
                      from {email.from.split(" <")[0]}
                    </p>
                  </div>
                  <p className="text-xs shrink-0" style={{ color: "#5a7a96" }}>
                    {email.sentAt ? timeAgo(email.sentAt) : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
