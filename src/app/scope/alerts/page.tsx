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
      if (Array.isArray(data)) {
        setAlerts(data);
      } else {
        setAlerts([]);
      }
    } catch {
      setAlerts([]);
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
