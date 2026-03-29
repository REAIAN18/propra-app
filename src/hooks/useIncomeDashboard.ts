"use client";

import { useState, useEffect } from "react";
import type { IncomeDashboardData } from "@/app/api/user/income-dashboard/route";

export function useIncomeDashboard() {
  const [data, setData] = useState<IncomeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/income-dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}
