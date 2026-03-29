/**
 * POST /api/scout/deals/:dealId/send-teaser
 * Generate teaser PDF and send to selected investors via email
 * Creates InvestorOutreach records for tracking
 *
 * Body: { investorIds: string[], senderName: string }
 *
 * Used by: Scout v2 Express Interest feature
 */

export const maxDuration = 60; // PDF generation + email sending
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateBrochurePDF, type BrochureData } from "@/lib/brochure";
import { sendInvestorTeaserEmail } from "@/lib/email";

type Params = { params: Promise<{ dealId: string }> };

interface ReqBody {
  investorIds: string[];
  senderName: string;
  confidential?: boolean;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await params;

  // Verify deal exists
  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const body = (await req.json()) as ReqBody;
  const { investorIds, senderName, confidential = true } = body;

  // Validate required fields
  if (!investorIds || investorIds.length === 0) {
    return NextResponse.json(
      { error: "investorIds array is required and must not be empty" },
      { status: 400 }
    );
  }

  if (!senderName) {
    return NextResponse.json(
      { error: "senderName is required" },
      { status: 400 }
    );
  }

  // Get all specified investors and verify they belong to the user
  const investors = await prisma.investorContact.findMany({
    where: {
      id: { in: investorIds },
      userId: session.user.id,
    },
  });

  if (investors.length !== investorIds.length) {
    return NextResponse.json(
      { error: "One or more investor contacts not found" },
      { status: 404 }
    );
  }

  // Get underwriting data if available
  const underwriting = await prisma.scoutUnderwriting.findFirst({
    where: { dealId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const sym = deal.currency === "GBP" ? "£" : "$";
  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const noi = underwriting?.noinet ?? null;
  const yieldPct = underwriting?.grossYield ?? null;
  const capRate = underwriting?.capRate ?? deal.capRate;

  // Generate teaser PDF
  const teaserData: BrochureData = {
    type: "teaser",
    assetName: deal.address,
    assetType: deal.assetType,
    location: deal.address,
    address: deal.address ?? undefined,
    sqft: deal.sqft ?? undefined,
    passingRent: noi ?? undefined,
    noi: noi ?? undefined,
    yieldPct: yieldPct ?? undefined,
    capRate: capRate ?? undefined,
    satelliteUrl: deal.satelliteImageUrl ?? undefined,
    narrative: `${deal.address} is a ${deal.assetType.toLowerCase()} asset. This property offers a compelling investment opportunity.`,
    sym,
    confidential,
    generatedAt,
  };

  let pdfBase64: string | undefined;
  try {
    const pdfBuffer = await generateBrochurePDF(teaserData);
    if (pdfBuffer) {
      pdfBase64 = pdfBuffer.toString("base64");
    }
  } catch (error) {
    console.error("[send-teaser] PDF generation failed:", error);
    // Continue without PDF - email will still be sent
  }

  const dealPrice = (deal.askingPrice ?? deal.guidePrice)
    ? `${sym}${((deal.askingPrice ?? deal.guidePrice ?? 0) / 1_000_000).toFixed(2)}M`
    : undefined;

  // Send email to each investor and create outreach records
  const results = await Promise.allSettled(
    investors.map(async (investor) => {
      try {
        // Send email
        await sendInvestorTeaserEmail({
          userId: session.user.id,
          investorEmail: investor.email,
          investorName: investor.name,
          dealName: deal.address,
          dealLocation: deal.address,
          dealPrice,
          teaserPdfBase64: pdfBase64,
          senderName,
        });

        // Create outreach record
        const outreach = await prisma.investorOutreach.create({
          data: {
            userId: session.user.id,
            dealId,
            investorId: investor.id,
            documentType: "teaser",
            status: "sent",
            notes: `Sent by ${senderName}`,
          },
        });

        // Update investor status to contacted if they were a prospect
        if (investor.status === "prospect") {
          await prisma.investorContact.update({
            where: { id: investor.id },
            data: { status: "contacted" },
          });
        }

        return {
          success: true,
          investorId: investor.id,
          investorName: investor.name,
          outreachId: outreach.id,
        };
      } catch (error) {
        console.error(
          `[send-teaser] Failed to send to ${investor.email}:`,
          error
        );
        return {
          success: false,
          investorId: investor.id,
          investorName: investor.name,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length;
  const failed = results.length - sent;

  return NextResponse.json({
    sent,
    failed,
    results: results.map((r) =>
      r.status === "fulfilled" ? r.value : { success: false, error: r.reason }
    ),
  });
}
