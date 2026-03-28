import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseDocument } from "@/lib/document-parser";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Certificate parsing not configured" });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Only PDF and image files are supported." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File size must be under 10MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    // Use the shared document-parser with compliance hint
    const parsed = await parseDocument(null, base64Data, "compliance");

    if (!parsed || parsed.documentType !== "compliance_cert") {
      return NextResponse.json({
        ok: false,
        error: "Could not parse this certificate — please enter details manually.",
      });
    }

    const keyData = parsed.keyData as Record<string, unknown>;

    return NextResponse.json({
      ok: true,
      extracted: {
        certificateType: typeof keyData.certificateType === "string" ? keyData.certificateType : null,
        propertyAddress: typeof keyData.propertyAddress === "string" ? keyData.propertyAddress : null,
        issuedBy: typeof keyData.issuedBy === "string" ? keyData.issuedBy : null,
        issueDate: typeof keyData.issueDate === "string" ? keyData.issueDate : null,
        expiryDate: typeof keyData.expiryDate === "string" ? keyData.expiryDate : null,
        referenceNo: typeof keyData.referenceNo === "string" ? keyData.referenceNo : null,
      },
      filename: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    console.error("[parse-certificate]", err);
    return NextResponse.json({
      ok: false,
      error: "Could not parse this certificate — please enter details manually.",
    });
  }
}
