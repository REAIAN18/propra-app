"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useSession } from "next-auth/react";

export default function ReminderPreferencesPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Default settings (these would come from user preferences in production)
  const [reminder90Days, setReminder90Days] = useState(true);
  const [reminder60Days, setReminder60Days] = useState(true);
  const [reminder30Days, setReminder30Days] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dashboardNotifications, setDashboardNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Reminder Preferences — RealHQ";
    }
  }, []);

  async function handleSave() {
    setSaving(true);

    // TODO: Implement backend API for saving preferences
    // This would require a new UserSettings or CompliancePreferences model
    // For now, just simulate a save
    await new Promise((resolve) => setTimeout(resolve, 500));

    setSaving(false);
    alert("Reminder preferences saved successfully!");
  }

  function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
      <div
        style={{
          width: "36px",
          height: "20px",
          borderRadius: "10px",
          background: enabled ? "var(--acc)" : "var(--s3)",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
        }}
        onClick={() => onChange(!enabled)}
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
    );
  }

  return (
    <AppShell>
      <TopBar />
      <div className="flow-page">
        <div className="flow-label a1">Flow 5 — Set reminder preferences</div>
        <div className="flow-h a1" style={{ textAlign: "center" }}>
          Reminder Settings
        </div>
        <div className="flow-sub a2" style={{ textAlign: "center" }}>
          Choose when RealHQ reminds you about upcoming certificate renewals.
        </div>

        <div className="card a2">
          <div className="card-hd">
            <h4>Reminder Windows</h4>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="row-name">90 days before expiry</div>
              <div className="row-sub">First heads-up — plan ahead</div>
            </div>
            <Toggle enabled={reminder90Days} onChange={setReminder90Days} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="row-name">60 days before expiry</div>
              <div className="row-sub">Time to book assessors</div>
            </div>
            <Toggle enabled={reminder60Days} onChange={setReminder60Days} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="row-name">30 days before expiry</div>
              <div className="row-sub">Urgent — renew now</div>
            </div>
            <Toggle enabled={reminder30Days} onChange={setReminder30Days} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="row-name">Weekly digest while any cert is expired</div>
              <div className="row-sub">Running fine total in email</div>
            </div>
            <Toggle enabled={weeklyDigest} onChange={setWeeklyDigest} />
          </div>
        </div>

        <div className="card a3">
          <div className="card-hd">
            <h4>Notification Method</h4>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="row-name">Email to {session?.user?.email ?? "your email"}</div>
            </div>
            <Toggle enabled={emailNotifications} onChange={setEmailNotifications} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="row-name">Dashboard notification</div>
            </div>
            <Toggle enabled={dashboardNotifications} onChange={setDashboardNotifications} />
          </div>
        </div>

        <button
          className="btn-primary purple a4"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save preferences"}
        </button>

        <button className="btn-secondary a4" onClick={() => router.push("/compliance")}>
          ← Back to compliance
        </button>

        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            background: "var(--amb-lt)",
            border: "1px solid var(--amb-bdr)",
            borderRadius: "10px",
            fontSize: "12px",
            color: "var(--tx3)",
          }}
        >
          <strong style={{ color: "var(--amb)", display: "block", marginBottom: "4px" }}>
            Note:
          </strong>
          Backend integration for storing and applying these preferences is pending. The compliance
          reminder cron job currently uses default 90/60/30 day windows for all users.
        </div>
      </div>
    </AppShell>
  );
}
