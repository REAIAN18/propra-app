"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import styles from "./scope.module.css";

interface SourceCount {
  source: string;
  count: number;
  icon: string;
}

export default function ScopePage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<SourceCount[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sourcesRes = await fetch("/api/scope/sources");
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          setSources(sourcesData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, []);

  const handleInputSubmit = useCallback(async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);

    try {
      const postcodePattern = /[A-Z]{1,2}\d/i;
      if (postcodePattern.test(inputValue) || inputValue.includes(",")) {
        router.push(`/scope/address?q=${encodeURIComponent(inputValue)}`);
        return;
      }

      if (inputValue.includes("http")) {
        const response = await fetch("/api/scope/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: inputValue }),
        });
        if (response.ok) {
          const data = await response.json();
          router.push(`/scope/property/${data.id}`);
        }
        return;
      }

      router.push(`/scope/search?q=${encodeURIComponent(inputValue)}`);
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  }, [inputValue, router]);

  const handlePDFDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === "application/pdf") {
        const formData = new FormData();
        formData.append("file", files[0]);
        setIsLoading(true);
        fetch("/api/scope/pdf-extract", { method: "POST", body: formData })
          .then((res) => res.json())
          .then((data) => {
            if (data.address)
              router.push(`/scope/address?q=${encodeURIComponent(data.address)}`);
            else if (data.propertyId)
              router.push(`/scope/property/${data.propertyId}`);
          })
          .catch(console.error)
          .finally(() => setIsLoading(false));
      }
    },
    [router]
  );

  return (
    <AppShell>
      <TopBar />
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>DealScope</h1>
          <p className={styles.subtitle}>Intelligent property acquisition discovery</p>
        </header>

        <section className={styles.inputSection}>
          <div
            className={styles.inputBox}
            onDrop={handlePDFDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add(styles.dragover);
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove(styles.dragover)}
          >
            <input
              type="text"
              placeholder="Enter address, company, postcode, or drop PDF…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
              className={styles.input}
              disabled={isLoading}
            />
            <button
              onClick={handleInputSubmit}
              disabled={isLoading}
              className={styles.analyzeBtn}
            >
              {isLoading ? "Loading…" : "Analyze"}
            </button>
          </div>
          <p className={styles.inputHint}>
            Drag & drop a PDF, paste an address, company name, or URL
          </p>
        </section>

        {!dataLoading && sources.length > 0 && (
          <section className={styles.sourcesSection}>
            <h2 className={styles.sectionTitle}>Signal Sources</h2>
            <div className={styles.sourceGrid}>
              {sources.map((source) => (
                <button
                  key={source.source}
                  className={styles.sourceCard}
                  onClick={() => router.push(`/scope/search?source=${source.source}`)}
                >
                  <span className={styles.sourceIcon}>{source.icon}</span>
                  <span className={styles.sourceCount}>{source.count}</span>
                  <span className={styles.sourceName}>{source.source}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
