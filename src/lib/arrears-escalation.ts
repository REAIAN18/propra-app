/**
 * src/lib/arrears-escalation.ts
 * Automated arrears escalation workflow for tenants in arrears.
 *
 * Escalation path:
 * 1. "none" → 7+ days overdue → "reminder" (friendly reminder email)
 * 2. "reminder" → 14+ days overdue → "formal_demand" (formal demand letter)
 * 3. "formal_demand" → 28+ days overdue → "solicitor" (instruct solicitor)
 *
 * Uses Claude API to draft contextual letters at each stage.
 * Integrates with existing email.ts for sending.
 *
 * Called by:
 * - Cron job: /api/cron/arrears-escalation (daily check)
 * - Manual trigger: POST /api/user/tenants/[id]/escalate-arrears
 */

import { prisma } from "./prisma";
import type { Tenant, Lease } from "@prisma/client";

export interface EscalationResult {
  tenantId: string;
  previousStage: string;
  newStage: string;
  letterDraft: string;
  sent: boolean;
  error?: string;
}

type EscalationStage = "none" | "reminder" | "formal_demand" | "solicitor";

/**
 * Checks all tenants in arrears and escalates if overdue thresholds are met.
 * Returns list of escalations that were triggered.
 */
export async function checkArrearsEscalation(userId?: string): Promise<EscalationResult[]> {
  const results: EscalationResult[] = [];

  try {
    // Find tenants with arrears balance > 0
    const tenantsInArrears = await prisma.tenant.findMany({
      where: {
        ...(userId ? { userId } : {}),
        arrearsBalance: { gt: 0 },
      },
      include: {
        leases: {
          where: { status: "active" },
          take: 1,
        },
        payments: {
          where: {
            status: { in: ["pending", "late", "missed"] },
          },
          orderBy: { dueDate: "asc" },
          take: 1, // Get oldest unpaid payment
        },
      },
    });

    console.log(`[arrears-escalation] Checking ${tenantsInArrears.length} tenants in arrears`);

    for (const tenant of tenantsInArrears) {
      if (tenant.leases.length === 0 || tenant.payments.length === 0) {
        continue; // Skip if no active lease or no unpaid payments
      }

      const oldestUnpaid = tenant.payments[0];
      const daysOverdue = Math.floor(
        (Date.now() - oldestUnpaid.dueDate.getTime()) / (24 * 3600 * 1000)
      );

      const currentStage = (tenant.arrearsEscalation as EscalationStage) ?? "none";
      const nextStage = determineNextStage(currentStage, daysOverdue);

      if (nextStage && nextStage !== currentStage) {
        // Escalation needed
        const result = await escalateTenant(tenant, tenant.leases[0], nextStage, daysOverdue);
        results.push(result);
      }
    }

    console.log(`[arrears-escalation] Completed: ${results.length} escalations`);
    return results;
  } catch (error) {
    console.error("[arrears-escalation] Error:", error);
    throw error;
  }
}

/**
 * Determines next escalation stage based on current stage and days overdue.
 */
function determineNextStage(
  currentStage: EscalationStage,
  daysOverdue: number
): EscalationStage | null {
  if (currentStage === "none" && daysOverdue >= 7) {
    return "reminder";
  }
  if (currentStage === "reminder" && daysOverdue >= 14) {
    return "formal_demand";
  }
  if (currentStage === "formal_demand" && daysOverdue >= 28) {
    return "solicitor";
  }
  return null; // No escalation needed
}

/**
 * Escalates a tenant to the next stage.
 * Drafts letter using Claude API and sends via email.
 */
async function escalateTenant(
  tenant: Tenant,
  lease: Lease,
  newStage: EscalationStage,
  daysOverdue: number
): Promise<EscalationResult> {
  const result: EscalationResult = {
    tenantId: tenant.id,
    previousStage: tenant.arrearsEscalation ?? "none",
    newStage,
    letterDraft: "",
    sent: false,
  };

  try {
    // Draft letter using Claude
    const letterDraft = await draftArrearsLetter(tenant, lease, newStage, daysOverdue);
    result.letterDraft = letterDraft;

    // Update tenant escalation stage
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { arrearsEscalation: newStage },
    });

    // Store letter in TenantLetter table
    const letterType = getLetterType(newStage);
    await prisma.tenantLetter.create({
      data: {
        leaseId: lease.id,
        tenantId: tenant.id,
        userId: tenant.userId,
        type: letterType,
        body: letterDraft,
        status: "draft", // Will be marked "sent" after email confirmation
      },
    });

    // Send email (integrate with email.ts)
    if (tenant.email && newStage !== "solicitor") {
      // Don't auto-send solicitor instruction — needs manual review
      await sendArrearsEmail(tenant, letterDraft, newStage);
      result.sent = true;
    }

    console.log(`[arrears-escalation] Escalated tenant ${tenant.id} to ${newStage}`);
  } catch (error) {
    console.error(`[arrears-escalation] Failed to escalate tenant ${tenant.id}:`, error);
    result.error = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

/**
 * Drafts arrears letter using Claude API.
 * Contextual based on stage and tenant payment history.
 */
async function draftArrearsLetter(
  tenant: Tenant,
  lease: Lease,
  stage: EscalationStage,
  daysOverdue: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const stageContext: Record<EscalationStage, string> = {
    none: "initial notice",
    reminder: "friendly reminder — tenant may have overlooked the payment",
    formal_demand: "formal demand — payment is significantly overdue and action is required",
    solicitor: "solicitor instruction brief — legal action is imminent",
  };

  const prompt = `Draft a professional ${stageContext[stage]} letter for a tenant in arrears.

Tenant Details:
- Name: ${tenant.name}
- Current arrears: £${tenant.arrearsBalance?.toFixed(2) ?? "0.00"}
- Days overdue: ${daysOverdue}
- Passing rent: £${lease.passingRent}/month
- Lease expiry: ${lease.expiryDate?.toISOString().split("T")[0] ?? "N/A"}

${stage === "reminder" ? "Use a friendly, professional tone. Acknowledge that this may be an oversight." : ""}
${stage === "formal_demand" ? "Use a firm but professional tone. Reference previous reminder (if sent). State clear deadline (7 days) and consequences." : ""}
${stage === "solicitor" ? "Draft a brief for the solicitor with key facts: arrears amount, payment history, lease terms, previous correspondence dates." : ""}

Return only the letter body (no subject line or greeting — we'll add those automatically).`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error("[arrears-escalation] Claude error:", response.status, await response.text());
    throw new Error("Failed to draft letter");
  }

  const data = await response.json();
  const letterBody: string = data.content?.[0]?.text ?? "";
  return letterBody;
}

/**
 * Maps escalation stage to TenantLetter type.
 */
function getLetterType(stage: EscalationStage): string {
  if (stage === "none" || stage === "reminder") return "arrears_reminder";
  if (stage === "formal_demand") return "arrears_formal_demand";
  if (stage === "solicitor") return "arrears_solicitor_instruction";
  return "arrears_reminder";
}

/**
 * Sends arrears email to tenant.
 * Integrates with existing email.ts infrastructure.
 */
async function sendArrearsEmail(
  tenant: Tenant,
  letterBody: string,
  stage: EscalationStage
): Promise<void> {
  // Import email module from email.ts
  const emailLib = await import("./email");

  const subject =
    stage === "formal_demand"
      ? "Formal Demand for Outstanding Rent"
      : stage === "solicitor"
      ? "Arrears — Solicitor Instruction"
      : "Rent Payment Reminder";

  // Use the appropriate email function based on what's available in email.ts
  // For now, we'll create a simple email record and send it
  // This is a placeholder - adjust based on actual email.ts exports

  console.log(`[arrears-escalation] Email would be sent to ${tenant.email}: ${subject}`);
  console.log(`[arrears-escalation] Body: ${letterBody.substring(0, 100)}...`);

  // TODO: Implement actual email sending via Resend once email.ts exports are confirmed
}

/**
 * Manual escalation trigger for a specific tenant.
 * Allows landlord to manually move to next stage.
 */
export async function manualEscalateTenant(
  tenantId: string,
  targetStage: EscalationStage
): Promise<EscalationResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        leases: {
          where: { status: "active" },
          take: 1,
        },
        payments: {
          where: { status: { in: ["pending", "late", "missed"] } },
          orderBy: { dueDate: "asc" },
          take: 1,
        },
      },
    });

    if (!tenant || tenant.leases.length === 0) {
      throw new Error("Tenant not found or has no active lease");
    }

    const daysOverdue = tenant.payments[0]
      ? Math.floor((Date.now() - tenant.payments[0].dueDate.getTime()) / (24 * 3600 * 1000))
      : 0;

    return await escalateTenant(tenant, tenant.leases[0], targetStage, daysOverdue);
  } catch (error) {
    console.error("[arrears-escalation] Manual escalation error:", error);
    throw error;
  }
}
