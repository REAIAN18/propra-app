import { Portfolio } from "@/lib/data/types";
import { AssetLoan } from "@/lib/data/financing";

export interface HealthScoreResult {
  overall: number;
  projected: number;
  insurance: number;
  energy: number;
  compliance: number;
  leases: number;
  financing: number;
}

export function computePortfolioHealthScore(
  portfolio: Portfolio,
  loans: AssetLoan[]
): HealthScoreResult {
  const totalInsuranceOverpay = portfolio.assets.reduce(
    (s, a) => s + (a.insurancePremium - a.marketInsurance),
    0
  );
  const totalEnergyOverpay = portfolio.assets.reduce(
    (s, a) => s + (a.energyCost - a.marketEnergyCost),
    0
  );
  const totalInsurancePremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalEnergyCost = portfolio.assets.reduce((s, a) => s + a.energyCost, 0);

  const allCerts = portfolio.assets.flatMap((a) => a.compliance);
  const totalCerts = allCerts.length;
  const validCerts = allCerts.filter((c) => c.status === "valid").length;

  const occupiedLeases = portfolio.assets.flatMap((a) =>
    a.leases.filter((l) => l.tenant !== "Vacant" && l.daysToExpiry > 0)
  );
  const waultNum = occupiedLeases.reduce((s, l) => s + l.sqft * l.daysToExpiry, 0);
  const waultDen = occupiedLeases.reduce((s, l) => s + l.sqft, 0);
  const waultYrs = waultDen > 0 ? waultNum / waultDen / 365 : 0;

  const stressedLoanCount = loans.filter(
    (l) => l.icr < l.icrCovenant || l.daysToMaturity <= 90
  ).length;

  const insurance = Math.round(
    Math.max(10, 100 - Math.min(90, (totalInsuranceOverpay / Math.max(1, totalInsurancePremium)) * 200))
  );
  const energy = Math.round(
    Math.max(10, 100 - Math.min(90, (totalEnergyOverpay / Math.max(1, totalEnergyCost)) * 200))
  );
  const compliance = totalCerts === 0 ? 100 : Math.round((validCerts / totalCerts) * 100);
  const leases = Math.round(Math.min(100, (waultYrs / 5) * 100));
  const financing =
    loans.length === 0
      ? 85
      : Math.round(Math.max(20, (1 - stressedLoanCount / loans.length) * 100));

  const overall = Math.round((insurance + energy + compliance + leases + financing) / 5);
  const projected = Math.round((95 + 95 + 95 + leases + Math.min(100, financing + 10)) / 5);

  return { overall, projected, insurance, energy, compliance, leases, financing };
}
