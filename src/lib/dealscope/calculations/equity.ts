import { Property } from '@/types/dealscope';
import { calculateCAPEX } from './capex';

export interface EquityMultipleResult {
  equityMultiple: number;
  totalCostIn: number;
  exitValue: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function calculateEquityMultiple(property: Property): EquityMultipleResult {
  const purchasePrice = property.askingPrice || 0;
  const sdlt = calculateSDLT(purchasePrice);
  const legalFees = 15000;
  const surveyFees = 8000;
  const capexResult = calculateCAPEX(property);

  const totalCostIn = purchasePrice + sdlt + legalFees + surveyFees + capexResult.capex;

  const erv = property.erv || property.passingRent || (property.size || 0) * 28;
  const opex = erv * 0.15;
  const noi = erv - opex;
  const exitYield = 0.08;
  const grossExitValue = noi / exitYield;

  const agentFees = grossExitValue * 0.015;
  const exitLegalFees = 10000;
  const netExitValue = grossExitValue - agentFees - exitLegalFees;

  const equityMultiple = totalCostIn > 0 ? netExitValue / totalCostIn : 0;

  const confidence = property.passingRent && property.passingRent > 0
    ? 'HIGH'
    : capexResult.confidence === 'LOW' ? 'LOW' : 'MEDIUM';

  return {
    equityMultiple,
    totalCostIn,
    exitValue: netExitValue,
    confidence,
  };
}

function calculateSDLT(price: number): number {
  if (price <= 150000) return 0;
  if (price <= 250000) return (price - 150000) * 0.02;
  return 2000 + (price - 250000) * 0.05;
}
