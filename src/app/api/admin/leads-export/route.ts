import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  // Wrap in quotes if contains comma, newline, or double-quote
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(",");
}

export async function GET() {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [signupLeads, auditLeads, serviceLeads] = await Promise.all([
    prisma.signupLead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.auditLead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.serviceLead.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const lines: string[] = [];

  // ── Signup Leads ──────────────────────────────────────────────────────────
  lines.push("# Signup Leads");
  lines.push(toRow(["Name", "Email", "Phone", "Company", "Asset Count", "Portfolio Value", "Created At"]));
  for (const l of signupLeads) {
    lines.push(toRow([l.name, l.email, l.phone, l.company, l.assetCount, l.portfolioValue, l.createdAt.toISOString()]));
  }

  lines.push("");

  // ── Audit Leads ───────────────────────────────────────────────────────────
  lines.push("# Audit Leads");
  lines.push(toRow(["Email", "Portfolio Description", "Asset Type", "Asset Count", "Estimate Total ($)", "Has Enrichment", "Created At"]));
  for (const l of auditLeads) {
    lines.push(toRow([l.email, l.portfolioInput, l.assetType, l.assetCount, l.estimateTotal, l.enrichmentsJson ? "yes" : "no", l.createdAt.toISOString()]));
  }

  lines.push("");

  // ── Service Leads ─────────────────────────────────────────────────────────
  lines.push("# Service Leads");
  lines.push(toRow(["Type", "Email", "Property", "Insurer", "Premium ($/yr)", "Renewal Date", "Supplier", "Annual Spend ($)", "Unit Rate (¢/kWh)", "Notes", "Created At"]));
  for (const l of serviceLeads) {
    lines.push(toRow([l.serviceType, l.email, l.propertyAddress, l.insurer, l.currentPremium, l.renewalDate, l.supplier, l.annualSpend, l.unitRate, l.notes, l.createdAt.toISOString()]));
  }

  const csv = lines.join("\n");
  const now = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="arca-leads-${now}.csv"`,
    },
  });
}
