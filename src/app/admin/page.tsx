import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Admin — Arca" };

export default async function AdminPage() {
  const session = await auth();
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
    pendingEmailCount,
    overdueEmailCount,
    serviceLeadsThisWeek,
    serviceLeadsToday,
    serviceLeadsByType,
    recentServiceLeads,
    totalServiceLeads,
    demoBookingsTotal,
    demoBookingsThisWeek,
    demoBookingsToday,
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
    prisma.scheduledEmail.count({ where: { sentAt: null } }),
    prisma.scheduledEmail.count({ where: { sentAt: null, sendAfter: { lte: now } } }),
    prisma.serviceLead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.serviceLead.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    prisma.serviceLead.groupBy({
      by: ["serviceType"],
      _count: { serviceType: true },
      orderBy: { _count: { serviceType: "desc" } },
    }),
    prisma.serviceLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { serviceType: true, email: true, propertyAddress: true, notes: true, createdAt: true },
    }),
    prisma.serviceLead.count(),
    prisma.serviceLead.count({ where: { serviceType: "demo_booked" } }),
    prisma.serviceLead.count({ where: { serviceType: "demo_booked", createdAt: { gte: sevenDaysAgo } } }),
    prisma.serviceLead.count({ where: { serviceType: "demo_booked", createdAt: { gte: twentyFourHoursAgo } } }),
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

  const SERVICE_CONFIG: Record<string, { label: string; color: string }> = {
    insurance_retender: { label: "Insurance Retender", color: "#F5A94A" },
    energy_switch: { label: "Energy Switch", color: "#1647E8" },
    income_activation: { label: "Income Activation", color: "#0A8A4C" },
    income_scan: { label: "Income Scan", color: "#0A8A4C" },
    financing_refinance: { label: "Financing / Refinance", color: "#1647E8" },
    rent_review: { label: "Rent Review", color: "#F5A94A" },
    work_order_tender: { label: "Work Order Tender", color: "#F5A94A" },
    acquisition_offer: { label: "Acquisition Offer", color: "#0A8A4C" },
    acquisition_pass: { label: "Acquisition Pass", color: "#8ba0b8" },
    tenant_action: { label: "Tenant Action", color: "#1647E8" },
    planning_flag: { label: "Planning Flag", color: "#F5A94A" },
    compliance_renewal: { label: "Compliance Renewal", color: "#f06040" },
    transaction_sale: { label: "Transaction / Sale", color: "#F5A94A" },
    book_visit: { label: "Book Page Visit", color: "#8b5cf6" },
    demo_visit: { label: "Demo Link Visit", color: "#06b6d4" },
    demo_booked: { label: "Demo Booked", color: "#0A8A4C" },
  };

  const maxServiceCount = Math.max(...serviceLeadsByType.map((s) => s._count.serviceType), 1);

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
            { label: "Demos booked", total: demoBookingsTotal, week: demoBookingsThisWeek, today: demoBookingsToday, color: "#0A8A4C" },
            { label: "Signup leads", total: totalSignups, week: signupsThisWeek, today: signupsToday, color: "#1647E8" },
            { label: "Audit leads", total: totalAuditLeads, week: auditLeadsThisWeek, today: auditLeadsToday, color: "#F5A94A" },
            { label: "Signed-up users", total: totalUsers, week: null, today: null, color: "#8ba0b8" },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/admin/leads",
              title: "Leads",
              desc: "Signup leads, audit leads, document uploads. Outreach link generator.",
              accent: "#0A8A4C",
              badge: `${totalSignups + totalAuditLeads} total`,
            },
            {
              href: "/admin/service-leads",
              title: "Service Delivery",
              desc: "Insurance retenders, energy switches, rent reviews. Track status, add notes, action every request.",
              accent: totalServiceLeads > 0 ? "#F5A94A" : "#8ba0b8",
              badge: totalServiceLeads > 0 ? `${totalServiceLeads} lead${totalServiceLeads !== 1 ? "s" : ""}` : "0 leads",
            },
            {
              href: "/admin/prospects",
              title: "Outreach Pipeline",
              desc: "FL + SE UK wave-1 prospects. Send outreach, track open/click signals, manage follow-up sequence.",
              accent: "#1647E8",
              badge: "FL · SE UK",
            },
            {
              href: "/admin/users",
              title: "Users",
              desc: "Authenticated users who have signed in. Full portfolio and account details.",
              accent: "#F5A94A",
              badge: `${totalUsers} user${totalUsers !== 1 ? "s" : ""}`,
            },
            {
              href: "/admin/email-queue",
              title: "Email Queue",
              desc: "Nurture emails queued for delivery. Monitor pending, overdue, and sent emails.",
              accent: overdueEmailCount > 0 ? "#FF8080" : "#8ba0b8",
              badge: overdueEmailCount > 0 ? `${overdueEmailCount} overdue` : `${pendingEmailCount} pending`,
            },
            {
              href: "/admin/portfolios",
              title: "Client Portfolios",
              desc: "Upload custom client portfolio JSON. Generate shareable dashboard links — no code needed.",
              accent: "#0A8A4C",
              badge: "onboarding",
            },
            {
              href: "/admin/portfolio-generator",
              title: "Portfolio Generator",
              desc: "Describe a client's assets in plain English — Claude builds the Portfolio JSON automatically.",
              accent: "#8b5cf6",
              badge: "Claude",
            },
            {
              href: "/admin/qa",
              title: "Pre-Launch QA",
              desc: "Run through every system check before sending wave-1 outreach. Green across the board = ready to fire.",
              accent: "#f97316",
              badge: "PRO-150",
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

        {/* Service Lead Pipeline */}
        {totalServiceLeads > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* By type breakdown */}
            <div className="rounded-xl p-5" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Service leads by type</h2>
                <Link href="/admin/leads" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>View all →</Link>
              </div>
              <div className="space-y-2.5">
                {serviceLeadsByType.map((s) => {
                  const cfg = SERVICE_CONFIG[s.serviceType] ?? { label: s.serviceType.replace(/_/g, " "), color: "#8ba0b8" };
                  const pct = Math.round((s._count.serviceType / maxServiceCount) * 100);
                  return (
                    <div key={s.serviceType}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: "#e8eef5" }}>{s._count.serviceType}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color + "99" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent service leads */}
            <div className="rounded-xl p-5" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Recent service leads</h2>
                <Link href="/admin/leads" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>View all →</Link>
              </div>
              <div className="space-y-3">
                {recentServiceLeads.map((l, i) => {
                  const cfg = SERVICE_CONFIG[l.serviceType] ?? { label: l.serviceType.replace(/_/g, " "), color: "#8ba0b8" };
                  return (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: cfg.color + "22", color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: "#5a7a96" }}>
                          {l.email ?? "anonymous"}{l.propertyAddress ? ` · ${l.propertyAddress}` : ""}
                        </p>
                      </div>
                      <p className="text-xs shrink-0" style={{ color: "#5a7a96" }}>{timeAgo(l.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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
