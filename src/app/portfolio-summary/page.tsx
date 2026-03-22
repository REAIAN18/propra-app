import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { computeOpportunity } from "@/lib/opportunity";
import { PrintButton } from "./PrintButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portfolio Summary — RealHQ" };

function fmtK(v: number, sym = "$") {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  return `${sym}${Math.round(v / 1_000)}k`;
}

function fmtDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PortfolioSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ print?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const params = await searchParams;
  const isPrint = params.print === "1";

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      name: true,
      sqft: true,
      country: true,
      location: true,
      assetType: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const assetCount = assets.length;
  const totalSqft = assets.reduce((s, a) => s + (a.sqft ?? 0), 0);

  // Determine currency from asset countries
  const hasUKAssets = assets.some(
    (a) => a.country === "UK" || a.country === "GB"
  );
  const currency: "GBP" | "USD" = hasUKAssets ? "GBP" : "USD";
  const sym = currency === "GBP" ? "£" : "$";

  // Extract unique markets from location field
  const markets = [
    ...new Set(
      assets
        .map((a) => (a.location ?? "").split(",")[0].trim())
        .filter(Boolean)
    ),
  ].slice(0, 6);

  // Opportunity estimates (benchmark math, same as computeOpportunity)
  const opp = computeOpportunity(Math.max(assetCount, 1), currency);

  const userName = session.user.name ?? session.user.email ?? "Your Portfolio";
  const firstName = userName.split(/[\s@]/)[0];

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="min-h-screen"
        style={{ backgroundColor: isPrint ? "#fff" : "#F9FAFB" }}
      >
        {/* Top action bar — hidden in print */}
        {!isPrint && (
          <div
            className="no-print border-b px-6 py-3 flex items-center justify-between"
            style={{ backgroundColor: "#fff", borderColor: "#E5E7EB" }}
          >
            <Link
              href="/dashboard"
              className="text-sm font-medium flex items-center gap-1.5"
              style={{ color: "#6B7280" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ display: "inline" }}
              >
                <path
                  d="M9 2L4 7l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to dashboard
            </Link>
            <PrintButton />
          </div>
        )}

        {/* Page content — max-width for print readability */}
        <div
          className="mx-auto px-6 py-8"
          style={{ maxWidth: 760 }}
        >
          {/* ── HEADER ── */}
          <div
            className="flex items-start justify-between mb-8 pb-6"
            style={{ borderBottom: "2px solid #111827" }}
          >
            <div>
              {/* Logo mark */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#0A8A4C" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M2 12L6 4l4 5 2-3 2 6"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span
                  className="text-lg font-bold"
                  style={{ color: "#111827", letterSpacing: "-0.5px" }}
                >
                  RealHQ
                </span>
              </div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "#111827", letterSpacing: "-0.5px" }}
              >
                Portfolio Analysis
              </h1>
              <p className="text-base mt-0.5" style={{ color: "#6B7280" }}>
                Prepared for {firstName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium" style={{ color: "#6B7280" }}>
                {fmtDate()}
              </div>
              <div
                className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
                style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C" }}
              >
                RealHQ
              </div>
            </div>
          </div>

          {/* ── PORTFOLIO SNAPSHOT ── */}
          <div className="mb-8">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#9CA3AF" }}
            >
              Portfolio Snapshot
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Properties",
                  value: String(assetCount || "—"),
                  sub: assetCount === 1 ? "asset" : "assets",
                },
                {
                  label: "Total Area",
                  value:
                    totalSqft > 0
                      ? totalSqft >= 1000
                        ? `${Math.round(totalSqft / 1000)}k`
                        : String(totalSqft)
                      : "—",
                  sub: totalSqft > 0 ? "sq ft" : "not set",
                },
                {
                  label: "Markets",
                  value: markets.length > 0 ? String(markets.length) : "—",
                  sub:
                    markets.length > 0
                      ? markets.slice(0, 2).join(", ") +
                        (markets.length > 2 ? ` +${markets.length - 2}` : "")
                      : "locations",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#9CA3AF" }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="text-3xl font-bold"
                    style={{ color: "#111827", letterSpacing: "-1px" }}
                  >
                    {item.value}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── OPPORTUNITIES IDENTIFIED ── */}
          <div className="mb-8">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#9CA3AF" }}
            >
              Opportunities Identified
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: "🛡️",
                  label: "Insurance",
                  value: fmtK(opp.ins, sym),
                  sub: "estimated annual saving",
                  color: "#1647E8",
                  bg: "#EFF6FF",
                  href: "/insurance",
                },
                {
                  icon: "⚡",
                  label: "Energy",
                  value: fmtK(opp.energy, sym),
                  sub: "estimated yr-1 saving",
                  color: "#D97706",
                  bg: "#FFFBEB",
                  href: "/energy",
                },
                {
                  icon: "💰",
                  label: "Additional Income",
                  value: fmtK(opp.income, sym),
                  sub: "estimated new income p.a.",
                  color: "#0A8A4C",
                  bg: "#F0FDF4",
                  href: "/income",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-base mb-3"
                    style={{ backgroundColor: card.bg }}
                  >
                    {card.icon}
                  </div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#9CA3AF" }}
                  >
                    {card.label}
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: card.color, letterSpacing: "-0.5px" }}
                  >
                    {card.value}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Total opportunity callout */}
            <div
              className="mt-4 rounded-xl p-4 flex items-center justify-between"
              style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <div>
                <div
                  className="text-sm font-bold"
                  style={{ color: "#111827" }}
                >
                  Total recoverable opportunity
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                  Across insurance, energy &amp; income streams
                </div>
              </div>
              <div
                className="text-3xl font-bold"
                style={{ color: "#0A8A4C", letterSpacing: "-1px" }}
              >
                {fmtK(opp.total, sym)}
                <span
                  className="text-sm font-medium ml-1"
                  style={{ color: "#6B7280" }}
                >
                  /yr
                </span>
              </div>
            </div>
          </div>

          {/* ── NEXT STEPS ── */}
          <div
            className="mb-8 rounded-xl p-6"
            style={{ backgroundColor: "#111827" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white mb-1">
                  Ready to recover this?
                </h2>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>
                  RealHQ works on commission only — we earn when you save. Ask RealHQ to walk through
                  every opportunity in your portfolio right now — no booking required.
                </p>
              </div>
              <Link
                href="/ask"
                className="no-print shrink-0 rounded-lg px-5 py-2.5 text-sm font-bold whitespace-nowrap"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Ask RealHQ →
              </Link>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div
            className="pt-6"
            style={{ borderTop: "1px solid #E5E7EB" }}
          >
            <div className="flex items-start justify-between gap-8">
              <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
                Opportunity estimates are based on portfolio size and market comparables —
                actual recoverable amounts are confirmed once your documents
                are uploaded and analysed.
              </p>
              <div className="text-right shrink-0">
                <div
                  className="text-sm font-bold"
                  style={{ color: "#111827" }}
                >
                  RealHQ
                </div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>
                  realhq.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
