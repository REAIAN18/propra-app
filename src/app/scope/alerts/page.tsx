"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import s from "./alerts.module.css";

const FILTERS = ["All", "Signals", "Price", "Deadlines", "Follow-ups", "Portfolio"];

const DEMO_ALERTS = [
  { id: "1", type: "signal", icon: "!", title: "Meridian Business Park — entered administration", desc: "Begbies Traynor appointed. 8,200 sqft industrial, Rochester ME2.", badge: "New signal", badgeType: "red", score: 7.2, mandate: "SE Industrial", time: "2h ago", unread: true },
  { id: "2", type: "price", icon: "↓", title: "Redfield Manor — guide price reduced 15%", desc: "£850,000 → £722,500. On your watchlist since 14 Mar.", badge: "Price drop", badgeType: "amber", time: "4h ago", unread: true },
  { id: "3", type: "status", icon: "⟳", title: "Vale Trading — MEES enforcement notice served", desc: "Medway Council enforcement notice for EPC F. Owner has 6 months to comply.", badge: "Status change", badgeType: "red", score: 5.4, time: "6h ago", unread: true },
  { id: "4", type: "deadline", icon: "⏱", title: "Ashworth Close — auction closes in 5 days", desc: "EIG Auctions, Lot 23. Reserve £480,000. Legal pack available.", badge: "Deadline", badgeType: "amber", countdown: "5 days left", time: "6h ago", unread: true },
  { id: "5", type: "portfolio", icon: "◎", title: "Portfolio gap: Manchester retail", desc: "£320k retail unit in M4. Would address over-concentration in SE industrial (78%).", badge: "Portfolio", badgeType: "green", score: 6.5, time: "1d ago", unread: true },
  { id: "6", type: "followup", icon: "↻", title: "Fenton Business Hub — follow-up overdue", desc: "Approach letter sent 7 days ago via email. No response logged.", badge: "Follow-up", badgeType: "blue", overdue: "1 day overdue", time: "1d ago", unread: false },
  { id: "7", type: "completion", icon: "✓", title: "Sutton Industrial Park — completion approaching", desc: "Completion date 14 Apr 2026. Solicitors confirmed exchange. Final deposit £31k due 10 Apr.", badge: "Completing", badgeType: "green", time: "2d ago", unread: false },
];

export default function AlertsPage() {
  const [filter, setFilter] = useState("All");
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const unreadCount = alerts.filter((a) => a.unread).length;

  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.bar}>
          <h1 className={s.barTitle}>Alerts</h1>
          <span className={s.unreadCount}>{unreadCount} unread</span>
          <div className={s.barChips}>
            {FILTERS.map((f) => (
              <button key={f} className={`${s.chip} ${filter === f ? s.chipOn : ""}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <button className={s.markAll} onClick={() => setAlerts(alerts.map((a) => ({ ...a, unread: false })))}>Mark all read</button>
        </div>

        <div className={s.feed}>
          {alerts.map((a, i) => (
            <div key={a.id} className={`${s.alert} ${a.unread ? s.alertUnread : ""}`} style={{ animationDelay: `${i * 0.04}s` }}>
              <div className={s.alertIcon} data-type={a.badgeType}>{a.icon}</div>
              <div className={s.alertBody}>
                <div className={s.alertTitle}>{a.title}</div>
                <div className={s.alertDesc}>{a.desc}</div>
                <div className={s.alertMeta}>
                  <span className={s.badge} data-type={a.badgeType}>{a.badge}</span>
                  {a.mandate && <span className={s.mandateTag}>{a.mandate}</span>}
                  {a.score && <span className={s.score}>{a.score}</span>}
                  {a.countdown && <span className={s.countdown}>{a.countdown}</span>}
                  {a.overdue && <span className={s.overdue}>{a.overdue}</span>}
                  <span>{a.time}</span>
                </div>
              </div>
              <div className={s.alertActions}>
                <button className={s.actBtn}>Dismiss</button>
                <button className={s.actBtn}>Snooze</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
