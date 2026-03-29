"use client";

import { useState, useEffect } from "react";

export type RentReview = {
  id: string;
  tenantName: string;
  propertyAddress: string;
  assetId: string | null;
  leaseId: string;
  expiryDate: string;
  daysToExpiry: number;
  breakDate: string | null;
  passingRent: number;
  ervLive: number | null;
  gap: number | null;
  leverageScore: number | null;
  leverageExplanation: string | null;
  horizon: string;
  status: string;
  urgency: "urgent" | "soon" | "monitor";
  draftGeneratedAt: string | null;
};

export type RentReviewsResponse = {
  reviews: RentReview[];
  totalGapGbp: number;
};

export function useRentReviews() {
  const [reviews, setReviews] = useState<RentReview[]>([]);
  const [totalGapGbp, setTotalGapGbp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/rent-reviews")
      .then((r) => (r.ok ? r.json() : { reviews: [], totalGapGbp: 0 }))
      .then((data: RentReviewsResponse) => {
        setReviews(data.reviews ?? []);
        setTotalGapGbp(data.totalGapGbp ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { reviews, totalGapGbp, loading };
}
