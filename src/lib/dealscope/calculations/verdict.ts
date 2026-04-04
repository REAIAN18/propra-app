import { Property } from '@/types/dealscope';
import { calculateIRR } from './irr';
import { calculateEquityMultiple } from './equity';

export type VerdictType = 'PROCEED' | 'CONDITIONAL' | 'REJECT';

export interface VerdictResult {
  verdict: VerdictType;
  dealScore: number;
  reasons: string[];
  conditions?: string[];
  targetPrice?: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function calculateVerdict(property: Property): VerdictResult {
  const irrResult = calculateIRR(property);
  const equityResult = calculateEquityMultiple(property);

  const irr = irrResult.irr;
  const equityMultiple = equityResult.equityMultiple;

  const reasons: string[] = [];
  const conditions: string[] = [];
  let dealScore = 0;

  if (irr >= 0.15) {
    dealScore += 40;
    reasons.push(`Strong IRR of ${(irr * 100).toFixed(1)}%`);
  } else if (irr >= 0.10) {
    dealScore += 30;
    reasons.push(`Good IRR of ${(irr * 100).toFixed(1)}%`);
  } else if (irr >= 0.07) {
    dealScore += 20;
    reasons.push(`Acceptable IRR of ${(irr * 100).toFixed(1)}%`);
  } else if (irr >= 0.05) {
    dealScore += 10;
    reasons.push(`Marginal IRR of ${(irr * 100).toFixed(1)}%`);
  } else {
    reasons.push(`Poor IRR of ${(irr * 100).toFixed(1)}%`);
  }

  if (equityMultiple >= 2.0) {
    dealScore += 30;
    reasons.push(`Excellent equity multiple of ${equityMultiple.toFixed(2)}x`);
  } else if (equityMultiple >= 1.5) {
    dealScore += 20;
    reasons.push(`Good equity multiple of ${equityMultiple.toFixed(2)}x`);
  } else if (equityMultiple >= 1.2) {
    dealScore += 10;
    reasons.push(`Acceptable equity multiple of ${equityMultiple.toFixed(2)}x`);
  } else {
    reasons.push(`Weak equity multiple of ${equityMultiple.toFixed(2)}x`);
  }

  const isVacant = !property.passingRent || property.passingRent === 0;
  if (!isVacant) {
    dealScore += 20;
    reasons.push('Property income-producing');
  } else {
    dealScore += 5;
    reasons.push('Property 100% vacant');
    conditions.push('Secure tenant before completion');
  }

  if (irrResult.confidence === 'HIGH') dealScore += 10;
  else if (irrResult.confidence === 'MEDIUM') dealScore += 5;

  let verdict: VerdictType;
  if (dealScore >= 70) {
    verdict = 'PROCEED';
  } else if (dealScore >= 40) {
    verdict = 'CONDITIONAL';
    if (irr < 0.10) {
      const targetPrice = calculateTargetPrice(property, 0.10);
      conditions.push(`Negotiate price to £${Math.round(targetPrice).toLocaleString()} for 10% IRR`);
    }
    if (isVacant) conditions.push('Pre-let to credit tenant');
  } else {
    verdict = 'REJECT';
    reasons.push('Returns insufficient even at reduced price');
  }

  return {
    verdict,
    dealScore,
    reasons,
    conditions: conditions.length > 0 ? conditions : undefined,
    targetPrice: calculateTargetPrice(property, 0.10),
    confidence: irrResult.confidence,
  };
}

function calculateTargetPrice(property: Property, targetIRR: number): number {
  const currentPrice = property.askingPrice || 0;
  const irrResult = calculateIRR(property);
  const currentIRR = irrResult.irr;

  if (currentIRR >= targetIRR) return currentPrice;

  const priceReduction = (targetIRR - currentIRR) * currentPrice * 10;
  return Math.max(currentPrice - priceReduction, currentPrice * 0.7);
}
