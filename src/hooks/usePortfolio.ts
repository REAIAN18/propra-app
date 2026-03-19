"use client";

import { useState, useEffect } from "react";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio } from "@/lib/data/types";

const STATIC_PORTFOLIOS: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

/**
 * Resolves the active portfolio — static or custom (fetched from DB).
 * Returns { portfolio, loading } where loading is true while a custom
 * portfolio is being fetched.
 */
export function usePortfolio(portfolioId: string): { portfolio: Portfolio; loading: boolean } {
  const [customPortfolio, setCustomPortfolio] = useState<Portfolio | null>(null);
  const [customLoading, setCustomLoading] = useState(false);

  useEffect(() => {
    if (STATIC_PORTFOLIOS[portfolioId]) {
      setCustomPortfolio(null);
      return;
    }
    setCustomLoading(true);
    fetch(`/api/portfolios/${portfolioId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setCustomPortfolio(data); setCustomLoading(false); })
      .catch(() => setCustomLoading(false));
  }, [portfolioId]);

  return {
    portfolio: STATIC_PORTFOLIOS[portfolioId] ?? customPortfolio ?? flMixed,
    loading: customLoading,
  };
}
