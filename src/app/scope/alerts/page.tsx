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

const DEMO_ALERTS: Alert[] = [
  {
    id: "1",
    type: "signal",
    title: "Meridian Business Park — entered administration",
    description: "Begbies Traynor appointed as administrator. 8,200 sqft industrial, Rochester ME2. Matches your \"SE Industrial\" mandate.",
    tags: ["New signal", "SE Industrial"],
    score: 7.2,
    timeAgo: "2h ago",
    unread: true,
    icon: "!",
    iconColor: "red",
  },
  {
    id: "2",
    type: "price",
    title: "Redfield Manor — guide price reduced 15%",
    description: "£850,000 → £722,500. On your watchlist since 14 Mar. Previous approach letter unanswered (sent 20 Mar).",
    tags: ["Price drop"],
    timeAgo: "4h ago",
    unread: true,
    icon: "↓",
    iconColor: "amber",
  },
  {
    id: "3",
    type: "signal",
    title: "Vale Trading — MEES enforcement notice served",
    description: "Medway Council enforcement notice for EPC F rating. Owner has 6 months to achieve minimum E. Creates motivated seller opportunity.",
    tags: ["Status change"],
    score: 5.4,
    timeAgo: "6h ago",
    unread: true,
    icon: "⟳",
    iconColor: "red",
  },
  {
    id: "4",
    type: "deadline",
    title: "Ashworth Close — auction closes in 5 days",
    description: "EIG Auctions, Lot 23. Reserve £480,000. Legal pack available. You saved this property 14 days ago.",
    tags: ["Deadline"],
    timeAgo: "6h ago",
    unread: true,
    icon: "⏱",
    iconColor: "amber",
  },
  {
    id: "5",
    type: "portfolio",
    title: "Portfolio gap identified: Manchester retail",
    description: "Property at £320k, 2,400 sqft retail unit in Manchester M4. Would address your portfolio over-concentration in SE industrial (currently 78% of portfolio value).",
    tags: ["Portfolio"],
    score: 6.5,
    timeAgo: "1d ago",
    unread: true,
    icon: "◎",
    iconColor: "green",
  },
  {
    id: "6",
    type: "followup",
    title: "Fenton Business Hub — follow-up overdue",
    description: "Approach letter sent 7 days ago via email to Forrest & Co (agent). No response logged. Recommended: phone follow-up.",
    tags: ["Follow-up"],
    timeAgo: "1d ago",
    unread: false,
    icon: "↻",
    iconColor: "blue",
  },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showEmpty, setShowEmpty] = useState(false);

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

  if (showEmpty || alerts.length === 0) {
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
              <button className={styles.primaryButton}>Create a mandate</button>
              <button className={styles.secondaryButton}>Search for properties</button>
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
