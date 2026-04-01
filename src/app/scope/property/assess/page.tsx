"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./assess.module.css";

type AssessResult = {
  id: string;
  address: string;
  assetType: string;
  sourceTag: string;
  guidePrice: number | null;
  epcRating: string | null;
  score: number;
  confidence: string;
  signals: Array<{ name: string; type: string }>;
  images: string[];
  satelliteUrl: string | null;
  streetViewUrl: string | null;
  geocode: { lat: number; lng: number } | null;
  features: string[];
  auctionDate: string | null;
  lotNumber: string | null;
  agentName: string | null;
  status: string;
};

export default function AssessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<AssessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const runAssessment = useCallback(async () => {
    const address = searchParams.get("address");
    const url = searchParams.get("url");
    const docId = searchParams.get("docId");

    if (!address && !url) {
      setError("No address or URL provided");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/dealscope/quick-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(address ? { address } : {}),
          ...(url ? { url } : {}),
          ...(docId ? { docId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Assessment failed");
        setLoading(false);
        return;
      }

      const data: AssessResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Assessment error:", err);
      setError("Assessment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    runAssessment();
  }, [runAssessment]);

  const handleAnalyse = async () => {
    if (!result) return;
    setAnalysing(true);
    try {
      const res = await fetch("/api/dealscope/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: result.id,
          address: result.address,
          ...(result.sourceTag !== "Manual enrichment" ? { url: undefined } : {}),
        }),
      });

      if (!res.ok) {
        alert("Full analysis failed. Please try again.");
        setAnalysing(false);
        return;
      }

      const data = await res.json();
      router.push(`/scope/property/${data.id}`);
    } catch (err) {
      console.error("Enrich error:", err);
      alert("Analysis failed. Please try again.");
      setAnalysing(false);
    }
  };

  const fmtPrice = (n: number) => {
    if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
    return `£${n.toLocaleString()}`;
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "var(--grn)";
    if (score >= 40) return "var(--amb)";
    return "var(--red)";
  };

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <Link href="/scope" className={styles.back}>← Back to DealScope</Link>
          <h1 className={styles.title}>Quick Assessment</h1>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Assessing property...</p>
            <p className={styles.loadingHint}>Scraping listing, geocoding, checking EPC register</p>
          </div>
        )}

        {error && !loading && (
          <div className={styles.errorState}>
            <p className={styles.errorText}>{error}</p>
            <Link href="/scope" className={styles.errorLink}>← Try another search</Link>
          </div>
        )}

        {result && !loading && (
          <div className={styles.card}>
            {/* IMAGE */}
            {result.images.length > 0 && (
              <div className={styles.imageWrap}>
                <img src={result.images[0]} alt={result.address} className={styles.heroImage} />
                {result.images.length > 1 && (
                  <div className={styles.thumbStrip}>
                    {result.images.slice(1, 4).map((img, i) => (
                      <img key={i} src={img} alt="" className={styles.thumb} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MAIN CONTENT */}
            <div className={styles.body}>
              <div className={styles.topRow}>
                <div className={styles.addressBlock}>
                  <h2 className={styles.address}>{result.address}</h2>
                  <div className={styles.tags}>
                    <span className={styles.tag}>{result.assetType}</span>
                    <span className={styles.tag} data-type={result.sourceTag === "Auction" ? "auction" : "source"}>
                      {result.sourceTag}
                    </span>
                    {result.epcRating && (
                      <span className={styles.tag} data-type="epc">EPC {result.epcRating}</span>
                    )}
                  </div>
                </div>
                <div className={styles.scoreRing} style={{ borderColor: scoreColor(result.score) }}>
                  <span className={styles.scoreNum} style={{ color: scoreColor(result.score) }}>
                    {result.score}
                  </span>
                  <span className={styles.scoreLabel}>score</span>
                </div>
              </div>

              {/* KEY FACTS */}
              <div className={styles.facts}>
                {result.guidePrice && (
                  <div className={styles.fact}>
                    <span className={styles.factLabel}>Guide Price</span>
                    <span className={styles.factValue}>{fmtPrice(result.guidePrice)}</span>
                  </div>
                )}
                {result.auctionDate && (
                  <div className={styles.fact}>
                    <span className={styles.factLabel}>Auction Date</span>
                    <span className={styles.factValue}>{result.auctionDate}</span>
                  </div>
                )}
                {result.lotNumber && (
                  <div className={styles.fact}>
                    <span className={styles.factLabel}>Lot</span>
                    <span className={styles.factValue}>#{result.lotNumber}</span>
                  </div>
                )}
                {result.agentName && (
                  <div className={styles.fact}>
                    <span className={styles.factLabel}>Agent</span>
                    <span className={styles.factValue}>{result.agentName}</span>
                  </div>
                )}
                <div className={styles.fact}>
                  <span className={styles.factLabel}>Confidence</span>
                  <span className={styles.factValue}>{result.confidence}</span>
                </div>
              </div>

              {/* SIGNALS */}
              {result.signals.length > 0 && (
                <div className={styles.signals}>
                  <span className={styles.signalsLabel}>Signals</span>
                  <div className={styles.signalList}>
                    {result.signals.map((sig, i) => (
                      <span key={i} className={styles.signal} data-type={sig.type}>
                        {sig.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* FEATURES */}
              {result.features.length > 0 && (
                <div className={styles.features}>
                  <span className={styles.featuresLabel}>Key Features</span>
                  <ul className={styles.featureList}>
                    {result.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div className={styles.cta}>
                <button
                  onClick={handleAnalyse}
                  disabled={analysing}
                  className={styles.analyseBtn}
                >
                  {analysing ? (
                    <>
                      <span className={styles.btnSpinner} />
                      Running full analysis...
                    </>
                  ) : (
                    "Analyse →"
                  )}
                </button>
                <p className={styles.ctaHint}>
                  Full analysis runs AI extraction, valuations, comps, planning, flood risk, hold-sell scenarios
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
