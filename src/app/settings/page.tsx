"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";

// ── Notification prefs stored in localStorage ─────────────────────────────
type NotifPrefs = {
  compliance: boolean;
  rentReview: boolean;
  newDeals: boolean;
  planning: boolean;
  energyAnomalies: boolean;
  rateChanges: boolean;
  weeklyDigest: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  compliance: true,
  rentReview: true,
  newDeals: true,
  planning: true,
  energyAnomalies: false,
  rateChanges: false,
  weeklyDigest: true,
};

const NOTIF_KEY = "rhq_notif_prefs";

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0,
        background: on ? "var(--acc)" : "var(--s3)", cursor: "pointer",
        position: "relative", transition: "background .15s",
        border: on ? "1px solid var(--acc-bdr)" : "1px solid var(--bdr)",
      }}
    >
      <div style={{
        position: "absolute", top: "2px",
        left: on ? undefined : "2px", right: on ? "2px" : undefined,
        width: "14px", height: "14px", borderRadius: "50%",
        background: "#fff", transition: "left .15s, right .15s",
      }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session } = useSession();
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [strategy, setStrategy] = useState<{
    assetTypes: string[];
    budgetMin: number | null;
    budgetMax: number | null;
    yieldMin: number | null;
    geography: string;
  } | null>(null);


  // Load notification prefs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIF_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {
      // ignore
    }
  }, []);

  // Load acquisition strategy
  useEffect(() => {
    fetch("/api/user/acquisition-strategy")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const s = d?.strategy;
        if (s) {
          setStrategy({
            assetTypes: s.targetTypes ?? [],
            budgetMin: s.minPrice ?? null,
            budgetMax: s.maxPrice ?? null,
            yieldMin: s.minYield != null ? Math.round(s.minYield * 1000) / 10 : null,
            geography: Array.isArray(s.targetGeography) ? s.targetGeography.join(" + ") : (s.targetGeography ?? ""),
          });
        }
      })
      .catch(() => {});
  }, []);

  function toggle(key: keyof NotifPrefs) {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const user = session?.user;
  const currencyLabel = portfolio.currency === "GBP" ? "GBP (£)" : "USD ($)";

  return (
    <>
      <style jsx>{`
        .row { display: grid; align-items: center; padding: 11px 18px; border-bottom: 1px solid var(--bdr-lt); }
        .row:last-child { border-bottom: none; }
        .row-name { font-size: 12px; font-weight: 500; color: var(--tx); line-height: 1.3; }
        .row-sub { font-size: 11px; color: var(--tx3); margin-top: 1px; }
        .row-val { font: 500 12px var(--sans); color: var(--tx2); text-align: right; }
        .card { background: var(--s1); border: 1px solid var(--bdr); border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
        .card-hd { padding: 13px 18px; border-bottom: 1px solid var(--bdr); display: flex; align-items: center; justify-content: space-between; }
        .card-hd h4 { font: 600 13px var(--sans); color: var(--tx); }
        .card-link { font: 500 11px var(--sans); color: var(--acc); cursor: pointer; }
        .sec { font: 500 9px/1 var(--mono); color: var(--tx3); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; padding-top: 4px; }
      `}</style>
      <AppShell>
        <TopBar />
        <main style={{ maxWidth: "640px", margin: "0 auto", padding: "28px 24px 80px", backgroundColor: "var(--bg)" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "24px", fontWeight: 400, color: "var(--tx)", marginBottom: "4px" }}>Settings</h1>
          <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", marginBottom: "28px" }}>Manage your account, notifications, and preferences.</p>

          {/* Profile */}
          <div className="sec">Profile</div>
          <div className="card" style={{ marginBottom: "28px" }}>
            <div className="card-hd"><h4>Account</h4></div>
            {[
              { label: "Name", value: user?.name ?? "—" },
              { label: "Email", value: user?.email ?? "—" },
              { label: "Portfolio", value: portfolio.name },
              { label: "Assets", value: `${(portfolio.assets?.length ?? 0)} properties` },
              { label: "Currency", value: currencyLabel },
            ].map(row => (
              <div key={row.label} className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                <div className="row-name">{row.label}</div>
                <div className="row-val">{row.value}</div>
              </div>
            ))}
          </div>

          {/* Notifications */}
          <div className="sec">Notifications</div>
          <div className="card" style={{ marginBottom: "28px" }}>
            <div className="card-hd"><h4>Email Notifications</h4></div>
            {([
              { key: "compliance" as const, label: "Compliance reminders", sub: "90, 60, 30 days before certificate expiry" },
              { key: "rentReview" as const, label: "Rent review alerts", sub: "When a review enters the 6-month window" },
              { key: "newDeals" as const, label: "New deal alerts", sub: "When Scout finds a deal matching your strategy" },
              { key: "planning" as const, label: "Planning alerts", sub: "New planning applications near your properties" },
              { key: "energyAnomalies" as const, label: "Energy anomalies", sub: "Consumption spikes detected" },
              { key: "rateChanges" as const, label: "Rate change alerts", sub: "When SOFR moves and impacts your debt service" },
              { key: "weeklyDigest" as const, label: "Weekly portfolio digest", sub: "Actions, alerts, and opportunities every Monday" },
            ] as { key: keyof NotifPrefs; label: string; sub: string }[]).map(n => (
              <div key={n.key} className="row" style={{ gridTemplateColumns: "1fr auto", gap: "16px" }}>
                <div>
                  <div className="row-name">{n.label}</div>
                  <div className="row-sub">{n.sub}</div>
                </div>
                <Toggle on={prefs[n.key]} onToggle={() => toggle(n.key)} />
              </div>
            ))}
          </div>

          {/* Acquisition Strategy */}
          <div className="sec">Acquisition Strategy</div>
          <div className="card" style={{ marginBottom: "28px" }}>
            <div className="card-hd">
              <h4>Deal Finder Preferences</h4>
              <Link href="/scope/settings" className="card-link">Edit →</Link>
            </div>
            {strategy ? (
              <>
                {strategy.assetTypes?.length > 0 && (
                  <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div className="row-name">Target types</div>
                    <div className="row-val">{strategy.assetTypes.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}</div>
                  </div>
                )}
                {strategy.geography && (
                  <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div className="row-name">Geography</div>
                    <div className="row-val">{strategy.geography}</div>
                  </div>
                )}
                {strategy.yieldMin != null && (
                  <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div className="row-name">Yield minimum</div>
                    <div className="row-val">{strategy.yieldMin}%</div>
                  </div>
                )}
                {(strategy.budgetMin != null || strategy.budgetMax != null) && (
                  <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div className="row-name">Budget</div>
                    <div className="row-val">
                      {strategy.budgetMin != null ? `$${Math.round(strategy.budgetMin / 1000)}k` : "—"} – {strategy.budgetMax != null ? `$${Math.round(strategy.budgetMax / 1_000_000)}M` : "—"}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="row" style={{ gridTemplateColumns: "1fr" }}>
                <div className="row-sub">No acquisition strategy set. <Link href="/scope/settings" style={{ color: "var(--acc)" }}>Set one →</Link></div>
              </div>
            )}
          </div>

          {/* Data & Privacy */}
          <div className="sec">Data &amp; Privacy</div>
          <div className="card" style={{ marginBottom: "28px" }}>
            <div className="card-hd"><h4>Your Data</h4></div>
            <Link href="/api/user/export" className="row" style={{ gridTemplateColumns: "1fr auto", display: "grid", textDecoration: "none" }}>
              <div className="row-name">Export all data</div>
              <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "4px", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>CSV</span>
            </Link>
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div>
                <div className="row-name">Data retention</div>
                <div className="row-sub">Document extracts kept for 12 months</div>
              </div>
              <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "4px", background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" }}>Active</span>
            </div>
          </div>

          {/* Sign out */}
          {user && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{ width: "100%", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "var(--tx3)", border: "1px solid var(--bdr)", borderRadius: "10px", font: "500 13px/1 var(--sans)", cursor: "pointer" }}
            >
              Sign out
            </button>
          )}
        </main>
      </AppShell>
    </>
  );
}
