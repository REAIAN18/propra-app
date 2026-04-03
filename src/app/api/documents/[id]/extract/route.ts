import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDocument } from "@/lib/document-parser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { extracts: { take: 1, orderBy: { extractedAt: "desc" } } },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // If already extracted, return existing results
    const existing = doc.extracts[0];
    if (existing?.structuredJson) {
      return NextResponse.json({ extracted: existing });
    }

    // Try to re-parse from rawText stored in extract or extractedJson on document
    const rawText = existing?.rawText || (doc.extractedJson as string) || null;
    if (!rawText) {
      return NextResponse.json({ extracted: null, message: "No text available for extraction" });
    }

    const parsed = await parseDocument(rawText, null, "lease");
    if (!parsed) {
      return NextResponse.json({ extracted: null, message: "AI extraction returned no results" });
    }

    const extractType =
      parsed.documentType === "insurance_policy" ? "insurance"
        : parsed.documentType === "energy_bill" ? "energy"
          : parsed.documentType === "lease_agreement" ? "lease"
            : "other";

    const extract = await prisma.documentExtract.create({
      data: {
        documentId: id,
        type: extractType,
        rawText,
        structuredJson: parsed as any,
      },
    });

    // Update Document summary
    await prisma.document.update({
      where: { id },
      data: {
        documentType: parsed.documentType,
        summary: parsed.summary,
        extractedData: parsed as any,
        status: "done",
      },
    });

    return NextResponse.json({ extracted: extract });
  } catch (err) {
    console.error("[documents/extract]", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
