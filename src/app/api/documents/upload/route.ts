import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminDocumentAlert } from "@/lib/email";
import { extractTextFromDocument } from "@/lib/textract";
import { parseDocument } from "@/lib/document-parser";
import { enqueueDocumentIngest } from "@/lib/jobs/document-ingest";
import { enqueueEnergyQuote, processEnergyQuoteJob } from "@/lib/jobs/energy-quote";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and image files are supported." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);
    const base64 = fileBuffer.toString("base64");

    // Create pending document record
    const doc = await prisma.document.create({
      data: {
        userId: session?.user?.id ?? null,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: "processing",
      },
    });

    // Try to enqueue via BullMQ (async) if Redis is configured.
    // If not, fall through to synchronous processing below.
    const enqueued = await enqueueDocumentIngest(doc.id, "other");
    if (enqueued) {
      return NextResponse.json({ document: doc, queued: true });
    }

    // Synchronous pipeline: Textract → Claude → DocumentExtract
    const rawText = await extractTextFromDocument(fileBuffer);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // No Claude key — mark as processing and return. Admin can retry later.
      return NextResponse.json({ document: doc });
    }

    // Parse: use rawText from Textract if available, otherwise send PDF bytes to Claude directly
    const parsed = await parseDocument(rawText, base64);

    if (!parsed) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "error", error: "Extraction failed." },
      });
      return NextResponse.json({ error: "Extraction failed." }, { status: 500 });
    }

    // Infer document type for the extract record
    const extractType =
      parsed.documentType === "insurance_policy"
        ? "insurance"
        : parsed.documentType === "energy_bill"
          ? "energy"
          : parsed.documentType === "lease_agreement"
            ? "lease"
            : "other";

    // Write to DocumentExtract table
    await prisma.documentExtract.create({
      data: {
        documentId: doc.id,
        type: extractType,
        rawText: rawText ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        structuredJson: parsed as any,
      },
    });

    // Update Document with summary and type
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        documentType: parsed.documentType,
        summary: parsed.summary,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractedData: parsed as any,
        status: "done",
      },
    });

    sendAdminDocumentAlert({
      uploaderEmail: session?.user?.email,
      filename: file.name,
      documentType: parsed.documentType,
      summary: parsed.summary,
      opportunities: parsed.opportunities,
      alerts: parsed.alerts,
      keyData: parsed.keyData,
    }).catch((e) => console.error("[doc-alert]", e));

    // Trigger energy quote fetch after energy bill extraction
    if (extractType === "energy" && session?.user?.id) {
      const assetId = (formData.get("assetId") as string | null) ?? null;
      const jobData = { documentId: doc.id, userId: session.user.id, assetId };
      const enqueued = await enqueueEnergyQuote(jobData);
      if (!enqueued) {
        processEnergyQuoteJob(jobData).catch((e) => console.error("[energy-quote]", e));
      }
    }

    // Auto-create ComplianceCertificate for compliance documents
    if (parsed.documentType === "compliance_cert" && session?.user?.id) {
      const assetId = (formData.get("assetId") as string | null) ?? null;
      if (assetId) {
        const keyData = parsed.keyData as Record<string, string | undefined> | undefined;
        const certType = keyData?.certificateType?.toLowerCase() ?? "unknown";
        const expiryDate = keyData?.expiryDate ? new Date(keyData.expiryDate) : null;
        const issuedDate = keyData?.issuedDate ? new Date(keyData.issuedDate) : null;
        const issuedBy = keyData?.issuedBy ?? null;
        const referenceNo = keyData?.referenceNo ?? null;

        // Determine status based on expiry
        let status = "unknown";
        if (expiryDate) {
          const now = new Date();
          const daysToExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysToExpiry < 0) {
            status = "expired";
          } else if (daysToExpiry <= 30) {
            status = "expiring";
          } else {
            status = "valid";
          }
        }

        // Upsert ComplianceCertificate
        await prisma.complianceCertificate.upsert({
          where: {
            assetId_type: { assetId, type: certType },
          },
          update: {
            status,
            expiryDate,
            issuedDate,
            issuedBy,
            referenceNo,
            documentId: doc.id,
            lastVerifiedAt: new Date(),
          },
          create: {
            userId: session.user.id,
            assetId,
            type: certType,
            status,
            expiryDate,
            issuedDate,
            issuedBy,
            referenceNo,
            documentId: doc.id,
            lastVerifiedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ document: updated });
  } catch (err) {
    console.error("[documents/upload]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
