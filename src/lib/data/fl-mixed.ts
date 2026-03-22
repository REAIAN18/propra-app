import { Portfolio } from "./types";

export const flMixed: Portfolio = {
  id: "fl-mixed",
  name: "FL Mixed Portfolio",
  shortName: "FL Mixed",
  currency: "USD",
  benchmarkG2N: 72,
  insuranceComparableCount: 340,
  utilityComparableCount: 1200,
  assets: [
    {
      id: "fl-001",
      name: "Coral Gables Office Park",
      type: "office",
      location: "Miami-Dade, FL",
      sqft: 45000,
      // Valuation: 7.6% cap rate on NOI $742.5k. FL Class B office trades 7.0-8.5% (Q4 2024).
      // Comparables: Coral Gables $205-215/sqft. $9.8M = $218/sqft — slight premium for location quality.
      // Prior $14.2M (5.23% cap) would not survive any sophisticated FL investor conversation.
      valuationUSD: 9800000,
      grossIncome: 1125000,
      netIncome: 742500,
      occupancy: 88,
      passingRent: 25,
      marketERV: 29,
      insurancePremium: 112000,
      marketInsurance: 84000,
      energyCost: 198000,
      marketEnergyCost: 148000,
      currency: "USD",
      leases: [
        {
          id: "fl-001-l1",
          tenant: "Meridian Legal LLP",
          sqft: 18000,
          rentPerSqft: 26,
          startDate: "2020-03-01",
          expiryDate: "2027-03-02",
          reviewDate: "2025-03-01",
          daysToExpiry: 348,
          status: "expiring_soon",
        },
        {
          id: "fl-001-l2",
          tenant: "Coastal Advisory Group",
          sqft: 12000,
          rentPerSqft: 24,
          startDate: "2022-06-01",
          expiryDate: "2028-06-02",
          daysToExpiry: 805,
          status: "current",
        },
        {
          id: "fl-001-l3",
          tenant: "SunState Accountants",
          sqft: 9600,
          rentPerSqft: 25,
          startDate: "2021-01-01",
          expiryDate: "2027-01-02",
          reviewDate: "2024-01-01",
          daysToExpiry: 289,
          status: "expiring_soon",
        },
      ],
      additionalIncomeOpportunities: [
        { id: "fl-001-a1", type: "ev_charging", label: "EV Charging (12 bays)", annualIncome: 28800, status: "identified", probability: 75 },
        { id: "fl-001-a2", type: "solar", label: "Rooftop Solar (180kWp)", annualIncome: 32400, status: "in_progress", probability: 85 },
      ],
      compliance: [
        { id: "fl-001-c1", type: "Fire Safety", certificate: "Fire Safety Certificate", expiryDate: "2026-08-17", daysToExpiry: 151, status: "expiring_soon", fineExposure: 25000 },
        { id: "fl-001-c2", type: "Electrical", certificate: "EICR", expiryDate: "2027-12-02", daysToExpiry: 623, status: "valid", fineExposure: 0 },
        { id: "fl-001-c3", type: "Elevator", certificate: "Elevator Inspection", expiryDate: "2026-05-03", daysToExpiry: 45, status: "expiring_soon", fineExposure: 15000 },
      ],
    },
    {
      // Brickell Retail Center — rents corrected to Brickell market rates (Q1 2026).
      // Previous $45/$52 was suburban Miami. Brickell inline NNN retail trades at $60-$85/sqft.
      // Updated to $62 passing / $72 ERV. Valuation updated to reflect 5.3% net cap rate.
      id: "fl-002",
      name: "Brickell Retail Center",
      type: "retail",
      location: "Miami, FL",
      sqft: 12000,
      valuationUSD: 9400000,
      grossIncome: 710000,
      netIncome: 497000,
      occupancy: 95,
      passingRent: 62,
      marketERV: 72,
      // Insurance: inline retail, Miami-Dade wind zone 1. Market ~$1.88/sqft; legacy ~$2.80/sqft.
      // Prior figures ($68k/$48k = $5.67/$4.00/sqft) were inconsistent with FL retail benchmarks.
      insurancePremium: 33600,
      marketInsurance: 22500,
      // Energy: gym (4.2k sqft) + coffee shop (1.8k sqft) + pharmacy (2.4k sqft) = ~330k kWh/yr.
      // Legacy FPL contract ~$0.17/kWh = $56k; market competitive rate ~$0.13/kWh = $43k (25% overpay).
      energyCost: 56000,
      marketEnergyCost: 43000,
      currency: "USD",
      leases: [
        { id: "fl-002-l1", tenant: "Urban Grind Coffee", sqft: 1800, rentPerSqft: 72, startDate: "2023-01-01", expiryDate: "2030-01-03", daysToExpiry: 1385, status: "current" },
        { id: "fl-002-l2", tenant: "Flex Fitness Studio", sqft: 4200, rentPerSqft: 58, startDate: "2021-06-01", expiryDate: "2027-06-02", daysToExpiry: 440, status: "current" },
        { id: "fl-002-l3", tenant: "Coastal Pharmacy", sqft: 2400, rentPerSqft: 62, startDate: "2020-09-01", expiryDate: "2026-09-02", daysToExpiry: 167, status: "expiring_soon" },
      ],
      additionalIncomeOpportunities: [
        { id: "fl-002-a1", type: "ev_charging", label: "EV Charging (6 bays)", annualIncome: 14400, status: "identified", probability: 80 },
        { id: "fl-002-a2", type: "billboard", label: "Digital Billboard (street-facing)", annualIncome: 36000, status: "identified", probability: 60 },
      ],
      compliance: [
        { id: "fl-002-c1", type: "Fire Safety", certificate: "Fire Safety Certificate", expiryDate: "2027-03-03", daysToExpiry: 349, status: "valid", fineExposure: 0 },
        { id: "fl-002-c2", type: "Food Safety", certificate: "Health Inspection (tenant)", expiryDate: "2026-04-17", daysToExpiry: 29, status: "expiring_soon", fineExposure: 8000 },
      ],
    },
    {
      id: "fl-003",
      name: "Tampa Industrial Park",
      type: "industrial",
      location: "Hillsborough, FL",
      sqft: 28000,
      // Valuation: 5.65% cap rate on NOI $294k. Tampa industrial trades 5.5-6.5% (Q4 2024).
      // Below-ERV rent ($14 vs $17 market) supports tight end of range; 2029 lease WAULT is solid.
      // Comparables: Hillsborough Co. $176-184/sqft. $5.2M = $186/sqft. Prior $5.6M = $200/sqft (too high).
      valuationUSD: 5200000,
      grossIncome: 392000,
      netIncome: 294000,
      occupancy: 100,
      passingRent: 14,
      marketERV: 17,
      insurancePremium: 42000,
      marketInsurance: 28000,
      energyCost: 84000,
      marketEnergyCost: 56000,
      currency: "USD",
      leases: [
        { id: "fl-003-l1", tenant: "Gulf Coast Logistics", sqft: 28000, rentPerSqft: 14, startDate: "2022-01-01", expiryDate: "2029-01-03", daysToExpiry: 1020, status: "current" },
      ],
      additionalIncomeOpportunities: [
        { id: "fl-003-a1", type: "solar", label: "Rooftop Solar (250kWp)", annualIncome: 45000, status: "in_progress", probability: 90 },
        { id: "fl-003-a2", type: "ev_charging", label: "EV Charging (HGV, 4 bays)", annualIncome: 19200, status: "identified", probability: 70 },
      ],
      compliance: [
        { id: "fl-003-c1", type: "Environmental", certificate: "Phase I ESA", expiryDate: "2026-04-02", daysToExpiry: 14, status: "expiring_soon", fineExposure: 50000 },
        { id: "fl-003-c2", type: "Fire Safety", certificate: "Sprinkler Inspection", expiryDate: "2027-02-02", daysToExpiry: 320, status: "valid", fineExposure: 0 },
      ],
    },
    {
      id: "fl-004",
      name: "Orlando Business Center",
      type: "office",
      location: "Orange County, FL",
      sqft: 32000,
      // Valuation: 7.94% cap rate on NOI $476k. FL Class B office (Orange County) trades 7.5-8.5%.
      // 82% occupancy and multiple 2027 expirations warrant yield premium. Comparables: $151-170/sqft.
      // $6.0M = $188/sqft — slight premium to comps for reversionary upside if vacancy filled.
      // Prior $9.6M (4.96% cap) was completely indefensible for a partially-vacant suburban office.
      valuationUSD: 6000000,
      grossIncome: 768000,
      netIncome: 476160,
      occupancy: 82,
      passingRent: 24,
      marketERV: 27,
      insurancePremium: 86000,
      marketInsurance: 62000,
      energyCost: 136000,
      marketEnergyCost: 98000,
      currency: "USD",
      leases: [
        { id: "fl-004-l1", tenant: "Nexus Digital", sqft: 8000, rentPerSqft: 25, startDate: "2021-07-01", expiryDate: "2027-07-02", daysToExpiry: 470, status: "current" },
        { id: "fl-004-l2", tenant: "Vacant", sqft: 5760, rentPerSqft: 0, startDate: "", expiryDate: "", daysToExpiry: 0, status: "expired" },
        { id: "fl-004-l3", tenant: "HR Dynamics", sqft: 6400, rentPerSqft: 23, startDate: "2023-01-01", expiryDate: "2027-01-02", daysToExpiry: 289, status: "expiring_soon" },
      ],
      additionalIncomeOpportunities: [
        { id: "fl-004-a1", type: "5g_mast", label: "5G Rooftop Mast", annualIncome: 24000, status: "identified", probability: 65 },
        { id: "fl-004-a2", type: "parking", label: "Weekend Parking Revenue", annualIncome: 18000, status: "identified", probability: 85 },
      ],
      compliance: [
        { id: "fl-004-c1", type: "Electrical", certificate: "EICR", expiryDate: "2026-07-02", daysToExpiry: 105, status: "expiring_soon", fineExposure: 12000 },
        { id: "fl-004-c2", type: "Elevator", certificate: "Elevator Permit", expiryDate: "2027-09-02", daysToExpiry: 532, status: "valid", fineExposure: 0 },
      ],
    },
    {
      id: "fl-005",
      name: "Fort Lauderdale Flex",
      type: "flex",
      location: "Broward, FL",
      sqft: 18000,
      valuationUSD: 4500000,
      grossIncome: 396000,
      netIncome: 277200,
      occupancy: 92,
      passingRent: 22,
      marketERV: 25,
      insurancePremium: 54000,
      marketInsurance: 38000,
      energyCost: 95000,
      marketEnergyCost: 68000,
      currency: "USD",
      leases: [
        { id: "fl-005-l1", tenant: "SunCoast Tech", sqft: 8000, rentPerSqft: 23, startDate: "2022-04-01", expiryDate: "2028-04-02", daysToExpiry: 744, status: "current" },
        { id: "fl-005-l2", tenant: "Broward Medical Supplies", sqft: 7000, rentPerSqft: 21, startDate: "2020-10-01", expiryDate: "2026-10-02", daysToExpiry: 197, status: "expiring_soon" },
      ],
      additionalIncomeOpportunities: [
        { id: "fl-005-a1", type: "solar", label: "Rooftop Solar (140kWp)", annualIncome: 25200, status: "identified", probability: 80 },
      ],
      compliance: [
        { id: "fl-005-c1", type: "Fire Safety", certificate: "Fire Safety Certificate", expiryDate: "2026-12-02", daysToExpiry: 258, status: "valid", fineExposure: 0 },
        { id: "fl-005-c2", type: "HVAC", certificate: "HVAC Inspection", expiryDate: "2026-04-03", daysToExpiry: 15, status: "expiring_soon", fineExposure: 6000 },
      ],
    },
  ],
};
