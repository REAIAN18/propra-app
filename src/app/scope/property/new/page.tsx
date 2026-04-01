"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

const STEPS = [
  "Reading listing page",
  "Extracting property details",
  "Looking up EPC rating",
  "Checking Land Registry",
  "Searching Companies House",
  "Checking planning history",
  "Generating satellite view",
  "Running valuations",
  "Building dossier",
];

function EnrichContent() {
  const params = useSearchParams();
  const router = useRouter();
  const url = params.get("url") || "";
  const address = params.get("address") || "";

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedAddress, setExtractedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!url && !address) return;

    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 800);

    const run = async () => {
      try {
        let enrichAddress = address;

        // Step 1: If URL provided, extract address first
        if (url) {
          const extractRes = await fetch("/api/scope/extract-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });

          if (!extractRes.ok) {
            const err = await extractRes.json();
            setError(err.error || "Couldn't extract address from this URL. Try pasting the address directly.");
            clearInterval(interval);
            return;
          }

          const extracted = await extractRes.json();
          enrichAddress = extracted.address;
          setExtractedAddress(extracted.address);
        }

        // Step 2: Run enrichment
        const enrichRes = await fetch("/api/scope/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: enrichAddress,
            url: url || undefined,
          }),
        });

        if (!enrichRes.ok) {
          const err = await enrichRes.json();
          setError(err.error || "Enrichment failed. Please try again.");
          clearInterval(interval);
          return;
        }

        const result = await enrichRes.json();
        clearInterval(interval);

        // Step 3: Redirect to dossier
        if (result.id) {
          router.push(`/scope/property/${result.id}`);
        } else {
          setError("No property ID returned. Please try again.");
        }
      } catch (err) {
        console.error("Enrichment error:", err);
        setError("Something went wrong. Please try again.");
        clearInterval(interval);
      }
    };

    run();
    return () => clearInterval(interval);
  }, [url, address, router]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(234,176,32,.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>☕</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 8 }}>Couldn&apos;t analyse this one</div>
        <div style={{ fontSize: 13, color: "var(--tx2)", maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>{error}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={() => router.push("/scope")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--acc)", color: "#fff", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Try a different search</button>
          <button onClick={() => { setError(null); setStep(0); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--s3)", background: "var(--s2)", color: "var(--tx2)", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(124,106,240,.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, animation: "breathe 3s ease infinite" }}>🔍</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 6 }}>Pulling the latest data</div>
      {extractedAddress && (
        <div style={{ fontSize: 14, color: "var(--tx)", marginBottom: 8 }}>{extractedAddress}</div>
      )}
      <div style={{ fontSize: 13, color: "var(--tx2)", maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>
        Gathering intelligence from multiple sources. The dossier will be ready in a moment.
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < step ? "var(--grn)" : i === step ? "var(--acc)" : "var(--s3)", transition: "background .3s", animation: i === step ? "pulse 1s infinite" : "none" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--tx3)" }}>
        {STEPS[step]}... ({step + 1} of {STEPS.length})
      </div>
      <style>{`
        @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  );
}

export default function NewPropertyPage() {
  return (
    <AppShell>
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--tx3)" }}>Loading...</div>}>
        <EnrichContent />
      </Suspense>
    </AppShell>
  );
}
