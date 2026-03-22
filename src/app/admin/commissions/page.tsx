import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BoundQuotesClient } from "./BoundQuotesClient";

export const metadata = { title: "Commission Tracker — RealHQ Admin" };

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

function fmt(v: number, currency = "GBP"): string {
  const sym = currency === "USD" ? "$" : "£";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${Math.round(v)}`;
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",   color: "#92580A", bg: "#FEF6E8" },
  confirmed: { label: "Confirmed", color: "#0A8A4C", bg: "#E8F5EE" },
  invoiced:  { label: "Invoiced",  color: "#1647E8", bg: "#EEF2FE" },
  paid:      { label: "Paid",      color: "#0D9488", bg: "#E6F7F6" },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  insurance:  { label: "Insurance",  color: "#F5A94A" },
  energy:     { label: "Energy",     color: "#1647E8" },
  rent:       { label: "Rent",       color: "#0A8A4C" },
  ancillary:  { label: "Ancillary",  color: "#8b5cf6" },
};

export default async function CommissionsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");

  const [commissions, insuranceQuotes, energyQuotes] = await Promise.all([
    prisma.commission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        asset: { select: { name: true, location: true } },
      },
    }),
    prisma.insuranceQuote.findMany({
      where: { status: "bound" },
      include: {
        user: { select: { email: true } },
        asset: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.energyQuote.findMany({
      where: { status: "switched" },
      include: {
        user: { select: { email: true } },
        asset: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPipeline = commissions.reduce((s, c) => s + c.commissionValue, 0);
  const totalConfirmed = commissions.filter(c => c.status === "confirmed" || c.status === "invoiced" || c.status === "paid").reduce((s, c) => s + c.commissionValue, 0);
  const totalPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.commissionValue, 0);
  const pendingCount = commissions.filter(c => c.status === "pending").length;
  const boundQuotes = insuranceQuotes.length + energyQuotes.length;

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin" className="text-xs" style={{ color: "#5a7a96" }}>← Admin</Link>
          </div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: SERIF, color: "#e8eef5" }}>Commission Tracker</h1>
          <p className="text-sm" style={{ color: "#5a7a96" }}>Revenue pipeline across all service lines.</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Pipeline", value: fmt(totalPipeline), sub: `${commissions.length} commissions`, color: "#5BF0AC" },
            { label: "Confirmed / Invoiced", value: fmt(totalConfirmed), sub: "ready to invoice or sent", color: "#0A8A4C" },
            { label: "Paid Out", value: fmt(totalPaid), sub: "cash received", color: "#0D9488" },
            { label: "Pending", value: String(pendingCount), sub: `${boundQuotes} bound quotes`, color: "#F5A94A" },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>{k.label}</div>
              <div className="text-2xl font-bold mb-0.5" style={{ fontFamily: SERIF, color: k.color }}>{k.value}</div>
              <div className="text-xs" style={{ color: "#3d5a72" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Commission rows */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: "#111e2e", borderBottom: "1px solid #1a2d45" }}>
            <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Commission Records</span>
            <span className="text-xs" style={{ color: "#5a7a96" }}>{commissions.length} total</span>
          </div>

          {commissions.length === 0 ? (
            <div className="px-5 py-12 text-center" style={{ backgroundColor: "#0d1a28" }}>
              <div className="text-sm mb-1" style={{ color: "#5a7a96" }}>No commissions yet</div>
              <div className="text-xs" style={{ color: "#3d5a72" }}>
                Commissions are created when users bind insurance quotes or confirm energy switches.
                {boundQuotes > 0 && ` ${boundQuotes} bound quote${boundQuotes !== 1 ? "s" : ""} awaiting confirmation.`}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "#0d1a28" }}>
              {commissions.map((c, i) => {
                const cat = CATEGORY_CONFIG[c.category] ?? { label: c.category, color: "#8ba0b8" };
                const st = STATUS_CONFIG[c.status] ?? { label: c.status, color: "#8ba0b8", bg: "#1a2d45" };
                return (
                  <div
                    key={c.id}
                    className="px-5 py-4 flex items-center gap-4"
                    style={{ borderTop: i > 0 ? "1px solid #1a2d45" : undefined }}
                  >
                    {/* Category dot */}
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />

                    {/* User + asset */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "#e8eef5" }}>
                        {c.user?.email ?? "—"}
                      </div>
                      <div className="text-xs truncate" style={{ color: "#5a7a96" }}>
                        {c.asset?.name ?? "Portfolio"} · {cat.label} · {timeAgo(c.createdAt)}
                      </div>
                    </div>

                    {/* Saving */}
                    <div className="text-right shrink-0">
                      <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Saving</div>
                      <div className="text-sm font-semibold" style={{ color: "#5BF0AC" }}>{fmt(c.annualSaving)}/yr</div>
                    </div>

                    {/* Commission */}
                    <div className="text-right shrink-0">
                      <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Fee ({Math.round(c.commissionRate * 100)}%)</div>
                      <div className="text-sm font-bold" style={{ color: "#e8eef5" }}>{fmt(c.commissionValue)}</div>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bound quotes pending commission — one-click creation (PRO-278) */}
        <BoundQuotesClient
          boundQuotes={[
            ...insuranceQuotes.map(q => ({
              id: q.id,
              type: "insurance" as const,
              userId: q.userId,
              assetId: q.assetId ?? null,
              email: q.user?.email,
              assetName: q.asset?.name ?? null,
              label: `${q.carrier} · Insurance · bound`,
              annualSaving: q.annualSaving ?? null,
            })),
            ...energyQuotes.map(q => ({
              id: q.id,
              type: "energy" as const,
              userId: q.userId,
              assetId: q.assetId ?? null,
              email: q.user?.email,
              assetName: q.asset?.name ?? null,
              label: `${q.supplier} · Energy · switched`,
              annualSaving: q.annualSaving ?? null,
            })),
          ]}
        />

        {/* Category breakdown */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => {
            const catCommissions = commissions.filter(c => c.category === cat);
            const total = catCommissions.reduce((s, c) => s + c.commissionValue, 0);
            return (
              <div key={cat} className="rounded-xl p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-xs font-medium" style={{ color: "#8ba0b8" }}>{cfg.label}</span>
                </div>
                <div className="text-xl font-bold" style={{ fontFamily: SERIF, color: "#e8eef5" }}>{fmt(total)}</div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{catCommissions.length} commission{catCommissions.length !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
