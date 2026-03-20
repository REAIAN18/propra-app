import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QAChecklist } from "./QAChecklist";

export const metadata = { title: "Pre-Launch QA — Arca Admin" };

export default async function AdminQAPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#e8eef5", letterSpacing: "0.12em" }}>
              Arca Admin
            </span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#e8eef5" }}
              >
                Pre-Launch QA Gate
              </h1>
              <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
                Work through every item before sending wave-1 outreach. Green across the board = ready to send.
              </p>
            </div>
            <Link href="/admin" className="text-sm hover:opacity-70" style={{ color: "#5a7a96" }}>
              ← Admin
            </Link>
          </div>
        </div>

        <QAChecklist />
      </div>
    </div>
  );
}
