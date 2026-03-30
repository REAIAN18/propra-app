/**
 * Demo data returned by APIs when no user is authenticated.
 * All feature pages MUST work without signin and show demo data.
 * See CLAUDE.md lines 47-66.
 */

export const DEMO_USER = {
  id: "demo-user-123",
  email: "demo@realhq.com",
  name: "Demo User",
};

export const DEMO_PORTFOLIO = {
  userId: DEMO_USER.id,
  portfolioName: "FL Mixed Portfolio",
  properties: [
    {
      id: "demo-property-1",
      name: "Miami Office Complex",
      address: "123 Main Street, Miami, FL 33101",
      assetType: "office",
      region: "fl_us",
      value: 2500000,
      marketValue: 2800000,
      debt: 1200000,
    },
    {
      id: "demo-property-2",
      name: "Industrial Warehouse",
      address: "456 Industrial Ave, Miami, FL 33126",
      assetType: "industrial",
      region: "fl_us",
      value: 1800000,
      marketValue: 2000000,
      debt: 800000,
    },
  ],
};

export const DEMO_INSURANCE = {
  policies: [
    {
      id: "demo-insurance-1",
      property: "Miami Office Complex",
      premium: 8500,
      marketRate: 6200,
      provider: "State Farm",
      expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
    {
      id: "demo-insurance-2",
      property: "Industrial Warehouse",
      premium: 5200,
      marketRate: 4100,
      provider: "Nationwide",
      expiry: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    },
  ],
  totalAnnualSavings: 3400,
};

export const DEMO_ENERGY = {
  contracts: [
    {
      id: "demo-energy-1",
      property: "Miami Office Complex",
      currentRate: 0.14,
      marketRate: 0.11,
      monthlyUsage: 45000,
      monthlyCost: 6300,
      marketCost: 4950,
    },
    {
      id: "demo-energy-2",
      property: "Industrial Warehouse",
      currentRate: 0.12,
      marketRate: 0.09,
      monthlyUsage: 120000,
      monthlyCost: 14400,
      marketCost: 10800,
    },
  ],
  totalMonthlySavings: 3150,
  totalAnnualSavings: 37800,
};

export const DEMO_DASHBOARD = {
  totalOpportunity: 41200,
  portfolioHealth: 87,
  assetsCount: 2,
  cards: [
    { category: "insurance", amount: 3400, label: "Insurance savings" },
    { category: "energy", amount: 37800, label: "Energy savings" },
  ],
  keyMetrics: {
    totalValue: "£4.3M",
    totalDebt: "£2M",
    equity: "£2.3M",
    yearsToPayoff: 8.2,
  },
};

export const DEMO_TENANTS = {
  tenants: [
    {
      id: "demo-tenant-1",
      name: "TechCorp Inc",
      property: "Miami Office Complex",
      unit: "Suite 500",
      leaseStart: new Date("2022-01-15"),
      leaseEnd: new Date("2027-01-15"),
      rentPsf: 28,
      marketRentPsf: 32,
      occupancyMonths: 36,
    },
    {
      id: "demo-tenant-2",
      name: "Manufacturing Ltd",
      property: "Industrial Warehouse",
      unit: "Main Floor",
      leaseStart: new Date("2021-06-01"),
      leaseEnd: new Date("2026-06-01"),
      rentPsf: 12,
      marketRentPsf: 14,
      occupancyMonths: 46,
    },
  ],
};

export const DEMO_WORK_ORDERS = {
  pending: [
    {
      id: "demo-wo-1",
      property: "Miami Office Complex",
      description: "HVAC system maintenance",
      estimatedCost: 5200,
      priority: "medium",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: "demo-wo-2",
      property: "Industrial Warehouse",
      description: "Roof inspection and repair",
      estimatedCost: 12500,
      priority: "high",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ],
  totalPending: 17700,
};

export const DEMO_TRANSACTIONS = {
  recentTransactions: [
    {
      id: "demo-txn-1",
      type: "rent_collected",
      property: "Miami Office Complex",
      amount: 45000,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "demo-txn-2",
      type: "insurance_paid",
      property: "Industrial Warehouse",
      amount: -5200,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  ],
};
