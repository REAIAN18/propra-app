import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  sqft: number;
  tenantCount: number;
}

// Mock data — to be replaced with real document parsing
const MOCK_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    name: "Coral Gables Office Park",
    address: "2801 Ponce de Leon Blvd, Coral Gables FL",
    type: "Office",
    sqft: 42000,
    tenantCount: 4,
  },
  {
    id: "prop-2",
    name: "Brickell Retail Center",
    address: "1200 Brickell Ave, Miami FL",
    type: "Retail",
    sqft: 18000,
    tenantCount: 3,
  },
  {
    id: "prop-3",
    name: "Tampa Industrial Park",
    address: "4501 W Cypress St, Tampa FL",
    type: "Industrial",
    sqft: 28000,
    tenantCount: 2,
  },
  {
    id: "prop-4",
    name: "Orlando Medical Office",
    address: "901 N Mills Ave, Orlando FL",
    type: "Medical",
    sqft: 15000,
    tenantCount: 2,
  },
  {
    id: "prop-5",
    name: "Ft Lauderdale Flex Space",
    address: "3100 W Broward Blvd, Ft Lauderdale FL",
    type: "Flex",
    sqft: 22000,
    tenantCount: 1,
  },
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // TODO: Replace with real document parsing
    // 1. Use textract.ts → extractTextFromDocument() for PDF/images
    // 2. Use document-parser.ts → parseDocument() with Claude
    // 3. Parse XLSX/CSV directly with a library (e.g., xlsx, papaparse)
    // 4. Extract property list from the document structure

    // For now, simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const totalTenants = MOCK_PROPERTIES.reduce((sum, p) => sum + p.tenantCount, 0);

    return NextResponse.json({
      filename: file.name,
      fileSize: file.size,
      properties: MOCK_PROPERTIES,
      totalTenants,
    });
  } catch (err) {
    console.error("[parse/schedule] Error:", err);
    return NextResponse.json(
      { error: "Failed to parse schedule" },
      { status: 500 }
    );
  }
}
