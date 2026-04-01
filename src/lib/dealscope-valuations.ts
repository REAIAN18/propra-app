import type { PropertyEnrichmentData } from './dealscope-types'

export interface ValuationResult {
  valueLow: number
  valueMid: number
  valueHigh: number
  method: 'comparables' | 'income' | 'residual'
  confidence: number
  explanation: string
}

export interface ValuationsResponse {
  comparables: ValuationResult
  income: ValuationResult
  residual: ValuationResult
  blendedValuation: {
    low: number
    mid: number
    high: number
    confidence: number
  }
}

/**
 * Calculate valuations using three methods:
 * 1. Comparable sales (Land Registry approach)
 * 2. Income capitalisation (rent ÷ yield)
 * 3. Replacement cost / Residual value
 */
export async function calculateValueuations(
  address: string,
  propertyData?: Partial<PropertyEnrichmentData>,
  inputs?: {
    annualRent?: number
    grossYield?: number
    buildingSizeSqft?: number
    pricePerSqft?: number
  }
): Promise<ValuationsResponse> {
  // Extract inputs
  const annualRent = inputs?.annualRent || (propertyData?.occupancy_rate ? 12000 : 15000)
  const grossYield = inputs?.grossYield || 0.07 // 7% default
  const buildingSizeSqft = inputs?.buildingSizeSqft || (propertyData?.property_valuation ? Math.sqrt(propertyData.property_valuation * 10) : 5000)
  const pricePerSqft = inputs?.pricePerSqft || 300

  // Method 1: Income Capitalisation
  const incomeValuation = calculateIncomeCapitalisation(annualRent, grossYield, propertyData)

  // Method 2: Comparable Sales (Land Registry approach)
  const comparablesValuation = calculateComparables(address, buildingSizeSqft, pricePerSqft, propertyData)

  // Method 3: Replacement / Residual Value
  const residualValuation = calculateReplacement(buildingSizeSqft, propertyData)

  // Blend the three methods (equal weighting for MVP)
  const blended = blendValuations([incomeValuation, comparablesValuation, residualValuation])

  return {
    income: incomeValuation,
    comparables: comparablesValuation,
    residual: residualValuation,
    blendedValuation: blended,
  }
}

function calculateIncomeCapitalisation(
  annualRent: number,
  grossYield: number,
  propertyData?: Partial<PropertyEnrichmentData>
): ValuationResult {
  // Valuation = Annual Rent / Gross Yield
  const midValuation = annualRent / grossYield

  // Confidence based on data quality
  let confidence = 0.6
  if (propertyData?.occupancy_rate && propertyData.occupancy_rate > 0.8) {
    confidence = 0.8
  }

  // Range: ±15% based on yield volatility
  const variance = midValuation * 0.15
  const low = midValuation - variance
  const high = midValuation + variance

  return {
    valueLow: Math.round(low),
    valueMid: Math.round(midValuation),
    valueHigh: Math.round(high),
    method: 'income',
    confidence,
    explanation: `Annual rent of £${annualRent.toLocaleString()} capitalised at ${(grossYield * 100).toFixed(1)}% gross yield yields valuation of £${Math.round(midValuation).toLocaleString()}.`,
  }
}

function calculateComparables(
  address: string,
  buildingSizeSqft: number,
  pricePerSqft: number,
  propertyData?: Partial<PropertyEnrichmentData>
): ValuationResult {
  // Use price per sqft to estimate value
  // Adjust for property condition (EPC rating impacts value)
  let adjustmentFactor = 1.0

  if (propertyData?.comparable_sales && propertyData.comparable_sales.length > 0) {
    // Average recent comparable sales
    const avgPrice = propertyData.comparable_sales.reduce((sum, sale) => sum + sale.price, 0) / propertyData.comparable_sales.length
    const avgPricePsf = propertyData.comparable_sales.reduce((sum, sale) => sum + sale.price_psf, 0) / propertyData.comparable_sales.length

    // Use actual comparables if available
    const midValuation = avgPrice
    const low = midValuation * 0.9
    const high = midValuation * 1.1

    return {
      valueLow: Math.round(low),
      valueMid: Math.round(midValuation),
      valueHigh: Math.round(high),
      method: 'comparables',
      confidence: Math.min(0.85, 0.6 + propertyData.comparable_sales.length * 0.1),
      explanation: `Based on ${propertyData.comparable_sales.length} recent comparable sales averaging £${Math.round(avgPrice).toLocaleString()} (£${avgPricePsf.toFixed(0)}/sqft).`,
    }
  }

  // Fallback: use price per sqft market rate
  if (propertyData?.epc_rating && ['E', 'F', 'G'].includes(propertyData.epc_rating)) {
    adjustmentFactor = 0.85 // 15% discount for poor EPC
  } else if (propertyData?.epc_rating && ['A', 'B'].includes(propertyData.epc_rating)) {
    adjustmentFactor = 1.1 // 10% premium for excellent EPC
  }

  const midValuation = buildingSizeSqft * pricePerSqft * adjustmentFactor
  const variance = midValuation * 0.2 // ±20% range for market comps
  const low = midValuation - variance
  const high = midValuation + variance

  return {
    valueLow: Math.round(low),
    valueMid: Math.round(midValuation),
    valueHigh: Math.round(high),
    method: 'comparables',
    confidence: 0.65,
    explanation: `Market comparable rate of £${pricePerSqft}/sqft × ${buildingSizeSqft.toLocaleString()}sqft${adjustmentFactor !== 1.0 ? ` (adjusted ${(adjustmentFactor * 100).toFixed(0)}% for condition)` : ''} = £${Math.round(midValuation).toLocaleString()}.`,
  }
}

function calculateReplacement(
  buildingSizeSqft: number,
  propertyData?: Partial<PropertyEnrichmentData>
): ValuationResult {
  // BCIS replacement cost approach
  // UK average construction cost: £100-200 per sqft depending on age/spec
  let constructionCostPerSqft = 150

  // Adjust for building age
  if (propertyData?.building_age_years) {
    if (propertyData.building_age_years < 10) {
      constructionCostPerSqft = 180 // Modern spec
    } else if (propertyData.building_age_years > 50) {
      constructionCostPerSqft = 120 // Older, less spec
    }
  }

  const grossReplacementCost = buildingSizeSqft * constructionCostPerSqft

  // Depreciation: 1% per year, max 50%
  const depreciationRate = Math.min(0.5, (propertyData?.building_age_years || 0) * 0.01)
  const replacementValue = grossReplacementCost * (1 - depreciationRate)

  // Residual approach: add land value (UK average)
  const landValue = Math.max(50000, buildingSizeSqft * 50) // £50/sqft for land baseline
  const residualValue = replacementValue + landValue

  // Range: ±25% due to market conditions
  const variance = residualValue * 0.25
  const low = Math.max(landValue, residualValue - variance)
  const high = residualValue + variance

  return {
    valueLow: Math.round(low),
    valueMid: Math.round(residualValue),
    valueHigh: Math.round(high),
    method: 'residual',
    confidence: 0.55,
    explanation: `Replacement cost (£${constructionCostPerSqft}/sqft × ${buildingSizeSqft.toLocaleString()}sqft) minus ${(depreciationRate * 100).toFixed(0)}% depreciation plus land value = £${Math.round(residualValue).toLocaleString()}.`,
  }
}

function blendValuations(valuations: ValuationResult[]): { low: number; mid: number; high: number; confidence: number } {
  // Equal-weighted blend of three methods
  const avgLow = valuations.reduce((sum, v) => sum + v.valueLow, 0) / valuations.length
  const avgMid = valuations.reduce((sum, v) => sum + v.valueMid, 0) / valuations.length
  const avgHigh = valuations.reduce((sum, v) => sum + v.valueHigh, 0) / valuations.length
  const avgConfidence = valuations.reduce((sum, v) => sum + v.confidence, 0) / valuations.length

  return {
    low: Math.round(avgLow),
    mid: Math.round(avgMid),
    high: Math.round(avgHigh),
    confidence: Math.round(avgConfidence * 100) / 100,
  }
}
