import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Admin — Arca" };

export default async function AdminPage() {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalSignups,
    signupsThisWeek,
    signupsToday,
    totalAuditLeads,
    auditLeadsThisWeek,
    auditLeadsToday,
    totalUsers,
    recentSignups,
    recentAuditLeads,
  ] = await Promise.all([
    prisma.signupLead.count(),
    prisma.signupLead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.signupLead.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    prisma.auditLead.count(),
    prisma.auditLead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.auditLead.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    prisma.user.count(),
    prisma.signupLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { name: true, email: true, company: true, assetCount: true, createdAt: true },
    }),
    prisma.auditLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { email: true, assetCount: true, estimateTotal: true, createdAt: true },
    }),
  ]);

  function timeAgo(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function fmtK(v: number | null): string {
    if (!v) return "—";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    return `$${Math.round(v / 1_000)}k`;
  }

  const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
            <span
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
            >
              Arca Admin
            </span>
          </div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: SERIF, color: "#e8eef5" }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
            Overview of leads, outreach, and pipeline activity
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Signup leads", total: totalSignups, week: signupsThisWeek, today: signupsToday, color: "#0A8A4C" },
            { label: "Audit leads", total: totalAuditLeads, week: auditLeadsThisWeek, today: auditLeadsToday, color: "#1647E8" },
            { label: "Signed-up users", total: totalUsers, week: null, today: null, color: "#F5A94A" },
            { label: "Total pipeline", total: totalSignups + totalAuditLeads, week: signupsThisWeek + auditLeadsThisWeek, today: signupsToday + auditLeadsToday, color: "#8ba0b8" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
            >
              <p className="text-xs mb-1" style={{ color: "#5a7a96" }}>{s.label}</p>
              <p className="text-3xl font-semibold" style={{ color: s.color }}>{s.total}</p>
              {s.week !== null && (
                <p className="text-xs mt-1" style={{ color: "#5a7a96" }}>
                  {s.week} this week · {s.today} today
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: "/admin/leads",
              title: "Leads",
              desc: "Signup leads, audit leads, document uploads. Outreach link generator.",
              accent: "#0A8A4C",
              badge: `${totalSignups + totalAuditLeads} total`,
            },
            {
              href: "/admin/prospects",
              title: "FL Prospect Pipeline",
              desc: "25 Florida owner-operator targets. Track outreach status, notes, and next steps.",
              accent: "#1647E8",
              badge: "25 prospects",
            },
            {
              href: "/admin/users",
              title: "Users",
              desc: "Authenticated users who have signed in. Full portfolio and account details.",
              accent: "#F5A94A",
              badge: `${totalUsers} user${totalUsers !== 1 ? "s" : ""}`,
            },
          ].map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className="rounded-xl p-5 block transition-all hover:opacity-80"
              style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>{nav.title}</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: `${nav.accent}22`, color: nav.accent }}
                >
                  {nav.badge}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#5a7a96" }}>{nav.desc}</p>
              <p className="text-xs mt-3 font-medium" style={{ color: nav.accent }}>Open →</p>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Recent signups */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Recent signups</h2>
              <Link href="/admin/leads" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>
                All leads →
              </Link>
            </div>
            {recentSignups.length === 0 ? (
              <p className="text-xs" style={{ color: "#5a7a96" }}>No signups yet.</p>
            ) : (
              <div className="space-y-3">
                {recentSignups.map((l, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#e8eef5" }}>{l.name}</p>
                      <p className="text-xs truncate" style={{ color: "#5a7a96" }}>
                        {l.company}{l.assetCount ? ` · ${l.assetCount} assets` : ""}
                      </p>
                    </div>
                    <p className="text-xs shrink-0" style={{ color: "#5a7a96" }}>{timeAgo(l.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent audit leads */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Recent audit leads</h2>
              <Link href="/admin/leads" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>
                All leads →
              </Link>
            </div>
            {recentAuditLeads.length === 0 ? (
              <p className="text-xs" style={{ color: "#5a7a96" }}>No audit leads yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAuditLeads.map((l, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#e8eef5" }}>{l.email}</p>
                      <p className="text-xs" style={{ color: "#5a7a96" }}>
                        {l.assetCount ? `${l.assetCount} assets` : "—"}
                        {l.estimateTotal ? ` · ${fmtK(l.estimateTotal)}` : ""}
                      </p>
                    </div>
                    <p className="text-xs shrink-0" style={{ color: "#5a7a96" }}>{timeAgo(l.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
