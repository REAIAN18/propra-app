import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAddressFromDescription } from "@/lib/dealscope-text-parser";

/**
 * Extract address from a previously uploaded document.
 * Reads the document's extractedJson (raw text) and runs AI extraction.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const docId = body.docId as string | undefined;

    if (!docId) {
      return NextResponse.json({ error: "docId is required" }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { extractedJson: true, extractedData: true, summary: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Try extractedJson first (raw text from Textract), fall back to summary
    const text = doc.extractedJson || doc.summary || "";
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text extracted from document" }, { status: 400 });
    }

    const result = await extractAddressFromDescription(text);

    if (!result?.address) {
      return NextResponse.json({ error: "Could not extract address from document" }, { status: 400 });
    }

    return NextResponse.json({
      address: result.address,
      postcode: result.postcode || null,
      propertyType: result.propertyType || null,
    });
  } catch (error) {
    console.error("[extract-address] Error:", error);
    return NextResponse.json({ error: "Address extraction failed" }, { status: 500 });
  }
}
