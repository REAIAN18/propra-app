import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  sqft: number;
  city: string;
  state: string;
}

interface CompanyResult {
  id: string;
  name: string;
  county: string;
  registeredAgent: string | null;
  activeSince: number | null;
  propertyCount: number;
  properties: Property[];
}

// Mock data — to be replaced with real ATTOM API search
const MOCK_COMPANIES: CompanyResult[] = [
  {
    id: "comp-1",
    name: "Brickell Holdings LLC",
    county: "Miami-Dade County",
    registeredAgent: "Ian R.",
    activeSince: 2018,
    propertyCount: 5,
    properties: [
      {
        id: "prop-1",
        name: "Coral Gables Office Park",
        address: "2801 Ponce de Leon Blvd",
        type: "Office",
        sqft: 42000,
        city: "Coral Gables",
        state: "FL",
      },
      {
        id: "prop-2",
        name: "Brickell Retail Center",
        address: "1200 Brickell Ave",
        type: "Retail",
        sqft: 18000,
        city: "Miami",
        state: "FL",
      },
      {
        id: "prop-3",
        name: "Tampa Industrial Park",
        address: "4501 W Cypress St",
        type: "Industrial",
        sqft: 28000,
        city: "Tampa",
        state: "FL",
      },
      {
        id: "prop-4",
        name: "Orlando Medical Office",
        address: "901 N Mills Ave",
        type: "Medical",
        sqft: 15000,
        city: "Orlando",
        state: "FL",
      },
      {
        id: "prop-5",
        name: "Ft Lauderdale Flex Space",
        address: "3100 W Broward Blvd",
        type: "Flex",
        sqft: 22000,
        city: "Ft Lauderdale",
        state: "FL",
      },
    ],
  },
  {
    id: "comp-2",
    name: "Brickell Bay Properties Inc",
    county: "Miami-Dade County",
    registeredAgent: null,
    activeSince: 2021,
    propertyCount: 2,
    properties: [
      {
        id: "prop-6",
        name: "Brickell Bay Tower",
        address: "1250 Brickell Bay Dr",
        type: "Office",
        sqft: 35000,
        city: "Miami",
        state: "FL",
      },
      {
        id: "prop-7",
        name: "Miami Avenue Plaza",
        address: "901 S Miami Ave",
        type: "Retail",
        sqft: 12000,
        city: "Miami",
        state: "FL",
      },
    ],
  },
];

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  // Simple mock search — filter by name containing query
  const results = MOCK_COMPANIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  // TODO: Replace with real ATTOM API search
  // Example ATTOM endpoint: /propertyapi/v1.0.0/property/ownerinfo
  // Or use property/detail and aggregate by ownerName

  return NextResponse.json({
    query,
    results,
    count: results.length,
  });
}
