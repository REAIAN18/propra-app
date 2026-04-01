"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import s from "./alerts.module.css";

const FILTERS = ["All", "signal_match", "price_change", "status_change", "deadline", "followup", "portfolio"];
const FILTER_LABELS: Record<string, string> = {
  All: "All",
  signal_match: "Signals",
  price_change: "Price",
  status_change: "Status",
  deadline: "Deadlines",
  followup: "Follow-ups",
  portfolio: "Portfolio",
};

const BADGE_MAP: Record<string, { label: string; type: string; icon: string }> = {
  signal_match: { label: "New signal", type: "red", icon: "!" },
  price_change: { label: "Price drop", type: "amber", icon: "↓" },
  status_change: { label: "Status change", type: "red", icon: "⟳" },
  deadline: { label: "Deadline", type: "amber", icon: "⏱" },
  followup: { label: "Follow-up", type: "blue", icon: "↻" },
  portfolio: { label: "Portfolio", type: "green", icon: "◎" },
  completion: { label: "Completing", type: "green", icon: "✓" },
};

type AlertItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  metadata?: any;
  mandate?: { id: string; name: string } | null;
  property?: { id: string; address: string; assetType: string } | null;
};

const DEMO_ALERTS: AlertItem[] = [
  { id: "1", type: "signal_match", title: "Meridian Business Park — entered administration", description: "Begbies Traynor appointed. 8,200 sqft industrial, Rochester ME2.", read: false, dismissed: false, createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), mandate: { id: "m1", name: "SE Industrial" } },
  { id: "2", type: "price_change", title: "Redfield Manor — guide price reduced 15%", description: "£850,000 → £722,500. On your watchlist since 14 Mar.", read: false, dismissed: false, createdAt: new Date(Date.now() - 4 * 3600000).toISOString(), metadata: { oldPrice: 850000, newPrice: 722500 } },
  { id: "3", type: "status_change", title: "Vale Trading — MEES enforcement notice served", description: "Medway Council enforcement notice for EPC F. Owner has 6 months to comply.", read: false, dismissed: false, createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: "4", type: "deadline", title: "Ashworth Close — auction closes in 5 days", description: "EIG Auctions, Lot 23. Reserve £480,000. Legal pack available.", read: false, dismissed: false, createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: "5", type: "portfolio", title: "Portfolio gap: Manchester retail", description: "£320k retail unit in M4. Would address over-concentration in SE industrial (78%).", read: false, dismissed: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "6", type: "followup", title: "Fenton Business Hub — follow-up overdue", description: "Approach letter sent 7 days ago via email. No response logged.", read: true, dismissed: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsPage() {
  const [filter, setFilter] = useState("All");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "All") params.set("filter", filter);
      const res = await fetch(`/api/dealscope/alerts?${params}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAlerts(data);
      } else {
        // Demo fallback
        setAlerts(filter === "All" ? DEMO_ALERTS : DEMO_ALERTS.filter((a) => a.type === filter));
      }
    } catch {
      setAlerts(DEMO_ALERTS);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const handleMarkRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    try {
      await fetch(`/api/dealscope/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    } catch {}
  };

  const handleDismiss = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/dealscope/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
    } catch {}
  };

  const handleSnooze = async (id: string) => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/dealscope/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozedUntil: until }),
      });
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    for (const a of alerts.filter((a) => !a.read)) {
      try {
        await fetch(`/api/dealscope/alerts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
      } catch {}
    }
  };

  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.bar}>
          <h1 className={s.barTitle}>Alerts</h1>
          <span className={s.unreadCount}>{unreadCount} unread</span>
          <div className={s.barChips}>
            {FILTERS.map((f) => (
              <button key={f} className={`${s.chip} ${filter === f ? s.chipOn : ""}`} onClick={() => setFilter(f)}>{FILTER_LABELS[f] || f}</button>
            ))}
          </div>
          <button className={s.markAll} onClick={handleMarkAllRead}>Mark all read</button>
        </div>

        <div className={s.feed}>
          {loading && <div style={{ padding: 24, color: "var(--tx3)", textAlign: "center" }}>Loading alerts...</div>}
          {!loading && alerts.length === 0 && <div style={{ padding: 24, color: "var(--tx3)", textAlign: "center" }}>No alerts</div>}
          {alerts.map((a, i) => {
            const badge = BADGE_MAP[a.type] || { label: a.type, type: "blue", icon: "•" };
            return (
              <div
                key={a.id}
                className={`${s.alert} ${!a.read ? s.alertUnread : ""}`}
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => handleMarkRead(a.id)}
              >
                <div className={s.alertIcon} data-type={badge.type}>{badge.icon}</div>
                <div className={s.alertBody}>
                  <div className={s.alertTitle}>{a.title}</div>
                  <div className={s.alertDesc}>{a.description}</div>
                  <div className={s.alertMeta}>
                    <span className={s.badge} data-type={badge.type}>{badge.label}</span>
                    {a.mandate && <span className={s.mandateTag}>{a.mandate.name}</span>}
                    <span>{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
                <div className={s.alertActions}>
                  <button className={s.actBtn} onClick={(e) => { e.stopPropagation(); handleDismiss(a.id); }}>Dismiss</button>
                  <button className={s.actBtn} onClick={(e) => { e.stopPropagation(); handleSnooze(a.id); }}>Snooze</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
