/**
 * PATCH /api/user/compliance/:certId
 * Updates a ComplianceCertificate record.
 *
 * Body (all optional): { status, expiryDate, issuedDate, issuedBy, referenceNo, documentId, renewalNotes }
 * Response: { certificate }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["valid", "expired", "renewal_requested", "unknown", "missing"];

interface CertRow {
  id: string; userId: string; assetId: string; type: string; status: string;
  expiryDate: Date | null; issuedDate: Date | null; issuedBy: string | null;
  referenceNo: string | null; documentId: string | null;
  renewalNotes: string | null; renewalRequestedAt: Date | null;
  lastVerifiedAt: Date | null; createdAt: Date; updatedAt: Date;
}

type PrismaWithCerts = {
  complianceCertificate: {
    findUnique: (q: object) => Promise<CertRow | null>;
    update:     (q: object) => Promise<CertRow>;
  };
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { certId } = await params;
  const db = prisma as unknown as PrismaWithCerts;

  const existing = await db.complianceCertificate.findUnique({
    where: { id: certId },
  } as object).catch(() => null);

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    status?: string;
    expiryDate?: string;
    issuedDate?: string;
    issuedBy?: string;
    referenceNo?: string;
    documentId?: string;
    renewalNotes?: string;
  };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status` }, { status: 422 });
  }

  const data: Record<string, unknown> = { lastVerifiedAt: new Date() };
  if (body.status)       data.status       = body.status;
  if (body.expiryDate)   data.expiryDate   = new Date(body.expiryDate);
  if (body.issuedDate)   data.issuedDate   = new Date(body.issuedDate);
  if (body.issuedBy)     data.issuedBy     = body.issuedBy;
  if (body.referenceNo)  data.referenceNo  = body.referenceNo;
  if (body.documentId)   data.documentId   = body.documentId;
  if (body.renewalNotes) data.renewalNotes = body.renewalNotes;

  const certificate = await db.complianceCertificate.update({
    where: { id: certId },
    data,
  } as object);

  return NextResponse.json({ certificate });
}
