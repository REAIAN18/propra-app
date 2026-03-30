/**
 * DealScope Property Scoring Engine
 * Scores properties based on signal strength, confidence levels, and opportunity signals
 *
 * Signal framework from DEALSCOPE-SPEC.md:
 * - 1 signal = low confidence (grey)
 * - 3+ signals = high confidence (red)
 * - Ranked by signal count
 */

export interface PropertySignal {
  type: 'distress' | 'opportunity' | 'ownership' | 'planning' | 'infrastructure' | 'valuation';
  name: string;
  weight: number; // 1-10
  confidence: number; // 0-100
  source: string;
}

export interface PropertyScore {
  totalScore: number; // 0-100
  signalCount: number;
  confidenceLevel: 'high' | 'medium' | 'low'; // red | yellow | grey
  confidence: number; // 0-100
  signals: PropertySignal[];
  opportunity: {
    type: string; // distressed, mismatch, planning, infrastructure, other
    rank: number; // position in ranking
    summary: string;
  };
  actionable: boolean; // Should this be approached?
}

/**
 * Score a property based on collected signals
 */
export function scoreProperty(signals: PropertySignal[]): PropertyScore {
  if (!signals.length) {
    return {
      totalScore: 0,
      signalCount: 0,
      confidenceLevel: 'low',
      confidence: 0,
      signals: [],
      opportunity: {
        type: 'none',
        rank: 999,
        summary: 'No signals detected',
      },
      actionable: false,
    };
  }

  // Calculate weighted score
  const signalWeights = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const maxPossibleWeight = signals.length * 10;
  const weightedScore = Math.round((signalWeights / maxPossibleWeight) * 100);

  // Calculate confidence based on signal count and quality
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
  const confidenceBonus = Math.min(20, signals.length * 5); // +5 for each signal, max +20
  const totalConfidence = Math.min(100, Math.round(avgConfidence + confidenceBonus));

  // Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low';
  if (signals.length >= 3 && totalConfidence >= 70) {
    confidenceLevel = 'high'; // red
  } else if (signals.length >= 2 || totalConfidence >= 50) {
    confidenceLevel = 'medium'; // yellow
  } else {
    confidenceLevel = 'low'; // grey
  }

  // Identify primary opportunity type
  const distressSignals = signals.filter((s) => s.type === 'distress');
  const opportunitySignals = signals.filter((s) => s.type === 'opportunity');
  const planningSignals = signals.filter((s) => s.type === 'planning');
  const infrastructureSignals = signals.filter((s) => s.type === 'infrastructure');

  let opportunityType = 'other';
  let summary = 'Mixed opportunity signals';

  if (distressSignals.length > 0) {
    opportunityType = 'distressed';
    summary = `Distressed property: ${distressSignals.map((s) => s.name).join(', ')}`;
  } else if (opportunitySignals.length > 0) {
    opportunityType = 'mismatch';
    summary = `Market mismatch: ${opportunitySignals.map((s) => s.name).join(', ')}`;
  } else if (planningSignals.length > 0) {
    opportunityType = 'planning';
    summary = `Planning potential: ${planningSignals.map((s) => s.name).join(', ')}`;
  } else if (infrastructureSignals.length > 0) {
    opportunityType = 'infrastructure';
    summary = `Infrastructure upside: ${infrastructureSignals.map((s) => s.name).join(', ')}`;
  }

  // Determine if actionable
  const actionable = confidenceLevel !== 'low' && signals.length >= 2;

  return {
    totalScore: weightedScore,
    signalCount: signals.length,
    confidenceLevel,
    confidence: totalConfidence,
    signals,
    opportunity: {
      type: opportunityType,
      rank: Math.max(0, 100 - weightedScore), // Lower rank = better (0 is best)
      summary,
    },
    actionable,
  };
}

/**
 * Create signal from EPC data
 */
export function epcSignal(epcRating?: string): PropertySignal | null {
  if (!epcRating) return null;

  const ratingNum = epcRating.charCodeAt(0);
  const fNum = 'F'.charCodeAt(0);

  if (ratingNum >= fNum) {
    return {
      type: 'opportunity',
      name: `MEES non-compliant (${epcRating} rating)`,
      weight: 8,
      confidence: 95, // EPC data is highly reliable
      source: 'EPC register',
    };
  }

  if (ratingNum >= 'D'.charCodeAt(0)) {
    return {
      type: 'opportunity',
      name: `Poor energy rating (${epcRating})`,
      weight: 4,
      confidence: 95,
      source: 'EPC register',
    };
  }

  return null;
}

/**
 * Create signal from company distress data
 */
export function companyDistressSignal(
  status?: string,
  insolventCases?: number,
  chargesCount?: number
): PropertySignal[] {
  const signals: PropertySignal[] = [];

  if (status === 'dissolved') {
    signals.push({
      type: 'distress',
      name: 'Company dissolved',
      weight: 9,
      confidence: 100,
      source: 'Companies House',
    });
  } else if (status === 'administration') {
    signals.push({
      type: 'distress',
      name: 'Company in administration',
      weight: 8,
      confidence: 100,
      source: 'Companies House',
    });
  } else if (status === 'liquidation') {
    signals.push({
      type: 'distress',
      name: 'Company in liquidation',
      weight: 8,
      confidence: 100,
      source: 'Companies House',
    });
  } else if (status && status !== 'active') {
    signals.push({
      type: 'distress',
      name: `Company status: ${status}`,
      weight: 5,
      confidence: 95,
      source: 'Companies House',
    });
  }

  if ((insolventCases || 0) > 0) {
    signals.push({
      type: 'distress',
      name: `${insolventCases} insolvency case(s)`,
      weight: 9,
      confidence: 100,
      source: 'Companies House Insolvency Register',
    });
  }

  if ((chargesCount || 0) > 0) {
    signals.push({
      type: 'distress',
      name: `${chargesCount} charge(s) on assets`,
      weight: 6,
      confidence: 98,
      source: 'Companies House',
    });

    // Check for non-bank lenders (bridging/mezzanine = higher risk)
    if ((chargesCount || 0) > 2) {
      signals.push({
        type: 'distress',
        name: 'Multiple asset charges (likely bridging/mezzanine)',
        weight: 7,
        confidence: 75, // Inferred, not 100% certain
        source: 'Companies House',
      });
    }
  }

  return signals;
}

/**
 * Create signal from gazette insolvency notices
 */
export function gazetteDistressSignal(
  noticeType?: string,
  noticeCount?: number
): PropertySignal | null {
  if (!noticeType || !noticeCount) return null;

  const weights: Record<string, number> = {
    'Winding-up': 9,
    'Administration': 8,
    'Receivership': 8,
    'CVA': 5,
    'Petition': 7,
    'Strike-off': 6,
    'Default': 3,
  };

  const weight = weights[noticeType] || weights['Default'];

  return {
    type: 'distress',
    name: `${noticeCount} ${noticeType} notice(s) in Gazette`,
    weight,
    confidence: 98,
    source: 'London Gazette',
  };
}

/**
 * Create signal from comparable sales data
 */
export function compsSignal(
  compsCount?: number,
  priceRange?: { low: number; high: number }
): PropertySignal | null {
  if (!compsCount || compsCount === 0) return null;

  const confidence = Math.min(100, 50 + compsCount * 15); // More comps = higher confidence
  const weight = Math.min(8, 3 + compsCount); // More comps = higher weight

  return {
    type: 'valuation',
    name: `${compsCount} comparable sales in area`,
    weight,
    confidence,
    source: 'Land Registry Price Paid',
  };
}

/**
 * Create signal from planning data
 */
export function planningSignal(signal: string): PropertySignal {
  const weights: Record<string, number> = {
    'listed-building': 7,
    'conversion-potential': 6,
    'adjacent-applications': 5,
    'planning-history': 4,
  };

  return {
    type: 'planning',
    name: signal,
    weight: weights[signal] || 5,
    confidence: 85,
    source: 'Planning data / Historic England',
  };
}

/**
 * Format score for display
 */
export function formatScore(score: PropertyScore): {
  badge: string;
  color: string;
  confidence: string;
} {
  const colors: Record<string, string> = {
    high: 'red', // High opportunity
    medium: 'yellow', // Medium opportunity
    low: 'grey', // Low confidence
  };

  const confidenceLabels: Record<string, string> = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
  };

  return {
    badge: `${score.totalScore}%`,
    color: colors[score.confidenceLevel],
    confidence: `${confidenceLabels[score.confidenceLevel]} (${score.signalCount} signals)`,
  };
}
