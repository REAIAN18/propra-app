import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { approachType = "acquisition", channel = "email" } = body;

    // Demo response for approach letter generation
    const demoLetterContent = `Dear Prospective Seller,

We are writing to express our strong interest in acquiring your property. As experienced real estate investors, we recognize the value and potential of your asset. We are prepared to move quickly with a competitive offer.

We believe this opportunity aligns perfectly with our portfolio strategy, and we would welcome the opportunity to discuss terms that work for both parties.

Warm regards,
The RealHQ Team`;

    return NextResponse.json({
      id: `letter-${id}`,
      content: demoLetterContent,
      channel,
      status: "draft",
      approachType,
    });
  } catch (error) {
    console.error("Error generating approach letter:", error);
    return NextResponse.json({ error: "Failed to generate letter" }, { status: 500 });
  }
}
