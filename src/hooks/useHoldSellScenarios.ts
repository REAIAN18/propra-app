"use client";

import { useState, useEffect } from "react";

export interface HoldSellScenarioResult {
  assetId: string;
  assetName: string;
  assetType: string;
  location: string;
  dataNeeded: boolean;
  holdIRR: number | null;
  sellPrice: number | null;
  sellIRR: number | null;
  recommendation: "hold" | "sell" | "review" | "strong_hold" | "needs_review" | null;
  rationale: string | null;
  estimatedValue?: number;
  // Wave 2 DCF fields
  holdNPV?: number | null;
  sellNPV?: number | null;
  holdEquityMultiple?: number | null;
  sellEquityMultiple?: number | null;
  confidenceScore?: number | null;
  lastCalculatedAt?: string | null;
}

export function useHoldSellScenarios(): {
  scenarios: HoldSellScenarioResult[];
  loading: boolean;
  error: boolean;
} {
  const [scenarios, setScenarios] = useState<HoldSellScenarioResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/user/hold-sell-scenarios")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setScenarios(data.scenarios ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return { scenarios, loading, error };
}
