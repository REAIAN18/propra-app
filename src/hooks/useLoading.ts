"use client";

import { useState, useEffect } from "react";

export function useLoading(duration = 500, resetKey?: string | number) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration, resetKey]);

  return loading;
}
