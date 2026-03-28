import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminUsersPage() {
  const session = await auth();

  // Double-check server-side (middleware also guards this)
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      portfolio: true,
      isAdmin: true,
      onboardedAt: true,
      createdAt: true,
      emailVerified: true,
    },
  });

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#34d399" }} />
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
                Signed-up Users
              </h1>
              <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
                {users.length} user{users.length !== 1 ? "s" : ""} registered via magic link
              </p>
            </div>
            <Link href="/admin/leads" className="text-sm hover:opacity-70" style={{ color: "#34d399" }}>
              View signup leads →
            </Link>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #1a2d45" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#111e2e", borderBottom: "1px solid #1a2d45" }}>
                {["Email", "Portfolio", "Verified", "Signed up", "Admin"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "#5a7a96" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i: number) => (
                <tr
                  key={user.id}
                  style={{
                    backgroundColor: i % 2 === 0 ? "#0B1622" : "#0d1825",
                    borderBottom: i < users.length - 1 ? "1px solid #1a2d45" : "none",
                  }}
                >
                  <td className="px-4 py-3" style={{ color: "#e8eef5" }}>
                    {user.email}
                    {user.name && (
                      <span className="ml-2 text-xs" style={{ color: "#5a7a96" }}>
                        ({user.name})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: user.portfolio === "FL_MIXED" ? "#0f2a1c" : "#0f1e3a",
                        color: user.portfolio === "FL_MIXED" ? "#34d399" : "#7c6af0",
                        border: `1px solid ${user.portfolio === "FL_MIXED" ? "#34d399" : "#7c6af0"}`,
                      }}
                    >
                      {user.portfolio === "FL_MIXED" ? "FL Mixed" : "SE Logistics"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: user.emailVerified ? "#34d399" : "#5a7a96" }}>
                    {user.emailVerified ? "✓ Verified" : "Pending"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#5a7a96" }}>
                    {user.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: user.isAdmin ? "#F5A94A" : "#3d5a72" }}>
                    {user.isAdmin ? "Admin" : "—"}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "#3d5a72" }}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
