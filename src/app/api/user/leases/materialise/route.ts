/**
 * POST /api/user/leases/materialise
 * On-demand lease materialisation — converts processed Documents into
 * Tenant + Lease records for the calling user.
 *
 * Optionally scoped to a single document via { documentId } in body.
 * Used by: onboarding flow (post-document-upload), tenants page (lazy load).
 *
 * Idempotent — safe to call multiple times.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { materialiseOnDemand } from "@/lib/tenant-materialise";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { documentId?: string };
  const documentId = body.documentId ?? undefined;

  const result = await materialiseOnDemand(session.user.id, documentId);

  return NextResponse.json(result);
}
