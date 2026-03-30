import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    // Demo data for unauthenticated users
    const demoLeases = [
      {
        id: "demo-lease-1",
        tenant: "Meridian Law Partners LLP",
        propertyAddress: "Suite 4A, Miami, FL",
        sqft: 6000,
        passingRent: 189000,
        startDate: "2022-03-01",
        expiryDate: "2027-02-28",
        breakClause: "2025-02-28",
        daysToExpiry: 1828,
        status: "active" as const,
        filename: "meridian-lease.pdf",
      },
      {
        id: "demo-lease-2",
        tenant: "Dr Chen DDS",
        propertyAddress: "Suite 2B, Miami, FL",
        sqft: 4500,
        passingRent: 126000,
        startDate: "2023-06-01",
        expiryDate: "2026-05-31",
        breakClause: null,
        daysToExpiry: 427,
        status: "expiring_soon" as const,
        filename: "chen-lease.pdf",
      },
      {
        id: "demo-lease-3",
        tenant: "TechHub Ventures",
        propertyAddress: "Floor 5, Miami, FL",
        sqft: 3200,
        passingRent: 96000,
        startDate: "2021-09-15",
        expiryDate: "2026-09-14",
        breakClause: "2024-09-14",
        daysToExpiry: 533,
        status: "active" as const,
        filename: "techhub-lease.pdf",
      },
    ];
    return NextResponse.json({
      hasLeases: true,
      waultYears: 3.8,
      rentAtRisk: 126000,
      totalPassingRent: 411000,
      leaseCount: 3,
      leases: demoLeases,
      userCurrency: "USD",
    });
  }

  const docs = await prisma.document.findMany({
    where: {
      userId: session.user.id,
      documentType: { in: ["lease_agreement", "rent_roll"] },
      status: "done",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!docs.length) {
    return NextResponse.json({ hasLeases: false, wault: 0, rentAtRisk: 0, leaseSummaries: [] });
  }

  const today = new Date();

  // Flatten all lease entries from all docs
  const leaseSummaries: {
    id: string;
    tenant: string;
    propertyAddress: string | null;
    sqft: number;
    passingRent: number;
    startDate: string | null;
    expiryDate: string | null;
    breakClause: string | null;
    daysToExpiry: number | null;
    status: "active" | "expiring_soon" | "expired" | "vacant";
    filename: string;
  }[] = [];

  for (const doc of docs) {
    const data = (doc.extractedData as Record<string, unknown>) ?? {};

    if (doc.documentType === "rent_roll") {
      // rent_roll has properties array
      const properties = (data.properties as Record<string, unknown>[]) ?? [];
      for (const p of properties) {
        const expiryDate = p.leaseExpiry ? new Date(p.leaseExpiry as string) : null;
        const daysToExpiry = expiryDate
          ? Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const tenant = (p.tenant as string) ?? "Unknown";
        const status =
          tenant === "Vacant"
            ? "vacant"
            : daysToExpiry === null
            ? "active"
            : daysToExpiry < 0
            ? "expired"
            : daysToExpiry < 90
            ? "expiring_soon"
            : "active";
        leaseSummaries.push({
          id: `${doc.id}-${leaseSummaries.length}`,
          tenant,
          propertyAddress: (p.address as string) ?? null,
          sqft: Number(p.sqft) || 0,
          passingRent: Number(p.passingRent) || 0,
          startDate: null,
          expiryDate: expiryDate?.toISOString().split("T")[0] ?? null,
          breakClause: (p.breakDate as string) ?? null,
          daysToExpiry,
          status,
          filename: doc.filename,
        });
      }
    } else {
      // single lease_agreement
      const expiryDate = data.expiryDate ? new Date(data.expiryDate as string) : null;
      const daysToExpiry = expiryDate
        ? Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const tenant = (data.tenant as string) ?? "Unknown";
      const status =
        daysToExpiry === null
          ? "active"
          : daysToExpiry < 0
          ? "expired"
          : daysToExpiry < 90
          ? "expiring_soon"
          : "active";
      leaseSummaries.push({
        id: doc.id,
        tenant,
        propertyAddress: (data.propertyAddress as string) ?? null,
        sqft: Number(data.sqft) || 0,
        passingRent: Number(data.passingRent) || 0,
        startDate: (data.startDate as string) ?? null,
        expiryDate: expiryDate?.toISOString().split("T")[0] ?? null,
        breakClause: (data.breakClause as string) ?? null,
        daysToExpiry,
        status,
        filename: doc.filename,
      });
    }
  }

  // WAULT: weighted by sqft
  const occupied = leaseSummaries.filter((l) => l.status !== "vacant" && l.sqft > 0 && l.daysToExpiry !== null && l.daysToExpiry > 0);
  const waultNum = occupied.reduce((s, l) => s + l.sqft * (l.daysToExpiry ?? 0), 0);
  const waultDen = occupied.reduce((s, l) => s + l.sqft, 0);
  const wault = waultDen > 0 ? waultNum / waultDen / 365 : 0;

  // Rent at risk: annual rent for leases expiring within 12 months
  const rentAtRisk = leaseSummaries
    .filter((l) => l.daysToExpiry !== null && l.daysToExpiry <= 365 && l.status !== "vacant")
    .reduce((s, l) => s + l.passingRent, 0);

  const totalPassingRent = leaseSummaries.reduce((s, l) => s + l.passingRent, 0);

  // Derive currency from user's primary asset country
  const primaryAsset = await prisma.userAsset.findFirst({
    where: { userId: session.user.id },
    select: { country: true },
    orderBy: { createdAt: "asc" },
  });
  const userCurrency = primaryAsset?.country === "UK" ? "GBP" : "USD";

  return NextResponse.json({
    hasLeases: true,
    waultYears: Math.round(wault * 10) / 10,
    rentAtRisk,
    totalPassingRent,
    leaseCount: leaseSummaries.length,
    leases: leaseSummaries,
    userCurrency,
  });
}
