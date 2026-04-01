"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./search.module.css";

const SIGNALS = ["administration", "auction", "mees", "absent_owner", "dissolved", "probate"];
const ASSET_TYPES = ["industrial", "warehouse", "office", "retail", "flex", "mixed"];

export default function SearchPage() {
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filter state
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Load results
  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSignals.length > 0) params.append("signal", selectedSignals[0]);
        if (selectedTypes.length > 0) params.append("assetType", selectedTypes[0]);
        if (priceMin) params.append("priceMin", priceMin);
        if (priceMax) params.append("priceMax", priceMax);
        params.append("page", page.toString());

        const response = await fetch(`/api/scope/search?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };
    search();
  }, [selectedSignals, selectedTypes, priceMin, priceMax, page]);

  const toggleSignal = (signal: string) => {
    setSelectedSignals((prev) =>
      prev.includes(signal) ? prev.filter((s) => s !== signal) : [...prev, signal]
    );
    setPage(1);
  };

  const toggleAssetType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedSignals([]);
    setSelectedTypes([]);
    setPriceMin("");
    setPriceMax("");
    setPage(1);
  };

  return (
    <AppShell>
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Filters Sidebar */}
          <aside className={styles.sidebar}>
            <h2>Filters</h2>

            {/* Signals */}
            <div className={styles.filterGroup}>
              <h3>Signals</h3>
              {SIGNALS.map((signal) => (
                <label key={signal} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedSignals.includes(signal)}
                    onChange={() => toggleSignal(signal)}
                  />
                  <span>{signal.charAt(0).toUpperCase() + signal.slice(1).replace("_", " ")}</span>
                </label>
              ))}
            </div>

            {/* Asset Types */}
            <div className={styles.filterGroup}>
              <h3>Asset Type</h3>
              {ASSET_TYPES.map((type) => (
                <label key={type} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleAssetType(type)}
                  />
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </label>
              ))}
            </div>

            {/* Price Range */}
            <div className={styles.filterGroup}>
              <h3>Price Range</h3>
              <div className={styles.priceInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className={styles.priceInput}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className={styles.priceInput}
                />
              </div>
            </div>

            {/* Clear Button */}
            {(selectedSignals.length > 0 || selectedTypes.length > 0 || priceMin || priceMax) && (
              <button onClick={clearFilters} className={styles.clearButton}>
                Clear Filters
              </button>
            )}
          </aside>

          {/* Results */}
          <main className={styles.main}>
            <div className={styles.header}>
              <h1>Search Results</h1>
              <p>{total} properties found</p>
            </div>

            {loading && <div className={styles.loading}>Loading...</div>}

            {!loading && results.length === 0 && (
              <div className={styles.emptyState}>
                <p>No properties match your filters.</p>
                <button onClick={clearFilters} className={styles.clearButton}>
                  Clear Filters
                </button>
              </div>
            )}

            {results.map((property) => (
              <Link key={property.id} href={`/scope/property/${property.id}`}>
                <div className={styles.resultCard}>
                  <div className={styles.cardContent}>
                    <h3>{property.address}</h3>
                    <div className={styles.details}>
                      {property.assetType && <span>{property.assetType}</span>}
                      {property.sqft && <span>{property.sqft.toLocaleString()} sqft</span>}
                      {property.askingPrice && (
                        <span>
                          {property.currency} {property.askingPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.signals}>
                    {property.signalCount > 0 && (
                      <div className={styles.signalBadge}>{property.signalCount} signals</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {/* Pagination */}
            {total > 0 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
