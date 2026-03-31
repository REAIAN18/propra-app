import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Return enriched demo data
    // In production, this would call ATTOM, Google Maps, Planning APIs, etc.
    const enriched = {
      address,
      latitude: 51.5074,
      longitude: -0.1278,
      propertyType: "Industrial",
      sqft: 15000,
      yearBuilt: 2002,
      estimatedValue: 850000,
      capRate: 6.8,
      epcRating: "D",
      planningSignals: [],
      owner: "Meridian Property Holdings Ltd",
      ownerStatus: "In Administration",
      tenants: [
        {
          name: "Tenant A",
          lease: "5 years remaining",
          breakDate: null,
        },
      ],
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error enriching property:", error);
    return NextResponse.json({ error: "Failed to enrich property" }, { status: 500 });
  }
}
