import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/loans - Fetch all loans for the authenticated user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ loans: [], lenders: [] }, { status: 401 });
  }

  const [loans, lenders] = await Promise.all([
    prisma.loan.findMany({
      where: { userId: session.user.id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            location: true,
            assetType: true,
            country: true,
          },
        },
      },
      orderBy: { maturityDate: "asc" },
    }),
    prisma.lenderRelationship.findMany({
      where: { userId: session.user.id },
      orderBy: { lastInteraction: "desc" },
    }),
  ]);

  return NextResponse.json({ loans, lenders });
}

// POST /api/user/loans - Create a new loan
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      assetId,
      lender,
      lenderContact,
      outstandingBalance,
      originalBalance,
      rate,
      rateType,
      rateReference,
      spread,
      termYears,
      maturityDate,
      ltvCovenant,
      dscrCovenant,
      currentLTV,
      currentDSCR,
      monthlyPayment,
      annualDebtService,
      prepaymentPenalty,
      notes,
    } = body;

    const loan = await prisma.loan.create({
      data: {
        userId: session.user.id,
        assetId: assetId || null,
        lender,
        lenderContact,
        outstandingBalance,
        originalBalance,
        rate,
        rateType,
        rateReference,
        spread,
        termYears,
        maturityDate: new Date(maturityDate),
        ltvCovenant,
        dscrCovenant,
        currentLTV,
        currentDSCR,
        monthlyPayment,
        annualDebtService,
        prepaymentPenalty,
        notes,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            location: true,
            assetType: true,
            country: true,
          },
        },
      },
    });

    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    console.error("Error creating loan:", error);
    return NextResponse.json(
      { error: "Failed to create loan" },
      { status: 500 }
    );
  }
}
