import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/portal/[id]/documents/[docId] — Public route (no auth)
// Returns document file URL for download
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: roomId, docId } = await params;

    // Verify document exists and belongs to this room
    const document = await prisma.transactionDocument.findFirst({
      where: {
        id: docId,
        roomId: roomId,
      },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        confidential: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (!document.fileUrl) {
      return NextResponse.json(
        { error: "File URL not available" },
        { status: 404 }
      );
    }

    // Return the file URL for the frontend to handle
    return NextResponse.json({
      fileUrl: document.fileUrl,
      name: document.name,
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve document" },
      { status: 500 }
    );
  }
}
