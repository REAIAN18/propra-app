/**
 * GET /api/user/investor-outreach
 * Returns all investor outreach records across all deals for the authenticated user
 * Used by: Scout v2 investor outreach tracking dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get query parameters for filtering
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const documentType = searchParams.get("documentType");
  const dealId = searchParams.get("dealId");

  // Build where clause
  const where: {
    userId: string;
    status?: string;
    documentType?: string;
    dealId?: string;
  } = {
    userId: user.id,
  };

  if (status) where.status = status;
  if (documentType) where.documentType = documentType;
  if (dealId) where.dealId = dealId;

  // Get all outreach records with investor and deal details
  const outreach = await prisma.investorOutreach.findMany({
    where,
    include: {
      investor: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          type: true,
          status: true,
        },
      },
      deal: {
        select: {
          id: true,
          address: true,
          assetType: true,
          askingPrice: true,
          guidePrice: true,
        },
      },
    },
    orderBy: { sentAt: "desc" },
  });

  // Calculate summary statistics
  const summary = {
    total: outreach.length,
    sent: outreach.filter((o) => o.status === "sent").length,
    opened: outreach.filter((o) => o.status === "opened").length,
    responded: outreach.filter((o) => o.status === "responded").length,
    byDocumentType: {
      teaser: outreach.filter((o) => o.documentType === "teaser").length,
      im: outreach.filter((o) => o.documentType === "im").length,
      data_room: outreach.filter((o) => o.documentType === "data_room").length,
    },
  };

  return NextResponse.json({
    outreach,
    summary,
  });
}
