/**
 * POST /api/user/transactions/:roomId/nda
 * Initiates NDA workflow.
 *
 * Body: { signerName, signerEmail, useDocusign? }
 *
 * If DOCUSIGN_INTEGRATION_KEY is set: would create DocuSign envelope (stub for MVP)
 * If not set: records NDA as "manually agreed" with status "signed"
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderNDAText } from "@/lib/nda-template";

type Params = { params: Promise<{ roomId: string }> };

interface NDARow {
  id: string; roomId: string; signerName: string; signerEmail: string;
  signedAt: Date | null; docusignId: string | null; status: string;
}

type PrismaWithTx = {
  transactionRoom: {
    findFirst: (q: object) => Promise<{ id: string; assetId: string | null; dealId: string | null } | null>;
  };
  ndaSignature: {
    findFirst: (q: object) => Promise<NDARow | null>;
    create:    (q: object) => Promise<NDARow>;
    update:    (q: object) => Promise<NDARow>;
  };
  transactionDocument: {
    create: (q: object) => Promise<unknown>;
  };
};

function db() { return prisma as unknown as PrismaWithTx; }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await db().transactionRoom.findFirst({ where: { id: roomId, userId: session.user.id } } as object);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    signerName?: string;
    signerEmail?: string;
    useDocusign?: boolean;
  };

  if (!body.signerName || !body.signerEmail) {
    return NextResponse.json({ error: "signerName and signerEmail are required" }, { status: 400 });
  }

  // Check for existing NDA
  const existing = await db().ndaSignature.findFirst({ where: { roomId } } as object);

  const useDocusign = body.useDocusign && !!process.env.DOCUSIGN_INTEGRATION_KEY;

  let nda: NDARow;

  if (existing) {
    nda = await db().ndaSignature.update({
      where: { id: existing.id } as object,
      data: {
        signerName:  body.signerName,
        signerEmail: body.signerEmail,
        status:      useDocusign ? "sent" : "signed",
        signedAt:    useDocusign ? null : new Date(),
      },
    } as object);
  } else {
    nda = await db().ndaSignature.create({
      data: {
        roomId,
        signerName:  body.signerName,
        signerEmail: body.signerEmail,
        status:      useDocusign ? "sent" : "signed",
        signedAt:    useDocusign ? null : new Date(),
      },
    } as object);
  }

  // If no DocuSign: generate NDA text and create as a document record
  if (!useDocusign) {
    // Get property address for NDA
    let propertyAddress = "the property";
    if (room.assetId) {
      const asset = await prisma.userAsset.findFirst({
        where: { id: room.assetId }, select: { name: true, address: true, location: true },
      });
      propertyAddress = asset?.address ?? asset?.name ?? asset?.location ?? "the property";
    } else if (room.dealId) {
      type DealRow = { address: string };
      const deal = await (prisma as unknown as { scoutDeal: { findFirst: (q: object) => Promise<DealRow | null> } })
        .scoutDeal.findFirst({ where: { id: room.dealId }, select: { address: true } } as object).catch(() => null);
      propertyAddress = deal?.address ?? "the property";
    }

    const ndaText = renderNDAText({
      ownerName: session.user.name ?? session.user.email ?? "Property Owner",
      counterpartyName: body.signerName,
      propertyAddress,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    });

    await db().transactionDocument.create({
      data: {
        roomId,
        name:        `NDA — ${body.signerName}`,
        category:    "nda",
        uploadedBy:  "owner",
        confidential: false,
        fileUrl:     `data:text/plain;base64,${Buffer.from(ndaText).toString("base64")}`,
      },
    } as object).catch(() => null);
  } else {
    // DocuSign stub — in production this would call DocuSign API
    // For now: mark as sent and store a placeholder docusignId
    await db().ndaSignature.update({
      where: { id: nda.id } as object,
      data: { status: "sent", docusignId: `stub-${Date.now()}` },
    } as object).catch(() => null);
  }

  return NextResponse.json({ nda, useDocusign });
}
