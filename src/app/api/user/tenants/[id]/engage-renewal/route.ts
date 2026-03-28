/**
 * POST /api/user/tenants/:leaseRef/engage-renewal
 *
 * Generates a Claude renewal letter draft and emails it to the owner for review.
 * Owner reviews before any contact with the tenant.
 *
 * Flow:
 *   1. Look up the Lease record (leaseRef = Lease.id)
 *   2. Generate renewal letter via Claude (ANTHROPIC_API_KEY required)
 *   3. Create TenantEngagement record with letterDraft
 *   4. Email letter draft to owner (session.user.email) via Resend
 *   5. Return { action, letter }
 *
 * Falls back gracefully if Claude or Resend not configured.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Lease model is Wave 2 — use cast until migration is confirmed applied
type LeaseLookup = {
  id: string;
  expiryDate: Date | null;
  passingRent: number;
  currency: string | null;
  tenant: { id: string; name: string; sector: string | null } | null;
  asset: { id: string; name: string; address: string | null; country: string | null } | null;
};

async function getLease(leaseId: string, userId: string): Promise<LeaseLookup | null> {
  try {
    return await (prisma as unknown as {
      lease: { findFirst: (q: object) => Promise<LeaseLookup | null> }
    }).lease.findFirst({
      where: { id: leaseId, userId },
      select: {
        id: true,
        expiryDate: true,
        passingRent: true,
        currency: true,
        tenant: { select: { id: true, name: true, sector: true } },
        asset: { select: { id: true, name: true, address: true, country: true } },
      },
    });
  } catch {
    return null;
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ leaseRef: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leaseRef } = await params;
  const userId = session.user.id;

  // ── Check for duplicate engagement ──────────────────────────────────────
  const existing = await prisma.tenantEngagementAction.findFirst({
    where: { userId, leaseRef, actionType: "engage_renewal" },
  });
  if (existing) return NextResponse.json({ action: existing, letter: null });

  // ── Create the action record ─────────────────────────────────────────────
  const action = await prisma.tenantEngagementAction.create({
    data: { userId, leaseRef, actionType: "engage_renewal" },
  });

  // ── Look up the lease (Wave 2 models — gracefully absent) ────────────────
  const lease = await getLease(leaseRef, userId);

  let letterBody: string | null = null;

  if (lease && process.env.ANTHROPIC_API_KEY) {
    const isUK = (lease.asset?.country ?? "UK").toUpperCase() !== "US";
    const sym = isUK ? "£" : "$";
    const register = isUK ? "UK English, formal commercial property solicitor register" : "US English, formal commercial real estate register";

    const expiryLine = lease.expiryDate
      ? `Lease expiry: ${lease.expiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
      : "";

    const rentLine = lease.passingRent > 0
      ? `Current passing rent: ${sym}${lease.passingRent.toLocaleString()} per annum`
      : "";

    const prompt = `Draft a lease renewal discussion opener from landlord to tenant for a commercial property.

PROPERTY: ${lease.asset?.name ?? "the property"}${lease.asset?.address ? `, ${lease.asset.address}` : ""}
TENANT: ${lease.tenant?.name ?? "the tenant"}
${rentLine}
${expiryLine}

Write in ${register}.
The landlord is an owner-operator managing a commercial property portfolio directly — no agents or advisers.
Purpose: invite the tenant to begin renewal negotiations and confirm their intention to continue occupying the premises.
State clearly: the approaching lease expiry, the invitation to renew, and the next step required from the tenant (respond in writing within 14 days).
Close with a signature block with placeholders [LANDLORD NAME], [DATE].
Keep under 300 words. Formal paragraphs only — no headers or bullet points.`;

    try {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json() as { content?: Array<{ type: string; text?: string }> };
        letterBody = aiData?.content?.[0]?.text ?? null;
      }
    } catch (err) {
      console.error("[engage-renewal] Claude generation failed:", err);
    }

    // ── Store TenantEngagement if letter generated ───────────────────────────
    if (letterBody && lease.tenant?.id) {
      try {
        await (prisma as unknown as {
          tenantEngagement: { create: (q: object) => Promise<unknown> }
        }).tenantEngagement.create({
          data: {
            tenantId:    lease.tenant.id,
            leaseId:     lease.id,
            userId,
            actionType:  "engage_renewal",
            letterDraft: letterBody,
            status:      "draft",
          },
        });
      } catch { /* non-fatal — Lease/Tenant models may not be migrated yet */ }
    }

    // ── Email letter draft to owner for review ───────────────────────────────
    if (letterBody && resend && session.user.email) {
      try {
        await resend.emails.send({
          from: "RealHQ <noreply@realhq.com>",
          to: session.user.email,
          subject: `Renewal letter draft — ${lease.tenant?.name ?? "tenant"} at ${lease.asset?.name ?? "property"}`,
          text: `RealHQ has drafted the following renewal letter for your review.\n\nReview and send to your tenant when ready.\n\n---\n\n${letterBody}\n\n---\n\nThis draft was generated automatically. Edit as needed before sending.`,
        });
      } catch (err) {
        console.error("[engage-renewal] Resend failed:", err);
        // Non-fatal — letter is still returned
      }
    }
  }

  return NextResponse.json({ action, letter: letterBody });
}
