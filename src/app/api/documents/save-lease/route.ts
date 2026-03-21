import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      tenantName,
      monthlyRent,
      currency,
      leaseStart,
      leaseEnd,
      breakClauseDate,
      sqft,
      propertyAddress,
      filename,
      fileSize,
      assetId,
    } = body;

    if (!tenantName) {
      return NextResponse.json({ ok: false, error: "Tenant name is required." }, { status: 400 });
    }

    // Store as lease_agreement with extractedData shaped for /api/user/lease-summary
    const doc = await prisma.document.create({
      data: {
        userId: session.user.id,
        filename: filename ?? "lease.pdf",
        fileSize: fileSize ?? 0,
        mimeType: "application/pdf",
        documentType: "lease_agreement",
        status: "done",
        extractedData: {
          tenant: tenantName,
          passingRent: monthlyRent != null ? Math.round(monthlyRent * 12) : 0,
          currency: currency ?? "GBP",
          startDate: leaseStart ?? null,
          expiryDate: leaseEnd ?? null,
          breakClause: breakClauseDate ?? null,
          sqft: sqft ?? 0,
          propertyAddress: propertyAddress ?? null,
        },
        userAssets: assetId ? { connect: { id: assetId } } : undefined,
      },
    });

    return NextResponse.json({ ok: true, documentId: doc.id });
  } catch (err) {
    console.error("[save-lease]", err);
    return NextResponse.json({ ok: false, error: "Failed to save lease." }, { status: 500 });
  }
}
