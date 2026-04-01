"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./alerts.module.css";

type AlertType = "signal" | "price" | "deadline" | "followup" | "portfolio" | "completion";
type FilterType = "all" | "signals" | "price" | "deadlines" | "followups" | "portfolio";

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  tags: string[];
  score?: number;
  timeAgo: string;
  unread: boolean;
  icon: string;
  iconColor: "red" | "amber" | "green" | "blue";
}

const ALERT_FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "signals", label: "Signals" },
  { id: "price", label: "Price" },
  { id: "deadlines", label: "Deadlines" },
  { id: "followups", label: "Follow-ups" },
  { id: "portfolio", label: "Portfolio" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  // Load alerts
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await fetch("/api/scope/alerts");
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.alerts || []);
        }
      } catch (err) {
        console.error("Error loading alerts:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAlerts();
  }, []);

  // Filter alerts
  const filteredAlerts = filter === "all"
    ? alerts
    : alerts.filter(a => {
        switch(filter) {
          case "signals": return a.type === "signal";
          case "price": return a.type === "price";
          case "deadlines": return a.type === "deadline";
          case "followups": return a.type === "followup";
          case "portfolio": return a.type === "portfolio";
          default: return true;
        }
      });

  const unreadCount = alerts.filter(a => a.unread).length;
  const allRead = unreadCount === 0;

  const handleMarkAllRead = () => {
    setAlerts(alerts.map(a => ({ ...a, unread: false })));
  };

  const handleDismiss = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const handleSnooze = (id: string) => {
    setAlerts(alerts.map(a =>
      a.id === id ? { ...a, unread: false } : a
    ));
  };

  const getIconStyle = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      red: { bg: "#f06060", text: "#fff" },
      amber: { bg: "#eab020", text: "#fff" },
      green: { bg: "#2dd4a8", text: "#fff" },
      blue: { bg: "#5599f0", text: "#fff" },
    };
    return colors[color] || colors.red;
  };

  if (loading) {
    return (
      <AppShell>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1>Alerts</h1>
          </header>
          <div className={styles.loading}>Loading alerts...</div>
        </div>
      </AppShell>
    );
  }

  if (alerts.length === 0) {
    return (
      <AppShell>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1>Alerts</h1>
          </header>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚡</div>
            <h2>No alerts yet</h2>
            <p>Alerts are triggered when deals match your mandates, prices change on watched properties, auction deadlines approach, or follow-ups come due. Create a mandate or watch a property to start receiving alerts.</p>
            <div className={styles.emptyActions}>
              <Link href="/scope/settings?tab=mandates">
                <button className={styles.primaryButton}>Create a mandate</button>
              </Link>
              <Link href="/scope/search">
                <button className={styles.secondaryButton}>Search for properties</button>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Alerts</h1>
            <p className={styles.unreadBadge}>
              {allRead ? "All caught up" : `${unreadCount} unread`}
            </p>
          </div>
          <button className={styles.secondaryButton} onClick={handleMarkAllRead}>
            Mark all read
          </button>
        </header>

        <div className={styles.filters}>
          {ALERT_FILTERS.map(f => (
            <button
              key={f.id}
              className={`${styles.filterChip} ${filter === f.id ? styles.active : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.alertsList}>
          {filteredAlerts.map((alert, index) => {
            const iconStyle = getIconStyle(alert.iconColor);
            return (
              <div
                key={alert.id}
                className={`${styles.alertItem} ${alert.unread ? styles.unread : ""} ${styles[`anim`]} ${styles[`a${index}`]}`}
              >
                <div
                  className={styles.alertIcon}
                  style={{ backgroundColor: iconStyle.bg, color: iconStyle.text }}
                >
                  {alert.icon}
                </div>
                <div className={styles.alertBody}>
                  <div className={styles.alertTitle}>{alert.title}</div>
                  <div className={styles.alertDescription}>{alert.description}</div>
                  <div className={styles.alertMeta}>
                    {alert.tags.map((tag, i) => (
                      <span key={i} className={styles.tag}>{tag}</span>
                    ))}
                    {alert.score !== undefined && (
                      <span className={styles.score}>{alert.score}</span>
                    )}
                    <span className={styles.timeAgo}>{alert.timeAgo}</span>
                  </div>
                </div>
                <div className={styles.alertActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleDismiss(alert.id)}
                  >
                    Dismiss
                  </button>
                  {alert.unread && (
                    <button
                      className={styles.actionButton}
                      onClick={() => handleSnooze(alert.id)}
                    >
                      Snooze
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
