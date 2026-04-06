"use client";

import { useState, useEffect } from "react";
import type { IncomeDashboardData } from "@/app/api/user/income-dashboard/route";

export function useIncomeDashboard() {
  const [data, setData] = useState<IncomeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/user/income-dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
