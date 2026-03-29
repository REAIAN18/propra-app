import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/loans/[loanId] - Fetch a single loan
export async function GET(
  _request: Request,
  props: { params: Promise<{ loanId: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loan = await prisma.loan.findFirst({
    where: {
      id: params.loanId,
      userId: session.user.id,
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

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  return NextResponse.json({ loan });
}

// PUT /api/user/loans/[loanId] - Update a loan
export async function PUT(
  request: Request,
  props: { params: Promise<{ loanId: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.loan.findFirst({
      where: {
        id: params.loanId,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    const loan = await prisma.loan.update({
      where: { id: params.loanId },
      data: {
        ...body,
        maturityDate: body.maturityDate
          ? new Date(body.maturityDate)
          : undefined,
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

    return NextResponse.json({ loan });
  } catch (error) {
    console.error("Error updating loan:", error);
    return NextResponse.json(
      { error: "Failed to update loan" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/loans/[loanId] - Delete a loan
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ loanId: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const existing = await prisma.loan.findFirst({
    where: {
      id: params.loanId,
      userId: session.user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  await prisma.loan.delete({
    where: { id: params.loanId },
  });

  return NextResponse.json({ success: true });
}
