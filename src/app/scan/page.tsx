"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SCAN_STEPS = [
  { id: "insurance", label: "Insurance benchmarking", detail: "Comparing premiums across 12 carriers", delay: 600 },
  { id: "energy", label: "Energy spend analysis", detail: "Benchmarking kWh/sqft against market rates", delay: 1300 },
  { id: "income", label: "Income opportunities", detail: "Identifying solar, EV, 5G, and parking income", delay: 2100 },
  { id: "compliance", label: "Compliance certificates", detail: "Checking expiry dates and fine exposure", delay: 2800 },
  { id: "leases", label: "Lease register", detail: "WAULT, reversion potential, break clause risk", delay: 3600 },
  { id: "financing", label: "Financing position", detail: "LTV, ICR, maturity, and market rate delta", delay: 4400 },
];

function fmtK(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(v / 1000)}k`;
}

function buildFindings(assets: number) {
  const n = Math.max(1, assets);
  // Scale from FL Mixed baseline: 5 assets → $194k total
  const insuranceOverpay = Math.round((42000 / 5) * n);
  const energyOverpay = Math.round((28000 / 5) * n);
  const income = Math.round((124000 / 5) * n);
  const total = insuranceOverpay + energyOverpay + income;
  const complianceCount = Math.max(1, Math.round((3 / 5) * n));
  const leaseCount = Math.max(1, Math.round((2 / 5) * n));
  const assetCount = Math.max(1, Math.round((4 / 5) * n));
  return [
    { delay: 800,  text: `Insurance overpay detected across ${assetCount} asset${assetCount !== 1 ? "s" : ""}` },
    { delay: 1800, text: `Energy spend ${Math.round(18 + (n - 5) * 0.5)}% above market benchmark` },
    { delay: 2600, text: `${fmtK(income)}/yr in untapped income identified` },
    { delay: 3400, text: `${complianceCount} compliance certificate${complianceCount !== 1 ? "s" : ""} expiring within 90 days` },
    { delay: 4200, text: `${leaseCount} lease${leaseCount !== 1 ? "s" : ""} at ERV reversion risk` },
    { delay: 5000, text: `Analysis complete — ${fmtK(total)} total opportunity found` },
  ];
}

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const company = searchParams.get("company") ?? "";
  const assetCount = parseInt(searchParams.get("assets") ?? "5", 10);

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [visibleFindings, setVisibleFindings] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const findingLines = buildFindings(assetCount);

  useEffect(() => {
    SCAN_STEPS.forEach(({ id, delay }) => {
      setTimeout(() => {
        setCompletedSteps((prev) => new Set([...prev, id]));
      }, delay);
    });

    findingLines.forEach(({ delay, text }) => {
      setTimeout(() => {
        setVisibleFindings((prev) => [...prev, text]);
      }, delay);
    });

    const lastDelay = Math.max(...SCAN_STEPS.map((s) => s.delay));
    setTimeout(() => setDone(true), lastDelay + 500);
    setTimeout(() => router.push("/dashboard?welcome=1"), lastDelay + 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const allComplete = completedSteps.size === SCAN_STEPS.length;
  const portfolioDesc = company
    ? `${company}${assetCount > 1 ? ` · ${assetCount} assets` : ""}`
    : "your portfolio";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0B1622" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
        <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#e8eef5", letterSpacing: "0.12em" }}>
          Arca
        </span>
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="text-xl font-semibold mb-2" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), Georgia, serif" }}>
            {done ? "Analysis complete" : "Running portfolio analysis…"}
          </div>
          <div className="text-sm truncate max-w-xs mx-auto" style={{ color: "#5a7a96" }}>
            {done ? "Redirecting to your dashboard" : `Arca is scanning ${portfolioDesc}`}
          </div>
        </div>

        {/* Steps */}
        <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
          {SCAN_STEPS.map((step, i) => {
            const isComplete = completedSteps.has(step.id);
            const isActive = !isComplete && completedSteps.size === i;
            return (
              <div
                key={step.id}
                className="flex items-center gap-3 px-4 py-3 transition-all duration-300"
                style={{
                  borderBottom: i < SCAN_STEPS.length - 1 ? "1px solid #1a2d45" : undefined,
                  opacity: isComplete || isActive ? 1 : 0.35,
                }}
              >
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{
                    backgroundColor: isComplete ? "#0A8A4C" : isActive ? "#1647E8" : "#1a2d45",
                  }}
                >
                  {isComplete ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isActive ? (
                    <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#fff" }} />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#3d5a72" }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium" style={{ color: isComplete ? "#e8eef5" : isActive ? "#e8eef5" : "#5a7a96" }}>
                    {step.label}
                  </div>
                  {isActive && (
                    <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{step.detail}</div>
                  )}
                </div>
                {isComplete && (
                  <div className="text-xs font-medium shrink-0" style={{ color: "#0A8A4C" }}>done</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live findings feed */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <div className="px-4 py-2.5 text-xs font-medium" style={{ color: "#5a7a96", borderBottom: "1px solid #1a2d45" }}>
            Live findings
          </div>
          <div className="px-4 py-2 space-y-1.5 min-h-[80px]">
            {visibleFindings.map((finding, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs animate-fade-in"
                style={{ color: i === visibleFindings.length - 1 && allComplete ? "#0A8A4C" : "#8ba0b8" }}
              >
                <span style={{ color: "#0A8A4C" }}>›</span>
                {finding}
              </div>
            ))}
            {!allComplete && visibleFindings.length === 0 && (
              <div className="text-xs" style={{ color: "#3d5a72" }}>Initialising scan…</div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2 text-xs" style={{ color: "#5a7a96" }}>
            <span>{completedSteps.size} / {SCAN_STEPS.length} modules complete</span>
            <span>{Math.round((completedSteps.size / SCAN_STEPS.length) * 100)}%</span>
          </div>
          <div className="h-1 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completedSteps.size / SCAN_STEPS.length) * 100}%`,
                backgroundColor: done ? "#0A8A4C" : "#1647E8",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0B1622" }}>
        <div className="text-sm" style={{ color: "#5a7a96" }}>Loading…</div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
