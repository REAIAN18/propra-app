export type WorkOrderStatus = "draft" | "tendered" | "awarded" | "in_progress" | "complete";

export interface WorkOrder {
  id: string;
  assetId: string;
  assetName: string;
  assetLocation: string;
  portfolio: "fl-mixed" | "se-logistics";
  currency: "USD" | "GBP";
  jobType: string;
  description: string;
  contractor: string | null;
  status: WorkOrderStatus;
  costEstimate: number;
  benchmarkCost: number;
  dueDate: string;
  raisedDate: string;
}

export const workOrders: WorkOrder[] = [
  {
    id: "wo-001",
    assetId: "fl-001",
    assetName: "Coral Gables Office Park",
    assetLocation: "Coral Gables, FL",
    portfolio: "fl-mixed",
    currency: "USD",
    jobType: "HVAC Service",
    description: "Annual HVAC maintenance and refrigerant recharge across all 3 rooftop units",
    contractor: "CoolAir Solutions",
    status: "in_progress",
    costEstimate: 8500,
    benchmarkCost: 7100,
    dueDate: "2026-04-05",
    raisedDate: "2026-03-01",
  },
  {
    id: "wo-002",
    assetId: "fl-003",
    assetName: "Tampa Industrial Park",
    assetLocation: "Tampa, FL",
    portfolio: "fl-mixed",
    currency: "USD",
    jobType: "Roof Repair",
    description: "Flat roof membrane repair — 1,200 sqft section showing water ingress near loading bay 4",
    contractor: "SunState Roofing",
    status: "in_progress",
    costEstimate: 31500,
    benchmarkCost: 28000,
    dueDate: "2026-04-20",
    raisedDate: "2026-02-18",
  },
  {
    id: "wo-003",
    assetId: "fl-002",
    assetName: "Brickell Retail Center",
    assetLocation: "Miami, FL",
    portfolio: "fl-mixed",
    currency: "USD",
    jobType: "Elevator Servicing",
    description: "Annual elevator safety inspection and lubrication — 2 passenger lifts",
    contractor: "Otis Elevator Co.",
    status: "complete",
    costEstimate: 2750,
    benchmarkCost: 3100,
    dueDate: "2026-03-15",
    raisedDate: "2026-02-01",
  },
  {
    id: "wo-004",
    assetId: "se-001",
    assetName: "Dartford Logistics Hub",
    assetLocation: "Dartford, Kent",
    portfolio: "se-logistics",
    currency: "GBP",
    jobType: "Electrical Inspection",
    description: "EICR periodic inspection and remedial works — warehouse distribution floor",
    contractor: null,
    status: "tendered",
    costEstimate: 4400,
    benchmarkCost: 3800,
    dueDate: "2026-05-10",
    raisedDate: "2026-03-10",
  },
  {
    id: "wo-005",
    assetId: "se-002",
    assetName: "Thurrock Distribution Centre",
    assetLocation: "Thurrock, Essex",
    portfolio: "se-logistics",
    currency: "GBP",
    jobType: "Car Park Resurfacing",
    description: "Full resurfacing of HGV yard — 8,400 sqm of asphalt showing significant cracking",
    contractor: null,
    status: "draft",
    costEstimate: 86000,
    benchmarkCost: 71000,
    dueDate: "2026-07-01",
    raisedDate: "2026-03-15",
  },
  {
    id: "wo-006",
    assetId: "se-003",
    assetName: "Basildon Industrial Estate",
    assetLocation: "Basildon, Essex",
    portfolio: "se-logistics",
    currency: "GBP",
    jobType: "Fire Suppression",
    description: "Sprinkler head replacement and system pressure test — Units 1 and 2",
    contractor: "FireGuard Systems",
    status: "awarded",
    costEstimate: 15800,
    benchmarkCost: 14200,
    dueDate: "2026-04-30",
    raisedDate: "2026-02-25",
  },
];
