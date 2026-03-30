/**
 * GET /api/user/tenants
 * Returns structured tenant/lease data for the tenants page.
 *
 * Wave 2 fix: real users see zero data because the tenants page reads from
 * portfolioData (demo data). This route reads from Tenant + Lease models,
 * created by lazy materialisation from uploaded lease PDFs.
 *
 * Response shape matches the TenantRow interface in the tenants page.
 * Called by useRealTenants hook.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateHealthScore,
  calculateRenewalProbability,
  deriveLeaseStatus,
  computeWAULT,
} from "@/lib/tenant-health";
import { materialisePendingLeases } from "@/lib/tenant-materialise";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      tenants: [
        {
          id: "demo-1",
          leaseRef: "LEA-001",
          tenant: "Meridian Law Partners LLP",
          tenantId: "tenant-1",
          assetId: "demo-1",
          assetName: "FL Mixed Portfolio",
          location: "Suite 4A, Miami, FL",
          sqft: 6000,
          rentPerSqft: 31.5,
          annualRent: 189000,
          startDate: "2022-03-01",
          expiryDate: "2027-02-28",
          breakDate: "2025-02-28",
          reviewDate: "2025-03-01",
          daysToExpiry: 1828,
          leaseStatus: "active",
          healthScore: 8,
          renewalProbability: "Very likely",
          renewalPct: 85,
          covenantGrade: "strong",
          sector: "Professional Services",
          revertPotential: 42000,
          currency: "USD",
          sym: "$",
          paymentHistory: [
            { period: "2026-03", status: "paid" },
            { period: "2026-02", status: "paid" },
            { period: "2026-01", status: "paid" },
          ],
          engagements: [],
        },
        {
          id: "demo-2",
          leaseRef: "LEA-002",
          tenant: "Dr Chen DDS",
          tenantId: "tenant-2",
          assetId: "demo-1",
          assetName: "FL Mixed Portfolio",
          location: "Suite 2B, Miami, FL",
          sqft: 4500,
          rentPerSqft: 28,
          annualRent: 126000,
          startDate: "2023-06-01",
          expiryDate: "2026-05-31",
          breakDate: null,
          reviewDate: "2024-06-01",
          daysToExpiry: 427,
          leaseStatus: "active",
          healthScore: 7,
          renewalProbability: "Likely",
          renewalPct: 72,
          covenantGrade: "satisfactory",
          sector: "Healthcare",
          revertPotential: 13500,
          currency: "USD",
          sym: "$",
          paymentHistory: [
            { period: "2026-03", status: "paid" },
            { period: "2026-02", status: "paid" },
            { period: "2026-01", status: "late" },
          ],
          engagements: [],
        },
      ],
      wault: 4.2,
      rentAtRisk: 126000,
      totalPassingRent: 315000,
      leaseCount: 2,
    });
  }

  // ── Lazy materialisation ─────────────────────────────────────────────────
  // If the user has processed lease documents not yet converted to Lease records,
  // materialise them now. Fast no-op when nothing is pending.
  await materialisePendingLeases(session.user.id).catch(err => {
    console.error("[tenants] Materialisation error:", err);
    // Non-fatal — continue with whatever records exist
  });

  // ── Fetch leases ─────────────────────────────────────────────────────────
  const leases = await prisma.lease.findMany({
    where: { userId: session.user.id },
    include: {
      tenant: true,
      asset: {
        select: {
          id: true,
          name: true,
          location: true,
          marketRentSqft: true,
          country: true,
        },
      },
      payments: {
        orderBy: { periodStart: "desc" },
        take: 12,
      },
      engagements: {
        where: { actionType: "engage_renewal" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { actionType: true, status: true },
      },
    },
    orderBy: { expiryDate: "asc" },
  });

  const today = new Date();

  type LeaseFull = {
    id: string; leaseRef: string | null; tenantId: string; assetId: string;
    sqft: number; rentPerSqft: number | null; passingRent: number; currency: string | null;
    startDate: Date | null; expiryDate: Date | null; breakDate: Date | null; reviewDate: Date | null;
    tenant: { name: string; sector: string | null; covenantGrade: string | null };
    asset: { id: string; name: string; location: string; marketRentSqft: number | null; country: string | null };
    payments: Array<{ status: string; periodStart: Date }>;
    engagements: Array<{ actionType: string; status: string }>;
  };

  const result = (leases as LeaseFull[]).map((lease) => {
    // ── Derived fields ────────────────────────────────────────────────────
    const daysToExpiry = lease.expiryDate
      ? Math.floor((lease.expiryDate.getTime() - today.getTime()) / 86_400_000)
      : null;

    const leaseStatus = deriveLeaseStatus(lease.expiryDate);

    const covenantGrade = (
      lease.tenant.covenantGrade ?? "unknown"
    ) as "strong" | "satisfactory" | "weak" | "unknown";

    const healthScore = calculateHealthScore({
      daysToExpiry,
      leaseStatus,
      payments: lease.payments.map((p: { status: string }) => ({ status: p.status })),
      covenantGrade,
      sector: lease.tenant.sector ?? null,
    });

    const { label: renewalLabel, pct: renewalPct } = calculateRenewalProbability(
      daysToExpiry,
      healthScore
    );

    // ── Revert potential: (marketERV - passing rent/sqft) × sqft ─────────
    const revertPotential =
      lease.asset.marketRentSqft && lease.rentPerSqft && lease.sqft > 0
        ? (lease.asset.marketRentSqft - lease.rentPerSqft) * lease.sqft
        : null;

    const currency = lease.currency ?? "GBP";

    return {
      id:               lease.id,
      leaseRef:         lease.leaseRef ?? lease.id,
      tenant:           lease.tenant.name,
      tenantId:         lease.tenantId,
      assetId:          lease.assetId,
      assetName:        lease.asset.name,
      location:         lease.asset.location,
      sqft:             lease.sqft,
      rentPerSqft:      lease.rentPerSqft ?? 0,
      annualRent:       lease.passingRent,
      startDate:        lease.startDate?.toISOString().split("T")[0] ?? null,
      expiryDate:       lease.expiryDate?.toISOString().split("T")[0] ?? null,
      breakDate:        lease.breakDate?.toISOString().split("T")[0] ?? null,
      reviewDate:       lease.reviewDate?.toISOString().split("T")[0] ?? null,
      daysToExpiry,
      leaseStatus,
      healthScore,
      renewalProbability: renewalLabel,
      renewalPct,
      covenantGrade,
      sector:           lease.tenant.sector ?? null,
      revertPotential,
      currency,
      sym:              currency === "GBP" ? "£" : "$",
      paymentHistory:   lease.payments.map((p: { status: string; periodStart: Date }) => ({
        period: p.periodStart.toISOString().split("T")[0],
        status: p.status,
      })),
      engagements: lease.engagements,
    };
  });

  // ── Portfolio metrics ────────────────────────────────────────────────────
  const waultInputs = result.map(l => ({
    sqft:         l.sqft,
    daysToExpiry: l.daysToExpiry,
  }));
  const wault = computeWAULT(waultInputs);

  const rentAtRisk = result
    .filter(l => l.daysToExpiry !== null && l.daysToExpiry <= 365)
    .reduce((sum, l) => sum + l.annualRent, 0);

  const totalPassingRent = result.reduce((sum, l) => sum + l.annualRent, 0);

  return NextResponse.json({
    tenants: result,
    wault,
    rentAtRisk,
    totalPassingRent,
    leaseCount: result.length,
  });
}
