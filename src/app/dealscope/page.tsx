"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./dealscope.module.css";

interface Property {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  askingPrice?: number;
  capRate?: number;
  dealScore: number;
  temperature: "hot" | "warm" | "watch" | "cold";
  signals: string[];
}

export default function DealScopePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = () => {
    setLoading(true);
    setError(null);
    fetch("/api/dealscope/properties")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load properties (${res.status})`);
        return res.json();
      })
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const hotCount = properties.filter((p) => p.temperature === "hot").length;
  const warmCount = properties.filter((p) => p.temperature === "warm").length;
  const watchCount = properties.filter((p) => p.temperature === "watch").length;

  const uniqueSignals = Array.from(new Set(properties.flatMap((p) => p.signals)));

  const filtered = selectedSignal
    ? properties.filter((p) => p.signals.includes(selectedSignal))
    : properties;

  return (
    <AppShell>
      <div className={styles.container}>
        {/* Header with KPI Strip */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>DealScope — Intelligent Portfolio Analysis</h1>
          </div>
          <div className={styles.kpiStrip}>
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonKpi}`} />
              ))
            ) : (
              <>
                <div className={styles.kpi}>
                  <div className={styles.kpiValue}>{hotCount}</div>
                  <div className={styles.kpiLabel}>🔥 Hot</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiValue}>{warmCount}</div>
                  <div className={styles.kpiLabel}>🟠 Warm</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiValue}>{watchCount}</div>
                  <div className={styles.kpiLabel}>🔵 Watch</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiValue}>{properties.length}</div>
                  <div className={styles.kpiLabel}>Total</div>
                </div>
              </>
            )}
          </div>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            <span>⚠ {error}</span>
            <button className={styles.retryBtn} onClick={loadProperties}>Retry</button>
          </div>
        )}

        <div className={styles.layout}>
          {/* Main Map Area */}
          <div className={styles.mapContainer}>
            <div className={styles.mapPlaceholder}>
              <p>📍 Map View — {loading ? "…" : `${filtered.length} properties`}</p>
            </div>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Filter Section */}
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Signals</h3>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: `${60 + i * 10}%` }} />
                  ))}
                </div>
              ) : (
                <div className={styles.filterOptions}>
                  <label className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedSignal === null}
                      onChange={() => setSelectedSignal(null)}
                    />
                    All ({properties.length})
                  </label>
                  {uniqueSignals.map((signal) => {
                    const count = properties.filter((p) => p.signals.includes(signal)).length;
                    return (
                      <label key={signal} className={styles.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedSignal === signal}
                          onChange={() => setSelectedSignal(selectedSignal === signal ? null : signal)}
                        />
                        {signal.replace(/_/g, " ")} ({count})
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Signal Feed */}
            <div className={styles.signalsFeed}>
              <h3 className={styles.signalsHeader}>Latest Signals</h3>
              <div className={styles.signalsList}>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={styles.skeletonSignalItem}>
                      <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: "45%" }} />
                      <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: "75%" }} />
                      <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: "60%" }} />
                    </div>
                  ))
                ) : (
                  filtered.slice(0, 5).map((prop) => (
                    <Link key={prop.id} href={`/dealscope/${prop.id}`}>
                      <div className={styles.signalItem}>
                        <div className={styles.signalTime}>
                          {new Date().toLocaleDateString()}
                        </div>
                        <div className={styles.signalTitle}>{prop.address}</div>
                        <div className={styles.signalAddress}>
                          {prop.assetType} • {prop.signals.join(", ") || "No signals"}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
