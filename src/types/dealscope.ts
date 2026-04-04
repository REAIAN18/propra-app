/**
 * src/types/dealscope.ts
 * Shared property type for DealScope calculation modules.
 */

export interface Property {
  id?: string;
  address?: string;
  assetType?: string;

  // Financial inputs
  askingPrice?: number;
  guidePrice?: number;
  passingRent?: number;       // Annual passing rent (£/yr)
  erv?: number;               // Estimated Rental Value (£/yr)
  businessRates?: number;     // Annual business rates (£/yr)
  serviceCharge?: number;     // Annual service charge (£/yr)

  // Physical
  size?: number;              // NLA in sqft
  builtYear?: number;
  epcRating?: string;

  // Operational
  expectedVoid?: number;      // Expected void period in months
  occupancyPct?: number;      // 0–1

  // Description (for refurb detection)
  description?: string;
}
