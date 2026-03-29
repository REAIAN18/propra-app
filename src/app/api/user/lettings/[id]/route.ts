/**
 * GET /api/user/lettings/[id]
 * Returns letting details with enquiries for the letting pipeline page.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lettingId = params.id;

  // Fetch letting with related data
  const letting = await prisma.letting.findUnique({
    where: { id: lettingId },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          sqft: true,
        },
      },
      enquiries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!letting || letting.userId !== session.user.id) {
    return NextResponse.json({ error: "Letting not found" }, { status: 404 });
  }

  // Calculate days listed
  const daysListed = Math.floor(
    (Date.now() - letting.createdAt.getTime()) / 86_400_000
  );

  // Calculate asking rent per sqft (assuming letting has sqft from asset or directly)
  const sqft = letting.asset.sqft ?? 0;
  const askingRentPerSqft = sqft > 0 ? letting.askingRent / sqft : 0;

  // Calculate enquiry stats
  const totalEnquiries = letting.enquiries.length;
  const viewingsBooked = 0; // Field doesn't exist in schema yet

  // Calculate void cost (monthly and annual lost rent)
  const voidCostMonthly = letting.askingRent / 12;
  const voidCostAnnual = letting.askingRent;

  const currency = "GBP"; // TODO: Get from asset or user preferences
  const sym = currency === "GBP" ? "£" : "$";

  return NextResponse.json({
    letting: {
      id: letting.id,
      assetId: letting.assetId,
      assetName: letting.asset.name,
      unitRef: letting.unitRef,
      status: letting.status,
      askingRent: letting.askingRent,
      askingRentPerSqft,
      sqft,
      leaseTermYears: letting.leaseTermYears,
      useClass: letting.useClass,
      notes: letting.notes,
      daysListed,
      currency,
      sym,
    },
    enquiries: letting.enquiries.map((e) => ({
      id: e.id,
      companyName: e.companyName,
      contactName: e.contactName,
      email: e.email,
      useCase: e.useCase,
      sqftMin: null, // Field doesn't exist in schema yet
      sqftMax: null, // Field doesn't exist in schema yet
      status: "enquiry", // Field doesn't exist in schema yet, default to "enquiry"
      covenantGrade: e.covenantGrade,
      priceOffered: null, // Field doesn't exist in schema yet
      notes: null, // Field doesn't exist in schema yet
      createdAt: e.createdAt.toISOString(),
    })),
    stats: {
      totalEnquiries,
      viewingsBooked,
      voidCostMonthly,
      voidCostAnnual,
    },
  });
}
