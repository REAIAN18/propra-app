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
    // Demo data for unauthenticated users
    return NextResponse.json({
      hasCerts: true,
      fineExposure: 2000,
      expired: 0,
      expiringSoon: 1,
      compliant: 4,
      total: 5,
      certs: [
        { id: "demo-1", certType: "Fire Safety", propertyAddress: "123 Main St, Miami, FL", issueDate: "2023-03-15", expiryDate: "2025-04-20", issuingBody: "Miami Fire Dept", daysToExpiry: 21, status: "due_30d", fineExposure: 2000, filename: "Fire_2023.pdf" },
        { id: "demo-2", certType: "Electrical EICR", propertyAddress: "123 Main St, Miami, FL", issueDate: "2022-06-10", expiryDate: "2027-06-10", issuingBody: "Licensed Electrician", daysToExpiry: 803, status: "compliant", fineExposure: 0, filename: "EICR_2022.pdf" },
        { id: "demo-3", certType: "Gas Safety", propertyAddress: "123 Main St, Miami, FL", issueDate: "2024-01-20", expiryDate: "2025-01-20", issuingBody: "Gas Safety Register", daysToExpiry: -70, status: "expired", fineExposure: 0, filename: "Gas_2024.pdf" },
        { id: "demo-4", certType: "Asbestos Survey", propertyAddress: "123 Main St, Miami, FL", issueDate: "2023-09-05", expiryDate: "2028-09-05", issuingBody: "Environmental Labs", daysToExpiry: 1254, status: "compliant", fineExposure: 0, filename: "Asbestos_2023.pdf" },
        { id: "demo-5", certType: "Legionella Risk", propertyAddress: "123 Main St, Miami, FL", issueDate: "2024-02-14", expiryDate: "2026-02-14", issuingBody: "Health Services", daysToExpiry: 685, status: "compliant", fineExposure: 0, filename: "Legionella_2024.pdf" },
      ],
    });
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

  const compliant = certs.filter((c) => c.status === "compliant").length;

  return NextResponse.json({ hasCerts: true, fineExposure, expired, expiringSoon, compliant, total: certs.length, certs });
}
