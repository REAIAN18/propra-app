import { Property } from '@/types/dealscope';

export interface CAPEXResult {
  capex: number;
  reason: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function calculateCAPEX(property: Property): CAPEXResult {
  const description = property.description || '';
  const refurbPatterns = [
    /refurbished\s+(?:in\s+)?(\d{4})/i,
    /refurb[^\d]*(\d{4})/i,
    /completed\s+(?:in\s+)?(\d{4})/i,
    /renovated\s+(?:in\s+)?(\d{4})/i,
  ];

  let refurbYear: number | null = null;
  for (const pattern of refurbPatterns) {
    const match = description.match(pattern);
    if (match) {
      refurbYear = parseInt(match[1]);
      break;
    }
  }

  const currentYear = new Date().getFullYear();

  if (refurbYear && (currentYear - refurbYear) <= 5) {
    return {
      capex: 0,
      reason: `Property refurbished in ${refurbYear} (${currentYear - refurbYear} years ago)`,
      confidence: 'HIGH',
    };
  }

  const ageInYears = currentYear - (property.builtYear || 1980);

  let capexPSF = 0;
  let reason = '';

  if (ageInYears > 40) {
    capexPSF = 75;
    reason = `Property ${ageInYears} years old, likely needs major refurb`;
  } else if (ageInYears > 25) {
    capexPSF = 55;
    reason = `Property ${ageInYears} years old, needs significant upgrades`;
  } else if (ageInYears > 15) {
    capexPSF = 35;
    reason = `Property ${ageInYears} years old, needs moderate refurb`;
  } else {
    capexPSF = 15;
    reason = `Property ${ageInYears} years old, minor works only`;
  }

  const capex = (property.size || 0) * capexPSF;

  return {
    capex,
    reason,
    confidence: refurbYear ? 'HIGH' : 'MEDIUM',
  };
}
