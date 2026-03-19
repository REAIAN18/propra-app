import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLeadsPage() {
  const session = await auth();

  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const [leads, auditLeads] = await Promise.all([
    prisma.signupLead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.auditLead.findMany({ orderBy: { createdAt: "desc" } }),
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

  function formatCurrency(cents: number | null): string {
    if (cents == null) return "—";
    if (cents >= 1_000_000) return `$${(cents / 1_000_000).toFixed(1)}M`;
    if (cents >= 1_000) return `$${(cents / 1_000).toFixed(0)}k`;
    return `$${cents}`;
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#e8eef5", letterSpacing: "0.12em" }}>
              Arca Admin
            </span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", color: "#e8eef5" }}>
                Leads
              </h1>
              <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
                {leads.length} signup lead{leads.length !== 1 ? "s" : ""} · {auditLeads.length} audit lead{auditLeads.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/admin/users" className="text-sm hover:opacity-70" style={{ color: "#5a7a96" }}>
              View auth users →
            </Link>
          </div>
        </div>

        {/* ── Audit Leads ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", color: "#e8eef5" }}>
              Audit Leads
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#0A8A4C22", color: "#0A8A4C" }}>
              {auditLeads.length}
            </span>
          </div>

          {auditLeads.length === 0 ? (
            <div
              className="rounded-xl px-8 py-12 flex flex-col items-center gap-2 text-center"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="text-sm font-medium" style={{ color: "#5a7a96" }}>No audit leads yet</div>
              <div className="text-xs" style={{ color: "#3d5a72" }}>
                Appears when someone completes the /audit tool
              </div>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ backgroundColor: "#1a2d45" }}>
                {[
                  { label: "Total", value: auditLeads.length.toString() },
                  { label: "This week", value: auditLeads.filter(l => (Date.now() - l.createdAt.getTime()) < 7 * 86400000).length.toString() },
                  { label: "With estimate", value: auditLeads.filter(l => l.estimateTotal != null).length.toString() },
                  { label: "Avg estimate", value: (() => {
                    const withEst = auditLeads.filter(l => l.estimateTotal != null);
                    if (!withEst.length) return "—";
                    const avg = withEst.reduce((s, l) => s + (l.estimateTotal ?? 0), 0) / withEst.length;
                    return formatCurrency(avg);
                  })() },
                ].map((s) => (
                  <div key={s.label} className="p-4" style={{ backgroundColor: "#0d1825" }}>
                    <div className="text-xl font-bold mb-0.5" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), Georgia, serif" }}>{s.value}</div>
                    <div className="text-xs" style={{ color: "#5a7a96" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-5 py-3 text-xs font-medium" style={{ color: "#5a7a96", backgroundColor: "#0d1825", borderBottom: "1px solid #1a2d45", borderTop: "1px solid #1a2d45" }}>
                <span>Email</span>
                <span>Portfolio</span>
                <span>Assets</span>
                <span>Estimate</span>
                <span className="text-right">When</span>
              </div>

              <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                {auditLeads.map((lead) => (
                  <div key={lead.id} className="sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-5 py-4 flex flex-col gap-1 hover:bg-[#0d1825] transition-colors" style={{ backgroundColor: "#111e2e" }}>
                    <div className="text-sm" style={{ color: "#8ba0b8" }}>
                      <a href={`mailto:${lead.email}`} className="hover:opacity-70" style={{ color: "#0A8A4C" }}>
                        {lead.email}
                      </a>
                    </div>
                    <div className="text-xs" style={{ color: "#8ba0b8" }}>
                      {lead.portfolioInput || <span style={{ color: "#3d5a72" }}>—</span>}
                    </div>
                    <div className="text-xs" style={{ color: "#8ba0b8" }}>
                      {lead.assetCount != null
                        ? `${lead.assetCount}${lead.assetType ? ` ${lead.assetType}` : ""}`
                        : <span style={{ color: "#3d5a72" }}>—</span>}
                    </div>
                    <div className="text-xs font-medium" style={{ color: lead.estimateTotal ? "#0A8A4C" : "#3d5a72" }}>
                      {formatCurrency(lead.estimateTotal)}
                    </div>
                    <div className="text-xs text-right shrink-0" style={{ color: "#5a7a96" }}>
                      {timeAgo(lead.createdAt)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
                <span className="text-xs" style={{ color: "#3d5a72" }}>Ordered newest first</span>
                <a
                  href={`mailto:${auditLeads.map(l => l.email).join(",")}?subject=Your%20Arca%20portfolio%20analysis`}
                  className="text-xs font-medium hover:opacity-70"
                  style={{ color: "#0A8A4C" }}
                >
                  Email all audit leads →
                </a>
              </div>
            </div>
          )}
        </section>

        {/* ── Sign-up Leads ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", color: "#e8eef5" }}>
              Sign-up Leads
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#1a2d4588", color: "#5a7a96" }}>
              {leads.length}
            </span>
          </div>

          {leads.length === 0 ? (
            <div
              className="rounded-xl px-8 py-12 flex flex-col items-center gap-2 text-center"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="text-sm font-medium" style={{ color: "#5a7a96" }}>No leads yet</div>
              <div className="text-xs" style={{ color: "#3d5a72" }}>
                Leads appear here when someone submits the signup form at /signup
              </div>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total leads", value: leads.length.toString() },
                  { label: "This week", value: leads.filter(l => (Date.now() - l.createdAt.getTime()) < 7 * 86400000).length.toString() },
                  { label: "With phone", value: leads.filter(l => l.phone).length.toString() },
                  { label: "Portfolio $50M+", value: leads.filter(l => l.portfolioValue && (l.portfolioValue.includes("50M") || l.portfolioValue.includes("100M"))).length.toString() },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
                    <div className="text-2xl font-bold mb-0.5" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), Georgia, serif" }}>{s.value}</div>
                    <div className="text-xs" style={{ color: "#5a7a96" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
                {/* Desktop header */}
                <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-5 py-3 text-xs font-medium" style={{ color: "#5a7a96", backgroundColor: "#0d1825", borderBottom: "1px solid #1a2d45" }}>
                  <span>Name / Company</span>
                  <span>Email</span>
                  <span>Portfolio</span>
                  <span>Assets</span>
                  <span className="text-right">When</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                  {leads.map((lead) => (
                    <div key={lead.id} className="sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-5 py-4 flex flex-col gap-1 hover:bg-[#0d1825] transition-colors" style={{ backgroundColor: "#111e2e" }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>{lead.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{lead.company}</div>
                      </div>
                      <div className="text-sm" style={{ color: "#8ba0b8" }}>
                        <a href={`mailto:${lead.email}`} className="hover:opacity-70" style={{ color: "#0A8A4C" }}>
                          {lead.email}
                        </a>
                        {lead.phone && (
                          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{lead.phone}</div>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: "#8ba0b8" }}>
                        {lead.portfolioValue ?? <span style={{ color: "#3d5a72" }}>—</span>}
                      </div>
                      <div className="text-xs" style={{ color: "#8ba0b8" }}>
                        {lead.assetCount != null ? `${lead.assetCount} assets` : <span style={{ color: "#3d5a72" }}>—</span>}
                      </div>
                      <div className="text-xs text-right shrink-0" style={{ color: "#5a7a96" }}>
                        {timeAgo(lead.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
                  <span className="text-xs" style={{ color: "#3d5a72" }}>
                    Ordered newest first
                  </span>
                  <a
                    href={`mailto:${leads.map(l => l.email).join(",")}?subject=Your%20Arca%20portfolio%20analysis`}
                    className="text-xs font-medium hover:opacity-70"
                    style={{ color: "#0A8A4C" }}
                  >
                    Email all leads →
                  </a>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
