export interface InsuranceRiskFactor {
  factor: string;
  score: number;       // 0–10 (10 = best/lowest risk)
  benchmark: number;   // 0–10 (market average for this asset type)
  status: "good" | "amber" | "red";
  impact: string;
}

export interface InsuranceRoadmapAction {
  id: string;
  action: string;
  why: string;
  costLow: number;
  costHigh: number;
  savingPct: number;
  annualSaving: number;
  paybackYears: number;
  status: "recommended" | "in_progress" | "done" | "skipped";
  ctaType: "work_order" | "decision_only" | "third_party" | "time_based";
  ctaLabel: string;
  workOrderCategory?: string;
}
