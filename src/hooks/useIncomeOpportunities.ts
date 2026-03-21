"use client";

import { useState, useEffect } from "react";
import type { AssetIncomeOpportunities } from "@/app/api/user/income-opportunities/route";

export function useIncomeOpportunities() {
  const [assets, setAssets] = useState<AssetIncomeOpportunities[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/income-opportunities")
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((data) => { setAssets(data.assets ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { assets, loading };
}
