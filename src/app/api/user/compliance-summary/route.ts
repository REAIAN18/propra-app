import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Fine exposure per cert type (hardcoded FL/commercial rates)
const FINE_PER_TYPE: Record<string, number> = {
  fire_cert: 1500,
  fire: 1500,
  epc: 5000,
  eicr: 2000,
  electrical: 2000,
  gas_safety: 1000,
  gas: 1000,
  asbestos: 3000,
  legionella: 2500,
  elevator: 1500,
  default: 1000,
};

function getDailyFine(certType: string): number {
  const key = certType?.toLowerCase().replace(/[^a-z]/g, "_") ?? "default";
  for (const [k, v] of Object.entries(FINE_PER_TYPE)) {
    if (key.includes(k)) return v;
  }
  return FINE_PER_TYPE.default;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ hasCerts: false, fineExposure: 0, expired: 0, expiringSoon: 0, certs: [] });
  }

  const docs = await prisma.document.findMany({
    where: { userId: session.user.id, documentType: "compliance_cert", status: "done" },
    orderBy: { createdAt: "desc" },
  });

  if (!docs.length) {
    return NextResponse.json({ hasCerts: false, fineExposure: 0, expired: 0, expiringSoon: 0, certs: [] });
  }

  const today = new Date();

  const certs = docs.map((d) => {
    const data = (d.extractedData as Record<string, unknown>) ?? {};
    const expiryDate = data.expiryDate ? new Date(data.expiryDate as string) : null;
    const daysToExpiry = expiryDate
      ? Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let status: "expired" | "due_30d" | "due_90d" | "compliant" = "compliant";
    if (daysToExpiry !== null) {
      if (daysToExpiry < 0) status = "expired";
      else if (daysToExpiry <= 30) status = "due_30d";
      else if (daysToExpiry <= 90) status = "due_90d";
    }

    const certType = (data.certType as string) ?? "unknown";
    const dailyFine = getDailyFine(certType);
    const fineExposure =
      status === "expired"
        ? dailyFine * Math.abs(daysToExpiry ?? 0)
        : status === "due_30d"
        ? dailyFine * 30
        : 0;

    return {
      id: d.id,
      certType,
      propertyAddress: (data.propertyAddress as string) ?? null,
      issueDate: (data.issueDate as string) ?? null,
      expiryDate: expiryDate?.toISOString().split("T")[0] ?? null,
      issuingBody: (data.issuingBody as string) ?? null,
      daysToExpiry,
      status,
      fineExposure,
      filename: d.filename,
    };
  });

  const fineExposure = certs.reduce((s, c) => s + c.fineExposure, 0);
  const expired = certs.filter((c) => c.status === "expired").length;
  const expiringSoon = certs.filter((c) => c.status === "due_30d" || c.status === "due_90d").length;

  return NextResponse.json({ hasCerts: true, fineExposure, expired, expiringSoon, certs });
}
