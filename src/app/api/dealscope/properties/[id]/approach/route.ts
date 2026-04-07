import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — return existing approach letters + vendor approaches for this deal so
// the Approach tab can render history without having to POST first.
// Previously this endpoint was POST-only, which made the Approach tab return
// 405 Method Not Allowed on initial load.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [letters, approaches, deal] = await Promise.all([
      prisma.approachLetter.findMany({
        where: { dealId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.vendorApproach.findMany({
        where: { dealId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.scoutDeal.findUnique({
        where: { id },
        select: { id: true, address: true, ownerName: true, brokerName: true, sourceUrl: true },
      }),
    ]);

    return NextResponse.json({
      deal,
      letters,
      approaches,
      counts: {
        letters: letters.length,
        approaches: approaches.length,
      },
    });
  } catch (error) {
    console.error("Error fetching approach data:", error);
    return NextResponse.json({ error: "Failed to fetch approach data" }, { status: 500 });
  }
}

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
