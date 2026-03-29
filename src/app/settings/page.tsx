"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState({
    complianceReminders: true,
    rentReviewAlerts: true,
    newDealAlerts: true,
    planningAlerts: true,
    energyAnomalies: false,
    rateChangeAlerts: false,
    weeklyDigest: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "28px 32px 80px" }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: "var(--tx)", marginBottom: "4px" }}>
        Settings
      </div>
      <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)", marginBottom: "24px" }}>
        Manage your account, notifications, and preferences.
      </div>

      {/* PROFILE */}
      <div className="sec">Profile</div>
      <div className="card">
        <div className="card-hd">
          <h4>Account</h4>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Name</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            {session?.user?.name || "User"}
          </div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Email</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            {session?.user?.email || "user@example.com"}
          </div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Company</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>—</div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Portfolio</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>—</div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Currency</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>USD ($)</div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="sec" style={{ marginTop: "24px" }}>
        Notifications
      </div>
      <div className="card">
        <div className="card-hd">
          <h4>Email Notifications</h4>
        </div>

        <NotificationRow
          label="Compliance reminders"
          description="90, 60, 30 days before certificate expiry"
          enabled={notifications.complianceReminders}
          onToggle={() => toggleNotification("complianceReminders")}
        />

        <NotificationRow
          label="Rent review alerts"
          description="When a review enters the 6-month window"
          enabled={notifications.rentReviewAlerts}
          onToggle={() => toggleNotification("rentReviewAlerts")}
        />

        <NotificationRow
          label="New deal alerts"
          description="When Scout finds a deal matching your strategy"
          enabled={notifications.newDealAlerts}
          onToggle={() => toggleNotification("newDealAlerts")}
        />

        <NotificationRow
          label="Planning alerts"
          description="New planning applications near your properties"
          enabled={notifications.planningAlerts}
          onToggle={() => toggleNotification("planningAlerts")}
        />

        <NotificationRow
          label="Energy anomalies"
          description="Consumption spikes detected"
          enabled={notifications.energyAnomalies}
          onToggle={() => toggleNotification("energyAnomalies")}
        />

        <NotificationRow
          label="Rate change alerts"
          description="When SOFR moves and impacts your debt service"
          enabled={notifications.rateChangeAlerts}
          onToggle={() => toggleNotification("rateChangeAlerts")}
        />

        <NotificationRow
          label="Weekly portfolio digest"
          description="Summary of actions, alerts, and opportunities every Monday"
          enabled={notifications.weeklyDigest}
          onToggle={() => toggleNotification("weeklyDigest")}
        />
      </div>

      {/* ACQUISITION STRATEGY */}
      <div className="sec" style={{ marginTop: "24px" }}>
        Acquisition Strategy
      </div>
      <div className="card">
        <div className="card-hd">
          <h4>Deal Finder Preferences</h4>
          <span className="card-link">Edit →</span>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Target types</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            Industrial, Warehouse
          </div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Geography</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            FL + SE England
          </div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Yield minimum</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>6.0%</div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Budget</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            $1M – $12M
          </div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Size range</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            5,000 – 50,000 sqft
          </div>
        </div>
      </div>

      {/* DATA & PRIVACY */}
      <div className="sec" style={{ marginTop: "24px" }}>
        Data & Privacy
      </div>
      <div className="card">
        <div className="card-hd">
          <h4>Your Data</h4>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}>
          <div className="row-name">Export all data</div>
          <span className="row-go">→</span>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}>
          <div className="row-name" style={{ color: "var(--red)" }}>
            Delete account
          </div>
          <span className="row-go">→</span>
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
      <div>
        <div className="row-name">{label}</div>
        <div className="row-sub">{description}</div>
      </div>
      <div
        onClick={onToggle}
        style={{
          width: "36px",
          height: "20px",
          borderRadius: "10px",
          background: enabled ? "var(--acc)" : "var(--s3)",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "2px",
            [enabled ? "right" : "left"]: "2px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#fff",
            transition: "all 0.2s",
          }}
        />
      </div>
    </div>
  );
}
