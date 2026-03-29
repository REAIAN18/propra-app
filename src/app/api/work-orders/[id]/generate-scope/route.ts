import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// POST /api/work-orders/[id]/generate-scope
// Generate detailed scope of work using Claude
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch work order
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        asset: {
          select: {
            name: true,
            assetType: true,
            location: true,
            sqft: true,
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      );
    }

    // Build prompt for Claude
    const prompt = `You are an expert construction project manager. Generate a detailed, professional scope of work for a maintenance/construction project.

Property: ${workOrder.asset?.name || "Commercial property"}
Type: ${workOrder.asset?.assetType || "Commercial"}
Size: ${workOrder.asset?.sqft ? `${workOrder.asset.sqft.toLocaleString()} sqft` : "Not specified"}
Location: ${workOrder.asset?.location || "Not specified"}

Job Type: ${workOrder.jobType}
Category: ${workOrder.tenderType || "MAINTENANCE"}
Description: ${workOrder.description}
${workOrder.accessNotes ? `Access Notes: ${workOrder.accessNotes}` : ""}
${workOrder.timing ? `Timing: ${workOrder.timing}` : ""}
${workOrder.targetStart ? `Target Start: ${workOrder.targetStart}` : ""}

Generate a comprehensive scope of work that includes:

1. **Work Items**: List specific tasks with quantities and specifications
2. **Safety Requirements**: Required safety measures, permits, and certifications
3. **Access Arrangements**: Property access, working hours, tenant notifications needed
4. **Exclusions**: What is NOT included in this scope
5. **Assumptions**: Key assumptions about site conditions, access, etc.

Format your response as JSON with this structure:
{
  "scopeSummary": "Brief 2-3 sentence overview",
  "workItems": [
    {"item": "Description", "quantity": "Number or N/A", "specification": "Details", "unitCost": null}
  ],
  "safetyRequirements": ["Requirement 1", "Requirement 2"],
  "accessArrangements": "Detailed access information",
  "exclusions": ["Exclusion 1", "Exclusion 2"],
  "assumptions": ["Assumption 1", "Assumption 2"],
  "estimatedDuration": "X days/weeks",
  "tradeRequired": "Primary trade (e.g., HVAC, Electrical, General Building)"
}

Be specific, professional, and comprehensive. This will be sent to contractors for quoting.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response (Claude might wrap it in markdown)
    let scopeData: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scopeData = JSON.parse(jsonMatch[0]);
      } else {
        scopeData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", responseText);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          rawResponse: responseText,
        },
        { status: 500 }
      );
    }

    // Update work order with generated scope
    const updated = await prisma.workOrder.update({
      where: { id: params.id },
      data: {
        aiScopeJson: scopeData,
        scopeGenerated: true,
        scopeOfWorks: scopeData.scopeSummary || "",
      },
    });

    return NextResponse.json({
      scope: scopeData,
      workOrder: updated,
    });
  } catch (error) {
    console.error("Error generating scope:", error);
    return NextResponse.json(
      {
        error: "Failed to generate scope",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
