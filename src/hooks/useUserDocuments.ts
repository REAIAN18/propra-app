"use client";

import { useState, useEffect } from "react";

interface ExtractedData {
  documentType?: string;
  summary?: string;
  keyData?: Record<string, unknown>;
  opportunities?: string[];
  alerts?: string[];
}

interface UserDocument {
  id: string;
  filename: string;
  documentType: string | null;
  summary: string | null;
  extractedData: ExtractedData | null;
  status: string;
  createdAt: string;
}

interface UserDocuments {
  insurance: UserDocument | null;
  energy: UserDocument | null;
  lease: UserDocument | null;
  compliance: UserDocument | null;
  documents: UserDocument[];
}

let cache: UserDocuments | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export function useUserDocuments() {
  const [data, setData] = useState<UserDocuments | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      setData(cache);
      setLoading(false);
      return;
    }

    fetch("/api/user/documents")
      .then((r) => r.json())
      .then((d) => {
        cache = d;
        cacheTime = Date.now();
        setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
