import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { approachType = "acquisition", channel = "email" } = body;

    const deal = await prisma.scoutDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Generate personalized approach letter using Claude
    const systemPrompt = `You are an expert real estate acquisition specialist. Generate a professional and personalized ${approachType} approach letter for a property opportunity. Keep it concise (3-4 paragraphs) and direct.`;

    const userPrompt = `
Property Details:
- Address: ${deal.address}
- Type: ${deal.assetType}
- Size: ${deal.sqft ? `${deal.sqft.toLocaleString()} sqft` : "Unknown"}
- Asking Price: ${deal.askingPrice ? `${deal.currency} ${deal.askingPrice.toLocaleString()}` : "Price TBD"}
- Owner: ${deal.ownerName || "Unknown"}
- Source: ${deal.sourceTag}
- Cap Rate: ${deal.capRate ? `${deal.capRate.toFixed(1)}%` : "N/A"}

Generate a professional ${approachType} approach letter for this property. Include specific details from above. Make it personal and compelling.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const letterContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Save approach letter to database
    const letter = await prisma.approachLetter.create({
      data: {
        dealId: id,
        userId: "demo-user", // Would be from session in real app
        letterContent: letterContent,
        sentVia: channel,
      },
    });

    return NextResponse.json({
      id: letter.id,
      content: letterContent,
      channel,
      status: "draft",
    });
  } catch (error) {
    console.error("Error generating approach letter:", error);
    return NextResponse.json({ error: "Failed to generate letter" }, { status: 500 });
  }
}
