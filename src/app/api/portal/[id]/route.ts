import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/portal/[id] — Public route (no auth)
// Fetches transaction room data for portal viewing
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;

    const room = await prisma.transactionRoom.findUnique({
      where: { id: roomId },
      include: {
        user: { select: { name: true, email: true } },
        asset: { select: { name: true, address: true, postcode: true } },
        documents: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        ndaSignature: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    // Log view (simple version - could track IP, timestamp, etc.)
    // TODO: Implement proper view tracking

    const portalData = {
      room: {
        id: room.id,
        type: room.type,
        buyer: room.buyer,
        seller: room.seller,
        assetName: room.asset?.name || null,
        assetAddress: room.asset
          ? `${room.asset.address || ""}${room.asset.postcode ? ", " + room.asset.postcode : ""}`
          : null,
      },
      nda: room.ndaSignature
        ? {
            id: room.ndaSignature.id,
            status: room.ndaSignature.status,
            signerName: room.ndaSignature.signerName,
            signerEmail: room.ndaSignature.signerEmail,
          }
        : null,
      documents: room.documents,
      ownerName: room.user.name || room.user.email,
    };

    return NextResponse.json(portalData);
  } catch (error) {
    console.error("Portal fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load portal" },
      { status: 500 }
    );
  }
}
