/**
 * POST /api/user/tenants/[tenantId]/escalate-arrears
 * Manually escalates a tenant to the next arrears stage.
 *
 * Phase 3: Arrears escalation automation.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { manualEscalateTenant } from "@/lib/arrears-escalation";
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
  const body = await req.json();
  const { targetStage } = body;

  if (!targetStage || !["reminder", "formal_demand", "solicitor"].includes(targetStage)) {
    return NextResponse.json(
      { error: "Invalid targetStage. Must be: reminder, formal_demand, or solicitor" },
      { status: 400 }
    );
  }

  try {
    // Verify tenant belongs to user
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { userId: true },
    });

    if (!tenant || tenant.userId !== session.user.id) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const result = await manualEscalateTenant(tenantId, targetStage);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[api/tenants/escalate-arrears] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to escalate tenant" },
      { status: 500 }
    );
  }
}
