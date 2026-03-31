export interface PropertyEnrichmentData {
  address: string
  postcode: string
  tenure: 'Freehold' | 'Leasehold' | 'Unknown'
  epc_rating: string | null
  epc_certificate_number: string | null
  current_energy_efficiency: number | null
  potential_energy_efficiency: number | null
  building_age_years: number | null
  occupancy_rate: number | null
  tenant_strength: string | null
  property_valuation: number | null
  ground_rent_annual: number | null
  service_charges_annual: number | null
  company_ownership: boolean
  company_name: string | null
  company_number: string | null
  comparable_sales: Array<{
    address: string
    price: number
    price_psf: number
    transaction_date: string
  }>
  risk_score: number
  signals: Array<{
    type: string
    signal: string
    confidence: number
  }>
}

export interface DealScopeRequest {
  address: string
  postcode?: string
  property_data?: Partial<PropertyEnrichmentData>
}

export interface DealScopeResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  demo?: boolean
}
