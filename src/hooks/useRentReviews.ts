import { useState, useEffect } from "react";

export type RentReview = {
  id: string;
  tenantName: string;
  propertyAddress: string;
  assetId: string | null;
  leaseId: string | null;
  expiryDate: Date;
  daysToExpiry: number;
  breakDate: Date | null;
  passingRent: number;
  sqft?: number;
  ervLive: number | null;
  gap: number | null;
  leverageScore: number | null;
  leverageExplanation: string | null;
  horizon: string | null;
  status: string;
  urgency: "urgent" | "soon" | "monitor";
  draftGeneratedAt: Date | null;
};

export type RentReviewsResponse = {
  reviews: RentReview[];
  totalGapGbp: number;
};

export function useRentReviews(statusFilter?: string) {
  const [data, setData] = useState<RentReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      setError(null);
      try {
        const url = statusFilter
          ? `/api/user/rent-reviews?status=${statusFilter}`
          : "/api/user/rent-reviews";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch rent reviews");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [statusFilter]);

  return {
    reviews: data?.reviews ?? [],
    totalGapGbp: data?.totalGapGbp ?? 0,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
      const url = statusFilter
        ? `/api/user/rent-reviews?status=${statusFilter}`
        : "/api/user/rent-reviews";
      fetch(url)
        .then(res => res.json())
        .then(json => setData(json))
        .catch(err => setError(err instanceof Error ? err.message : "Unknown error"))
        .finally(() => setLoading(false));
    }
  };
}
