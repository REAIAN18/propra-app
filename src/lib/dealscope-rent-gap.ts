import type { PropertyEnrichmentData } from './dealscope-types'

export interface RentGapAnalysis {
  current_rent_psf: number
  market_rent_psf: number
  gap_amount_psf: number
  gap_percentage: number
  gap_direction: 'over-rented' | 'under-rented' | 'market-rate'
  classification: 'condition-driven' | 'market-driven' | 'uncertain'
  condition_indicators: {
    epc_rating: string | null
    building_age_years: number | null
    occupancy_rate: number | null
    tenant_strength: string | null
  }
  confidence_score: number
  explanation: string
}

/**
 * Analyze rent gap: current vs market rate
 * Determine if gap is condition-driven or market-driven based on property characteristics
 */
export async function analyzeRentGap(
  address: string,
  current_rent_monthly: number,
  market_rent_monthly: number,
  propertyData?: Partial<PropertyEnrichmentData>
): Promise<RentGapAnalysis> {
  // Estimate property size (typical UK residential: 60-100 sqft per month rent)
  // This is a rough estimate - ideally would come from property data
  const estimatedSqft = Math.max(500, Math.floor(current_rent_monthly * 0.75))

  const current_rent_psf = current_rent_monthly / estimatedSqft
  const market_rent_psf = market_rent_monthly / estimatedSqft
  const gap_amount_psf = current_rent_psf - market_rent_psf
  const gap_percentage = (gap_amount_psf / market_rent_psf) * 100

  // Determine gap direction
  let gap_direction: 'over-rented' | 'under-rented' | 'market-rate'
  if (Math.abs(gap_percentage) < 5) {
    gap_direction = 'market-rate'
  } else if (gap_percentage > 0) {
    gap_direction = 'over-rented'
  } else {
    gap_direction = 'under-rented'
  }

  // Extract condition indicators from enrichment data
  const epc_rating = propertyData?.epc_rating || null
  const building_age_years = propertyData?.building_age_years || null
  const occupancy_rate = propertyData?.occupancy_rate || null
  const tenant_strength = propertyData?.tenant_strength || null

  // Classify gap as condition-driven or market-driven
  const { classification, confidence_score } = classifyGapDriver(
    {
      epc_rating,
      building_age_years,
      occupancy_rate,
      tenant_strength,
    },
    gap_percentage,
    gap_direction
  )

  const explanation = generateExplanation(
    gap_direction,
    gap_percentage,
    classification,
    { epc_rating, building_age_years, occupancy_rate, tenant_strength }
  )

  return {
    current_rent_psf: Math.round(current_rent_psf * 100) / 100,
    market_rent_psf: Math.round(market_rent_psf * 100) / 100,
    gap_amount_psf: Math.round(gap_amount_psf * 100) / 100,
    gap_percentage: Math.round(gap_percentage * 100) / 100,
    gap_direction,
    classification,
    condition_indicators: {
      epc_rating,
      building_age_years,
      occupancy_rate,
      tenant_strength,
    },
    confidence_score,
    explanation,
  }
}

function classifyGapDriver(
  indicators: {
    epc_rating: string | null
    building_age_years: number | null
    occupancy_rate: number | null
    tenant_strength: string | null
  },
  gap_percentage: number,
  gap_direction: string
): { classification: 'condition-driven' | 'market-driven' | 'uncertain'; confidence_score: number } {
  let condition_score = 0
  let indicator_count = 0

  // EPC rating indicator (low efficiency = condition-driven)
  if (indicators.epc_rating) {
    indicator_count++
    if (['D', 'E', 'F', 'G'].includes(indicators.epc_rating)) {
      condition_score += 2
    } else if (['C'].includes(indicators.epc_rating)) {
      condition_score += 1
    }
  }

  // Building age indicator (older buildings = condition-driven)
  if (indicators.building_age_years !== null && indicators.building_age_years > 50) {
    indicator_count++
    condition_score += 1.5
  } else if (indicators.building_age_years !== null && indicators.building_age_years > 100) {
    condition_score += 1
  }

  // Occupancy indicator (low occupancy may indicate condition issues)
  if (indicators.occupancy_rate !== null) {
    indicator_count++
    if (indicators.occupancy_rate < 70) {
      condition_score += 1
    }
  }

  // Tenant strength indicator (weak tenants may mean discount for condition risk)
  if (indicators.tenant_strength) {
    indicator_count++
    if (['Poor', 'Weak'].includes(indicators.tenant_strength)) {
      condition_score += 1
    }
  }

  // Calculate confidence based on data availability
  const confidence_score = indicator_count > 0 ? Math.min(indicator_count / 4, 1) : 0.3

  // Classify based on condition score
  let classification: 'condition-driven' | 'market-driven' | 'uncertain'
  if (condition_score >= 3) {
    classification = 'condition-driven'
  } else if (condition_score <= 1) {
    classification = 'market-driven'
  } else {
    classification = 'uncertain'
  }

  return { classification, confidence_score }
}

function generateExplanation(
  gap_direction: string,
  gap_percentage: number,
  classification: string,
  indicators: {
    epc_rating: string | null
    building_age_years: number | null
    occupancy_rate: number | null
    tenant_strength: string | null
  }
): string {
  let explanation = ''

  if (gap_direction === 'market-rate') {
    explanation = 'Property is rented at market rate.'
  } else if (gap_direction === 'over-rented') {
    explanation = `Property is over-rented by ${Math.abs(gap_percentage).toFixed(1)}%.`
  } else {
    explanation = `Property is under-rented by ${Math.abs(gap_percentage).toFixed(1)}%.`
  }

  if (classification === 'condition-driven') {
    const issues = []
    if (indicators.epc_rating && ['D', 'E', 'F', 'G'].includes(indicators.epc_rating)) {
      issues.push(`poor energy efficiency (EPC ${indicators.epc_rating})`)
    }
    if (indicators.building_age_years && indicators.building_age_years > 50) {
      issues.push(`age (${indicators.building_age_years} years)`)
    }
    if (indicators.occupancy_rate && indicators.occupancy_rate < 70) {
      issues.push(`low occupancy (${indicators.occupancy_rate}%)`)
    }
    explanation += ` Likely due to condition issues: ${issues.join(', ')}.`
  } else if (classification === 'market-driven') {
    explanation += ' Gap appears to be market-driven.'
  } else {
    explanation += ' Insufficient data to determine root cause.'
  }

  return explanation
}
