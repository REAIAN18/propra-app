import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProspectsContent } from "./ProspectsContent";

export const metadata = { title: "Prospects — RealHQ Admin" };

export default async function AdminProspectsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
            <span
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
            >
              RealHQ Admin
            </span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1
                className="text-2xl font-semibold"
                style={{
                  fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                  color: "#e8eef5",
                }}
              >
                Prospect Pipeline
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin/leads" className="text-sm hover:opacity-70" style={{ color: "#5a7a96" }}>
                ← Leads
              </Link>
              <Link href="/admin/users" className="text-sm hover:opacity-70" style={{ color: "#5a7a96" }}>
                Users →
              </Link>
            </div>
          </div>
        </div>

        <ProspectsContent />
      </div>
    </div>
  );
}
