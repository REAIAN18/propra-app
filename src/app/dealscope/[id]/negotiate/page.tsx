"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./negotiate.module.css";

export default function NegotiationDashboardPage() {
  const params = useParams();
  const propertyId = params.id as string;

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Negotiation Dashboard</h1>
        </header>

        <div className={styles.content}>
          <div className={styles.section}>
            <h2>Comparable Evidence Pack</h2>
            <div className={styles.comps}>
              <div className={styles.comp}>
                <div className={styles.compLabel}>Recent Sale #1</div>
                <div className={styles.compValue}>$850,000</div>
                <div className={styles.compDetail}>2.5 miles away • 12 months ago</div>
              </div>
              <div className={styles.comp}>
                <div className={styles.compLabel}>Recent Sale #2</div>
                <div className={styles.compValue}>$920,000</div>
                <div className={styles.compDetail}>3.1 miles away • 6 months ago</div>
              </div>
              <div className={styles.comp}>
                <div className={styles.compLabel}>Market Average</div>
                <div className={styles.compValue}>$885,000</div>
                <div className={styles.compDetail}>3 comparable properties</div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Offer Calculator</h2>
            <div className={styles.calculator}>
              <div className={styles.row}>
                <label>Asking Price:</label>
                <div className={styles.value}>$950,000</div>
              </div>
              <div className={styles.row}>
                <label>Market Value:</label>
                <div className={styles.value}>$885,000</div>
              </div>
              <div className={styles.row}>
                <label>Suggested Range:</label>
                <div className={styles.value} style={{ color: "var(--grn)" }}>
                  $775,000 – $850,000
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Leverage Assessment</h2>
            <div className={styles.factors}>
              <div className={styles.factor}>
                <span>Days on Market</span>
                <span style={{ color: "var(--red)" }}>— 120 days (High leverage)</span>
              </div>
              <div className={styles.factor}>
                <span>Owner Status</span>
                <span style={{ color: "var(--red)" }}>— In Administration (Critical)</span>
              </div>
              <div className={styles.factor}>
                <span>Cap Rate</span>
                <span style={{ color: "var(--amb)" }}>— 6.8% (Market-aligned)</span>
              </div>
              <div className={styles.factor}>
                <span>Planning Signals</span>
                <span style={{ color: "var(--grn)" }}>— Positive development potential</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Due Diligence Checklist</h2>
            <div className={styles.checklist}>
              <label className={styles.checkItem}>
                <input type="checkbox" />
                <span>Title deed review</span>
              </label>
              <label className={styles.checkItem}>
                <input type="checkbox" />
                <span>Survey & boundary confirmation</span>
              </label>
              <label className={styles.checkItem}>
                <input type="checkbox" />
                <span>Lease review (if applicable)</span>
              </label>
              <label className={styles.checkItem}>
                <input type="checkbox" />
                <span>Environmental screening</span>
              </label>
              <label className={styles.checkItem}>
                <input type="checkbox" />
                <span>Planning history & future</span>
              </label>
              <label className={styles.checkItem}>
                <input type="checkbox" />
                <span>Building regulations compliance</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
