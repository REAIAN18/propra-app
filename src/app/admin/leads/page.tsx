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

  const leads = await prisma.signupLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  function timeAgo(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-5xl mx-auto">
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
                Signup Leads
              </h1>
              <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
                {leads.length} lead{leads.length !== 1 ? "s" : ""} from the website signup form
              </p>
            </div>
            <Link href="/admin/users" className="text-sm hover:opacity-70" style={{ color: "#5a7a96" }}>
              View auth users →
            </Link>
          </div>
        </div>

        {leads.length === 0 ? (
          <div
            className="rounded-xl px-8 py-16 flex flex-col items-center gap-3 text-center"
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
      </div>
    </div>
  );
}
