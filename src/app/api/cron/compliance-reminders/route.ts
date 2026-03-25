/**
 * POST /api/cron/compliance-reminders
 * Weekly cron — checks ComplianceCertificate records expiring within 90/60/30 days
 * and sends email reminders via Resend. Deduplicates so each user/cert/window gets
 * one reminder per window.
 *
 * Auth: X-Cron-Secret header (same pattern as existing crons)
 * Schedule: weekly — Sunday 08:00 UTC (Vercel Cron)
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

interface CertRow {
  id: string; type: string; status: string; expiryDate: Date | null;
  lastVerifiedAt: Date | null;
  user: { id: string; email: string; name: string | null };
  asset: { name: string; location: string };
}

type PrismaWithCerts = {
  complianceCertificate: {
    findMany: (q: object) => Promise<CertRow[]>;
    update:   (q: object) => Promise<CertRow>;
  };
};

const WINDOWS = [
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
];

const CERT_TYPE_LABELS: Record<string, string> = {
  epc: "EPC Certificate",
  fire_risk: "Fire Risk Assessment",
  gas_safe: "Gas Safe Certificate",
  eicr: "EICR (Electrical Inspection)",
  asbestos: "Asbestos Management Survey",
  legionella: "Legionella Risk Assessment",
  insurance: "Insurance Certificate",
};

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 501 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const db = prisma as unknown as PrismaWithCerts;

  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 24 * 3600 * 1000);

  // Fetch all certificates expiring within 90 days (not yet expired)
  const certs = await db.complianceCertificate.findMany({
    where: {
      expiryDate: { gte: now, lte: in90 },
      status:     { not: "renewal_requested" },
    },
    include: {
      user:  { select: { id: true, email: true, name: true } },
      asset: { select: { name: true, location: true } },
    },
  } as object).catch(() => [] as CertRow[]);

  let sent = 0;
  let skipped = 0;

  for (const cert of certs) {
    if (!cert.expiryDate || !cert.user?.email) { skipped++; continue; }
    const daysRemaining = Math.round((cert.expiryDate.getTime() - now.getTime()) / (24 * 3600 * 1000));

    // Find which window this falls into (innermost window wins)
    const window = WINDOWS.filter((w) => daysRemaining <= w.days)
      .sort((a, b) => a.days - b.days)[0];
    if (!window) { skipped++; continue; }

    // Dedup: skip if lastVerifiedAt is within this window (meaning we already sent)
    if (cert.lastVerifiedAt) {
      const sinceLastAlert = (now.getTime() - cert.lastVerifiedAt.getTime()) / (24 * 3600 * 1000);
      if (sinceLastAlert < 7) { skipped++; continue; } // sent within last 7 days
    }

    const certLabel = CERT_TYPE_LABELS[cert.type] ?? cert.type;
    const expiryStr = cert.expiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    try {
      await resend.emails.send({
        from: "RealHQ Compliance <compliance@realhq.com>",
        to:   cert.user.email,
        subject: `Certificate renewal reminder — ${certLabel} at ${cert.asset.name}`,
        text: [
          `Hi ${cert.user.name ?? "there"},`,
          ``,
          `This is a reminder that your ${certLabel} at ${cert.asset.name} (${cert.asset.location}) expires in ${daysRemaining} days (${expiryStr}).`,
          ``,
          `To avoid compliance risk, please arrange renewal before the expiry date.`,
          ``,
          `Log in to RealHQ to request renewal or upload your renewed certificate:`,
          `https://app.realhq.co.uk/compliance`,
          ``,
          `This message was sent because you have compliance monitoring active for this property.`,
          `RealHQ — The complete commercial property management platform`,
        ].join("\n"),
      });
      // Update lastVerifiedAt to mark as alerted
      await db.complianceCertificate.update({
        where: { id: cert.id },
        data:  { lastVerifiedAt: now },
      } as object).catch(() => null);
      sent++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, total: certs.length });
}
