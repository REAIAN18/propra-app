"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

type ServiceRequest = {
  id: string;
  serviceType: string;
  propertyAddress: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  insurer: string | null;
  currentPremium: number | null;
  renewalDate: string | null;
  supplier: string | null;
  annualSpend: number | null;
};

const SERVICE_LABELS: Record<string, string> = {
  insurance_retender: "Insurance Retender",
  energy_switch: "Energy Switch",
  rent_review: "Rent Review",
  income_activation: "Income Activation",
  transaction_sale: "Transaction / Sale",
  compliance_renewal: "Compliance Renewal",
  financing_refinance: "Financing / Refinance",
  work_order_tender: "Work Order Tender",
};

const SERVICE_ICONS: Record<string, string> = {
  insurance_retender: "🛡️",
  energy_switch: "⚡",
  rent_review: "📋",
  income_activation: "💰",
  transaction_sale: "📈",
  compliance_renewal: "✅",
  financing_refinance: "🏦",
  work_order_tender: "🔧",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  pending: {
    label: "Received",
    color: "#F5A94A",
    bg: "#2a1f0a",
    desc: "Your request has been received. Arca will begin work shortly.",
  },
  in_progress: {
    label: "In Progress",
    color: "#1647E8",
    bg: "#0d1630",
    desc: "Arca is actively working on this request.",
  },
  quotes_ready: {
    label: "Quotes Ready",
    color: "#0A8A4C",
    bg: "#0f2a1c",
    desc: "Competing quotes have been obtained. Arca will be in touch.",
  },
  done: {
    label: "Completed",
    color: "#0A8A4C",
    bg: "#0f2a1c",
    desc: "This request has been completed successfully.",
  },
  not_proceeding: {
    label: "Not Proceeding",
    color: "#5a7a96",
    bg: "#111e2e",
    desc: "This request has been closed.",
  },
};

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatCurrency(val: number | null): string {
  if (val == null) return "—";
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
  return `$${val}`;
}

function RequestCard({ req }: { req: ServiceRequest }) {
  const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
  const label = SERVICE_LABELS[req.serviceType] ?? req.serviceType;
  const icon = SERVICE_ICONS[req.serviceType] ?? "📌";

  return (
    <div
      className="rounded-xl p-5 transition-all duration-150"
      style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              {label}
            </div>
            {req.propertyAddress && (
              <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                {req.propertyAddress}
              </div>
            )}
          </div>
        </div>
        <span
          className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: status.bg, color: status.color, border: `1px solid ${status.color}33` }}
        >
          {status.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full mb-3" style={{ backgroundColor: "#1a2d45" }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            backgroundColor: status.color,
            width:
              req.status === "pending" ? "15%" :
              req.status === "in_progress" ? "55%" :
              req.status === "quotes_ready" ? "80%" :
              req.status === "done" ? "100%" : "0%",
          }}
        />
      </div>

      <div className="text-xs mb-3" style={{ color: "#8ba0b8" }}>
        {status.desc}
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-3 text-xs" style={{ color: "#5a7a96" }}>
        {req.insurer && <span>Current insurer: <span style={{ color: "#8ba0b8" }}>{req.insurer}</span></span>}
        {req.currentPremium && <span>Premium: <span style={{ color: "#8ba0b8" }}>{formatCurrency(req.currentPremium)}/yr</span></span>}
        {req.supplier && <span>Current supplier: <span style={{ color: "#8ba0b8" }}>{req.supplier}</span></span>}
        {req.annualSpend && <span>Annual spend: <span style={{ color: "#8ba0b8" }}>{formatCurrency(req.annualSpend)}/yr</span></span>}
        {req.renewalDate && <span>Renewal: <span style={{ color: "#8ba0b8" }}>{new Date(req.renewalDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></span>}
      </div>

      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45" }}>
        <span className="text-xs" style={{ color: "#3d5a72" }}>Submitted {timeAgo(req.createdAt)}</span>
        {req.updatedAt !== req.createdAt && (
          <span className="text-xs" style={{ color: "#3d5a72" }}>Updated {timeAgo(req.updatedAt)}</span>
        )}
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [notFound, setNotFound] = useState(false);

  async function loadRequests(emailQuery?: string) {
    setLoading(true);
    setNotFound(false);
    const url = emailQuery
      ? `/api/user/requests?email=${encodeURIComponent(emailQuery)}`
      : "/api/user/requests";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setRequests(data);
      if (data.length === 0) setNotFound(true);
    } else if (res.status === 401) {
      // Not logged in — need email input
      setRequests([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  function handleEmailLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setEmail(emailInput.trim());
    loadRequests(emailInput.trim());
  }

  const activeRequests = requests.filter((r) => r.status !== "done" && r.status !== "not_proceeding");
  const completedRequests = requests.filter((r) => r.status === "done" || r.status === "not_proceeding");

  return (
    <AppShell>
      <TopBar title="My Requests" />
      <main className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
            Service Requests
          </h1>
          <p className="text-sm" style={{ color: "#5a7a96" }}>
            Track the status of all your Arca service requests — insurance retenders, energy switches, rent reviews, and more.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl h-32 animate-pulse" style={{ backgroundColor: "#111e2e" }} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl p-8 flex flex-col items-center gap-4 text-center" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            {notFound && email ? (
              <>
                <div className="text-4xl">📭</div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>No requests found</div>
                <div className="text-xs max-w-xs" style={{ color: "#5a7a96" }}>
                  No service requests found for <strong style={{ color: "#8ba0b8" }}>{email}</strong>. Submit a request from the Insurance, Energy, or Rent Clock pages.
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl">📋</div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>No requests yet</div>
                <div className="text-xs max-w-xs mb-2" style={{ color: "#5a7a96" }}>
                  Submit a service request from any Arca module to track it here — insurance retenders, energy switches, rent reviews, and more.
                </div>
                {/* Email lookup for non-logged-in users */}
                <form onSubmit={handleEmailLookup} className="flex gap-2 w-full max-w-sm">
                  <input
                    type="email"
                    placeholder="Look up by email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: "#1647E8", color: "#fff" }}
                  >
                    Look up
                  </button>
                </form>
                <div className="flex gap-4 mt-2">
                  <Link href="/insurance" className="text-xs font-semibold" style={{ color: "#1647E8" }}>
                    Insurance →
                  </Link>
                  <Link href="/energy" className="text-xs font-semibold" style={{ color: "#1647E8" }}>
                    Energy →
                  </Link>
                  <Link href="/rent-clock" className="text-xs font-semibold" style={{ color: "#1647E8" }}>
                    Rent Clock →
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Active requests */}
            {activeRequests.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#5a7a96" }}>
                  Active · {activeRequests.length}
                </div>
                <div className="space-y-3">
                  {activeRequests.map((r) => <RequestCard key={r.id} req={r} />)}
                </div>
              </div>
            )}

            {/* Completed requests */}
            {completedRequests.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#5a7a96" }}>
                  Completed · {completedRequests.length}
                </div>
                <div className="space-y-3">
                  {completedRequests.map((r) => <RequestCard key={r.id} req={r} />)}
                </div>
              </div>
            )}

            {/* Contact footer */}
            <div className="rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Questions about your requests?</div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                  Contact the Arca team directly
                </div>
              </div>
              <a
                href="mailto:hello@arcahq.ai"
                className="text-xs font-semibold px-4 py-2 rounded-lg"
                style={{ backgroundColor: "#1a2d45", color: "#8ba0b8" }}
              >
                hello@arcahq.ai
              </a>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
