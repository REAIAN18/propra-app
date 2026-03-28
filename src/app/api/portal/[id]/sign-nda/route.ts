import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/portal/[id]/sign-nda — Public route (no auth)
// Signs NDA for transaction room portal access
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    const body = await req.json();
    const { signerName, signerEmail } = body;

    if (!signerName || !signerEmail) {
      return NextResponse.json(
        { error: "Name and email required" },
        { status: 400 }
      );
    }

    // Check if room exists
    const room = await prisma.transactionRoom.findUnique({
      where: { id: roomId },
      include: { ndaSignature: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    let nda = room.ndaSignature;

    if (nda) {
      // Update existing NDA signature
      nda = await prisma.nDASignature.update({
        where: { id: nda.id },
        data: {
          signerName,
          signerEmail,
          status: "signed",
          signedAt: new Date(),
        },
      });
    } else {
      // Create new NDA signature
      nda = await prisma.nDASignature.create({
        data: {
          roomId,
          signerName,
          signerEmail,
          status: "signed",
          signedAt: new Date(),
        },
      });
    }

    // TODO: Send NDA confirmation email
    // TODO: Notify room owner of NDA signature

    return NextResponse.json({
      nda: {
        id: nda.id,
        status: nda.status,
        signerName: nda.signerName,
        signerEmail: nda.signerEmail,
      },
    });
  } catch (error) {
    console.error("NDA signing error:", error);
    return NextResponse.json(
      { error: "Failed to sign NDA" },
      { status: 500 }
    );
  }
}
