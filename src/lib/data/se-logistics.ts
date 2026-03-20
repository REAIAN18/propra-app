import { Portfolio } from "./types";

export const seLogistics: Portfolio = {
  id: "se-logistics",
  name: "SE Logistics Portfolio",
  shortName: "SE Logistics",
  currency: "GBP",
  benchmarkG2N: 74,
  assets: [
    {
      id: "se-001",
      name: "Dartford Logistics Hub",
      type: "warehouse",
      location: "Dartford, Kent",
      sqft: 85000,
      valuationGBP: 22500000,
      grossIncome: 1190000,
      netIncome: 898000,
      occupancy: 100,
      passingRent: 14,
      marketERV: 18.5,
      // Insurance: single-let FRI warehouse. Market ~£0.32/sqft; legacy policy ~£0.50/sqft.
      insurancePremium: 42500,
      marketInsurance: 27200,
      // Energy: 14 kWh/sqft × 85k sqft = 1.19M kWh/yr. Legacy contract ~£0.24/kWh; market ~£0.20/kWh (20% overpay).
      energyCost: 286000,
      marketEnergyCost: 229000,
      currency: "GBP",
      leases: [
        {
          id: "se-001-l1",
          tenant: "DHL Supply Chain",
          sqft: 85000,
          rentPerSqft: 14,
          startDate: "2019-06-01",
          expiryDate: "2031-06-03",
          // CRITICAL: break clause exercisable 26 May 2026 — 68 days from today.
          // DHL has not yet served notice. Arca must engage landlord immediately.
          breakDate: "2026-05-31",
          daysToExpiry: 1901,
          status: "current",
        },
      ],
      additionalIncomeOpportunities: [
        { id: "se-001-a1", type: "solar", label: "Rooftop Solar (600kWp)", annualIncome: 96000, status: "in_progress", probability: 92 },
        { id: "se-001-a2", type: "ev_charging", label: "EV HGV Charging (8 bays)", annualIncome: 38400, status: "identified", probability: 75 },
        { id: "se-001-a3", type: "5g_mast", label: "5G Mast (rooftop)", annualIncome: 22000, status: "live", probability: 100 },
      ],
      compliance: [
        { id: "se-001-c1", type: "Fire Safety", certificate: "Fire Risk Assessment", expiryDate: "2027-06-03", daysToExpiry: 441, status: "valid", fineExposure: 0 },
        { id: "se-001-c2", type: "Environmental", certificate: "BREEAM Certificate", expiryDate: "2028-01-03", daysToExpiry: 655, status: "valid", fineExposure: 0 },
        { id: "se-001-c3", type: "Electrical", certificate: "EICR", expiryDate: "2026-05-17", daysToExpiry: 59, status: "expiring_soon", fineExposure: 20000 },
        // 2008 build — EPC D (78). Proposed trajectory: EPC C by 2030, EPC B by 2035.
        // Statutory MEES fine for non-compliance: up to £150k (commercial, ≥3 months breach).
        // 18-months rent = £1.79M — statutory cap applies at £150k. Estimated capex to reach B: £320k–£420k.
        { id: "se-001-c4", type: "MEES / EPC", certificate: "EPC Certificate — Rating D (78)", expiryDate: "2030-04-01", daysToExpiry: 1474, status: "expiring_soon", fineExposure: 150000 },
      ],
    },
    {
      id: "se-002",
      name: "Thurrock Distribution Centre",
      type: "warehouse",
      location: "Thurrock, Essex",
      sqft: 120000,
      valuationGBP: 34000000,
      grossIncome: 1800000,
      netIncome: 1314000,
      occupancy: 100,
      passingRent: 15,
      marketERV: 20.5,
      // Insurance: single-let FRI warehouse. Market ~£0.30/sqft; legacy fleet policy ~£0.49/sqft.
      insurancePremium: 58800,
      marketInsurance: 36000,
      // Energy: 14 kWh/sqft × 120k sqft = 1.68M kWh/yr. Legacy contract ~£0.25/kWh; market ~£0.20/kWh (25% overpay).
      energyCost: 412000,
      marketEnergyCost: 330000,
      currency: "GBP",
      leases: [
        {
          id: "se-002-l1",
          tenant: "Amazon Logistics UK",
          sqft: 120000,
          rentPerSqft: 15,
          startDate: "2021-09-01",
          expiryDate: "2033-09-04",
          daysToExpiry: 2724,
          status: "current",
        },
      ],
      additionalIncomeOpportunities: [
        { id: "se-002-a1", type: "solar", label: "Rooftop Solar (900kWp)", annualIncome: 144000, status: "in_progress", probability: 95 },
        // Corrected from £96k: 20 bays at mix of L2/rapid averages £3,600/bay = £72k
        { id: "se-002-a2", type: "ev_charging", label: "EV Charging (20 bays)", annualIncome: 72000, status: "in_progress", probability: 88 },
      ],
      compliance: [
        { id: "se-002-c1", type: "Fire Safety", certificate: "Sprinkler Inspection", expiryDate: "2027-01-02", daysToExpiry: 289, status: "valid", fineExposure: 0 },
        { id: "se-002-c2", type: "Planning", certificate: "Permitted Development Certificate", expiryDate: "2027-10-02", daysToExpiry: 562, status: "valid", fineExposure: 0 },
        { id: "se-002-c3", type: "Asbestos", certificate: "Asbestos Management Survey", expiryDate: "2026-04-02", daysToExpiry: 14, status: "expiring_soon", fineExposure: 35000 },
        // 2015 build — EPC C (65). One band from statutory target; lower risk than D/E assets.
        // Statutory max fine £150k; lower probability of breach than D-rated peers. Estimated capex £180k–£240k.
        { id: "se-002-c4", type: "MEES / EPC", certificate: "EPC Certificate — Rating C (65)", expiryDate: "2030-04-01", daysToExpiry: 1474, status: "expiring_soon", fineExposure: 75000 },
      ],
    },
    {
      id: "se-003",
      name: "Basildon Industrial Estate",
      type: "industrial",
      location: "Basildon, Essex",
      sqft: 45000,
      valuationGBP: 9800000,
      grossIncome: 630000,
      netIncome: 441000,
      occupancy: 95,
      passingRent: 13,
      // ERV: Basildon secondary SE industrial. Savills/CBRE Q4 2024 show £15–17/sqft for this corridor.
      marketERV: 16.0,
      // Insurance: multi-let estate, higher risk profile. Market ~£0.44/sqft; legacy ~£0.66/sqft.
      insurancePremium: 29700,
      marketInsurance: 19800,
      // Energy: 14.5 kWh/sqft × 45k sqft = 652k kWh/yr. Legacy ~£0.24/kWh; market ~£0.19/kWh (20% overpay).
      energyCost: 156000,
      marketEnergyCost: 125000,
      currency: "GBP",
      leases: [
        { id: "se-003-l1", tenant: "Basildon Engineering", sqft: 20000, rentPerSqft: 13, startDate: "2020-01-01", expiryDate: "2027-01-02", reviewDate: "2023-01-01", daysToExpiry: 289, status: "expiring_soon" },
        { id: "se-003-l2", tenant: "Essex Fabricators", sqft: 15000, rentPerSqft: 14, startDate: "2022-06-01", expiryDate: "2028-06-02", daysToExpiry: 805, status: "current" },
        { id: "se-003-l3", tenant: "Vacant Unit 3", sqft: 2250, rentPerSqft: 0, startDate: "", expiryDate: "", daysToExpiry: 0, status: "expired" },
      ],
      additionalIncomeOpportunities: [
        { id: "se-003-a1", type: "solar", label: "Rooftop Solar (320kWp)", annualIncome: 51200, status: "identified", probability: 82 },
        { id: "se-003-a2", type: "ev_charging", label: "EV Charging (8 bays)", annualIncome: 19200, status: "identified", probability: 70 },
      ],
      compliance: [
        { id: "se-003-c1", type: "Electrical", certificate: "EICR", expiryDate: "2026-10-02", daysToExpiry: 197, status: "valid", fineExposure: 0 },
        { id: "se-003-c2", type: "Fire Safety", certificate: "Fire Risk Assessment", expiryDate: "2026-05-02", daysToExpiry: 44, status: "expiring_soon", fineExposure: 18000 },
        // 2005 build — EPC E (107). At the minimum threshold; first to breach as regulations tighten to D (proposed 2027).
        // Multi-let estate: 3 units. Statutory max £150k/unit; 18-months rent per unit drives cap on smaller units.
        // Aggregate fine exposure assuming 3 units, mix of large/small: ~£75k conservative estimate.
        { id: "se-003-c3", type: "MEES / EPC", certificate: "EPC Certificate — Rating E (107)", expiryDate: "2030-04-01", daysToExpiry: 1474, status: "expiring_soon", fineExposure: 75000 },
      ],
    },
    {
      id: "se-004",
      name: "Medway Trade Park",
      type: "industrial",
      location: "Medway, Kent",
      sqft: 32000,
      valuationGBP: 7200000,
      grossIncome: 448000,
      netIncome: 326000,
      occupancy: 100,
      passingRent: 14,
      marketERV: 16.5,
      // Insurance: multi-let estate, 2003 build. Market ~£0.45/sqft; legacy ~£0.63/sqft.
      insurancePremium: 20160,
      marketInsurance: 14400,
      // Energy: 14.5 kWh/sqft × 32k sqft = 464k kWh/yr. Legacy ~£0.24/kWh; market ~£0.19/kWh (20% overpay).
      energyCost: 112000,
      marketEnergyCost: 90000,
      currency: "GBP",
      leases: [
        { id: "se-004-l1", tenant: "Kent Auto Parts", sqft: 18000, rentPerSqft: 14, startDate: "2023-03-01", expiryDate: "2029-03-03", daysToExpiry: 1079, status: "current" },
        { id: "se-004-l2", tenant: "Medway Print Co", sqft: 14000, rentPerSqft: 14, startDate: "2021-11-01", expiryDate: "2027-11-02", daysToExpiry: 593, status: "current" },
      ],
      additionalIncomeOpportunities: [
        { id: "se-004-a1", type: "solar", label: "Rooftop Solar (220kWp)", annualIncome: 35200, status: "identified", probability: 78 },
        { id: "se-004-a2", type: "parking", label: "Weekend Commercial Parking", annualIncome: 12000, status: "identified", probability: 90 },
      ],
      compliance: [
        { id: "se-004-c1", type: "Fire Safety", certificate: "Fire Risk Assessment", expiryDate: "2027-03-03", daysToExpiry: 349, status: "valid", fineExposure: 0 },
        { id: "se-004-c2", type: "Environmental", certificate: "Contaminated Land Report", expiryDate: "2028-07-03", daysToExpiry: 836, status: "valid", fineExposure: 0 },
        // 2003 build — EPC D (88). Multi-let: each unit has separate EPC. Estimated capex £190k–£260k.
        // Statutory max £150k/unit. 2 tenants, rent ~£224k/yr each; 18-months rent £336k — cap applies at £150k/unit.
        // Aggregate exposure (2 lettable units): £60k probability-weighted (both units at risk but time to comply remains).
        { id: "se-004-c3", type: "MEES / EPC", certificate: "EPC Certificate — Rating D (88)", expiryDate: "2030-04-01", daysToExpiry: 1474, status: "expiring_soon", fineExposure: 60000 },
      ],
    },
    {
      id: "se-005",
      name: "Gravesend Logistics Centre",
      type: "warehouse",
      location: "Gravesend, Kent",
      sqft: 68000,
      valuationGBP: 17800000,
      grossIncome: 952000,
      netIncome: 671000,
      occupancy: 100,
      passingRent: 14,
      // ERV: Gravesend A2 corridor, 68k sqft 2011-build. Knight Frank/JLL Q4 2024: £16–18/sqft for modern SE distribution.
      marketERV: 17.0,
      // Insurance: single-let FRI warehouse. Market ~£0.33/sqft; legacy policy ~£0.49/sqft.
      insurancePremium: 33600,
      marketInsurance: 22400,
      // Energy: 14 kWh/sqft × 68k sqft = 952k kWh/yr. Legacy ~£0.24/kWh; market ~£0.19/kWh (20% overpay).
      energyCost: 228000,
      marketEnergyCost: 182000,
      currency: "GBP",
      leases: [
        {
          id: "se-005-l1",
          tenant: "XPO Logistics",
          sqft: 68000,
          rentPerSqft: 14,
          startDate: "2018-01-01",
          expiryDate: "2027-01-02",
          // Break clause at Dec 2024 was not exercised — XPO remained in occupation.
          // No further break options. Lease runs to expiry Jan 2027 (289 days).
          daysToExpiry: 289,
          status: "expiring_soon",
        },
      ],
      additionalIncomeOpportunities: [
        { id: "se-005-a1", type: "solar", label: "Rooftop Solar (480kWp)", annualIncome: 76800, status: "in_progress", probability: 88 },
        { id: "se-005-a2", type: "ev_charging", label: "EV HGV Charging (6 bays)", annualIncome: 28800, status: "identified", probability: 72 },
        { id: "se-005-a3", type: "5g_mast", label: "5G Mast (rooftop)", annualIncome: 18000, status: "identified", probability: 68 },
      ],
      compliance: [
        { id: "se-005-c1", type: "Electrical", certificate: "EICR", expiryDate: "2026-08-02", daysToExpiry: 136, status: "expiring_soon", fineExposure: 15000 },
        { id: "se-005-c2", type: "Fire Safety", certificate: "Fire Risk Assessment", expiryDate: "2026-12-02", daysToExpiry: 258, status: "valid", fineExposure: 0 },
        { id: "se-005-c3", type: "Asbestos", certificate: "Asbestos Management Survey", expiryDate: "2026-05-02", daysToExpiry: 44, status: "expiring_soon", fineExposure: 28000 },
        // 2011 build — EPC D (82). XPO lease expires Jan 2027: ideal re-letting trigger for EPC upgrade.
        // Statutory max fine £150k. 18-months rent = £1.43M — cap applies at £150k.
        // Probability-weighted (time remaining + vacancy window mitigant): £100k.
        { id: "se-005-c4", type: "MEES / EPC", certificate: "EPC Certificate — Rating D (82)", expiryDate: "2030-04-01", daysToExpiry: 1474, status: "expiring_soon", fineExposure: 100000 },
      ],
    },
  ],
};
