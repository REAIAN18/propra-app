import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/requests — returns the user's service requests
// Matches by userId (if logged in) or email query param
export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const emailParam = searchParams.get("email");

  // Must be authenticated or provide email (for portfolio link visitors)
  if (!session?.user && !emailParam) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where = session?.user?.id
    ? {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ email: session.user.email }] : []),
        ],
      }
    : { email: emailParam! };

  const leads = await prisma.serviceLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      serviceType: true,
      propertyAddress: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // service-specific details
      insurer: true,
      currentPremium: true,
      renewalDate: true,
      supplier: true,
      annualSpend: true,
      adminNotes: true,
    },
  });

  return NextResponse.json(leads);
}
