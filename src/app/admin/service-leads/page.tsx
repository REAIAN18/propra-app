import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ServiceLeadsClient } from "./ServiceLeadsClient";

export const metadata = { title: "Service Delivery — Arca Admin" };

export default async function ServiceLeadsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const leads = await prisma.serviceLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = leads.filter((l) => l.status === "pending").length;
  const inProgressCount = leads.filter((l) => l.status === "in_progress").length;
  const doneCount = leads.filter((l) => l.status === "done").length;

  const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

  // Serialise dates for client
  const serialised = leads.map((l) => ({
    ...l,
    currentPremium: l.currentPremium ?? null,
    unitRate: l.unitRate ?? null,
    annualSpend: l.annualSpend ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
            <span className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: "#e8eef5", letterSpacing: "0.12em" }}>
              Arca Admin
            </span>
          </div>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
                Service Delivery
              </h1>
              <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
                Insurance retenders, energy switches, rent reviews — track and action every lead
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/admin" className="hover:opacity-70" style={{ color: "#5a7a96" }}>Admin →</Link>
              <Link href="/admin/leads" className="hover:opacity-70" style={{ color: "#5a7a96" }}>Leads →</Link>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: pendingCount, color: "#F5A94A" },
            { label: "In Progress", value: inProgressCount, color: "#1647E8" },
            { label: "Done", value: doneCount, color: "#0A8A4C" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4"
              style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
              <p className="text-xs mb-1" style={{ color: "#5a7a96" }}>{s.label}</p>
              <p className="text-3xl font-semibold" style={{ fontFamily: SERIF, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Interactive client table */}
        <ServiceLeadsClient initialLeads={serialised} />
      </div>
    </div>
  );
}
