import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/loans - Fetch all loans for the authenticated user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      loans: [
        {
          id: "demo-loan-1",
          userId: "demo-user",
          assetId: "demo-1",
          asset: { id: "demo-1", name: "FL Mixed Portfolio", location: "Miami, FL", assetType: "Mixed-Use", country: "USA" },
          lender: "Capital One Commercial",
          lenderContact: "John Smith",
          outstandingBalance: 2363636,
          originalBalance: 2500000,
          rate: 5.5,
          rateType: "fixed",
          rateReference: null,
          spread: null,
          termYears: 10,
          maturityDate: "2028-12-31",
          ltvCovenant: 65,
          dscrCovenant: 1.25,
          currentLTV: 65,
          currentDSCR: 1.42,
          monthlyPayment: 24500,
          annualDebtService: 294000,
          prepaymentPenalty: 0,
          notes: "Fixed rate, no prepayment penalty after year 2",
        },
        {
          id: "demo-loan-2",
          userId: "demo-user",
          assetId: null,
          asset: null,
          lender: "Wells Fargo Bank",
          lenderContact: "Sarah Johnson",
          outstandingBalance: 1200000,
          originalBalance: 1500000,
          rate: 5.25,
          rateType: "fixed",
          rateReference: null,
          spread: null,
          termYears: 7,
          maturityDate: "2029-06-30",
          ltvCovenant: 60,
          dscrCovenant: 1.30,
          currentLTV: 52,
          currentDSCR: 1.68,
          monthlyPayment: 17800,
          annualDebtService: 213600,
          prepaymentPenalty: 25000,
          notes: "Strong property; built-in step-up in year 5",
        },
      ],
      lenders: [
        {
          id: "demo-rel-1",
          userId: "demo-user",
          lenderName: "Capital One Commercial",
          primaryContact: "John Smith",
          phone: "(305) 555-1234",
          email: "j.smith@capitalone.com",
          lastInteraction: "2026-03-15",
          relationshipStrength: "strong",
          notesOnRelationship: "Good history with 2 loans; responsive to modifications",
        },
        {
          id: "demo-rel-2",
          userId: "demo-user",
          lenderName: "Wells Fargo Bank",
          primaryContact: "Sarah Johnson",
          phone: "(512) 555-9876",
          email: "s.johnson@wellsfargo.com",
          lastInteraction: "2026-03-10",
          relationshipStrength: "developing",
          notesOnRelationship: "New relationship; first deal closing end of 2024",
        },
      ],
    });
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
