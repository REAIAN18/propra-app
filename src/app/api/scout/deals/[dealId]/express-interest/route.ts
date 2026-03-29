import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendVendorApproachEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { dealId } = await params;
  const body = await req.json();
  const message = body.message as string | null;

  // Get the deal with broker information
  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      address: true,
      assetType: true,
      askingPrice: true,
      guidePrice: true,
      brokerName: true,
      sourceUrl: true,
      currency: true,
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Get user information
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user has already expressed interest in this deal
  const existingApproach = await prisma.vendorApproach.findFirst({
    where: {
      userId: session.user.id,
      dealId,
    },
  });

  if (existingApproach) {
    return NextResponse.json(
      { error: "You have already expressed interest in this deal" },
      { status: 400 }
    );
  }

  // Create vendor approach record
  const approach = await prisma.vendorApproach.create({
    data: {
      userId: session.user.id,
      dealId,
      message: message || null,
      status: "pending",
      vendorName: deal.brokerName || null,
      // Note: In a real implementation, we would extract the vendor email
      // from the deal source or have it as a field in the ScoutDeal model
      vendorEmail: null,
    },
  });

  // Send email to vendor (if we have their email)
  // For now, we'll send a notification to the user that their interest has been recorded
  try {
    await sendVendorApproachEmail({
      userName: user.name || user.email,
      userEmail: user.email,
      dealAddress: deal.address,
      dealType: deal.assetType,
      dealPrice: deal.askingPrice ?? deal.guidePrice,
      currency: deal.currency,
      message,
      vendorName: deal.brokerName,
      dealUrl: deal.sourceUrl,
    });
  } catch (error) {
    console.error("Failed to send vendor approach email:", error);
    // Don't fail the request if email sending fails
  }

  return NextResponse.json({ ok: true, approachId: approach.id });
}
