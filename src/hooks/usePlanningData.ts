"use client";

import { useState, useEffect } from "react";
import type { AssetPlanningData } from "@/app/api/user/planning/route";

export function usePlanningData() {
  const [assets, setAssets] = useState<AssetPlanningData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/planning")
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((data) => { setAssets(data.assets ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { assets, loading };
}
