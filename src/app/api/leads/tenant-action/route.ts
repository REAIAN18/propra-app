import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/tenant-action
// Called when a user clicks a tenant engagement action (engage renewal, re-letting, break clause review)
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { action, tenantName, assetName, leaseExpiry, passingRent, email } = body;

  const notesParts: string[] = [];
  if (action) notesParts.push(`action: ${action}`);
  if (tenantName) notesParts.push(`tenant: ${tenantName}`);
  if (leaseExpiry) notesParts.push(`expiry: ${leaseExpiry}`);
  if (passingRent) notesParts.push(`rent: ${passingRent}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  prisma.serviceLead.create({
    data: {
      email: resolvedEmail,
      userId: session?.user?.id ?? null,
      serviceType: "tenant_action",
      propertyAddress: assetName ?? null,
      notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
    },
  }).catch((err) => console.error("[tenant-action] db save failed:", err));

  sendAdminServiceLeadAlert({
    serviceType: "tenant_action",
    email: resolvedEmail ?? "anonymous",
    details: { action, tenant: tenantName, asset: assetName, leaseExpiry, passingRent },
  }).catch((err) => console.error("[tenant-action] email failed:", err));

  return NextResponse.json({ ok: true });
}
