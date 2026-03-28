/**
 * POST /api/user/tenants/[tenantId]/refresh-intelligence
 * Refreshes company intelligence data for a tenant.
 *
 * Phase 3: Company intelligence auto-population.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { autoPopulateTenantIntelligence, fetchCompanyIntelligence } from "@/lib/company-intelligence";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { tenantId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = params;

  try {
    // Get tenant with asset info for country/state detection
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        asset: {
          select: { country: true },
        },
      },
    });

    if (!tenant || tenant.userId !== session.user.id) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Extract state from country if format is "US-FL"
    const country = tenant.asset?.country ?? null;
    const [countryCode, stateCode] = country?.split("-") ?? [country, null];

    // Fetch fresh company intelligence
    const intelligence = await fetchCompanyIntelligence(tenant.name, countryCode, stateCode);

    if (!intelligence) {
      return NextResponse.json({
        success: false,
        message: "No company intelligence data available for this tenant",
      });
    }

    // Auto-populate tenant record
    await autoPopulateTenantIntelligence(tenantId, tenant.name, countryCode, stateCode);

    return NextResponse.json({
      success: true,
      tenantId,
      intelligence,
    });
  } catch (error) {
    console.error("[api/tenants/refresh-intelligence] Error:", error);
    return NextResponse.json(
      { error: "Failed to refresh company intelligence" },
      { status: 500 }
    );
  }
}
