"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./scope.module.css";

export default function ScopePage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // In demo mode, no authentication required
        // Load default empty state
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/scope/search?q=${encodeURIComponent(searchInput)}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.results || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1>DealScope</h1>
          <p>Acquisition intelligence for UK commercial property</p>
        </header>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Paste address, postcode, URL, or PDF"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Source Cards */}
        <div className={styles.sourceCards}>
          <h2>By Signal</h2>
          <div className={styles.cardGrid}>
            {["Administration", "Auction", "MEES", "Absent Owner", "Dissolved", "Probate"].map((signal) => (
              <Link key={signal} href={`/scope/search?signal=${signal.toLowerCase().replace(" ", "_")}`}>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>{signal}</div>
                  <div className={styles.cardCount}>0</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Results */}
        {properties.length > 0 && (
          <div className={styles.results}>
            <h2>Results ({properties.length})</h2>
            {properties.map((prop) => (
              <Link key={prop.id} href={`/scope/property/${prop.id}`}>
                <div className={styles.resultCard}>
                  <div className={styles.resultAddress}>{prop.address}</div>
                  <div className={styles.resultDetails}>
                    {prop.assetType} • {prop.sqft?.toLocaleString()} sqft • £{prop.askingPrice?.toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {properties.length === 0 && (
          <div className={styles.emptyState}>
            <p>Paste an address above to analyze a property, or browse by signal.</p>
            <p>Use demo mode to explore without signing in.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
